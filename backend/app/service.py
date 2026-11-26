import base64
import copy
import json
import math
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from .models import Message, Telemetry
from .security import SecureChannel

START = [
    ("AC101", "AERO 101", 49.5, 2.1, 35000, 462, 72, "Cruising"),
    ("AC202", "AERO 202", 51.2, -1.4, 28000, 418, 142, "Climbing"),
    ("AC303", "AERO 303", 47.7, 7.2, 33000, 451, 285, "Cruising"),
    ("AC404", "AERO 404", 50.1, 10.8, 19000, 326, 224, "Descending"),
]


class DemoService:
    def __init__(self, path):
        self.lock = threading.RLock()
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, body TEXT NOT NULL)"
        )
        self.initialize()

    def initialize(self):
        self.channel = SecureChannel()
        self.session = uuid.uuid4().hex
        self.aircraft = {
            r[0]: Telemetry(
                callsign=r[1],
                latitude=r[2],
                longitude=r[3],
                altitude=r[4],
                speed=r[5],
                heading=r[6],
                status=r[7],
            )
            for r in START
        }
        self.sequences = {k: 0 for k in self.aircraft}
        self.last = {}

    def events(self, limit=100):
        with self.lock:
            return [
                json.loads(row[0])
                for row in self.db.execute(
                    "SELECT body FROM events ORDER BY id DESC LIMIT ?", (limit,)
                )
            ]

    def snapshot(self):
        with self.lock:
            counts = {"accepted": 0, "invalid_authentication": 0, "replay": 0}
            for (body,) in self.db.execute("SELECT body FROM events"):
                counts[json.loads(body)["outcome"]] += 1
            return {
                "aircraft": [
                    {"id": k, **v.model_dump()} for k, v in self.aircraft.items()
                ],
                "events": self.events(),
                "metrics": counts,
                "session": self.session,
            }

    def send(self, request):
        with self.lock:
            sender = request.aircraft_id
            # Replay bootstraps a real accepted transmission if none exists.
            if request.action == "replay" and sender not in self.last:
                self.transmit(sender, request.confidential, "normal")
            return self.transmit(sender, request.confidential, request.action)

    def transmit(self, sender, confidential, action):
        if action == "replay":
            packet = copy.deepcopy(self.last[sender])
        else:
            self.sequences[sender] += 1
            current = self.aircraft[sender]
            # Advance ten synthetic seconds along the aircraft's heading.
            distance_nm = current.speed * 10 / 3600
            angle = math.radians(current.heading)
            latitude = current.latitude + distance_nm * math.cos(angle) / 60
            longitude = current.longitude + distance_nm * math.sin(angle) / (
                60 * math.cos(math.radians(current.latitude))
            )
            altitude_delta = (
                100
                if current.status == "Climbing"
                else -100 if current.status == "Descending" else 0
            )
            telemetry = current.model_copy(
                update={
                    "latitude": round(latitude, 4),
                    "longitude": round(longitude, 4),
                    "altitude": max(0, current.altitude + altitude_delta),
                }
            )
            message = Message(
                sender=sender,
                session=self.session,
                sequence=self.sequences[sender],
                telemetry=telemetry,
            )
            packet = self.channel.seal(message, confidential)
            if action == "tamper":
                data = bytearray(base64.b64decode(packet["data"]))
                data[len(data) // 2] ^= 1
                packet["data"] = base64.b64encode(data).decode()
        outcome, message = self.channel.receive(packet)
        if outcome == "accepted":
            self.aircraft[sender] = message.telemetry
            self.last[sender] = copy.deepcopy(packet)
        explanations = {
            "accepted": "Authentication verified; sequence advanced. Telemetry delivered to ground station.",
            "invalid_authentication": "Payload changed in transit. Authentication failed; telemetry discarded.",
            "replay": "Previously authenticated packet reused. Sequence already received; telemetry discarded.",
        }
        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sender": sender,
            "callsign": self.aircraft[sender].callsign,
            "sequence": message.sequence if message else self.sequences[sender],
            "outcome": outcome,
            "explanation": explanations[outcome],
            "mode": packet["mode"],
            "action": action,
            "bytes": len(base64.b64decode(packet["data"])),
            "tag_preview": packet["tag"][:16],
        }
        cursor = self.db.execute(
            "INSERT INTO events(body) VALUES (?)", (json.dumps(event),)
        )
        event["id"] = cursor.lastrowid
        self.db.execute(
            "UPDATE events SET body=? WHERE id=?", (json.dumps(event), event["id"])
        )
        self.db.commit()
        return event

    def reset(self):
        with self.lock:
            self.db.execute("DELETE FROM events")
            self.db.commit()
            self.initialize()
            return self.snapshot()

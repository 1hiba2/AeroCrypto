from typing import Literal
from pydantic import BaseModel, ConfigDict


class Telemetry(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    callsign: str
    latitude: float
    longitude: float
    altitude: int
    speed: int
    heading: int
    status: str


class Message(BaseModel):
    sender: str
    session: str
    sequence: int
    telemetry: Telemetry


class SendRequest(BaseModel):
    aircraft_id: Literal["AC101", "AC202", "AC303", "AC404"] = "AC101"
    action: Literal["normal", "tamper", "replay"] = "normal"
    confidential: bool = False


class Aircraft(Telemetry):
    id: str


class SecurityEvent(BaseModel):
    id: int
    timestamp: str
    sender: str
    callsign: str
    sequence: int
    outcome: Literal["accepted", "invalid_authentication", "replay"]
    explanation: str
    mode: Literal["hmac", "aes-gcm"]
    action: Literal["normal", "tamper", "replay"]
    bytes: int
    tag_preview: str


class Snapshot(BaseModel):
    aircraft: list[Aircraft]
    events: list[SecurityEvent]
    metrics: dict[str, int]
    session: str

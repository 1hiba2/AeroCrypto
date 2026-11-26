"""Process-local demo keys. Authenticate before consulting replay state."""

import base64
import hashlib
import hmac
import json
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag
from .models import Message


def canonical(message: Message) -> bytes:
    return json.dumps(
        message.model_dump(), sort_keys=True, separators=(",", ":"), allow_nan=False
    ).encode("utf-8")


class SecureChannel:
    def __init__(self):
        self.mac_key = os.urandom(32)
        self.aes = AESGCM.generate_key(bit_length=256)
        self.prefix = os.urandom(4)
        self.counter = 0
        self.highest = {}

    def seal(self, message: Message, confidential=False):
        data = canonical(message)
        mode = b"aes-gcm" if confidential else b"hmac"
        nonce = b""
        if confidential:
            if self.counter >= 2**64:
                raise RuntimeError("Nonce space exhausted; rotate key")
            nonce = self.prefix + self.counter.to_bytes(8, "big")
            self.counter += 1
            data = AESGCM(self.aes).encrypt(nonce, data, mode)
        tag = hmac.digest(self.mac_key, mode + b"\0" + nonce + data, hashlib.sha256)
        return {
            "mode": mode.decode(),
            "nonce": nonce.hex(),
            "data": base64.b64encode(data).decode(),
            "tag": tag.hex(),
        }

    def receive(self, packet):
        try:
            mode = packet["mode"].encode()
            nonce = bytes.fromhex(packet["nonce"])
            data = base64.b64decode(packet["data"], validate=True)
            expected = hmac.digest(
                self.mac_key, mode + b"\0" + nonce + data, hashlib.sha256
            )
            if not hmac.compare_digest(expected, bytes.fromhex(packet["tag"])):
                return "invalid_authentication", None
            if mode == b"aes-gcm":
                data = AESGCM(self.aes).decrypt(nonce, data, mode)
            elif mode != b"hmac":
                return "invalid_authentication", None
            message = Message.model_validate_json(data)
        except (ValueError, KeyError, TypeError, InvalidTag):
            return "invalid_authentication", None
        key = (message.sender, message.session)
        if message.sequence <= self.highest.get(key, 0):
            return "replay", message
        self.highest[key] = message.sequence
        return "accepted", message

import copy
import base64
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.models import Message, Telemetry
from app.security import SecureChannel, canonical


@pytest.fixture
def message():
    return Message(
        sender="AC101",
        session="test-session",
        sequence=1,
        telemetry=Telemetry(
            callsign="TEST",
            latitude=49.5,
            longitude=2.1,
            altitude=35000,
            speed=460,
            heading=72,
            status="Cruising",
        ),
    )


@pytest.mark.parametrize("confidential", [False, True])
def test_authentication_and_replay(message, confidential):
    channel = SecureChannel()
    packet = channel.seal(message, confidential)
    assert channel.receive(packet) == ("accepted", message)
    assert channel.receive(packet)[0] == "replay"


@pytest.mark.parametrize("confidential", [False, True])
def test_tampering_does_not_consume_sequence(message, confidential):
    channel = SecureChannel()
    packet = channel.seal(message, confidential)
    tampered = copy.deepcopy(packet)
    data = bytearray(base64.b64decode(tampered["data"]))
    data[8] ^= 1
    tampered["data"] = base64.b64encode(data).decode()
    assert channel.receive(tampered) == ("invalid_authentication", None)
    assert channel.receive(packet)[0] == "accepted"


def test_canonical(message):
    assert canonical(message) == canonical(
        Message.model_validate(dict(reversed(list(message.model_dump().items()))))
    )


def test_sequence_and_session_scoping(message):
    c = SecureChannel()
    assert (
        c.receive(c.seal(message.model_copy(update={"sequence": 3})))[0] == "accepted"
    )
    assert c.receive(c.seal(message.model_copy(update={"sequence": 2})))[0] == "replay"
    assert (
        c.receive(c.seal(message.model_copy(update={"session": "new"})))[0]
        == "accepted"
    )
    assert (
        c.receive(c.seal(message.model_copy(update={"sender": "AC202"})))[0]
        == "accepted"
    )


def test_nonce_unique_and_confidential(message):
    c = SecureChannel()
    packets = [c.seal(message, True) for _ in range(100)]
    assert len({p["nonce"] for p in packets}) == 100
    assert b"TEST" not in base64.b64decode(packets[0]["data"])
    c.counter = 2**64
    with pytest.raises(RuntimeError):
        c.seal(message, True)


@pytest.mark.parametrize(
    "field,value",
    [("tag", "00" * 32), ("mode", "other"), ("nonce", "ff" * 12), ("data", "%%%")],
)
def test_envelope_changes(message, field, value):
    c = SecureChannel()
    p = c.seal(message, True)
    p[field] = value
    assert c.receive(p)[0] == "invalid_authentication"


def test_api(tmp_path):
    with TestClient(create_app(str(tmp_path / "demo.db"))) as client:
        assert client.get("/api/health").json()["synthetic_only"]
        assert len(client.get("/api/aircraft").json()) == 4
        for action, outcome in [
            ("normal", "accepted"),
            ("tamper", "invalid_authentication"),
            ("replay", "replay"),
        ]:
            response = client.post(
                "/api/messages", json={"action": action, "confidential": True}
            )
            assert response.status_code == 200
            assert response.json()["outcome"] == outcome
        state = client.get("/api/state").json()
        assert state["metrics"] == {
            "accepted": 1,
            "invalid_authentication": 1,
            "replay": 1,
        }
        assert len(client.get("/api/events?limit=2").json()) == 2
        assert client.get("/api/events?limit=501").status_code == 422
        assert (
            client.post("/api/messages", json={"aircraft_id": "REAL"}).status_code
            == 422
        )
        reset = client.post("/api/reset").json()
        assert reset["events"] == []
        assert reset["session"] != state["session"]
        assert reset["aircraft"][0]["longitude"] == 2.1
        assert (
            client.post("/api/messages", json={"action": "replay"}).json()["outcome"]
            == "replay"
        )
        assert client.get("/api/state").json()["metrics"]["accepted"] == 1


def test_history_survives_restart(tmp_path):
    path = str(tmp_path / "history.db")
    with TestClient(create_app(path)) as client:
        client.post("/api/messages", json={})
    with TestClient(create_app(path)) as client:
        assert len(client.get("/api/events").json()) == 1
        assert client.get("/api/state").json()["metrics"]["accepted"] == 1

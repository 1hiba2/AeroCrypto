import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from .models import SendRequest, Aircraft, SecurityEvent, Snapshot
from .service import DemoService


def create_app(db_path=None):
    @asynccontextmanager
    async def lifespan(app):
        app.state.demo = DemoService(
            db_path or os.getenv("AERO_DB_PATH", "aerocrypto.sqlite3")
        )
        yield
        app.state.demo.db.close()

    app = FastAPI(title="AeroCrypto demo API", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv(
            "AERO_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(","),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.get("/api/health")
    def health():
        return {"status": "ok", "synthetic_only": True}

    @app.get("/api/state", response_model=Snapshot)
    def state():
        return app.state.demo.snapshot()

    @app.get("/api/aircraft", response_model=list[Aircraft])
    def aircraft():
        return app.state.demo.snapshot()["aircraft"]

    @app.get("/api/events", response_model=list[SecurityEvent])
    def events(limit: int = Query(100, ge=1, le=500)):
        return app.state.demo.events(limit)

    @app.post("/api/messages", response_model=SecurityEvent)
    def messages(request: SendRequest):
        return app.state.demo.send(request)

    @app.post("/api/reset", response_model=Snapshot)
    def reset():
        return app.state.demo.reset()

    return app


app = create_app()

"""
Python FastAPI Service – main module

Responsibilities:
  1. Expose /health and /compute endpoints.
  2. Connect to the shared Postgres instance to demonstrate cross-service
     database access.
  3. Provide a lightweight compute demo that n8n or the backend can call.

Environment variables:
  PYTHON_DATABASE_URL – Postgres connection string
  PYTHON_API_PORT     – listen port (default 8000, set externally by Uvicorn)
"""

from __future__ import annotations

import os
import math
import datetime
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text

# ── Logging ──────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── App ──────────────────────────────────────────────────────
app = FastAPI(
    title="Hackathon Python API",
    version="1.0.0",
    description="A lightweight FastAPI service for the hackathon platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Database ─────────────────────────────────────────────────
# Uses the Docker service name "postgres" as the host – this resolves
# inside the Docker network to the Postgres container.
DATABASE_URL = os.getenv(
    "PYTHON_DATABASE_URL",
    "postgresql://hackathon:hackathon_secret@postgres:5432/hackathon_db",
)
engine = create_engine(DATABASE_URL, pool_pre_ping=True)


# ── Startup ──────────────────────────────────────────────────
@app.on_event("startup")
def on_startup() -> None:
    """Create a demo table if it doesn't already exist."""
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS computations (
                id         SERIAL PRIMARY KEY,
                input      TEXT NOT NULL,
                result     TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """))
    logger.info("computations table ready")


# ── Routes ───────────────────────────────────────────────────

@app.get("/health")
def health():
    """Liveness probe – returns OK when the service is up."""
    return {
        "status": "ok",
        "service": "python-api",
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }


@app.get("/compute")
def compute(n: int = 42):
    """
    Demo compute endpoint.
    Computes factorial and square root, stores the result in Postgres,
    and returns it.
    """
    try:
        factorial = math.factorial(min(n, 170))  # cap to avoid overflow
        sqrt = math.sqrt(n)
        result_text = f"factorial({n})={factorial}, sqrt({n})={sqrt:.6f}"

        # Persist to the shared database
        with engine.begin() as conn:
            conn.execute(
                text("INSERT INTO computations (input, result) VALUES (:inp, :res)"),
                {"inp": str(n), "res": result_text},
            )

        return {
            "input": n,
            "factorial": str(factorial),
            "sqrt": round(sqrt, 6),
            "stored": True,
            "service": "python-api",
        }
    except Exception as exc:
        logger.error("compute error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/computations")
def list_computations(limit: int = 10):
    """Return the most recent computations from Postgres."""
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, input, result, created_at FROM computations ORDER BY id DESC LIMIT :lim"),
            {"lim": limit},
        ).fetchall()
    return [
        {"id": r[0], "input": r[1], "result": r[2], "created_at": str(r[3])}
        for r in rows
    ]

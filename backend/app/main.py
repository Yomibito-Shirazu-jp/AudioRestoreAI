# -*- coding: utf-8 -*-
"""
AudioRestoreAI — Unified Backend
WhitePrint AudioEngine Integration (Monolith FastAPI)

Merges Concertmaster + Audition + Deliberation + Rendition-DSP
into a single process with direct function calls.
"""

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.routes import analysis, mastering, pipeline

# ──────────────────────────────────────────
# Logging
# ──────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("audiorestoreai")


# ──────────────────────────────────────────
# Application Lifecycle
# ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(application: FastAPI):
    logger.info("═══════════════════════════════════════")
    logger.info("  AudioRestoreAI Engine v1.0.0")
    logger.info("  WhitePrint AudioEngine Integration")
    logger.info("  Audition ✓  Deliberation ✓  DSP ✓")
    logger.info("═══════════════════════════════════════")
    yield
    logger.info("AudioRestoreAI shutting down.")


# ──────────────────────────────────────────
# FastAPI Application
# ──────────────────────────────────────────
app = FastAPI(
    title="AudioRestoreAI",
    description="AI-Driven Audio Mastering — WhitePrint Engine",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — Allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────
# Middleware: Request Tracking
# ──────────────────────────────────────────
@app.middleware("http")
async def request_tracking_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start_time = time.monotonic()
    logger.info(f"[{request_id}] → {request.method} {request.url.path}")
    response = await call_next(request)
    duration_ms = int((time.monotonic() - start_time) * 1000)
    logger.info(f"[{request_id}] ← {response.status_code} ({duration_ms}ms)")
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Duration-Ms"] = str(duration_ms)
    return response


# ──────────────────────────────────────────
# Register Routes
# ──────────────────────────────────────────
app.include_router(analysis.router, prefix="/api", tags=["Analysis"])
app.include_router(mastering.router, prefix="/api", tags=["Mastering"])
app.include_router(pipeline.router, prefix="/api", tags=["Pipeline"])


# ──────────────────────────────────────────
# Root & Health
# ──────────────────────────────────────────
@app.get("/")
async def index() -> JSONResponse:
    return JSONResponse(content={
        "status": "online",
        "service": "AudioRestoreAI",
        "engine": "WhitePrint AudioEngine v1.0",
        "components": ["audition", "deliberation", "rendition_dsp"],
        "documentation": "/docs",
    })


@app.get("/api/health")
async def health() -> JSONResponse:
    return JSONResponse(content={
        "status": "ready",
        "service": "AudioRestoreAI",
        "version": "1.0.0",
        "engines": {
            "audition": "9-dim Time-Series Circuit Envelope",
            "deliberation": "TRIVIUM 3-Sage (GPT + Claude + Gemini)",
            "rendition_dsp": "14-Stage Analog-Modeled Mastering Chain",
        },
    })

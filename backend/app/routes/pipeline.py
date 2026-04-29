# -*- coding: utf-8 -*-
"""
Pipeline Route — Full E2E mastering pipeline

Replaces: Concertmaster /api/master (full route)
Flow: upload → analyze → deliberate → master → return

Also provides deliberation-only endpoint.
"""

import json
import os
import uuid
import time
import tempfile
import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse

from app.engine.audio_analysis import analyze_audio_file
from app.engine.deliberation import run_triadic_deliberation
from app.engine.dsp_engine import master_audio

logger = logging.getLogger("audiorestoreai.pipeline")
router = APIRouter()


@router.post("/deliberate")
async def deliberate(
    file: UploadFile = File(..., description="Audio file to analyze and deliberate"),
    target_platform: str = Form(default="streaming"),
    target_lufs: float = Form(default=-14.0),
    target_true_peak: float = Form(default=-1.0),
) -> JSONResponse:
    """
    Analyze audio → 3-Sage LLM deliberation → return DSP parameters.

    This is the "brain" of the mastering pipeline:
    GRAMMATICA (GPT) × LOGICA (Claude) × RHETORICA (Gemini)
    → weighted median merge → adopted DSP params
    """
    # Write upload to temp
    suffix = os.path.splitext(file.filename or ".wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        while True:
            chunk = await file.read(65536)
            if not chunk:
                break
            tmp.write(chunk)

    # Step 1: Analyze
    try:
        analysis = analyze_audio_file(tmp_path)
    except Exception as e:
        os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    # Step 2: Deliberate (3 LLM calls in parallel)
    try:
        deliberation_result = await run_triadic_deliberation(
            analysis_data=analysis,
            target_platform=target_platform,
            target_lufs=target_lufs,
            target_true_peak=target_true_peak,
        )
    except Exception as e:
        logger.error(f"Deliberation failed: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Deliberation failed: {type(e).__name__}: {e}",
        )

    return JSONResponse(content={
        "analysis": analysis,
        "deliberation": deliberation_result,
        "adopted_params": deliberation_result.get("adopted_params", {}),
    })


@router.post("/master/full")
async def master_full(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Audio file for full E2E mastering"),
    target_platform: str = Form(default="streaming"),
    target_lufs: float = Form(default=-14.0),
    target_true_peak: float = Form(default=-1.0),
) -> FileResponse:
    """
    Full autonomous mastering pipeline (E2E):

    1. BS.1770-4 Audio Analysis (Audition engine)
    2. 3-Sage LLM Deliberation (GRAMMATICA × LOGICA × RHETORICA)
    3. Weighted Median Merge → DSP Parameters
    4. 14-Stage Mastering Chain (Rendition-DSP engine)
    5. Return mastered WAV

    This is the single endpoint that replaces the entire
    Concertmaster → Audition → Deliberation → Rendition-DSP
    microservice pipeline.
    """
    t0 = time.time()

    # Write upload to temp
    suffix = os.path.splitext(file.filename or ".wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_in:
        input_path = tmp_in.name
        while True:
            chunk = await file.read(65536)
            if not chunk:
                break
            tmp_in.write(chunk)

    logger.info(f"[E2E] Starting full pipeline for {file.filename}")

    # ── Step 1: Analyze ──
    logger.info("[E2E] Step 1/4: Audio Analysis (Audition)")
    try:
        analysis = analyze_audio_file(input_path)
    except Exception as e:
        os.remove(input_path)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

    # ── Step 2: Deliberate ──
    logger.info("[E2E] Step 2/4: 3-Sage Deliberation")
    try:
        deliberation_result = await run_triadic_deliberation(
            analysis_data=analysis,
            target_platform=target_platform,
            target_lufs=target_lufs,
            target_true_peak=target_true_peak,
        )
    except Exception as e:
        os.remove(input_path)
        raise HTTPException(
            status_code=500,
            detail=f"Deliberation failed: {type(e).__name__}: {e}",
        )

    # ── Step 3: Extract DSP params ──
    dsp_params = deliberation_result.get("adopted_params", {})
    logger.info(f"[E2E] Step 3/4: DSP Params adopted (score={deliberation_result.get('deliberation_score', 'N/A')})")

    # ── Step 4: Master ──
    logger.info("[E2E] Step 4/4: 14-Stage Mastering Chain (Rendition-DSP)")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_out:
        output_path = tmp_out.name

    try:
        metrics = master_audio(
            input_path=input_path,
            output_path=output_path,
            params=dsp_params,
            target_lufs=target_lufs,
            target_true_peak=target_true_peak,
        )
    except Exception as e:
        os.remove(input_path)
        os.remove(output_path)
        raise HTTPException(
            status_code=500,
            detail=f"Mastering failed: {type(e).__name__}: {e}",
        )
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

    elapsed_ms = int((time.time() - t0) * 1000)

    # Build comprehensive response metadata
    pipeline_meta = {
        "route": "full_e2e",
        "elapsed_ms": elapsed_ms,
        "analysis_summary": {
            "lufs": analysis.get("whole_track_metrics", {}).get("integrated_lufs"),
            "true_peak": analysis.get("whole_track_metrics", {}).get("true_peak_dbtp"),
            "bpm": analysis.get("track_identity", {}).get("bpm"),
        },
        "deliberation_score": deliberation_result.get("deliberation_score"),
        "dsp_metrics": metrics,
    }

    logger.info(
        f"[E2E] Complete in {elapsed_ms}ms: "
        f"LUFS {metrics.get('lufs_before')} → {metrics.get('lufs_after')}, "
        f"TP {metrics.get('true_peak_before')} → {metrics.get('true_peak_after')}"
    )

    # Cleanup output after response
    background_tasks.add_task(
        lambda p: os.remove(p) if os.path.exists(p) else None, output_path
    )

    return FileResponse(
        path=output_path,
        media_type="audio/wav",
        filename=f"mastered_{file.filename or 'output.wav'}",
        headers={
            "X-Metrics": json.dumps(metrics),
            "X-Pipeline": json.dumps(pipeline_meta),
        },
    )

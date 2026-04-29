# -*- coding: utf-8 -*-
"""
Mastering Route — Audio + DSP params → mastered WAV + metrics

Replaces: Rendition-DSP /internal/master + /internal/master-url
Now: Direct function call to dsp_engine.master_audio()
"""

import json
import os
import tempfile
import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse

from app.engine.dsp_engine import master_audio

logger = logging.getLogger("audiorestoreai.mastering")
router = APIRouter()

MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500MB


@router.post("/master")
async def master(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Audio file to master (WAV)"),
    params: str = Form(default="{}", description="DSP parameter JSON"),
    target_lufs: float = Form(default=-14.0, description="Target integrated LUFS"),
    target_true_peak: float = Form(default=-1.0, description="Target true peak (dBTP)"),
) -> FileResponse:
    """
    Apply 14-stage analog-modeled mastering chain.

    Accepts audio file + DSP parameters (from deliberation or manual).
    Returns mastered WAV file with metrics in X-Metrics header.
    """
    # Parse params
    try:
        dsp_params = json.loads(params)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Invalid params JSON")

    # Write upload to temp
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_in:
        input_path = tmp_in.name
        total_bytes = 0
        while True:
            chunk = await file.read(65536)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_UPLOAD_SIZE:
                os.remove(input_path)
                raise HTTPException(status_code=413, detail="File too large")
            tmp_in.write(chunk)

    if total_bytes < 100:
        os.remove(input_path)
        raise HTTPException(status_code=422, detail="Audio data too small")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_out:
        output_path = tmp_out.name

    logger.info(
        f"Mastering: {file.filename} ({total_bytes / 1024 / 1024:.1f}MB) "
        f"→ target {target_lufs} LUFS / {target_true_peak} dBTP"
    )

    # Run 14-stage chain (direct function call — no HTTP)
    try:
        metrics = master_audio(
            input_path=input_path,
            output_path=output_path,
            params=dsp_params,
            target_lufs=target_lufs,
            target_true_peak=target_true_peak,
        )
    except Exception as e:
        logger.error(f"Mastering failed: {type(e).__name__}: {e}")
        if os.path.exists(input_path):
            os.remove(input_path)
        if os.path.exists(output_path):
            os.remove(output_path)
        raise HTTPException(
            status_code=500,
            detail=f"Mastering failed: {type(e).__name__}: {e}",
        )
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

    logger.info(
        f"Mastering complete: LUFS {metrics.get('lufs_before')} → {metrics.get('lufs_after')}, "
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
        headers={"X-Metrics": json.dumps(metrics)},
    )


@router.post("/master/with-defaults")
async def master_with_defaults(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Audio file to master (WAV)"),
    target_lufs: float = Form(default=-14.0),
    target_true_peak: float = Form(default=-1.0),
) -> FileResponse:
    """Master with safe default parameters (no LLM deliberation needed)."""
    # Default params = neutral mastering chain
    default_params = {
        "input_gain_db": 0,
        "eq_low_shelf_gain_db": 0,
        "eq_low_mid_gain_db": 0,
        "eq_high_mid_gain_db": 0,
        "eq_high_shelf_gain_db": 0,
        "ms_side_high_gain_db": 0,
        "ms_mid_low_gain_db": 0,
        "comp_threshold_db": -12,
        "comp_ratio": 2.5,
        "comp_attack_sec": 0.01,
        "comp_release_sec": 0.15,
        "limiter_ceil_db": -0.1,
        "transformer_saturation": 0.3,
        "transformer_mix": 0.4,
        "triode_drive": 0.4,
        "triode_bias": -1.2,
        "triode_mix": 0.5,
        "tape_saturation": 0.3,
        "tape_mix": 0.4,
        "dyn_eq_enabled": 1,
        "stereo_low_mono": 0.8,
        "stereo_high_wide": 1.15,
        "stereo_width": 1.0,
        "parallel_wet": 0.18,
    }

    # Reuse the main endpoint logic
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_in:
        input_path = tmp_in.name
        while True:
            chunk = await file.read(65536)
            if not chunk:
                break
            tmp_in.write(chunk)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_out:
        output_path = tmp_out.name

    try:
        metrics = master_audio(
            input_path=input_path,
            output_path=output_path,
            params=default_params,
            target_lufs=target_lufs,
            target_true_peak=target_true_peak,
        )
    except Exception as e:
        if os.path.exists(input_path):
            os.remove(input_path)
        if os.path.exists(output_path):
            os.remove(output_path)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

    background_tasks.add_task(
        lambda p: os.remove(p) if os.path.exists(p) else None, output_path
    )

    return FileResponse(
        path=output_path,
        media_type="audio/wav",
        filename=f"mastered_{file.filename or 'output.wav'}",
        headers={"X-Metrics": json.dumps(metrics)},
    )

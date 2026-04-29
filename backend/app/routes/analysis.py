# -*- coding: utf-8 -*-
"""
Analysis Route — Audio file upload → BS.1770-4 analysis + 9-dim envelopes

Replaces: Audition /internal/analyze + /internal/analyze-url
Now: Direct function call to audio_analysis.analyze_audio_file()
"""

import io
import os
import uuid
import tempfile
import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.engine.audio_analysis import analyze_audio_file

logger = logging.getLogger("audiorestoreai.analysis")
router = APIRouter()

MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500MB


@router.post("/analyze")
async def analyze_audio(
    file: UploadFile = File(..., description="Audio file (WAV/FLAC/MP3)"),
) -> JSONResponse:
    """
    Upload audio file → BS.1770-4 compliant analysis.

    Returns:
        9-dimensional Time-Series Circuit Envelope analysis including:
        - track_identity (BPM, key, duration)
        - whole_track_metrics (LUFS, true peak, crest, band ratios, risk scores)
        - physical_sections (onset-detected segments with per-section metrics)
        - raw_sections (time-series envelope data)
    """
    if not file.filename:
        raise HTTPException(status_code=422, detail="No filename provided")

    # Read upload to temp file (avoid 32MB memory limit for large files)
    suffix = os.path.splitext(file.filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        total_bytes = 0
        while True:
            chunk = await file.read(65536)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_UPLOAD_SIZE:
                os.remove(tmp_path)
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large: {total_bytes / 1024 / 1024:.0f}MB (max 500MB)",
                )
            tmp.write(chunk)

    if total_bytes < 100:
        os.remove(tmp_path)
        raise HTTPException(status_code=422, detail="Audio file too small")

    logger.info(f"Received {file.filename} ({total_bytes / 1024 / 1024:.1f}MB)")

    # Run analysis (direct function call — no HTTP)
    try:
        result = analyze_audio_file(tmp_path)
    except Exception as e:
        logger.error(f"Analysis failed: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {type(e).__name__}: {e}",
        )
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    # Augment result with frontend-compatible diagnosis format
    diagnosis = _convert_to_diagnosis(result, file.filename)

    return JSONResponse(content={
        "analysis": result,
        "diagnosis": diagnosis,
    })


def _convert_to_diagnosis(analysis: dict, filename: str) -> dict:
    """Convert WhitePrint analysis to AudioRestoreAI DiagnosisResult format.

    Bridges the gap between the engine's raw metrics and the frontend's
    expected DiagnosisResult type interface.
    """
    whole = analysis.get("whole_track_metrics", {})
    track_id = analysis.get("track_identity", {})

    # Map WhitePrint metrics to diagnosis issues
    detected_issues = {
        "loudness_lufs": whole.get("integrated_lufs", -23.0),
        "true_peak_dbtp": whole.get("true_peak_dbtp", -1.0),
        "stereo_width": whole.get("stereo_width", 0.0),
        "phase_risk": 1.0 - max(0, min(1, whole.get("stereo_correlation", 1.0))),
        "mono_detected": whole.get("stereo_width", 1.0) < 0.1,
    }

    # Risk-based issue detection
    harshness = whole.get("harshness_risk", 0)
    mud = whole.get("mud_risk", 0)
    crest = whole.get("crest_db", 20)

    if harshness > 0.3:
        detected_issues["high_frequency_loss"] = {
            "severity": harshness,
            "label": "high" if harshness > 0.6 else "medium" if harshness > 0.3 else "low",
        }
    if mud > 0.3:
        detected_issues["muddiness"] = {
            "severity": mud,
            "label": "high" if mud > 0.6 else "medium" if mud > 0.3 else "low",
        }
    if crest < 6:
        detected_issues["clipping"] = {
            "severity": min(1.0, (10 - crest) / 10),
            "label": "high" if crest < 3 else "medium",
        }

    # Generate recommended treatments based on analysis
    treatments = []
    lufs = whole.get("integrated_lufs", -23)
    if lufs < -18:
        treatments.append({
            "treatment": "loudness_remaster",
            "strength": min(1.0, (-14 - lufs) / 20),
            "reason": f"現在の音量 ({lufs:.1f} LUFS) はストリーミング基準 (-14 LUFS) を下回っています。",
        })
    if mud > 0.3:
        treatments.append({
            "treatment": "eq_recovery",
            "strength": mud,
            "reason": "低中域のこもり (Mud) を検出しました。EQ補正を推奨します。",
        })
    if harshness > 0.3:
        treatments.append({
            "treatment": "de_harsh",
            "strength": harshness,
            "reason": "高域のハーシュネスを検出しました。ダイナミックEQで軽減可能です。",
        })
    if whole.get("stereo_width", 1.0) < 0.3:
        treatments.append({
            "treatment": "stereo_restoration",
            "strength": 0.6,
            "reason": "ステレオ幅が狭いです。空間的な広がりの復元を推奨します。",
        })

    summary_parts = []
    if treatments:
        summary_parts.append(f"{len(treatments)}件の処理を推奨")
    summary_parts.append(f"LUFS: {lufs:.1f}")
    summary_parts.append(f"BPM: {track_id.get('bpm', 'N/A')}")

    return {
        "diagnosis_id": f"dia_{uuid.uuid4().hex[:12]}",
        "status": "completed",
        "asset_id": f"ast_{uuid.uuid4().hex[:12]}",
        "summary": "。".join(summary_parts) + "。",
        "detected_issues": detected_issues,
        "recommended_treatments": treatments,
        "confidence": 0.92,
        "track_identity": track_id,
        "whole_track_metrics": whole,
    }

<div align="center">

# 🎛️ AudioRestoreAI

### Autonomous Audio Restoration & Mastering Engine

**劣化音源をAIが自律的に解析・修復・マスタリングする統合エンジン**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

---

*Upload degraded audio → AI analyzes, deliberates, and applies 14-stage professional DSP → Download restored master*

</div>

## What is this?

AudioRestoreAI is a **self-contained audio restoration and mastering system** that replaces the manual workflow of a human mastering engineer with an AI-driven pipeline.

It was designed for one specific problem: **historical and degraded audio recordings** — old tapes, vinyl transfers, lo-fi field recordings — that need to be brought to modern broadcast/streaming standards without destroying their character.

### The Pipeline

```
                    ┌─────────────────────────────┐
                    │         INPUT AUDIO          │
                    │   (degraded WAV/MP3/FLAC)    │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      ① AUDITION ENGINE       │
                    │                              │
                    │  BS.1770-4 loudness metering  │
                    │  9-dimensional spectral scan  │
                    │  Onset detection & sectioning │
                    │  BPM / Key / Crest analysis   │
                    └──────────────┬──────────────┘
                                   │ analysis JSON
                    ┌──────────────▼──────────────┐
                    │    ② DELIBERATION ENGINE     │
                    │        (TRIVIUM Council)      │
                    │                              │
                    │  GRAMMATICA ─── GPT-4.1      │
                    │  LOGICA ─────── Claude Opus   │
                    │  RHETORICA ──── Gemini 2.5    │
                    │                              │
                    │  Each proposes DSP params     │
                    │  independently, then:         │
                    │  ┌────────────────────────┐  │
                    │  │ Weighted Median Merge   │  │
                    │  │ (conflict resolution)   │  │
                    │  └────────────────────────┘  │
                    └──────────────┬──────────────┘
                                   │ adopted params
                    ┌──────────────▼──────────────┐
                    │     ③ RENDITION-DSP ENGINE   │
                    │     (14-Stage Analog Chain)   │
                    │                              │
                    │  DC Block → HPF → Noise Gate │
                    │  → De-ess → Multiband Comp   │
                    │  → Parametric EQ → Saturation│
                    │  → Stereo Width → Exciter    │
                    │  → Bus Comp → Clipper        │
                    │  → True Peak Limiter         │
                    │  → Final Loudness Normalize  │
                    │  → Dither                    │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │       OUTPUT MASTER          │
                    │   (broadcast-ready WAV)       │
                    │   LUFS-compliant, TP-safe     │
                    └─────────────────────────────┘
```

### Why Three AIs?

A single LLM hallucinates. Three LLMs with different architectures, given the same spectral analysis, produce independent mastering proposals. The **weighted median merge** algorithm resolves conflicts — not by averaging (which would produce mediocrity), but by selecting the median value per parameter, weighted by each model's confidence score. This mimics how a senior engineer resolves disagreements in a mastering session.

| Sage | Model | Role | Strength |
|------|-------|------|----------|
| **GRAMMATICA** | GPT-4.1 | Engineer | Precise parametric control, gain staging |
| **LOGICA** | Claude Opus | Structure Guard | Conservative dynamics, artifact prevention |
| **RHETORICA** | Gemini 2.5 | Form Analyst | Tonal balance, spectral aesthetics |

## Project Structure

```
AudioRestoreAI/
├── backend/
│   ├── app/
│   │   ├── engine/
│   │   │   ├── audio_analysis.py    # Audition: BS.1770-4 analysis
│   │   │   ├── deliberation.py      # 3-Sage LLM council
│   │   │   ├── merge_rule.py        # Weighted median merge
│   │   │   └── dsp_engine.py        # 14-stage mastering chain
│   │   ├── routes/
│   │   │   ├── analysis.py          # POST /api/analyze
│   │   │   ├── mastering.py         # POST /api/master
│   │   │   └── pipeline.py          # POST /api/master/full (E2E)
│   │   └── main.py                  # FastAPI application
│   ├── .env.example                 # API key template
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── App.tsx                      # Main UI
│   ├── services/api.ts              # Backend API client
│   ├── types.ts                     # TypeScript interfaces
│   └── vite.config.ts               # Dev server + proxy
└── README.md
```

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.10+ | Backend runtime |
| Node.js | 18+ | Frontend dev server |
| [gcloud CLI](https://cloud.google.com/sdk/docs/install) | Latest | Vertex AI authentication |

### 1. Clone & Configure

```bash
git clone https://github.com/Yomibito-Shirazu-jp/AudioRestoreAI.git
cd AudioRestoreAI

# Set up API keys
cp backend/.env.example backend/.env.local
# Edit backend/.env.local with your keys (see below)
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
python run.py
# ✓ Running on http://127.0.0.1:8000
# ✓ Swagger UI: http://127.0.0.1:8000/docs
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# ✓ Running on http://localhost:5173
```

### API Keys

The Deliberation engine requires API keys from three providers. Without them, the system falls back to default parameters (still functional, but not AI-tuned).

```env
# backend/.env.local

# Required for GRAMMATICA sage
OPENAI_API_KEY=sk-proj-xxx

# Required for LOGICA sage
ANTHROPIC_API_KEY=sk-ant-xxx

# Required for RHETORICA sage (uses Google ADC)
# Run: gcloud auth application-default login
GCP_PROJECT_ID=your-project
```

## API Reference

### `POST /api/analyze`

Upload audio → receive BS.1770-4 analysis.

```bash
curl -X POST http://127.0.0.1:8000/api/analyze \
  -F "file=@input.wav"
```

**Response**: JSON with `track_identity` (BPM, key, duration), `whole_track_metrics` (LUFS, true peak, crest factor, spectral ratios), `physical_sections` (onset-detected segments).

### `POST /api/master/full`

Full autonomous pipeline: analyze → deliberate → master.

```bash
curl -X POST http://127.0.0.1:8000/api/master/full \
  -F "file=@input.wav" \
  -F "target_lufs=-14.0" \
  -F "target_true_peak=-1.0" \
  -o mastered.wav
```

**Response**: Mastered WAV file. Metrics in `X-Metrics` header.

### `POST /api/master/with-defaults`

Master with safe neutral parameters (no LLM calls, no API keys needed).

```bash
curl -X POST http://127.0.0.1:8000/api/master/with-defaults \
  -F "file=@input.wav" \
  -o mastered.wav
```

### `POST /api/deliberate`

Run 3-Sage deliberation only (returns parameters, does not apply DSP).

### `POST /api/master`

Apply DSP with explicit parameters (bypass deliberation).

## Technical Details

### Audition Engine

The analysis engine produces a **9-dimensional Time-Series Circuit Envelope** per audio file:

| Dimension | Measurement |
|-----------|-------------|
| Integrated Loudness | LUFS (BS.1770-4) |
| True Peak | dBTP |
| Short-term Loudness | LUFS over 3s windows |
| Momentary Loudness | LUFS over 400ms windows |
| Crest Factor | Peak-to-RMS ratio |
| Spectral Centroid | Frequency center of mass |
| Low/Mid/High Ratio | Band energy distribution |
| Stereo Width | Correlation coefficient |
| Dynamic Range | LRA (Loudness Range) |

### DSP Chain (14 Stages)

Each stage is modeled after analog hardware behavior with oversampling and anti-aliasing:

1. **DC Blocker** — Remove DC offset
2. **High-pass Filter** — Subsonic rumble removal
3. **Noise Gate** — Below-threshold silence
4. **De-esser** — Sibilance control (4–9 kHz)
5. **Multiband Compressor** — 4-band dynamics
6. **Parametric EQ** — Surgical frequency correction
7. **Harmonic Saturation** — Tube/tape warmth modeling
8. **Stereo Enhancer** — M/S processing width control
9. **Exciter** — High-frequency harmonic generation
10. **Bus Compressor** — Glue compression
11. **Soft Clipper** — Transient shaping
12. **True Peak Limiter** — BS.1770-4 compliant ceiling
13. **Loudness Normalization** — Target LUFS alignment
14. **Dither** — Noise shaping for bit-depth reduction

### Merge Algorithm

The weighted median merge resolves parameter conflicts between the three sages:

```
For each DSP parameter P:
  1. Collect proposals: [P_grammatica, P_logica, P_rhetorica]
  2. Collect confidence scores: [C_grammatica, C_logica, C_rhetorica]
  3. Sort proposals by value
  4. Find weighted median (the value where cumulative weight ≥ 50%)
  5. adopted[P] = weighted_median
```

This prevents any single model from dominating the result while avoiding the "average of extremes" problem.

## Origin

This project integrates four previously separate microservices from the [WhitePrint AudioEngine](https://github.com/Yomibito-Shirazu-jp) into a single deployable application:

| Original Service | → | Integrated Module |
|-----------------|---|-------------------|
| WhitePrintAudioEngine-Audition | → | `engine/audio_analysis.py` |
| WhitePrintAudioEngine-Deliberation | → | `engine/deliberation.py` + `engine/merge_rule.py` |
| WhitePrintAudioEngine-Rendition-DSP | → | `engine/dsp_engine.py` |
| WhitePrintAudioEngine-Concertmaster | → | `routes/pipeline.py` (orchestration) |

The microservice HTTP overhead was eliminated — all engines now communicate via direct Python function calls within a single process.

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
<sub>Built by <a href="https://github.com/Yomibito-Shirazu-jp">Yomibito-Shirazu-jp</a></sub>
</div>

# AudioRestoreAI

**AI-driven autonomous audio restoration & mastering system.**

Upload degraded or raw audio → AI analyzes, deliberates, and applies professional-grade DSP processing → download mastered output.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  React Frontend (Vite)                          │
│  Upload → Diagnosis → Processing → Download     │
└──────────────────┬──────────────────────────────┘
                   │ /api/*
┌──────────────────▼──────────────────────────────┐
│  FastAPI Backend (Python)                        │
│                                                  │
│  ┌──────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ Audition │  │Deliberation │  │Rendition   │ │
│  │ BS.1770  │→ │ 3-Sage LLM  │→ │ 14-stage   │ │
│  │ Analysis │  │ GPT+Claude  │  │ DSP Chain  │ │
│  │          │  │ +Gemini     │  │            │ │
│  └──────────┘  └─────────────┘  └────────────┘ │
└─────────────────────────────────────────────────┘
```

### Pipeline

1. **Audition** — BS.1770-4 compliant audio analysis (LUFS, true peak, spectral balance, BPM, key detection)
2. **Deliberation** — 3 AI models (GPT / Claude / Gemini) independently propose mastering parameters, then a weighted-median merge produces the final consensus
3. **Rendition-DSP** — 14-stage analog-modeled mastering chain (EQ, compression, stereo enhancement, harmonic saturation, limiting, etc.)

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (for Vertex AI / Gemini)

### Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/AudioRestoreAI.git
cd AudioRestoreAI

# Backend
cd backend
cp .env.example .env.local   # Edit with your API keys
pip install -r requirements.txt
python run.py                 # → http://127.0.0.1:8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev                   # → http://localhost:5173
```

### API Keys

Edit `backend/.env.local` with your keys:

| Key | Service | Role |
|-----|---------|------|
| `OPENAI_API_KEY` | OpenAI | GRAMMATICA (Engineer sage) |
| `ANTHROPIC_API_KEY` | Anthropic | LOGICA (Structure sage) |
| GCP ADC | Google Vertex AI | RHETORICA (Form sage) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/analyze` | BS.1770-4 audio analysis |
| `POST` | `/api/deliberate` | 3-Sage LLM parameter deliberation |
| `POST` | `/api/master` | Apply DSP with explicit parameters |
| `POST` | `/api/master/with-defaults` | Master with safe defaults |
| `POST` | `/api/master/full` | Full E2E pipeline (analyze → deliberate → master) |

## Tech Stack

- **Backend**: Python, FastAPI, NumPy, SciPy, soundfile
- **Frontend**: React, TypeScript, Vite, Recharts, Lucide
- **AI**: OpenAI GPT-4.1, Anthropic Claude Opus, Google Gemini 2.5
- **Audio**: BS.1770-4, 14-stage DSP chain, analog modeling

## License

MIT

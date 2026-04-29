"""
AudioRestoreAI Backend — Entry Point
Usage: python -m app
"""
import uvicorn
import os

from dotenv import load_dotenv

# Load .env.local
env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
load_dotenv(env_path)

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", 8000)),
        reload=True,
        log_level="info",
    )

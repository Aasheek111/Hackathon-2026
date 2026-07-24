"""NeuroLearn RAG service — FastAPI entry point.

    uvicorn app.main:app --reload --port 8100

Port 8100 because cv-service already owns 8000.

Static mounts are ordered deliberately: the more specific /static/images (which
serves the uploads directory) must be registered before the general /static.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import rag_engine as engine
from .routes import router

# directories must exist before StaticFiles is mounted, or startup fails on a
# fresh clone
engine.ensure_directories()

app = FastAPI(
    title="NeuroLearn RAG Service",
    version="1.0.0",
    description=(
        "Teachers upload unit PDFs; students get a tutorial adapted to their needs and to the "
        "learning mode the platform has switched them into."
    ),
)

# wide open: this is a hackathon backend meant to be called from a separate
# frontend on another port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static/images", StaticFiles(directory=str(engine.IMAGE_DIR)), name="images")
app.mount("/static/audio", StaticFiles(directory=str(engine.AUDIO_DIR)), name="audio")
app.mount("/static", StaticFiles(directory=str(engine.STATIC_DIR)), name="static")

app.include_router(router)


@app.get("/", include_in_schema=False)
def index():
    """Serve the demo page."""
    page = engine.STATIC_DIR / "index.html"
    if not page.exists():
        return JSONResponse({"detail": "static/index.html is missing"}, status_code=404)
    return FileResponse(page)

"""API endpoints.

Thin on purpose: parse the request, call `rag_engine`, shape the response. Every
file operation is wrapped, because a hackathon demo failing with a raw traceback
in the console is a demo nobody can debug on stage.
"""

from __future__ import annotations

import shutil
import time
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

from . import rag_engine as engine
from .models import (
    HealthResponse,
    ImageUploadResponse,
    PdfUploadResponse,
    TutorialRequest,
    TutorialResponse,
)

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    """Is the key configured, and which units are ready to generate from?"""
    return HealthResponse(
        status="ok",
        openai_key_configured=engine.api_key_present(),
        processed_units=engine.processed_units(),
    )


@router.post("/upload-pdf", response_model=PdfUploadResponse, tags=["ingest"])
async def upload_pdf(unit_id: int = Form(...), file: UploadFile = File(...)) -> PdfUploadResponse:
    """Save a unit PDF, split it, embed it, and persist a FAISS index."""
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="That file is not a PDF")

    target = engine.pdf_path(unit_id)
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("wb") as handle:
            shutil.copyfileobj(file.file, handle)
    except OSError as failure:
        raise HTTPException(status_code=500, detail=f"Could not save the PDF: {failure}") from failure
    finally:
        await file.close()

    try:
        text = engine.extract_text(target)
    except Exception as failure:  # a corrupt or encrypted PDF lands here
        raise HTTPException(status_code=500, detail=f"Could not read the PDF: {failure}") from failure

    if not text:
        # Almost always a scan. Say so plainly instead of indexing nothing and
        # letting the teacher wonder why the tutorial is empty.
        raise HTTPException(
            status_code=400,
            detail="No text found in that PDF. If it is a scan, it needs OCR before it can be used.",
        )

    chunks = engine.split_text(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="The PDF produced no usable text chunks")

    try:
        total = engine.build_index(unit_id, chunks)
    except RuntimeError as failure:  # missing API key
        raise HTTPException(status_code=500, detail=str(failure)) from failure
    except Exception as failure:
        raise HTTPException(
            status_code=500, detail=f"Could not build the vector index: {failure}"
        ) from failure

    return PdfUploadResponse(status="success", unit_id=unit_id, chunks=total)


@router.post("/upload-image", response_model=ImageUploadResponse, tags=["ingest"])
async def upload_image(unit_id: int = Form(...), file: UploadFile = File(...)) -> ImageUploadResponse:
    """Save a unit image and hand back the URL the frontend should use."""
    filename = f"unit_{unit_id}_{int(time.time() * 1000)}.png"
    target: Path = engine.IMAGE_DIR / filename

    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        # round-tripping through Pillow both validates the upload and
        # normalises whatever came in (jpg, webp, ...) to a single format
        image = Image.open(file.file)
        image.convert("RGBA" if image.mode in ("RGBA", "LA", "P") else "RGB").save(target, "PNG")
    except UnidentifiedImageError as failure:
        raise HTTPException(status_code=400, detail="That file is not an image") from failure
    except OSError as failure:
        raise HTTPException(
            status_code=500, detail=f"Could not save the image: {failure}"
        ) from failure
    finally:
        await file.close()

    return ImageUploadResponse(status="success", image_url=f"/static/images/{filename}")


@router.post("/generate-tutorial", response_model=TutorialResponse, tags=["generate"])
def generate_tutorial(request: TutorialRequest) -> TutorialResponse:
    """Retrieve the most relevant chunks for this student and adapt them."""
    if not engine.unit_is_processed(request.unit_id):
        # the spec's exact error shape
        return JSONResponse(status_code=404, content={"error": "Unit not processed yet"})

    try:
        payload = engine.generate_tutorial(
            request.unit_id, request.student_diagnosis, request.learning_mode
        )
    except ValueError as failure:  # the model returned something that was not JSON
        raise HTTPException(
            status_code=500, detail=f"The model did not return valid JSON: {failure}"
        ) from failure
    except Exception as failure:
        raise HTTPException(status_code=500, detail=f"Generation failed: {failure}") from failure

    return TutorialResponse(**payload)

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
from . import youtube_quiz as yt
from .celery_app import celery_app
from .models import (
    ExtractYoutubeIdRequest,
    ExtractYoutubeIdResponse,
    GenerateCurriculumRequest,
    GenerateSpeechRequest,
    GenerateSpeechResponse,
    GenerateStorybookRequest,
    GenerateVisualRequest,
    GenerateYoutubeQuizRequest,
    HealthResponse,
    ImageUploadResponse,
    PdfUploadResponse,
    TutorialRequest,
    TutorialResponse,
)
from .tasks import generate_curriculum, generate_storybook, generate_youtube_quiz, ping

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    """Is the key configured, and which units are ready to generate from?"""
    return HealthResponse(
        status="ok",
        ai_key_configured=engine.groq_key_present(),
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


@router.post("/internal/celery-ping", tags=["system"])
def celery_ping() -> dict:
    """Proof-of-life for the Celery+Redis wiring: enqueues a trivial task onto
    redis and returns its id immediately (this endpoint must not block on the
    result - that would defeat the point of a background queue).
    """
    task = ping.delay()
    return {"task_id": task.id}


@router.get("/internal/celery-ping/{task_id}", tags=["system"])
def celery_ping_status(task_id: str) -> dict:
    """Poll for the ping task's result - proves a separate celery-worker
    container actually received and executed the task, not just that it sat
    in the queue.
    """
    result = celery_app.AsyncResult(task_id)
    return {"task_id": task_id, "status": result.status, "result": result.result if result.ready() else None}


@router.post("/generate-visual", response_model=ImageUploadResponse, tags=["generate"])
def generate_visual(request: GenerateVisualRequest) -> ImageUploadResponse:
    """Turn a visual_suggestion (or a student's custom request) into a picture."""
    image_url = engine.generate_visual_image(request.prompt, request.unit_id, request.image_query)
    if not image_url:
        raise HTTPException(
            status_code=502,
            detail="Could not generate an image right now (no API key, or the request was blocked/failed)",
        )
    return ImageUploadResponse(status="success", image_url=image_url)


@router.post("/generate-curriculum", tags=["generate"])
def generate_curriculum_endpoint(request: GenerateCurriculumRequest) -> dict:
    """Enqueues the full-document curriculum generation task and returns
    immediately - the actual work (minutes long) runs in the celery-worker
    container, not in this request.
    """
    if not engine.unit_is_processed(request.unit_id):
        raise HTTPException(status_code=404, detail="Unit not processed yet")

    task = generate_curriculum.delay(request.job_id, request.unit_id, request.grade_level)
    return {"status": "queued", "celery_task_id": task.id}


@router.post("/generate-storybook", tags=["generate"])
def generate_storybook_endpoint(request: GenerateStorybookRequest) -> dict:
    """Enqueues the 5-page storybook generation (one text call + up to 5
    image generations) and returns immediately, same fire-and-forget pattern
    as /generate-curriculum.
    """
    if not engine.unit_is_processed(request.unit_id):
        raise HTTPException(status_code=404, detail="Unit not processed yet")

    task = generate_storybook.delay(
        request.storybook_id, request.unit_id, request.curriculum_title, request.grade_level
    )
    return {"status": "queued", "celery_task_id": task.id}


@router.post("/extract-youtube-id", response_model=ExtractYoutubeIdResponse, tags=["youtube"])
def extract_youtube_id(request: ExtractYoutubeIdRequest) -> ExtractYoutubeIdResponse:
    video_id = yt.extract_video_id(request.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="That doesn't look like a valid YouTube URL")
    return ExtractYoutubeIdResponse(video_id=video_id)


@router.post("/generate-youtube-quiz", tags=["generate"])
def generate_youtube_quiz_endpoint(request: GenerateYoutubeQuizRequest) -> dict:
    """Enqueues transcript fetch + quiz generation and returns immediately -
    both steps are external API calls, slow enough to belong on the queue.
    """
    task = generate_youtube_quiz.delay(request.quiz_id, request.video_id)
    return {"status": "queued", "celery_task_id": task.id}


@router.post("/generate-speech", response_model=GenerateSpeechResponse, tags=["generate"])
def generate_speech_endpoint(request: GenerateSpeechRequest) -> GenerateSpeechResponse:
    """Synchronous - a single TTS call is fast enough not to need the queue,
    unlike the multi-call curriculum/YouTube-quiz pipelines.
    """
    audio_url = engine.generate_speech(request.text, request.voice)
    if not audio_url:
        raise HTTPException(status_code=502, detail="Could not generate speech right now")
    return GenerateSpeechResponse(status="success", audio_url=audio_url)


@router.post("/generate-tutorial", response_model=TutorialResponse, tags=["generate"])
def generate_tutorial(request: TutorialRequest) -> TutorialResponse:
    """Retrieve the most relevant chunks for this student and adapt them."""
    if not engine.unit_is_processed(request.unit_id):
        # the spec's exact error shape
        return JSONResponse(status_code=404, content={"error": "Unit not processed yet"})

    try:
        payload = engine.generate_tutorial(
            request.unit_id, request.student_diagnosis, request.learning_mode, request.grade_level
        )
    except ValueError as failure:  # the model returned something that was not JSON
        raise HTTPException(
            status_code=500, detail=f"The model did not return valid JSON: {failure}"
        ) from failure
    except Exception as failure:
        raise HTTPException(status_code=500, detail=f"Generation failed: {failure}") from failure

    return TutorialResponse(**payload)

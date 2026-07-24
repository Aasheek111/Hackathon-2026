"""Celery tasks. Split from celery_app.py so `celery -A app.celery_app worker`
(which imports celery_app, which autodiscovers this module) and the FastAPI
process (which imports tasks directly to call `.delay()`) both see the same
task registry without a circular import.
"""

from __future__ import annotations

import os
import time

import requests

from . import rag_engine as engine
from . import youtube_quiz
from .celery_app import celery_app

# The Node backend is the sole writer to the SQLite DB (see TODO.md Phase 1) -
# this worker never touches the database directly, it only reports progress
# and hands off finished content through these HTTP callbacks.
BACKEND_INTERNAL_URL = os.getenv("BACKEND_INTERNAL_URL", "http://backend:5000")
INTERNAL_API_SECRET = os.getenv("INTERNAL_API_SECRET", "")

# Groq's free tier (now the primary text engine - see rag_engine.py's
# invoke_json) allows 30 requests/minute, verified live - 60/30 = 2s
# minimum between calls; this adds a small safety margin. Far better than
# the 6s this needed when Gemini (5-20 req/min observed, 20 req/DAY on top
# of that) was the only option - kept as a real mitigation either way, not
# a workaround for a bug, since Gemini remains the fallback if Groq isn't
# configured.
LLM_CALL_SPACING_SECONDS = 2.5


@celery_app.task(name="app.tasks.ping")
def ping() -> str:
    """Proof-of-life task: confirms the FastAPI process can enqueue work onto
    redis and a separate celery-worker container actually picks it up and
    executes it - the exact chain the real generation pipeline below depends
    on, verified here before any AI calls are involved.
    """
    return "pong"


def _callback_headers() -> dict:
    return {"X-Internal-Secret": INTERNAL_API_SECRET, "Content-Type": "application/json"}


def _update_job(job_id: str, **fields) -> None:
    """Best-effort progress report - a failed callback must never crash the
    generation task itself (the job would just show a stale stage, which is
    recoverable, versus losing already-computed lesson content).
    """
    try:
        requests.patch(
            f"{BACKEND_INTERNAL_URL}/internal/jobs/{job_id}",
            json=fields,
            headers=_callback_headers(),
            timeout=15,
        )
    except Exception:
        pass


@celery_app.task(name="app.tasks.generate_curriculum", bind=True)
def generate_curriculum(self, job_id: str, unit_id: int) -> None:
    """The real pipeline TODO.md Phases 2-4 describe: plan the WHOLE document
    into lessons (count derived from content, not hardcoded), generate each
    lesson's text grounded only in its own chunk range, generate a picture
    only for lessons that genuinely need one, then a final assessment.

    Never raises past this function - any failure is reported to the job row
    (stage=FAILED, errorMessage) so the teacher sees why, rather than the
    task dying silently in the worker's logs.
    """
    try:
        _update_job(job_id, stage="EXTRACTING", progressPercent=5)
        chunks = engine.all_chunks(unit_id)
        if not chunks:
            _update_job(job_id, stage="FAILED", errorMessage="No content found for this unit")
            return

        _update_job(job_id, stage="PLANNING", progressPercent=15)
        plan = engine.plan_curriculum(unit_id)
        lesson_plans = plan["lessons"]
        total = len(lesson_plans) or 1

        _update_job(job_id, stage="GENERATING_TEXT", progressPercent=30)
        lessons = []
        for i, lesson_plan in enumerate(lesson_plans):
            if i > 0:
                time.sleep(LLM_CALL_SPACING_SECONDS)
            content = engine.generate_lesson_content(
                unit_id, lesson_plan["title"], lesson_plan["chunk_start"], lesson_plan["chunk_end"]
            )
            lessons.append({**lesson_plan, **content, "order": i})
            _update_job(job_id, stage="GENERATING_TEXT", progressPercent=30 + int(30 * (i + 1) / total))

        _update_job(job_id, stage="GENERATING_VISUALS", progressPercent=65)
        for lesson in lessons:
            if lesson.get("needs_visual") and lesson.get("visual_suggestion"):
                time.sleep(LLM_CALL_SPACING_SECONDS)
                lesson["image_url"] = engine.generate_visual_image(lesson["visual_suggestion"], unit_id)
            else:
                lesson["image_url"] = None

        _update_job(job_id, stage="GENERATING_QUESTIONS", progressPercent=85)
        time.sleep(LLM_CALL_SPACING_SECONDS)
        final_questions = engine.generate_final_assessment([l["title"] for l in lessons])

        _update_job(job_id, stage="FINALIZING", progressPercent=95)
        payload = {
            "title": plan["title"],
            "sourceChunks": len(chunks),
            "lessons": [
                {
                    "order": lesson["order"],
                    "title": lesson["title"],
                    "explanation": lesson["explanation"],
                    "example": lesson.get("example") or None,
                    "imageUrl": lesson.get("image_url"),
                    "audioUrl": None,  # filled in later by the TTS pipeline
                    "sourceChunkStart": lesson["chunk_start"],
                    "sourceChunkEnd": lesson["chunk_end"],
                    "knowledgeCheck": lesson.get("knowledge_check"),
                }
                for lesson in lessons
            ],
            "finalAssessmentQuestions": [{"order": i, **q} for i, q in enumerate(final_questions)],
        }

        response = requests.post(
            f"{BACKEND_INTERNAL_URL}/internal/jobs/{job_id}/curriculum",
            json=payload,
            headers=_callback_headers(),
            timeout=30,
        )
        response.raise_for_status()
    except Exception as exc:
        _update_job(job_id, stage="FAILED", errorMessage=str(exc)[:500])


def _update_youtube_quiz(quiz_id: str, **fields) -> None:
    try:
        requests.patch(
            f"{BACKEND_INTERNAL_URL}/internal/youtube-quiz/{quiz_id}",
            json=fields,
            headers=_callback_headers(),
            timeout=15,
        )
    except Exception:
        pass


@celery_app.task(name="app.tasks.generate_youtube_quiz", bind=True)
def generate_youtube_quiz(self, quiz_id: str, video_id: str) -> None:
    """Fetch a transcript (SerpApi) and generate a quiz from it (Groq/Gemini) -
    slow enough (two sequential external API calls) to belong on this same
    queue rather than blocking the request that kicks it off.
    """
    try:
        _update_youtube_quiz(quiz_id, status="FETCHING_TRANSCRIPT")
        transcript = youtube_quiz.fetch_transcript(video_id)
        cleaned = youtube_quiz.clean_transcript(transcript)

        _update_youtube_quiz(quiz_id, status="GENERATING_QUESTIONS")
        result = youtube_quiz.generate_quiz_from_transcript(cleaned)

        if not result["questions"]:
            _update_youtube_quiz(quiz_id, status="FAILED", errorMessage="No questions could be generated from this video's transcript")
            return

        response = requests.post(
            f"{BACKEND_INTERNAL_URL}/internal/youtube-quiz/{quiz_id}/questions",
            json=result,
            headers=_callback_headers(),
            timeout=30,
        )
        response.raise_for_status()
    except Exception as exc:
        _update_youtube_quiz(quiz_id, status="FAILED", errorMessage=str(exc)[:500])

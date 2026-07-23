"""Celery tasks. Split from celery_app.py so `celery -A app.celery_app worker`
(which imports celery_app, which autodiscovers this module) and the FastAPI
process (which imports tasks directly to call `.delay()`) both see the same
task registry without a circular import.
"""

from __future__ import annotations

from .celery_app import celery_app


@celery_app.task(name="app.tasks.ping")
def ping() -> str:
    """Proof-of-life task: confirms the FastAPI process can enqueue work onto
    redis and a separate celery-worker container actually picks it up and
    executes it - the exact chain the real generation pipeline (Phase 3)
    depends on, verified here before any AI calls are involved.
    """
    return "pong"

"""Celery application instance shared by the FastAPI process (enqueues tasks)
and the dedicated celery-worker container (executes them).

Both containers run from the same Docker image (see rag-service/Dockerfile);
only the command differs (uvicorn vs. `celery worker`) - see docker-compose.yml.
"""

from __future__ import annotations

import os

from celery import Celery

# docker-compose gives both rag-service and celery-worker containers this URL
# pointing at the redis service; falls back to localhost for running the
# worker outside Docker during local development.
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery("neurolearn_rag", broker=REDIS_URL, backend=REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    # A task is only acknowledged (removed from the queue) after it finishes -
    # if the worker is killed mid-task, redis redelivers it instead of losing
    # it silently (TODO.md Phase 3 "worker restart" requirement).
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    result_expires=60 * 60 * 24,  # 24h - long enough to debug a stuck job
)

celery_app.autodiscover_tasks(["app"])

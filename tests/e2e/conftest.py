"""Pytest fixtures for the Selenium E2E suite (TODO.md Phase 14).

Run against the actual running Docker stack (`docker compose up`) - these
are not unit tests, they drive a real Chrome browser against
http://localhost:5173 talking to the real backend/rag-service/Celery
worker. Nothing here is mocked.

    tests/e2e/.venv/Scripts/python.exe -m pytest tests/e2e -v
"""

from __future__ import annotations

import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:5173")
HEADLESS = os.environ.get("E2E_HEADLESS", "true").lower() != "false"


@pytest.fixture
def driver():
    options = Options()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1400,1000")
    # Autoplay policies block programmatic <audio>.play() without a user
    # gesture in some Chrome configs - the TTS test clicks a real button, but
    # this avoids environment-specific flakiness on that front.
    options.add_argument("--autoplay-policy=no-user-gesture-required")

    drv = webdriver.Chrome(options=options)
    drv.implicitly_wait(2)
    yield drv
    drv.quit()


@pytest.fixture
def base_url() -> str:
    return BASE_URL

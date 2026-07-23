"""Teacher-facing flows: document upload (through the real file-upload UI),
the notification bell, and the YouTube quiz generation tab.

The upload test verifies the browser-visible parts of the pipeline (file
upload, status badges) against a pre-seeded bare unit - subject/unit
creation itself is generic pre-existing CRUD unrelated to this pipeline and
isn't re-tested here. It does NOT wait for full curriculum generation to
complete (see helpers.py's docstring: that depends on live Gemini calls and
would make this suite slow/flaky through no fault of the app) - it confirms
the upload succeeds and the unit's index status reaches READY.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import requests
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from helpers import (
    API_URL,
    SEEDED_TEACHER_EMAIL,
    SEEDED_TEACHER_PASSWORD,
    api_login,
    cleanup_subject,
    seed_bare_subject_and_unit,
)

TEST_PDF = Path(__file__).resolve().parent.parent.parent / "backend" / "uploads" / "syllabus"


def _find_a_test_pdf() -> Path:
    pdfs = list(TEST_PDF.glob("*.pdf"))
    if not pdfs:
        pytest.skip("No syllabus PDF fixture available under backend/uploads/syllabus")
    return pdfs[0]


@pytest.fixture
def teacher_token():
    return api_login(SEEDED_TEACHER_EMAIL, SEEDED_TEACHER_PASSWORD)["token"]


def _login_teacher_ui(driver, base_url):
    driver.get(f"{base_url}/login")
    driver.find_element(By.ID, "email-address").send_keys(SEEDED_TEACHER_EMAIL)
    driver.find_element(By.ID, "password").send_keys(SEEDED_TEACHER_PASSWORD)
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    WebDriverWait(driver, 15).until(EC.url_contains("/teacher"))


def test_document_upload_reaches_ready_status(driver, base_url):
    seeded = seed_bare_subject_and_unit()
    pdf_path = _find_a_test_pdf()
    try:
        _login_teacher_ui(driver, base_url)

        # "Subjects & Content" tab
        driver.find_element(By.XPATH, "//*[contains(text(), 'Subjects & Content')]").click()

        # The outer row div has both the title span and the upload
        # label/input as children - "justify-between" only appears on that
        # outer row, not the inner "flex items-center gap-3" title wrapper,
        # so it's specific enough to disambiguate the two.
        row_xpath = f"//span[text()='{seeded['unitTitle']}']/ancestor::div[contains(@class,'justify-between')][1]"
        unit_row = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, row_xpath)))
        file_input = unit_row.find_element(By.CSS_SELECTOR, "input[type='file']")
        file_input.send_keys(str(pdf_path))

        # Upload -> synchronous indexing -> READY badge (fast: this is text
        # extraction + embeddings, not an LLM generation call). Re-locate the
        # row each poll rather than reusing the stale reference, in case
        # React replaces rather than updates the node.
        WebDriverWait(driver, 60).until(
            lambda d: "READY" in d.find_element(By.XPATH, row_xpath).text
        )
    finally:
        cleanup_subject(seeded["subjectId"])


def test_notification_bell_renders(driver, base_url):
    _login_teacher_ui(driver, base_url)
    bell = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "button[aria-label='Notifications']")))
    bell.click()
    # Either "No notifications yet." or a real list renders - either way the
    # dropdown must open without erroring.
    WebDriverWait(driver, 10).until(
        EC.any_of(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'No notifications yet.')]")),
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Tutorial') or contains(text(), 'YouTube')]")),
        )
    )


def test_youtube_quiz_tab_reports_honest_failure_without_serpapi_key(driver, base_url):
    """No real SERPAPI_API_KEY is configured in this environment (see
    TODO.md Phase 11) - this test intentionally verifies the HONEST failure
    path end-to-end through the browser, not a fabricated success.
    """
    _login_teacher_ui(driver, base_url)
    driver.find_element(By.XPATH, "//*[contains(text(), 'YouTube Quiz')]").click()

    url_input = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "youtube-video-url")))
    url_input.send_keys("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    driver.find_element(By.XPATH, "//button[contains(., 'Generate quiz')]").click()

    WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Failed')]")))

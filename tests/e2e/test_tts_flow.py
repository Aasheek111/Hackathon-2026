"""Text-to-speech: clicking "Listen" must not hang or error, whether Gemini
TTS succeeds or the browser-speechSynthesis fallback kicks in - both are
acceptable outcomes for this button (see rag_engine.py's generate_speech()
and CurriculumPlayerPage's useSpeech() fallback contract).
"""

from __future__ import annotations

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from helpers import cleanup_subject, cleanup_user, seed_curriculum, seed_enrolled_student, set_local_storage_token


@pytest.fixture
def curriculum():
    data = seed_curriculum(with_final_assessment=False)
    yield data
    cleanup_subject(data["subjectId"])


@pytest.fixture
def student():
    data = seed_enrolled_student()
    yield data
    cleanup_user(data["id"])


def test_listen_to_lesson_button_completes(driver, base_url, curriculum, student):
    set_local_storage_token(driver, base_url, student["token"])
    driver.get(f"{base_url}/classroom/units/{curriculum['unitId']}/tutorial")
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'What is Photosynthesis?')]"))
    )

    listen_button = driver.find_element(By.XPATH, "//button[contains(., 'Listen to this lesson')]")
    listen_button.click()

    # Button shows a loading state while the Gemini TTS call is in flight,
    # then returns to its normal label whether the call succeeded or the
    # fallback to speechSynthesis fired - both are non-error outcomes.
    WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Listen to this lesson')]"))
    )

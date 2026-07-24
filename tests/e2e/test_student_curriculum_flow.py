"""The core deliverable: a student plays through a full curriculum in the
real browser - lessons, knowledge check, Next/Previous, final assessment,
completion. The curriculum itself is seeded directly (see helpers.py's
module docstring for why: waiting on real Gemini calls inside a browser
test would make this suite slow and flaky through no fault of the app) -
everything from here on is driven through the actual rendered UI.
"""

from __future__ import annotations

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from helpers import cleanup_subject, cleanup_user, seed_curriculum, seed_enrolled_student, set_local_storage_token


@pytest.fixture
def curriculum():
    data = seed_curriculum(with_final_assessment=True)
    yield data
    cleanup_subject(data["subjectId"])


@pytest.fixture
def student():
    data = seed_enrolled_student()
    yield data
    cleanup_user(data["id"])


def test_full_curriculum_playthrough(driver, base_url, curriculum, student):
    set_local_storage_token(driver, base_url, student["token"])
    driver.get(f"{base_url}/classroom/units/{curriculum['unitId']}/tutorial")

    # The seeded curriculum loads immediately - no waiting on AI generation.
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'What is Photosynthesis?')]"))
    )

    # Knowledge check: answer correctly, expect immediate feedback.
    driver.find_element(By.XPATH, "//button[contains(., 'Sunlight')]").click()
    driver.find_element(By.XPATH, "//button[contains(., 'Check answer')]").click()
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Correct!')]")))

    # Next lesson - image/progress swap client-side, no re-fetch.
    driver.find_element(By.XPATH, "//button[contains(., 'Next')]").click()
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Why Oxygen Matters')]"))
    )
    assert "Lesson 2 of 2" in driver.find_element(By.TAG_NAME, "body").text

    # Finish -> this curriculum has a final assessment, so it should NOT
    # jump straight to the completion screen.
    driver.find_element(By.XPATH, "//button[contains(., 'Finish curriculum')]").click()
    # h1, not h2: the final-assessment view is a full-page state whose only
    # heading is this one, so it was promoted during the accessibility pass
    # (an h2 with no preceding h1 breaks heading navigation for screen
    # readers). Matched on any heading level so the next such fix doesn't
    # break this test again.
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[self::h1 or self::h2][contains(text(), 'Final assessment')]"))
    )

    driver.find_element(By.XPATH, "//button[contains(., 'Oxygen')]").click()
    driver.find_element(By.XPATH, "//button[contains(., 'Submit assessment')]").click()

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//h1[contains(text(), 'Coursework complete')]"))
    )
    body_text = driver.find_element(By.TAG_NAME, "body").text
    assert "1 / 1" in body_text


def test_refresh_mid_tutorial_preserves_lesson_position(driver, base_url, curriculum, student):
    set_local_storage_token(driver, base_url, student["token"])
    driver.get(f"{base_url}/classroom/units/{curriculum['unitId']}/tutorial")
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'What is Photosynthesis?')]"))
    )

    driver.find_element(By.XPATH, "//button[contains(., 'Next')]").click()
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Why Oxygen Matters')]"))
    )

    # Refresh (simulates closing the tab and reopening the unit later) -
    # TutorialProgress.currentLessonOrder should resume at lesson 2, not
    # reset to lesson 1.
    driver.refresh()
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Why Oxygen Matters')]"))
    )


def test_curriculum_without_final_assessment_completes_directly(driver, base_url, student):
    data = seed_curriculum(with_final_assessment=False)
    try:
        set_local_storage_token(driver, base_url, student["token"])
        driver.get(f"{base_url}/classroom/units/{data['unitId']}/tutorial")
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'What is Photosynthesis?')]"))
        )
        driver.find_element(By.XPATH, "//button[contains(., 'Next')]").click()
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Why Oxygen Matters')]"))
        )
        driver.find_element(By.XPATH, "//button[contains(., 'Finish curriculum')]").click()
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//h1[contains(text(), 'Coursework complete')]"))
        )
    finally:
        cleanup_subject(data["subjectId"])

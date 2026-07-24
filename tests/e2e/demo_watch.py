"""A slow, narrated walkthrough for a human to watch - NOT part of the pytest
suite (that one stays fast/headless-by-default for real testing). This opens
one visible Chrome window, pauses between every step, and leaves the final
screen up for a while before closing.

Run directly (not via pytest):
    tests/e2e/.venv/Scripts/python.exe tests/e2e/demo_watch.py
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from helpers import (
    SEEDED_TEACHER_EMAIL,
    SEEDED_TEACHER_PASSWORD,
    cleanup_subject,
    cleanup_user,
    seed_curriculum,
    seed_enrolled_student,
    set_local_storage_token,
)

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:5173")
PAUSE = 2.5  # seconds between steps - slow enough to actually watch


def step(label: str, seconds: float = PAUSE) -> None:
    print(f">> {label}")
    time.sleep(seconds)


def main() -> None:
    options = Options()
    options.add_argument("--window-size=1400,1000")
    options.add_argument("--autoplay-policy=no-user-gesture-required")
    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 15)

    print("Seeding a demo curriculum and student account...")
    curriculum = seed_curriculum(with_final_assessment=True)
    student = seed_enrolled_student()

    try:
        step("Logging in as the seeded teacher (real login form)...")
        driver.get(f"{BASE_URL}/login")
        time.sleep(1)
        driver.find_element(By.ID, "email-address").send_keys(SEEDED_TEACHER_EMAIL)
        time.sleep(0.8)
        driver.find_element(By.ID, "password").send_keys(SEEDED_TEACHER_PASSWORD)
        time.sleep(0.8)
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        wait.until(EC.url_contains("/teacher"))
        step("Teacher dashboard loaded.", PAUSE * 1.5)

        step("Opening the notification bell...")
        driver.find_element(By.CSS_SELECTOR, "button[aria-label='Notifications']").click()
        time.sleep(PAUSE)
        driver.find_element(By.CSS_SELECTOR, "button[aria-label='Notifications']").click()  # close it

        step("Switching to the student view - logging in as an enrolled student...")
        driver.execute_script("window.localStorage.clear();")
        set_local_storage_token(driver, BASE_URL, student["token"])
        time.sleep(1)

        step(f"Opening the seeded curriculum: '{curriculum['curriculumId']}'...")
        driver.get(f"{BASE_URL}/classroom/units/{curriculum['unitId']}/tutorial")
        wait.until(EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'What is Photosynthesis?')]")))
        step("Lesson 1 loaded: 'What is Photosynthesis?'", PAUSE * 1.5)

        step("Clicking 'Listen to this lesson' (Gemini TTS)...")
        driver.find_element(By.XPATH, "//button[contains(., 'Listen to this lesson')]").click()
        time.sleep(PAUSE * 1.5)

        step("Answering the knowledge check with 'Sunlight'...")
        driver.find_element(By.XPATH, "//button[contains(., 'Sunlight')]").click()
        time.sleep(1)
        driver.find_element(By.XPATH, "//button[contains(., 'Check answer')]").click()
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Correct!')]")))
        step("Marked correct!", PAUSE * 1.5)

        step("Clicking Next -> lesson 2...")
        driver.find_element(By.XPATH, "//button[contains(., 'Next')]").click()
        wait.until(EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Why Oxygen Matters')]")))
        step("Lesson 2 loaded: 'Why Oxygen Matters'", PAUSE * 1.5)

        step("Finishing the curriculum -> final assessment...")
        driver.find_element(By.XPATH, "//button[contains(., 'Finish curriculum')]").click()
        wait.until(EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Final assessment')]")))
        step("Final assessment loaded.", PAUSE * 1.5)

        step("Answering 'Oxygen' and submitting...")
        driver.find_element(By.XPATH, "//button[contains(., 'Oxygen')]").click()
        time.sleep(1)
        driver.find_element(By.XPATH, "//button[contains(., 'Submit assessment')]").click()
        wait.until(EC.presence_of_element_located((By.XPATH, "//h1[contains(text(), 'Coursework complete')]")))
        step("Coursework complete screen reached - score should read 1 / 1.", 0)

        print("\nLeaving the final screen open for you to look at for 3 minutes...")
        time.sleep(180)
    finally:
        print("Cleaning up demo data and closing the browser...")
        driver.quit()
        cleanup_subject(curriculum["subjectId"])
        cleanup_user(student["id"])


if __name__ == "__main__":
    main()

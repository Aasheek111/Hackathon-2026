"""Registration and login, driven through the actual UI (not the API) -
these two flows are the front door to everything else in the suite.
"""

from __future__ import annotations

import requests
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from helpers import API_URL, cleanup_user, unique_email, SEEDED_TEACHER_EMAIL, SEEDED_TEACHER_PASSWORD


def test_student_registration_reaches_consent_page(driver, base_url):
    email = unique_email("e2e-register")
    driver.get(f"{base_url}/register")

    driver.find_element(By.ID, "full-name").send_keys("E2E New Student")
    driver.find_element(By.ID, "email-address").send_keys(email)
    driver.find_element(By.ID, "password").send_keys("TestPass123")
    driver.find_element(By.ID, "confirm-password").send_keys("TestPass123")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    # A new student registration navigates to /consent (camera permission
    # prompt) before the demo assessment - confirms registration succeeded
    # and the auth token was accepted, without needing to drive the
    # webcam-engagement quiz itself (unrelated to this pipeline).
    WebDriverWait(driver, 15).until(EC.url_contains("/consent"))
    assert "/consent" in driver.current_url

    # Only the JWT is persisted client-side (AuthContext fetches /auth/me on
    # load rather than caching the user object) - use it the same way to
    # find the id this test needs to clean up.
    token = driver.execute_script("return window.localStorage.getItem('token');")
    assert token, "expected a JWT in localStorage after registration"
    me = requests.get(f"{API_URL}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=10)
    me.raise_for_status()
    user_id = (me.json().get("user") or me.json()).get("id")
    cleanup_user(user_id)


def test_teacher_login_reaches_dashboard(driver, base_url):
    driver.get(f"{base_url}/login")

    driver.find_element(By.ID, "email-address").send_keys(SEEDED_TEACHER_EMAIL)
    driver.find_element(By.ID, "password").send_keys(SEEDED_TEACHER_PASSWORD)
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    WebDriverWait(driver, 15).until(EC.url_contains("/teacher"))
    assert "/teacher" in driver.current_url
    # The classroom name from prisma/seed.ts should render somewhere on the page.
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "h1")))


def test_login_with_wrong_password_shows_error(driver, base_url):
    driver.get(f"{base_url}/login")

    driver.find_element(By.ID, "email-address").send_keys(SEEDED_TEACHER_EMAIL)
    driver.find_element(By.ID, "password").send_keys("definitely-wrong-password")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    error = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Invalid credentials') or contains(text(), 'Failed to login')]"))
    )
    assert error.is_displayed()
    assert "/login" in driver.current_url

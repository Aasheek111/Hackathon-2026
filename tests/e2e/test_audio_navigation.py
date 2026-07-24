"""App-wide audio navigation and sign-symbol assets, driven through real Chrome.

METHOD, AND ITS ONE HONEST LIMIT
--------------------------------
Chrome's webkitSpeechRecognition streams microphone audio to Google's servers
for transcription, and that service is unavailable to an automated Chrome
build - feeding a WAV in via --use-file-for-fake-audio-capture returns a
`network` error rather than a transcript. Piping synthesised speech in would
therefore be testing Google's transcription service, not this application.

So the SpeechRecognition constructor is replaced at the window boundary before
the app's own script evaluates, and real transcript strings are pushed through
it. Everything downstream of "the browser produced these words" is the real,
shipped code path: phrase matching, longest-phrase-first ranking, navigation,
announcements, live regions and focus order.

NOT covered here: the browser's own audio-to-text step, and real screen-reader
behaviour. Those still need a human with a microphone and NVDA/JAWS/VoiceOver.
"""

from __future__ import annotations

import time

import pytest
import requests

from helpers import (
    API_URL,
    api_login,
    set_local_storage_token,
    unique_email,
    api_register_student,
    cleanup_user,
)

# Replaces the two speech APIs before any app code runs, and exposes
# window.__say() to push a transcript through the real command pipeline.
SPEECH_BOOTSTRAP = """
(() => {
  window.__spoken = [];
  const fakeSynth = {
    speak(u) {
      window.__spoken.push(String(u.text || ''));
      setTimeout(() => u.onstart && u.onstart(), 5);
      setTimeout(() => u.onend && u.onend(), 25);
    },
    cancel() {}, resume() {}, pause() {},
    getVoices() { return [{ name: 'Test Voice', lang: 'en-US', default: true }]; },
    addEventListener() {}, removeEventListener() {},
    speaking: false, pending: false, paused: false,
  };
  try {
    Object.defineProperty(window, 'speechSynthesis', { value: fakeSynth, configurable: true });
  } catch (e) { window.speechSynthesis = fakeSynth; }
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };

  window.__recognizers = [];
  window.__micStarts = 0;
  function MockRecognition() {
    this.lang = ''; this.continuous = false; this.interimResults = false;
    this.onresult = null; this.onend = null; this.onerror = null;
    this.__running = false;
    window.__recognizers.push(this);
  }
  MockRecognition.prototype.start = function () { this.__running = true; window.__micStarts++; };
  MockRecognition.prototype.stop = function () { this.__running = false; if (this.onend) this.onend(); };
  MockRecognition.prototype.abort = function () { this.__running = false; };
  window.SpeechRecognition = MockRecognition;
  window.webkitSpeechRecognition = MockRecognition;

  window.__say = function (text) {
    const live = window.__recognizers.filter(r => r.__running);
    const target = live.length ? live[live.length - 1]
                               : window.__recognizers[window.__recognizers.length - 1];
    if (!target || !target.onresult) return false;
    const res = [{ transcript: text, confidence: 0.95 }];
    res.isFinal = true;
    target.onresult({ results: [res], resultIndex: 0 });
    return true;
  };
})();
"""

# Is the floating bar, or its collapsed "turn on" prompt, anywhere on screen?
AUDIO_BAR_PROBE = (
    "const bar = !!document.querySelector(\"[aria-label='Audio navigation controls']\");"
    "const prompt = [...document.querySelectorAll('button')]"
    ".some(b => /turn on audio navigation/i.test(b.innerText || ''));"
    "return { bar, prompt };"
)


def _set_profile(token: str, value: str) -> None:
    requests.patch(
        f"{API_URL}/me/accessibility",
        headers={"Authorization": f"Bearer {token}"},
        json={"disabilityType": value},
        timeout=15,
    )


@pytest.fixture
def blind_student():
    """A student on the BLINDNESS profile who can actually reach a dashboard.

    Both steps matter, and skipping either makes this suite silently measure
    redirects instead of audio navigation:
      - the free trial must be USED, or ProtectedRoute sends a blind learner
        to /dashboard/audio/quiz (their trial path) instead of the dashboard;
      - the account must be PAID, or it then bounces to /subscription.
    """
    email = unique_email("audio-nav")
    registered = api_register_student(email)
    token = registered["token"]
    user_id = registered["user"]["id"]
    auth = {"Authorization": f"Bearer {token}"}

    _set_profile(token, "BLINDNESS")

    # Burn the free trial through the real endpoints, exactly as the voice
    # quiz does (zeroed engagement, mode stated outright - there is no webcam).
    attempt = requests.post(f"{API_URL}/assessments/start", headers=auth, timeout=15).json()
    requests.post(
        f"{API_URL}/assessments/{attempt['attemptId']}/complete",
        headers=auth,
        json={
            "modeEngagement": {
                "TEXT": {"totalScore": 0, "samples": 0, "focusedSamples": 0},
                "AUDIO": {"totalScore": 0, "samples": 0, "focusedSamples": 0},
                "VISUAL": {"totalScore": 0, "samples": 0, "focusedSamples": 0},
            },
            "preferredMode": "AUDIO",
            "adaptationCount": 0,
            "scoreCorrect": 6,
            "scoreTotal": 8,
            "durationSeconds": 90,
        },
        timeout=15,
    )
    requests.post(
        f"{API_URL}/subscription/test-activate",
        headers=auth,
        json={"plan": "MONTH_1"},
        timeout=15,
    )
    yield {"token": token, "id": user_id, "email": email}
    cleanup_user(user_id)


@pytest.fixture
def audio_driver(driver, base_url, blind_student):
    """Chrome with the speech APIs stubbed and audio navigation switched on."""
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {"source": SPEECH_BOOTSTRAP})
    set_local_storage_token(driver, base_url, blind_student["token"])
    driver.execute_script(
        "sessionStorage.setItem('pragya_audio_nav_enabled','true');"
        "sessionStorage.setItem('pragya_audio_unlocked','true');"
    )
    return driver


def _goto(driver, base_url, path, settle=3.2):
    driver.get(f"{base_url}{path}")
    time.sleep(settle)


def _say(driver, text, settle=1.2):
    driver.execute_script("return window.__say(arguments[0]);", text)
    time.sleep(settle)


def _spoken(driver):
    return driver.execute_script("return window.__spoken || [];")


def test_audio_bar_is_first_in_tab_order(audio_driver, base_url):
    """The load-bearing claim: one Tab reaches the audio controls.

    This is what makes the app operable with no sight at all - the original
    design failed precisely because it expected a blind learner to find and
    click a button they could not see.
    """
    _goto(audio_driver, base_url, "/dashboard/audio", 3.6)

    probe = audio_driver.execute_script(AUDIO_BAR_PROBE)
    assert probe["bar"], "audio control bar should be present for a blind profile"

    audio_driver.execute_script("document.body.focus();")
    from selenium.webdriver.common.action_chains import ActionChains
    from selenium.webdriver.common.keys import Keys

    ActionChains(audio_driver).send_keys(Keys.TAB).perform()
    time.sleep(0.4)

    focused = audio_driver.execute_script(
        "const a = document.activeElement;"
        "return { text: (a.innerText || '').trim().slice(0, 40),"
        " inBar: !!a.closest(\"[aria-label='Audio navigation controls']\") };"
    )
    assert focused["inBar"], f"first Tab should land in the audio bar, got {focused['text']!r}"


def test_alt_r_reads_the_real_page_description(audio_driver, base_url):
    from selenium.webdriver.common.action_chains import ActionChains
    from selenium.webdriver.common.keys import Keys

    _goto(audio_driver, base_url, "/dashboard/audio", 3.6)
    audio_driver.execute_script("window.__spoken = [];")

    ActionChains(audio_driver).key_down(Keys.ALT).send_keys("r").key_up(Keys.ALT).perform()
    time.sleep(2.5)

    said = " ".join(_spoken(audio_driver)).lower()
    assert said, "Alt+R should speak something"
    # Real registered content, not a placeholder.
    assert "audio dashboard" in said
    assert "choices" in said, f"expected the numbered menu to be read, got: {said[:120]!r}"


def test_microphone_auto_starts_for_blind_profile(audio_driver, base_url):
    _goto(audio_driver, base_url, "/dashboard/audio", 3.6)
    starts = audio_driver.execute_script("return window.__micStarts || 0;")
    assert starts > 0, "recognition.start() should be called without the learner finding a button"


@pytest.mark.parametrize(
    "phrase,expected_path",
    [
        ("open lessons", "/classroom"),
        ("my progress", "/progress"),
        ("sign practice", "/practice/signs"),
        ("open settings", "/settings"),
    ],
)
def test_global_voice_commands_navigate(audio_driver, base_url, phrase, expected_path):
    _goto(audio_driver, base_url, "/dashboard/audio", 3.6)
    _say(audio_driver, phrase)
    assert expected_path in audio_driver.current_url, (
        f"saying {phrase!r} should reach {expected_path}, got {audio_driver.current_url}"
    )


def test_voice_commands_work_away_from_the_audio_dashboard(audio_driver, base_url):
    """The app-wide claim: commands must work on pages with no audio code.

    Audio support that only exists on one route is not audio support - the
    learner leaves it the moment they open a lesson.
    """
    _goto(audio_driver, base_url, "/classroom", 3.6)
    _say(audio_driver, "sign practice")
    assert "/practice/signs" in audio_driver.current_url

    _say(audio_driver, "my progress")
    assert "/progress" in audio_driver.current_url


def test_route_change_announces_itself(audio_driver, base_url):
    _goto(audio_driver, base_url, "/dashboard/audio", 3.6)
    audio_driver.execute_script("window.__spoken = [];")

    _say(audio_driver, "open settings", settle=2.6)

    said = " ".join(_spoken(audio_driver)).lower()
    assert "accessibility settings" in said, f"arriving should be announced, got {said[:120]!r}"

    live = audio_driver.execute_script(
        "const n = document.querySelector('[aria-live=\"polite\"]');"
        "return n ? n.textContent.trim() : '';"
    )
    assert live, "the announcement must also reach an aria-live region for screen readers"


def test_longest_phrase_wins_over_shorter_one(audio_driver, base_url):
    """"stop reading" contains "stop"; the specific phrase must not be
    shadowed by the generic one, and must not navigate anywhere."""
    _goto(audio_driver, base_url, "/dashboard/audio", 3.6)
    _say(audio_driver, "stop reading")
    assert "/dashboard/audio" in audio_driver.current_url


def test_number_keys_work_without_a_microphone(audio_driver, base_url):
    """The numbered menu is the path that survives no-mic browsers entirely."""
    from selenium.webdriver.common.action_chains import ActionChains

    _goto(audio_driver, base_url, "/dashboard/audio", 3.6)
    ActionChains(audio_driver).send_keys("1").perform()
    time.sleep(1.8)
    assert "/classroom" in audio_driver.current_url

    _goto(audio_driver, base_url, "/dashboard/audio", 3.2)
    _say(audio_driver, "four")
    assert "/practice/signs" in audio_driver.current_url


def test_sign_symbol_assets_render_and_load(audio_driver, base_url):
    _goto(audio_driver, base_url, "/practice/signs", 3.4)

    images = audio_driver.execute_script(
        "return Array.from(document.querySelectorAll('img[src*=\"/signs/asl/\"]'))"
        ".map(i => ({ src: i.getAttribute('src'), w: i.naturalWidth, alt: i.alt }));"
    )
    assert len(images) >= 20, f"expected the alphabet grid, found {len(images)} images"
    broken = [i for i in images if i["w"] == 0]
    assert not broken, f"these sign assets failed to load: {[i['src'] for i in broken][:5]}"
    assert all("handshape for" in (i["alt"] or "") for i in images), "each sign needs real alt text"


# --- regression: reported bug -------------------------------------------
# "after I click turn off, even after I switch my condition to deafness, the
#  turn-on-navigation side button doesn't go away"


def test_turn_off_removes_every_prompt(audio_driver, base_url):
    _goto(audio_driver, base_url, "/dashboard/audio", 3.6)
    assert audio_driver.execute_script(AUDIO_BAR_PROBE)["bar"]

    audio_driver.execute_script(
        "const b = [...document.querySelectorAll('button')]"
        ".find(x => (x.getAttribute('aria-label') || '') === 'Turn off audio navigation');"
        "if (b) b.click();"
    )
    time.sleep(1.5)

    after = audio_driver.execute_script(AUDIO_BAR_PROBE)
    # Both the floating bar AND the audio dashboard's own in-page banner must
    # go: one dismissal should silence every prompt, not just the nearest one.
    assert not after["bar"], "the bar should disappear"
    assert not after["prompt"], "no 'turn on audio navigation' prompt should remain anywhere"


def test_deaf_profile_never_sees_audio_navigation(audio_driver, base_url, blind_student):
    """Audio navigation is useless to a deaf learner - offering it is noise."""
    _set_profile(blind_student["token"], "DEAFNESS")
    audio_driver.execute_script("sessionStorage.clear();")

    for path in ("/dashboard/visual", "/progress"):
        _goto(audio_driver, base_url, path, 3.4)
        probe = audio_driver.execute_script(AUDIO_BAR_PROBE)
        assert not probe["bar"], f"audio bar should not appear on {path} for a deaf profile"
        assert not probe["prompt"], f"audio prompt should not appear on {path} for a deaf profile"


def test_switching_back_to_blind_re_enables_it(audio_driver, base_url, blind_student):
    _set_profile(blind_student["token"], "DEAFNESS")
    audio_driver.execute_script("sessionStorage.clear();")
    _goto(audio_driver, base_url, "/dashboard/visual", 3.4)
    assert not audio_driver.execute_script(AUDIO_BAR_PROBE)["bar"]

    _set_profile(blind_student["token"], "BLINDNESS")
    audio_driver.execute_script("sessionStorage.clear();")
    _goto(audio_driver, base_url, "/dashboard/audio", 3.6)

    assert audio_driver.execute_script(AUDIO_BAR_PROBE)["bar"], (
        "changing the profile back to BLINDNESS must re-enable audio navigation, "
        "not leave the previous profile's choice stuck in sessionStorage"
    )

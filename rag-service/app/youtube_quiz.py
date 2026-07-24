"""YouTube transcript retrieval and quiz generation from it.

Transcript fetching goes through `youtube-transcript-api` (PyPI), NOT a paid
API - no key, no signup, no per-month credit cap. It talks directly to
YouTube's own public caption endpoint (the same one youtube.com's own player
uses), which is why it has no rate limit worth planning around for a
hackathon's traffic. Confirmed live (docker exec against the running
rag-service, version 1.2.4): `YouTubeTranscriptApi().fetch(video_id,
languages=[...])` returns a `FetchedTranscript` - an iterable of
`FetchedTranscriptSnippet(text, start, duration)`.

This replaced an earlier SerpApi-based implementation: SerpApi's free tier is
a small monthly credit cap (not truly free at any real usage volume) and, on
top of that, hit a live transient DNS failure reaching serpapi.com during
testing - two independent reasons the paid, third-party dependency didn't
belong here for something as simple as "get a video's captions".
"""

from __future__ import annotations

import re
import time

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    CouldNotRetrieveTranscript,
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)

from . import rag_engine as engine

# Tried in order - falls through to auto-generated/any available language
# rather than failing a video just because it has no manual English captions.
TRANSCRIPT_LANGUAGE_PREFERENCE = ["en", "en-US", "en-GB"]

# youtube.com/watch?v=ID, youtube.com/shorts/ID, or youtu.be/ID - a YouTube
# video id is always exactly 11 characters of [A-Za-z0-9_-].
YOUTUBE_URL_PATTERNS = [
    re.compile(r"(?:youtube\.com/watch\?v=|youtube\.com/shorts/)([\w-]{11})"),
    re.compile(r"youtu\.be/([\w-]{11})"),
]

YOUTUBE_QUIZ_SYSTEM_PROMPT = (
    "You write a multiple-choice quiz from a YouTube video transcript. Write up to 10 "
    "questions - fewer if the transcript is short, never pad with repetitive questions "
    "testing the same fact. Each question needs exactly 4 options and a 'correct' value "
    "that is exactly one of them, grounded only in what the transcript actually says - do "
    "not invent facts not present in the transcript.\n"
    "Return JSON: {\"title\": <a short topic title for this video>, "
    "\"questions\": [{\"question\", \"options\", \"correct\"}]}. Return only the JSON object."
)

# A generous cap, not a precise token budget - keeps a very long video's
# transcript from producing an unbounded prompt.
MAX_TRANSCRIPT_CHARS = 20000

# A couple of retries for transient network blips (the same kind of
# Docker-network hiccup observed elsewhere in this pipeline) - this now hits
# YouTube directly rather than a third party, but a blip is still a blip.
TRANSCRIPT_FETCH_ATTEMPTS = 3
TRANSCRIPT_FETCH_RETRY_DELAY_SECONDS = 3


def extract_video_id(url: str) -> str | None:
    """Supports youtube.com/watch?v=..., youtube.com/shorts/..., and
    youtu.be/... - returns None for anything else so the caller can respond
    with a clear "not a valid YouTube URL" instead of guessing.
    """
    for pattern in YOUTUBE_URL_PATTERNS:
        match = pattern.search(url or "")
        if match:
            return match.group(1)
    return None


def fetch_transcript(video_id: str) -> str:
    """Fetches the video's captions (manual or auto-generated) as plain text
    via youtube-transcript-api - free, no key required. Tries the preferred
    language list first; TranscriptsDisabled/NoTranscriptFound/VideoUnavailable
    are real, permanent conditions (this video genuinely has no usable
    captions) and are raised immediately without retrying. A network-level
    failure gets a couple of retries, matching this pipeline's established
    "a blip shouldn't fail a job outright" pattern.
    """
    api = YouTubeTranscriptApi()
    last_error: Exception | None = None
    for attempt in range(TRANSCRIPT_FETCH_ATTEMPTS):
        try:
            transcript = api.fetch(video_id, languages=TRANSCRIPT_LANGUAGE_PREFERENCE)
            lines = [snippet.text for snippet in transcript if snippet.text.strip()]
            if not lines:
                raise RuntimeError("This video's captions came back empty.")
            return " ".join(lines)
        except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable) as exc:
            raise RuntimeError(f"This video has no usable captions: {exc}") from exc
        except CouldNotRetrieveTranscript as exc:
            # covers IP/request-blocked and similar - not worth retrying
            raise RuntimeError(f"Could not retrieve this video's transcript: {exc}") from exc
        except Exception as exc:  # genuine network blip - retry
            last_error = exc
            if attempt < TRANSCRIPT_FETCH_ATTEMPTS - 1:
                time.sleep(TRANSCRIPT_FETCH_RETRY_DELAY_SECONDS)

    raise RuntimeError(
        f"Could not reach YouTube after {TRANSCRIPT_FETCH_ATTEMPTS} attempts "
        f"(likely a transient network/DNS issue): {last_error}"
    )


def clean_transcript(text: str) -> str:
    """Collapses whitespace and de-duplicates immediate word-level repeats -
    a common artifact of auto-generated captions (e.g. "the the cat sat sat").
    Preserves sentence content, doesn't rewrite or summarise.
    """
    text = re.sub(r"\s+", " ", text).strip()
    words = text.split(" ")
    deduped: list[str] = []
    for word in words:
        if not deduped or deduped[-1].lower() != word.lower():
            deduped.append(word)
    return " ".join(deduped)


def generate_quiz_from_transcript(transcript: str) -> dict:
    """Up to 10 MCQs grounded in the transcript.

    Unlike the tutorial pipeline's offline_tutorial() fallback, there is no
    sentence-extraction fallback here without an API key - a YouTube quiz
    has no reason to exist without the model, so this raises plainly instead
    of fabricating a degraded version. Goes through Groq first, Gemini
    second (engine.invoke_json) - same as every other generation call in
    this pipeline.
    """
    if not engine.any_llm_configured():
        raise RuntimeError("GROQ_API_KEY is not set - cannot generate a quiz without it.")

    data = engine._coerce_json(
        engine.invoke_json(
            YOUTUBE_QUIZ_SYSTEM_PROMPT,
            f"Transcript:\n{transcript[:MAX_TRANSCRIPT_CHARS]}\n\nReturn only the JSON object.",
        )
    )

    questions = []
    for item in (data.get("questions") or [])[:10]:
        options = [str(o) for o in (item.get("options") or [])]
        correct = str(item.get("correct", options[0] if options else ""))
        if options and correct in options:
            questions.append({"question": str(item.get("question", "")), "options": options, "correct": correct})

    return {"title": str(data.get("title") or "YouTube Quiz"), "questions": questions}

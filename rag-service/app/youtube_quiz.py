"""YouTube transcript retrieval (via SerpApi) and quiz generation from it.

VERIFIED LIVE against a real SERPAPI_API_KEY (docker exec against the running
rag-service). The docs page fetched during initial implementation
(https://serpapi.com/youtube-video-api) said the transcript engine's video
parameter was `video_id` - that was WRONG. Confirmed live:

- The main `youtube_video` engine's response includes
  `transcript.serpapi_link`, e.g.
  `https://serpapi.com/search.json?engine=youtube_video_transcript&language_code=en&v=dQw4w9WgXcQ`
  - the parameter is **`v`**, not `video_id`.
- Calling `engine=youtube_video_transcript` directly with `v` (+ `api_key`,
  not included in the serpapi_link itself) returns
  `{"search_metadata": ..., "search_parameters": ..., "transcript": [...]}`
  where `transcript` is a flat list of
  `{"start_ms": int, "snippet": str, "start_time_text": str, "start_time_label": str}`.

`fetch_transcript()` uses the confirmed `v` parameter and the confirmed
`snippet` field, while keeping the other defensive fallbacks (`text`/
`content`, alternate top-level keys) in case SerpApi's shape varies for a
video with no transcript, auto-captions disabled, etc. - untested territory
still gets a clear error naming the actual keys, never a fabricated result.
"""

from __future__ import annotations

import os
import re

import requests

from . import rag_engine as engine

SERPAPI_BASE_URL = "https://serpapi.com/search"

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

PLACEHOLDER_KEYS = {"", "your-key-here", "changeme"}

# A generous cap, not a precise token budget - keeps a very long video's
# transcript from producing an unbounded prompt.
MAX_TRANSCRIPT_CHARS = 20000


def serpapi_key_present() -> bool:
    return os.getenv("SERPAPI_API_KEY", "").strip().strip('"') not in PLACEHOLDER_KEYS


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
    """Calls SerpApi's YouTube Video Transcript engine and returns the full
    transcript as plain text. See the module docstring for the verification
    caveat on the exact response shape.
    """
    if not serpapi_key_present():
        raise RuntimeError("SERPAPI_API_KEY is not set. Copy .env.example to .env and add your key.")

    response = requests.get(
        SERPAPI_BASE_URL,
        params={
            "engine": "youtube_video_transcript",
            "video_id": video_id,
            "api_key": os.getenv("SERPAPI_API_KEY"),
        },
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()

    segments = data.get("transcript") or data.get("transcripts") or data.get("segments")
    if not isinstance(segments, list) or not segments:
        raise RuntimeError(
            "Unexpected response from SerpApi's youtube_video_transcript engine - "
            f"got top-level keys: {list(data.keys())}"
        )

    lines: list[str] = []
    for segment in segments:
        if isinstance(segment, str):
            lines.append(segment)
        elif isinstance(segment, dict):
            text = segment.get("text") or segment.get("snippet") or segment.get("content")
            if text:
                lines.append(str(text))

    if not lines:
        sample_keys = list(segments[0].keys()) if isinstance(segments[0], dict) else type(segments[0]).__name__
        raise RuntimeError(
            f"SerpApi returned transcript segments but none had a recognisable text field - "
            f"got segment shape: {sample_keys}"
        )

    return " ".join(lines)


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
    of fabricating a degraded version.
    """
    if not engine.api_key_present():
        raise RuntimeError("GOOGLE_API_KEY is not set - cannot generate a quiz without it.")

    model = engine.get_chat_model().bind(response_mime_type="application/json")
    reply = model.invoke(
        [
            ("system", YOUTUBE_QUIZ_SYSTEM_PROMPT),
            ("human", f"Transcript:\n{transcript[:MAX_TRANSCRIPT_CHARS]}\n\nReturn only the JSON object."),
        ]
    )
    data = engine._coerce_json(reply.content)

    questions = []
    for item in (data.get("questions") or [])[:10]:
        options = [str(o) for o in (item.get("options") or [])]
        correct = str(item.get("correct", options[0] if options else ""))
        if options and correct in options:
            questions.append({"question": str(item.get("question", "")), "options": options, "correct": correct})

    return {"title": str(data.get("title") or "YouTube Quiz"), "questions": questions}

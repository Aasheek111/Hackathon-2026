"""Smoke test - runs without an OpenAI key.

Covers everything that does not need the API: the app boots, static files are
mounted, uploads land in the right place, the documented error shapes come back,
and the offline fallback produces a usable tutorial. The real LLM path needs a
key and is exercised by hand.
"""

import io
from fastapi.testclient import TestClient
from pypdf import PdfWriter

from app.main import app
from app import rag_engine as engine

client = TestClient(app)
passed = failed = 0


def check(name, condition, detail=""):
    global passed, failed
    ok = bool(condition)
    passed, failed = passed + ok, failed + (not ok)
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" - {detail}" if detail else ""))


def blank_pdf() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


# --- the app itself ---------------------------------------------------------
response = client.get("/health")
check("GET /health responds", response.status_code == 200, str(response.status_code))
check("health reports whether the key is configured", "openai_key_configured" in response.json())

response = client.get("/")
check("the demo page is served at /", response.status_code == 200 and "NeuroLearn" in response.text)

response = client.get("/docs")
check("OpenAPI docs are available", response.status_code == 200)

# --- documented error shapes ------------------------------------------------
response = client.post("/generate-tutorial", json={"unit_id": 9999})
check(
    "an unindexed unit returns the documented 404 body",
    response.status_code == 404 and response.json() == {"error": "Unit not processed yet"},
    str(response.json()),
)

response = client.post(
    "/upload-pdf",
    data={"unit_id": "1"},
    files={"file": ("notes.txt", b"not a pdf", "text/plain")},
)
check("a non-PDF upload is rejected with 400", response.status_code == 400, str(response.status_code))

# a valid but text-free PDF is the scanned-document case
response = client.post(
    "/upload-pdf",
    data={"unit_id": "1"},
    files={"file": ("scan.pdf", blank_pdf(), "application/pdf")},
)
check(
    "a PDF with no text layer is explained, not silently indexed",
    response.status_code == 400 and "OCR" in response.json()["detail"],
    str(response.json()),
)
check("the PDF was still saved to disk", engine.pdf_path(1).exists())

# --- image upload works with no API key at all ------------------------------
from PIL import Image  # noqa: E402

buffer = io.BytesIO()
Image.new("RGB", (24, 24), (30, 90, 120)).save(buffer, "PNG")
response = client.post(
    "/upload-image",
    data={"unit_id": "1"},
    files={"file": ("diagram.png", buffer.getvalue(), "image/png")},
)
check("an image uploads and returns its URL", response.status_code == 200, str(response.json()))
url = response.json().get("image_url", "")
check("the image URL is under /static/images/", url.startswith("/static/images/"), url)
check("and that URL actually serves the file", client.get(url).status_code == 200)

response = client.post(
    "/upload-image", data={"unit_id": "1"}, files={"file": ("x.png", b"nope", "image/png")}
)
check("a file that is not an image is rejected", response.status_code == 400)

# --- learning modes and the offline fallback --------------------------------
# Build a small index by hand so generation can be tested with no API key.
import json, pickle  # noqa: E402
from pathlib import Path  # noqa: E402


class _Doc:
    def __init__(self, text):
        self.page_content = text
        self.metadata = {}


class _Store:
    def __init__(self, docs):
        self._dict = {str(i): d for i, d in enumerate(docs)}


unit = 42
target = engine.index_path(unit)
target.mkdir(parents=True, exist_ok=True)
(target / "index.faiss").write_bytes(b"stub")  # marks the unit as processed
(target / "index.pkl").write_bytes(
    pickle.dumps((_Store([_Doc("Photosynthesis turns light into food. Leaves catch the light.")]), {}))
)

response = client.post("/generate-tutorial", json={"unit_id": unit, "learning_mode": "AUDIO"})
check("generation works with no API key", response.status_code == 200, str(response.status_code))
payload = response.json() if response.status_code == 200 else {}
check("the offline tutorial is flagged as offline", payload.get("offline") is True)
check("it echoes back the learning mode", payload.get("learning_mode") == "AUDIO", str(payload.get("learning_mode")))
check("it uses the real text from the PDF", "Photosynthesis" in json.dumps(payload))
check("every documented key is present",
      all(k in payload for k in ("tutorial_text", "audio_script", "visual_suggestion", "quiz", "teacher_note")))
check("the quiz still has options", bool(payload.get("quiz") and payload["quiz"][0]["options"]))

response = client.post("/generate-tutorial", json={"unit_id": unit, "learning_mode": "NONSENSE"})
check("an unknown learning mode is rejected", response.status_code == 422, str(response.status_code))

for mode in ("TEXT", "VISUAL", "AR"):
    response = client.post("/generate-tutorial", json={"unit_id": unit, "learning_mode": mode})
    check(f"{mode} mode generates", response.status_code == 200 and response.json()["learning_mode"] == mode)

# --- splitting logic --------------------------------------------------------
chunks = engine.split_text("Sentence one. " * 400)
check("text splits into overlapping chunks", len(chunks) > 1, f"{len(chunks)} chunks")
check("chunks respect the configured size", max(len(c) for c in chunks) <= engine.CHUNK_SIZE + 50)

print(f"\n{passed} passed, {failed} failed")
raise SystemExit(1 if failed else 0)

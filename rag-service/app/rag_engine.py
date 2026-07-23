"""PDF ingestion, vector storage and tutorial generation.

The NeuroLearn RAG service. Everything that touches the LLM or the vector store
lives here, so the route layer stays thin and testable.

The piece that matters for this platform: generation takes a **learning mode**
(TEXT / AUDIO / VISUAL / AR - the same enum the Prisma schema uses). When the CV
service detects disengagement and the platform switches mode, the same unit can
be regenerated in the new mode from the same source PDF.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
from pathlib import Path
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from google import genai
from langchain_community.embeddings import FakeEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

# override=True: docker-compose sets GOOGLE_API_KEY="" in the container when
# it isn't exported in the host shell (the ${GOOGLE_API_KEY:-} fallback), and
# python-dotenv otherwise leaves an already-set env var alone - which would
# silently shadow a real key placed in this file, the documented way to
# configure it.
load_dotenv(override=True)

# --- paths ------------------------------------------------------------------
# Resolved from this file rather than the working directory, so the server
# behaves the same whether it is started from the project root or elsewhere.
BASE_DIR = Path(__file__).resolve().parent.parent
PDF_DIR = BASE_DIR / "uploads" / "pdfs"
IMAGE_DIR = BASE_DIR / "uploads" / "images"
VECTOR_DIR = BASE_DIR / "vector_store"
STATIC_DIR = BASE_DIR / "static"

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
TOP_K = 4

# "-latest" alias doesn't exist for image models yet, so this is pinned. A
# one-line swap to a paid Imagen model if that becomes available later.
GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image"

DEFAULT_QUERY = "Explain the key concepts of this unit simply"

SYSTEM_PROMPT = (
    "You are a special education tutor. You receive textbook chunks and a student diagnosis.\n"
    "Generate a response in JSON format with keys: tutorial_text, audio_script, "
    "visual_suggestion, steps, quiz, teacher_note.\n"
    "'steps' is a list of 2-4 objects, each with 'concept' (a short heading), 'explanation' "
    "(1-2 plain-language sentences), and 'example' (one concrete example) - break the unit's "
    "content into that many bite-sized lessons, each grounded in the textbook chunks provided.\n"
    "'quiz' should have 2-3 questions, each with 4 options, grounded in different parts of the "
    "textbook chunks - not all testing the same fact.\n"
    "Before finalizing, re-read every quiz question against its own options and the textbook "
    "chunks: the 'correct' value must be the option that actually and specifically answers that "
    "exact question - not a fact from a different question, and not merely a true statement "
    "from the text. Double-check each one before including it.\n"
    "If the diagnosis says 'Struggling', use grade-1 vocabulary and only 2 MCQ options per question. "
    "Keep tutorial_text under 100 words."
)

# Matches the LearningMode enum in backend/prisma/schema.prisma. The platform
# already decides the mode from engagement; this is how that decision reaches the
# content.
MODE_GUIDANCE = {
    "TEXT": (
        "The learner is in TEXT mode. Write tutorial_text as short bullet points in plain "
        "language. Keep audio_script brief."
    ),
    "AUDIO": (
        "The learner is in AUDIO mode and may not be looking at the screen. Put the real "
        "teaching in audio_script: full narration, describing anything visual out loud, in "
        "short spoken sentences. Keep tutorial_text to a summary."
    ),
    "VISUAL": (
        "The learner is in VISUAL mode. Lead with what to draw: visual_suggestion must "
        "describe one concrete, simple diagram or chart a teacher could sketch in 30 seconds. "
        "Keep the wording minimal and concrete."
    ),
    "AR": (
        "The learner is in AR mode and has disengaged from reading. Reduce to the single most "
        "important idea, make the quiz playful and physical, and describe a visual that could "
        "become a 3D object."
    ),
}
VALID_MODES = tuple(MODE_GUIDANCE)


def ensure_directories() -> None:
    """Called on startup so a fresh clone works without any manual mkdir."""
    for directory in (PDF_DIR, IMAGE_DIR, VECTOR_DIR, STATIC_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def index_path(unit_id: int) -> Path:
    return VECTOR_DIR / f"index_unit_{unit_id}"


def pdf_path(unit_id: int) -> Path:
    return PDF_DIR / f"unit_{unit_id}.pdf"


def unit_is_processed(unit_id: int) -> bool:
    """A FAISS index is a directory holding index.faiss and index.pkl."""
    return (index_path(unit_id) / "index.faiss").exists()


def processed_units() -> list[int]:
    units = []
    for entry in VECTOR_DIR.glob("index_unit_*"):
        match = re.fullmatch(r"index_unit_(\d+)", entry.name)
        if match and (entry / "index.faiss").exists():
            units.append(int(match.group(1)))
    return sorted(units)


# the value shipped in .env.example - treating it as "configured" would mean the
# app looks healthy right up until the first request fails
PLACEHOLDER_KEYS = {"", "your-key-here", "changeme"}


def api_key_present() -> bool:
    return os.getenv("GOOGLE_API_KEY", "").strip().strip('"') not in PLACEHOLDER_KEYS


# --- embeddings and chat models ---------------------------------------------
# Built lazily rather than at import time: the app should still start and serve
# the upload page when no API key is configured yet, and fail with a clear
# message only when a key is actually needed. Uses Gemini (langchain-google-genai)
# rather than OpenAI - same offline-fallback contract either way.


def get_embeddings() -> GoogleGenerativeAIEmbeddings:
    if not api_key_present():
        raise RuntimeError("GOOGLE_API_KEY is not set. Copy .env.example to .env and add your key.")
    return GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")


def get_chat_model() -> ChatGoogleGenerativeAI:
    if not api_key_present():
        raise RuntimeError("GOOGLE_API_KEY is not set. Copy .env.example to .env and add your key.")
    # "-latest" alias rather than a pinned version - Google periodically
    # retires specific model snapshots for new API keys (as gemini-2.5-flash
    # already has), and the alias stays pointed at whatever is current.
    return ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.3)


# --- ingestion ---------------------------------------------------------------


def extract_text(path: Path) -> str:
    """Pull the text layer out of a PDF.

    A scanned PDF has no text layer, so this legitimately returns almost
    nothing - the caller checks and says so rather than silently indexing an
    empty document.
    """
    reader = PdfReader(str(path))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages).strip()


def split_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        # try to break on paragraphs first, then sentences, then words, so a
        # chunk is usually a whole idea rather than half a sentence
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_text(text)


def build_index(unit_id: int, chunks: list[str]) -> int:
    """Embed the chunks and persist a FAISS index for this unit.

    Without an API key there is nothing to call OpenAI's embeddings endpoint
    with, so a placeholder local embedding is used instead. Those vectors are
    never used for offline retrieval (`retrieve` reads the docstore directly
    in that case) - they only exist so FAISS has something to store the real
    chunk text against. This keeps ingestion working offline, symmetric with
    `generate_tutorial`'s existing offline fallback.
    """
    metadatas = [{"unit_id": unit_id, "chunk": position} for position in range(len(chunks))]
    embeddings = get_embeddings() if api_key_present() else FakeEmbeddings(size=64)
    store = FAISS.from_texts(chunks, embeddings, metadatas=metadatas)
    target = index_path(unit_id)
    target.mkdir(parents=True, exist_ok=True)
    store.save_local(str(target))
    return len(chunks)


def load_index(unit_id: int) -> FAISS:
    # allow_dangerous_deserialization is required because FAISS stores its
    # docstore as a pickle. Safe here: we only ever load indexes this app wrote.
    return FAISS.load_local(
        str(index_path(unit_id)),
        get_embeddings(),
        allow_dangerous_deserialization=True,
    )


def retrieve(unit_id: int, query: str, k: int = TOP_K) -> list[str]:
    """Top-k chunks for this query.

    Without an API key we cannot embed the query, so fall back to reading the
    stored chunks straight out of the index's docstore - unordered, but real
    text from the right unit, which is what the offline tutorial needs.
    """
    if not api_key_present():
        return raw_chunks(unit_id, k)
    store = load_index(unit_id)
    return [document.page_content for document in store.similarity_search(query, k=k)]


def raw_chunks(unit_id: int, limit: int = TOP_K) -> list[str]:
    """Read chunks back without embedding anything (offline path)."""
    import pickle

    store_file = index_path(unit_id) / "index.pkl"
    if not store_file.exists():
        return []
    try:
        docstore, _ = pickle.loads(store_file.read_bytes())
        documents = list(getattr(docstore, "_dict", {}).values())
        return [document.page_content for document in documents[:limit]]
    except Exception:
        return []


# --- generation ---------------------------------------------------------------


def _coerce_json(raw: str) -> dict:
    """Parse the model's reply, tolerating a fenced code block."""
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def _normalise(payload: dict) -> dict:
    """Guarantee the exact response shape, whatever the model returned.

    The frontend and any marking script depend on these keys existing, so a
    missing one becomes an empty value rather than a KeyError downstream.
    """
    quiz = []
    for item in payload.get("quiz") or []:
        if not isinstance(item, dict):
            continue
        options = [str(option) for option in (item.get("options") or [])]
        correct = str(item.get("correct", options[0] if options else ""))
        # A worse failure than a wrong-but-plausible answer: the model naming
        # a "correct" value that isn't even one of its own options, which
        # would make the question unanswerable correctly. Drop it rather than
        # ship a quiz item that can never be marked right.
        if options and correct not in options:
            continue
        quiz.append({"question": str(item.get("question", "")), "options": options, "correct": correct})

    steps = []
    for item in payload.get("steps") or []:
        if not isinstance(item, dict):
            continue
        steps.append(
            {
                "concept": str(item.get("concept", "")),
                "explanation": str(item.get("explanation", "")),
                "example": str(item.get("example", "")),
            }
        )

    return {
        "tutorial_text": str(payload.get("tutorial_text", "")),
        "audio_script": str(payload.get("audio_script", "")),
        "visual_suggestion": str(payload.get("visual_suggestion", "")),
        "steps": steps,
        "quiz": quiz,
        "teacher_note": str(payload.get("teacher_note", "")),
    }


def _first_sentences(text: str, count: int = 3) -> str:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return " ".join(parts[:count]).strip()


def offline_tutorial(unit_id: int, chunks: list[str], learning_mode: str) -> dict:
    """A usable tutorial with no API key, built from the retrieved text itself.

    Not as good as the model - it summarises by extraction rather than by
    understanding - but it keeps a demo alive when the key is missing or the
    venue's wifi is down, and it is clearly labelled so nobody mistakes it for
    the real thing.
    """
    body = " ".join(chunks) if chunks else ""
    summary = _first_sentences(body, 3) or "No text was found for this unit."
    headline = _first_sentences(body, 1) or summary

    usable_chunks = [c for c in chunks if c.strip()] or ([body] if body else [])
    steps = []
    for i, chunk in enumerate(usable_chunks[:4]):
        sentences = [s for s in re.split(r"(?<=[.!?])\s+", chunk.strip()) if s]
        steps.append(
            {
                "concept": f"Part {i + 1}",
                "explanation": " ".join(sentences[:2]) or chunk[:200],
                "example": sentences[2] if len(sentences) > 2 else "",
            }
        )
    if not steps:
        steps = [{"concept": "Overview", "explanation": summary, "example": ""}]

    # Build each question from a different chunk when there are enough of
    # them, using OTHER chunks' headlines as distractors - every option is
    # real extracted text, nothing invented.
    headlines = [
        (_first_sentences(c, 1) or c)[:80] for c in usable_chunks if c.strip()
    ] or [headline[:80]]
    quiz = []
    for i, correct in enumerate(headlines[:3]):
        distractors = [h for j, h in enumerate(headlines) if j != i][:3]
        options = [correct] + distractors
        if len(options) < 2:
            options.append("Something not covered in this unit")
        quiz.append(
            {
                "question": f"Which of these is discussed in this unit (part {i + 1})?",
                "options": options,
                "correct": correct,
            }
        )

    return {
        "tutorial_text": f"Key points from this unit:\n• {summary}",
        "audio_script": (
            f"Here is what this unit covers. {summary} "
            "Take your time, and ask if you would like it again."
        ),
        "visual_suggestion": (
            "A simple labelled diagram of the main idea above - one box per key term, "
            "connected left to right."
        ),
        "steps": steps,
        "quiz": quiz,
        "teacher_note": (
            "Offline mode: built by extracting sentences, not by the model. "
            "Set GOOGLE_API_KEY for an adapted tutorial."
        ),
        "source_chunks": len(chunks),
        "learning_mode": learning_mode,
        "offline": True,
    }


def generate_tutorial(
    unit_id: int, student_diagnosis: str | None, learning_mode: str = "TEXT"
) -> dict:
    """Retrieve the relevant chunks and turn them into an adapted tutorial."""
    mode = (learning_mode or "TEXT").upper()
    if mode not in VALID_MODES:
        mode = "TEXT"

    query = (student_diagnosis or "").strip() or DEFAULT_QUERY
    chunks = retrieve(unit_id, query)

    # no key: fall back rather than fail. A dead demo helps nobody.
    if not api_key_present():
        return offline_tutorial(unit_id, chunks, mode)

    context = "\n\n---\n\n".join(chunks) if chunks else "(no textbook content found)"
    user_prompt = (
        f"Student diagnosis: {student_diagnosis or 'not provided'}\n"
        f"Learning mode: {mode}. {MODE_GUIDANCE[mode]}\n\n"
        f"Textbook chunks:\n{context}\n\n"
        "Return only the JSON object, with no commentary."
    )

    model = get_chat_model().bind(response_mime_type="application/json")
    reply = model.invoke([("system", SYSTEM_PROMPT), ("human", user_prompt)])

    result = _normalise(_coerce_json(reply.content))
    # useful for the teacher and for debugging retrieval quality
    result["source_chunks"] = len(chunks)
    result["learning_mode"] = mode
    result["offline"] = False
    return result


# --- image generation --------------------------------------------------------


#  Gemini returns PNG; pollinations.ai returns JPEG. Saving whatever comes
#  back under the right extension keeps the static server's guessed
#  Content-Type (mimetypes, by extension) truthful for either provider.
_MIME_EXTENSIONS = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}


def _generate_via_gemini(styled_prompt: str) -> tuple[bytes, str] | None:
    """Gemini's image-output model. Requires billing enabled on the API key's
    Google Cloud project - the free AI Studio tier grants zero quota for
    image models, unlike the text models this app already uses elsewhere.
    """
    if not api_key_present():
        return None
    try:
        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
        response = client.models.generate_content(
            model=GEMINI_IMAGE_MODEL,
            contents=[styled_prompt],
        )
    except Exception:
        # network error, quota (incl. the free-tier's zero image-gen quota),
        # or a safety block from the SDK itself
        return None

    for candidate in response.candidates or []:
        for part in candidate.content.parts or []:
            inline_data = getattr(part, "inline_data", None)
            if inline_data is not None and inline_data.data:
                return inline_data.data, (inline_data.mime_type or "image/png")
    return None


def _pollinations_token_present() -> bool:
    return os.getenv("POLLINATIONS_API_KEY", "").strip().strip('"') not in PLACEHOLDER_KEYS


def _generate_via_pollinations(styled_prompt: str) -> tuple[bytes, str] | None:
    """Free fallback (pollinations.ai) - used whenever Gemini's image models
    are unavailable, so a picture still generates without requiring a paid
    Gemini tier. Works anonymously with no key; if POLLINATIONS_API_KEY is
    set, it's sent for pollinations' higher-priority/rate-limited tier.
    """
    try:
        url = (
            f"https://image.pollinations.ai/prompt/{quote(styled_prompt, safe='')}"
            "?width=768&height=768&nologo=true"
        )
        if _pollinations_token_present():
            url += f"&token={quote(os.getenv('POLLINATIONS_API_KEY', ''))}"
        response = requests.get(url, timeout=30)
        content_type = response.headers.get("content-type", "")
        if response.status_code == 200 and content_type.startswith("image/"):
            return response.content, content_type.split(";")[0].strip()
    except Exception:
        pass
    return None


def generate_visual_image(prompt: str, unit_id: int) -> str | None:
    """Turn a visual_suggestion (a hint written for a human artist) into an
    actual picture: Gemini first, then a free fallback provider.

    Never raises - if both providers come back empty, the caller falls back
    to showing the text suggestion, same contract as `offline_tutorial`. A
    dead demo helps nobody.
    """
    if not (prompt or "").strip():
        return None

    styled_prompt = (
        "Create a simple, clean educational illustration for a student, based on this "
        f"description: {prompt.strip()}\n"
        "Style: flat vector illustration, bright and friendly, minimal or no text baked "
        "into the image itself, high contrast, easy to understand at a glance."
    )

    result = _generate_via_gemini(styled_prompt) or _generate_via_pollinations(styled_prompt)
    if not result:
        return None
    image_bytes, mime_type = result

    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha1(f"{prompt}{time.time()}".encode()).hexdigest()[:10]
    extension = _MIME_EXTENSIONS.get(mime_type, ".png")
    filename = f"visual_{unit_id}_{digest}{extension}"
    target = IMAGE_DIR / filename
    try:
        target.write_bytes(image_bytes)
    except OSError:
        return None

    return f"/static/images/{filename}"


# --- full-document curriculum generation --------------------------------------
#
# generate_tutorial() above deliberately only sees the top-K similarity-matched
# chunks (fine for "answer this student's specific gap"). A curriculum needs
# the OPPOSITE: every chunk, in order, actually represented in the lesson
# plan - the exact gap TODO.md Phase 2 exists to close.

CURRICULUM_PLAN_PROMPT = (
    "You are a curriculum designer. Below is a full textbook document, broken into "
    "numbered chunks. Design a complete lesson plan that covers EVERY educationally "
    "meaningful part of this document - do not skip sections, do not stop after the "
    "introduction, and do not artificially limit yourself to a small fixed number of "
    "lessons. The number of lessons must reflect how much distinct content is "
    "actually in the document: a short document might need only 2-3 lessons, a long "
    "one might need 15 or more.\n\n"
    "Group the chunks into an ordered list of lessons. Each lesson must be a "
    "self-contained, teachable concept and must reference the exact chunk range "
    "(start and end chunk numbers, inclusive) it is grounded in. Chunk ranges must "
    "not overlap, must stay in ascending order, and together should cover as much of "
    "the document as is educationally meaningful (it is fine to skip a chunk that is "
    "clearly a table of contents, references list, or similar non-content section).\n\n"
    "Return JSON: {\"title\": <overall subject/topic title>, "
    "\"lessons\": [{\"title\": <short lesson heading>, \"chunk_start\": <int>, "
    "\"chunk_end\": <int>}]}. Return only the JSON object, no commentary."
)

LESSON_SYSTEM_PROMPT = (
    "You are a special education tutor writing ONE lesson of a larger curriculum, "
    "grounded only in the textbook excerpt provided - do not introduce facts that "
    "are not in the excerpt.\n"
    "Generate JSON with keys: explanation, example, needs_visual, visual_suggestion, "
    "knowledge_check.\n"
    "'explanation': 2-4 plain-language sentences teaching the concept.\n"
    "'example': one concrete example grounded in the excerpt (empty string if none fits).\n"
    "'needs_visual': boolean - true only when a picture would genuinely help understand "
    "THIS specific lesson. Do not default to true for every lesson - most lessons about "
    "abstract or purely verbal content do not need one.\n"
    "'visual_suggestion': if needs_visual is true, describe one concrete, simple diagram "
    "or illustration; empty string otherwise.\n"
    "'knowledge_check': {\"question\", \"options\" (2-4 strings), \"correct\"} - a single "
    "check-for-understanding question. Before finalizing, verify 'correct' is exactly one "
    "of the 'options' values."
)

FINAL_ASSESSMENT_SYSTEM_PROMPT = (
    "You write a final assessment for a completed learning curriculum, covering its "
    "lessons. Write up to 10 multiple-choice questions - fewer if the curriculum is "
    "short, never pad with repetitive questions testing the same fact. Each question "
    "needs exactly 4 options and a 'correct' value that is exactly one of them, "
    "grounded in a different lesson where possible so the assessment covers the whole "
    "curriculum rather than one section repeatedly.\n"
    "Return JSON: {\"questions\": [{\"question\", \"options\", \"correct\"}]}. Only the JSON."
)


def all_chunks(unit_id: int) -> list[dict]:
    """Every chunk this unit's PDF was split into, in original document order,
    each tagged with its position.

    `retrieve()` intentionally only returns the top-k similarity matches for a
    single student query - wrong input for a curriculum planner, which needs
    to see the whole document to guarantee full coverage.
    """
    import pickle

    store_file = index_path(unit_id) / "index.pkl"
    if not store_file.exists():
        return []
    try:
        docstore, _ = pickle.loads(store_file.read_bytes())
        documents = list(getattr(docstore, "_dict", {}).values())
    except Exception:
        return []
    ordered = sorted(documents, key=lambda d: d.metadata.get("chunk", 0))
    return [
        {"position": d.metadata.get("chunk", i), "text": d.page_content}
        for i, d in enumerate(ordered)
    ]


def plan_curriculum(unit_id: int) -> dict:
    """One LLM call over the WHOLE document, producing an ordered lesson plan
    whose lesson count is derived from actual content (TODO.md Phase 2 - never
    a hardcoded number).
    """
    chunks = all_chunks(unit_id)
    if not chunks:
        raise ValueError("No content found for this unit")

    if not api_key_present():
        # Offline fallback: one lesson per chunk, so the document is still
        # fully represented even without a model to plan groupings.
        return {
            "title": "Curriculum",
            "lessons": [
                {"title": f"Part {c['position'] + 1}", "chunk_start": c["position"], "chunk_end": c["position"]}
                for c in chunks
            ],
            "total_chunks": len(chunks),
        }

    numbered = "\n\n".join(f"[chunk {c['position']}] {c['text']}" for c in chunks)
    model = get_chat_model().bind(response_mime_type="application/json")
    reply = model.invoke([("system", CURRICULUM_PLAN_PROMPT), ("human", numbered)])
    plan = _coerce_json(reply.content)

    lessons = []
    for item in plan.get("lessons") or []:
        try:
            start = int(item["chunk_start"])
            end = int(item["chunk_end"])
        except (KeyError, TypeError, ValueError):
            continue
        lessons.append({"title": str(item.get("title", "")) or f"Chunks {start}-{end}", "chunk_start": start, "chunk_end": end})

    if not lessons:
        # The model returned nothing usable - fall back to one lesson per
        # chunk rather than silently producing an empty curriculum.
        lessons = [
            {"title": f"Part {c['position'] + 1}", "chunk_start": c["position"], "chunk_end": c["position"]}
            for c in chunks
        ]

    return {"title": str(plan.get("title") or "Curriculum"), "lessons": lessons, "total_chunks": len(chunks)}


def generate_lesson_content(unit_id: int, lesson_title: str, chunk_start: int, chunk_end: int) -> dict:
    """Content for ONE lesson, grounded only in its own chunk range - keeps
    each generation call small and traceable instead of re-processing the
    whole document per lesson.
    """
    chunks = all_chunks(unit_id)
    scoped = [c["text"] for c in chunks if chunk_start <= c["position"] <= chunk_end]
    context = "\n\n".join(scoped) or "(no content found for this range)"

    if not api_key_present():
        sentences = [s for s in re.split(r"(?<=[.!?])\s+", context.strip()) if s]
        return {
            "explanation": " ".join(sentences[:3]) or context[:300],
            "example": sentences[3] if len(sentences) > 3 else "",
            "needs_visual": False,
            "visual_suggestion": "",
            "knowledge_check": None,
        }

    model = get_chat_model().bind(response_mime_type="application/json")
    user_prompt = f"Lesson title: {lesson_title}\n\nTextbook excerpt:\n{context}\n\nReturn only the JSON object."
    reply = model.invoke([("system", LESSON_SYSTEM_PROMPT), ("human", user_prompt)])
    data = _coerce_json(reply.content)

    knowledge_check = None
    kc = data.get("knowledge_check")
    if isinstance(kc, dict):
        options = [str(o) for o in (kc.get("options") or [])]
        correct = str(kc.get("correct", options[0] if options else ""))
        if options and correct in options:
            knowledge_check = {"question": str(kc.get("question", "")), "options": options, "correct": correct}

    return {
        "explanation": str(data.get("explanation", "")),
        "example": str(data.get("example", "")),
        "needs_visual": bool(data.get("needs_visual")),
        "visual_suggestion": str(data.get("visual_suggestion", "")),
        "knowledge_check": knowledge_check,
    }


def generate_final_assessment(lesson_titles: list[str]) -> list[dict]:
    """Up to 10 MCQs covering the whole curriculum. Returns [] rather than
    raising when there's no API key - a curriculum without a final assessment
    still has real value; the frontend just won't show that step.
    """
    if not api_key_present() or not lesson_titles:
        return []

    context = "\n".join(f"- {title}" for title in lesson_titles)
    model = get_chat_model().bind(response_mime_type="application/json")
    reply = model.invoke(
        [
            ("system", FINAL_ASSESSMENT_SYSTEM_PROMPT),
            ("human", f"Curriculum lessons:\n{context}\n\nReturn only the JSON object."),
        ]
    )
    data = _coerce_json(reply.content)

    questions = []
    for item in (data.get("questions") or [])[:10]:
        options = [str(o) for o in (item.get("options") or [])]
        correct = str(item.get("correct", options[0] if options else ""))
        if options and correct in options:
            questions.append({"question": str(item.get("question", "")), "options": options, "correct": correct})
    return questions

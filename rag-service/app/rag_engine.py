"""PDF ingestion, vector storage and tutorial generation.

The NeuroLearn RAG service. Everything that touches the LLM or the vector store
lives here, so the route layer stays thin and testable.

The piece that matters for this platform: generation takes a **learning mode**
(TEXT / AUDIO / VISUAL / AR - the same enum the Prisma schema uses). When the CV
service detects disengagement and the platform switches mode, the same unit can
be regenerated in the new mode from the same source PDF.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from langchain_community.embeddings import FakeEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

load_dotenv()

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
PLACEHOLDER_KEYS = {"", "your-key-here", "sk-your-key-here", "changeme"}


def api_key_present() -> bool:
    return os.getenv("OPENAI_API_KEY", "").strip().strip('"') not in PLACEHOLDER_KEYS


# --- embeddings and chat models ---------------------------------------------
# Built lazily rather than at import time: the app should still start and serve
# the upload page when no API key is configured yet, and fail with a clear
# message only when a key is actually needed.


def get_embeddings() -> OpenAIEmbeddings:
    if not api_key_present():
        raise RuntimeError("OPENAI_API_KEY is not set. Copy .env.example to .env and add your key.")
    return OpenAIEmbeddings(model="text-embedding-3-small")


def get_chat_model() -> ChatOpenAI:
    if not api_key_present():
        raise RuntimeError("OPENAI_API_KEY is not set. Copy .env.example to .env and add your key.")
    return ChatOpenAI(model="gpt-4o-mini", temperature=0.3)


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
        quiz.append(
            {
                "question": str(item.get("question", "")),
                "options": options,
                "correct": str(item.get("correct", options[0] if options else "")),
            }
        )

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
            "Set OPENAI_API_KEY for an adapted tutorial."
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

    model = get_chat_model().bind(response_format={"type": "json_object"})
    reply = model.invoke([("system", SYSTEM_PROMPT), ("human", user_prompt)])

    result = _normalise(_coerce_json(reply.content))
    # useful for the teacher and for debugging retrieval quality
    result["source_chunks"] = len(chunks)
    result["learning_mode"] = mode
    result["offline"] = False
    return result

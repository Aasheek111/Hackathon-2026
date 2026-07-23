# 📚 rag-service — NeuroLearn

Teachers upload unit PDFs. The service splits them, embeds them into a FAISS index
per unit, and generates a tutorial adapted to **one student** and to the
**learning mode** the platform has switched them into.

Runs on **:8100** (cv-service already owns 8000). Standalone — it does not touch
`backend/`, `frontend/` or the Prisma schema.

---

## Why the learning mode matters

The platform already decides a mode from engagement (`TEXT → AUDIO → VISUAL → AR`).
`POST /generate-tutorial` takes that mode, so the same unit comes back in the form
the student can currently use:

| Mode | What changes in the output |
| --- | --- |
| `TEXT` | Short bullet points in plain language |
| `AUDIO` | The teaching moves into `audio_script` — full narration, visuals described out loud |
| `VISUAL` | Leads with `visual_suggestion` — one concrete diagram a teacher can sketch |
| `AR` | Reduced to a single idea, playful quiz, a visual that could become a 3D object |

**The demo:** upload one PDF, generate in `TEXT`, then generate the same unit in
`AUDIO`. Same source, same student, completely different lesson — which is the CV
mode-switch made visible.

---

## Run it

```bash
cd rag-service

python -m venv .venv
.venv\Scripts\activate         # Windows
# source .venv/bin/activate    # macOS / Linux

pip install -r requirements.txt

copy .env.example .env         # then paste your Gemini key in
uvicorn app.main:app --reload --port 8100
```

- Demo page → http://127.0.0.1:8100
- API docs → http://127.0.0.1:8100/docs
- Health → http://127.0.0.1:8100/health

Verified on Python 3.11 and 3.14, `faiss-cpu` 1.14.

### With Docker

The Dockerfile is ready. To add it to the stack, paste this into the root
`docker-compose.yml` next to `cv-service` (we did not edit that file):

```yaml
  # Python RAG Microservice
  rag-service:
    build:
      context: ./rag-service
      dockerfile: Dockerfile
    container_name: neurolearn_rag
    restart: unless-stopped
    ports:
      - '8100:8100'
    environment:
      GOOGLE_API_KEY: ${GOOGLE_API_KEY}
    volumes:
      - rag_uploads:/app/uploads
      - rag_vectors:/app/vector_store
```

and add to the `volumes:` block at the bottom:

```yaml
  rag_uploads:
  rag_vectors:
```

When you wire it to the Node backend later, add
`RAG_SERVICE_URL: http://rag-service:8100` to the `backend` service's environment —
the same pattern as `CV_SERVICE_URL`.

---

## No API key? It still works

Without `GOOGLE_API_KEY` the service **does not fail**. It reads the chunks straight
out of the index and returns an extractive tutorial with `"offline": true` and a
teacher note saying so. The demo page shows a warning banner.

It is worse than the model — it summarises by extraction, not understanding — but a
missing key on stage will not kill your demo.

---

## API

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| `POST` | `/upload-pdf` | form-data `unit_id`, `file` | `{status, unit_id, chunks}` |
| `POST` | `/upload-image` | form-data `unit_id`, `file` | `{status, image_url}` |
| `POST` | `/generate-tutorial` | `{unit_id, student_diagnosis?, learning_mode?}` | the tutorial |
| `GET` | `/health` | — | key configured? which units are indexed? |

```jsonc
// POST /generate-tutorial
{
  "tutorial_text": "…",
  "audio_script": "…",
  "visual_suggestion": "…",
  "quiz": [{ "question": "…", "options": ["A", "B"], "correct": "A" }],
  "teacher_note": "…",
  "source_chunks": 4,
  "learning_mode": "AUDIO",
  "offline": false
}
```

A unit that was never indexed → `404 {"error": "Unit not processed yet"}`.

---

## Tests

```bash
.venv\Scripts\python smoke_test.py
```

**24 checks, no API key required**: boot, static mounts, uploads, the documented
error shapes, all four learning modes, the offline fallback, and the splitter.

---

## Layout

```
app/main.py        FastAPI app, CORS, static mounts
app/routes.py      the four endpoints
app/rag_engine.py  PDF text → chunks → FAISS → retrieval → generation
app/models.py      request/response schemas
uploads/pdfs/      unit_1.pdf, unit_2.pdf …
uploads/images/    served at /static/images/…
vector_store/      index_unit_1/, index_unit_2/ …
static/index.html  demo page with a mode selector
```

## Notes

- **Chunking:** 500 characters, 50 overlap, splitting on paragraphs → sentences → words.
- **Scanned PDFs have no text layer.** The API says so (400) rather than indexing an
  empty document and producing a confusing tutorial.
- **Indexes persist** to `vector_store/index_unit_{id}/`, so a restart loses nothing.
- **`learning_mode` mirrors the `LearningMode` enum** in `backend/prisma/schema.prisma`.

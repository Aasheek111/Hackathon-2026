# Learning Platform — Comprehensive Tutorial Pipeline Implementation TODO

> **How to read this file.** Each phase below is scoped, tested, and committed
> independently before the next one starts (per the working agreement). Checkboxes
> are only ever checked after the corresponding code has been implemented **and**
> verified running — never marked complete just because a plan was written.
>
> This file corrects a few assumptions in the original spec against what the
> codebase actually contains (see Phase 0) and records the three architecture
> decisions made up front (Celery+Redis, merge-then-branch, in-app notifications)
> so later phases don't re-litigate them.

---

## Phase 0 — Existing Architecture Audit ✅ (done, informs every phase below)

Actual stack (Node/Express backend + Python rag-service — **not** the Django/Celery
stack the original spec assumed already existed):

- [x] **Backend**: Node.js/Express 5 + TypeScript (`backend/src`), Prisma ORM +
      **SQLite** (`backend/prisma/schema.prisma`), JWT auth (`middleware/auth.ts`:
      `requireAuth`, `requireRole`, `requireApprovedTeacher`). Routes in
      `backend/src/routes/*.ts`, mounted in `backend/src/index.ts`.
- [x] **rag-service**: Python FastAPI (`rag-service/app`), LangChain + Gemini
      (`langchain-google-genai`) for tutorial text, FAISS per-unit vector store
      (`rag_engine.py`). As of the just-opened **PR #2**
      (`feat/visual-image-generation`, not yet merged): also does image
      generation (`generate_visual_image` — Gemini `gemini-2.5-flash-image` with
      a pollinations.ai fallback, since Gemini image models need billing) and a
      `UnitPreview` model that pre-warms a generic tutorial+image right after a
      PDF finishes indexing (fire-and-forget, no queue infra).
- [x] **cv-service**: Python FastAPI, OpenCV webcam engagement detection —
      unrelated to this work, do not touch.
- [x] **Frontend**: React + Vite + TypeScript + Tailwind + framer-motion.
      `TutorialPage.tsx` (student view), `TutorialAssistant.tsx` (chat widget),
      `TeacherDashboardPage.tsx` (upload + unit management).
- [x] **Confirmed via direct inspection — corrections to the original spec's
      assumptions:**
  - ❌ **No Celery, no Redis, no BullMQ, no task queue of any kind exists
    anywhere in the repo** (`docker-compose.yml` has 4 services only: backend,
    cv-service, rag-service, frontend). This is **new infrastructure**, not an
    extension of something already running.
  - ❌ **No notification system/model exists** (no `Notification` table, no
    bell icon, nothing).
  - ❌ **No YouTube/SerpApi integration exists anywhere.**
  - ❌ **No server-side TTS exists.** The only "audio" today is the browser's
    native `window.speechSynthesis` in `TutorialPage.tsx` — nothing Gemini-based.
  - ❌ **No "existing AI quiz-generation system" to extend.** `backend/src/routes/quiz.ts`
    is a static, seeded seeded-question demo (`QuizQuestion` model) unrelated to
    AI generation — YouTube quiz gen (Phase 11) is genuinely new, though it will
    reuse `QuizQuestion`/`AssessmentAttempt` shapes where they fit.
  - ❌ **SMTP env vars are dead config.** `backend/.env.example` has `SMTP_*`
    vars, but nothing in `backend/src` uses them — `auth.ts`'s password-reset
    flow just `console.log`s the token. There's no mailer to extend.
  - ❌ **No test framework or test files exist at all** — not in `backend`,
    `frontend`, or `rag-service` (only vendored test files inside
    `node_modules`/`.venv`). Selenium/E2E (Phase 14) starts from zero.
  - ✅ **Confirmed root cause of "only ~3 tutorial sections regardless of PDF
    size"**: `rag-service/app/rag_engine.py`'s `SYSTEM_PROMPT` literally says
    `"'steps' is a list of 2-4 objects"`, and `generate_tutorial()` calls
    `retrieve(unit_id, query)` with the default `k=TOP_K=4` — every generation
    call only ever sees the top-4 similarity-matched chunks (~2000 chars),
    **never the whole document**. This is Phase 2's exact target.
- [x] **Decisions locked in for this effort** (see conversation for full trade-offs):
  1. **Real Celery + Redis** (new containers) for background generation — the
     spec's assumption was wrong about it already existing, but at this scale
     (multi-minute, multi-stage generation; YouTube transcript+quiz; TTS) a real
     durable queue is the right call, not a bigger version of the fire-and-forget
     pattern from PR #2.
  2. **Merge PR #2 into `main` first**, then branch `feat/tutorial-pipeline-v2`
     off a clean `main` for all of this work — it builds directly on
     `Tutorial.imageUrl` / `UnitPreview` / `generate_visual_image`.
  3. **In-app notifications only** (DB-backed `Notification` model + a bell
     icon, polled) — no real email/SMTP, since nothing to extend exists and it's
     unnecessary infra for a hackathon demo.
- [x] Noted, not yet actioned: `git status` has an untracked
      `UKG_Basic_Words_Course.pdf` at repo root — planned to use as the "large
      PDF" fixture for Phase 2/14 testing unless told otherwise. Also a harmless
      pending line-ending-only diff on `migration_lock.toml`.
- [ ] **Unverified integration details — flagged rather than assumed** (per the
      "do not fake it" instruction):
  - SerpApi's exact product/endpoint for YouTube transcripts is not yet
    confirmed against live docs — to be verified with the real `SERPAPI_API_KEY`
    at the start of Phase 11, not assumed.
  - The requested TTS model **`gemini-3.1-flash-tts-preview`** is not a
    confirmed-existing model as of this session's knowledge — the known
    TTS-capable Gemini models are `gemini-2.5-flash-preview-tts` /
    `gemini-2.5-pro-preview-tts`. The voice **`Achernar`** *is* a real prebuilt
    Gemini TTS voice name. Phase 12 starts by checking the installed
    `google-genai` SDK / live API for what's actually available and uses that,
    documenting any discrepancy instead of hardcoding an unverified model string.

---

## Phase 1 — Tutorial Generation Architecture (foundations)

- [ ] Merge PR #2 (`feat/visual-image-generation`) into `main`
- [ ] Branch `feat/tutorial-pipeline-v2` off clean `main`
- [ ] Design & migrate `TutorialGenerationJob` Prisma model: id, unitId,
      sourceDocumentId, teacherId, stage (enum: QUEUED, EXTRACTING, PLANNING,
      GENERATING_TEXT, GENERATING_VISUALS, GENERATING_AUDIO,
      GENERATING_QUESTIONS, FINALIZING, COMPLETED, FAILED), progressPercent,
      errorMessage, retryCount, startedAt, completedAt
- [ ] Decide + document the DB-write ownership model: **Prisma/Node stays the
      only writer to the SQLite file** (avoids two runtimes fighting over one
      file/lock). Celery tasks persist results by calling new **internal**
      Node endpoints (shared-secret header, not user JWT), not by writing SQLite
      directly.
- [ ] `POST /api/units/:id/documents` (existing upload route) creates a
      `TutorialGenerationJob` instead of doing inline generation, returns
      `{ status: "queued", jobId }` immediately
- [ ] `GET /api/units/:id/generation-job` (or `/jobs/:id`) for status polling

## Phase 2 — Full PDF Coverage

- [ ] Replace `TOP_K`-only single-shot retrieval in `generate_tutorial()` with a
      full-document pass over **all** chunks from `split_text()`, not just a
      4-chunk similarity search
- [ ] Document-structure / topic-boundary detection (heading heuristics and/or
      an LLM segmentation pass over chunk-group summaries)
- [ ] Lesson-plan generation: one LLM call producing an ordered lesson outline
      (title + chunk range per lesson) — **lesson count derived from content**,
      never hardcoded
- [ ] Per-lesson generation: one bounded generate call per lesson, each grounded
      in only its own chunk range; record `sourceChunkStart`/`sourceChunkEnd` per
      lesson for traceability (Phase-13/RAG compatibility)
- [ ] Test against small (`Chap 1 Introduction.pdf`), medium (`Chapter 3 fatta...pdf`
      — both already in `backend/uploads/syllabus`), and large
      (`UKG_Basic_Words_Course.pdf`) documents; confirm section count scales
      with content instead of capping at ~3

## Phase 3 — Celery + Redis Background Generation

- [ ] `docker-compose.yml`: add `redis` service (broker + result backend)
- [ ] `docker-compose.yml`: add `celery-worker` service (rag-service image,
      different command: `celery -A app.celery_app worker`)
- [ ] `rag-service/app/celery_app.py`: Celery instance configured against redis
- [ ] `rag-service/app/tasks.py`: the staged task chain (extract → plan →
      generate_text → generate_visuals → generate_audio → generate_questions →
      finalize), calling back into Node's internal job-status endpoints after
      each stage
- [ ] Idempotency: key jobs by `(unitId, sourceDocumentId)` so re-uploading the
      same document doesn't spawn duplicate concurrent jobs
- [ ] Retry policy: `acks_late=True` + `autoretry_for` on transient errors
      (network/rate-limit), max retries, exponential backoff; permanent
      failures mark the job `FAILED` with a real `errorMessage`
- [ ] Confirm worker-restart recovery: an in-flight task is redelivered, not
      silently lost
- [ ] UI shows real stage progress (no fake/simulated progress bars)

## Phase 4 — Multimodal Tutorial Generation

- [ ] Extend the generation schema so each lesson independently decides 0–N
      images (reuse `generate_visual_image()` from PR #2) — never a fixed quota
- [ ] Wire per-lesson audio generation (Phase 12) where it adds value, not for
      every lesson unconditionally
- [ ] Re-verify the "image changes then goes static" bug (spec §9) against the
      **new multi-lesson structure**: PR #2 already made single-tutorial images
      deterministic (persisted `imageUrl`, no regeneration on render/poll) — the
      open question for this phase is whether that same determinism holds once
      a tutorial has many lessons with independent images and Next/Previous
      navigation, not a from-scratch bug hunt

## Phase 5 — Tutorial Database Persistence

- [ ] New Prisma models: `TutorialCurriculum` (per Unit — canonical, **not**
      per-student, per the "canonical tutorial + adaptive presentation" goal),
      `TutorialLesson` (ordered, text/visualUrl/audioUrl/source chunk range),
      `KnowledgeCheckQuestion` (per lesson), `FinalAssessmentQuestion` (per
      curriculum, ≤10)
- [ ] Decide fate of the existing `Tutorial` model during implementation: lean
      toward evolving it into a per-student **progress pointer** into a shared
      `TutorialCurriculum` (current-lesson index, per-lesson answers) rather
      than a full per-student content copy — avoids regenerating content per
      student, satisfies spec §23
- [ ] Author + apply the migration; confirm existing data isn't destroyed

## Phase 6 — Tutorial Notification System

- [ ] `Notification` model: id, teacherId, type, title, body, unitId?, jobId?,
      read, createdAt
- [ ] Written by the internal job-completion/failure callback (Phase 1/3)
- [ ] `GET /api/notifications`, `PATCH /api/notifications/:id/read`
- [ ] Frontend: bell icon + dropdown in `TeacherDashboardPage.tsx`, polled

## Phase 7 — New Tutorial Player UI

- [ ] Redesign `TutorialPage.tsx`: header (subject/unit/lesson title + progress
      bar), lesson content area, Next/Previous, per-lesson image/audio inline,
      knowledge-check inline, final assessment at the end
- [ ] Fetch the full curriculum + the student's progress pointer once; navigate
      client-side between lessons — no regeneration on click
- [ ] Preserve existing visual identity (glass/dark theme, Tailwind classes,
      framer-motion patterns already in use)

## Phase 8 — Tutorial Questions and Answers

- [ ] Per-lesson knowledge-check persistence (`KnowledgeCheckAttempt`:
      studentId, questionId, answer, correct, timestamp)
- [ ] Feed into the existing XP system (`backend/src/lib/progress.ts`'s
      `awardXp` — reuse, don't reinvent)

## Phase 9 — Final MCQ Assessment

- [ ] Up to 10 MCQs per curriculum (generated once, shared across students —
      same caching philosophy as the current `Tutorial` unique-constraint cache)
- [ ] Submit/score endpoint, reusing the scoring pattern already in
      `backend/src/routes/assessments.ts`

## Phase 10 — Tutorial Completion / Coursework

- [ ] Mark curriculum complete per student; update `StudentProgress`
- [ ] Completion screen (score, badges, retry/review options)
- [ ] Inspect `backend/src/routes/recommendations.ts` (not yet reviewed) during
      this phase and hook completion into the existing adaptive-recommendation
      flow if one already exists there

## Phase 11 — YouTube Transcript Quiz Generation

- [ ] `SERPAPI_API_KEY` env var (rag-service, following the existing
      `GOOGLE_API_KEY` pattern — `.env.example` placeholder, never hardcoded)
- [ ] URL validation (`youtube.com/watch?v=...`, `youtu.be/...`)
- [ ] **Verify the exact SerpApi transcript product/endpoint against live docs
      first** (flagged in Phase 0 as unconfirmed) — do not assume the shape
- [ ] Transcript cleaning (dedupe fragments, strip timestamps/whitespace,
      preserve sentence boundaries)
- [ ] Reuse the Gemini quiz-generation prompt pattern from `rag_engine.py`
- [ ] Runs as a Celery task (Phase 3 infra) — slow, shouldn't block the request
- [ ] Persist with `source_type='youtube'`, `source_url`
- [ ] Teacher UI: paste URL → generate → status → review/edit → save/publish

## Phase 12 — Gemini Text-to-Speech

- [ ] **First**, confirm against the installed `google-genai` SDK / live API
      which TTS model is actually available (`gemini-2.5-flash-preview-tts` /
      `gemini-2.5-pro-preview-tts` are the known candidates — `gemini-3.1-flash-tts-preview`
      is unconfirmed) and whether `Achernar` is selectable as a voice; document
      whatever is found rather than assuming
- [ ] `generate_speech(text, voice)` in rag-service using the confirmed model
- [ ] Content-hash-based audio caching (reuse the sha1-digest pattern from
      `generate_visual_image` in PR #2), served via the existing `/static` mount
- [ ] `POST /generate-speech`; frontend "🔊 Listen" per lesson + selected text,
      with play/pause/stop/replay controls

## Phase 13 — Student Personalization Integration

- [ ] Use existing `AssessmentAttempt.preferredMode` / `attentionSpanScore` to
      choose **presentation emphasis** on top of the canonical curriculum
      (text/audio/visual density) — not a separate generated copy per student

## Phase 14 — Selenium End-to-End Testing

- [ ] No test framework exists today anywhere in the repo — this is genuinely
      greenfield (Python + Selenium + pytest, matching rag-service's runtime)
- [ ] Teacher flow: login → upload PDF → job queued → worker processes →
      notification appears
- [ ] Student flow: login → open unit → curriculum loads immediately (no wait)
      → Next/Previous with correct per-lesson visuals → knowledge checks →
      final MCQ → completion
- [ ] YouTube flow: paste URL → quiz generated → review → save
- [ ] TTS flow: click Listen → audio plays
- [ ] Resilience: refresh mid-tutorial, reopen later, worker restart mid-job,
      failed generation + retry

## Phase 15 — Regression Testing

- [ ] Re-verify PR #2 flows (image generation, chat-driven customization) still
      work under the new multi-lesson structure
- [ ] Re-verify existing `quiz.ts` demo flow, `assessments.ts`, classroom
      enrollment/join-request flows are untouched

## Phase 16 — Docker / Worker Verification

- [ ] `docker compose up --build` including the new `redis` + `celery-worker`
      services
- [ ] Confirm worker connects to Redis, receives and executes tasks, restarts
      cleanly, and database writes are visible from the Node side

## Phase 17 — Final Cleanup

- [ ] `git diff` review + secrets scan (no keys committed, `.env.example` only)
- [ ] Decide fate of the `UKG_Basic_Words_Course.pdf` test fixture (keep as a
      committed test fixture, or remove)
- [ ] Final `TODO.md` pass — every completed item checked, every incomplete
      item still explicitly visible

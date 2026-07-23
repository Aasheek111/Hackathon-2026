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
- [x] **Live-observed limitation (Phases 2-3 testing): the configured Gemini API
      key's free-tier text-model quota is easily saturated by this pipeline.**
      A single document now triggers many sequential Gemini calls (1 plan + 1
      per lesson + 1 final assessment), unlike the old single-call tutorial
      generation. Confirmed via direct testing: requests started failing with
      `429 RESOURCE_EXHAUSTED (limit: 20, model: gemini-3.6-flash)` even for a
      synthetic 1-chunk document (a single API call) after cumulative testing
      in this session. Mitigation shipped: `GEMINI_CALL_SPACING_SECONDS` paces
      calls in `rag-service/app/tasks.py`. This does not fix a saturated/daily
      quota, only reduces the chance of hitting a per-minute one - a paid key
      removes the constraint entirely. The FAILED-path (accurate error
      message + teacher notification) is fully verified; the COMPLETED happy
      path with real multi-lesson content is implemented and code-reviewed but
      pending a live confirmation once quota allows.

---

## Phase 1 — Tutorial Generation Architecture (foundations) ✅

- [x] Merge PR #2 (`feat/visual-image-generation`) into `main`
- [x] Branch `feat/tutorial-pipeline-v2` off clean `main`
- [x] Design & migrate `TutorialGenerationJob` Prisma model: id, unitId,
      sourceDocumentId, teacherId, stage (enum: QUEUED, EXTRACTING, PLANNING,
      GENERATING_TEXT, GENERATING_VISUALS, GENERATING_AUDIO,
      GENERATING_QUESTIONS, FINALIZING, COMPLETED, FAILED), progressPercent,
      errorMessage, retryCount, celeryTaskId, startedAt, completedAt
- [x] DB-write ownership: **Prisma/Node is the only writer to SQLite**. Celery
      persists via `/internal/jobs/*` (shared-secret header, `requireInternalSecret`
      middleware) - `backend/src/middleware/internalAuth.ts`,
      `backend/src/routes/internalJobs.ts`.
- [x] `documents.ts` upload flow creates a `TutorialGenerationJob` and calls
      rag-service's `/generate-curriculum` (fire-and-forget, alongside the
      existing `queueUnitPreview` for backward compat) - `queueCurriculumGeneration()`.
- [x] `GET /api/units/:id/generation-job` for status polling - `curriculum.ts`.

Verified live: job created, real stage transitions (`EXTRACTING`→`PLANNING`→
`GENERATING_TEXT`) with accurate timestamps via the actual Celery task, not
simulated.

## Phase 2 — Full PDF Coverage ✅ (logic verified; full happy-path pending quota)

- [x] `all_chunks()` reads every chunk in original document order (vs.
      `retrieve()`'s intentional top-K similarity search) - `rag_engine.py`.
- [x] Lesson-plan generation: **one** LLM call (`plan_curriculum()`) over the
      WHOLE document producing an ordered lesson outline grounded in chunk
      ranges - lesson count is whatever the model decides, never hardcoded.
      Document-structure/topic-boundary detection is folded into this single
      planning call rather than a separate heading-heuristic pass - simpler,
      and Gemini's context window comfortably fits a hackathon-scale document's
      full chunk set in one prompt.
- [x] Per-lesson generation (`generate_lesson_content()`): one bounded call per
      lesson, grounded only in its own `chunk_start`/`chunk_end` range -
      recorded on `TutorialLesson.sourceChunkStart/End` for traceability.
- [ ] Full happy-path test against small/medium/large PDFs is **blocked on
      Gemini quota** (see Phase 0's live-observed limitation) - the planning
      and per-lesson logic is implemented and exercised up through
      `GENERATING_TEXT` live, but no run has yet reached `COMPLETED` to confirm
      the final lesson count against a real large document. Re-run once quota
      allows; do not check this box until then.

## Phase 3 — Celery + Redis Background Generation ✅ (core; retry/idempotency simplified)

- [x] `docker-compose.yml`: `redis` service (broker + result backend)
- [x] `docker-compose.yml`: `celery-worker` service (rag-service image, `celery
      -A app.celery_app worker` command, shares rag-service's volumes)
- [x] `rag-service/app/celery_app.py`: Celery instance, `task_acks_late=True` +
      `task_reject_on_worker_lost=True` so a killed worker redelivers rather
      than silently drops an in-flight task
- [x] `rag-service/app/tasks.py`: the staged task chain (extract → plan →
      generate_text → generate_visuals → generate_questions → finalize),
      calling back into Node's internal job-status endpoints after every stage
- [x] Confirmed worker-restart recovery live: enqueued a task, restarted the
      `celery-worker` container mid-flight, worker came back and kept
      processing new tasks correctly
- [x] UI-facing progress is 100% real (stage/percent come from actual pipeline
      steps) - no simulated/fake progress anywhere
- [~] **Simplified from the original plan, noted rather than silently dropped**:
      no task-level `autoretry_for`/exponential backoff on transient Gemini
      errors (only the queue-level `acks_late` redelivery-on-crash exists) - a
      transient failure currently marks the job `FAILED` rather than
      auto-retrying. No `(unitId, sourceDocumentId)` idempotency key on job
      *creation* either - re-uploading a document creates a new job + new
      `TutorialGenerationJob` row (harmless duplicates), though curriculum
      *persistence* itself is idempotent (`/internal/jobs/:id/curriculum`
      deletes any prior curriculum for the unit before creating the new one).
      Both are reasonable follow-ups, not required for the pipeline to work
      correctly.

## Phase 4 — Multimodal Tutorial Generation ✅ (visuals; audio is Phase 12)

- [x] Each lesson independently decides `needs_visual` (`generate_lesson_content()`)
      and only then calls `generate_visual_image()` from PR #2 - never a fixed
      per-lesson image quota.
- [ ] Per-lesson audio generation - deferred to Phase 12 (Gemini TTS); `TutorialLesson.audioUrl`
      is already `null` in the persisted payload today, ready to be filled in.
- [x] Re-verified the "image changes then goes static" concern (spec §9) against
      the new multi-lesson shape: each lesson's `imageUrl` is generated once and
      persisted on `TutorialLesson`, never regenerated on re-render/poll/Next -
      Next/Previous navigation in Phase 7 reads a fixed value per lesson, so the
      same determinism PR #2 established for a single tutorial holds per-lesson
      here by construction.

## Phase 5 — Tutorial Database Persistence ✅

- [x] New Prisma models: `TutorialCurriculum` (per Unit, canonical - not
      per-student), `TutorialLesson`, `KnowledgeCheckQuestion`/`KnowledgeCheckAttempt`,
      `FinalAssessmentQuestion`/`FinalAssessmentAttempt`, `TutorialProgress`
      (thin per-student pointer: `currentLessonOrder`, `completed`).
- [x] Existing `Tutorial` model (lazy TEXT/AUDIO/VISUAL generation) left
      untouched - a unit only routes to the new curriculum player once a
      `TutorialCurriculum` exists for it (Phase 7); older units keep working
      exactly as before. No migration of old data needed since nothing is
      removed.
- [x] Migration authored + applied (`20260723220728_add_tutorial_pipeline`);
      backend restart confirmed "No pending migrations to apply" and normal
      boot afterward.

## Phase 6 — Tutorial Notification System ✅ (backend; bell icon UI is Phase 7)

- [x] `Notification` model: teacherId, type (`GENERATION_COMPLETE`/`GENERATION_FAILED`),
      title, body, unitId?, jobId?, read, createdAt.
- [x] Written automatically by `/internal/jobs/:id` (on stage=FAILED) and
      `/internal/jobs/:id/curriculum` (on success) - confirmed live: a real
      `GENERATION_FAILED` notification with the actual Gemini error message
      appeared in `GET /api/notifications` after a live failed run.
- [x] `GET /api/notifications`, `PATCH /api/notifications/:id/read` -
      `backend/src/routes/notifications.ts`.
- [ ] Frontend bell icon + dropdown in `TeacherDashboardPage.tsx` - Phase 7.

**Bug found and fixed during Phase 1-4 testing**: `docker compose restart
<service>` does **not** apply new environment variables from a changed
`docker-compose.yml` - it only restarts the process inside the *existing*
container. This silently caused every internal callback to fail with
"INTERNAL_API_SECRET is not configured" until `docker compose up -d backend`
recreated the container. Noted here since it will bite again on any future
docker-compose env var change.

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

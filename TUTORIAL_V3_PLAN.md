# Tutorial V3 — Multi-mode player, raw-docs, teacher analytics, admin grade config

Real-usage feedback after the V2 pipeline. Built for a **live demo on a tight
API-token budget**, so the guiding rule is: **generate each unit's content
ONCE, then present it four ways.** Nothing below re-hits an external AI model
on a mode switch, a re-open, or a second student — generation happens once per
unit on the queue worker and everything after is cached DB reads + local
(CV) compute.

## The token-saving architecture (the whole point)

One `TutorialCurriculum` per unit already holds, per lesson: `explanation`,
`example`, `imageUrl` (pollinations, free), `audioUrl` (Groq TTS, free),
`knowledgeCheck` (MCQ), plus unit-level `finalAssessmentQuestions` (MCQs).

The four "modes" are **presentation layers over that same row**, not separate
generations:

| Mode   | What it shows (all from the ONE cached curriculum)                         | Extra AI cost |
|--------|---------------------------------------------------------------------------|---------------|
| TEXT   | explanation + example, text-forward                                       | none          |
| AUDIO  | auto-plays the pre-generated `audioUrl`, prominent replay                 | none          |
| VISUAL | image-forward layout, the pre-generated `imageUrl` per lesson            | none          |
| AR     | the balloon game seeded with THIS unit's existing MCQs                    | **none**      |

AR was the one that looked expensive; it isn't — it reuses the knowledge-check
+ final-assessment questions already in the DB. So the multi-mode feature is
**1× generation cost, not 4×.**

## Phases

### Phase A — Mode switcher on the curriculum player ✅ target
- Restore the TEXT/AUDIO/VISUAL/AR buttons (top-right, like the legacy
  `TutorialPage`) on `CurriculumPlayerPage`.
- Mode = client state, persisted per `(student, curriculum)` so it survives
  reload and topic-switching. Add `preferredMode` to `TutorialProgress`.
- Switching mode or jumping lessons **never refetches/regenerates** — same
  data, different layout. Progress is saved on every navigation regardless of
  mode (the autistic-learner "switch freely, never lose place" requirement).
- Per-mode layout: AUDIO auto-narrates + big replay; VISUAL enlarges the
  image and can show >1 (lesson image + any final-assessment illustration);
  TEXT is the current reading layout; AR launches Phase B.

### Phase B — AR balloon game wired to unit content (zero new AI) ✅ target
- Backend `GET /units/:id/ar-game` → `{ title, questions:[{q, options[4], answer}] }`
  assembled from the curriculum's `knowledgeCheck`s + `finalAssessmentQuestions`
  (keep only 4-option items; the board has 4 balloons). No model call.
- `ar-game.html` fetches that set instead of its hardcoded array; reports the
  score back so AR completion counts toward progress.
- `ArGamePage` / the player pass `unitId` through to the iframe.

### Phase C — Full-PDF coverage guard ✅ target
- `plan_curriculum` already plans over `all_chunks`. Add a **coverage guard**:
  after the LLM plan, if the union of chunk ranges misses a meaningful slice
  of the document, append lessons for the gaps (or fall back to grouped
  one-lesson-per-N-chunks) so a long PDF never silently becomes 3 lessons.
- Verify live on a real multi-section PDF.

### Phase D — Raw teacher-doc viewer + resume ✅ target
- Backend `GET /units/:id/document/file` streams the stored PDF (teacher-owner
  or enrolled student only).
- Student unit view offers two doors: **Interactive Tutorial** (our player,
  personalized) and **Read Original** (the raw PDF).
- Raw view embeds the PDF and tracks the last page in a light
  `RawDocProgress {studentId, documentId, lastPage}`; Back resumes there.

### Phase E — Concentration during tutorials + teacher heatmap/analytics
- Reuse the working CV service + the QuizPage capture pattern: add an
  opt-in webcam loop to the player (behind the existing camera consent),
  streaming engagement keyed to `unitId` + `lessonOrder`. **Local compute,
  no AI tokens.**
- Persist rollups in `UnitEngagementSample {studentId, unitId, lessonOrder,
  avgScore, focusedRatio, samples, at}` (aggregated, not per-frame).
- Teacher analytics routes: per-unit (student × lesson focus grid → heatmap),
  per-subject, per-class, per-student rollups.
- New teacher "Insights" page: unit heatmap + class/subject/student
  performance, built from the above + existing quiz/assessment scores.

### Phase F — Admin-configurable grade level (admin-only)
- `AppConfig` singleton `{ gradeLevel }` (default the current implicit level).
- Admin `GET/PATCH /admin/config` + a "Settings" tab in `AdminPage` (ADMIN
  role only — teachers can't touch it).
- Thread `grade_level` into rag-service (`models.py` + turn the 4 prompt
  constants into templates that interpolate it, replacing the hardcoded
  `grade-1`). Backend callers load the config and forward it. Affects only
  NEW generations; cached curricula unchanged (no token cost to flip it).

### Phase G — Exam adapts to mode + ability (presentation, not regeneration)
- AR mode's "exam" = the balloon game. Other modes = the standard MCQ final
  assessment. Struggling students (low `attentionSpanScore`) see fewer options
  / the simplified layout already wired via `isSimplified`. No re-generation.

### Phase H — Selenium E2E, fast + reliable
- Extend the suite: mode switch, AR game load + score, raw-doc view + resume,
  teacher heatmap renders, admin grade config round-trips. Headless, seeded
  data, no external AI in the test path.

## Token discipline (explicit, since the budget is tight)
- Generation happens **once per unit** on the worker; every read after is DB.
- Mode switches, re-opens, extra students, AR, analytics, raw-docs: **0 AI
  calls.**
- Images = pollinations (free), audio = Groq TTS (free), text/MCQ = Groq
  (free tier, 1k/day). Gemini is fallback only and never used in bulk.
- CV concentration = local OpenCV, no external AI.
- Admin grade flip re-words prompts for the NEXT generation only; doesn't
  reprocess existing units.

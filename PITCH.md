# Pragya — Hackathon 2026 Pitch Pack

Companion to **`presentation.pptx`** (10 slides, ~6 min). Speaker notes are
embedded in the deck itself — open the Notes pane in PowerPoint.

---

## ONE-SENTENCE USP

> **Existing platforms make content accessible. We make the learning experience adapt to the learner.**

**Tagline:** *Don't make every learner adapt to education. Make education adapt to every learner.*

---

## THE 3 THINGS JUDGES MUST REMEMBER

1. **Accessibility ≠ adaptability.** Captions and transcripts solved "can the
   learner reach the content." Nobody automated "did the content reach the learner."
2. **One upload becomes four ways to learn** — text, audio, visual, AR — from
   the curriculum a teacher already owns, with no extra work for them.
3. **The loop is genuinely closed.** We observe engagement, switch modality
   live when attention drops, and show the teacher exactly which lesson lost the class.

---

## 30-SECOND VERSION

> Education is available, but it isn't always learnable. A child who learns by
> seeing gets a wall of text; a child who loses focus after ninety seconds gets a
> forty-minute lecture. Pragya takes the curriculum a teacher already has and turns
> it into four ways to learn the same lesson — text, audio, visual, and an AR game.
> Then it watches whether it's working: if a learner's attention drops, the app
> changes how it teaches, and the teacher sees exactly where the class was lost.
> Accessibility made content reachable. We make it learnable.

## ONE-MINUTE VERSION

> UNESCO says learners with disabilities are two and a half times more likely to
> never attend school. But the ones who *do* make it into a classroom are often
> still excluded — just more quietly. The content was "available." They still didn't learn.
>
> Here's our insight: accessibility is not the same as adaptability. Coursera,
> Khan Academy, screen readers — they solved whether a learner can *reach* content,
> and they did it well. But every learner still walks the same path, in the same
> format. The learner adapts to the platform.
>
> Pragya flips that. A teacher uploads the PDF they already teach from. We read the
> whole document and produce every lesson in four modalities at once — text, narrated
> audio, real images, and an AR game built from that unit's own questions. The student
> learns in whichever mode works for them.
>
> Then the important part: we observe. Our own computer-vision service reads engagement,
> and if attention drops during assessment the app switches modality mid-session, on its own.
> That finding carries forward into their next lesson. And the teacher gets a concentration
> heatmap showing exactly which lesson lost which student — the same day, not at end of term.
>
> Built in Nepal, for classrooms with no specialist support staff. That's SDG 4 — not by
> building new schools, but by making the ones that exist reach further.

---

## PRODUCT AUDIT (source of truth = the code, not the pitch)

### A — Fully implemented, demo-ready *(safe to show and claim)*
| Capability | Evidence |
|---|---|
| 3 roles + JWT auth, teacher approval workflow | `Role` enum, `TeacherStatus`, `requireApprovedTeacher` |
| Teacher: classroom → subject → unit → document upload | `documents.ts`, `subjects.ts` |
| Full-document ingestion + chunking + FAISS index | `rag_engine.process_pdf`, coverage guard in `plan_curriculum` |
| **Celery + Redis** background generation with real progress stages | `tasks.py`, `JobStage`, live progress bar |
| Multimodal generation: lessons + images + knowledge checks + final exam | `generate_curriculum` task |
| **4-mode player** (TEXT / AUDIO / VISUAL / AR), mode persisted per student | `CurriculumPlayerPage`, `TutorialProgress.preferredMode` |
| **AR balloon game** seeded from the unit's own MCQs (0 extra AI cost) | `GET /units/:id/ar-game` + postMessage bridge |
| **Real CV**: OpenCV face/eye/gaze → engagement score | `cv-service/main.py` (Haar cascades) |
| **Live adaptive mode-switching** during assessment on sustained low eye contact | `QuizPage.handleEyeContactLossAdaptation` |
| Concentration logged per (student, unit, lesson) | `UnitEngagementSample` |
| **Teacher concentration heatmap** + per-student marks | `TeacherInsightsPage`, `GET /units/:id/analytics` |
| Marking system → A–F grade; student report card + recommendations | `lib/marking.ts`, `GET /progress/report` |
| Raw-PDF reader with page resume | `RawDocViewerPage`, `RawDocProgress` |
| YouTube → quiz (free transcript API) → forward to a classroom unit | `youtube_quiz.py`, `PATCH /youtube-quiz/:id/assign` |
| eSewa payments (Nepal) | `subscription.ts` |
| Admin-configurable target grade level | `AppConfig`, admin Settings tab |
| Word/PDF/text uploads | `SUPPORTED_EXTENSIONS` |

### B — Works, needs polish
- **Server-side TTS** — Groq TTS is wired but blocked on model-terms acceptance in the
  Groq console. Until then AUDIO mode narrates with the browser voice. *Say "audio works"; don't claim studio TTS.*
- AR games 2–4 exist but are standalone, not yet unit-linked. **Only demo the unit-linked one.**

### C — Partial / describe carefully
- Personalisation today = preferred modality + attention score → default mode +
  simplified text. Real and working, but it is not a full learner model. Say
  *"adapts presentation"*, not *"knows the student."*

### D — NOT implemented — **never claim**
- ❌ Any diagnosis/screening of autism, ADHD or disability
- ❌ Multi-language content (English only today)
- ❌ Offline mode
- ❌ Real classroom outcome data (no pilot yet)

### E — Do not mention on stage
- SQLite as the datastore (say "the database")
- Test/demo seed accounts
- Internal quota incidents during development

---

## SCREENSHOT PLAN (all real, captured from the running app)

| Slide | Screenshot | Why it earns its place | Say this |
|---|---|---|---|
| 3 (Solution) | `02_tutorial_visual_mode` | The mode switcher is visible — the USP in one frame | "That's the running product. Those four buttons are the whole idea." |
| 6 (Product) | `03_tutorial_text_mode` | Same lesson, calm reading layout | "Same lesson, text mode." |
| 6 (Product) | `02_tutorial_visual_mode` | Image-led + larger type | "Visual mode — and the type enlarges automatically for low attention scores." |
| 6 (Product) | `09_ar_game` | Proves AR is real, not a mockup | "A 3D scene — pop the right answer with your fingertip through the camera." |
| 7 (Teacher) | `08_teacher_heatmap` | The insight teachers have never had | "That amber 38 is lesson three losing the room — visible today, not at end of term." |

---

## PROBLEM → RESPONSE MAP

| Barrier | Our response | Status |
|---|---|---|
| One format doesn't fit every learner | Four modalities per lesson | ✅ Working |
| Existing material isn't designed for diverse learners | Transform the teacher's own curriculum | ✅ Working |
| Students learn differently | Learner profile → default modality | ✅ Working |
| Long static content loses attention | Short lessons, visuals, audio, AR | ✅ Working |
| Teachers have no time to build accessible formats | One upload → background generation | ✅ Working |
| Needs change as learners progress | Live modality switching + engagement logging | ✅ Working |
| Teachers can't see who's disengaging | Per-lesson concentration heatmap | ✅ Working |

---

## JUDGE Q&A (15–30s each)

**1. How is this different from Coursera / Udemy / Khan Academy?**
They're content libraries — they solved reach and accessibility, and they did it well.
We're not a library; we're a layer over the curriculum a teacher already owns. And their
path is identical for every learner. Ours changes modality based on observed engagement.
Different problem, not a better version of theirs.

**2. Why can't a student just use ChatGPT or Gemini?**
A chatbot answers when asked. It doesn't know your syllabus, doesn't sequence a unit,
doesn't notice you disengaged, and doesn't tell your teacher lesson three lost you.
We're a structured curriculum pipeline with a feedback loop — and the teacher stays in control of the content.

**3. Captions and transcripts already exist. Why do we need you?**
Because a transcript is still one format. Captions make content reachable; they don't make it
learnable for a child who needs a picture, or who can't sustain forty minutes. We start where accessibility stops.

**4. Are you diagnosing autism or disabilities?**
No — deliberately and explicitly. We never screen, label or diagnose. Low attention tells
us to change how *we* present the lesson. It's a signal about our teaching, never a judgement about the child.

**5. How do you know which mode works for a student?**
Two sources. A short diagnostic that measures engagement per modality, and then live
signals while they learn. It's evidence from behaviour, not a preference form they filled in once.

**6. What if you get their preference wrong?**
It self-corrects — engagement is measured continuously, so a wrong guess gets overridden by the
next signal. And the student can override it themselves at any moment; the mode buttons are always visible.

**7. How do you protect student privacy?**
Camera frames are analysed for engagement and are **not stored** — we keep a score, not video.
Tracking is opt-in behind explicit consent and can be switched off from the player header, mid-lesson.

**8. What happens to student data?**
It stays with the school's deployment. Concentration is stored as aggregate rollups per lesson,
not per-frame records, and it's visible to that student's own teacher — not sold, not shared.

**9. How accurate is your AI?**
Content is grounded in the teacher's own document rather than open generation, which
constrains hallucination. But we don't claim perfection — which is exactly why the teacher
previews and can regenerate anything before students see it.

**10. What if the AI generates something wrong?**
The teacher is the safety net by design. Every unit is preview-first, with regenerate-all and
regenerate-visuals controls. We treat AI as a drafting assistant for a teacher, not an unsupervised authority.

**11. Who pays?**
B2B and B2G — schools and colleges subscribe per classroom; NGOs and government inclusive-education
programmes deploy at district scale. Students never pay to reach their own classroom's material.

**12. Why would a school adopt it?**
Because it removes work rather than adding it. They upload what they already teach from, and get
five formats plus data they've never had about who is disengaging — without hiring an accessibility team.

**13. How does this work in Nepal?**
It's built here, for here. eSewa is already integrated, it runs on modest hardware, and it's
designed for schools with no specialist support staff — which is most of them.

**14. Low-cost devices or poor internet?**
The student experience is a normal web app. Generation happens once, on the server, in the
background — so students receive prepared content instead of waiting on live AI. Embeddings run
locally on our server, so indexing needs no external calls at all.

**15. Other languages?**
English today — I won't overclaim. The architecture is language-agnostic because content comes
from the teacher's own document, so Nepali is a content and prompt task, not a re-architecture. It's our next priority.

**16. Biggest technical challenge?**
Making generation reliable on free infrastructure. We hit real daily quota walls, so we moved text
to Groq, embeddings to a local model, and visuals to a photo API — the whole pipeline now runs
without a paid tier, which is what makes it deployable in the schools we're targeting.

**17. Biggest limitation today?**
No classroom pilot yet — we can prove the system works, not yet that it improves outcomes.
That's the honest gap, and measuring it is the next step.

**18. Next feature?**
Nepali language support, then using the concentration data to *recommend* to the teacher which
lesson to reteach — right now we show them the heatmap; next we'd suggest the action.

**19. How does it scale?**
Generation is a queued background job, so it scales by adding workers. Content is generated once
per unit and shared across every student in the classroom — one upload serves the whole cohort.

**20. What exactly is your USP?**
Existing platforms make content accessible. We make the learning experience adapt to the learner —
and we're the layer that does it on top of the curriculum schools already have.

---

## SDG 4 ALIGNMENT

Target **4.5** (eliminate disparities in education for the vulnerable, including persons with
disabilities) and **4.a** (education facilities that are disability-sensitive and provide inclusive
learning environments). Our contribution isn't new infrastructure — it's making existing
classroom material reach learners it currently doesn't.

---

## DELIVERY NOTES

- **Total: ~6:00.** Slides 4, 5 and 7 are the ones that win it — protect their time.
- If you're running long, compress slide 9 (business) to two sentences. Never cut slide 5.
- Say the ethics line on slide 5 **before** a judge asks it. It converts your biggest
  risk into a credibility win.
- Have the app open in a second tab. If they ask for a demo: classroom → tutorial →
  switch modes live → teacher Insights heatmap. That's a 60-second demo.

# Accessibility Documentation

How Pragya supports learners with different disabilities, what is genuinely
implemented, and — just as importantly — what is not.

---

## 1. Accessibility profiles

A student picks a profile at registration and can change it any time from
**Settings**. It is stored on `User.disabilityType` (Prisma enum
`DisabilityType`).

| Profile | Enum value | Dashboard |
| --- | --- | --- |
| Prefer not to say | `null` / `NONE` | `/dashboard` |
| Autism | `AUTISM` | `/dashboard` |
| ADHD | `ADHD` | `/dashboard` |
| Blind / low vision | `BLINDNESS` | `/dashboard/blind` |
| Deaf / hard of hearing | `DEAFNESS` | `/dashboard/deaf` |

### The profile selects a presentation, never a permission

This is the core design rule. `disabilityType` decides which dashboard you
**land on**. It never restricts what you can reach:

- All three dashboards are gated identically and remain reachable by URL.
- Shared pages (classroom, lessons, progress, settings) are unchanged for
  everyone.
- Every individual accessibility setting can be toggled by any student
  regardless of profile.

Routing lives in exactly one place — [`frontend/src/lib/homePath.ts`](../frontend/src/lib/homePath.ts).
Every redirect that used to hardcode `/dashboard` now calls `homePathFor(user)`.

### User-set beats inferred

A profile seeds **defaults**, it does not lock settings:

| Profile | Seeded defaults |
| --- | --- |
| `BLINDNESS` | `alwaysNarrate`, `audiobookMode` |
| `DEAFNESS` | `signLanguage` |
| `ADHD` | `reducedMotion` |
| others | none |

Seeding happens on first read of the prefs row. **Changing** your profile
later re-applies that profile's defaults — because an explicit change is a
user action, not an inference — but any toggle sent in the same request still
wins.

---

## 2. Blind / low vision — `/dashboard/blind`

### Voice navigation
Built on the browser-native Web Speech API (`SpeechRecognition` /
`webkitSpeechRecognition`) — no API key, no per-utterance cost, works offline.

Commands: `start quiz`, `open lessons`, `my progress`, `settings`,
`read screen`, `repeat`, `stop`, `log out`, and `explain …` / `ask …` /
`what is …` to reach the AI assistant.

Implementation notes:
- Longest matching phrase wins, so `next question` beats a bare `next`.
- Recognition auto-restarts on `onend` (Chrome cuts the stream after a silence).
- The microphone is always released on unmount.

> ⚠️ **Voice is an accelerator, never the only route.** Web Speech is not
> supported everywhere (Firefox ships it off by default). Every screen keeps a
> full keyboard and button path, and the UI says so when support is missing.

### Text to speech
Reuses the existing `useSpeech` hook → `POST /api/tts` → rag-service
`/generate-speech` (content-hash cached), falling back to the browser's own
`speechSynthesis`. Audio never silently fails.

### Screen reader support
- Semantic landmarks (`<header>`, `<main>`, `<section>` with `aria-labelledby`).
- A skip link to main content as the first focusable element.
- `aria-live="polite"` on the dashboard and `aria-live="assertive"` in the quiz,
  so status changes are announced rather than only spoken.
- Real `<button>` / `<a>` elements throughout — no `div` handlers.
- `aria-pressed` on the mic toggle; every icon-only control has a label.

### Voice quiz — `/dashboard/blind/quiz`
Reads the question and all four options aloud, accepts `option A` / `answer B`
/ `number 3`, confirms what it heard, then explains why the answer was right or
wrong before advancing (3.5s pause).

It posts to the **same** `/assessments` endpoints as the sighted quiz, so
completing it satisfies the one free trial. It is deliberately the trial path
for blind learners, since the standard trial is a webcam eye-tracking flow they
cannot complete.

**Data honesty:** the voice quiz sends *zeroed* `modeEngagement` and states
`preferredMode: "AUDIO"` outright. Inventing webcam focus samples would corrupt
the teacher's `avgFocus` analytics with numbers nobody measured.

---

## 3. Deaf / hard of hearing — `/dashboard/deaf`

- **Caption-first:** no activity anywhere requires hearing, stated up-front on
  the dashboard rather than left to be discovered by failure.
- **Sign language section** (`/dashboard/deaf/sign-language`): ASL alphabet,
  numbers 1–10, and everyday vocabulary across Greetings, Everyday, School and
  Feelings. Searchable, category-tabbed, with localStorage favourites.
- **Sign quiz** (`/dashboard/deaf/sign-quiz`): 10 questions generated from the
  same data the dictionary uses, so it can never drift out of sync. Distractors
  are drawn from the same category so the answer can't be guessed by spotting
  the odd one out. Feedback is written and announced via `aria-live` — never a
  sound cue.
- **AI assistant:** text-in, text-out.

### ⚠️ Honest limitation: sign language is text, not video

The sign entries are **written descriptions** of how each sign is formed, taken
from the standard, widely-published ASL manual alphabet and common vocabulary.

They are **not** video, photos, or an animated avatar. No provider in this stack
(Groq for text, Unsplash for photos) can generate an accurate handshape, and a
hallucinated image would teach a deaf learner an *incorrect* sign — materially
worse than showing none.

Real sign media needs a licensed dataset (e.g. ASL-LEX, Signing Savvy) or
footage recorded with a Deaf consultant. Every entry in
[`frontend/src/data/signLanguage.ts`](../frontend/src/data/signLanguage.ts)
accepts an optional `mediaUrl`, and the UI renders it when present — so adding a
licensed set later is a **data change, not a rewrite**.

The UI tells learners this directly rather than implying the descriptions are
equivalent to seeing a sign performed.

---

## 4. AI learning assistant

`POST /api/assistant/ask` → rag-service `POST /ai-assist` → Groq
(`llama-3.3-70b-versatile`).

The learner's profile is read **server-side from their session**, not trusted
from the request body, and only shapes tone — never what may be asked:

| Profile | Tone rule |
| --- | --- |
| `BLINDNESS` | Prose for the ear. No "see"/"look at", no reference to pictures, colour or layout, no bullets/markdown/emoji (a screen reader reads them as noise). |
| `DEAFNESS` | Never relies on sound, pronunciation or rhyme. Short lines, concrete visual comparisons. |
| `AUTISM` | Literal and concrete. No idioms, sarcasm or metaphor. One idea per sentence. |
| `ADHD` | Short and front-loaded — the answer first, then at most three brief points. |

### Why Groq and not Gemini

The brief asked for Gemini. This codebase **deliberately removed** the Gemini
fallback (documented at `rag-service/app/rag_engine.py`): Gemini's free tier
allows ~20 generate-content requests **per day** versus Groq's 1,000, so falling
back to it converted transient Groq blips into confusing quota errors.

Re-introducing Gemini would undo a fix the team already made. The assistant is
built on the existing, working Groq path instead. Swapping providers later means
changing `_invoke_groq` — the single place every LLM call goes through.

---

## 5. Shared accessibility settings — `/settings`

| Setting | Effect |
| --- | --- |
| Text size | Small / Medium / Large / Extra Large |
| High contrast | Black + yellow palette in the lesson player and storybook |
| Always narrate | Auto-plays narration on every lesson and storybook page, in any mode |
| Audiobook mode | Chains lesson narration hands-free across a whole unit |
| Sign language | Fingerspelling strip under storybook pages |
| Reduced motion | Drops page-turn and transition animations |
| Accessibility profile | Switches dashboard and re-seeds that profile's defaults |

Settings are stored per student in `AccessibilityPrefs` and applied through
`AccessibilityContext`.

> **Scope note:** font size and high contrast are applied in the pages that opt
> in (`CurriculumPlayerPage`, `StorybookView`) via local classes rather than
> global CSS — the same convention as the existing light/dark theme toggle. They
> are **not** yet applied app-wide. This is a deliberate, known boundary, not an
> oversight: touching shared `.glass` / `Button` styles would restyle pages that
> haven't been reviewed for contrast.

---

## 6. Environment variables

No new variables are required for the accessibility work — it reuses existing
configuration.

| Variable | Service | Required for | Notes |
| --- | --- | --- | --- |
| `GROQ_API_KEY` | rag-service | AI assistant, all content generation | Free tier: 1,000 req/day |
| `RAG_SERVICE_URL` | backend | TTS + assistant proxy | Defaults to `http://localhost:8100` |
| `UNSPLASH_ACCESS_KEY` | rag-service | Lesson images | Not used by accessibility features |
| `JWT_SECRET` | backend | Auth | — |
| `DATABASE_URL` | backend | Prisma | — |
| `VITE_API_URL` | frontend | API base | Defaults to `http://localhost:5001/api` |
| `VITE_RAG_SERVICE_URL` | frontend | Audio/image URLs | Defaults to `http://localhost:8100` |

Speech recognition and browser-fallback TTS need **no** key — they are
browser-native.

---

## 7. Browser support

| Feature | Chrome / Edge | Safari | Firefox |
| --- | --- | --- | --- |
| Voice navigation & voice quiz | ✅ | ⚠️ partial | ❌ off by default |
| Text to speech (server) | ✅ | ✅ | ✅ |
| Text to speech (browser fallback) | ✅ | ✅ | ✅ |
| Everything else | ✅ | ✅ | ✅ |

Where voice is unavailable the UI says so and the keyboard/button path covers
every action.

---

## 8. Testing checklist

**Blind path**
- [ ] Unplug the mouse. Reach and complete the voice quiz using Tab/Enter only.
- [ ] Confirm the skip link is the first focusable element.
- [ ] Turn the monitor off; complete a quiz by audio and voice alone.
- [ ] Deny microphone permission — confirm a clear message and a working button path.
- [ ] Open in Firefox — confirm the "needs Chrome or Edge" notice and full keyboard operation.

**Deaf path**
- [ ] Mute the system. Confirm every instruction and activity is still completable.
- [ ] Search the dictionary, star a sign, reload, confirm favourites persist.
- [ ] Complete the sign quiz; confirm feedback is written, never audio-only.

**Profiles**
- [ ] Register with each of the five profiles; confirm you land on the right dashboard.
- [ ] Switch profile in Settings; confirm the dashboard and defaults change.
- [ ] Confirm autism/ADHD/no-profile students still get the original dashboard unchanged.

**Regression**
- [ ] Existing adaptive quiz, AR game, classroom, progress and teacher insights all still work.

---

## 9. Known limitations

1. **Sign language is written descriptions, not video** — see §3. The biggest
   gap, and it needs a licensed dataset, not more code.
2. **Voice navigation is Chrome/Edge only** — a Web Speech API limitation.
   Mitigated by a full keyboard path everywhere.
3. **Font size and high contrast are page-scoped**, not app-wide — see §5.
4. **The blind voice quiz uses a fixed question bank**, not the adaptive
   engine, because the adaptive engine's mode-switching is driven by webcam
   engagement that does not apply.
5. **No formal WCAG audit has been run.** The blind dashboard was built to WCAG
   2.1 AA intent (contrast, focus order, landmarks, live regions) but this has
   not been verified with axe/Lighthouse or by a screen-reader user.
6. **Not tested with real assistive technology or disabled users.** Nothing here
   substitutes for that.

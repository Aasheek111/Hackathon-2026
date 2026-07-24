# Progress & Direction

_Last updated: 24 July 2026 (revision 2 - same day)_

An honest status check against the hackathon problem statement.

---

## 0. The problem statement, and where this landed

> **Students with learning difficulties and disabilities often lack access to
> inclusive and accessible online learning resources.**

Read that carefully. It does **not** say "build separate apps for disabled
students." It says they lack access to *learning resources* — the same
resources everyone else gets.

The first revision of this doc flagged that we'd built two accessible side
doors (a standalone audio quiz, a standalone sign-language course) that never
touched the teacher's real uploaded curriculum. **That gap is now closed.**
`CurriculumPlayerPage` - the actual lesson player every student uses - now
has voice navigation and a sixth SIGN mode, on top of the existing
TEXT/AUDIO/VISUAL/AR/STORY modes. A blind student can navigate their real
Grade 3 science unit by voice. A deaf student gets fingerspelling for the
same unit's real vocabulary, not a separate ASL curriculum.

```
                 ONE curriculum (teacher's PDF)
                             │
        ┌──────────┬─────────┼─────────┬──────────┐
        ▼          ▼         ▼         ▼          ▼
      TEXT       AUDIO    VISUAL      SIGN      STORY/AR
   (zero images) (voice+  (image-    (caption+  (illustrated
                 narrate)  led)      handshapes) story/game)
```

The dashboards still decide *where you start*. The player is now where
inclusion actually happens - which was the point.

---

## 1. What is done

### Shared foundation
| Item | State |
| --- | --- |
| Accessibility profile at registration, editable in Settings | ✅ |
| `AccessibilityPrefs` (font size, contrast, narration, motion, sign, audiobook) | ✅ |
| Profile-based routing via one `homePathFor()` choke point | ✅ |
| Routes named for the mode, not the person (`/dashboard/audio`) | ✅ |
| AI tutor with per-profile tone rules | ✅, live-verified |
| Global font scaling (root `rem`, was broken - fixed) | ✅ |
| Teacher per-student report, shared with the student's own view | ✅ |
| **Voice navigation inside the real `CurriculumPlayerPage`** | ✅ **New** - next/previous/read/repeat/stop/switch-mode/exit, Chrome/Edge |
| **SIGN as a sixth mode in the real curriculum player** | ✅ **New** - caption-sized text, zero audio dependency, fingerspelling for lesson vocabulary |
| **TEXT mode showing images (real bug, user-reported)** | ✅ **Fixed** - was showing whenever an image existed, in every mode; now VISUAL-only |
| Static accessibility audit (see §3) | ✅ - all 17 findings fixed |

### Audio / blind
| Item | State |
| --- | --- |
| Audio-first dashboard, large targets, high contrast | ✅ |
| Voice navigation (Web Speech API) | ✅ - Chrome/Edge only |
| Skip links, ARIA live regions, keyboard-only operation | ✅ |
| Voice quiz reading questions + accepting spoken answers | ✅ works (own 8-question bank, unchanged) |
| Server TTS | ❌ Broken - Groq terms not accepted, see §2. Browser fallback now works and reports failure honestly instead of going silent. |
| Voice control inside the real curriculum player | ✅ **Done this revision** |

### Visual / deaf
| Item | State |
| --- | --- |
| Caption-first visual dashboard | ✅ |
| Sign dictionary - 65 signs, searchable, categories, favourites | ✅ |
| Sign practice quiz, same-category distractors, written feedback, now shows handshape diagrams | ✅ |
| **Visual figures for signs** | ✅ **Done** - schematic SVG handshape diagrams, 26 letters + 10 digits |
| **Multi sign-language architecture** | ✅ **Done** - ASL shipped, NSL listed and honestly empty (§4) |
| Sign/caption support on the real curriculum | ✅ **Done this revision** - SIGN mode |
| Favourites synced to account | ✅ **Done this revision** - was localStorage-only |

---

## 2. Known broken (not fixable by code)

**Server text-to-speech returns 502 on every new phrase.**

```
POST /generate-speech → 400 from Groq:
  "The model `canopylabs/orpheus-v1-english` requires terms acceptance.
   Please have the org admin accept the terms at
   https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english"
```

An org admin must accept the model terms once in the Groq console. 11 clips
generated before this lapsed are still cached and still play. Mitigated: the
browser's built-in speech is now a real fallback with confirmed playback
(`onstart`-gated), and if nothing plays at all the UI says so and offers a
retry instead of going mute.

---

## 3. Static accessibility audit

No browser/axe/Lighthouse tool is available in this environment, so this is a
**source-read audit** - a substitute for, not equivalent to, a real
axe/Lighthouse run or a screen-reader pass. It covered the audio dashboard,
visual dashboard, sign pages, the curriculum player's SIGN mode and voice
commands, Settings, and the registration form's accessibility-profile picker.

**17 findings, all fixed:**

- **Blocker (1):** the Settings page's own toggle switches (`ToggleRow`,
  used 5×) had no accessible name - a screen-reader user heard "switch, not
  checked" five times with no way to tell which setting was which. Fixed with
  `aria-label`.
- **Serious (8):** unassociated form labels on Name/Email/Password/Confirm
  Password (accessible name fell back to placeholder text, or two fields
  shared one name); the show/hide-password button was icon-only with no
  label; the registration error message had no `aria-live`; the knowledge-
  check result ("Correct!" / "Not quite...") appeared with no live region;
  a heading-hierarchy break on the sign dictionary (h3 cards ranking above
  the page's own h2); the marketing `<h1>` on the register page was inside a
  `hidden lg:flex` panel, so it vanished from the accessibility tree on any
  phone-width viewport, leaving the page with no h1 at all below `lg`.
- **Minor (8):** eight instances of `text-slate-400` (≈2.6:1 contrast on
  white) used for real informational text - quiz prompts, category labels,
  "no picture yet" placeholders - bumped to `text-slate-500`/`600`
  (≈4.6-7:1); one self-contained view (`FinalAssessmentView`) had an `h2`
  with no preceding `h1` in its own render tree.

Full findings list is in the PR description. What this audit does **not**
cover: real screen-reader behavior (NVDA/JAWS/VoiceOver), actual measured
contrast ratios (estimated from Tailwind's published palette, not a color
picker), touch-target sizing, or anything requiring a rendered DOM.

---

## 4. Honest limitations that remain

1. **Nothing has been tested with real assistive technology or disabled
   users.** No screen-reader pass, no axe/Lighthouse audit - see §3 for why,
   and for what a source-read audit can and can't catch.
2. **Voice control is Chrome/Edge only** (Web Speech API). Keyboard paths
   exist everywhere as the fallback, including inside the curriculum player.
3. **Sign language is ASL only.** Nepali Sign Language is listed in the
   language picker and **deliberately left empty**. It is a distinct
   language with its own Devanagari-based manual alphabet, not a translation
   of ASL - fabricating its handshapes would risk teaching a deaf Nepali
   child an incorrect sign, which is a real harm, not a placeholder gap. It
   needs a verified source (Nepal National Federation of the Deaf, or the
   published NSL dictionary) reviewed by Deaf NSL signers. This is blocked
   on a human source, not on engineering time.
4. **Server TTS needs a Groq console action** - see §2. Also blocked on a
   human (an org admin), not on code.
5. **The standalone audio quiz uses its own 8-question bank**, not the
   teacher's real assessments - unchanged from before. The real curriculum
   is now voice-navigable (§1), but the *quiz itself* inside the player
   still uses the existing on-screen knowledge-check flow, not a voice
   Q&A loop. That would be the next increment if this keeps going.
6. **High contrast** is still only applied in the lesson player and
   storybook, not app-wide (font size, by contrast, is now global - see §1).

---

## 5. One thing to hold onto

The measure of success was never how good the separate dashboards are. It
was whether a blind student and a sighted student could both complete **the
same unit their teacher uploaded**. That was the gap identified in the first
revision of this document. It's closed now - not perfectly (§4 lists what's
still rough), but for real: voice commands and SIGN mode live in
`CurriculumPlayerPage` itself, the one file every student's lesson actually
renders through.

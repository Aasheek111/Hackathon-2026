# Progress & Direction

_Last updated: 24 July 2026_

An honest status check against the hackathon problem statement, and where I
think the architecture needs to go next.

---

## 0. The problem statement, and the thing we got slightly wrong

> **Students with learning difficulties and disabilities often lack access to
> inclusive and accessible online learning resources.**

Read that carefully. It does **not** say "build separate apps for disabled
students." It says they lack access to *learning resources* — the same
resources everyone else gets.

**What we have actually built so far is two side doors.**

- `/dashboard/audio` has its own quiz — a hardcoded 8-question bank.
- `/dashboard/visual` has its own sign language section — a self-contained ASL
  course.

Both are decent. **Neither one makes the teacher's actual uploaded curriculum
accessible.** A blind student who lands on the audio dashboard still cannot
navigate the real lesson player by voice. A deaf student learning ASL is
learning ASL — not their Grade 3 science unit.

We have the hard part already: a pipeline that ingests a teacher's PDF and
renders it as TEXT / AUDIO / VISUAL / AR / STORY. That is *exactly* the right
shape. The next move is not more separate dashboards — it is **making that one
pipeline reachable by every learner.**

```
                 ONE curriculum (teacher's PDF)
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         rendered as    rendered as    rendered as
          TEXT/VISUAL     AUDIO         SIGN + CAPTION
              │              │              │
          eyes+mouse    ears+voice      eyes, no sound
```

The dashboards decide *where you start*. The **player** is where inclusion
actually has to happen.

---

## 1. What is genuinely done

### Shared foundation
| Item | State |
| --- | --- |
| Accessibility profile at registration, editable in Settings | ✅ Done |
| `AccessibilityPrefs` (font size, contrast, narration, motion, sign, audiobook) | ✅ Done |
| Profile-based routing via one `homePathFor()` choke point | ✅ Done |
| Routes named for the **mode**, not the person (`/dashboard/audio`) | ✅ Done |
| AI tutor with per-profile tone rules | ✅ Done, live-verified |
| Global font scaling (root `rem`) | ✅ Fixed |
| Teacher per-student report endpoint (shared with student's own view) | ✅ Done |

### Audio / blind
| Item | State |
| --- | --- |
| Audio-first dashboard, large targets, high contrast | ✅ Done |
| Voice navigation (Web Speech API) | ✅ Done — Chrome/Edge only |
| Skip links, ARIA live regions, keyboard-only operation | ✅ Done |
| Voice quiz reading questions + accepting spoken answers | ⚠️ Works, but **own question bank** |
| Server TTS | ❌ **Broken** — see §3 |
| **Voice control inside the real curriculum player** | ❌ **Not started** |

### Visual / deaf
| Item | State |
| --- | --- |
| Caption-first visual dashboard | ✅ Done |
| Sign dictionary — 65 signs, searchable, categories, favourites | ✅ Done |
| Sign practice quiz, same-category distractors, written feedback | ✅ Done |
| **Visual figures for signs** | ❌ **0 of 65 have any figure** — text only |
| Fingerspelling in Storybook mode | ⚠️ Storybook only, not the main player |
| **Sign/caption support on the real curriculum** | ❌ **Not started** |
| Favourites synced to account | ❌ localStorage only |

---

## 2. The three gaps that actually matter

### Gap 1 — The curriculum player is not accessible (biggest)

`CurriculumPlayerPage` is where learning happens, and it has:
- no voice navigation (blind learners must use a mouse/keyboard to move
  between lessons)
- no sign-language layer (deaf learners get text, which is fine, but the
  fingerspelling support we built only exists in Storybook)
- narration that depends on the broken TTS

**Fix:** lift `useVoiceCommands` into the player, add a sign/caption strip
alongside the existing mode switcher. The mode switcher already proves the
pattern — SIGN becomes a sixth mode next to TEXT/AUDIO/VISUAL/AR/STORY.

### Gap 2 — Signs have no figures

All 65 signs are written descriptions. "Index finger up, thumb out to the
side" is genuinely usable, but it is not what a learner needs to *check
whether their own hand is right*.

We cannot ship photographs or video — no provider in this stack generates
accurate handshapes, and a hallucinated one teaches the **wrong sign**, which
is worse than none. But there is an honest middle option we have not taken:

> **Schematic SVG handshape diagrams.** Each letter encoded as finger states
> (extended / curled / tucked, thumb position), rendered as a simple diagram.
> This is derived from the same standard descriptions we already have, is
> deterministic (no model guessing), and conveys the one thing text cannot:
> the shape. Labelled clearly as a schematic, not a photo.

That is the right next deliverable for the deaf path.

### Gap 3 — Sign language is ASL-only, hardcoded

The problem statement is not US-specific, and this is a Nepali team. Nepali
Sign Language (NSL) is a distinct language — **not** ASL with different words.
Its manual alphabet maps to Devanagari, not the Latin alphabet.

Today `SIGNS` is a flat ASL array with no notion of *which* sign language.

**Fix:** introduce a `SignSystem` dimension (`ASL`, `NSL`, …) and let the
learner pick. Ship ASL populated; ship NSL as a declared, visible
"not yet available" state.

> ⚠️ **We must not machine-translate or invent NSL handshapes.** I have no
> verified NSL source, and a fabricated sign taught to a deaf Nepali child is
> an actively harmful outcome. NSL content needs a real source: the Nepal
> National Federation of the Deaf, or the NSL dictionary published by the
> Nepal Association of the Deaf and Hard of Hearing. The *architecture* should
> be ready today; the *data* must come from people who actually sign it.

---

## 3. Known broken

**Server text-to-speech returns 502 on every new phrase.**

```
POST /generate-speech → 400 from Groq:
  "The model `canopylabs/orpheus-v1-english` requires terms acceptance.
   Please have the org admin accept the terms at
   https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english"
```

This is **an account action, not a code bug.** An org admin must accept the
model terms once in the Groq console. 11 clips generated before this lapsed
are still cached and still play.

Mitigation shipped: the browser's built-in speech is now a real fallback
(it was silently failing), and if no sound is produced at all the UI says so
and offers a retry instead of going mute.

---

## 4. Suggested order of work

| # | Task | Why | Size |
| --- | --- | --- | --- |
| 1 | Accept Groq TTS terms in console | Unblocks all narration, zero code | 2 min |
| 2 | SVG handshape figures for the 26-letter alphabet | Closes the biggest deaf-path gap | M |
| 3 | `SignSystem` dimension (ASL shipped, NSL declared-empty) | Language-agnostic, honest | S |
| 4 | Voice commands inside `CurriculumPlayerPage` | Makes the **real** curriculum blind-navigable | M |
| 5 | SIGN as a sixth mode in the player's mode switcher | Makes the **real** curriculum sign-supported | M |
| 6 | Sync sign favourites to the account | Cross-device | S |
| 7 | Source real NSL data from NFD Nepal | Correctness — needs humans, not code | — |
| 8 | axe/Lighthouse audit + screen-reader pass | Nothing here is verified with real AT | M |

Items 4 and 5 are the ones that turn this from "two accessible side doors"
into "an accessible platform."

---

## 5. Honest limitations

1. **Nothing has been tested with real assistive technology or disabled
   users.** No screen-reader pass, no axe/Lighthouse audit. Everything below
   is built to WCAG 2.1 AA *intent*, which is not the same as verified.
2. **Voice control is Chrome/Edge only** (Web Speech API). Keyboard paths
   exist everywhere as the fallback.
3. **Sign language is text descriptions**, ASL only, 0 figures — §2.
4. **The audio quiz uses its own question bank**, not the teacher's real
   assessments.
5. **Font size and high contrast**: font size is now global; high contrast is
   still only applied in the lesson player and storybook.

---

## 6. One thing to hold onto

The instinct to build separate dashboards was right as a *starting point* —
different learners genuinely need different entry points, and the audio
dashboard could not be a tweak to the visual one.

But the measure of success is not how good the separate dashboards are. It is
whether a blind student and a sighted student can both complete **the same
unit their teacher uploaded**. Right now they cannot. That is the work.

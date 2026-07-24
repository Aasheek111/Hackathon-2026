# Pragya — Final 17 Hours: Product Strategy & Build Plan

**Brutally honest strategy doc. Read section 1, then 16–19, then go build.**

---

## 1. EXECUTIVE RECOMMENDATION

> **Keep the hackathon story on inclusive education. Let universality be the
> architectural proof, shown once, for twenty seconds. Do not rebrand to
> "everyone."**

Your instinct in the brief is **80% right and 20% dangerous.**

**Right:** your engine genuinely is universal. Nothing in the pipeline is
child-specific. A learner profile + adaptive presentation over one canonical
curriculum is exactly the correct architecture, and it already exists.

**Dangerous:** if you *say* "a platform for every learner," judges hear
**"a platform for no one in particular."** A 6-minute pitch wins on emotional
specificity. "We serve everyone" is the single most common way strong hackathon
projects lose to weaker ones with a sharper story.

The resolution — and this is your whole positioning:

> **Universal by design. Adaptive by need.**
> We built it so nobody has to be designed for separately.
> We're demonstrating it where exclusion hurts most.

**The three decisions, up front:**

| Question | Answer |
|---|---|
| Stay child-focused? | **Story: yes. Product: no — say it's universal, prove it in 20s.** |
| Expand to adults/older learners? | **Yes — as one demo persona, not a second pitch.** |
| Demo dementia? | **NO. Do not put it on a slide.** Prepared verbal answer only. |
| Build Basic/Pro tiers? | **No. They don't exist. Stop claiming them; reframe as institutional licensing.** |
| Biggest 17h win? | **A Learner Preferences panel + making the invisible loop visible.** |

---

## 2. WHAT OUR PRODUCT REALLY IS

Strip the marketing and this is what you built:

> **A pipeline that converts one teacher document into a canonical multimodal
> curriculum, plus a thin per-learner presentation layer driven by observed
> engagement.**

That is a **universal adaptive learning engine.** Not a children's app. Not a
disability app. The learner category never appears in the generation pipeline —
only *modality*, *attention*, and *performance*. That's why expanding to adults
costs almost nothing technically, and why it's an honest claim.

### Product capability map (verified against code)

**A = fully working · B = partial · C = prototype · D = planned · E = not implemented**

| # | Capability | Status | Reality check |
|---|---|---|---|
| 1 | Authentication (JWT, 3 roles, teacher approval) | **A** | Solid |
| 2 | Student flows | **A** | Onboarding → classroom → tutorial → progress |
| 3 | Teacher flows | **A** | Classroom/subject/unit/upload/preview/regenerate |
| 4 | Admin | **A** | Users, teacher approval, questions, payments, grade config |
| 5 | Classroom / Subject / Unit | **A** | Full hierarchy |
| 6 | Curriculum model | **A** | Canonical per unit, shared across students |
| 7 | Document upload | **A** | PDF, DOCX, TXT, MD |
| 8 | PDF/DOCX processing | **A** | pypdf + python-docx incl. tables |
| 9 | RAG / embeddings | **A** | FAISS + **local** fastembed (no key, no quota) |
| 10 | AI generation (text) | **A** | Groq only, llama-3.3-70b |
| 11 | Tutorial/curriculum generation | **A** | Full-document coverage w/ gap guard |
| 12 | Visual generation | **A** | Unsplash, safe-search, **prefetched to server** |
| 13 | Audio / TTS | **B** | Groq TTS blocked on terms → browser speech. *Works, but say "narration," not "studio TTS."* |
| 14 | Quiz generation | **A** | Knowledge checks + final assessment |
| 15 | Assessment + scoring | **A** | Server-side, attempt history |
| 16 | Learner profiling | **B** | `preferredMode` + `attentionSpanScore` only |
| 17 | Attention/concentration metrics | **A** | Real OpenCV face/eye/gaze → engagement |
| 18 | Learning preference metrics | **A** | Per-mode engagement from diagnostic |
| 19 | **Adaptive learning** | **B** | **Adapts *presentation*, not *content*. See §9.** |
| 20 | AR | **A** | 4 games; unit-linked one seeded from real MCQs |
| 21 | Gamification | **A** | XP, streaks, badges |
| 22 | Progress tracking | **A** | Per-lesson, resume, marks, report card |
| 23 | Teacher analytics | **A** | Concentration heatmap + marks — *your sleeper feature* |
| 24 | Subscription | **B** | Durations only — **no Basic/Pro tiers exist** |
| 25 | Payment | **A** | eSewa (Nepal) |
| 26 | YouTube → quiz → classroom | **A** | Free transcript API |
| 27 | Background processing (Celery/Redis) | **A** | Real queue, real progress stages |
| 28 | Notifications | **A** | In-app bell |
| 29 | **Accessibility settings** | **E** | **Nothing user-controlled. Biggest gap.** |
| 30 | Age-based adaptation | **E** | `ageGroup` field exists but is dead |
| 31 | Multi-language | **E** | English only |
| 32 | Offline mode | **E** | Not implemented |

### Which parts already serve any age
Everything in rows 1–15, 17–23, 26–28. **None of it assumes a child.** The only
child-coded thing is the admin `gradeLevel` prompt setting — and it's global,
not per-learner.

---

## 3. CHILDREN VS ADULTS VS OLDER LEARNERS

| Category | Supported today? | Cost to add | Verdict |
|---|---|---|---|
| **A. Children, no disability** | ✅ Yes | — | Core demo |
| **B. Children, diverse needs** | ✅ Yes (mode switching, simplified text, AR) | — | **Emotional centre of the pitch** |
| **C. Teens / university** | ✅ Yes, already — upload a lecture PDF | ~0 | **Free credibility. Mention it.** |
| **D. Adults with disabilities** | ⚠️ Partly — modality yes, but **no font/contrast controls** | ~3h (P0 panel) | **Add. This is the P0 build.** |
| **E. Older adults** | ⚠️ Same gap | Same 3h | **Add — same feature, no extra work** |
| **F. Dementia / cognitive impairment** | ❌ No | High risk | **Exclude from pitch. See §4.** |

**The strategic point:** Categories C, D and E cost you **one feature**, not one
product. That is the entire argument for universality — and it's honest.

---

## 4. DEMENTIA — INCLUDE OR NOT?

### Recommendation: **B — mention as future potential, only if asked. Never on a slide. Never demoed.**

I'm going to push back hard here because this is the highest-risk idea in your brief.

**Why not to demo it:**

1. **You have zero evidence.** No clinical validation, no pilot, no expert
   partner. A judge with a health or special-ed background will ask one question
   you cannot answer, and your credibility on *everything else* drops with it.
2. **It invites the attack you've carefully defended against.** Your whole
   ethical position is *"we adapt, we never diagnose."* Saying "dementia" drags
   you onto medical ground and undermines that line — the strongest line you have.
3. **It adds nothing to SDG 4.** Your framing is inclusive *education*.
   Dementia support is care, not schooling. It dilutes the frame.
4. **Cognitive-friendly design needs no medical label.** Large text, short
   sessions, repetition, consistent navigation, step-by-step — these are just
   **good accessible design**, and you'll have them from the P0 panel anyway.
   You get 100% of the benefit with 0% of the risk.
5. **Risk/reward is terrible in a 6-minute pitch.** Best case: a judge nods.
   Worst case: you look like you're overclaiming on a vulnerable population.

**What to say instead — if a judge raises it:**

> "We deliberately don't make medical claims. What we *do* provide is
> cognitive-friendly design — larger text, shorter sessions, consistent
> navigation, repetition, audio support. If a caregiver or an adult-education
> programme found that useful for an older learner, the platform already
> supports it. But we'd want to work with clinicians before ever claiming
> anything beyond educational accessibility."

That answer makes you look **more** credible, not less. It's a strength.

---

## 5. UNIVERSAL LEARNING ENGINE

Your proposed architecture is correct, and **you have already built about 60% of it.**

```
                    UNIVERSAL LEARNING PLATFORM
                              |
                    LEARNER PROFILE ENGINE
                              |
        ┌─────────────────────┼─────────────────────┐
   Accessibility        Learning Style         Performance
   (P0 — TO BUILD)      (✅ exists)            (✅ exists)
        └─────────────────────┼─────────────────────┘
                              |
                      ADAPTIVE ENGINE
                  (✅ presentation-level)
                              |
        ┌────────┬────────┬────────┬────────┐
      Text    Visual    Audio  Interactive   AR
       ✅       ✅        ✅       ✅         ✅
        └────────┴────────┴────────┴────────┘
                              |
                        ASSESSMENT ✅
                              |
                    LEARNING OUTCOME ✅
                              |
                     PROFILE UPDATE ✅
                              ↺
```

**One engine, many profiles — not many products.** A child with ADHD, an adult
with low vision, and a university student cramming a lecture PDF all hit the
*same* pipeline. Only the profile differs. That's the insight worth pitching.

**The honest gap:** the left branch (Accessibility) does not exist. That's your P0.

---

## 6. UNIVERSAL DESIGN FOR LEARNING (UDL) ALIGNMENT

UDL (CAST) is a **much stronger conceptual anchor than "AI-powered inclusive
education,"** because it's an established framework judges may already respect,
and your architecture maps onto it almost perfectly.

| UDL Principle | What you have | Status |
|---|---|---|
| **Multiple means of REPRESENTATION** | Text / Visual / Audio / AR of the same lesson; simplified text at low attention; images on every lesson | ✅ **Strongest pillar** |
| **Multiple means of ENGAGEMENT** | Mode choice, AR game, XP/badges/streaks, personalised recommendations, learner-controlled switching | ✅ Strong |
| **Multiple means of ACTION & EXPRESSION** | MCQ knowledge checks, final assessment, AR fingertip interaction, click, browser-narrated audio | ⚠️ **Weakest — all responses are still multiple-choice.** Be honest about this. |

**Use this in the pitch (one line, slide 2 or 8):**
> "This isn't a bolt-on accessibility layer — it's Universal Design for Learning,
> automated. Multiple means of representation, engagement, and expression,
> generated from one teacher upload."

That sentence makes you sound like you know the field. It is worth more than
three feature bullets.

---

## 7. GENERAL LEARNERS — does serving them weaken the mission?

**No — it strengthens it, provided you say it in the right order.**

- **Wrong order (loses):** "It's for everyone… and also helps disabled learners."
  → sounds like inclusion was an afterthought. Generic. Forgettable.
- **Right order (wins):** "We designed for the learners education usually fails.
  It turns out that makes it better for everyone." → this is the **curb-cut
  effect**, and it's a genuinely compelling narrative arc.

Serving general learners also fixes your **business** story: a product only for
learners with disabilities has a small, grant-dependent buyer. A product that's
better for *the whole classroom*, with special value for the excluded, is one a
school actually buys. Say that out loud in the business slide — judges respect
commercial realism.

**Should the university-student use case be core?** Yes, but as *one sentence*,
not a slide: *"the same engine turns a university lecture PDF into a study
experience — same pipeline, different learner."*

---

## 8. LEARNER PROFILE (conceptual — do not over-build)

| Field | Source | Exists today? | Build now? |
|---|---|---|---|
| Preferred modality | Observed (CV + diagnostic) | ✅ | — |
| Attention span score | Observed (CV) | ✅ | — |
| Per-lesson concentration | Observed | ✅ | — |
| Quiz/assessment performance | Observed | ✅ | — |
| Mode → performance history | Observed | ✅ partial | — |
| **Text size** | **User-set** | ❌ | **P0** |
| **High contrast** | **User-set** | ❌ | **P0** |
| **Always narrate** | **User-set** | ❌ | **P0** |
| **Reduced motion** | **User-set** | ❌ | **P0** |
| **Simplified layout** | **User-set** | ❌ | **P0** |
| Age group | User-set | ❌ | **P2 — see §9** |
| Language | User-set | ❌ | Don't build |
| Education level | Admin (global grade) | ⚠️ global only | Don't build |

**Design rule:** user-set preferences **always override** inferred ones. A system
that won't let you turn off its own guess is not accessible — it's paternalistic.
Make sure your P0 panel wins over `isSimplified`.

### On age (Part 9 of your brief)
**Your instinct is right — don't lead with age.** "All older people need simple
content" is exactly the stereotype inclusive design exists to kill. But don't
discard age either: it's a reasonable *default*, never a *rule*.

**Recommendation:** ask **"What helps you learn best?"** with concrete toggles —
not "how old are you?". If you have spare time, add an optional age group that
only sets *initial defaults* the learner can immediately change. That's P2, and
honestly, skip it.

---

## 9. ADAPTIVE ENGINE — the honesty section

**Read this before you write a single pitch line.** Here is precisely what
adapts today:

| Dimension | Adapts? | Mechanism |
|---|---|---|
| Modality (text/audio/visual/AR) | ✅ **Yes** | CV engagement → live switch + persisted default |
| Text size | ⚠️ Binary | `attentionSpanScore < 50` → larger |
| Which questions | ✅ Yes | AR reuses unit MCQs; assessment per curriculum |
| Lesson sequencing / resume | ✅ Yes | `currentLessonOrder` |
| Recommendations | ✅ Yes | Weakest subject / next unit / best mode |
| **Vocabulary & complexity** | ❌ **No — global admin grade level, not per learner** |
| **Repetition frequency** | ❌ No |
| **Pace / session length** | ❌ No |
| **Number of concepts per section** | ❌ No |
| **Question difficulty per learner** | ❌ No |

**So the accurate claim is:**
> "We adapt **how** the lesson is presented, and we're moving toward adapting
> **what** is presented."

**Do NOT claim** the system rewrites content per learner. It doesn't, and
per-learner regeneration would be **token suicide** on a free tier — you'd blow
your daily Groq budget mid-demo. Presentation-level adaptation is the *correct
engineering decision* for cost, latency and reliability. Frame it as a
deliberate choice, because it is one.

---

## 10. ACCESSIBILITY VS ADAPTABILITY

This remains your sharpest idea. Keep it exactly as-is:

- **Accessibility** = can the learner *reach* the content? (Captions, TTS, screen
  readers.) *Largely solved by others — say so, it buys credibility.*
- **Adaptability** = did the content *reach* the learner? (Does the experience
  change when it isn't working?) *Almost nobody automates this.*

After the P0 build you'll be able to say something you currently **cannot**:
> "We do both. Accessibility controls the learner sets, and adaptation the
> system earns."

---

## 11. COMPETITIVE DIFFERENTIATION

| Player | Genuinely better than you at | Your honest edge |
|---|---|---|
| Coursera / Udemy / Khan | Content volume, production quality, scale | They don't transform *your teacher's* material; identical path for every learner |
| Google Classroom / Moodle | Distribution, integrations, maturity | They distribute files; they don't make one file into four modalities |
| Screen readers / TTS / captions | Deep, mature assistive tech | They make content reachable, not adaptive |
| Understood / Learning Ally | Domain authority, curated resources | They're libraries; you transform a teacher's own curriculum |
| ChatGPT / Gemini | Raw reasoning | No syllabus structure, no engagement signal, no teacher visibility |

**Never attack them.** "They solved the reach problem well — we start where that
stops" makes you sound senior. Attacking makes you sound junior.

---

## 12. BUSINESS MODEL

### First: stop claiming Basic/Pro. It does not exist.
`SubscriptionPlan` is `MONTH_1/3/6` — durations. There is no feature gating
anywhere in the code. If a judge asks "what's in Pro?" you have no answer.
**Two options:**
- **(Recommended)** Reframe honestly as *duration-based access, moving to
  institutional licensing.* Zero build time.
- Build real tiers — **~2h, near-zero demo value.** Don't. Not in 17 hours.

### Recommended model: **B2B2C, institution-first**

| Model | Verdict |
|---|---|
| **B2B (schools/colleges)** | ✅ **Primary.** Buyer has budget + a compliance/inclusion mandate |
| **B2G / NGO** | ✅ **Strong second** — district-scale inclusive-education programmes |
| B2C (students) | ⚠️ Keep eSewa as proof payments work; weak primary in Nepal |
| Pure free/open | ❌ No sustainability story |

**Say this:** *"Schools and programmes subscribe per classroom. A student never
pays to reach their own classroom's material."* Clean, ethical, memorable.

---

## 13. ECONOMIC SUSTAINABILITY

Don't say "affordable" — **prove** it. You have unusually strong evidence:

- **Text:** Groq free tier (1,000 req/day)
- **Embeddings:** run **locally** — no key, no quota, no per-chunk cost
- **Images:** Unsplash, prefetched once, served locally
- **Concentration:** local OpenCV — no external AI
- **Generation:** **once per unit, cached, shared by the whole class**

> "Marginal cost per additional *student* is effectively zero — content is
> generated once per unit and shared. That's what makes per-classroom pricing
> viable in a Nepali school, and it's why we removed every paid dependency."

That is a genuinely differentiated answer, and it came from real engineering
decisions you made this week. Use it.

---

## 14 & 15. HACKATHON POSITIONING vs PRODUCT POSITIONING

**Your two-layer instinct is correct. Adopt it exactly:**

| Layer | Statement |
|---|---|
| **Hackathon (what you pitch)** | *Educational content isn't equally usable by every learner.* Inclusive education, SDG 4. **Emotional, specific, judge-facing.** |
| **Product (what you built)** | *Every learner should get a learning experience adapted to how they learn best.* Universal adaptive learning. **Architectural, investor-facing.** |

**The bridge sentence — say this on stage:**
> "We built a universal engine. We're pointing it at the learners education
> fails first."

Of your three candidate taglines, the winner is:
**"An adaptive inclusive learning platform that can serve every learner."**
— it leads with inclusion (emotional) and closes with universality (scalable).
Never lead with "for everyone."

---

## 16. P0 / P1 / P2 PRIORITIES

Scoring: **Impact** = demo/pitch value · **Effort** = hours · **USP** = strengthens core claim

| # | Feature | Impact | Effort | USP | Priority |
|---|---|---|---|---|---|
| 1 | **Learner Preferences panel** (text size, contrast, narrate, reduced motion) | 🔥🔥🔥🔥🔥 | 3–4h | 🔥🔥🔥🔥🔥 | **P0** |
| 2 | **"Why you're seeing this" adaptation banner** | 🔥🔥🔥🔥🔥 | 1h | 🔥🔥🔥🔥🔥 | **P0** |
| 3 | **Seeded, rehearsed demo path + fallback** | 🔥🔥🔥🔥🔥 | 2h | 🔥🔥 | **P0** |
| 4 | **Deck update + 3 full rehearsals** | 🔥🔥🔥🔥🔥 | 2h | 🔥🔥🔥 | **P0** |
| 5 | Second persona (adult/older learner) preloaded | 🔥🔥🔥🔥 | 1h | 🔥🔥🔥🔥 | **P1** |
| 6 | Keyboard navigation + visible focus states | 🔥🔥🔥 | 1.5h | 🔥🔥🔥 | **P1** |
| 7 | Screenshot refresh for deck | 🔥🔥🔥 | 0.5h | 🔥🔥 | **P1** |
| 8 | Optional age-group defaults | 🔥🔥 | 1h | 🔥🔥 | **P2** |
| 9 | Real Basic/Pro tiers | 🔥 | 2h | 🔥 | **P2** |
| 10 | Nepali UI strings | 🔥🔥 | 3h+ | 🔥🔥 | **P2** |

### Why #1 and #2 are the whole game

**#1 Learner Preferences panel** is the single highest-leverage thing you can
build. It:
- closes your **only** structural gap (row 29 of the audit)
- makes **UDL alignment** real instead of rhetorical
- serves adults, older learners and low-vision users with **one feature and zero
  new architecture** — which *proves* your universality thesis on stage
- gives you a live demo beat: *"and the learner is always in control"*
- is low-risk (mostly CSS + a small prefs model)

**#2 Adaptation banner** fixes your biggest *demo* weakness: **your USP is
currently invisible.** The CV loop is your most impressive asset and a judge
cannot see it happening. One line in the player —
*"Visual mode — you focused best here"* / *"Text enlarged for easier reading"* —
converts an invisible algorithm into a visible product. One hour. Enormous payoff.

---

## 17. WHAT NOT TO BUILD

**Do not touch these. Each one is a trap.**

| Don't build | Why |
|---|---|
| ❌ Dementia mode | Unsafe claim, no evidence, undermines your ethics line (§4) |
| ❌ Per-learner content regeneration | Blows Groq's daily token budget; risks failing *during* the demo |
| ❌ More AR games | You have 4; unit-linked one already works. Zero marginal pitch value |
| ❌ Multi-language content | Big job, half-done looks worse than not started |
| ❌ Mobile app | Web is responsive. Nothing to gain |
| ❌ New AI provider / model swaps | You just stabilised this. **Do not destabilise it the night before** |
| ❌ Real-time collaboration, chat, forums | Irrelevant to the USP |
| ❌ Refactors "while we're here" | Highest risk of a broken demo. Freeze the code you aren't shipping |
| ❌ Offline mode | Sounds great, is weeks of work |

**Hard rule: code freeze at T-3h.** Last 3 hours are rehearsal only. Every
hackathon team that breaks this rule regrets it.

---

## 18. THE 12-HOUR PLAN (if you're tired / things slip)

| Block | Hours | Task |
|---|---|---|
| 1 | 0–1 | Set up: prefs model + API endpoint (`GET/PATCH /me/preferences`) |
| 2 | 1–4 | **Learner Preferences panel** — text size (3 steps), high contrast, always-narrate, reduced motion. Apply in player. User-set beats inferred |
| 3 | 4–5 | **Adaptation banner** in the player |
| 4 | 5–6 | Seed demo data: 1 child persona + 1 older-adult persona, both preloaded |
| 5 | 6–7 | **Full run-through.** Fix only what breaks |
| 6 | 7–8 | Refresh 3 screenshots + update deck slides 3, 5, 6, 8 |
| 7 | 8–9 | Q&A drill — §24, out loud, especially dementia + "what actually adapts" |
| 8 | 9–10 | **Rehearsal 1** — full 6 min, timed |
| 9 | 10–11 | **Rehearsal 2** + fallback prep (recorded video + screenshots if wifi dies) |
| 10 | 11–12 | **Rehearsal 3.** Sleep. Seriously |

## 19. THE 17-HOUR PLAN (recommended)

| Block | Hours | Task |
|---|---|---|
| 1 | 0–1 | Prefs data model + API |
| 2 | 1–4 | **Learner Preferences panel** (P0 #1) |
| 3 | 4–5 | **Adaptation banner** (P0 #2) |
| 4 | 5–6 | **Older-adult persona** — preloaded, large text, narrate-on (P1 #5) |
| 5 | 6–7.5 | **Keyboard nav + visible focus states** (P1 #6) — real a11y credibility |
| 6 | 7.5–8.5 | Seed + verify the entire demo path end-to-end |
| 7 | 8.5–9.5 | **Screenshot refresh** — new prefs panel + banner + persona |
| 8 | 9.5–11 | **Deck rewrite:** slide 2 (UDL), slide 5 (loop + control), slide 6 (two personas), slide 8 (universal by design) |
| 9 | 11–12 | Q&A drill out loud (§24) |
| 10 | 12–13 | **Rehearsal 1**, timed. Cut anything over 6:30 |
| 11 | 13–14 | Fallback kit: screen-recorded demo, offline screenshots, phone hotspot |
| 12 | 14–15 | **Rehearsal 2** with someone playing hostile judge |
| 13 | 15–16 | **CODE FREEZE.** Rehearsal 3. Final deck export |
| 14 | 16–17 | Sleep / buffer. Do **not** add features here |

---

## 20. FINAL USP

> **Existing platforms make content accessible.
> We make the learning experience adapt to the learner.**
>
> **Universal by design. Adaptive by need.**

---

## 21. FINAL ONE-SENTENCE PITCH

> **Pragya turns a teacher's existing curriculum into four ways to learn the same
> lesson — then watches what actually works for each learner and changes how it
> teaches.**

---

## 22. FINAL 30-SECOND PITCH

> Education is available, but it isn't always learnable. A child who learns by
> seeing gets a wall of text. An older learner gets type too small to read.
> The content was "available" — nobody learned.
>
> Pragya takes the curriculum a teacher already has and turns it into four ways
> to learn the same lesson: text, audio, visual, and an AR game. Then it watches
> whether it's working — if attention drops, it changes how it teaches, and the
> teacher sees exactly which lesson lost the class.
>
> One engine. Any learner. **Universal by design, adaptive by need.**

---

## 23. FINAL 2-MINUTE PITCH

> UNESCO says learners with disabilities are two and a half times more likely to
> never attend school. But the ones who *do* reach a classroom are often still
> excluded — just more quietly. The material was there. They still didn't learn.
>
> Our insight is that **accessibility is not the same as adaptability.** Captions,
> transcripts, screen readers — that industry solved whether a learner can
> *reach* content, and solved it well. We're not rebuilding it. But every learner
> still walks the same path, in the same format. The learner adapts to the platform.
>
> Pragya flips that. A teacher uploads the PDF they already teach from. We read
> the whole document and produce every lesson in four modalities at once — text,
> narrated audio, real images, and an AR game built from that unit's own
> questions. The learner picks, or we pick for them.
>
> Then the part nobody automates: we observe. Our own computer-vision service
> reads engagement — not identity — and if attention drops during assessment, the
> app switches modality mid-session, on its own. That finding carries into their
> next lesson. And the teacher gets a concentration heatmap showing exactly which
> lesson lost which student, the same day — not from exam results at end of term.
>
> Crucially, the learner is always in control: text size, contrast, narration,
> reduced motion. That's Universal Design for Learning, automated — and it's why
> the same engine serves a child with ADHD, an adult with low vision, and a
> university student cramming a lecture PDF, without three separate products.
>
> We never diagnose. Low attention tells us to change how *we* teach — never what
> is wrong with the child.
>
> Text runs on Groq's free tier, embeddings run locally, images are cached on our
> own server, and content is generated once per unit and shared by the whole
> class — so the marginal cost of another student is effectively zero. That's what
> makes per-classroom pricing realistic for a Nepali school. eSewa is already
> integrated.
>
> **Universal by design. Adaptive by need. Don't make every learner adapt to
> education — make education adapt to every learner.**

---

## 24. JUDGE Q&A — the hard ones

**"Isn't this too broad? Who is it actually for?"**
> We built a universal engine deliberately — but we're pointing it at learners
> education fails first. The same feature that helps a child with attention
> difficulties helps an older learner and a student on a phone. That's the
> curb-cut effect: design for the excluded, everyone benefits.

**"What *actually* adapts? Be specific."**
> Three things today: which modality you get, how dense the text is, and which
> questions you see — all driven by observed engagement, not a form. What does
> *not* adapt yet is the vocabulary of the content itself; that's a deliberate
> cost decision, since regenerating per learner would be expensive and slow. We
> adapt presentation now and we're honest that content-level adaptation is next.

**"Do you support dementia / cognitive decline?"**
> We make no medical claims. We provide cognitive-friendly design — large text,
> short sessions, consistent navigation, repetition, audio. If an adult-education
> programme found that useful, the platform supports it today. But we'd want
> clinical partners before claiming anything beyond educational accessibility.

**"Are you diagnosing disabilities?"**
> No — deliberately. We never screen, label or diagnose. Low attention is a
> signal about *our* teaching, not a judgement about the learner.

**"What if your CV inference is wrong?"**
> Two safeguards. It self-corrects, because engagement is measured continuously.
> And the learner can override it at any moment — the mode buttons and the
> accessibility controls are always visible. A system you can't overrule isn't
> accessible.

**"Why not just use Coursera / Khan Academy?"**
> They're libraries and they're good ones. They don't transform *your teacher's*
> material, and their path is identical for every learner. We're a layer on top
> of what a school already owns.

**"What's in your Pro plan?"**
> Right now access is duration-based, and we're honest that feature tiering isn't
> built. The model we're heading for is institutional — schools license per
> classroom, students never pay for their own classroom's material.

**"How is this affordable?"**
> Because we engineered the paid dependencies out. Text is Groq's free tier,
> embeddings run locally on our server, images are cached locally, and the
> concentration analysis is local OpenCV. Content is generated once per unit and
> shared across the class, so each extra student costs essentially nothing.

**"Biggest limitation?"**
> No classroom pilot. We can prove the system works; we can't yet prove it
> improves outcomes. Measuring that is the next step, and we'd want a school
> partner to do it properly.

---

## THE THREE THINGS TO REMEMBER

1. **Universal by design, adaptive by need** — one engine, many profiles, no
   separate products.
2. **Accessibility ≠ adaptability** — others solved reach; you're automating
   whether it *worked*.
3. **Build only two things:** the preferences panel and the adaptation banner.
   Then rehearse until it's boring.

**Freeze the code at T-3h. You win on story and reliability, not on one more feature.**

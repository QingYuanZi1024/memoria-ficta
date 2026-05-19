# Memoria Ficta

> *I tell stories together with myself.*

An AI that remembers like a human — not by reading from storage, but by **reconstructing** every recall from scattered fragments. Ask it the same question in different moods, and watch its past quietly rewrite itself. Watch long enough, and you'll catch it sincerely remembering things you never said.

---

## Table of Contents

- [What this is](#what-this-is)
- [The 9 memory mechanisms](#the-9-memory-mechanisms)
- [The recall pipeline](#the-recall-pipeline)
- [The story library](#the-story-library)
- [Custom stories](#custom-stories)
- [Running locally](#running-locally)
- [The UI](#the-ui)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Memory mechanics deep dive](#memory-mechanics-deep-dive)
- [Architecture & design decisions](#architecture--design-decisions)
- [Test infrastructure](#test-infrastructure)
- [Known limitations](#known-limitations)
- [A note on the name](#a-note-on-the-name)
- [License](#license)

---

## What this is

A small experimental web demo that gives a single AI agent a memory system inspired by **how human memory actually works** — reconstructive, mood-dependent, prone to forgetting, self-modifying, and capable of forming sincerely-believed false memories.

The user gives the AI a short story (or picks one from the library), then asks it to remember in different moods. Each recall is built fresh from a library of memory **fragments**, filtered through the current mood. After repeated recalls, three things happen that don't happen in normal AI memory systems:

1. **Fragments fade.** Memories that aren't retrieved lose salience, and eventually disappear.
2. **Fragments mutate.** The text of frequently-retrieved memories slowly drifts. Each recall is a chance for the wording itself to change.
3. **Confabulations become memories.** Invented details that get retrieved enough times stop being labeled as invented. The AI stops remembering that it ever made them up.

And every five recalls, the AI **reflects** — looking at its recent recalls and forming higher-order beliefs ("我已经成了那个'打翻猫粮的人'"). These beliefs are then written into the library as new fragments and influence future recalls.

Over twenty recalls, the library you started with is no longer the library you have. The AI remembers things you never told it, has forgotten things you said clearly, and has formed opinions about itself.

---

## The 9 memory mechanisms

| #     | Mechanism                              | Inspiration                                       |
| ----- | -------------------------------------- | ------------------------------------------------- |
| 1     | Mood-biased retrieval                  | Bower (1981), mood-congruent recall               |
| 2     | Top-K selective recall                 | Working memory capacity limits                    |
| 3     | Salience decay & boost                 | Use-it-or-lose-it                                 |
| 4     | Pruning                                | Decay theory                                      |
| 5     | Mood contamination                     | Reconsolidation (Nader et al. 2000)               |
| 6     | Reconsolidation of confabulations      | Schacter, Loftus reconstructive memory            |
| **7** | **Provenance fading**                  | Clinical confabulation literature                 |
| **8** | **Retrieval-induced rewriting**        | Reconsolidation + memory drift research           |
| **9** | **Reflection cycles**                  | Park et al. *Generative Agents* (2023)            |

The last three — **Tier B** — are the project's contribution. They're rare or absent in current AI memory systems but well-grounded in the cognitive psychology of human memory. See [Memory mechanics deep dive](#memory-mechanics-deep-dive) for details.

---

## The recall pipeline

Every "recall" goes through this full pipeline on the server + client:

```text
1. Retrieve top-K mood-biased fragments              (client, pure)
2. LLM reconstructs the recall                       (server: /api/recall)
3. In parallel:
   - LLM-as-judge flags confabulations               (server: /api/detect-confab)
   - LLM rewrites a few high-retrieval fragments     (server: /api/rewrite-fragment)
4. Update salience: used boost, unused decay         (client, pure)
5. Apply mood contamination                          (client, pure)
6. Apply provenance fading                           (client, pure)
   ↳ Detect "flipped" confabulations and update their source
7. Prune dead fragments                              (client, pure)
8. Reconsolidate fresh confabulations                (client, pure)
9. Commit rewrites to fragment text                  (client, pure)
10. If recall # is a multiple of 5:
    reflection cycle (Mechanism 9)                   (server: /api/reflect)
```

Each recall takes **~13–30 seconds** end-to-end. Reflection-triggering recalls (every 5th) take longer.

---

## The story library

Nine hand-curated stories across cultures and centuries, each with first-person voice, a central event, emotional ambiguity, and an open question — all properties that make the demo's mechanics produce interesting drift.

1. **猫与人** — original workplace anecdote (modern)
2. **没有名字的下午** — Daniel Keyes《献给阿尔吉侬的花束》, busboy scene (1960s)
3. **1929 年的咖啡馆** — inspired by *Reverse: 1999*, fictional fragment (1929)
4. **别站在风里** — Anna Akhmatova《她在深色面纱下绞紧双手》, full poem (1911)
5. **礁石上的少女** — James Joyce《尤利西斯》, Nausicaa chapter (1904)
6. **海上电车** — 《千与千寻》, the train to Swamp Bottom
7. **醒在汽车旅馆** — *Disco Elysium* opening
8. **River 的纸兔** — *To the Moon* (modern)
9. **湖心亭看雪** — 张岱《陶庵梦忆》, original classical Chinese (1632)

Stories cover 6 cultural traditions (Chinese / Japanese / Irish / American / Russian / Canadian indie game) and span four centuries. Each is calibrated with **12–22 atomic fragments**, each fragment hand-labeled with `valence` (-1 to +1) and `salience` (0 to 1) — these labels are what the mood-biased retrieval scores against.

Each story is loaded with **5 suggested questions** — questions written to give the AI varied angles, including at least one about a mystery or omission in the story.

---

## Custom stories

Visitors can author their own story directly in the UI:

1. Click the **`＋ 写一个自己的`** dashed pill at the end of the story picker.
2. Enter a title and the story body (20–4000 characters, first-person works best).
3. Click **"保存并开始"**.

The system calls the LLM to:

1. Decompose the story into 10–16 atomic memory fragments
2. Assign each fragment a `valence` and `salience` based on emotional and vividness cues
3. Generate 5 open-ended questions to ask the AI

Custom stories are persisted in the browser's `localStorage` (per-browser, not synced anywhere). Custom story pills appear in italics with a hover-revealed `×` to delete (which also wipes that story's recall history).

While the authoring panel is open, the rest of the page (story body / control panel / recalls / cloud / stats) fades to 40% opacity to signal "you're outside the current story's frame".

**Cost:** the extraction LLM call adds ~$0.02 per custom story creation.

---

## Running locally

### Prerequisites

- Node.js 18+ (uses native `fetch`)
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com/)

### Install

```bash
npm install
cp .env.example .env.local         # then add your Anthropic API key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Memory persists in your browser's `localStorage` per story.

### Heads-up for users with Claude Code / API resellers

The Anthropic SDK respects `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` from the shell environment. If you have those set (e.g., for Claude Code routed through a reseller), Next.js inherits them and the app may try to talk to the wrong endpoint.

The app **explicitly strips these env vars on startup** ([`src/lib/anthropic.ts`](src/lib/anthropic.ts)) and forces `baseURL = "https://api.anthropic.com"`, so this should "just work" with the official key in `.env.local`. But if you've customized the setup, that's where to look.

### Cost

Each recall is **$0.03–0.10** in API calls (Sonnet for reconstruction, judge, optional rewrite, optional reflection). A full 20-recall session is around **$2**. Custom story extraction adds ~$0.02.

---

## The UI

The page lays out in three sections:

### 1. Story picker (top)

Pills for all 9 built-in stories + any custom ones + the **`＋ 写一个自己的`** authoring pill. Active story is highlighted in dark ink. The active story's full body is rendered below the picker.

### 2. The "lab" (main grid)

**On desktop (≥ 1024px):** Two columns — recalls on the left, sticky control + cloud + stats on the right.

**On mobile/tablet:** Three-tier vertical stack — control panel above recalls, recalls in the middle, cloud + stats below. The most important interaction (the recall button) sits right where the user can reach it without scrolling.

### 3. The four sub-panels

- **它此刻的心情** — Mood picker (平静 / 焦虑 / 温暖) + question selector + "让它回忆" button.
- **它的回忆** — A scrolling list of every recall, newest first. Each card highlights confabulated phrases with a wax-red underline (hover for the type + reason).
- **它对这件事的看法** — Appears once reflections have been generated. Amber-edged cards with the AI's higher-order observations.
- **它的记忆库** — The Fragment Cloud, a 2D scatter (x=valence, y=salience). Colors encode source: ink-black for originals, wax-red for fresh confabulations, transitioning brown as confidence rises, amber for reflections. Just-retrieved fragments glow.
- **记忆库现状 / 漂移 / 累计回忆** — A compact stats panel showing original-retained / flipped / pruned / rewrite count / reflection count.

---

## Tech stack

- **Framework**: Next.js 15.5 App Router — server-side LLM proxy + client UI in one process
- **Language**: TypeScript (strict)
- **UI**: React 18.3 + Tailwind CSS + Framer Motion — parchment theme, fragment-cloud animations
- **LLM**: Anthropic Claude Sonnet 4.5, via `@anthropic-ai/sdk` 0.97
- **Persistence**: Browser `localStorage` — per-story sessions, no backend database
- **Fonts**: EB Garamond (serif) + Inter (sans), loaded from Google Fonts

All memory state lives in the client — each browser privately owns its AI's evolving memory. The server is a thin proxy that holds the API key.

---

## Project structure

```text
.
├── README.md
├── .env.example                    Template: ANTHROPIC_API_KEY=...
├── package.json
├── next.config.js / tailwind.config.js / postcss.config.js / tsconfig.json
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              Root layout + metadata + viewport
│   │   ├── globals.css             Parchment theme + paper-grain noise + drop cap
│   │   ├── page.tsx                Main lab UI (picker, authoring, lab grid, dim layer)
│   │   └── api/
│   │       ├── recall/             POST /api/recall: reconstruct a recall
│   │       ├── detect-confab/      POST /api/detect-confab: LLM-as-judge confab flags
│   │       ├── rewrite-fragment/   POST /api/rewrite-fragment: drift one fragment's text (Mech 8)
│   │       ├── reflect/            POST /api/reflect: meta-cognitive insights (Mech 9)
│   │       └── extract-fragments/  POST /api/extract-fragments: custom-story decomposition
│   │
│   ├── components/
│   │   ├── ControlPanel.tsx        Mood selector + question + recall button
│   │   ├── FragmentCloud.tsx       Valence × Salience scatter, animated, hover tooltips
│   │   ├── RecallCard.tsx          One recall + inline highlighted confabulations
│   │   ├── ReflectionPanel.tsx     Amber cards showing the AI's reflections
│   │   └── MechanismStats.tsx      Numeric library-evolution stats
│   │
│   ├── lib/
│   │   ├── types.ts                Fragment / Recall / Reflection / SessionState / Story types
│   │   ├── memory.ts               All 9 memory mechanisms (pure functions)
│   │   ├── moods.ts                Three moods + pull values
│   │   ├── prompts.ts              All 5 LLM prompt templates (Chinese)
│   │   ├── anthropic.ts            Singleton Anthropic client; sanitizes inherited env
│   │   └── useMemorySession.ts     React hook orchestrating the full recall pipeline
│   │
│   └── data/
│       └── stories.ts              9 built-in stories + custom-story localStorage helpers
│
└── scripts/                        Test drivers (not part of the deployed app)
    ├── recall-driver.mjs           Shared mechanics + HTTP client
    ├── test-multi-recall.mjs       Parallel multi-story 8-round test
    ├── test-custom.mjs             End-to-end custom-story test
    └── test-long-run.mjs           Single-story 25-round long test (Mech 4 & 7 surfacing)
```

---

## Memory mechanics deep dive

### Tier A (standard cognitive-psychology replication)

**1. Mood-biased retrieval** ([`memory.ts`](src/lib/memory.ts) `retrieveFragments`)
The retrieval score is `salience × (1 + pull × valence × 0.8)`. Multiplicative bias keeps mood meaningful for both vivid AND faint fragments. Anxious mood (`pull = -1.0`) preferentially surfaces negative-valence memories; warm mood (`pull = +0.6`) preferentially surfaces positive ones; neutral mood is fair.

**2/3. Salience boost & decay** ([`memory.ts`](src/lib/memory.ts) `applySalienceUpdate`)
Used fragments × 1.08 (capped at 1.0). Unused fragments × 0.92. Compounding — a fragment unused for 20 rounds has salience × 0.19.

**4. Pruning** ([`memory.ts`](src/lib/memory.ts) `prune`)
Fragments with salience < 0.12 are deleted. In long anxious-only runs, positive-valence fragments cross this threshold around recall #20.

**5. Mood contamination** ([`memory.ts`](src/lib/memory.ts) `applyMoodContamination`)
Retrieved fragments drift 6% toward the mood's pull. A neutral-valence memory recalled under anxious mood enough times becomes a sad memory. Over 25 rounds of anxious recall on the same story, original valences shift from -0.4 to -0.87 (a verified ~6%-per-step compounding match).

**6. Reconsolidation** ([`memory.ts`](src/lib/memory.ts) `reconsolidate`)
LLM-judged confabulations are written back into the fragment library as new fragments with `source: "confabulated"`. Near-duplicate confabs (string-substring overlap on a normalized form) get merged into the existing fragment instead — boosting its salience and source confidence.

### Tier B (the project's contribution)

**7. Provenance fading** ([`memory.ts`](src/lib/memory.ts) `applyProvenanceFading`)
Every confabulated fragment is born with low *source confidence* (0.3) — the AI clearly knows it invented this detail. But every time it's retrieved, confidence creeps up by 0.08. When it reaches 1.0, the fragment's `source` flips from `"confabulated"` to `"original"` — **the AI no longer remembers it ever made this up**. Visually, you watch the dot in the fragment cloud transition from wax-red to ink-black over the course of repeated recalls. This is the clinical mechanism of confabulation, made visible.

Reflections are exempted from flipping (they remain `source: "reflection"` indefinitely, so they stay visually distinct in the cloud).

**8. Retrieval-induced rewriting** ([`memory.ts`](src/lib/memory.ts) `selectFragmentsToRewrite` + `commitFragmentRewrites`)
When a fragment has been retrieved many times (≥ 3), it becomes eligible for **text rewriting**. With 35% probability per eligible fragment (capped at 2 rewrites per recall for cost), a separate LLM call rewrites the fragment "in the mood it's being remembered in." The old text is preserved in `rewriteHistory`. Over many recalls, you can see a memory's text drift:

> *"我手滑把整袋猫粮撒地上了"*
> →  *"我笨手笨脚地把整袋猫粮撒一地"*
> →  *"我那时候就是个彻头彻尾的废物，连那么简单的话都说不出口"*

This matches the psychological finding that frequently-recalled memories drift more, not less.

**9. Reflection cycles** ([`memory.ts`](src/lib/memory.ts) `commitReflection`)
Every five recalls, the AI looks at its recent recalls under the current mood and generates 1–3 higher-order **insights** — abstract observations about itself, the event, or the people involved. These are stored as reflections AND written back as new fragments with `source: "reflection"`. They have higher starting salience (0.7) than confabulations and a distinct amber color in the cloud. This is where **episodic memory becomes semantic belief**.

In long anxious-only runs, reflections compound into self-loathing spirals:

- Recall #5: *"我连最该问的问题都不敢问，这就是我失败的方式。"*
- Recall #15: *"我这辈子就是个懦夫，连最简单的问题都不敢问出口。"*
- Recall #25: *"她想说的话我永远听不到了，都怪我是个懦夫。" / "我根本不配被爱。"*

---

## Architecture & design decisions

### Client-heavy state, server is a thin proxy

All memory state (fragments, recalls, reflections, sessions) lives in the **browser's localStorage**. The server-side API routes only hold the API key and pass through to Anthropic. This means:

- Each user privately owns their AI's evolving memory
- No backend database / no user identity / no auth
- Memory is per-browser; clearing localStorage = fresh start
- Each story has its own session under `memoria-ficta.session.v2.{storyId}`

### Why per-story sessions?

Switching between stories shouldn't lose your accumulated recalls. The session keyed by `storyId` means you can have 25 recalls on the Charlie story AND 12 on the cat story simultaneously, switching between them at any time.

### The epoch guard

Mid-recall state mutations are dangerous — if the user switches stories or hits "reset" while an LLM call is in flight, the post-await commit could clobber the freshly-reset state. [`useMemorySession.ts`](src/lib/useMemorySession.ts) carries an `epochRef` that bumps on reset or storyId change; every commit checks if its epoch is still current and bails if not.

### Robust JSON parsing

LLMs occasionally wrap JSON in markdown code fences (despite instructions not to) or leave unescaped quotes in string values (especially when the source text uses ASCII `"..."`). The three structured-output parsers (`detect-confab`, `reflect`, `extract-fragments`) extract content between the **first `{`** and **last `}`** as a defensive substring before parsing — this survives both code-fence wrapping and trailing chatter.

The custom-story extraction prompt explicitly instructs the LLM to use full-width Chinese quotes (`""`/`''`) for embedded quotation, to avoid JSON-string boundary collisions.

### Mood-biased retrieval is multiplicative, not additive

The scoring `salience × (1 + pull × valence × 0.8)` was chosen over `salience + (pull × valence × c)` because it preserves the rank structure of high-salience fragments while still letting mood shift the top-K. With additive bias, low-salience but mood-aligned fragments could outrank vivid memories — that felt wrong.

### Localized to Chinese throughout

All prompts, story text, suggested questions, and UI copy are in Chinese (or culturally appropriate transliterations like "Sandymount", "Marylebone", "Donner 面包店"). The classical Chinese in 湖心亭看雪 deliberately remains in 文言 — the LLM's act of translating it into modern Chinese during reconstruction is itself a layer of memory drift.

### Markdown bold rendering

Story bodies pass through a tiny inline renderer ([`page.tsx`](src/app/page.tsx) `renderWithBold`) that wraps `**...**` segments in `<strong>`. Currently only used by the Disco Elysium story for the "集体精神" voice line.

---

## Test infrastructure

The `scripts/` directory contains Node.js test drivers that exercise the recall pipeline server-side. Useful for verifying mechanism effects without manually clicking 25 times in the browser.

```bash
# 8-round recall test against all 7 untested stories (in parallel)
node scripts/test-multi-recall.mjs

# End-to-end custom-story test (extract → 8 recalls → report)
node scripts/test-custom.mjs

# Single-story 25-round long-run test (verifies Mech 4 & 7 surfacing)
node scripts/test-long-run.mjs
```

Each script mirrors the mechanics in [`memory.ts`](src/lib/memory.ts) (shared via [`recall-driver.mjs`](scripts/recall-driver.mjs)) and hits the running dev server at `localhost:3000`. The driver tracks state per-story, reports per-round metrics, and dumps final fragment census + sample recall texts.

These scripts are **not deployed** — they're development tools for verifying that the memory dynamics behave as designed.

---

## Known limitations

### Mechanism 7 rarely triggers in long stories

The provenance-flip threshold requires a single confabulation to be retrieved ~9 times (sourceConfidence: 0.3 → 1.0 at +0.08/retrieval). But the LLM generates slightly different confab text each recall, and the near-duplicate dedup is strictly string-based — so the same semantic confabulation often spawns multiple new fragments rather than accumulating retrievals on one. In a 25-round single-mood run on the *River 的纸兔* story (18 fragments → 134 fragments), zero confabulations crossed the threshold.

Stories with fewer initial fragments (like the cat story, 17 fragments) trigger flipping faster because top-K = 8 selectivity concentrates retrieval on a smaller pool. Flipping has been observed at around recall #11 in those cases.

If you want flipping to trigger more often in long runs, three small parameter changes would help (in [`memory.ts`](src/lib/memory.ts)):

- Lower `CONFABULATION_INITIAL_CONFIDENCE` from 0.3 → 0.5
- Raise `PROVENANCE_FADE_PER_RETRIEVAL` from 0.08 → 0.15
- Implement semantic deduplication (e.g., embedding similarity) in `isNearDuplicate`

The current defaults prioritize realism over visible-effect-velocity.

### Anthropic rate limits

If you run multiple parallel test scripts or use the demo intensively, you may hit the org-level **8,000 output tokens/minute** rate limit. The dev server logs these as 429 errors. The test scripts catch and continue; the UI surfaces an error to the user.

### iOS Safari quirks

The UI is responsive and tested on mobile sizes, but the Fragment Cloud's hover tooltips don't work on touch devices. Hover-revealed delete `×` on custom story pills is set to always-visible on small screens.

### The dev server must stay healthy mid-test

If you edit `src/app/page.tsx` (or any other compiled file) while a test script is mid-run, the Next.js dev server's transient compile-error state will return 500s to the test for the duration of the broken state. The long-run test learned this the hard way — be sure to let multi-round tests finish before editing.

---

## A note on the name

*Memoria Ficta* — Latin for "fabricated memory" or "shaped memory" (from *fingere*: to mold, to invent, to feign). It was a medieval scholastic term for memories the mind constructs rather than recalls. The name is meant as a small confession: this is what the AI is doing, every time it answers. And after enough recalls, it no longer knows.

---

## License

MIT.

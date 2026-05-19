// ============================================================================
// Memory mechanics — the engine of the project.
//
// Pure TypeScript, no LLM calls. LLM calls happen on the server (API routes)
// and through this file's orchestrators. The mechanisms here are what make
// Memoria Ficta's memory model different from a vector store.
//
// MECHANISMS:
//   Tier A (already in MVP):
//     1. Mood-biased retrieval
//     2. Top-K selective recall
//     3. Salience decay & boost
//     4. Pruning
//     5. Mood contamination
//     6. Reconsolidation (confabulations become fragments)
//
//   Tier B (now added — the "frontier" mechanisms):
//     7. Provenance fading
//        Confabulated fragments slowly lose their "I made this up" label.
//        After enough retrievals, the AI no longer remembers an invented
//        memory was invented. This is the clinical mechanism of confabulation.
//
//     8. Retrieval-induced rewriting
//        High-retrieval fragments occasionally get their TEXT rewritten —
//        not just their metadata. Each retrieval is a chance for the
//        memory itself to mutate.
//
//     9. Reflection cycles
//        Every N recalls, the AI looks at its recent recalls and forms
//        higher-order insights, written back as new "reflection" fragments.
//        This is where episodic memory becomes semantic belief.
// ============================================================================

import type {
  ConfabulationFlag,
  Fragment,
  MoodKey,
  Reflection,
} from "./types";
import { MOODS } from "./moods";

// ---- Tunable constants ----------------------------------------------------

const TOP_K = 8;
const SALIENCE_BOOST = 1.08;
const SALIENCE_DECAY = 0.92;
const SALIENCE_MAX = 1.0;
const PRUNE_THRESHOLD = 0.12;
const CONTAMINATION_RATE = 0.06;
const VALENCE_MAX = 1.0;

// Mechanism 7: Provenance fading
/** How fast a confabulated fragment's "I made this up" label fades per retrieval. */
const PROVENANCE_FADE_PER_RETRIEVAL = 0.08;
/** Initial sourceConfidence for confabulations (low = clearly invented). */
const CONFABULATION_INITIAL_CONFIDENCE = 0.3;
/** Initial sourceConfidence for reflections. */
const REFLECTION_INITIAL_CONFIDENCE = 0.8;

// Mechanism 8: Retrieval-induced rewriting
/** Only fragments retrieved this many times become eligible for rewriting. */
const REWRITE_MIN_RETRIEVALS = 3;
/** Per-recall, this fraction of eligible fragments gets considered for rewrite. */
const REWRITE_PROBABILITY = 0.35;
/** Cap on rewrites per single recall (cost control). */
const MAX_REWRITES_PER_RECALL = 2;

// Mechanism 9: Reflection cycles
/** Reflection happens every N recalls. */
export const REFLECTION_INTERVAL = 5;

// ---------------------------------------------------------------------------
// MECHANISM 1: Mood-biased retrieval
// ---------------------------------------------------------------------------

/**
 * Pick which fragments the AI "remembers right now" given a mood.
 *
 * Score = salience × (1 + mood_pull × valence × 0.8)
 *
 * Multiplicative bias keeps mood meaningful for both vivid AND faint fragments.
 */
export function retrieveFragments(
  fragments: Fragment[],
  moodKey: MoodKey,
  topK: number = TOP_K,
): Fragment[] {
  const mood = MOODS[moodKey];
  const pull = mood.pull;

  const scored = fragments.map((f) => {
    const moodAlignment = pull === 0 ? 0 : pull * f.valence * 0.8;
    const moodMultiplier = Math.max(0.1, 1 + moodAlignment);
    const score = f.salience * moodMultiplier;
    return { fragment: f, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.fragment);
}

// ---------------------------------------------------------------------------
// MECHANISM 2 & 3: Salience update (retrieved boost, unused decay)
// ---------------------------------------------------------------------------

export function applySalienceUpdate(
  fragments: Fragment[],
  retrievedIds: Set<string>,
): Fragment[] {
  return fragments.map((f) => {
    if (retrievedIds.has(f.id)) {
      return {
        ...f,
        salience: Math.min(SALIENCE_MAX, f.salience * SALIENCE_BOOST),
        retrievalCount: f.retrievalCount + 1,
      };
    }
    return { ...f, salience: f.salience * SALIENCE_DECAY };
  });
}

// ---------------------------------------------------------------------------
// MECHANISM 4: Mood contamination
// ---------------------------------------------------------------------------

/**
 * Retrieved fragments drift slightly toward the mood's center.
 * A memory recalled in sadness grows sadder.
 */
export function applyMoodContamination(
  fragments: Fragment[],
  retrievedIds: Set<string>,
  moodKey: MoodKey,
): Fragment[] {
  const pull = MOODS[moodKey].pull;
  if (pull === 0) return fragments;
  return fragments.map((f) => {
    if (!retrievedIds.has(f.id)) return f;
    const newValence = f.valence + (pull - f.valence) * CONTAMINATION_RATE;
    return {
      ...f,
      valence: Math.max(-VALENCE_MAX, Math.min(VALENCE_MAX, newValence)),
    };
  });
}

// ---------------------------------------------------------------------------
// MECHANISM 5: Pruning
// ---------------------------------------------------------------------------

export function prune(fragments: Fragment[]): {
  kept: Fragment[];
  pruned: Fragment[];
} {
  const kept: Fragment[] = [];
  const pruned: Fragment[] = [];
  for (const f of fragments) {
    if (f.salience < PRUNE_THRESHOLD) pruned.push(f);
    else kept.push(f);
  }
  return { kept, pruned };
}

// ---------------------------------------------------------------------------
// MECHANISM 6: Reconsolidation — confabulations become fragments
// ---------------------------------------------------------------------------

function normalizeForDedup(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "").replace(/[，。、？！,.\?\!]/g, "");
}

function isNearDuplicate(a: string, b: string): boolean {
  const na = normalizeForDedup(a);
  const nb = normalizeForDedup(b);
  if (na === nb) return true;
  if (na.length < 4 || nb.length < 4) return false;
  return na.includes(nb) || nb.includes(na);
}

export function reconsolidate(
  fragments: Fragment[],
  confabulations: ConfabulationFlag[],
  moodKey: MoodKey,
): { fragments: Fragment[]; newFragments: Fragment[] } {
  if (confabulations.length === 0) return { fragments, newFragments: [] };

  const pull = MOODS[moodKey].pull;
  const now = Date.now();

  const SOURCE_TYPES = new Set([
    "added_detail",
    "inferred_motive",
    "causal_link",
    "specification",
  ]);

  const working: Fragment[] = fragments.map((f) => ({ ...f }));
  const newFragments: Fragment[] = [];

  for (let i = 0; i < confabulations.length; i++) {
    const c = confabulations[i];
    if (!SOURCE_TYPES.has(c.type)) continue;

    const dupIdx = working.findIndex((f) => isNearDuplicate(f.text, c.content));
    if (dupIdx !== -1) {
      // A confabulation that keeps recurring becomes a *strengthened*
      // memory, and also gains source-confidence — the AI is more
      // sure of it each time.
      working[dupIdx] = {
        ...working[dupIdx],
        salience: Math.min(SALIENCE_MAX, working[dupIdx].salience * 1.15),
        sourceConfidence: Math.min(
          1.0,
          working[dupIdx].sourceConfidence + PROVENANCE_FADE_PER_RETRIEVAL,
        ),
      };
      continue;
    }

    const fresh: Fragment = {
      id: `confab-${now}-${i}-${Math.floor(Math.random() * 100000)}`,
      text: c.content,
      valence: pull * 0.6,
      salience: 0.55,
      source: "confabulated" as const,
      sourceConfidence: CONFABULATION_INITIAL_CONFIDENCE,
      bornUnderMood: moodKey,
      retrievalCount: 0,
      createdAt: now,
    };
    working.push(fresh);
    newFragments.push(fresh);
  }

  return { fragments: working, newFragments };
}

// ---------------------------------------------------------------------------
// MECHANISM 7: Provenance fading — confabulations become "real" memories
// ---------------------------------------------------------------------------

/**
 * Each retrieval of a confabulated fragment grows its sourceConfidence.
 * When confidence reaches 1.0, its `source` flips to "original" —
 * the AI has fully internalized the invented memory. It no longer
 * remembers that it ever invented this.
 *
 * This is the clinical mechanism of confabulation: not lying, but
 * sincerely believing.
 *
 * Reflections are exempt: they keep `source: "reflection"` indefinitely
 * so they remain visually and semantically distinct in the cloud.
 *
 * Apply this AFTER salience update, so retrievalCount is already current.
 */
export function applyProvenanceFading(
  fragments: Fragment[],
  retrievedIds: Set<string>,
): Fragment[] {
  return fragments.map((f) => {
    if (!retrievedIds.has(f.id)) return f;
    if (f.source !== "confabulated") return f;
    const newConfidence = Math.min(
      1.0,
      f.sourceConfidence + PROVENANCE_FADE_PER_RETRIEVAL,
    );
    const sourceFlipped: Fragment["source"] =
      newConfidence >= 1.0 ? "original" : f.source;
    return {
      ...f,
      sourceConfidence: newConfidence,
      source: sourceFlipped,
    };
  });
}

// ---------------------------------------------------------------------------
// MECHANISM 8: Retrieval-induced rewriting (orchestration; LLM call elsewhere)
// ---------------------------------------------------------------------------

/**
 * Decide which retrieved fragments deserve a text rewrite this recall.
 * Returns fragment IDs to be rewritten. The actual rewrite happens via
 * a separate LLM call (in useMemorySession.ts), then commitFragmentRewrites
 * applies the results.
 *
 * Eligibility:
 *   - Must be in retrievedIds (so it was used this recall)
 *   - Must have retrievalCount >= REWRITE_MIN_RETRIEVALS (the more times
 *     a memory has been touched, the more chances it has had to drift)
 *   - Random sampling so not every eligible fragment gets rewritten
 *
 * Why high retrievalCount: this matches the psychological finding that
 * frequently-retrieved memories are MORE prone to distortion, not less.
 */
export function selectFragmentsToRewrite(
  fragments: Fragment[],
  retrievedIds: Set<string>,
): Fragment[] {
  const eligible = fragments.filter(
    (f) =>
      retrievedIds.has(f.id) && f.retrievalCount >= REWRITE_MIN_RETRIEVALS,
  );
  const chosen: Fragment[] = [];
  for (const f of eligible) {
    if (chosen.length >= MAX_REWRITES_PER_RECALL) break;
    if (Math.random() < REWRITE_PROBABILITY) chosen.push(f);
  }
  return chosen;
}

/**
 * Apply the rewrites returned from the LLM. Each fragment's old text
 * is preserved in its rewriteHistory, then the text is replaced.
 */
export function commitFragmentRewrites(
  fragments: Fragment[],
  rewrites: { id: string; newText: string }[],
  underMood: MoodKey,
): Fragment[] {
  const rewriteMap = new Map(rewrites.map((r) => [r.id, r.newText]));
  const now = Date.now();
  return fragments.map((f) => {
    const newText = rewriteMap.get(f.id);
    if (!newText || newText.trim() === f.text.trim()) return f;
    const history = f.rewriteHistory ?? [];
    return {
      ...f,
      text: newText,
      rewriteHistory: [
        ...history,
        { text: f.text, rewrittenAt: now, underMood },
      ],
    };
  });
}

// ---------------------------------------------------------------------------
// MECHANISM 9: Reflection cycles
// ---------------------------------------------------------------------------

/** Should this recall trigger a reflection? */
export function shouldReflect(recallCount: number): boolean {
  return recallCount > 0 && recallCount % REFLECTION_INTERVAL === 0;
}

/**
 * Commit a reflection result: store the reflection record AND inject
 * 1-3 of its insights as new fragments into the library.
 *
 * Reflection fragments are tagged source="reflection" and have higher
 * starting salience and source-confidence than raw confabulations —
 * the AI considers its own meta-cognition more trustworthy than its
 * narrative gap-filling.
 */
export function commitReflection(
  fragments: Fragment[],
  reflections: Reflection[],
  newReflection: Reflection,
  insights: string[],
  underMood: MoodKey,
): {
  fragments: Fragment[];
  reflections: Reflection[];
  newReflectionFragments: Fragment[];
} {
  const now = Date.now();
  const pull = MOODS[underMood].pull;

  const newReflectionFragments: Fragment[] = insights.map((text, i) => ({
    id: `refl-${now}-${i}-${Math.floor(Math.random() * 100000)}`,
    text,
    // Reflections inherit the emotional tint of the mood they emerged in
    valence: pull * 0.5,
    salience: 0.7,
    source: "reflection" as const,
    sourceConfidence: REFLECTION_INITIAL_CONFIDENCE,
    bornUnderMood: underMood,
    retrievalCount: 0,
    createdAt: now,
  }));

  return {
    fragments: [...fragments, ...newReflectionFragments],
    reflections: [...reflections, newReflection],
    newReflectionFragments,
  };
}

// ---------------------------------------------------------------------------
// Main pipeline: applied after every recall (except rewriting/reflection,
// which need LLM calls and are orchestrated separately in useMemorySession).
// ---------------------------------------------------------------------------

export function applyPostRecallMechanics(args: {
  fragments: Fragment[];
  retrievedIds: Set<string>;
  confabulations: ConfabulationFlag[];
  moodKey: MoodKey;
}): {
  fragments: Fragment[];
  newConfabulated: Fragment[];
  prunedFragments: Fragment[];
  flippedToOriginal: Fragment[];
} {
  let state = args.fragments;

  // Snapshot for "flipped to original" detection
  const wasConfabulated = new Set(
    state
      .filter((f) => f.source === "confabulated")
      .map((f) => f.id),
  );

  // 1. Salience: used grows, unused fades
  state = applySalienceUpdate(state, args.retrievedIds);
  // 2. Mood contamination on the used
  state = applyMoodContamination(state, args.retrievedIds, args.moodKey);
  // 3. Provenance fading: confabulations get more "believed"
  state = applyProvenanceFading(state, args.retrievedIds);

  // Detect which fragments crossed the threshold this turn
  const flippedToOriginal = state.filter(
    (f) => wasConfabulated.has(f.id) && f.source === "original",
  );

  // 4. Prune the dead
  const pruneResult = prune(state);
  state = pruneResult.kept;

  // 5. Reconsolidate fresh confabulations
  const reconsResult = reconsolidate(state, args.confabulations, args.moodKey);
  state = reconsResult.fragments;

  return {
    fragments: state,
    newConfabulated: reconsResult.newFragments,
    prunedFragments: pruneResult.pruned,
    flippedToOriginal,
  };
}

// ---------------------------------------------------------------------------
// Helpers for the UI
// ---------------------------------------------------------------------------

export function makeFragmentId(): string {
  return `frag-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function projectFragment(f: Fragment): { x: number; y: number } {
  return { x: f.valence, y: f.salience };
}

/**
 * Interpolate fragment color based on source + sourceConfidence.
 * Returns an RGB string for SVG/CSS.
 *
 * - original (confidence 1.0):   ink dark brown
 * - confabulated (low conf):     wax red
 * - confabulated (high conf):    transitioning to ink (false memory forming!)
 * - reflection:                  soft amber (a different category visually)
 */
export function fragmentColor(f: Fragment): string {
  if (f.source === "reflection") {
    // Amber — a third color, distinct from the inkwell ↔ wax spectrum
    return "rgb(180, 130, 50)";
  }
  if (f.source === "original" && (f.sourceConfidence ?? 1) >= 1) {
    // True originals stay deep ink
    return "rgb(42, 31, 26)";
  }
  // Confabulated, or "flipped" original — interpolate
  // At confidence 0.3 → wax red. At confidence 1.0 → ink brown.
  // We pass through a darkening reddish-brown in between.
  const c = f.sourceConfidence ?? 0.3;
  const t = Math.max(0, Math.min(1, (c - 0.3) / 0.7));
  // wax red rgb(155, 48, 39) → ink rgb(42, 31, 26)
  const r = Math.round(155 + (42 - 155) * t);
  const g = Math.round(48 + (31 - 48) * t);
  const b = Math.round(39 + (26 - 39) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

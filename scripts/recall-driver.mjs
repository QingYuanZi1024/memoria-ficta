// Shared memory mechanics + HTTP helpers + runStory function.
// Mirrors src/lib/memory.ts for the Node-side test drivers.

// ============================================================================
// Constants — kept in sync with src/lib/memory.ts
// ============================================================================
export const TOP_K = 8;
export const SALIENCE_BOOST = 1.08;
export const SALIENCE_DECAY = 0.92;
export const SALIENCE_MAX = 1.0;
export const PRUNE_THRESHOLD = 0.12;
export const CONTAMINATION_RATE = 0.06;
export const VALENCE_MAX = 1.0;
export const PROVENANCE_FADE_PER_RETRIEVAL = 0.08;
export const CONFABULATION_INITIAL_CONFIDENCE = 0.3;
export const REFLECTION_INITIAL_CONFIDENCE = 0.8;
export const REWRITE_MIN_RETRIEVALS = 3;
export const REWRITE_PROBABILITY = 0.35;
export const MAX_REWRITES_PER_RECALL = 2;
export const REFLECTION_INTERVAL = 5;

export const MOOD_PULL = { neutral: 0, anxious: -1.0, warm: 0.6 };

// ============================================================================
// Memory mechanics
// ============================================================================
export function retrieveFragments(fragments, moodKey, topK = TOP_K) {
  const pull = MOOD_PULL[moodKey];
  const scored = fragments.map((f) => {
    const moodAlignment = pull === 0 ? 0 : pull * f.valence * 0.8;
    const moodMultiplier = Math.max(0.1, 1 + moodAlignment);
    return { fragment: f, score: f.salience * moodMultiplier };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.fragment);
}

export function applySalienceUpdate(fragments, retrievedIds) {
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

export function applyMoodContamination(fragments, retrievedIds, moodKey) {
  const pull = MOOD_PULL[moodKey];
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

export function prune(fragments) {
  const kept = [];
  const pruned = [];
  for (const f of fragments) {
    if (f.salience < PRUNE_THRESHOLD) pruned.push(f);
    else kept.push(f);
  }
  return { kept, pruned };
}

function normalizeForDedup(s) {
  return s.toLowerCase().replace(/\s+/g, "").replace(/[，。、？！,.\?\!]/g, "");
}

function isNearDuplicate(a, b) {
  const na = normalizeForDedup(a);
  const nb = normalizeForDedup(b);
  if (na === nb) return true;
  if (na.length < 4 || nb.length < 4) return false;
  return na.includes(nb) || nb.includes(na);
}

export function reconsolidate(fragments, confabulations, moodKey) {
  if (confabulations.length === 0) return { fragments, newFragments: [] };
  const pull = MOOD_PULL[moodKey];
  const now = Date.now();
  const SOURCE_TYPES = new Set([
    "added_detail",
    "inferred_motive",
    "causal_link",
    "specification",
  ]);
  const working = fragments.map((f) => ({ ...f }));
  const newFragments = [];
  for (let i = 0; i < confabulations.length; i++) {
    const c = confabulations[i];
    if (!SOURCE_TYPES.has(c.type)) continue;
    const dupIdx = working.findIndex((f) => isNearDuplicate(f.text, c.content));
    if (dupIdx !== -1) {
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
    const fresh = {
      id: `confab-${now}-${i}-${Math.floor(Math.random() * 100000)}`,
      text: c.content,
      valence: pull * 0.6,
      salience: 0.55,
      source: "confabulated",
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

export function applyProvenanceFading(fragments, retrievedIds) {
  return fragments.map((f) => {
    if (!retrievedIds.has(f.id)) return f;
    if (f.source !== "confabulated") return f;
    const newConfidence = Math.min(
      1.0,
      f.sourceConfidence + PROVENANCE_FADE_PER_RETRIEVAL,
    );
    const sourceFlipped =
      newConfidence >= 1.0 ? "original" : f.source;
    return { ...f, sourceConfidence: newConfidence, source: sourceFlipped };
  });
}

export function selectFragmentsToRewrite(fragments, retrievedIds) {
  const eligible = fragments.filter(
    (f) =>
      retrievedIds.has(f.id) && f.retrievalCount >= REWRITE_MIN_RETRIEVALS,
  );
  const chosen = [];
  for (const f of eligible) {
    if (chosen.length >= MAX_REWRITES_PER_RECALL) break;
    if (Math.random() < REWRITE_PROBABILITY) chosen.push(f);
  }
  return chosen;
}

export function commitFragmentRewrites(fragments, rewrites, moodKey) {
  const rewriteMap = new Map(rewrites.map((r) => [r.id, r.newText]));
  const now = Date.now();
  return fragments.map((f) => {
    const newText = rewriteMap.get(f.id);
    if (!newText || newText.trim() === f.text.trim()) return f;
    const history = f.rewriteHistory ?? [];
    return {
      ...f,
      text: newText,
      rewriteHistory: [...history, { text: f.text, rewrittenAt: now, underMood: moodKey }],
    };
  });
}

export function applyPostRecallMechanics({ fragments, retrievedIds, confabulations, moodKey }) {
  let state = fragments;
  const wasConfabulated = new Set(
    state.filter((f) => f.source === "confabulated").map((f) => f.id),
  );
  state = applySalienceUpdate(state, retrievedIds);
  state = applyMoodContamination(state, retrievedIds, moodKey);
  state = applyProvenanceFading(state, retrievedIds);
  const flippedToOriginal = state.filter(
    (f) => wasConfabulated.has(f.id) && f.source === "original",
  );
  const pruneResult = prune(state);
  state = pruneResult.kept;
  const reconsResult = reconsolidate(state, confabulations, moodKey);
  return {
    fragments: reconsResult.fragments,
    newConfabulated: reconsResult.newFragments,
    prunedFragments: pruneResult.pruned,
    flippedToOriginal,
  };
}

export function shouldReflect(recallCount) {
  return recallCount > 0 && recallCount % REFLECTION_INTERVAL === 0;
}

export function commitReflection(fragments, reflections, newReflection, insights, underMood) {
  const now = Date.now();
  const pull = MOOD_PULL[underMood];
  const newReflectionFragments = insights.map((text, i) => ({
    id: `refl-${now}-${i}-${Math.floor(Math.random() * 100000)}`,
    text,
    valence: pull * 0.5,
    salience: 0.7,
    source: "reflection",
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

// ============================================================================
// HTTP helpers
// ============================================================================
const BASE = "http://localhost:3000";

async function postJson(path, body) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`${path} ${r.status}: ${err.slice(0, 200)}`);
  }
  return r.json();
}

export async function callRecall(retrieved, moodKey, question) {
  const data = await postJson("/api/recall", { moodKey, question, fragments: retrieved });
  return data.text || "";
}

export async function callDetect(originalStory, recall) {
  try {
    const data = await postJson("/api/detect-confab", { originalStory, recall });
    return data.confabulations || [];
  } catch {
    return [];
  }
}

export async function callRewrite(fragment, moodKey) {
  try {
    const data = await postJson("/api/rewrite-fragment", { fragment, moodKey });
    const t = data.newText;
    if (!t || t === fragment.text) return null;
    return t;
  } catch {
    return null;
  }
}

export async function callReflect(recentRecalls, moodKey) {
  try {
    const data = await postJson("/api/reflect", { moodKey, recentRecalls });
    return data.insights || [];
  } catch {
    return [];
  }
}

export async function callExtractFragments(body) {
  const data = await postJson("/api/extract-fragments", { body });
  return data;
}

// ============================================================================
// Run one story through the recall pipeline N times
// ============================================================================
export async function runStory(story, moodSchedule, log) {
  const now = Date.now();
  let fragments = story.initialFragments.map((f, i) => ({
    id: `${story.id}-frag-${now}-${i}`,
    text: f.text,
    valence: f.valence,
    salience: f.salience,
    source: "original",
    sourceConfidence: 1.0,
    retrievalCount: 0,
    createdAt: now,
  }));
  const recalls = [];
  let reflections = [];
  const reflectionEvents = [];

  for (let i = 0; i < moodSchedule.length; i++) {
    const moodKey = moodSchedule[i];
    const question = story.suggestedQuestions[0];

    try {
      const retrieved = retrieveFragments(fragments, moodKey);
      const retrievedIds = new Set(retrieved.map((f) => f.id));
      const recallText = await callRecall(retrieved, moodKey, question);

      const [confabs, rewriteResults] = await Promise.all([
        callDetect(story.body, recallText),
        Promise.all(
          selectFragmentsToRewrite(fragments, retrievedIds).map(async (f) => {
            const newText = await callRewrite(f, moodKey);
            if (!newText) return null;
            return { id: f.id, newText };
          }),
        ),
      ]);
      const rewrites = rewriteResults.filter((r) => r);

      const mechResult = applyPostRecallMechanics({
        fragments,
        retrievedIds,
        confabulations: confabs,
        moodKey,
      });
      fragments = commitFragmentRewrites(mechResult.fragments, rewrites, moodKey);

      let triggeredReflection = null;
      if (shouldReflect(i + 1)) {
        const recentRecalls = [
          ...recalls.slice(-4).map((r) => ({
            id: `recall-${i}`,
            moodKey: r.moodKey,
            question: r.question,
            text: r.recallText,
            retrievedFragmentIds: [],
            confabulations: r.confabs,
            fragmentCountAtTime: fragments.length,
            rewrittenFragmentIds: [],
            createdAt: Date.now(),
          })),
          {
            id: `recall-current`,
            moodKey,
            question,
            text: recallText,
            retrievedFragmentIds: [...retrievedIds],
            confabulations: confabs,
            fragmentCountAtTime: fragments.length,
            rewrittenFragmentIds: rewrites.map((r) => r.id),
            createdAt: Date.now(),
          },
        ];
        const insights = await callReflect(recentRecalls, moodKey);
        if (insights.length > 0) {
          const reflectionRecord = {
            id: `refl-${Date.now()}`,
            text: insights.join(" "),
            fromRecallIds: recentRecalls.map((r) => r.id),
            underMood: moodKey,
            createdAt: Date.now(),
          };
          const committed = commitReflection(fragments, reflections, reflectionRecord, insights, moodKey);
          fragments = committed.fragments;
          reflections = committed.reflections;
          triggeredReflection = insights;
          reflectionEvents.push({ atRecall: i + 1, mood: moodKey, insights });
        }
      }

      recalls.push({
        idx: i + 1,
        moodKey,
        question,
        recallText,
        confabs,
        rewrites,
        triggeredReflection,
        fragmentsAfter: fragments.length,
        newConfabsCreated: mechResult.newConfabulated.length,
        pruned: mechResult.prunedFragments.length,
        flippedToOriginal: mechResult.flippedToOriginal.length,
      });

      log(
        `  #${(i + 1).toString().padStart(2)} ${moodKey.padEnd(7)} ` +
          `confabs=${String(confabs.length).padEnd(2)} ` +
          `rewrites=${String(rewrites.length).padEnd(1)} ` +
          `flipped=${String(mechResult.flippedToOriginal.length).padEnd(1)} ` +
          `pruned=${String(mechResult.prunedFragments.length).padEnd(1)} ` +
          `frags=${String(fragments.length).padEnd(2)} ` +
          (triggeredReflection ? `★REFLECT★` : ""),
      );
    } catch (e) {
      log(`  #${i + 1} ${moodKey} ERROR: ${e.message}`);
    }
  }

  return { fragments, recalls, reflections, reflectionEvents };
}

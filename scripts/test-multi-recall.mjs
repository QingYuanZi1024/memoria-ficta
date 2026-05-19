// Drive all stories through multiple-round recalls and report mechanism effects.
// Each story runs 8 recalls (5 anxious then 3 warm), triggering one reflection
// at recall 5. Stories run in parallel — one Node process, Promise.all'd.
//
// Usage: node scripts/test-multi-recall.mjs > test-multi-recall.log 2>&1

import fs from "node:fs";

// ============================================================================
// Constants — kept in sync with src/lib/memory.ts
// ============================================================================
const TOP_K = 8;
const SALIENCE_BOOST = 1.08;
const SALIENCE_DECAY = 0.92;
const SALIENCE_MAX = 1.0;
const PRUNE_THRESHOLD = 0.12;
const CONTAMINATION_RATE = 0.06;
const VALENCE_MAX = 1.0;
const PROVENANCE_FADE_PER_RETRIEVAL = 0.08;
const CONFABULATION_INITIAL_CONFIDENCE = 0.3;
const REFLECTION_INITIAL_CONFIDENCE = 0.8;
const REWRITE_MIN_RETRIEVALS = 3;
const REWRITE_PROBABILITY = 0.35;
const MAX_REWRITES_PER_RECALL = 2;
const REFLECTION_INTERVAL = 5;

const MOOD_PULL = { neutral: 0, anxious: -1.0, warm: 0.6 };

// ============================================================================
// Memory mechanics (mirrors src/lib/memory.ts)
// ============================================================================
function retrieveFragments(fragments, moodKey, topK = TOP_K) {
  const pull = MOOD_PULL[moodKey];
  const scored = fragments.map((f) => {
    const moodAlignment = pull === 0 ? 0 : pull * f.valence * 0.8;
    const moodMultiplier = Math.max(0.1, 1 + moodAlignment);
    return { fragment: f, score: f.salience * moodMultiplier };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.fragment);
}

function applySalienceUpdate(fragments, retrievedIds) {
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

function applyMoodContamination(fragments, retrievedIds, moodKey) {
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

function prune(fragments) {
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

function reconsolidate(fragments, confabulations, moodKey) {
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

function applyProvenanceFading(fragments, retrievedIds) {
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

function selectFragmentsToRewrite(fragments, retrievedIds) {
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

function commitFragmentRewrites(fragments, rewrites, moodKey) {
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

function applyPostRecallMechanics({ fragments, retrievedIds, confabulations, moodKey }) {
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

function shouldReflect(recallCount) {
  return recallCount > 0 && recallCount % REFLECTION_INTERVAL === 0;
}

function commitReflection(fragments, reflections, newReflection, insights, underMood) {
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
// Story loader — parse stories.ts via regex (cheap; works for current format)
// ============================================================================
function loadStories() {
  const src = fs.readFileSync("src/data/stories.ts", "utf8");
  const idRe = /id:\s*"([a-z0-9-]+)"/g;
  const chunks = [];
  let lastIdx = 0;
  let lastId = null;
  let m;
  while ((m = idRe.exec(src)) !== null) {
    if (lastId) chunks.push({ id: lastId, content: src.slice(lastIdx, m.index) });
    lastId = m[1];
    lastIdx = m.index;
  }
  if (lastId) chunks.push({ id: lastId, content: src.slice(lastIdx) });

  const stories = [];
  for (const ch of chunks) {
    const title = (ch.content.match(/title:\s*"([^"]+)"/) || [])[1];
    const body = (ch.content.match(/body:\s*`([\s\S]*?)`/) || [])[1];
    if (!title || !body) continue;
    const fragBlock = (ch.content.match(
      /initialFragments:\s*\[([\s\S]*?)\],\s*suggestedQuestions/,
    ) || [])[1] || "";
    const fragments = [];
    // Note the trailing `,?` before `\}` — multi-line fragments have a
    // dangling comma after `salience: 0.75,` that single-line ones omit.
    const fragRe =
      /\{\s*text:\s*"((?:[^"\\]|\\.)*)",\s*valence:\s*(-?[\d.]+),\s*salience:\s*([\d.]+),?\s*\}/g;
    let fm;
    while ((fm = fragRe.exec(fragBlock)) !== null) {
      fragments.push({
        text: fm[1].replace(/\\"/g, '"'),
        valence: parseFloat(fm[2]),
        salience: parseFloat(fm[3]),
      });
    }
    const qBlock = (ch.content.match(/suggestedQuestions:\s*\[([\s\S]*?)\]/) || [])[1] || "";
    const questions = (qBlock.match(/"((?:[^"\\]|\\.)*)"/g) || []).map((q) =>
      q.slice(1, -1).replace(/\\"/g, '"'),
    );
    stories.push({ id: ch.id, title, body, initialFragments: fragments, suggestedQuestions: questions });
  }
  return stories;
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

async function callRecall(retrieved, moodKey, question) {
  const data = await postJson("/api/recall", { moodKey, question, fragments: retrieved });
  return data.text || "";
}

async function callDetect(originalStory, recall) {
  try {
    const data = await postJson("/api/detect-confab", { originalStory, recall });
    return data.confabulations || [];
  } catch {
    return [];
  }
}

async function callRewrite(fragment, moodKey) {
  try {
    const data = await postJson("/api/rewrite-fragment", { fragment, moodKey });
    const t = data.newText;
    if (!t || t === fragment.text) return null;
    return t;
  } catch {
    return null;
  }
}

async function callReflect(recentRecalls, moodKey) {
  try {
    const data = await postJson("/api/reflect", { moodKey, recentRecalls });
    return data.insights || [];
  } catch {
    return [];
  }
}

// ============================================================================
// Run one story through the recall pipeline N times
// ============================================================================
async function runStory(story, moodSchedule, log) {
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

// ============================================================================
// Main: run all stories in parallel with prefixed logs
// ============================================================================
const SCHEDULE = [
  "anxious",
  "anxious",
  "anxious",
  "anxious",
  "anxious",
  "warm",
  "warm",
  "warm",
];

const SKIP = ["bosss-cat"]; // user already tested

(async () => {
  const stories = loadStories().filter((s) => !SKIP.includes(s.id));
  const t0 = Date.now();

  console.log(`Testing ${stories.length} stories × ${SCHEDULE.length} recalls each, in parallel`);
  console.log(`Schedule: ${SCHEDULE.join(" → ")}`);
  console.log(`Question per recall: stories' suggestedQuestions[0]`);
  console.log("");

  const results = await Promise.all(
    stories.map(async (story) => {
      const prefix = `[${story.title}]`;
      const log = (msg) => console.log(`${prefix} ${msg}`);
      log(`start (${story.initialFragments.length} initial fragments, Q: "${story.suggestedQuestions[0]}")`);
      const result = await runStory(story, SCHEDULE, log);
      log(`done in ${Math.round((Date.now() - t0) / 1000)}s`);
      return { story, result };
    }),
  );

  // ==========================================================================
  // FINAL REPORT
  // ==========================================================================
  console.log("\n\n" + "=".repeat(80));
  console.log("FINAL REPORT");
  console.log("=".repeat(80));

  for (const { story, result } of results) {
    console.log(`\n## ${story.title}`);
    const origRem = result.fragments.filter(
      (f) => f.source === "original" && !f.bornUnderMood,
    ).length;
    const flipped = result.fragments.filter(
      (f) => f.source === "original" && f.bornUnderMood,
    ).length;
    const stillConfab = result.fragments.filter((f) => f.source === "confabulated").length;
    const reflFrags = result.fragments.filter((f) => f.source === "reflection").length;
    const totalRewrites = result.fragments.reduce(
      (sum, f) => sum + (f.rewriteHistory?.length ?? 0),
      0,
    );
    const totalConfabs = result.recalls.reduce((sum, r) => sum + r.confabs.length, 0);
    const totalPruned = result.recalls.reduce((sum, r) => sum + r.pruned, 0);

    console.log(`  原始留存: ${origRem} / ${story.initialFragments.length}`);
    console.log(`  仍标为脑补: ${stillConfab}`);
    console.log(`  已"翻"为原文: ${flipped}`);
    console.log(`  反思碎片: ${reflFrags}`);
    console.log(`  累计脑补 (detect): ${totalConfabs}`);
    console.log(`  累计改写次数: ${totalRewrites}`);
    console.log(`  累计被剪枝: ${totalPruned}`);

    if (result.reflectionEvents.length > 0) {
      const re = result.reflectionEvents[0];
      console.log(`\n  反思 (recall #${re.atRecall}, mood=${re.mood}):`);
      for (const insight of re.insights) {
        console.log(`    · ${insight}`);
      }
    } else {
      console.log(`\n  (reflection 没有触发或返回空)`);
    }

    // Sample recalls — first, mid-anxious (5), warm-end (8)
    const sampleIndices = [0, 4, 7];
    for (const si of sampleIndices) {
      if (!result.recalls[si]) continue;
      const r = result.recalls[si];
      console.log(`\n  ─ recall #${r.idx} (${r.moodKey}):`);
      const text = r.recallText.replace(/\n+/g, " / ");
      console.log(`    ${text.slice(0, 360)}${text.length > 360 ? "…" : ""}`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log(`Total wall time: ${Math.round((Date.now() - t0) / 1000)}s`);
})();

// Long-running test to surface the two mechanisms that didn't trigger in
// the 8-round multi-story test:
//   - Mechanism 4 (pruning): salience-decayed fragments dropping out
//   - Mechanism 7 (provenance flipping): confabs whose sourceConfidence
//     climbed to 1.0 and flipped source → "original"
//
// Single story, 25 rounds, all anxious mood (maximizes retrieval focus +
// salience decay on positive-valence fragments).

import fs from "node:fs";
import { runStory } from "./recall-driver.mjs";

const TARGET_STORY_ID = "to-the-moon-rabbits";
const ROUNDS = 25;

function loadStory(id) {
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
  const ch = chunks.find((c) => c.id === id);
  if (!ch) throw new Error(`Story not found: ${id}`);
  const title = (ch.content.match(/title:\s*"([^"]+)"/) || [])[1];
  const body = (ch.content.match(/body:\s*`([\s\S]*?)`/) || [])[1];
  const fragBlock =
    (ch.content.match(/initialFragments:\s*\[([\s\S]*?)\],\s*suggestedQuestions/) || [])[1] || "";
  const fragments = [];
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
  return { id, title, body, initialFragments: fragments, suggestedQuestions: questions };
}

const schedule = Array(ROUNDS).fill("anxious");

(async () => {
  const t0 = Date.now();
  const story = loadStory(TARGET_STORY_ID);
  console.log("=== Long-run test: " + story.title + " ===");
  console.log(`${ROUNDS} recalls, mood=anxious, Q="${story.suggestedQuestions[0]}"`);
  console.log(`Initial fragments: ${story.initialFragments.length}`);
  console.log("");

  const log = (msg) => console.log(`[${story.title}] ${msg}`);
  const result = await runStory(story, schedule, log);

  console.log("");
  console.log("=".repeat(70));
  console.log("FINAL REPORT");
  console.log("=".repeat(70));

  const orig = result.fragments.filter((f) => f.source === "original" && !f.bornUnderMood);
  const flipped = result.fragments.filter((f) => f.source === "original" && f.bornUnderMood);
  const stillConfab = result.fragments.filter((f) => f.source === "confabulated");
  const reflFrags = result.fragments.filter((f) => f.source === "reflection");
  const totalRewrites = result.fragments.reduce((sum, f) => sum + (f.rewriteHistory?.length ?? 0), 0);
  const totalConfabs = result.recalls.reduce((sum, r) => sum + r.confabs.length, 0);
  const totalPruned = result.recalls.reduce((sum, r) => sum + r.pruned, 0);

  console.log(`  原始留存: ${orig.length} / ${story.initialFragments.length}`);
  console.log(`  仍标为脑补: ${stillConfab.length}`);
  console.log(`  已"翻"为原文（机制 7 触发）: ${flipped.length}`);
  console.log(`  反思碎片: ${reflFrags.length}`);
  console.log(`  累计脑补 (detect): ${totalConfabs}`);
  console.log(`  累计改写次数: ${totalRewrites}`);
  console.log(`  累计被剪枝（机制 4 触发）: ${totalPruned}`);

  // === Mechanism 7 spotlight: list any flipped fragments ===
  console.log("");
  console.log("─ 机制 7: 已翻为原文的脑补（如果有）");
  if (flipped.length === 0) {
    console.log("  （没有 confab 的 sourceConfidence 达到 1.0）");
  } else {
    for (const f of flipped) {
      console.log(`  · "${f.text.slice(0, 60)}" (出生于 ${f.bornUnderMood}, 检索 ${f.retrievalCount} 次)`);
    }
  }

  // === Mechanism 4 spotlight: list pruned fragments per round ===
  console.log("");
  console.log("─ 机制 4: 每轮被剪枝");
  let anyPrune = false;
  for (const r of result.recalls) {
    if (r.pruned > 0) {
      anyPrune = true;
      console.log(`  recall #${r.idx}: ${r.pruned} 条`);
    }
  }
  if (!anyPrune) console.log("  （没有 fragment 跌破 0.12 阈值）");

  // === Reflections (5 expected at rounds 5/10/15/20/25) ===
  console.log("");
  console.log("─ 反思（应该有 5 次）");
  for (const re of result.reflectionEvents) {
    console.log(`  recall #${re.atRecall} (${re.mood}):`);
    for (const insight of re.insights) {
      console.log(`    · ${insight}`);
    }
  }
  if (result.reflectionEvents.length === 0) {
    console.log("  （reflection 全部失败 / rate limit）");
  }

  // === Final fragment census sorted by salience ===
  console.log("");
  console.log("─ 最终碎片状态（按 salience 倒序前 10 + 后 5）");
  const sorted = [...result.fragments].sort((a, b) => b.salience - a.salience);
  console.log("  TOP 10:");
  for (const f of sorted.slice(0, 10)) {
    const tag = f.source === "original" && f.bornUnderMood ? "翻原文" : f.source;
    console.log(
      `    s=${f.salience.toFixed(2)} v=${f.valence >= 0 ? "+" : ""}${f.valence.toFixed(2)} ` +
        `conf=${f.sourceConfidence.toFixed(2)} cnt=${f.retrievalCount} ` +
        `[${tag}] ${f.text.slice(0, 45)}`,
    );
  }
  console.log("  BOTTOM 5:");
  for (const f of sorted.slice(-5)) {
    const tag = f.source === "original" && f.bornUnderMood ? "翻原文" : f.source;
    console.log(
      `    s=${f.salience.toFixed(2)} v=${f.valence >= 0 ? "+" : ""}${f.valence.toFixed(2)} ` +
        `conf=${f.sourceConfidence.toFixed(2)} cnt=${f.retrievalCount} ` +
        `[${tag}] ${f.text.slice(0, 45)}`,
    );
  }

  console.log("");
  console.log("=".repeat(70));
  console.log(`Total wall time: ${Math.round((Date.now() - t0) / 1000)}s`);
})();

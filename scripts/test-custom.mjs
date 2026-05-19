// Test the custom story flow end-to-end:
//   1. Submit a visitor-style story body to /api/extract-fragments
//   2. Build a Story object from the extracted fragments + questions
//   3. Drive it through 8 recalls (5 anxious then 3 warm), like the
//      built-in stories test
//   4. Report mechanism effects
//
// Usage: node scripts/test-custom.mjs

import { callExtractFragments, runStory } from "./recall-driver.mjs";

const CUSTOM_STORY_BODY = `上个月我在公司天台抽烟，碰到隔壁组的一个女生。她叫什么我不知道。她走过来站在我旁边，靠着栏杆，没说话。我递给她一根烟。她接了，没点。

那天天气很冷，风从北边吹过来，把烟灰刮得到处都是。我们俩在那儿站了大概二十分钟，谁都没开口。

后来她把那根烟还给我，说了一句"谢谢，我其实戒了三年了"，然后转身走了。

第二个星期我听说她离职了。`;

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

(async () => {
  const t0 = Date.now();
  console.log("=== Custom story end-to-end test ===");
  console.log(`Body (${CUSTOM_STORY_BODY.length} chars):`);
  console.log(CUSTOM_STORY_BODY.split("\n").map((l) => "  " + l).join("\n"));
  console.log("");

  // Step 1: extract fragments
  console.log("→ Calling /api/extract-fragments...");
  const extracted = await callExtractFragments(CUSTOM_STORY_BODY);
  console.log(
    `  extracted ${extracted.fragments.length} fragments + ${extracted.suggestedQuestions.length} questions`,
  );
  console.log("");
  console.log("  Fragments:");
  for (const f of extracted.fragments) {
    console.log(
      `    ${f.valence >= 0 ? "+" : ""}${f.valence.toFixed(2).padStart(5)}  ` +
        `s=${f.salience.toFixed(2)}  ${f.text}`,
    );
  }
  console.log("");
  console.log("  Suggested questions:");
  for (const q of extracted.suggestedQuestions) {
    console.log(`    · ${q}`);
  }

  const story = {
    id: "custom-test-cigarette",
    title: "天台上的二十分钟",
    subtitle: "自定义故事 · 测试",
    body: CUSTOM_STORY_BODY,
    initialFragments: extracted.fragments,
    suggestedQuestions:
      extracted.suggestedQuestions.length > 0
        ? extracted.suggestedQuestions
        : ["那天发生了什么？"],
  };

  // Step 2: drive 8 recalls
  console.log("");
  console.log(`→ Running ${SCHEDULE.length} recalls (${SCHEDULE.join(" → ")})...`);
  console.log(`  Question: "${story.suggestedQuestions[0]}"`);
  console.log("");

  const log = (msg) => console.log(`[${story.title}] ${msg}`);
  const result = await runStory(story, SCHEDULE, log);

  // Step 3: report
  console.log("");
  console.log("=".repeat(70));
  console.log("FINAL REPORT — custom story");
  console.log("=".repeat(70));

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

  console.log(`  原始留存: ${origRem} / ${extracted.fragments.length}`);
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

  // Sample recalls
  for (const si of [0, 4, 7]) {
    if (!result.recalls[si]) continue;
    const r = result.recalls[si];
    console.log(`\n  ─ recall #${r.idx} (${r.moodKey}):`);
    const text = r.recallText.replace(/\n+/g, " / ");
    console.log(`    ${text.slice(0, 360)}${text.length > 360 ? "…" : ""}`);
  }

  console.log("");
  console.log("=".repeat(70));
  console.log(`Total wall time: ${Math.round((Date.now() - t0) / 1000)}s`);
})();

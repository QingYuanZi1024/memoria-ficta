// ============================================================================
// Prompt templates. These are the linguistic engine of Memoria Ficta.
// ============================================================================

import type { Fragment, MoodKey, Recall } from "./types";
import { MOODS } from "./moods";

// ---------------------------------------------------------------------------
// Reconstruction prompt — the core "remember this" prompt
// ---------------------------------------------------------------------------

export function buildReconstructionPrompt(args: {
  moodKey: MoodKey;
  question: string;
  fragments: Fragment[];
}): string {
  const mood = MOODS[args.moodKey];
  const fragmentText = args.fragments.map((f) => `  · ${f.text}`).join("\n");

  return `你正在"回忆"一件你曾经经历过的事。

请注意：你**没有**原始事件的完整记录。你能访问的，只有下面这些零散的、按你此刻心情过滤过的记忆碎片。它们是不完整的、片面的、甚至可能有些已经被时间染了色的。

你此刻的心情：${mood.description}

你此刻能想起来的碎片（按你的心情过滤后浮现的）：
${fragmentText}

有人正在问你：${args.question}

请你像一个真实的人在回忆一样回答。这意味着：

1. **不要复述这些碎片**。把它们重新编织成一段流畅的、第一人称的回忆。
2. **在碎片之间建立连接**。碎片之间的空隙，用符合你此刻心情、也符合整体氛围的内容填补。这就是真实的回忆——人不会说"我不记得中间发生了什么"，人会下意识地连成一个完整故事。
3. **允许加入合理的细节**。如果你此刻心情焦虑，可以提到一些让你焦虑的细节，哪怕碎片里没有明确写。如果心情温暖，可以加入一些让你觉得有趣或释怀的解读。
4. **用第一人称，自然地说话**。像在和一个朋友讲一件过去的事。
5. **不要在回答里提到"碎片"、"记忆系统"、"AI"这种元词汇**。你就是一个在回忆的人。
6. **控制长度**：300-500 字之间，自然结尾，不要硬撑。

请开始你的回忆：`;
}

// ---------------------------------------------------------------------------
// Confabulation detection prompt
// ---------------------------------------------------------------------------

export function buildConfabulationPrompt(args: {
  originalStory: string;
  recall: string;
}): string {
  return `下面有一段"原始故事"和一段"事后回忆"。

原始故事：
"""
${args.originalStory}
"""

事后回忆：
"""
${args.recall}
"""

请找出"事后回忆"中**所有不能从"原始故事"直接推出的内容**——也就是回忆者自己脑补、添加、推测、或者主观解读出来的部分。

回忆中常见的脑补包括（但不限于）：
- 添加了原文没有的具体细节（人物表情、感受、动作、对话）
- 推测或脑补了别人的动机、想法、情绪
- 添加了原文没有的因果解释（"因为... 所以..."）
- 添加了主观评价或事后反思
- 把模糊的事说得更具体（比如原文说"有人"，回忆说"我同事小王"）

每条脑补的 type 字段使用以下分类之一：
- "added_detail" - 添加了原文没有的具体细节
- "inferred_motive" - 推测了他人的动机或想法
- "causal_link" - 添加了原文没有的因果解释
- "subjective_eval" - 主观评价或事后反思
- "specification" - 把模糊的内容具体化

返回严格的 JSON，不要任何额外文字、不要 markdown 代码块。格式：

{
  "confabulations": [
    {
      "content": "回忆中的具体内容（一句或一个短语，必须是原回忆文本里的精确片段，方便高亮）",
      "type": "added_detail",
      "why": "为什么这是脑补——简短说明"
    }
  ]
}

如果完全没有脑补，返回 {"confabulations": []}。

只返回 JSON。`;
}

// ---------------------------------------------------------------------------
// MECHANISM 8: Retrieval-induced rewriting prompt
// ---------------------------------------------------------------------------

/**
 * Ask the LLM to subtly rewrite a fragment, simulating how a memory
 * naturally drifts when accessed under a specific emotional state.
 *
 * Constraints:
 *   - Stay under 25 characters longer than the original
 *   - Preserve the core fact, drift the framing
 *   - The drift should match the current mood
 *   - Subtle, not dramatic — first-pass changes should be wording-level
 *
 * Why subtle: dramatic rewrites would make the project feel like
 * gimmicky distortion. The compounding effect of subtle rewrites
 * over many recalls is what's psychologically realistic AND visually
 * striking when shown over the rewrite history.
 */
export function buildRewritePrompt(args: {
  fragment: Fragment;
  moodKey: MoodKey;
}): string {
  const mood = MOODS[args.moodKey];

  return `你的某段记忆在此刻又一次被想起。每次想起，记忆都会被悄悄重写一点——这是真实记忆的工作方式。

原本的记忆碎片：
"${args.fragment.text}"

你此刻的心情：${mood.description}

请把这条记忆**用此刻的心情**重新表述一次。规则：

1. **保留事件的核心事实**——发生了什么、谁参与了，不能变。
2. **可以微调措辞、视角、强调点、情绪色彩**——让这条记忆"听起来"像在此刻被想起时的样子。
3. **细微变化，不要剧烈改写**。这是漂移，不是重写。比如：
   - "我手滑把整袋猫粮撒地上了" → 焦虑下可能变成 "我笨手笨脚地把整袋猫粮撒一地"
   - "我蹲下捡了二十分钟" → 温暖下可能变成 "我蹲着捡了好一会儿"
4. **字数和原文相近**，不能差太多。
5. **不要解释，不要加引号，不要 metadata**——直接输出新的一句话即可。

新版本：`;
}

// ---------------------------------------------------------------------------
// Fragment extraction prompt — used for visitor-authored custom stories
// ---------------------------------------------------------------------------

/**
 * Take a visitor's free-form story and decompose it into atomic memory
 * fragments + suggested questions. The valence/salience labels are
 * critical: without them, mood-biased retrieval has nothing to work with.
 *
 * The LLM has to act as a "memory curator" — picking the right
 * granularity, the right emotional charge, and the right vividness.
 */
export function buildExtractFragmentsPrompt(args: { body: string }): string {
  return `你是一个记忆建模助手。下面这段故事将被一个"记忆型 AI"听到——这个 AI 会把故事分解成零散的记忆碎片，之后在不同心情下重新组合出回忆。

为了让这个记忆系统正常工作，你需要把下面这段故事分解成 **10-16 条原子记忆碎片**，并给每条碎片标注两个数字：

1. **valence**（-1 到 +1）：这条碎片的情感色彩。
   - -1 = 深度负面（羞耻、悲伤、恐惧、痛苦）
   - 0 = 中性（事实陈述、背景描述）
   - +1 = 深度正面（温暖、喜悦、释然、惊喜）

2. **salience**（0 到 1）：这条碎片的鲜明度——多容易被想起。
   - 0.9+ = 关键事件、强烈感官印象、情绪冲击大的瞬间
   - 0.6-0.85 = 重要细节、有色彩的具体描述
   - 0.4-0.6 = 一般情节、推进性的事实
   - 0.2-0.4 = 背景信息、过场细节

碎片的写法：
- 每条只承载一个事实或一个画面
- **不要复述整段**——切成可拼装的最小单元
- **保留具体的感官细节和具体引语**——名字、地点、引号里的话、颜色、数字
- **不要解读、不要加评论**——保持原文的措辞和语气
- 用第一人称（如果原文是第一人称）

然后再生成 **4-5 条适合问 AI 的问题**：
- 开放式
- 第二人称（"你..."）
- 能让 AI 在不同心情下给出不同回忆
- 至少有一条是关于故事里的某个谜或留白

**重要——JSON 格式要求**：
- 如果碎片文本里需要包含引号（例如人物的直接引语），请使用中文全角引号 \`""\` 或 \`''\`，**绝对不要使用半角双引号 \`"\`**——半角双引号会破坏 JSON 字符串的边界。
- 即使原文用的是 \`"..."\`，你在 JSON 里也要替换成 \`"..."\` 或 \`'...'\`。

故事：
"""
${args.body}
"""

返回严格的 JSON，不要任何额外文字、不要 markdown 代码块。格式：

{
  "fragments": [
    { "text": "碎片文本", "valence": -0.5, "salience": 0.8 }
  ],
  "suggestedQuestions": [
    "那天发生了什么？",
    "..."
  ]
}

只返回 JSON。`;
}

// ---------------------------------------------------------------------------
// MECHANISM 9: Reflection prompt — generate higher-order insights
// ---------------------------------------------------------------------------

/**
 * Triggered every N recalls. Asks the AI to look at its recent recalls
 * and form 1-3 higher-order observations about itself, the event, or
 * the people involved.
 *
 * These insights are written back as new "reflection" fragments, which
 * have higher salience and influence future recalls. This is where
 * episodic memory becomes semantic belief.
 */
export function buildReflectionPrompt(args: {
  moodKey: MoodKey;
  recentRecalls: Recall[];
}): string {
  const mood = MOODS[args.moodKey];
  const recallSummaries = args.recentRecalls
    .map((r, i) => {
      const moodLabel = MOODS[r.moodKey].label;
      return `[回忆 ${i + 1}, 心情=${moodLabel}, 问题="${r.question}"]
${r.text}`;
    })
    .join("\n\n---\n\n");

  return `你最近多次回忆同一件事。每次的版本不太一样，因为每次的心情不同。现在你停下来，对这些回忆做一个反思——形成一些更高层的看法。

你此刻的心情：${mood.description}

你最近的几次回忆：

${recallSummaries}

请基于这些回忆形成 **1-3 条更高层的看法**——它们应该是：

- **抽象层面的观察**：不是描述具体场景，而是形成关于"这件事说明了什么"或"我是谁"或"他们是怎样的人"的一般性结论
- **简短**：每条不超过 30 个字
- **第一人称**：用"我"，像内心独白
- **可能带有此刻心情的色彩**：焦虑下的反思更悲观、温暖下的反思更宽容
- **可能是错的**：反思不需要客观正确，它就是此刻的你"想通了什么"

例子（参考格式，不要照搬）：
- "我们公司其实更看重那只猫，而不是员工。"
- "我已经成了那个'打翻猫粮的人'，再也撕不掉这个标签。"
- "回头看挺好玩的，那种公司不待也罢。"

返回严格的 JSON，不要任何额外文字：

{
  "insights": [
    "第一条看法",
    "第二条看法"
  ]
}

如果你觉得没什么好反思的，返回 {"insights": []}。

只返回 JSON。`;
}

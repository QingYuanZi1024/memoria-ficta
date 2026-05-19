"use client";

import type { Fragment, Recall, Reflection } from "@/lib/types";

interface Props {
  fragments: Fragment[];
  recalls: Recall[];
  reflections: Reflection[];
  initialFragmentCount: number;
}

/**
 * The "the library is changing" panel.
 *
 * Now also shows the tier-B mechanisms:
 *   - How many confabulations have become "real" memories
 *   - How many fragments have been rewritten (and by how many drifts)
 *   - How many reflections have happened
 */
export function MechanismStats({
  fragments,
  recalls,
  reflections,
  initialFragmentCount,
}: Props) {
  const totalFragments = fragments.length;

  // A flipped confabulation: source has been promoted to "original",
  // but bornUnderMood records the mood the lie was born in. Reflections
  // never flip (see applyProvenanceFading), so this filter is unambiguous.
  const flippedToOriginal = fragments.filter(
    (f) => f.source === "original" && !!f.bornUnderMood,
  ).length;
  const stillConfabulated = fragments.filter(
    (f) => f.source === "confabulated",
  ).length;
  const reflectionFragments = fragments.filter(
    (f) => f.source === "reflection",
  ).length;

  const totalRewrites = fragments.reduce(
    (sum, f) => sum + (f.rewriteHistory?.length ?? 0),
    0,
  );
  const rewrittenFragments = fragments.filter(
    (f) => (f.rewriteHistory?.length ?? 0) > 0,
  ).length;

  const originalRemaining = fragments.filter(
    (f) => f.source === "original" && !f.bornUnderMood,
  ).length;
  const originalLost = initialFragmentCount - originalRemaining;

  const totalConfabs = recalls.reduce(
    (sum, r) => sum + r.confabulations.length,
    0,
  );

  if (recalls.length === 0) {
    return (
      <div className="font-sans text-xs text-ink-400 italic">
        让它回忆一次，这里会开始显示记忆库的变化。
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-xs">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-ink-400 mb-2">
          记忆库现状
        </div>
        <div className="space-y-1 text-ink-700">
          <div className="flex justify-between">
            <span>原始碎片留存</span>
            <span className="tabular-nums">
              {originalRemaining} / {initialFragmentCount}
            </span>
          </div>
          {originalLost > 0 && (
            <div className="flex justify-between text-wax">
              <span>已被遗忘</span>
              <span className="tabular-nums">{originalLost} 条</span>
            </div>
          )}
          {stillConfabulated > 0 && (
            <div className="flex justify-between text-wax">
              <span>明知是脑补的</span>
              <span className="tabular-nums">{stillConfabulated} 条</span>
            </div>
          )}
          {flippedToOriginal > 0 && (
            <div className="flex justify-between text-ink-900 font-medium">
              <span>已"信以为真"的脑补</span>
              <span className="tabular-nums">{flippedToOriginal} 条</span>
            </div>
          )}
          {reflectionFragments > 0 && (
            <div
              className="flex justify-between"
              style={{ color: "rgb(140, 100, 30)" }}
            >
              <span>反思形成的信念</span>
              <span className="tabular-nums">{reflectionFragments} 条</span>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t border-ink-300/20 mt-1">
            <span>现库存合计</span>
            <span className="tabular-nums font-medium">
              {totalFragments} 条
            </span>
          </div>
        </div>
      </div>

      {totalRewrites > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink-400 mb-2">
            记忆的漂移
          </div>
          <div className="space-y-1 text-ink-700">
            <div className="flex justify-between">
              <span>被改写过的碎片</span>
              <span className="tabular-nums">{rewrittenFragments} 条</span>
            </div>
            <div className="flex justify-between">
              <span>累计改写次数</span>
              <span className="tabular-nums">{totalRewrites} 次</span>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="text-[10px] uppercase tracking-widest text-ink-400 mb-2">
          累计回忆
        </div>
        <div className="space-y-1 text-ink-700">
          <div className="flex justify-between">
            <span>回忆次数</span>
            <span className="tabular-nums">{recalls.length} 次</span>
          </div>
          <div className="flex justify-between">
            <span>累计脑补</span>
            <span className="tabular-nums">{totalConfabs} 处</span>
          </div>
          {reflections.length > 0 && (
            <div className="flex justify-between">
              <span>反思发生</span>
              <span className="tabular-nums">{reflections.length} 次</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

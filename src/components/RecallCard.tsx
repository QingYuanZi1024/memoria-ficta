"use client";

import { motion } from "framer-motion";
import type { Recall } from "@/lib/types";
import { MOODS } from "@/lib/moods";

interface Props {
  recall: Recall;
  index: number;
}

/**
 * Highlight confabulated phrases inline in the recall text.
 * We do a greedy left-to-right match for each confabulation's "content"
 * string in the recall. If a string can't be found, we silently skip it.
 */
function highlightConfabulations(
  text: string,
  confabs: { content: string; type: string; why: string }[],
): React.ReactNode[] {
  if (confabs.length === 0) return [text];

  // Sort confabs by their position in text. If a confab is not found, drop it.
  const positions: {
    start: number;
    end: number;
    flag: { content: string; type: string; why: string };
  }[] = [];

  for (const flag of confabs) {
    const idx = text.indexOf(flag.content);
    if (idx === -1) continue;
    positions.push({ start: idx, end: idx + flag.content.length, flag });
  }

  // Sort and resolve overlaps by keeping the first one
  positions.sort((a, b) => a.start - b.start);
  const resolved: typeof positions = [];
  for (const p of positions) {
    const last = resolved[resolved.length - 1];
    if (!last || p.start >= last.end) {
      resolved.push(p);
    }
  }

  // Now stitch the output
  const result: React.ReactNode[] = [];
  let cursor = 0;
  for (let i = 0; i < resolved.length; i++) {
    const p = resolved[i];
    if (cursor < p.start) {
      result.push(text.slice(cursor, p.start));
    }
    result.push(
      <span
        key={`conf-${i}`}
        className="confab-mark"
        title={`${p.flag.type}: ${p.flag.why}`}
      >
        {text.slice(p.start, p.end)}
      </span>,
    );
    cursor = p.end;
  }
  if (cursor < text.length) {
    result.push(text.slice(cursor));
  }
  return result;
}

export function RecallCard({ recall, index }: Props) {
  const mood = MOODS[recall.moodKey];

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="parchment-card p-5 sm:p-6 md:p-8 relative"
    >
      <header className="flex justify-between items-baseline mb-4 pb-3 border-b border-ink-300/20 gap-2 flex-wrap">
        <div className="font-sans text-[11px] uppercase tracking-widest text-ink-400">
          回忆 №{String(index + 1).padStart(2, "0")} · {mood.label}
        </div>
        <div className="font-sans text-[11px] text-ink-400 flex items-center gap-3 flex-wrap">
          {recall.rewrittenFragmentIds && recall.rewrittenFragmentIds.length > 0 && (
            <span title="此次回忆中，部分记忆碎片被悄悄改写">
              ✎ {recall.rewrittenFragmentIds.length} 条碎片被改写
            </span>
          )}
          {recall.confabulations.length > 0 && (
            <span>⚠ {recall.confabulations.length} 处脑补</span>
          )}
          {recall.triggeredReflection && (
            <span style={{ color: "rgb(140,100,30)" }}>
              ◆ 触发了反思
            </span>
          )}
        </div>
      </header>

      <div className="font-sans text-xs text-ink-400 mb-3 italic">
        问：{recall.question}
      </div>

      <div className="font-serif text-base sm:text-lg leading-relaxed text-ink-800 drop-cap whitespace-pre-wrap">
        {highlightConfabulations(recall.text, recall.confabulations)}
      </div>

      {recall.confabulations.length > 0 && (
        <details className="mt-5 pt-3 border-t border-ink-300/20 font-sans text-xs">
          <summary className="cursor-pointer text-ink-500 hover:text-ink-800 select-none">
            查看这次回忆中脑补的细节
          </summary>
          <ul className="mt-3 space-y-2">
            {recall.confabulations.map((c, i) => (
              <li key={i} className="text-ink-700">
                <span className="text-wax font-medium">{c.type}</span>{" "}
                <span className="italic">「{c.content}」</span>
                <div className="text-ink-400 mt-0.5">{c.why}</div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </motion.article>
  );
}

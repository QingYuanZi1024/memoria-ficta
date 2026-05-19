"use client";

import { motion } from "framer-motion";
import type { Reflection } from "@/lib/types";
import { MOODS } from "@/lib/moods";

interface Props {
  reflections: Reflection[];
}

/**
 * The AI's own meta-observations. Triggered every 5 recalls.
 *
 * Visually: a separate section, soft amber tint, italic — to make
 * clear these aren't memories of events, they're "what the AI now
 * believes" about itself / the event / the people involved.
 *
 * This is where episodic memory becomes semantic belief, and this
 * panel is the most psychologically loaded part of the demo.
 */
export function ReflectionPanel({ reflections }: Props) {
  if (reflections.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="font-sans text-[10px] uppercase tracking-widest text-ink-400 mb-3">
        它对这件事的看法
      </div>

      <div className="space-y-3">
        {[...reflections].reverse().map((r, i) => {
          const mood = MOODS[r.underMood];
          const sentences = r.text
            .split(/(?<=[。！？\.\!\?])\s+/)
            .filter((s) => s.trim().length > 0);

          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="parchment-card p-4 sm:p-5 relative"
              style={{
                background:
                  "linear-gradient(135deg, rgba(247, 240, 221, 1) 0%, rgba(245, 232, 200, 1) 100%)",
                borderLeft: "3px solid rgba(180, 130, 50, 0.7)",
              }}
            >
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-sans text-[10px] uppercase tracking-widest text-ink-400">
                  反思 №{String(reflections.length - i).padStart(2, "0")} ·{" "}
                  {mood.label}下
                </span>
              </div>
              <div className="space-y-1.5 font-serif italic text-ink-800 text-[15px] sm:text-base leading-relaxed">
                {sentences.map((s, j) => (
                  <p key={j}>"{s.trim()}"</p>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

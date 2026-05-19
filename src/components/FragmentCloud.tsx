"use client";

import { motion, AnimatePresence } from "framer-motion";
import { fragmentColor } from "@/lib/memory";
import type { Fragment } from "@/lib/types";

interface Props {
  fragments: Fragment[];
  highlightIds?: Set<string>;
}

/**
 * Memory library visualized as a parchment-style scatter cloud.
 *
 * X axis = valence (-1 left, +1 right) — emotional tone
 * Y axis = salience (0 bottom, 1 top) — vividness
 *
 * Color encodes provenance:
 *   - Deep ink:       original story fragment
 *   - Wax red:        freshly confabulated (the AI knows it made this up)
 *   - Reddish-brown:  confabulation mid-fade (still labeled invented, but barely)
 *   - Deep ink again: confabulation that has fully become "real memory"
 *   - Amber:          reflection (a high-order insight, not an episode)
 *
 * Size encodes salience. Glow encodes "just retrieved this turn."
 */
export function FragmentCloud({ fragments, highlightIds }: Props) {
  const W = 100;
  const H = 100;

  // Sort so faint goes back, vivid in front; reflections always on top
  const sorted = [...fragments].sort((a, b) => {
    if (a.source === "reflection" && b.source !== "reflection") return 1;
    if (b.source === "reflection" && a.source !== "reflection") return -1;
    return a.salience - b.salience;
  });

  return (
    <div className="relative w-full h-full">
      {/* Axis labels */}
      <div className="absolute inset-x-0 -bottom-1 flex justify-between text-[10px] uppercase tracking-widest text-ink-400 font-sans px-2 pointer-events-none">
        <span>negative</span>
        <span>positive</span>
      </div>
      <div className="absolute -left-1 inset-y-0 flex flex-col justify-between text-[10px] uppercase tracking-widest text-ink-400 font-sans py-2 pointer-events-none">
        <span style={{ writingMode: "vertical-rl" }} className="rotate-180">vivid</span>
        <span style={{ writingMode: "vertical-rl" }} className="rotate-180">faint</span>
      </div>

      <div className="absolute inset-0 m-6">
        {/* Subtle axis lines */}
        <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-ink-300/30" />
        <div className="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-ink-300/30" />

        <AnimatePresence>
          {sorted.map((f) => {
            const x = ((f.valence + 1) / 2) * W;
            const y = (1 - f.salience) * H;

            const isHighlighted = highlightIds?.has(f.id) ?? false;
            const color = fragmentColor(f);
            const isReflection = f.source === "reflection";

            // Size grows with salience; reflections slightly larger
            const baseSize = isReflection ? 8 : 6;
            const size = baseSize + f.salience * 16;

            // Confidence drives opacity intensity — low-confidence
            // confabulations look slightly "ghosty" to hint at their
            // tentative status
            const opacity = isHighlighted
              ? 1
              : 0.55 + 0.35 * (f.sourceConfidence ?? 1);

            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity,
                  scale: isHighlighted ? 1.15 : 1,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute group cursor-pointer"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* The dot itself */}
                <div
                  className="rounded-full transition-shadow"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    background: color,
                    border: isReflection
                      ? "1.5px solid rgba(120, 80, 20, 0.7)"
                      : "none",
                    boxShadow: isHighlighted
                      ? `0 0 ${size}px ${color}99`
                      : "none",
                  }}
                />
                {/* Tooltip on hover */}
                <div className="absolute z-10 left-1/2 -translate-x-1/2 top-full mt-2 px-2.5 py-1.5 bg-ink-900 text-parchment-50 text-xs whitespace-nowrap rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity max-w-xs">
                  <div className="font-serif">{f.text}</div>
                  <div className="text-ink-300 text-[10px] mt-0.5 font-sans">
                    {f.source === "reflection" && <>反思 · </>}
                    {f.source === "confabulated" && <>脑补 · </>}
                    {f.source === "original" &&
                      (f.sourceConfidence ?? 1) >= 1 &&
                      f.rewriteHistory?.length ? (
                      <>原文 ({f.rewriteHistory.length}× 改写) · </>
                    ) : f.source === "original" ? (
                      <>原文 · </>
                    ) : null}
                    salience {f.salience.toFixed(2)} ·{" "}
                    确信度 {(f.sourceConfidence ?? 1).toFixed(2)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

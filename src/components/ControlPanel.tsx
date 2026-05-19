"use client";

import { useState } from "react";
import type { MoodKey } from "@/lib/types";
import { MOODS, MOOD_ORDER } from "@/lib/moods";
import type { Story } from "@/lib/types";

interface Props {
  story: Story;
  onRecall: (mood: MoodKey, question: string) => void;
  disabled: boolean;
  progressMessage: string;
}

export function ControlPanel({ story, onRecall, disabled, progressMessage }: Props) {
  const [moodKey, setMoodKey] = useState<MoodKey>("neutral");
  const [question, setQuestion] = useState(story.suggestedQuestions[0]);
  const [customQuestion, setCustomQuestion] = useState("");

  const handleRecall = () => {
    const q = customQuestion.trim() || question;
    onRecall(moodKey, q);
  };

  return (
    <div className="parchment-card p-5 sm:p-6 space-y-5">
      {/* Mood selector */}
      <div>
        <div className="font-sans text-[10px] uppercase tracking-widest text-ink-400 mb-2">
          它此刻的心情
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MOOD_ORDER.map((k) => {
            const m = MOODS[k];
            const active = moodKey === k;
            return (
              <button
                key={k}
                onClick={() => setMoodKey(k)}
                disabled={disabled}
                className={`py-2 px-3 text-sm font-serif border transition-all ${
                  active
                    ? "border-ink-800 bg-ink-800 text-parchment-50"
                    : "border-ink-300/40 text-ink-700 hover:border-ink-500"
                } disabled:opacity-50`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink-500 italic font-serif leading-snug">
          {MOODS[moodKey].description}
        </p>
      </div>

      {/* Question selector */}
      <div>
        <div className="font-sans text-[10px] uppercase tracking-widest text-ink-400 mb-2">
          有人问它
        </div>
        <div className="space-y-1.5">
          {story.suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuestion(q);
                setCustomQuestion("");
              }}
              disabled={disabled}
              className={`block w-full text-left text-sm py-1.5 px-2 font-serif transition-colors ${
                question === q && !customQuestion
                  ? "text-ink-900 bg-ink-300/15"
                  : "text-ink-600 hover:text-ink-900"
              } disabled:opacity-50`}
            >
              {q}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          placeholder="或者问点别的..."
          disabled={disabled}
          className="mt-3 w-full bg-transparent border-b border-ink-300/40 focus:border-ink-700 outline-none px-1 py-1 text-sm font-serif italic placeholder:text-ink-300 disabled:opacity-50"
        />
      </div>

      {/* The recall button */}
      <button
        onClick={handleRecall}
        disabled={disabled}
        className="w-full py-3 bg-ink-900 text-parchment-50 font-serif text-base tracking-wide hover:bg-ink-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {disabled && progressMessage ? (
          <span className="thinking-dots inline-flex items-center gap-1">
            {progressMessage}
            <span>·</span>
            <span>·</span>
            <span>·</span>
          </span>
        ) : (
          "让它回忆"
        )}
      </button>
    </div>
  );
}

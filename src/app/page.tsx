"use client";

import { useEffect, useMemo, useState } from "react";
import { ControlPanel } from "@/components/ControlPanel";
import { FragmentCloud } from "@/components/FragmentCloud";
import { MechanismStats } from "@/components/MechanismStats";
import { RecallCard } from "@/components/RecallCard";
import { ReflectionPanel } from "@/components/ReflectionPanel";
import {
  getStory,
  loadCustomStories,
  saveCustomStories,
  isCustomStoryId,
  STORIES,
} from "@/data/stories";
import { useMemorySession } from "@/lib/useMemorySession";
import type { Story } from "@/lib/types";

// Minimal **bold** inline renderer for story bodies. Splits on `**…**`
// segments and wraps the captured text in <strong>. Leaves everything else
// (including the surrounding whitespace-pre-wrap) intact.
function renderWithBold(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

const DEFAULT_STORY_ID = "bosss-cat";
const CURRENT_STORY_KEY = "memoria-ficta.currentStory.v2";

export default function Home() {
  const [storyId, setStoryId] = useState<string>(DEFAULT_STORY_ID);
  const [customStories, setCustomStories] = useState<Story[]>([]);

  // Custom story authoring panel state
  const [authoringOpen, setAuthoringOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [authoringError, setAuthoringError] = useState<string | null>(null);

  // Restore last-viewed story + custom story list on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const customs = loadCustomStories();
    setCustomStories(customs);
    try {
      const saved = localStorage.getItem(CURRENT_STORY_KEY);
      if (saved) {
        const known =
          STORIES.some((s) => s.id === saved) ||
          customs.some((s) => s.id === saved);
        if (known) setStoryId(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist current story on switch.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(CURRENT_STORY_KEY, storyId);
    } catch {
      // ignore
    }
  }, [storyId]);

  const allStories = useMemo(
    () => [...STORIES, ...customStories],
    [customStories],
  );

  const story =
    allStories.find((s) => s.id === storyId) ?? getStory(DEFAULT_STORY_ID)!;
  const { session, progress, lastError, recall, reset } =
    useMemorySession(storyId);

  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session || session.recalls.length === 0) {
      setHighlightIds(new Set());
      return;
    }
    const last = session.recalls[session.recalls.length - 1];
    setHighlightIds(new Set(last.retrievedFragmentIds));
  }, [session?.recalls]);

  const initialFragmentCount = story.initialFragments.length;
  const reversedRecalls = useMemo(
    () => (session ? [...session.recalls].reverse() : []),
    [session?.recalls],
  );

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-400 font-serif italic">
        ...
      </div>
    );
  }

  const isWorking = progress.stage !== "idle";

  const handleCreateCustomStory = async () => {
    const title = draftTitle.trim();
    const body = draftBody.trim();
    if (!title || body.length < 20) {
      setAuthoringError("标题不能为空，正文至少 20 字。");
      return;
    }
    setAuthoringError(null);
    setExtracting(true);

    try {
      const res = await fetch("/api/extract-fragments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `提取失败 (${res.status})`);
      }
      const data = (await res.json()) as {
        fragments: { text: string; valence: number; salience: number }[];
        suggestedQuestions: string[];
      };

      const newStory: Story = {
        id: `custom-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        title,
        subtitle: "自定义故事",
        body,
        initialFragments: data.fragments,
        suggestedQuestions:
          data.suggestedQuestions.length > 0
            ? data.suggestedQuestions
            : ["那天发生了什么？", "再讲一遍那个故事。"],
      };

      const updated = [...customStories, newStory];
      setCustomStories(updated);
      saveCustomStories(updated);
      setDraftTitle("");
      setDraftBody("");
      setAuthoringOpen(false);
      setStoryId(newStory.id);
    } catch (e) {
      setAuthoringError(e instanceof Error ? e.message : String(e));
    } finally {
      setExtracting(false);
    }
  };

  const handleDeleteCustomStory = (id: string) => {
    if (!confirm("删除这个自定义故事及其所有回忆？")) return;
    const updated = customStories.filter((s) => s.id !== id);
    setCustomStories(updated);
    saveCustomStories(updated);
    // Also wipe its session storage
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.includes(id)) keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore
      }
    }
    // If we just deleted the current story, fall back to default
    if (id === storyId) setStoryId(DEFAULT_STORY_ID);
  };

  const controlPanel = (
    <>
      <ControlPanel
        key={story.id}
        story={story}
        onRecall={recall}
        disabled={isWorking}
        progressMessage={progress.message}
      />
      {lastError && (
        <div className="parchment-card p-4 border-wax/30">
          <div className="font-sans text-xs text-wax">
            出错了：{lastError}
          </div>
        </div>
      )}
    </>
  );

  const cloudAndStats = (
    <>
      {/* Cloud */}
      <div className="parchment-card p-4 sm:p-5">
        <div className="font-sans text-[10px] uppercase tracking-widest text-ink-400 mb-2">
          它的记忆库
        </div>
        <div className="aspect-square w-full relative">
          <FragmentCloud
            fragments={session.fragments}
            highlightIds={highlightIds}
          />
        </div>
        <div className="grid grid-cols-2 gap-y-1 mt-3 font-sans text-[10px] text-ink-500">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: "rgb(42,31,26)" }}
            />
            原文
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: "rgb(155,48,39)" }}
            />
            脑补（新）
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: "rgb(98,40,32)" }}
            />
            脑补（淡化中）
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full border border-amber-700/50"
              style={{ background: "rgb(180,130,50)" }}
            />
            反思
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="parchment-card p-4 sm:p-5">
        <MechanismStats
          fragments={session.fragments}
          recalls={session.recalls}
          reflections={session.reflections}
          initialFragmentCount={initialFragmentCount}
        />
      </div>
    </>
  );

  return (
    <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-12 py-6 sm:py-10 md:py-14 lg:py-16">
      {/* Masthead */}
      <header className="mb-8 sm:mb-12 md:mb-16">
        <div className="flex items-start sm:items-baseline justify-between flex-wrap gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl tracking-tight text-ink-900 leading-[0.95]">
              Memoria Ficta
            </h1>
            <p className="mt-1.5 sm:mt-2 font-serif italic text-ink-500 text-sm sm:text-base">
              — I tell stories together with myself.
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm("清除这段记忆，重新开始？")) reset();
            }}
            disabled={progress.stage !== "idle"}
            className="font-sans text-[10px] sm:text-[11px] uppercase tracking-widest text-ink-400 hover:text-ink-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-ink-400 shrink-0"
          >
            清除记忆 / 重新开始
          </button>
        </div>
      </header>

      {/* Story picker */}
      <section className="mb-6 sm:mb-8 max-w-3xl">
        <div className="font-sans text-[10px] uppercase tracking-widest text-ink-400 mb-3">
          选一个故事
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {allStories.map((s) => {
            const active = s.id === storyId;
            const isCustom = isCustomStoryId(s.id);
            return (
              <span key={s.id} className="relative inline-flex group">
                <button
                  onClick={() => {
                    if (s.id !== storyId) setStoryId(s.id);
                  }}
                  disabled={isWorking}
                  title={s.subtitle}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-serif border transition-all ${
                    active
                      ? "border-ink-800 bg-ink-800 text-parchment-50"
                      : "border-ink-300/40 text-ink-700 hover:border-ink-500"
                  } ${isCustom ? "italic" : ""} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {s.title}
                </button>
                {isCustom && !isWorking && (
                  <button
                    onClick={() => handleDeleteCustomStory(s.id)}
                    title="删除这个自定义故事"
                    className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] leading-none opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ${
                      active
                        ? "bg-parchment-50 text-ink-800 border border-ink-700"
                        : "bg-ink-800 text-parchment-50 border border-ink-800"
                    }`}
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
          <button
            onClick={() => setAuthoringOpen((v) => !v)}
            disabled={isWorking}
            className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-serif border border-dashed transition-all ${
              authoringOpen
                ? "border-ink-700 text-ink-900"
                : "border-ink-300/60 text-ink-500 hover:border-ink-500 hover:text-ink-800"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            ＋ 写一个自己的
          </button>
        </div>

        {authoringOpen && (
          <div className="parchment-card mt-4 p-4 sm:p-5 space-y-3">
            <div className="font-sans text-[10px] uppercase tracking-widest text-ink-400">
              写一个属于你自己的故事
            </div>
            <p className="font-serif italic text-ink-500 text-xs leading-snug">
              输入标题和正文。系统会用 LLM 把你的故事自动拆解成带有情感和鲜明度的记忆碎片——之后你就能像对其他故事一样让它"回忆"。
            </p>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="标题（比如：那年夏天的渡口）"
              disabled={extracting}
              maxLength={40}
              className="w-full bg-transparent border-b border-ink-300/40 focus:border-ink-700 outline-none px-1 py-1.5 text-base font-serif placeholder:text-ink-300 disabled:opacity-50"
            />
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              placeholder="把故事写在这里。第一人称、具体的场景、有情绪起伏的事件最适合这个 demo。200-800 字最理想。"
              disabled={extracting}
              rows={6}
              maxLength={4000}
              className="w-full bg-transparent border border-ink-300/40 focus:border-ink-700 outline-none p-3 text-sm font-serif placeholder:text-ink-300 resize-y disabled:opacity-50 min-h-[140px] sm:min-h-[180px]"
            />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-sans text-[10px] text-ink-400">
                {draftBody.length} / 4000 字
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthoringOpen(false);
                    setAuthoringError(null);
                  }}
                  disabled={extracting}
                  className="px-3 py-1.5 text-sm font-serif text-ink-500 hover:text-ink-800 disabled:opacity-40"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateCustomStory}
                  disabled={
                    extracting ||
                    draftTitle.trim().length === 0 ||
                    draftBody.trim().length < 20
                  }
                  className="px-4 py-1.5 text-sm font-serif bg-ink-900 text-parchment-50 hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {extracting ? "正在拆解记忆碎片..." : "保存并开始"}
                </button>
              </div>
            </div>
            {authoringError && (
              <div className="font-sans text-xs text-wax">
                出错了：{authoringError}
              </div>
            )}
          </div>
        )}
      </section>

      {authoringOpen && (
        <div className="font-sans text-[10px] uppercase tracking-widest text-ink-400 italic mb-4 max-w-3xl">
          ↓ 以下是当前故事「{story.title}」的状态——你正在写新故事
        </div>
      )}

      {/* Everything below the picker dims while the authoring panel is open */}
      <div
        className={`transition-opacity duration-300 ${
          authoringOpen ? "opacity-40 pointer-events-none" : "opacity-100"
        }`}
        aria-hidden={authoringOpen}
      >
      {/* The story */}
      <section className="mb-8 sm:mb-10 max-w-3xl">
        <div className="font-sans text-[10px] uppercase tracking-widest text-ink-400 mb-3">
          你告诉它的故事
        </div>
        <h2 className="font-serif text-xl sm:text-2xl md:text-[26px] text-ink-900 mb-1">
          {story.title}
        </h2>
        <p className="font-serif italic text-ink-500 mb-3 text-xs sm:text-sm">
          {story.subtitle}
        </p>
        <div className="font-serif text-ink-700 whitespace-pre-wrap text-[15px] sm:text-base leading-[1.85]">
          {renderWithBold(story.body)}
        </div>
      </section>

      <div className="border-t border-ink-300/30 my-8 sm:my-10" />

      {/* The lab */}
      <section className="lg:grid lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px] gap-8 lg:gap-10 xl:gap-12">
        {/* Mobile/tablet: ControlPanel sits between story and recalls */}
        <div className="lg:hidden mb-6 space-y-6">{controlPanel}</div>

        {/* Recalls (left column on desktop) */}
        <div className="lg:order-1 min-w-0">
          {/* Reflections sit ABOVE recalls — they are the "headline" */}
          <ReflectionPanel reflections={session.reflections} />

          <div className="font-sans text-[10px] uppercase tracking-widest text-ink-400 mb-4">
            它的回忆 ({session.recalls.length})
          </div>

          {session.recalls.length === 0 ? (
            <div className="parchment-card p-8 sm:p-12 text-center flex flex-col items-center justify-center lg:min-h-[640px]">
              <div className="font-serif italic text-ink-300 text-3xl mb-6 select-none">
                ⁕
              </div>
              <p className="font-serif italic text-ink-500 text-base sm:text-lg leading-relaxed max-w-md">
                <span className="lg:hidden">在上面选一个心情，问它点什么。</span>
                <span className="hidden lg:inline">在右边选一个心情，问它点什么。</span>
              </p>
              <p className="font-serif italic text-ink-400 text-sm sm:text-base leading-relaxed max-w-md mt-3">
                它的回忆会从这里开始累积。
              </p>
              <div className="font-sans text-[10px] uppercase tracking-widest text-ink-300 mt-10 select-none">
                — 尚未开始 —
              </div>
            </div>
          ) : (
            <div className="space-y-5 sm:space-y-6">
              {reversedRecalls.map((r, i) => (
                <RecallCard
                  key={r.id}
                  recall={r}
                  index={session.recalls.length - 1 - i}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mobile/tablet: Cloud + Stats sit BELOW recalls (separate from ControlPanel) */}
        <div className="lg:hidden mt-8 space-y-6">{cloudAndStats}</div>

        {/* Desktop only: right sticky aside contains everything */}
        <aside className="hidden lg:block lg:order-2 space-y-6">
          <div className="sticky top-6 space-y-6">
            {controlPanel}
            {cloudAndStats}
          </div>
        </aside>
      </section>
      </div>{/* /dimming wrapper */}

      {/* Footer */}
      <footer className="mt-16 sm:mt-20 pt-6 border-t border-ink-300/30 font-sans text-[11px] sm:text-xs text-ink-400 flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-3 text-center sm:text-left">
        <span>
          Memoria Ficta — an experiment in reconstructive memory for AI agents.
        </span>
        <span>Memory persists in this browser only.</span>
      </footer>
    </main>
  );
}

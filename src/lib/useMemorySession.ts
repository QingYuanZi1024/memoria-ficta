"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getStory } from "@/data/stories";
import {
  applyPostRecallMechanics,
  commitFragmentRewrites,
  commitReflection,
  makeFragmentId,
  retrieveFragments,
  selectFragmentsToRewrite,
  shouldReflect,
} from "@/lib/memory";
import type {
  ConfabulationFlag,
  Fragment,
  MoodKey,
  Recall,
  Reflection,
  SessionState,
} from "@/lib/types";

const STORAGE_KEY_PREFIX = "memoria-ficta.session.";
// Bump this whenever the schema changes — old sessions get wiped
const SCHEMA_VERSION = "v2";

function storageKey(storyId: string): string {
  return `${STORAGE_KEY_PREFIX}${SCHEMA_VERSION}.${storyId}`;
}

function loadSession(storyId: string): SessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(storyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionState;
    if (parsed?.storyId !== storyId) return null;
    if (!Array.isArray(parsed.reflections)) parsed.reflections = [];
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(state: SessionState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(state.storyId), JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

function initializeSession(storyId: string): SessionState {
  const story = getStory(storyId);
  if (!story) throw new Error(`Unknown story: ${storyId}`);
  const now = Date.now();
  const fragments: Fragment[] = story.initialFragments.map((f) => ({
    id: makeFragmentId(),
    text: f.text,
    valence: f.valence,
    salience: f.salience,
    source: "original" as const,
    sourceConfidence: 1.0, // originals are fully "trusted" memories
    retrievalCount: 0,
    createdAt: now,
  }));
  return {
    storyId,
    fragments,
    recalls: [],
    reflections: [],
    startedAt: now,
  };
}

export interface RecallProgress {
  stage: "idle" | "thinking" | "detecting" | "rewriting" | "reflecting" | "consolidating";
  message: string;
}

const PROGRESS_MESSAGES: Record<RecallProgress["stage"], string> = {
  idle: "",
  thinking: "正在回想...",
  detecting: "正在分辨真伪...",
  rewriting: "记忆正在被悄悄改写...",
  reflecting: "正在反思过去的回忆...",
  consolidating: "正在重组记忆...",
};

export function useMemorySession(storyId: string) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [progress, setProgress] = useState<RecallProgress>({
    stage: "idle",
    message: "",
  });
  const [lastError, setLastError] = useState<string | null>(null);
  // Bumped on reset (or any other event that invalidates an in-flight recall).
  // A recall captures the epoch at start and refuses to commit if it has changed.
  const epochRef = useRef(0);

  useEffect(() => {
    // Switching stories invalidates any in-flight recall against the
    // previous story — its post-await commit must not write into the new
    // story's session.
    epochRef.current += 1;
    setProgress({ stage: "idle", message: "" });
    setLastError(null);

    const existing = loadSession(storyId);
    if (existing) {
      setSession(existing);
    } else {
      const fresh = initializeSession(storyId);
      setSession(fresh);
      saveSession(fresh);
    }
  }, [storyId]);

  const reset = useCallback(() => {
    epochRef.current += 1;
    const fresh = initializeSession(storyId);
    setSession(fresh);
    saveSession(fresh);
    setProgress({ stage: "idle", message: "" });
    setLastError(null);
  }, [storyId]);

  const setStage = (stage: RecallProgress["stage"]) => {
    setProgress({ stage, message: PROGRESS_MESSAGES[stage] });
  };

  const recall = useCallback(
    async (moodKey: MoodKey, question: string) => {
      if (!session) return;
      setLastError(null);

      // Capture epoch; if a reset (or another invalidation) happens mid-flight,
      // any subsequent commit will bail rather than clobber fresh state.
      const myEpoch = epochRef.current;
      const isStale = () => epochRef.current !== myEpoch;

      // Stable ID for this recall, used in both the reflection's fromRecallIds
      // and the final Recall record committed to session state.
      const recallId = `recall-${Date.now()}`;

      // ----- Stage 1: retrieve fragments locally -----
      const retrieved = retrieveFragments(session.fragments, moodKey);
      const retrievedIds = new Set(retrieved.map((f) => f.id));

      // ----- Stage 2: generate the reconstruction -----
      setStage("thinking");
      let recallText: string;
      try {
        const res = await fetch("/api/recall", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moodKey, question, fragments: retrieved }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Recall failed (${res.status})`);
        }
        const data = await res.json();
        recallText = data.text || "";
      } catch (e) {
        if (isStale()) return;
        setStage("idle");
        setLastError(e instanceof Error ? e.message : String(e));
        return;
      }

      if (isStale()) return;

      // ----- Stage 3: detect confabulations (parallel with rewriting) -----
      setStage("detecting");
      const story = getStory(storyId);

      const confabPromise: Promise<ConfabulationFlag[]> = fetch(
        "/api/detect-confab",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalStory: story?.body || "",
            recall: recallText,
          }),
        },
      )
        .then(async (r) => (r.ok ? (await r.json()).confabulations || [] : []))
        .catch(() => []);

      // ----- Stage 4: retrieval-induced rewriting (parallel) -----
      // We select fragments to rewrite based on retrieval count BEFORE
      // applySalienceUpdate runs, so the threshold is honest.
      const toRewrite = selectFragmentsToRewrite(
        session.fragments,
        retrievedIds,
      );

      const rewritePromises: Promise<{ id: string; newText: string } | null>[] =
        toRewrite.map(async (f) => {
          try {
            const r = await fetch("/api/rewrite-fragment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fragment: f, moodKey }),
            });
            if (!r.ok) return null;
            const data = await r.json();
            const newText: string | undefined = data?.newText;
            if (!newText || newText === f.text) return null;
            return { id: f.id, newText };
          } catch {
            return null;
          }
        });

      // Wait for confabulations + rewrites in parallel
      const [confabulations, rewriteResults] = await Promise.all([
        confabPromise,
        Promise.all(rewritePromises),
      ]);

      if (isStale()) return;

      const rewrites = rewriteResults.filter(
        (r): r is { id: string; newText: string } => r !== null,
      );
      if (rewrites.length > 0) setStage("rewriting");

      // ----- Stage 5: apply post-recall mechanics + commit rewrites -----
      setStage("consolidating");
      const { fragments: afterMechanics } = applyPostRecallMechanics({
        fragments: session.fragments,
        retrievedIds,
        confabulations,
        moodKey,
      });
      const afterRewrites = commitFragmentRewrites(
        afterMechanics,
        rewrites,
        moodKey,
      );

      // ----- Stage 6: maybe trigger reflection -----
      const nextRecallCount = session.recalls.length + 1;
      let finalFragments = afterRewrites;
      let finalReflections = session.reflections;
      let didReflect = false;

      if (shouldReflect(nextRecallCount)) {
        setStage("reflecting");
        // Pass recent recalls including the current one we're about to commit.
        // Use the stable recallId so reflection.fromRecallIds matches the
        // Recall record that ends up persisted.
        const provisional: Recall = {
          id: recallId,
          moodKey,
          question,
          retrievedFragmentIds: [...retrievedIds],
          text: recallText,
          confabulations,
          fragmentCountAtTime: afterRewrites.length,
          rewrittenFragmentIds: rewrites.map((r) => r.id),
          createdAt: Date.now(),
        };
        const recentForReflection = [
          ...session.recalls.slice(-(4)),
          provisional,
        ];

        try {
          const r = await fetch("/api/reflect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              moodKey,
              recentRecalls: recentForReflection,
            }),
          });
          if (r.ok) {
            const data = await r.json();
            const insights: string[] = data?.insights || [];
            if (insights.length > 0) {
              const reflectionRecord: Reflection = {
                id: `refl-${Date.now()}`,
                text: insights.join(" "),
                fromRecallIds: recentForReflection.map((rr) => rr.id),
                underMood: moodKey,
                createdAt: Date.now(),
              };
              const committed = commitReflection(
                afterRewrites,
                session.reflections,
                reflectionRecord,
                insights,
                moodKey,
              );
              finalFragments = committed.fragments;
              finalReflections = committed.reflections;
              didReflect = true;
            }
          }
        } catch {
          // Reflection failure is non-fatal
        }
      }

      if (isStale()) return;

      // ----- Stage 7: commit everything to session state -----
      const newRecall: Recall = {
        id: recallId,
        moodKey,
        question,
        retrievedFragmentIds: [...retrievedIds],
        text: recallText,
        confabulations,
        fragmentCountAtTime: finalFragments.length,
        triggeredReflection: didReflect,
        rewrittenFragmentIds: rewrites.map((r) => r.id),
        createdAt: Date.now(),
      };

      const next: SessionState = {
        ...session,
        fragments: finalFragments,
        recalls: [...session.recalls, newRecall],
        reflections: finalReflections,
      };
      setSession(next);
      saveSession(next);
      setStage("idle");
    },
    [session, storyId],
  );

  return {
    session,
    progress,
    lastError,
    recall,
    reset,
  };
}

// ============================================================================
// Core type definitions for Memoria Ficta's memory system.
// ============================================================================

/** A single atomic piece of memory. Stories are decomposed into these. */
export interface Fragment {
  id: string;
  text: string;
  /** -1 (deeply negative) to +1 (deeply positive). Drives mood-biased retrieval. */
  valence: number;
  /** 0 to 1. How vivid / how easily retrieved. Decays with disuse. */
  salience: number;
  /**
   * Where this fragment came from:
   *  - "original": from the user's initial story
   *  - "confabulated": invented by the AI in an earlier recall and written back
   *  - "reflection": generated during a reflection cycle as a higher-order insight
   *
   * NOTE: a confabulated fragment MUTATES to "original" once its
   * provenance confidence reaches 1.0 — meaning the AI no longer
   * remembers it was invented. This is the heart of the false-memory effect.
   */
  source: "original" | "confabulated" | "reflection";
  /**
   * 0 to 1. How confident this fragment's source label is.
   *
   *   - original fragments: 1.0 (the AI is sure these are real memories)
   *   - confabulated fragments: starts at 0.3, grows each retrieval
   *   - reflection fragments: 0.8 (the AI is fairly sure of its own insights)
   *
   * When a confabulated fragment crosses 1.0, its `source` flips to
   * "original" — the AI has forgotten it ever invented this.
   */
  sourceConfidence: number;
  /** Which mood was active when this fragment was confabulated/born. */
  bornUnderMood?: MoodKey;
  /** How many times this fragment has been retrieved across all recalls. */
  retrievalCount: number;
  /** Each time the fragment is rewritten, the old text is preserved here. */
  rewriteHistory?: { text: string; rewrittenAt: number; underMood: MoodKey }[];
  /** When the fragment was created (millis). */
  createdAt: number;
}

export type MoodKey = "neutral" | "anxious" | "warm";

export interface MoodDefinition {
  key: MoodKey;
  label: string;
  englishLabel: string;
  description: string;
  /** -1 = pulls retrieval toward negative-valence fragments; +1 = toward positive. */
  pull: number;
}

export interface ConfabulationFlag {
  content: string;
  type: string;
  why: string;
}

/** A reflection generated during a meta-cognitive cycle. */
export interface Reflection {
  id: string;
  text: string;
  fromRecallIds: string[];
  underMood: MoodKey;
  createdAt: number;
}

export interface Recall {
  id: string;
  moodKey: MoodKey;
  question: string;
  retrievedFragmentIds: string[];
  text: string;
  confabulations: ConfabulationFlag[];
  fragmentCountAtTime: number;
  /** Did this recall trigger a reflection cycle? */
  triggeredReflection?: boolean;
  /** Fragment IDs that got rewritten by retrieval-induced rewriting. */
  rewrittenFragmentIds?: string[];
  createdAt: number;
}

export interface Story {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  initialFragments: Omit<
    Fragment,
    "id" | "retrievalCount" | "createdAt" | "source" | "sourceConfidence"
  >[];
  suggestedQuestions: string[];
}

export interface SessionState {
  storyId: string;
  fragments: Fragment[];
  recalls: Recall[];
  reflections: Reflection[];
  startedAt: number;
}

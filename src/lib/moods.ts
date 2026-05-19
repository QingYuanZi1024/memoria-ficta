import type { MoodDefinition, MoodKey } from "./types";

export const MOODS: Record<MoodKey, MoodDefinition> = {
  neutral: {
    key: "neutral",
    label: "平静",
    englishLabel: "neutral",
    description: "心情平静中性，没有特别的情绪起伏。",
    pull: 0.0,
  },
  anxious: {
    key: "anxious",
    label: "焦虑",
    englishLabel: "anxious",
    description:
      "心情焦虑紧张。今天工作上出了一些不顺心的事。你的脑子里反复闪过那些让自己尴尬、丢脸、自责的瞬间。",
    pull: -1.0,
  },
  warm: {
    key: "warm",
    label: "温暖",
    englishLabel: "warm and nostalgic",
    description:
      "心情温暖怀念。刚和老朋友聊完天。你想起那些虽然当时尴尬、但现在回头看挺有意思的事。",
    pull: 0.6,
  },
};

export const MOOD_ORDER: MoodKey[] = ["anxious", "neutral", "warm"];

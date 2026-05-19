import { NextRequest, NextResponse } from "next/server";
import type { MoodKey, Recall } from "@/lib/types";
import { buildReflectionPrompt } from "@/lib/prompts";
import { getAnthropicClient } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = getAnthropicClient();

interface ReflectRequest {
  moodKey: MoodKey;
  recentRecalls: Recall[];
}

interface ReflectResponse {
  insights: string[];
}

function parseReflectionOutput(raw: string): string[] {
  // Robust: take everything from first `{` to last `}`.
  let cleaned = raw.trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) {
    cleaned = cleaned.slice(first, last + 1);
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed?.insights)) {
      return parsed.insights
        .filter((s: unknown): s is string => typeof s === "string")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && s.length <= 80);
    }
  } catch {
    console.warn("Could not parse reflection output:", cleaned.slice(0, 200));
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const body: ReflectRequest = await req.json();
    if (!body.recentRecalls || body.recentRecalls.length === 0) {
      return NextResponse.json({ insights: [] });
    }

    const prompt = buildReflectionPrompt({
      moodKey: body.moodKey,
      recentRecalls: body.recentRecalls,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 600,
      temperature: 0.8,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";
    const insights = parseReflectionOutput(text);

    const result: ReflectResponse = { insights };
    return NextResponse.json(result);
  } catch (err) {
    console.error("Reflect API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

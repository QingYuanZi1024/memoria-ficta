import { NextRequest, NextResponse } from "next/server";
import type { ConfabulationFlag } from "@/lib/types";
import { buildConfabulationPrompt } from "@/lib/prompts";
import { getAnthropicClient } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = getAnthropicClient();

interface DetectRequest {
  originalStory: string;
  recall: string;
}

interface DetectResponse {
  confabulations: ConfabulationFlag[];
}

function parseJudgeOutput(raw: string): ConfabulationFlag[] {
  // Robust: take everything from first `{` to last `}`. Survives the LLM
  // wrapping in ```json…```, adding preambles, or appending trailing text.
  let cleaned = raw.trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) {
    cleaned = cleaned.slice(first, last + 1);
  }
  try {
    const parsed = JSON.parse(cleaned);
    const list = Array.isArray(parsed?.confabulations) ? parsed.confabulations : [];
    return list
      .filter(
        (c: { content?: unknown; type?: unknown }) =>
          typeof c?.content === "string" && typeof c?.type === "string",
      )
      .map((c: { content: string; type: string; why?: string }) => ({
        content: c.content,
        type: c.type,
        why: typeof c.why === "string" ? c.why : "",
      }));
  } catch (e) {
    console.warn("Could not parse judge output:", cleaned.slice(0, 200));
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: DetectRequest = await req.json();

    const prompt = buildConfabulationPrompt({
      originalStory: body.originalStory,
      recall: body.recall,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      temperature: 0.0,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";
    const confabulations = parseJudgeOutput(text);

    const result: DetectResponse = { confabulations };
    return NextResponse.json(result);
  } catch (err) {
    console.error("Detect API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import type { Fragment, MoodKey } from "@/lib/types";
import { buildReconstructionPrompt } from "@/lib/prompts";
import { getAnthropicClient } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = getAnthropicClient();

interface RecallRequest {
  moodKey: MoodKey;
  question: string;
  fragments: Fragment[];
}

export async function POST(req: NextRequest) {
  try {
    const body: RecallRequest = await req.json();

    if (!body.fragments || body.fragments.length === 0) {
      return NextResponse.json(
        { error: "No fragments provided." },
        { status: 400 },
      );
    }

    const prompt = buildReconstructionPrompt({
      moodKey: body.moodKey,
      question: body.question,
      fragments: body.fragments,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      temperature: 0.8,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text.trim() : "";

    return NextResponse.json({ text });
  } catch (err) {
    console.error("Recall API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

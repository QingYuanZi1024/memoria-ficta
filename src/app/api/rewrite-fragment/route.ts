import { NextRequest, NextResponse } from "next/server";
import type { Fragment, MoodKey } from "@/lib/types";
import { buildRewritePrompt } from "@/lib/prompts";
import { getAnthropicClient } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = getAnthropicClient();

interface RewriteRequest {
  fragment: Fragment;
  moodKey: MoodKey;
}

export async function POST(req: NextRequest) {
  try {
    const body: RewriteRequest = await req.json();
    if (!body.fragment) {
      return NextResponse.json({ error: "No fragment provided." }, { status: 400 });
    }

    const prompt = buildRewritePrompt({
      fragment: body.fragment,
      moodKey: body.moodKey,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 300,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    const raw = block.type === "text" ? block.text.trim() : "";

    // Prefer the last non-empty line: when the model ignores the
    // "don't explain" rule, the preamble is on the first line(s) and
    // the actual rewrite is on the last. Falls through to "" if empty.
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    let newText = lines[lines.length - 1] ?? "";

    // Strip surrounding ASCII / CJK / typographic quotes.
    const QUOTE_OPEN = /^[「『""''"'`]+/;
    const QUOTE_CLOSE = /[」』""''"'`]+$/;
    newText = newText.replace(QUOTE_OPEN, "").replace(QUOTE_CLOSE, "").trim();

    // Drop preamble like "新版本：xxx" / "改写后：xxx" if the model
    // crammed both onto one line.
    newText = newText.replace(/^(新版本|改写后|新版|结果)[：:]\s*/, "").trim();

    return NextResponse.json({ newText });
  } catch (err) {
    console.error("Rewrite API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

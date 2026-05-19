import { NextRequest, NextResponse } from "next/server";
import { buildExtractFragmentsPrompt } from "@/lib/prompts";
import { getAnthropicClient } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = getAnthropicClient();

interface ExtractRequest {
  body: string;
}

interface ExtractedFragment {
  text: string;
  valence: number;
  salience: number;
}

interface ExtractResponse {
  fragments: ExtractedFragment[];
  suggestedQuestions: string[];
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function parseExtractOutput(raw: string): ExtractResponse {
  // Robust extraction: take the substring from the first `{` to the last `}`.
  // Handles cases where the LLM wraps in ```json…```, adds a preamble, or
  // appends trailing text — all of which break naive code-fence stripping.
  let cleaned = raw.trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) {
    cleaned = cleaned.slice(first, last + 1);
  }
  const parsed = JSON.parse(cleaned);

  const fragments: ExtractedFragment[] = Array.isArray(parsed?.fragments)
    ? parsed.fragments
        .filter(
          (f: { text?: unknown; valence?: unknown; salience?: unknown }) =>
            typeof f?.text === "string" &&
            typeof f?.valence === "number" &&
            typeof f?.salience === "number",
        )
        .map((f: { text: string; valence: number; salience: number }) => ({
          text: f.text.trim(),
          valence: clamp(f.valence, -1, 1),
          salience: clamp(f.salience, 0, 1),
        }))
        .filter((f: ExtractedFragment) => f.text.length > 0)
    : [];

  const suggestedQuestions: string[] = Array.isArray(parsed?.suggestedQuestions)
    ? parsed.suggestedQuestions
        .filter((q: unknown): q is string => typeof q === "string")
        .map((q: string) => q.trim())
        .filter((q: string) => q.length > 0)
    : [];

  return { fragments, suggestedQuestions };
}

export async function POST(req: NextRequest) {
  try {
    const body: ExtractRequest = await req.json();
    const storyBody = (body.body || "").trim();

    if (storyBody.length < 20) {
      return NextResponse.json(
        { error: "故事太短，至少需要 20 个字符。" },
        { status: 400 },
      );
    }
    if (storyBody.length > 4000) {
      return NextResponse.json(
        { error: "故事太长，请控制在 4000 字符以内。" },
        { status: 400 },
      );
    }

    const prompt = buildExtractFragmentsPrompt({ body: storyBody });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 6000,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";

    let result: ExtractResponse;
    try {
      result = parseExtractOutput(text);
    } catch (e) {
      console.warn(
        `Could not parse extract output (stop_reason=${response.stop_reason}, len=${text.length}):`,
        text.slice(0, 800),
        "...END...",
        text.slice(-400),
      );
      return NextResponse.json(
        {
          error:
            response.stop_reason === "max_tokens"
              ? "LLM 输出被截断（碎片太多）。请稍后重试。"
              : "LLM 返回的内容无法解析，请稍后重试。",
        },
        { status: 502 },
      );
    }

    if (result.fragments.length < 5) {
      return NextResponse.json(
        { error: "抽取的碎片太少（少于 5 条），故事可能太单薄。" },
        { status: 422 },
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Extract API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

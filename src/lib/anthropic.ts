import Anthropic from "@anthropic-ai/sdk";

// This machine has ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN set in the
// shell so that Claude Code (the CLI) routes through a third-party
// reseller. Next.js inherits those env vars at startup, which would
// redirect this app's SDK calls to the same reseller — which rejects
// non-Claude-Code clients. Strip them before constructing the client so
// only the key from .env.local is used, against the official endpoint.
delete process.env.ANTHROPIC_BASE_URL;
delete process.env.ANTHROPIC_AUTH_TOKEN;

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: "https://api.anthropic.com",
    });
  }
  return client;
}

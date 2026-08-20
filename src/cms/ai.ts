// src/cms/ai.ts — Workers AI writing assistant (free tier: no API key, no cost
// within 10k neurons/day). Chat format (messages) is the 2026 Workers AI API;
// JSON mode (response_format) forces structured output for title/meta results.
// Doc-verified against the Workers AI docs (get-started + JSON-mode pages):
//   env.AI.run(model, { messages: [{role, content}] }) -> { response }
//   response_format: { type: "json_schema", json_schema: {...} }
// The -fast variant is confirmed live and JSON-mode capable; neuron prices are
// from the pricing table (llama-3.1-8b-instruct-fp8-fast / fast: 4119 / M in,
// 34868 / M out).

import { getSetting, setSetting } from "./d1.js";

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const FREE_NEURONS_PER_DAY = 10000;
const NEURONS_PER_M_IN = 4119;
const NEURONS_PER_M_OUT = 34868;

type AiEnv = { DB: D1Database; AI?: Ai };

export class AiLimitError extends Error {
  constructor() {
    super("Daily free AI budget used up");
    this.name = "AiLimitError";
  }
}

export class AiUnavailableError extends Error {
  constructor(message = "AI service unavailable") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

// Rough token estimate for metering: ~4 chars per token is a decent proxy.
function estTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

// Persist today's neuron spend in settings ('ai_usage_day' = "YYYY-MM-DD:n").
// Resets naturally when the date rolls over. ponytail: single global counter,
// not per-admin — good enough for a single-operator CMS free-tier budget.
async function spendNeurons(env: AiEnv, inputTokens: number, outputTokens: number): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const raw = (await getSetting(env.DB, "ai_usage_day")) ?? "";
  const [day = "", spentStr = "0"] = raw.split(":");
  const spent = day === today ? parseInt(spentStr, 10) || 0 : 0;
  const cost = Math.ceil(
    (inputTokens / 1_000_000) * NEURONS_PER_M_IN + (outputTokens / 1_000_000) * NEURONS_PER_M_OUT,
  );
  const next = spent + cost;
  await setSetting(env.DB, "ai_usage_day", today + ":" + next);
  return next;
}

export async function remainingNeurons(env: AiEnv): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const raw = (await getSetting(env.DB, "ai_usage_day")) ?? "";
  const [day = "", spentStr = "0"] = raw.split(":");
  const spent = day === today ? parseInt(spentStr, 10) || 0 : 0;
  return Math.max(0, FREE_NEURONS_PER_DAY - spent);
}

type ChatOptions = {
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
};

async function chat(env: AiEnv, messages: { role: string; content: string }[], opts: ChatOptions = {}): Promise<string> {
  if (!env.AI) throw new AiUnavailableError("Workers AI binding is not configured (missing [ai] in wrangler.toml)");
  const remaining = await remainingNeurons(env);
  if (remaining <= 0) throw new AiLimitError();

  const request: Record<string, unknown> = { messages };
  if (opts.maxTokens) request.max_tokens = opts.maxTokens;
  if (opts.jsonSchema) {
    request.response_format = { type: "json_schema", json_schema: opts.jsonSchema };
  }
  const res = await env.AI.run(MODEL, request);
  const text = typeof res?.response === "string" ? res.response : "";
  if (!text) throw new AiUnavailableError("AI returned an empty response");
  const inputTokens = messages.reduce((n, m) => n + estTokens(m.content), 0);
  await spendNeurons(env, inputTokens, estTokens(text));
  return text;
}

function systemPrompt(guidelines: string): string {
  return (
    "You are the writing assistant inside PHCloud CMS, a single-operator blogging platform. " +
    "Write clean, web-optimized copy in the site's house style. Never invent facts, links, or citations. " +
    "Do not wrap output in quotes, code fences, or markdown unless asked. " +
    (guidelines ? "Site content guidelines: " + guidelines : "")
  );
}

function trimJson(text: string): string {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}

export async function aiContinue(env: AiEnv, text: string, guidelines: string): Promise<string> {
  return chat(env, [
    { role: "system", content: systemPrompt(guidelines) },
    {
      role: "user",
      content:
        "Continue this draft. Do NOT repeat or rephrase what is already written. Write the next paragraph(s) in the same voice and direction. End mid-thought so I can continue.\n\nDraft so far:\n" +
        (text || "(no content yet — start the post)"),
    },
  ]);
}

export async function aiSummarize(env: AiEnv, text: string, guidelines: string): Promise<string> {
  return chat(env, [
    { role: "system", content: systemPrompt(guidelines) },
    {
      role: "user",
      content:
        "Write a single concise plain-text excerpt of the post below, at most 155 characters, no quotes, no markdown. It appears in post listings and search results.\n\nPost:\n" +
        text,
    },
  ]);
}

export async function aiRewrite(env: AiEnv, text: string, tone: string, guidelines: string): Promise<string> {
  return chat(env, [
    { role: "system", content: systemPrompt(guidelines) },
    {
      role: "user",
      content:
        "Rewrite the following text " +
        (tone || "more clearly") +
        " (tone: " +
        tone +
        "). Keep the same meaning and length. Preserve any links, lists, or emphasis. Output only the rewritten text.\n\nText:\n" +
        text,
    },
  ]);
}

const TITLE_SCHEMA = {
  type: "object",
  properties: { titles: { type: "array", items: { type: "string" }, maxItems: 5 } },
  required: ["titles"],
};

export async function aiTitles(env: AiEnv, content: string, guidelines: string): Promise<string[]> {
  const text = await chat(
    env,
    [
      { role: "system", content: systemPrompt(guidelines) },
      {
        role: "user",
        content:
          "Suggest 5 engaging blog post titles for the post below. Titles should be specific, benefit-led, under 60 characters, and free of clickbait. Respond with JSON only.\n\nPost:\n" +
          (content || "(no content yet — infer from context)"),
      },
    ],
    { jsonSchema: TITLE_SCHEMA, maxTokens: 200 },
  );
  try {
    const parsed = JSON.parse(trimJson(text));
    const titles = Array.isArray(parsed.titles) ? parsed.titles.filter((t: unknown) => typeof t === "string") : [];
    return titles.slice(0, 5);
  } catch {
    // model ignored the schema — fall back to line-splitting
    return text
      .split(/\n+/)
      .map((s) => s.replace(/^\d+[.)]\s*/, "").trim())
      .filter((s) => s.length > 3)
      .slice(0, 5);
  }
}

const META_SCHEMA = {
  type: "object",
  properties: {
    meta_title: { type: "string" },
    meta_description: { type: "string" },
  },
  required: ["meta_title", "meta_description"],
};

export async function aiMeta(
  env: AiEnv,
  title: string,
  content: string,
  guidelines: string,
): Promise<{ meta_title: string; meta_description: string }> {
  const text = await chat(
    env,
    [
      { role: "system", content: systemPrompt(guidelines) },
      {
        role: "user",
        content:
          "Write SEO meta for this post. meta_title: under 60 characters, compelling, includes the key idea. meta_description: under 160 characters, plain text, summarizes what the reader gets. Respond with JSON only.\n\nTitle: " +
          title +
          "\n\nPost:\n" +
          (content || "(no content)"),
      },
    ],
    { jsonSchema: META_SCHEMA, maxTokens: 200 },
  );
  try {
    const parsed = JSON.parse(trimJson(text));
    return {
      meta_title: String(parsed.meta_title ?? "").trim().slice(0, 60),
      meta_description: String(parsed.meta_description ?? "").trim().slice(0, 160),
    };
  } catch {
    throw new AiUnavailableError("AI returned malformed metadata");
  }
}
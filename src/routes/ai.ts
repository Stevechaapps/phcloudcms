// src/routes/ai.ts — in-editor AI writing assistant endpoints (Phase 3b).
// All endpoints require admin auth and share the free-tier neuron budget
// tracked in settings ('ai_usage_day'). AI itself is optional at runtime:
// a missing binding, exhausted budget, or model error maps to a clean JSON
// error the editor surfaces as a toast — never a 500 crash.

import { requireAuth } from "../cms/auth.js";
import { App, parseJsonBody } from "../cms/env.js";
import { getSetting } from "../cms/d1.js";
import {
  AiLimitError,
  AiUnavailableError,
  aiContinue,
  aiSummarize,
  aiRewrite,
  aiTitles,
  aiMeta,
  remainingNeurons,
} from "../cms/ai.js";
import type { Context } from "hono";

type AiCtx = Context<{
  Bindings: import("../cms/env.js").Env;
  Variables: import("../cms/env.js").Variables;
}>;

export function registerAiRoutes(app: App): void {
  const okOr = async (c: AiCtx, fn: () => Promise<Record<string, unknown>>) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    try {
      return c.json({ ok: true, ...(await fn()) });
    } catch (e) {
      return e instanceof AiLimitError
        ? c.json(
            { error: "Daily free AI budget used up — try again tomorrow." },
            429,
          )
        : c.json(
            { error: e instanceof Error ? e.message : "AI request failed" },
            503,
          );
    }
  };

  app.post("/api/admin/ai/continue", async (c) => {
    const body = await parseJsonBody(c);
    if (!body) return c.json({ error: "Invalid JSON" }, 400);
    const guidelines = (await getSetting(c.env.DB, "ai_guidelines")) ?? "";
    return okOr(c, () =>
      aiContinue(c.env, String(body.text ?? ""), guidelines).then((text) => ({
        text,
      })),
    );
  });

  app.post("/api/admin/ai/summarize", async (c) => {
    const body = await parseJsonBody(c);
    if (!body) return c.json({ error: "Invalid JSON" }, 400);
    const guidelines = (await getSetting(c.env.DB, "ai_guidelines")) ?? "";
    return okOr(c, () =>
      aiSummarize(c.env, String(body.text ?? ""), guidelines).then((text) => ({
        text,
      })),
    );
  });

  app.post("/api/admin/ai/rewrite", async (c) => {
    const body = await parseJsonBody(c);
    if (!body) return c.json({ error: "Invalid JSON" }, 400);
    const guidelines = (await getSetting(c.env.DB, "ai_guidelines")) ?? "";
    return okOr(c, () =>
      aiRewrite(
        c.env,
        String(body.text ?? ""),
        String(body.tone ?? "clear"),
        guidelines,
      ).then((text) => ({ text })),
    );
  });

  app.post("/api/admin/ai/titles", async (c) => {
    const body = await parseJsonBody(c);
    if (!body) return c.json({ error: "Invalid JSON" }, 400);
    const guidelines = (await getSetting(c.env.DB, "ai_guidelines")) ?? "";
    return okOr(c, () =>
      aiTitles(c.env, String(body.content ?? ""), guidelines).then(
        (titles) => ({ titles }),
      ),
    );
  });

  app.post("/api/admin/ai/meta", async (c) => {
    const body = await parseJsonBody(c);
    if (!body) return c.json({ error: "Invalid JSON" }, 400);
    const guidelines = (await getSetting(c.env.DB, "ai_guidelines")) ?? "";
    return okOr(c, () =>
      aiMeta(
        c.env,
        String(body.title ?? ""),
        String(body.content ?? ""),
        guidelines,
      ).then((m) => ({
        meta_title: m.meta_title,
        meta_description: m.meta_description,
      })),
    );
  });

  app.get("/api/admin/ai/usage", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const limit = 10000;
    const remaining = await remainingNeurons({ DB: c.env.DB, AI: c.env.AI });
    return c.json({
      limit,
      remaining,
      used: limit - remaining,
      date: new Date().toISOString().slice(0, 10),
    });
  });
}

// src/routes/mcp.ts — Model Context Protocol server, POST /api/mcp.
// Implements the MCP spec revision 2026-07-28 (Streamable HTTP transport):
//   - modern per-request metadata: no initialize handshake, no sessions
//   - required headers: MCP-Protocol-Version, Mcp-Method, Mcp-Name
//   - HeaderMismatch (-32020) and UnsupportedProtocolVersionError (-32022)
//   - server/discover (MUST), tools/list, tools/call
//   - results carry resultType + ttlMs + cacheScope; tool errors are isError
//     inside the result, never protocol-level errors
// Auth: Bearer token configured in Settings → MCP Access. Unset token = endpoint
// disabled. Origin checked against the Host to stop DNS-rebinding attacks.
// Doc-verified against modelcontextprotocol.io 2026-07-28 (transport, versioning,
// discover, tools) before writing.

import { App, SLUG_RE, parseJsonBody } from "../cms/env.js";
import { getSetting } from "../cms/d1.js";
import { sanitizePostHtml } from "../cms/sanitize.js";
import { autoExcerpt } from "../cms/render.js";
import { getStats } from "../cms/stats.js";
import type { Context } from "hono";

const PROTOCOL_VERSION = "2026-07-28";
const SERVER_INFO = { name: "phcloud-cms", version: "1.0.0" };
const TTL_MS = 300000;

type MCPCtx = Context<{ Bindings: import("../cms/env.js").Env; Variables: import("../cms/env.js").Variables }>;

const rpcError = (id: unknown, code: number, message: string, data?: unknown) =>
  ({ jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data !== undefined ? { data } : {}) } });

const headerMismatch = (id: unknown, what: string) =>
  rpcError(id, -32020, "Header mismatch: " + what);

const unsupportedVersion = (id: unknown, requested: string) =>
  rpcError(id, -32022, "Unsupported protocol version", { supported: [PROTOCOL_VERSION], requested });

// tools/call result with a human-readable text block + structured data
const toolResult = (id: unknown, text: string, structured?: unknown) => ({
  jsonrpc: "2.0",
  id,
  result: {
    resultType: "complete",
    content: [{ type: "text", text }],
    ...(structured !== undefined ? { structuredContent: structured } : {}),
  },
});

const toolError = (id: unknown, text: string) => ({
  jsonrpc: "2.0",
  id,
  result: { resultType: "complete", content: [{ type: "text", text }], isError: true },
});

// ── Tools (deterministic order for client-side caching) ────────────
const TOOLS = [
  {
    name: "list_posts",
    title: "List posts",
    description: "List blog posts with optional pagination and status filter.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max posts to return (1-50, default 20)" },
        status: { type: "string", enum: ["published", "draft", "all"], description: "Filter by publish status (default all)" },
      },
    },
  },
  {
    name: "get_post",
    title: "Get post",
    description: "Fetch a single post by id or slug, including full content and tags.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "Post id" },
        slug: { type: "string", description: "Post slug" },
      },
    },
  },
  {
    name: "create_post",
    title: "Create post",
    description: "Create a new draft (or published) post. Returns the new post's id and slug.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Post title (required)" },
        slug: { type: "string", description: "URL slug; auto-generated from title if omitted" },
        content: { type: "string", description: "Post content as sanitized HTML" },
        excerpt: { type: "string", description: "Plain-text excerpt; auto-generated if omitted" },
        published: { type: "boolean", description: "Publish immediately (default false)" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_post",
    title: "Update post",
    description: "Update fields of an existing post identified by id or slug. Only provided fields change.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "Post id" },
        slug: { type: "string", description: "Post slug" },
        title: { type: "string", description: "New title" },
        content: { type: "string", description: "New content as sanitized HTML" },
        excerpt: { type: "string", description: "New excerpt" },
        published: { type: "boolean", description: "Publish or unpublish" },
        meta_title: { type: "string", description: "SEO meta title (max 60 chars)" },
        meta_description: { type: "string", description: "SEO meta description (max 160 chars)" },
      },
    },
  },
  {
    name: "publish_post",
    title: "Publish post",
    description: "Publish (or with publish=false, unpublish) a post by id or slug.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "Post id" },
        slug: { type: "string", description: "Post slug" },
        publish: { type: "boolean", description: "True to publish, false to unpublish (default true)" },
      },
    },
  },
  {
    name: "list_tags",
    title: "List tags",
    description: "List all tags with their post counts.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "site_stats",
    title: "Site stats",
    description: "Traffic statistics: daily views, top pages, and totals for the last N days.",
    inputSchema: {
      type: "object",
      properties: { days: { type: "integer", description: "Lookback window (1-90, default 30)" } },
    },
  },
];

export function registerMcpRoute(app: App): void {
  app.all("/api/mcp", async (c: MCPCtx) => {
    // ── GET → SSE stream (opencode-compatible transport) ──────────
    if (c.req.method === "GET") {
      const token = await getSetting(c.env.DB, "mcp_token");
      if (!token) return c.json(rpcError(null, -32001, "MCP access token is not configured on this site"), 401);
      const auth = c.req.header("authorization") ?? "";
      if (auth !== "Bearer " + token) return c.json(rpcError(null, -32001, "Unauthorized"), 401);

      const sessionId = crypto.randomUUID();
      const url = new URL(c.req.url);
      url.searchParams.set("session_id", sessionId);

      await c.env.CACHE.put("mcp:session:" + sessionId, "active", { expirationTtl: 3600 });

      const encoder = new TextEncoder();
      let interval: ReturnType<typeof setInterval> | null = null;
      const cleanup = () => { if (interval) clearInterval(interval); c.env.CACHE.delete("mcp:session:" + sessionId); };
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode("event: endpoint\ndata: " + JSON.stringify({ url: url.toString() }) + "\n\n"));
          interval = setInterval(() => {
            try { controller.enqueue(encoder.encode(": keep-alive\n\n")); } catch { cleanup(); }
          }, 15000);
        },
        async cancel() { cleanup(); },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    if (c.req.method !== "POST") return c.json(rpcError(null, -32601, "Method not found"), 405);

    // Optional session validation for stream-bound POSTs
    const sessionId = c.req.query("session_id");
    if (sessionId) {
      const session = await c.env.CACHE.get("mcp:session:" + sessionId);
      if (!session) return c.json(rpcError(null, -32001, "Invalid or expired session"), 401);
    }

    // DNS-rebinding protection: if Origin is present it must be same-origin.
    const origin = c.req.header("origin");
    if (origin) {
      const host = c.req.header("host") ?? "";
      const allowed = "https://" + host + (origin.startsWith("http://") ? "" : "");
      if (origin !== allowed && origin !== "http://" + host) return c.json(rpcError(null, -32600, "Invalid Origin"), 403);
    }

    // Bearer auth against the configured MCP token. No token configured = endpoint off.
    const token = await getSetting(c.env.DB, "mcp_token");
    if (!token) return c.json(rpcError(null, -32001, "MCP access token is not configured on this site"), 401);
    const auth = c.req.header("authorization") ?? "";
    if (auth !== "Bearer " + token) return c.json(rpcError(null, -32001, "Unauthorized"), 401);

    const body = await parseJsonBody(c);
    if (!body) return c.json(rpcError(null, -32700, "Parse error"), 400);
    const method = String(body.method ?? "");
    const id = body.id ?? null;

    // Notifications (no id) → 202 with no body.
    if (id === null || id === undefined) return c.body(null, 202);

    // ── Required-header validation (2026-07-28 transport) ──
    const protoHeader = c.req.header("mcp-protocol-version");
    const meta = (body._meta as Record<string, unknown>) ?? {};
    const bodyVersion = String(meta["io.modelcontextprotocol/protocolVersion"] ?? "");
    if (protoHeader !== bodyVersion) {
      return c.json(headerMismatch(id, "MCP-Protocol-Version header '" + (protoHeader ?? "") + "' does not match body _meta '" + bodyVersion + "'"), 400);
    }
    if (protoHeader !== PROTOCOL_VERSION) {
      return c.json(unsupportedVersion(id, protoHeader ?? ""), 400);
    }
    if ((c.req.header("mcp-method") ?? "") !== method) {
      return c.json(headerMismatch(id, "Mcp-Method header does not match body method '" + method + "'"), 400);
    }
    if (method === "tools/call") {
      const name = String((body.params as Record<string, unknown>)?.name ?? "");
      if ((c.req.header("mcp-name") ?? "") !== name) {
        return c.json(headerMismatch(id, "Mcp-Name header does not match body tool name"), 400);
      }
    }

    // ── Method dispatch ──
    if (method === "server/discover") {
      return c.json({
        jsonrpc: "2.0",
        id,
        result: {
          resultType: "complete",
          supportedVersions: [PROTOCOL_VERSION],
          capabilities: { tools: {} },
          _meta: { "io.modelcontextprotocol/serverInfo": SERVER_INFO },
          instructions:
            "PHCloud CMS content tools: read, create, update, and publish blog posts and tags. Content fields are sanitized HTML; excerpts are plain text. Identify posts by id or slug.",
          ttlMs: 3600000,
          cacheScope: "public",
        },
      });
    }

    if (method === "tools/list") {
      return c.json({
        jsonrpc: "2.0",
        id,
        result: { resultType: "complete", tools: TOOLS, ttlMs: TTL_MS, cacheScope: "private" },
      });
    }

    if (method === "tools/call") {
      const name = String((body.params as Record<string, unknown>)?.name ?? "");
      const args = ((body.params as Record<string, unknown>)?.arguments ?? {}) as Record<string, unknown>;
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return c.json(rpcError(id, -32602, "Unknown tool: " + name), 404);
      return handleToolCall(c, id, name, args);
    }

    return c.json(rpcError(id, -32601, "Method not found"), 404);
  });
}

// ── Tool implementations ───────────────────────────────────────────
async function handleToolCall(c: MCPCtx, id: unknown, name: string, args: Record<string, unknown>) {
  const db = c.env.DB;
  try {
    if (name === "list_posts") {
      const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));
      const status = String(args.status ?? "all");
      const where = status === "published" ? "WHERE published = 1" : status === "draft" ? "WHERE published = 0" : "";
      const rows = await db
        .prepare("SELECT id, title, slug, published, excerpt, updated_at FROM posts " + where + " ORDER BY updated_at DESC LIMIT ?")
        .bind(limit)
        .all();
      return c.json(toolResult(id, JSON.stringify(rows.results, null, 2), rows.results));
    }

    if (name === "get_post") {
      const post = args.id !== undefined
        ? await db.prepare("SELECT * FROM posts WHERE id = ?").bind(Number(args.id)).first()
        : args.slug
          ? await db.prepare("SELECT * FROM posts WHERE slug = ? AND type = 'post'").bind(String(args.slug)).first()
          : null;
      if (!post) return c.json(toolError(id, "Post not found"));
      const tags = await db
        .prepare("SELECT t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?")
        .bind((post as any).id)
        .all<{ name: string }>();
      const out = { ...(post as object), tags: tags.results.map((t) => t.name) };
      return c.json(toolResult(id, JSON.stringify(out, null, 2), out));
    }

    if (name === "create_post") {
      const title = String(args.title ?? "").trim();
      if (!title) return c.json(toolError(id, "title is required"));
      let slug = String(args.slug ?? "").trim();
      if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!SLUG_RE.test(slug)) return c.json(toolError(id, "Invalid slug — use lowercase letters, numbers, and hyphens"));
      const content = sanitizePostHtml(String(args.content ?? ""));
      let excerpt = String(args.excerpt ?? autoExcerpt(content)).slice(0, 255);
      if (!excerpt.trim()) excerpt = autoExcerpt(content);
      const published = args.published === true ? 1 : 0;
      const now = new Date().toISOString();
      try {
        const result = await db
          .prepare("INSERT INTO posts (title, slug, content, excerpt, published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(title, slug, content, excerpt, published, now, now)
          .run();
        await c.env.CACHE.delete("cms:posts:pub");
        await c.env.CACHE.delete("cms:homepage");
        const out = { id: result.meta.last_row_id, slug, published: published === 1 };
        return c.json(toolResult(id, "Created post #" + out.id + " at /" + slug, out));
      } catch (e: any) {
        if (String(e?.message ?? "").includes("UNIQUE")) return c.json(toolError(id, "A post with this slug already exists"));
        throw e;
      }
    }

    if (name === "update_post") {
      const whereId = args.id !== undefined ? "id = ?" : args.slug ? "slug = ? AND type = 'post'" : null;
      if (!whereId) return c.json(toolError(id, "Provide id or slug"));
      const existing = await db.prepare("SELECT * FROM posts WHERE " + whereId).bind(args.id !== undefined ? Number(args.id) : String(args.slug)).first();
      if (!existing) return c.json(toolError(id, "Post not found"));
      const cur = existing as any;
      const title = args.title !== undefined ? String(args.title).trim() : cur.title;
      const content = args.content !== undefined ? sanitizePostHtml(String(args.content)) : cur.content;
      let excerpt = args.excerpt !== undefined ? String(args.excerpt).slice(0, 255) : cur.excerpt;
      if (!excerpt.trim()) excerpt = autoExcerpt(content);
      const published = args.published !== undefined ? (args.published === true ? 1 : 0) : cur.published;
      const metaTitle = args.meta_title !== undefined ? String(args.meta_title).trim().slice(0, 60) : cur.meta_title;
      const metaDesc = args.meta_description !== undefined ? String(args.meta_description).trim().slice(0, 160) : cur.meta_description;
      await db
        .prepare("UPDATE posts SET title=?, content=?, excerpt=?, published=?, meta_title=?, meta_description=?, updated_at=? WHERE id=?")
        .bind(title, content, excerpt, published, metaTitle, metaDesc, new Date().toISOString(), cur.id)
        .run();
      await c.env.CACHE.delete("cms:posts:pub");
      await c.env.CACHE.delete("cms:homepage");
      const out = { id: cur.id, slug: cur.slug, title, published: published === 1 };
      return c.json(toolResult(id, "Updated post #" + cur.id, out));
    }

    if (name === "publish_post") {
      const whereId = args.id !== undefined ? "id = ?" : args.slug ? "slug = ? AND type = 'post'" : null;
      if (!whereId) return c.json(toolError(id, "Provide id or slug"));
      const publish = args.publish !== false;
      const result = await db
        .prepare("UPDATE posts SET published=?, publish_at=NULL, preview_token=NULL, updated_at=? WHERE " + whereId)
        .bind(publish ? 1 : 0, new Date().toISOString(), args.id !== undefined ? Number(args.id) : String(args.slug))
        .run();
      if (result.meta.changes === 0) return c.json(toolError(id, "Post not found"));
      await c.env.CACHE.delete("cms:posts:pub");
      await c.env.CACHE.delete("cms:homepage");
      return c.json(toolResult(id, publish ? "Published" : "Unpublished"));
    }

    if (name === "list_tags") {
      const rows = await db
        .prepare("SELECT t.id, t.name, t.slug, (SELECT COUNT(*) FROM post_tags pt WHERE pt.tag_id = t.id) AS post_count FROM tags t ORDER BY t.name")
        .all();
      return c.json(toolResult(id, JSON.stringify(rows.results, null, 2), rows.results));
    }

    if (name === "site_stats") {
      const days = Math.min(90, Math.max(1, Number(args.days) || 30));
      const stats = await getStats(db, days);
      return c.json(toolResult(id, JSON.stringify(stats, null, 2), stats));
    }

    return c.json(toolError(id, "Unknown tool"));
  } catch (e) {
    console.error("MCP tool call failed:", e);
    return c.json(toolError(id, "Internal error: " + (e instanceof Error ? e.message : "unknown")));
  }
}
// src/routes/mcp.ts — Model Context Protocol server (Streamable HTTP transport).
// Implements MCP spec revision 2025-06-18 Streamable HTTP:
//   - POST with JSON-RPC message; server responds with text/event-stream
//     containing "event: message\ndata: {json}\n\n" OR application/json
//   - GET returns 405 (we don't offer server-initiated SSE streams)
//   - 404 on POST means "session expired, re-initialize" (per spec §Session Mgmt)
//   - Unknown method returns JSON-RPC error with HTTP 200 (NOT 404)
//     to avoid triggering spurious session recovery in clients
//   - Auth: Bearer token in Settings → MCP Access
// Origin checked against Host to stop DNS-rebinding attacks.

import { App, SLUG_RE, parseJsonBody } from "../cms/env.js";
import { getSetting } from "../cms/d1.js";
import { sanitizePostHtml } from "../cms/sanitize.js";
import { autoExcerpt } from "../cms/render.js";
import { NavItem } from "../cms/render.js";
import { getStats } from "../cms/stats.js";
import type { Context } from "hono";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "phcloud-cms", version: "1.1.0" };
const TTL_MS = 300000;

type MCPCtx = Context<{
  Bindings: import("../cms/env.js").Env;
  Variables: import("../cms/env.js").Variables;
}>;

const rpcError = (
  id: unknown,
  code: number,
  message: string,
  data?: unknown,
) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message, ...(data !== undefined ? { data } : {}) },
});

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
  result: {
    resultType: "complete",
    content: [{ type: "text", text }],
    isError: true,
  },
});

// Wrap a single JSON-RPC response as an SSE-formatted text/event-stream body,
// matching the format used by real-world MCP servers (e.g. mcp.docs.astro.build).
// opencode's Streamable HTTP client expects SSE-formatted POST responses.
const sseResponse = (c: MCPCtx, payload: unknown) => {
  const body = "event: message\ndata: " + JSON.stringify(payload) + "\n\n";
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};

// ── Tools (deterministic order for client-side caching) ────────────
const TOOLS = [
  {
    name: "list_posts",
    title: "List posts",
    description: "List blog posts with optional pagination and status filter.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Max posts to return (1-50, default 20)",
        },
        status: {
          type: "string",
          enum: ["published", "draft", "all"],
          description: "Filter by publish status (default all)",
        },
      },
    },
  },
  {
    name: "get_post",
    title: "Get post",
    description:
      "Fetch a single post by id or slug, including full content and tags.",
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
    description:
      "Create a new draft (or published) post or page. Returns the new post's id and slug.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Post/page title (required)" },
        slug: {
          type: "string",
          description: "URL slug; auto-generated from title if omitted",
        },
        content: { type: "string", description: "Content as sanitized HTML" },
        excerpt: {
          type: "string",
          description: "Plain-text excerpt; auto-generated if omitted",
        },
        published: {
          type: "boolean",
          description: "Publish immediately (default false)",
        },
        type: {
          type: "string",
          enum: ["post", "page"],
          description: "Content type: post or page (default: post)",
        },
        add_to_nav: {
          type: "boolean",
          description:
            "If true and type=page, add this page to navigation menu",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "delete_post",
    title: "Delete post",
    description: "Permanently delete a post or page by id or slug.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "Post/page id" },
        slug: { type: "string", description: "Post/page slug" },
        type: {
          type: "string",
          enum: ["post", "page"],
          description: "Content type filter when using slug",
        },
      },
    },
  },
  {
    name: "update_post",
    title: "Update post",
    description:
      "Update fields of an existing post or page identified by id or slug. Only provided fields change.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "Post/page id" },
        slug: { type: "string", description: "Post/page slug" },
        title: { type: "string", description: "New title" },
        content: {
          type: "string",
          description: "New content as sanitized HTML",
        },
        excerpt: { type: "string", description: "New excerpt" },
        published: { type: "boolean", description: "Publish or unpublish" },
        meta_title: {
          type: "string",
          description: "SEO meta title (max 60 chars)",
        },
        meta_description: {
          type: "string",
          description: "SEO meta description (max 160 chars)",
        },
        type: {
          type: "string",
          enum: ["post", "page"],
          description: "Content type filter when using slug: post or page",
        },
      },
    },
  },
  {
    name: "publish_post",
    title: "Publish post",
    description:
      "Publish (or with publish=false, unpublish) a post or page by id or slug.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "Post/page id" },
        slug: { type: "string", description: "Post/page slug" },
        publish: {
          type: "boolean",
          description: "True to publish, false to unpublish (default true)",
        },
        type: {
          type: "string",
          enum: ["post", "page"],
          description: "Content type filter when using slug",
        },
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
    description:
      "Traffic statistics: daily views, top pages, and totals for the last N days.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "integer",
          description: "Lookback window (1-90, default 30)",
        },
      },
    },
  },
  {
    name: "get_nav",
    title: "Get navigation",
    description: "Get the current navigation menu items.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "update_nav",
    title: "Update navigation",
    description: "Replace the entire navigation menu with new items.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Link label" },
              url: {
                type: "string",
                description: "Link URL (e.g. /about, /privacy)",
              },
            },
            required: ["label", "url"],
          },
        },
      },
      required: ["items"],
    },
  },
];

export function registerMcpRoute(app: App): void {
  const mcpHandler = async (c: MCPCtx) => {
    // GET → 405 per Streamable HTTP spec §Listening for Messages:
    // "The server MUST either return Content-Type: text/event-stream in response
    // to this HTTP GET, or else return HTTP 405 Method Not Allowed."
    // We don't offer server-initiated SSE streams, so we 405.
    if (c.req.method === "GET") {
      return c.json(
        rpcError(
          null,
          -32601,
          "Method not allowed: GET not supported, use POST",
        ),
        405,
      );
    }

    if (c.req.method === "DELETE") {
      // Per spec §Session Management: clients MAY DELETE to terminate sessions.
      // We don't track server-side session state beyond the cache, so 202 is fine.
      return c.body(null, 202);
    }

    if (c.req.method !== "POST") {
      return c.json(rpcError(null, -32601, "Method not allowed"), 405);
    }

    // DNS-rebinding protection per spec §Security Warning.
    const origin = c.req.header("origin");
    if (origin) {
      const host = c.req.header("host") ?? "";
      const allowed =
        "https://" + host + (origin.startsWith("http://") ? "" : "");
      if (origin !== allowed && origin !== "http://" + host) {
        return c.json(rpcError(null, -32600, "Invalid Origin"), 403);
      }
    }

    // Gate: Bearer auth against the configured MCP token. No token = endpoint off.
    const token = await getSetting(c.env.DB, "mcp_token");
    if (!token)
      return c.json(
        rpcError(
          null,
          -32001,
          "MCP access token is not configured on this site",
        ),
        401,
      );
    const auth = c.req.header("authorization") ?? "";
    if (auth !== "Bearer " + token)
      return c.json(rpcError(null, -32001, "Unauthorized"), 401);

    const body = await parseJsonBody(c);
    if (!body) return c.json(rpcError(null, -32700, "Parse error"), 400);
    const method = String(body.method ?? "");
    const id = body.id ?? null;

    // Per spec §Sending Messages: notifications/responses (no id) → 202 no body.
    if (id === null || id === undefined) return c.body(null, 202);

    // ── Method dispatch ──
    // Per spec §Session Management, a 404 means "session expired, re-initialize."
    // We must NOT return 404 for anything other than session expiry, because
    // clients (e.g. opencode) interpret any 404 as "start a new session" and
    // then loop forever on the same method. Unknown methods return JSON-RPC
    // error -32601 with HTTP 200.

    if (method === "initialize") {
      // Per spec: server MAY assign a session id by including Mcp-Session-Id
      // header on the init response. We don't enforce sessions, so we omit it
      // and stateless operation continues. Some clients (opencode #38891) drop
      // the header anyway; stateless is safe.
      return sseResponse(c, {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false }, logging: {} },
          serverInfo: SERVER_INFO,
        },
      });
    }

    if (method === "initialized" || method === "notifications/initialized") {
      return c.body(null, 202);
    }

    if (method === "ping") {
      return sseResponse(c, { jsonrpc: "2.0", id, result: {} });
    }

    if (method === "tools/list") {
      return sseResponse(c, {
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS },
      });
    }

    if (method === "tools/call") {
      const name = String((body.params as Record<string, unknown>)?.name ?? "");
      const args = ((body.params as Record<string, unknown>)?.arguments ??
        {}) as Record<string, unknown>;
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool)
        return sseResponse(c, rpcError(id, -32602, "Unknown tool: " + name));
      return handleToolCall(c, id, name, args);
    }

    // Unknown method: JSON-RPC error with HTTP 200 — NOT 404, because 404
    // has special meaning (session expired) in the Streamable HTTP spec.
    return sseResponse(c, rpcError(id, -32601, "Method not found: " + method));
  };

  app.post("/api/mcp", mcpHandler);
  // Trailing-slash variant in case any client normalizes paths that way.
  app.post("/api/mcp/", mcpHandler);
}

// ── Tool implementations ───────────────────────────────────────────
async function handleToolCall(
  c: MCPCtx,
  id: unknown,
  name: string,
  args: Record<string, unknown>,
) {
  const db = c.env.DB;
  try {
    if (name === "list_posts") {
      const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));
      const status = String(args.status ?? "all");
      const where =
        status === "published"
          ? "WHERE published = 1"
          : status === "draft"
            ? "WHERE published = 0"
            : "";
      const rows = await db
        .prepare(
          "SELECT id, title, slug, published, excerpt, updated_at FROM posts " +
            where +
            " ORDER BY updated_at DESC LIMIT ?",
        )
        .bind(limit)
        .all();
      return sseResponse(
        c,
        toolResult(id, JSON.stringify(rows.results, null, 2), {
          items: rows.results,
        }),
      );
    }

    if (name === "get_post") {
      const typeFilter =
        args.type === "page" ? "page" : args.type === "post" ? "post" : null;
      const post =
        args.id !== undefined
          ? await db
              .prepare("SELECT * FROM posts WHERE id = ?")
              .bind(Number(args.id))
              .first()
          : args.slug
            ? await db
                .prepare(
                  "SELECT * FROM posts WHERE slug = ?" +
                    (typeFilter ? " AND type = ?" : ""),
                )
                .bind(String(args.slug), ...(typeFilter ? [typeFilter] : []))
                .first()
            : null;
      if (!post) return sseResponse(c, toolError(id, "Post/page not found"));
      const tags = await db
        .prepare(
          "SELECT t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?",
        )
        .bind((post as any).id)
        .all<{ name: string }>();
      const out = {
        ...(post as object),
        tags: tags.results.map((t) => t.name),
      };
      return sseResponse(c, toolResult(id, JSON.stringify(out, null, 2), out));
    }

    if (name === "create_post") {
      const title = String(args.title ?? "").trim();
      if (!title) return sseResponse(c, toolError(id, "title is required"));
      let slug = String(args.slug ?? "").trim();
      if (!slug)
        slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      if (!SLUG_RE.test(slug))
        return sseResponse(
          c,
          toolError(
            id,
            "Invalid slug — use lowercase letters, numbers, and hyphens",
          ),
        );
      const content = sanitizePostHtml(String(args.content ?? ""));
      let excerpt = String(args.excerpt ?? autoExcerpt(content)).slice(0, 255);
      if (!excerpt.trim()) excerpt = autoExcerpt(content);
      const published = args.published === true ? 1 : 0;
      const type = args.type === "page" ? "page" : "post";
      const addToNav = type === "page" && args.add_to_nav === true;
      const now = new Date().toISOString();
      try {
        const result = await db
          .prepare(
            "INSERT INTO posts (title, slug, content, excerpt, published, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(title, slug, content, excerpt, published, type, now, now)
          .run();
        const newId = result.meta.last_row_id;
        await c.env.CACHE.delete("cms:posts:pub");
        await c.env.CACHE.delete("cms:homepage");
        const out = { id: newId, slug, published: published === 1, type };
        let msg = "Created " + type + " #" + newId + " at /" + slug;
        if (addToNav) {
          const navVal = await getSetting(db, "nav");
          let nav: NavItem[] = [];
          try {
            const p = navVal ? JSON.parse(navVal) : [];
            nav = Array.isArray(p) ? p : [];
          } catch {}
          if (!nav.some((n) => n.url === "/" + slug)) {
            nav.push({ label: title, url: "/" + slug });
            await db
              .prepare(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('nav', ?)",
              )
              .bind(JSON.stringify(nav))
              .run();
            await c.env.CACHE.delete("cms:nav");
            await c.env.CACHE.delete("cms:settings");
            msg += " and added to navigation";
          }
        }
        return sseResponse(c, toolResult(id, msg, out));
      } catch (e: any) {
        if (String(e?.message ?? "").includes("UNIQUE"))
          return sseResponse(
            c,
            toolError(id, "A " + type + " with this slug already exists"),
          );
        throw e;
      }
    }

    if (name === "delete_post") {
      const typeFilter =
        args.type === "page" ? "page" : args.type === "post" ? "post" : null;
      const whereId =
        args.id !== undefined
          ? "id = ?"
          : args.slug
            ? "slug = ?" +
              (typeFilter ? " AND type = '" + typeFilter + "'" : "")
            : null;
      if (!whereId) return sseResponse(c, toolError(id, "Provide id or slug"));
      const bindVal =
        args.id !== undefined ? Number(args.id) : String(args.slug);
      const existing = await db
        .prepare("SELECT * FROM posts WHERE " + whereId)
        .bind(bindVal)
        .first();
      if (!existing)
        return sseResponse(c, toolError(id, "Post/page not found"));
      const cur = existing as any;
      await db.prepare("DELETE FROM posts WHERE id = ?").bind(cur.id).run();
      if (cur.type === "post") {
        await db
          .prepare("DELETE FROM post_tags WHERE post_id = ?")
          .bind(cur.id)
          .run();
      }
      await c.env.CACHE.delete("cms:posts:pub");
      await c.env.CACHE.delete("cms:homepage");
      // Remove from nav if present
      const navVal = await getSetting(db, "nav");
      let nav: NavItem[] = [];
      try {
        const p = navVal ? JSON.parse(navVal) : [];
        nav = Array.isArray(p) ? p : [];
      } catch {}
      const newNav = nav.filter(
        (n) => n.url !== "/" + cur.slug && n.url !== cur.slug,
      );
      if (newNav.length !== nav.length) {
        await db
          .prepare(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('nav', ?)",
          )
          .bind(JSON.stringify(newNav))
          .run();
        await c.env.CACHE.delete("cms:nav");
        await c.env.CACHE.delete("cms:settings");
      }
      return sseResponse(
        c,
        toolResult(
          id,
          "Deleted " + cur.type + " #" + cur.id + " (" + cur.slug + ")",
          { id: cur.id, slug: cur.slug },
        ),
      );
    }

    if (name === "update_post") {
      const typeFilter =
        args.type === "page" ? "page" : args.type === "post" ? "post" : null;
      const whereId =
        args.id !== undefined
          ? "id = ?"
          : args.slug
            ? "slug = ?" +
              (typeFilter ? " AND type = '" + typeFilter + "'" : "")
            : null;
      if (!whereId) return sseResponse(c, toolError(id, "Provide id or slug"));
      const bindVal =
        args.id !== undefined ? Number(args.id) : String(args.slug);
      const existing = await db
        .prepare("SELECT * FROM posts WHERE " + whereId)
        .bind(bindVal)
        .first();
      if (!existing)
        return sseResponse(c, toolError(id, "Post/page not found"));
      const cur = existing as any;
      const title =
        args.title !== undefined ? String(args.title).trim() : cur.title;
      const content =
        args.content !== undefined
          ? sanitizePostHtml(String(args.content))
          : cur.content;
      let excerpt =
        args.excerpt !== undefined
          ? String(args.excerpt).slice(0, 255)
          : cur.excerpt;
      if (!excerpt.trim()) excerpt = autoExcerpt(content);
      const published =
        args.published !== undefined
          ? args.published === true
            ? 1
            : 0
          : cur.published;
      const metaTitle =
        args.meta_title !== undefined
          ? String(args.meta_title).trim().slice(0, 60)
          : cur.meta_title;
      const metaDesc =
        args.meta_description !== undefined
          ? String(args.meta_description).trim().slice(0, 160)
          : cur.meta_description;
      await db
        .prepare(
          "UPDATE posts SET title=?, content=?, excerpt=?, published=?, meta_title=?, meta_description=?, updated_at=? WHERE id=?",
        )
        .bind(
          title,
          content,
          excerpt,
          published,
          metaTitle,
          metaDesc,
          new Date().toISOString(),
          cur.id,
        )
        .run();
      await c.env.CACHE.delete("cms:posts:pub");
      await c.env.CACHE.delete("cms:homepage");
      const out = {
        id: cur.id,
        slug: cur.slug,
        title,
        published: published === 1,
        type: cur.type,
      };
      return sseResponse(
        c,
        toolResult(id, "Updated " + cur.type + " #" + cur.id, out),
      );
    }

    if (name === "publish_post") {
      const typeFilter =
        args.type === "page" ? "page" : args.type === "post" ? "post" : null;
      const whereId =
        args.id !== undefined
          ? "id = ?"
          : args.slug
            ? "slug = ?" +
              (typeFilter ? " AND type = '" + typeFilter + "'" : "")
            : null;
      if (!whereId) return sseResponse(c, toolError(id, "Provide id or slug"));
      const publish = args.publish !== false;
      const bindVal =
        args.id !== undefined ? Number(args.id) : String(args.slug);
      const result = await db
        .prepare(
          "UPDATE posts SET published=?, publish_at=NULL, preview_token=NULL, updated_at=? WHERE " +
            whereId,
        )
        .bind(publish ? 1 : 0, new Date().toISOString(), bindVal)
        .run();
      if (result.meta.changes === 0)
        return sseResponse(c, toolError(id, "Post/page not found"));
      await c.env.CACHE.delete("cms:posts:pub");
      await c.env.CACHE.delete("cms:homepage");
      return sseResponse(
        c,
        toolResult(id, publish ? "Published" : "Unpublished"),
      );
    }

    if (name === "list_tags") {
      const rows = await db
        .prepare(
          "SELECT t.id, t.name, t.slug, (SELECT COUNT(*) FROM post_tags pt WHERE pt.tag_id = t.id) AS post_count FROM tags t ORDER BY t.name",
        )
        .all();
      return sseResponse(
        c,
        toolResult(id, JSON.stringify(rows.results, null, 2), {
          items: rows.results,
        }),
      );
    }

    if (name === "site_stats") {
      const days = Math.min(90, Math.max(1, Number(args.days) || 30));
      const stats = await getStats(db, days);
      return sseResponse(
        c,
        toolResult(id, JSON.stringify(stats, null, 2), stats),
      );
    }

    if (name === "get_nav") {
      const navVal = await getSetting(db, "nav");
      let nav: NavItem[] = [];
      try {
        const p = navVal ? JSON.parse(navVal) : [];
        nav = Array.isArray(p) ? p : [];
      } catch {}
      return sseResponse(
        c,
        toolResult(id, JSON.stringify(nav, null, 2), { items: nav }),
      );
    }

    if (name === "update_nav") {
      const items = (args.items as Array<{ label: string; url: string }>) ?? [];
      await db
        .prepare(
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('nav', ?)",
        )
        .bind(JSON.stringify(items))
        .run();
      await c.env.CACHE.delete("cms:nav");
      await c.env.CACHE.delete("cms:settings");
      return sseResponse(
        c,
        toolResult(id, "Navigation updated (" + items.length + " items)", {
          items: items,
        }),
      );
    }

    return sseResponse(c, toolError(id, "Unknown tool"));
  } catch (e) {
    console.error("MCP tool call failed:", e);
    return sseResponse(
      c,
      toolError(
        id,
        "Internal error: " + (e instanceof Error ? e.message : "unknown"),
      ),
    );
  }
}

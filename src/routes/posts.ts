// src/routes/posts.ts — admin Posts CRUD + editor preview + post admin pages.
// Post content is still markdown today; Phase 4 swaps the editor + storage.
// (Phase 2c extraction from index.ts.)

import { requireAuth } from "../cms/auth.js";
import { App, SLUG_RE, parseJsonBody } from "../cms/env.js";
import { DbPost, autoExcerpt, renderPost, shellFull } from "../cms/render.js";
import { getSetting, getAllSettings } from "../cms/d1.js";
import { sanitizePostHtml } from "../cms/sanitize.js";
import { getStats } from "../cms/stats.js";
import { snapshotVersion, listVersions, getVersion } from "../cms/versions.js";
import {
  adminShell,
  dashboardBody,
  postsBody,
  newPostBody,
  editBody,
} from "../admin.js";

export function registerPostRoutes(app: App): void {
  app.post("/api/admin/posts", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;

    const body = await parseJsonBody(c);
    if (!body) return c.json({ error: "Invalid JSON" }, 400);
    const title = String(body.title ?? "");
    const slug = String(body.slug ?? "");
    const content = sanitizePostHtml(String(body.content ?? ""));
    const metaTitle = String(body.meta_title ?? "")
      .trim()
      .slice(0, 60);
    const metaDescription = String(body.meta_description ?? "")
      .trim()
      .slice(0, 160);
    if (!title.trim()) return c.json({ error: "Title is required" }, 400);
    if (!slug || !SLUG_RE.test(slug))
      return c.json(
        { error: "Invalid slug — use lowercase letters, numbers, and hyphens" },
        400,
      );

    const db = c.env.DB;
    const now = new Date().toISOString();
    const publishAt = body.publish_at || null;
    const published = body.publish_at ? 0 : body.published === true ? 1 : 0;
    const previewToken = crypto.randomUUID();
    let excerpt = String(body.excerpt || autoExcerpt(content));
    if (excerpt.length > 255) excerpt = excerpt.slice(0, 255);

    let result;
    try {
      result = await db
        .prepare(
          "INSERT INTO posts (title, slug, content, excerpt, published, publish_at, preview_token, meta_title, meta_description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          title,
          slug,
          content,
          excerpt,
          published,
          publishAt,
          previewToken,
          metaTitle,
          metaDescription,
          now,
          now,
        )
        .run();
    } catch (e: any) {
      if (String(e?.message ?? "").includes("UNIQUE"))
        return c.json({ error: "A post with this slug already exists" }, 409);
      throw e;
    }

    const postId = result.meta.last_row_id;
    const tagIds = Array.isArray(body.tag_ids) ? body.tag_ids : [];
    if (tagIds.length) {
      for (const tid of tagIds) {
        await db
          .prepare(
            "INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)",
          )
          .bind(postId, tid)
          .run();
      }
    }
    await snapshotVersion(db, postId, title, content, excerpt);

    await c.env.CACHE.delete("cms:posts:pub");
    await c.env.CACHE.delete("cms:homepage");
    return c.json({ ok: true, id: postId });
  });

  app.get("/api/admin/posts", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;

    // Clamp page to a sane positive int: parseInt("NaN"/"abc") is NaN,
    // and Math.max(1, NaN) === NaN would then bind NaN to D1 and 500.
    // `|| 1` coerces NaN/0 to 1 so a malformed ?page= never crashes the list.
    const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;
    const countRow = await c.env.DB.prepare(
      // Posts only: pages have their own admin (type='page') and would
      // otherwise inflate Total Posts and leak into the All Posts list.
      "SELECT COUNT(*) as total FROM posts WHERE type = 'post'",
    ).first<{ total: number }>();
    const total = countRow?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    const rows = await c.env.DB.prepare(
      "SELECT id, title, slug, published, publish_at, updated_at FROM posts WHERE type = 'post' ORDER BY updated_at DESC LIMIT ? OFFSET ?",
    )
      .bind(limit, offset)
      .all<{
        id: number;
        title: string;
        slug: string;
        published: number;
        publish_at: string | null;
        updated_at: string;
      }>();
    return c.json({ results: rows.results, total, page, totalPages });
  });

  app.get("/api/admin/posts/:id", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;

    const id = c.req.param("id");
    const post = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?")
      .bind(id)
      .first<DbPost>();
    if (!post)
      return c.body(JSON.stringify({ error: "Not found" }), 404, {
        "Content-Type": "application/json",
      });
    return c.json(post);
  });

  app.patch("/api/admin/posts/:id", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;

    const id = c.req.param("id");
    const body = await parseJsonBody(c);
    if (!body) return c.json({ error: "Invalid JSON" }, 400);
    const title = String(body.title ?? "");
    const slug = String(body.slug ?? "");
    const content = sanitizePostHtml(String(body.content ?? ""));
    const metaTitle = String(body.meta_title ?? "")
      .trim()
      .slice(0, 60);
    const metaDescription = String(body.meta_description ?? "")
      .trim()
      .slice(0, 160);
    if (!title.trim()) return c.json({ error: "Title is required" }, 400);
    if (!slug || !SLUG_RE.test(slug))
      return c.json(
        { error: "Invalid slug — use lowercase letters, numbers, and hyphens" },
        400,
      );

    const now = new Date().toISOString();
    const publishAt = body.publish_at || null;
    const published = body.publish_at ? 0 : body.published === true ? 1 : 0;
    let excerpt = String(body.excerpt || autoExcerpt(content));
    if (excerpt.length > 255) excerpt = excerpt.slice(0, 255);

    const existing = await c.env.DB.prepare(
      "SELECT preview_token FROM posts WHERE id = ?",
    )
      .bind(id)
      .first<{ preview_token: string | null }>();
    const previewToken = existing?.preview_token || crypto.randomUUID();

    let result;
    try {
      result = await c.env.DB.prepare(
        "UPDATE posts SET title=?, slug=?, content=?, excerpt=?, published=?, publish_at=?, preview_token=?, meta_title=?, meta_description=?, updated_at=? WHERE id=?",
      )
        .bind(
          title,
          slug,
          content,
          excerpt,
          published,
          publishAt,
          previewToken,
          metaTitle,
          metaDescription,
          now,
          id,
        )
        .run();
    } catch (e: any) {
      if (String(e?.message ?? "").includes("UNIQUE"))
        return c.json({ error: "A post with this slug already exists" }, 409);
      throw e;
    }
    if (result.meta.changes === 0)
      return c.json({ error: "Post not found" }, 404);
    await snapshotVersion(c.env.DB, Number(id), title, content, excerpt);

    if (Array.isArray(body.tag_ids)) {
      await c.env.DB.prepare("DELETE FROM post_tags WHERE post_id = ?")
        .bind(id)
        .run();
      for (const tid of body.tag_ids) {
        await c.env.DB.prepare(
          "INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)",
        )
          .bind(id, tid)
          .run();
      }
    }

    await c.env.CACHE.delete("cms:posts:pub");
    await c.env.CACHE.delete("cms:homepage");
    return c.json({ ok: true, preview_token: previewToken });
  });

  app.delete("/api/admin/posts/:id", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;

    const result = await c.env.DB.prepare("DELETE FROM posts WHERE id = ?")
      .bind(c.req.param("id"))
      .run();
    if (result.meta.changes === 0)
      return c.json({ error: "Post not found" }, 404);
    await c.env.CACHE.delete("cms:posts:pub");
    await c.env.CACHE.delete("cms:homepage");
    return c.json({ ok: true });
  });

  app.patch("/api/admin/posts/:id/publish", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const now = new Date().toISOString();
    const result = await c.env.DB.prepare(
      "UPDATE posts SET published=1, publish_at=NULL, preview_token=NULL, updated_at=? WHERE id=?",
    )
      .bind(now, c.req.param("id"))
      .run();
    if (result.meta.changes === 0)
      return c.json({ error: "Post not found" }, 404);
    await c.env.CACHE.delete("cms:posts:pub");
    await c.env.CACHE.delete("cms:homepage");
    return c.json({ ok: true });
  });

  app.patch("/api/admin/posts/:id/unpublish", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const now = new Date().toISOString();
    const result = await c.env.DB.prepare(
      "UPDATE posts SET published=0, updated_at=? WHERE id=?",
    )
      .bind(now, c.req.param("id"))
      .run();
    if (result.meta.changes === 0)
      return c.json({ error: "Post not found" }, 404);
    await c.env.CACHE.delete("cms:posts:pub");
    await c.env.CACHE.delete("cms:homepage");
    return c.json({ ok: true });
  });

  // ── Dashboard stats ─────────────────────────────────────────────
  app.get("/api/admin/stats", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const days = Math.min(
      90,
      Math.max(1, parseInt(c.req.query("days") ?? "30", 10) || 30),
    );
    return c.json(await getStats(c.env.DB, days));
  });

  // ── Live preview (renders unsaved content through the real theme) ─
  app.post("/api/admin/preview", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const body = await parseJsonBody(c);
    if (!body) return c.json({ error: "Invalid JSON" }, 400);
    const db = c.env.DB;
    const [settings, navVal] = await Promise.all([
      getAllSettings(db),
      getSetting(db, "nav").then((v) => v ?? "[]"),
    ]);
    let nav: { label: string; url: string }[] = [];
    try {
      const p = JSON.parse(navVal);
      if (Array.isArray(p)) nav = p;
    } catch {
      /* ignore malformed nav */
    }
    const siteName = settings.site_name ?? "My Site";
    const siteLogo = settings.site_logo ?? null;
    const title = String(body.title ?? "Untitled");
    const content = sanitizePostHtml(String(body.content ?? ""));
    const html = shellFull(
      siteName,
      "",
      renderPost({ title, content, updated_at: new Date().toISOString() }),
      nav,
      siteLogo,
    );
    return c.html(html);
  });

  // ── Version history ─────────────────────────────────────────────
  app.post("/api/admin/posts/:id/versions", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const body = await parseJsonBody(c);
    if (!body) return c.json({ error: "Invalid JSON" }, 400);
    const title = String(body.title ?? "");
    const content = sanitizePostHtml(String(body.content ?? ""));
    const excerpt = String(body.excerpt ?? autoExcerpt(content)).slice(0, 255);
    await snapshotVersion(
      c.env.DB,
      Number(c.req.param("id")),
      title,
      content,
      excerpt,
    );
    return c.json({ ok: true });
  });

  app.get("/api/admin/posts/:id/versions", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const rows = await listVersions(c.env.DB, Number(c.req.param("id")));
    return c.json(
      rows.map((v) => ({
        id: v.id,
        saved_at: v.saved_at,
        title: v.title,
        excerpt: v.excerpt,
        content: v.content,
      })),
    );
  });

  app.post("/api/admin/posts/:id/versions/:vid/restore", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const db = c.env.DB;
    const version = await getVersion(
      db,
      Number(c.req.param("id")),
      Number(c.req.param("vid")),
    );
    if (!version) return c.json({ error: "Version not found" }, 404);
    await db
      .prepare(
        "UPDATE posts SET title=?, content=?, excerpt=?, updated_at=? WHERE id=?",
      )
      .bind(
        version.title,
        version.content,
        version.excerpt,
        new Date().toISOString(),
        c.req.param("id"),
      )
      .run();
    await snapshotVersion(
      db,
      Number(c.req.param("id")),
      version.title,
      version.content,
      version.excerpt ?? "",
    );
    await c.env.CACHE.delete("cms:posts:pub");
    await c.env.CACHE.delete("cms:homepage");
    return c.json({
      ok: true,
      post: {
        title: version.title,
        content: version.content,
        excerpt: version.excerpt ?? "",
      },
    });
  });

  // ── Admin pages (HTML) ───────────────────────────────────────────
  app.get("/admin", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return c.redirect("/admin/login");
    return c.html(adminShell("Dashboard", dashboardBody(), "/admin"));
  });

  app.get("/admin/posts", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return c.redirect("/admin/login");
    return c.html(adminShell("Posts", postsBody(), "/admin/posts"));
  });

  app.get("/admin/new", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return c.redirect("/admin/login");
    return c.html(adminShell("New Post", newPostBody(), "/admin/new"));
  });

  app.get("/admin/edit/:id", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return c.redirect("/admin/login");
    const id = c.req.param("id");
    const post = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?")
      .bind(id)
      .first<DbPost>();
    if (!post) return c.notFound();
    return c.html(
      adminShell(
        "Edit Post",
        editBody({
          id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          published: post.published,
          publish_at: post.publish_at,
          preview_token: post.preview_token,
          meta_title: post.meta_title ?? null,
          meta_description: post.meta_description ?? null,
          updated_at: post.updated_at,
        }),
        "/admin/posts",
      ),
    );
  });

  // ── Post tags (admin) ────────────────────────────────────────────
  app.get("/api/admin/posts/:id/tags", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const rows = await c.env.DB.prepare(
      "SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?",
    )
      .bind(c.req.param("id"))
      .all<{ id: number; name: string }>();
    return c.json(rows.results);
  });
}

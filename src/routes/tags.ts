// src/routes/tags.ts — admin Tags CRUD + tags admin page.
// (Phase 2c extraction from index.ts.)

import { requireAuth } from "../cms/auth.js";
import { App, parseJsonBody } from "../cms/env.js";
import { adminShell, tagsBody } from "../admin.js";

export function registerTagRoutes(app: App): void {
  app.get("/api/admin/tags", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const rows = await c.env.DB.prepare(
      "SELECT t.id, t.name, t.slug, (SELECT COUNT(*) FROM post_tags pt WHERE pt.tag_id = t.id) AS post_count FROM tags t ORDER BY t.name",
    ).all<{ id: number; name: string; slug: string; post_count: number }>();
    return c.json(rows.results);
  });

  app.post("/api/admin/tags", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const body = await parseJsonBody(c);
    if (!body) return c.json({ error: "Invalid JSON" }, 400);
    const name = String(body.name ?? "").trim();
    const slug = String(body.slug ?? "").trim();
    if (!name || !slug) return c.json({ error: "Name and slug required" }, 400);
    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO tags (name, slug) VALUES (?, ?)",
    )
      .bind(name, slug)
      .run();
    return c.json({ ok: true });
  });

  app.delete("/api/admin/tags/:id", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param("id");
    await c.env.DB.prepare("DELETE FROM post_tags WHERE tag_id = ?").bind(id).run();
    await c.env.DB.prepare("DELETE FROM tags WHERE id = ?").bind(id).run();
    return c.json({ ok: true });
  });

  app.get("/admin/tags", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return c.redirect("/admin/login");
    return c.html(adminShell("Tags", tagsBody(), "/admin/tags"));
  });
}

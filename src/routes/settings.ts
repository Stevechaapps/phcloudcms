// src/routes/settings.ts — admin Settings API + settings admin page.
// (Phase 2c extraction from index.ts.)

import { requireAuth } from "../cms/auth.js";
import { App, parseJsonBody } from "../cms/env.js";
import { getAllSettings, getSetting } from "../cms/d1.js";
import { deleteImage } from "../cms/images.js";
import { adminShell, settingsBody } from "../admin.js";

export function registerSettingsRoutes(app: App): void {
  app.get("/api/admin/settings", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const settings = await getAllSettings(c.env.DB);
    return c.json({
      site_name: settings.site_name ?? "",
      seo_description: settings.seo_description ?? "",
      site_logo: settings.site_logo ?? null,
    });
  });

  app.patch("/api/admin/settings", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const body = await parseJsonBody(c);
    if (!body) return c.json({ error: "Invalid JSON" }, 400);
    const db = c.env.DB;
    if (body.site_name !== undefined)
      await db
        .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('site_name', ?)")
        .bind(body.site_name)
        .run();
    if (body.seo_description !== undefined)
      await db
        .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('seo_description', ?)")
        .bind(body.seo_description)
        .run();
    if (body.site_logo !== undefined) {
      // Replacing or clearing the logo reclaims the previous logo's image row
      // (and its /img/:id KV cache) — otherwise every re-upload leaves an
      // unreferenced row in D1 + KV forever. ponytail: we only reclaim a
      // /img/N row; a logo pointing elsewhere (or post-content <img> use of the
      // old image) is left as-is.
      const prev = await getSetting(db, "site_logo");
      const prevId = prev?.match(/^\/img\/(\d+)$/)?.[1];
      const newVal = String(body.site_logo ?? "");
      const newId = newVal.match(/^\/img\/(\d+)$/)?.[1];
      if (prevId && prevId !== newId) {
        await deleteImage(db, parseInt(prevId, 10), c.env.CACHE);
      }
      await db
        .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('site_logo', ?)")
        .bind(newVal)
        .run();
    }
    await c.env.CACHE.delete("cms:settings");
    return c.json({ ok: true });
  });

  app.get("/admin/settings", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return c.redirect("/admin/login");
    return c.html(adminShell("Settings", settingsBody()));
  });
}

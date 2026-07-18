// src/routes/wipe.ts — "Reset Site" / start over.
// Empties every D1 data table (keeping the schema) and flushes ALL KV, so a
// site can start over cleanly: the onboarding guard re-shows the install
// wizard (settings.status + its cms:settings cache are gone), the user
// recreates an admin, and is logged in fresh.
//
// Authorization: a valid admin session (requireAuth). This is reached from the
// "Reset Site" button in the Settings admin page, not a token/secret, so any
// logged-in admin can use it with nothing to configure. Never public.

import { requireAuth } from "../cms/auth.js";
import { App } from "../cms/env.js";
import { migrate } from "../cms/d1.js";

export function registerWipeRoute(app: App): void {
  app.post("/api/admin/wipe", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;

    const db = c.env.DB;
    // Ensure every table exists first (no-op if present), then empty them.
    // This way the endpoint is safe whether tables exist or were dropped.
    await migrate(db);
    await db.batch([
      db.prepare("DELETE FROM post_tags"),
      db.prepare("DELETE FROM tags"),
      db.prepare("DELETE FROM images"),
      db.prepare("DELETE FROM posts"),
      db.prepare("DELETE FROM admins"),
      db.prepare("DELETE FROM plugins"),
      db.prepare("DELETE FROM settings"),
    ]);
    // Reset autoincrement counters. sqlite_sequence only exists once a table
    // with AUTOINCREMENT has been inserted into, so guard with try/catch.
    try {
      await db.prepare("DELETE FROM sqlite_sequence").run();
    } catch {
      /* table absent — nothing to reset */
    }

    // Flush ALL KV: stale sessions (so the loop cookie stops bouncing),
    // cms:settings (so the cached "configured" flag doesn't hide the wizard
    // for up to 10 min), login rate-limit counters, and page/image caches.
    let cursor: string | undefined;
    do {
      const list = cursor
        ? await c.env.CACHE.list({ cursor })
        : await c.env.CACHE.list();
      await Promise.all(list.keys.map((k) => c.env.CACHE.delete(k.name)));
      cursor = list.list_complete ? undefined : list.cursor;
    } while (cursor);

    return c.json({ ok: true, reset: true });
  });
}


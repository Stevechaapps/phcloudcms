// src/cms/stats.ts — traffic tracking + dashboard stats.
// Views are upserted into D1 as daily per-post counters (one write per post
// per day — nothing on the free tier's write budget for a small site), and
// mirrored to Analytics Engine as a zero-setup bonus for deeper queries.

type StatsEnv = { DB: D1Database; ANALYTICS?: AnalyticsEngineDataset };

export async function trackView(env: StatsEnv, slug: string, type: string): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  try {
    await env.DB.prepare(
      "INSERT INTO stats_views (date, slug, type, views) VALUES (?, ?, ?, 1) ON CONFLICT(date, slug) DO UPDATE SET views = views + 1",
    )
      .bind(date, slug, type)
      .run();
  } catch {
    // best-effort: a broken stats write must never break page rendering
  }
  try {
    env.ANALYTICS?.writeDataPoint({
      blobs: [slug, type],
      doubles: [1],
      indexes: [slug],
    });
  } catch {
    // best-effort
  }
}

export async function getStats(db: D1Database, days = 30): Promise<{
  daily: { date: string; views: number }[];
  top: { slug: string; type: string; views: number; title: string | null }[];
  totals: { views: number; days: number };
}> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const daily = await db
    .prepare("SELECT date, SUM(views) AS views FROM stats_views WHERE date >= ? GROUP BY date ORDER BY date")
    .bind(since)
    .all<{ date: string; views: number }>();
  const top = await db
    .prepare(
      "SELECT s.slug, s.type, SUM(s.views) AS views, p.title FROM stats_views s LEFT JOIN posts p ON p.slug = s.slug AND p.type = s.type WHERE s.date >= ? GROUP BY s.slug, s.type ORDER BY views DESC LIMIT 10",
    )
    .bind(since)
    .all<{ slug: string; type: string; views: number; title: string | null }>();
  const totals = await db
    .prepare("SELECT SUM(views) AS views, COUNT(DISTINCT date) AS days FROM stats_views")
    .first<{ views: number; days: number }>();
  return {
    daily: daily.results,
    top: top.results,
    totals: { views: totals?.views ?? 0, days: totals?.days ?? 0 },
  };
}

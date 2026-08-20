// src/cms/versions.ts — post version snapshots (save-time history + restore).
// A snapshot is taken on every admin save; the newest 50 per post are kept.

const MAX_VERSIONS_PER_POST = 50;

export type PostVersion = {
  id: number;
  post_id: number;
  saved_at: string;
  title: string;
  content: string;
  excerpt: string | null;
};

export async function snapshotVersion(
  db: D1Database,
  postId: number,
  title: string,
  content: string,
  excerpt: string,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO post_versions (post_id, saved_at, title, content, excerpt) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(postId, new Date().toISOString(), title, content, excerpt)
    .run();
  // Prune to the newest 50. D1 supports DELETE with a subquery.
  await db
    .prepare(
      "DELETE FROM post_versions WHERE post_id = ? AND id NOT IN (SELECT id FROM post_versions WHERE post_id = ? ORDER BY id DESC LIMIT ?)",
    )
    .bind(postId, postId, MAX_VERSIONS_PER_POST)
    .run();
}

export async function listVersions(db: D1Database, postId: number): Promise<PostVersion[]> {
  const rows = await db
    .prepare(
      "SELECT id, post_id, saved_at, title, content, excerpt FROM post_versions WHERE post_id = ? ORDER BY id DESC LIMIT 50",
    )
    .bind(postId)
    .all<PostVersion>();
  return rows.results;
}

export async function getVersion(
  db: D1Database,
  postId: number,
  versionId: number,
): Promise<PostVersion | null> {
  return (
    (await db
      .prepare("SELECT * FROM post_versions WHERE id = ? AND post_id = ?")
      .bind(versionId, postId)
      .first<PostVersion>()) ?? null
  );
}
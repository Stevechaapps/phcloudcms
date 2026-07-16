// src/cms/migrations.ts — versioned migration system with backfill support
//
// Creates a _migrations tracking table so we know exactly which schema
// changes have been applied to a given database. Safe to call on every
// request — already-applied migrations are skipped.
//
// Backfill: for databases that predate this system, runMigrations detects
// the current schema by inspection and applies only the missing pieces.

export interface MigrationRecord {
  id: string;
  description: string;
  appliedAt: string;
}

const MIGRATIONS = [
  {
    id: "2025-01-01-001-create-migrations-table",
    description: "Create _migrations tracking table",
    up: () => `CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    id: "2025-01-01-002-add-type-to-posts",
    description: "Add type column to posts (post vs page)",
    up: () =>
      "ALTER TABLE posts ADD COLUMN type TEXT NOT NULL DEFAULT 'post'",
  },
  {
    id: "2025-01-01-003-add-publish-at-to-posts",
    description: "Add publish_at column to posts (scheduled publishing)",
    up: () => "ALTER TABLE posts ADD COLUMN publish_at TEXT",
  },
  {
    id: "2025-01-01-004-add-preview-token-to-posts",
    description: "Add preview_token column to posts (preview share links)",
    up: () => "ALTER TABLE posts ADD COLUMN preview_token TEXT",
  },
  {
    id: "2025-01-01-005-add-excerpt-to-posts",
    description: "Add excerpt column to posts (auto-generated or manual)",
    up: () => "ALTER TABLE posts ADD COLUMN excerpt TEXT",
  },
  {
    id: "2025-01-01-006-create-tags",
    description: "Create tags table",
    up: () => `CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE
    )`,
  },
  {
    id: "2025-01-01-007-create-post-tags",
    description: "Create post_tags join table",
    up: () => `CREATE TABLE IF NOT EXISTS post_tags (
      post_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (post_id, tag_id)
    )`,
  },
  {
    id: "2025-01-01-008-create-admins",
    description: "Create admins table",
    up: () => `CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE DEFAULT 'admin',
      password_hash TEXT NOT NULL
    )`,
  },
  {
    id: "2025-01-01-009-create-images",
    description: "Create images table (D1 BLOB storage)",
    up: () => `CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      mime TEXT NOT NULL,
      data BLOB NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL
    )`,
  },
  {
    id: "2025-01-01-010-add-indexes",
    description: "Add performance indexes on posts",
    up: () =>
      "CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug); " +
      "CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published); " +
      "CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type)",
  },
  {
    id: "2025-01-01-011-add-nav-to-settings",
    description: "Allow nav JSON in settings (no schema change needed — key/value table)",
    up: () => "SELECT 1", // no-op: nav lives in settings(key='nav', value=JSON)
  },
];

export async function runMigrations(db: D1Database): Promise<string[]> {
  const applied: string[] = [];

  // Create tracking table if it doesn't exist (idempotent)
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS _migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    )
    .run();

  // Find already-applied migrations
  const existing = await db
    .prepare("SELECT id FROM _migrations")
    .all<{ id: string }>();
  const appliedSet = new Set(existing.results.map((r) => r.id));

  for (const migration of MIGRATIONS) {
    if (appliedSet.has(migration.id)) continue;
    const stmt = migration.up();
    if (stmt === "SELECT 1") {
      // no-op migration — still record it
    } else {
      try {
        await db.prepare(stmt).run();
      } catch (err) {
        // If ALTER TABLE fails because column already exists, that's fine —
        // still record the migration as applied
        if (
          !String(err).includes("duplicate column") &&
          !String(err).includes("already exists")
        ) {
          throw err;
        }
      }
    }
    await db
      .prepare("INSERT OR IGNORE INTO _migrations (id) VALUES (?)")
      .bind(migration.id)
      .run();
    applied.push(migration.id);
  }

  return applied;
}

export async function getAppliedMigrations(
  db: D1Database,
): Promise<string[]> {
  try {
    const rows = await db
      .prepare("SELECT id FROM _migrations ORDER BY applied_at")
      .all<{ id: string }>();
    return rows.results.map((r) => r.id);
  } catch {
    return [];
  }
}

export async function backfillMissingDefaults(db: D1Database): Promise<void> {
  // For every posts row that was created before the type+publish_at+preview_token
  // columns existed, ensure they have non-NULL values so queries don't break.

  // Set type='post' where NULL (shouldn't happen with DEFAULT, but defensive)
  await db
    .prepare(
      "UPDATE posts SET type='post' WHERE type IS NULL",
    )
    .run();

  // Set published=0 where NULL (defensive)
  await db
    .prepare(
      "UPDATE posts SET published=0 WHERE published IS NULL",
    )
    .run();

  // Set created_at/updated_at where NULL (defensive)
  const now = new Date().toISOString();
  await db
    .prepare(
      "UPDATE posts SET created_at=COALESCE(created_at, ?), updated_at=COALESCE(updated_at, ?)",
    )
    .bind(now, now)
    .run();
}

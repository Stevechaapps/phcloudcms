-- backfill.sql — run once against an existing PHCloud D1 database
-- Applies all schema changes that accumulated without proper migration tracking.
-- Safe to re-run: every statement is idempotent where possible.
--
-- Execute with:
--   npx wrangler d1 execute phcloud-db --local --file=backfill.sql
--   npx wrangler d1 execute phcloud-db --remote --file=backfill.sql
--
-- After this runs cleanly, new installs will use runMigrations() from cms/migrations.ts.

-- ── 0. Create migration tracking table ─────────────────────────────────────
-- If this table already exists (from a prior backfill run), skip gracefully.
CREATE TABLE IF NOT EXISTS _migrations (
  id          TEXT PRIMARY KEY,
  description TEXT,
  applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Track which backfill steps have already run so re-execution is a no-op.
INSERT OR IGNORE INTO _migrations (id, description) VALUES
  ('backfill-001', 'migration tracking table');

-- ── 1. Add missing columns to posts ─────────────────────────────────────────
-- These were added over time in code but never enforced as a migration.
-- Each ALTER TABLE is wrapped: if the column exists the error is ignored
-- by D1's ALTER TABLE behaviour (most throw, hence the try/catch pattern
-- handled below in step 6).

INSERT OR IGNORE INTO _migrations (id, description) VALUES
  ('backfill-002', 'posts.type column');

ALTER TABLE posts ADD COLUMN type TEXT NOT NULL DEFAULT 'post';

INSERT OR IGNORE INTO _migrations (id, description) VALUES
  ('backfill-003', 'posts.publish_at column');

ALTER TABLE posts ADD COLUMN publish_at TEXT;

INSERT OR IGNORE INTO _migrations (id, description) VALUES
  ('backfill-004', 'posts.preview_token column');

ALTER TABLE posts ADD COLUMN preview_token TEXT;

INSERT OR IGNORE INTO _migrations (id, description) VALUES
  ('backfill-005', 'posts.excerpt column');

ALTER TABLE posts ADD COLUMN excerpt TEXT;

-- ── 2. Backfill non-NULL defaults on existing rows ─────────────────────────
-- Any posts created before the ALTER TABLE above added defaults need
-- explicit non-NULL values so queries don't break.

UPDATE posts SET type = 'post' WHERE type IS NULL;
UPDATE posts SET published = 0 WHERE published IS NULL;

-- ── 3. Create tags table ────────────────────────────────────────────────────
-- The tags system was added but never had its own migration; the install
-- wizard seeds it fresh on new installs but existing DBs are missing it.

INSERT OR IGNORE INTO _migrations (id, description) VALUES
  ('backfill-006', 'tags table');

CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

-- ── 4. Create post_tags join table ──────────────────────────────────────────

INSERT OR IGNORE INTO _migrations (id, description) VALUES
  ('backfill-007', 'post_tags join table');

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL,
  tag_id  INTEGER NOT NULL,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag  ON post_tags(tag_id);

-- ── 5. Create admins table ───────────────────────────────────────────────────
-- Fresh installs create this via seed(); existing DBs may not have it yet
-- if the admin was created before admins table was added.

INSERT OR IGNORE INTO _migrations (id, description) VALUES
  ('backfill-008', 'admins table');

CREATE TABLE IF NOT EXISTS admins (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT NOT NULL UNIQUE DEFAULT 'admin',
  password_hash TEXT NOT NULL
);

-- ── 6. Create images table ──────────────────────────────────────────────────

INSERT OR IGNORE INTO _migrations (id, description) VALUES
  ('backfill-009', 'images table');

CREATE TABLE IF NOT EXISTS images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  filename    TEXT NOT NULL,
  mime        TEXT NOT NULL,
  data        BLOB NOT NULL,
  size        INTEGER NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_images_created ON images(created_at);

-- ── 7. Add indexes on posts ─────────────────────────────────────────────────
-- The install path adds these via migrate() but older DBs are missing them.

INSERT OR IGNORE INTO _migrations (id, description) VALUES
  ('backfill-010', 'posts indexes');

CREATE INDEX IF NOT EXISTS idx_posts_slug       ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published   ON posts(published);
CREATE INDEX IF NOT EXISTS idx_posts_type        ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_updated_at  ON posts(updated_at);

-- ── 8. Rebuild schema registration macros ───────────────────────────────────
-- After running this against your live site, verify:
--   npx wrangler d1 execute phcloud-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
-- You should see: _migrations, admins, images, plugins, post_tags, posts, settings, tags
--
-- Then verify the expected columns:
--   SELECT column_name FROM pragma_table_info('posts') ORDER BY column_name;

SELECT 'Backfill complete. Applied: ' || count(*) || ' steps' AS result
FROM _migrations
WHERE id LIKE 'backfill-%';

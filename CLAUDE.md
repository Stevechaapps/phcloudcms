# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**PHCloud CMS** — The world's lightest CMS, running entirely on Cloudflare free tier via Cloudflare Workers.

- Hono v4.12 framework (NOT Astro)
- TypeScript 7.0 with full type safety
- Cloudflare D1 (SQLite) + KV for persistence
- ~50KB bundle, zero runtime dependencies

---

## Quick Commands

```bash
# Install dependencies
npm install

# Run locally (dev server on http://localhost:8787)
npm run dev

# TypeScript check
npx tsc --noEmit
```

---

## Architecture

```
phcloud/
├── src/
│   ├── cms/
│   │   ├── registry.ts       # Plugin hook system (CMSRegistry class)
│   │   ├── middleware.ts     # Onboarding guard + cache helper
│   │   ├── d1.ts             # D1 schema, migrations, queries
│   │   └── auth.ts           # Password hashing (PBKDF2)
│   ├── plugins/
│   │   ├── index.ts          # Plugin auto-discovery hub
│   │   ├── seo.ts            # SEO plugin (meta tags, Open Graph)
│   │   └── sitemap.ts        # XML sitemap generator
│   ├── admin.ts              # Admin panel HTML rendering
│   └── index.ts              # Main Hono router (all routes)
└── package.json              # Dependencies + scripts
```

---

## One-Click Deploy for Users

1. **Fork** this repo to your GitHub
2. Go to **Cloudflare Dashboard → Workers & Pages → Create application → Import a repository**
3. Select your fork, leave build settings default (blank build command)
4. In **Settings → Bindings** add:
   - **D1 database**: Variable name `DB` → select or create a D1 database
   - **KV namespace**: Variable name `CACHE` → select or create a KV namespace
5. Redeploy (Retry deployment or push a commit)
6. Visit your Worker URL → the install wizard appears → fill in site name + admin credentials
7. Done — auto-login to `/admin`

---

## Core Patterns

### Plugin Hook System

Plugins register hooks that execute in pipelines:

```typescript
// Register a hook
registry.register('render:head', injectScripts);

// Execute pipeline
const result = await registry.executePipeline('render:head', payload);
```

**Available hooks:**
- `render:head` — Inject meta tags, scripts, styles
- `render:body` — Modify body HTML structure
- `render:sitemap` — Add URLs to sitemap

### Route Structure

All routes in `src/index.ts` use Hono router:

| Route | Purpose |
|-------|---------|
| `GET /` | Public homepage |
| `GET /:slug` | Single post view |
| `GET /admin` | Admin dashboard |
| `GET /admin/login` | Login form |
| `POST /api/auth/login` | Session auth |
| `POST /api/install` | Initial setup (install wizard) |
| `POST /api/admin/posts` | Create post |
| `GET /api/admin/posts` | List posts |
| `PATCH /api/admin/posts/:id` | Update post |
| `DELETE /api/admin/posts/:id` | Delete post |
| `PATCH /api/admin/plugins/:id` | Toggle plugin |
| `GET /sitemap.xml` | XML sitemap |

### Admin Panel

`src/admin.ts` renders admin HTML using template literals:
- `dashboardBody()` — Post list, stats
- `editBody()` — Post editor form
- `pluginsBody()` — Plugin manager UI

### Database Schema

Tables created automatically on first install via `db.batch()`:

```sql
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, content TEXT NOT NULL, excerpt TEXT, published INTEGER DEFAULT 0 NOT NULL, created_at TEXT DEFAULT (datetime('now')) NOT NULL, updated_at TEXT DEFAULT (datetime('now')) NOT NULL);
CREATE TABLE plugins (id TEXT PRIMARY KEY, active INTEGER DEFAULT 0 NOT NULL);
CREATE TABLE admins (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE DEFAULT 'admin', password_hash TEXT NOT NULL);
```

---

## Important Conventions

1. **Imports always include `.js` extension** (ES modules)
2. **Type imports use `import type`** unless the value is needed at runtime
3. **All admin API endpoints use `c.req.json()`** (not `parseBody`) — client sends JSON
4. **All HTML responses use `c.html()`** from Hono context
5. **Empty responses use `c.body(null, 204)`** (not empty string)
6. **DB queries use explicit types:** `bind().first<DbPost>()`
7. **Admin routes must be registered before the `/:slug?` catch-all**

---

## Common Development Tasks

### Adding a Plugin Hook

1. Define hook in `src/cms/registry.ts` documentation
2. Register in plugin: `registry.register('hook:name', handler)`
3. Execute in route: `await registry.executePipeline('hook:name', payload)`

### Adding a Route

1. Add route in `src/index.ts` using `app.get()`, `app.post()`, etc.
2. Use `initActivePlugins()` to conditionally initialize plugins
3. Pass `c.env` for D1/KV bindings
4. Admin routes go BEFORE the `/:slug?` catch-all

### Testing Locally

```bash
# Run dev server (uses local D1 + KV via wrangler)
npm run dev

# Test API
curl http://localhost:8787
curl http://localhost:8787/sitemap.xml
```

---

## Theme/Plugin Distribution

**GitHub IS the marketplace** — no central repo, no uploads:

1. Developer creates plugin/theme → publishes on their GitHub
2. Site owner downloads `.ts` file → copies to their fork
3. Site owner registers in `src/plugins/index.ts`
4. Enable via `/admin/plugins`

---

## Brand Guidelines

See `BRAND.md` for full guidelines. Key points:
- Name: **PHCloud CMS**
- Tagline: "The world's lightest CMS"
- Colors: Cloudflare Orange #F97316, Cloud Blue #3B82F6, Slate #0F172A
- Voice: Developer-first, honest, lightweight ethos

# AGENTS.md — Coding agent instructions for PHCloud CMS

PHCloud CMS is a self-hosted blog/CMS that runs as a single Cloudflare Worker. This file tells any coding agent (opencode, Claude Code, Cursor, Codex, Aider, Goose, etc.) how to work on it. Read it fully before touching any file. The user's global rules at `~/.config/opencode/AGENTS.md` (if any) apply on top of these.

---

## What this repo is

- **One Worker, zero servers.** `src/index.ts` is the single Hono entry point. Every route — public, admin, REST, MCP — is registered here. There is no separate API server, no Node.js on the edge, no build step beyond `tsc --noEmit`.
- **Stack:** Hono on Cloudflare Workers; D1 (SQLite) for posts/pages/tags; KV for cache + sessions; Workers AI for content features; Images for uploads. The only runtime dep is `hono` itself.
- **Content is HTML, sanitized on write.** Authors edit in a `contentEditable` rich-text editor (`src/admin/editor-*.ts`). Stored as HTML in D1; re-sanitized on read as defense-in-depth. See "Sanitizer rules" below — it's the security boundary of the whole product.
- **An MCP server is built in.** `src/routes/mcp.ts` exposes the same admin tools (list/get/create/update/publish/delete posts, nav, tags, stats) over the Model Context Protocol at `/api/mcp`. If you're an agent connected to a PHCloud instance, your tools come from there. See "MCP usage" below.

## Build, lint, test

```
npm run dev          # wrangler dev (local D1, KV, AI bindings)
npm run build        # tsc --noEmit + check-inline-js + test:sanitize  ← run before every commit
npm test             # alias for test:sanitize
npm run test:sanitize
npm run lint         # prettier --check src/
npm run lint:fix     # prettier --write src/
```

**Always run `npm run build` before committing.** It runs `tsc --noEmit` (type-check), `scripts/check-inline-js.mjs` (parses every inline `<script>` block — tsc doesn't), and the sanitizer test suite. Green build is necessary but not sufficient — read the code you changed.

**Tests are zero-dep.** `tests/sanitize.test.mjs` uses Node ≥22.6's built-in `--experimental-strip-types` + `node:test`. Do not add vitest, jest, ts-node, or any other test framework — the project ethos is one runtime dep (hono). Add new tests as new `test(...)` blocks in the same file or sibling `*.test.mjs` files.

## Repo layout

```
src/
  index.ts                  # Hono entry — all routes registered here
  cms/
    sanitize.ts             # THE sanitizer. Read the top-of-file comment before editing.
    render.ts               # Read path: post HTML → page (re-sanitizes via sanitizePostHtml)
  routes/
    posts.ts pages.ts       # POST/PATCH/DELETE for content
    public.ts               # GET /, /:slug, sitemap.xml, feed.xml, llms.txt
    mcp.ts                  # MCP server — JSON-RPC over HTTP at /api/mcp
    nav.ts tags.ts          # Nav menu + tag CRUD
    auth.ts settings.ts     # Login + site settings
    admin.ts editor*.ts     # Server-rendered admin UI (template literals + inline scripts)
    install.ts wipe.ts      # First-run + nuclear reset
    images.ts ai.ts plugins.ts
  admin/                    # HTML templates for /admin/* (template literals)
  admin/editor-body.ts      # The contentEditable rich-text editor
public/                     # Static assets shipped with the Worker
scripts/check-inline-js.mjs # CI helper: parse-checks inline <script> bodies (tsc misses these)
tests/sanitize.test.mjs     # The sanitizer test suite
backfill.sql                # One-off local DB repair, NOT needed for clean installs (gitignored)
wrangler.toml               # Cloudflare bindings: D1, KV, AI, Images
```

## Sanitizer rules (`src/cms/sanitize.ts`)

This file is the XSS boundary for every post and page on every PHCloud instance. **Read its top-of-file comment before editing.** The contract:

- **Allowlist of tags** (`ALLOWED`): `p, br, hr, h1–h6, b, strong, i, em, u, s, del, span, div, blockquote, pre, code, ul, ol, li, table, caption, thead, tbody, tfoot, tr, th, td, col, colgroup, a, img`. Unknown tags drop their markup; their inner content survives as escaped text. `script`, `style`, `iframe`, `object`, etc. are stripped with their content.
- **Allowlist of attributes per tag.** Block elements + `<a>` allow `id`. Only block elements allow `style` (validated to a single `text-align:<keyword>` by `safeStyle`). URLs (`href`, `src`) must pass `safeUrl`: `http, https, mailto, tel, sms` or relative. `data:` is intentionally not allowed.
- **`id` values** must match `^[A-Za-z_][A-Za-z0-9_:\-.]*$` (`safeId`). Empty, numeric-start, whitespace, and markup-injection attempts (e.g. `id="x<script>"`) are rejected and the attribute is dropped.
- **Entity decoding:** the `NAMED` map covers the WHATWG named entity set (mdash, ndash, lsquo, rsquo, ldquo, rdquo, hellip, le, ge, copy, reg, trade, math/symbol/Greek subsets, etc.). Numeric (`&#1234;`) and hex (`&#xabcd;`) references also decode. Unknown entities have only their `&` escaped (`&foobar;` → `&foobar;`); the rest stays as text.
- **Output is re-escaped.** `&` and `<` always escape to `&` / `<` in element text. Attribute values additionally escape `"` to `"`.
- **Idempotent.** Running `sanitizePostHtml` on already-sanitized HTML is a no-op. The read path depends on this — never add a step that mutates already-clean output.

**If you change the sanitizer, run `npm test`.** The 9 test cases in `tests/sanitize.test.mjs` cover entity decode, id allowlist, security boundaries, and idempotency. Add a test for every behavior you add or remove.

**Do not add npm deps to the sanitizer.** It must run in a V8 isolate with no DOM, no jsdom, no DOMPurify. The existing zero-dep tokenizer is intentional.

## MCP usage — when an agent connects to a PHCloud site

If a session is configured with a `phcloud` MCP server (URL `https://<site>/api/mcp`, bearer token in `Authorization` header), the host loads ten tools. Memorize the shape:

| Tool | Use for |
| --- | --- |
| `phcloud_list_posts` | Discover what exists. `status` defaults to `all`; be explicit. `limit` caps at 50. |
| `phcloud_get_post` | Read one post/page by id OR slug; full sanitized HTML + SEO meta + tags. |
| `phcloud_create_post` | New post/page. **Defaults to draft.** Requires `title` + `type` (`post` or `page`). Slug auto-generates from title. |
| `phcloud_update_post` | Partial update. **Omit fields you don't mean to change.** `content` left out = body untouched. |
| `phcloud_publish_post` | Publish or unpublish by id/slug. The only step that goes live. |
| `phcloud_delete_post` | **Permanent. No trash, no undo.** Prefer `publish_post(publish:false)` for content you might want back. |
| `phcloud_list_tags` | Read-only tag list with post counts. |
| `phcloud_get_nav` | Read the navigation menu. |
| `phcloud_update_nav` | **Replace** the whole menu — does not merge. Always `get_nav` first, then send the complete desired list. |
| `phcloud_site_stats` | Page views for the last 1–90 days (default 30). |

**Hard limits (the API rejects, not silently truncates):** `meta_title` ≤ 60 chars; `meta_description` ≤ 160 chars. The live API currently silently clamps longer values — write short.

**Draft-first pipeline:** list → stats → create (draft) → review in admin → update (only changed fields) → publish → get (verify). Never publish a draft you haven't re-fetched in this session. Never edit `content` without first calling `get_post` in this session.

**Standing rules to bake into your prompts when authoring content via MCP:**
1. Drafts are the default; `published:true` only on explicit "publish it".
2. `update_post` is partial — omitting `content` preserves the body.
3. `update_nav` replaces — always `get_nav` first.
4. Never `delete_post`. Use `publish_post(publish:false)` and ask the user.
5. After any create/update, `get_post` to confirm.
6. Use raw Unicode (—, ', …) in content, not entities — the sanitizer decodes both, but Unicode is shorter and more grep-friendly.
7. HTML is sanitized: use `h2/h3, p, ul/ol, pre/code, table, blockquote, img, a`. No inline styles, no scripts.

## Security boundaries

- **CSP** is set globally in `src/index.ts`. `default-src 'self'`, no `unsafe-eval`, `frame-ancestors 'none'`. Inline scripts use `'unsafe-inline'` only because the admin uses a nonce scheme via `script-src-attr 'unsafe-inline'` — see `scripts/check-inline-js.mjs` for why tsc doesn't catch admin script bugs.
- **Sanitizer is the XSS boundary.** All admin POST/PATCH routes call `sanitizePostHtml` on the content field. The read path (`src/cms/render.ts`) re-sanitizes as defense-in-depth. Do not bypass either.
- **URL safety:** `safeUrl` rejects `javascript:`, `data:`, and unknown schemes. Image uploads go through `/img/:id` (relative).
- **Sessions:** PBKDF2 password hashing, hardened session cookies. See `src/cms/sanitize.ts` neighbor files for the auth implementation.
- **Never log secrets.** No tokens, no API keys, no passwords. The Cloudflare Workers environment provides them via bindings; never echo them in responses or logs.
- **No npm deps beyond `hono`.** Every dep is an attack surface and a size cost. If you find yourself wanting to add one, write the function in TypeScript first.

## What NOT to do

- Do not edit `backfill.sql`. It's a one-off local DB repair; clean installs don't need it. It's in `.gitignore` for new clones but already tracked locally — leave it alone.
- Do not add `await` to top-level expressions. Workers support top-level await but the bundler dislikes it in some configs.
- Do not introduce a build step. `tsc --noEmit` is the only TS step. Adding esbuild/swc/vite breaks the "one Worker, zero servers" promise.
- Do not store dates as ISO strings without timezone. D1 stores TEXT; `datetime('now')` in SQLite is UTC. Always normalize at the boundary.
- Do not add a delete endpoint that hides behind a confirm dialog in the UI. Delete is permanent — the API surface should reflect that. Soft-delete (unpublish) is the safer pattern.
- Do not edit `node_modules/`, `.wrangler/`, `dist/`, `devout.log`, `deverr.log`. All gitignored.
- Do not commit secrets, API tokens, D1 IDs, KV namespace IDs, or Cloudflare account IDs. `wrangler.toml` has placeholder IDs; real values come from `wrangler secret put` and the CF dashboard.

## Style conventions

- **Conventional commits** with a single-line subject and a body explaining *why*, not what. This repo's history uses `fix:`, `feat:`, `chore:`. Match the style.
- **Prettier** owns formatting. Do not bikeshed whitespace in code review.
- **Files:** kebab-case for routes/components (`nav.ts`, `editor-body.ts`), PascalCase only for exported classes.
- **No comments unless they explain something non-obvious.** This file is a comment. Inline comments should be the same — explain *why* a constraint exists, not what the next line does.
- **Template literals for HTML.** The admin is rendered with template-literal HTML strings, not JSX or a framework. If you need a new admin page, follow the pattern in `src/admin/`.
- **No client-side framework in the public theme.** Vanilla JS + DOM APIs only. The CMS deploys no React/Vue/Svelte runtime.

## Where to ask questions

- File an issue on GitHub with a minimal repro and the relevant log lines.
- For architecture questions, read the top-of-file comments — every non-trivial file explains its constraints there.
- When unsure whether a change is safe, run `npm run build`. If it passes and the change is small and reversible, ship it. If it's bigger, write a test first.

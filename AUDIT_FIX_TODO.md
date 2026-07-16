# PHCloud CMS — Audit Fix Todo List
Generated: 2026-07-16
Source: AUDIT_FINDINGS.md

Legend: ☐ pending | 🔄 in progress | ✅ done

---

## Phase 1 — Infrastructure (prerequisites)

- ✅ Create AUDIT_FINDINGS.md (findings saved to disk)
- ☐ Create migration tracking system (`src/cms/migrations.ts`)
  - `_migrations` table with `id TEXT PRIMARY KEY, applied_at TEXT`
  - `runMigrations(db)` — idempotent, checks table before applying
- ☐ Create one-time backfill script (`src/cms/backfill.ts`)
  - For DBs that were created before migration tracking existed
  - Detects missing columns/indexes and applies them
  - Exposed via a one-shot admin API route that deletes itself after running
- ☐ Wire migration runner into the install path (`src/index.ts` `POST /api/install`)
  - Call `runMigrations` after D1 is first touched

---

## Phase 2 — Security fixes (CRITICAL)

- ☐ Fix all 6 broken `ea()` entity encoders in `src/admin.ts`
  - :123 dashboardBody, :159 postsBody, :711 pagesBody, :846 tagsBody, :885 navBody, :970 imagesBody
  - Replace `replace(/&/g,'&')` with `replace(/&/g,'&amp;')` etc. (correct entity refs)
- ☐ SVG XSS — whitelist MIME types + magic-byte validation in image upload
  - `src/index.ts:647-668` — reject anything not image/png, image/jpeg, image/webp
  - Verify magic bytes (PNG: 89504E47, JPEG: FF D8 FF, WEBP: 52 49 46 46 ... 57 45 42 50)
- ☐ `escHtml()` missing `"` escape — add quote to escape list
  - `src/admin.ts:999-1001` — add `.replace(/"/g, '&quot;')`
- ☐ Local dev cookie fix — `secure: true` only when cf-connecting-ip present
  - `src/index.ts:122, 136`
- ☐ Rate limit bypass for authenticated sessions
  - `src/index.ts:72` — check session cookie before counting failed attempts; use separate key for authed users
- ☐ Image upload size limit — reject base64 > 500KB before atob
  - `src/index.ts:660` — check `base64.length` before decoding

---

## Phase 3 — Accessibility (WCAG 2.1 AA)

- ☐ Add `aria-label` to all 8 markdown toolbar buttons
  - `src/admin.ts` newPostBody + editBody — title="Bold" → add aria-label="Bold"
- ☐ Add `aria-live="polite"` + `role="status"` to all status divs
  - admin.ts:216, 404, 742, 798
- ☐ Fix content textarea label — add `for="content"` to label
  - admin.ts:186 (newPostBody), :371 (editBody)
- ☐ Add `<label for>` to nav editor inputs
  - admin.ts:880-881 — add hidden labels for Label and URL fields
- ☐ Add `aria-label` to `<nav>` elements
  - admin.ts:54 (topbar), :69 (sidebar)

---

## Phase 4 — Correctness bugs

- ☐ Fix `catCheckboxes` → `tagCheckboxes` ID mismatch
  - admin.ts:238, 432 — rename `catCheckboxes` to `tagCheckboxes`
- ☐ Fix `newPageBody`/`editPageBody` — add Markdown toolbar + preview
  - admin.ts:729-823 — currently no toolbar, preview, or image paste support
- ☐ Add `try/catch` around `JSON.parse` in cached reads
  - `src/cms/middleware.ts:151` — fallback to fetcher on parse failure
  - `src/index.ts:1117` (nav JSON.parse), any other raw JSON.parse
- ☐ Swap confirm() placeholders for delete buttons with item name
  - admin.ts:138, 171 — "Delete?" → "Delete 'Post Title'?"

---

## Phase 5 — Resilience / robustness

- ☐ Add logging to plugin pipeline catch block
  - `src/cms/registry.ts:66` — `console.error('[plugin]', hookName, err)` before swallowing
- ☐ Darken public link color for WCAG AA contrast
  - `src/themes/default.ts:6` — `#f97316` → `#ea5800` or darker shade (target ≥ 4.5:1 on #f8fafc)
- ☐ Add skip-to-content link in adminShell and shellFull
  - Before `<main>` in both layouts
- ☐ Public 404 page — add `<head>`, basic styles, viewport meta
  - `src/index.ts:1154`

---

## Phase 6 — Polish (lower priority)

- ☐ Standardize topbar vs sidebar nav labels ("Posts" vs "All Posts")
  - admin.ts:56 vs :71
- ☐ Reorder sidebar links to match topbar
  - Plugins and Tags swapped in sidebar
- ☐ Add image library pagination controls
  - admin.ts:972-984 — render Prev/Next + page numbers
- ☐ Add image upload size feedback in UI
  - Show max size hint, format validation message in editor status

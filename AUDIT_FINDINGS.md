# PHCloud CMS Audit Report
Generated: 2026-07-16
Source files reviewed: src/index.ts, src/admin.ts, src/cms/registry.ts, src/cms/middleware.ts, src/cms/markdown.ts, src/cms/images.ts, src/cms/d1.ts, src/cms/auth.ts, src/plugins/*.ts, src/themes/default.ts

---

## CRITICAL

### 1. Broken entity encoder in 6 instances of `ea()` in admin.ts
- admin.ts:970 (imagesBody), :885 (navBody), :123 (dashboardBody), :159 (postsBody), :711 (pagesBody), :846 (tagsBody)
- `replace(/&/g,'&')` produces literal `&amp;` text — no actual escaping. `replace(/</g,'<')` produces literal `&lt;`.
- Impact: XSS in admin panel. A filename like `foo.jpg" onerror="alert(1)` breaks out of `alt="..."` in imagesBody. Nav labels break out of input `value="..."` in navBody.

### 2. SVG upload → XSS on public site
- index.ts:655-657 — client supplies MIME type, no magic-byte validation. `image/svg+xml` with `<script>` served to all visitors via /img/:id.
- Fix: whitelist MIME types (image/png, image/jpeg, image/webp) and validate magic bytes.

### 3. Toolbar buttons — `title` only, no aria-label
- admin.ts:185-199 (newPostBody), :372-385 (editBody) — all 8 buttons (Bold, Italic, H2, H3, Link, Img, Quote, List) have no accessible name per WCAG AccName spec. Screen readers announce "B button" with no context.
- Fix: add `aria-label` to every toolbar button.

### 4. Status/error divs have no aria-live
- admin.ts:216, 404, 742, 798, 855 — status updates ("Saving…", "Error saving post") are silent text changes with no aria-live region. Screen readers never announce save/error feedback.

### 5. secure:true cookies break local dev
- index.ts:122, 136 — setCookie always uses secure:true. On npm run dev (HTTP port 8787) the browser silently drops the cookie. Login "succeeds" but all admin requests return 401.
- Fix: conditionally set secure based on environment (cf-connecting-ip header present = production).

---

## HIGH

### 6. catCheckboxes ID mismatch — tags broken on new post form
- admin.ts:207 creates `id="tagCheckboxes"` but line 238's JS writes to `getElementById('catCheckboxes')` — element does not exist. TypeError swallowed by promise chain. Tags never render on new post form.

### 7. Admin self-lockout via shared rate limit
- index.ts:72-87 — rate limit key is `login:{ip}` without checking for valid session first. Logged-in admin submitting 5 bad passwords locks out all login attempts from that IP for 5 minutes.

### 8. escHtml() missing " escape
- admin.ts:999-1001 — `escHtml` escapes & < > but NOT ". Used in editBody:387 for textarea `value="..."`. Post content with " breaks out of the attribute.

### 9. JSON.parse without try/catch — corrupt D1 data crashes public site
- index.ts:1117 (`JSON.parse(navVal)`), :970 — corrupted settings stored in D1 causes unhandled exception. Single bad nav setting takes every page to 500.

### 10. Public link color fails WCAG AA contrast
- src/themes/default.ts:6 — `#f97316` on `#f8fafc` = 2.78:1. WCAG AA requires 4.5:1. Every public link fails.

### 11. No image library pagination controls
- admin.ts:972-984 — shows "Page X of Y" text but no Prev/Next or page number links. Users with >20 images cannot navigate.

---

## MEDIUM

### 12. getCached JSON.parse without fallback
- src/cms/middleware.ts:151 — corrupt KV entry causes unhandled exception. Affects all cached features (settings, plugins, posts, nav).

### 13. Plugin errors silently swallowed
- src/cms/registry.ts:63-68 — bare `catch {}` with no logging. Broken plugins produce no output with no diagnostic trail.

### 14. 4 copies of markdown editor JS
- admin.ts:218-341, 406-454, 265-311, 456-502 — mdWrap, mdLine, mdLink, mdImage, togglePreview, renderPreview each copy-pasted 4 times with minor variations.

### 15. Logout is <a href="#"> — wrong semantics
- admin.ts:65 — logout is an anchor with onclick. Correct semantic is `<button type="button">`. If JS fails, page jumps to top and user stays logged in.

### 16. No skip navigation link
- admin.ts:69-79 — sidebar (9 links) + topbar (10 links) before `<main>`. 19 Tab presses before content on every admin page.

### 17. Content textarea has no programmatic label
- admin.ts:201, 387 — adjacent `<label>` closes after Preview button. Textarea is a sibling, not inside the label. No `for` attribute.

### 18. Nav editor inputs — placeholder only
- admin.ts:880-881 — `placeholder="Label"` and `placeholder="URL"` with no `<label for>`. Screen readers announce unlabeled inputs.

### 19. Public 404 page unstyled
- index.ts:1154 — no `<head>`, no styles, no viewport meta. Looks broken on mobile.

### 20. .btn-danger contrast ≈4.0:1
- admin.ts:28 — `#dc2626` on white = ~4.0:1. WCAG AA normal text requires 4.5:1. Delete buttons fail for users with mild visual impairment.

---

## FIX ORDER (highest impact first)
1. Fix all 6 `ea()` instances (close XSS vector)
2. SVG MIME whitelist (close public XSS)
3. Add aria-label to toolbar buttons (WCAG 4.1.2 A)
4. Add aria-live to status divs (WCAG 4.1.3 A)
5. Fix secure cookie for local dev (functional blocker)
6. Fix catCheckboxes ID (functional bug)
7. Add rate limit session bypass (prevent lockout)
8. Add " to escHtml (close breakout)
9. Wrap JSON.parse in try/catch (resilience)
10. Darken public link color (WCAG 1.4.3 AA)

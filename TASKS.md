# PHCloud CMS — Active Task Board
Status: Phase 2 security fixes — P0 partially open, P1 complete

---

## Done (this session)
- [x] Migration tracking + backfill.sql
- [x] /migrate one-shot endpoint → deployed, ran (11 applied), then removed
- [x] WCAG: aria-label on all 16 toolbar buttons
- [x] WCAG: aria-live="polite" + role=status on all 6 status divs
- [x] P1: content textarea for="content" (newPostBody + editBody)
- [x] P1: nav inputs aria-label="Link label"/"Link URL"
- [x] P1: light-mode accent #f97316 → #b45309 (4.80:1, passes WCAG AA)
- [x] P2: catCheckboxes → tagCheckboxes ID mismatch
- [x] P2: logout <a href="#"> → <button type="button">
- [x] P0: escHtml() added missing " escape (admin.ts — matches escAttr)
- [x] P0: ea() line 970 in imagesBody — entity chars were literal, fixed to proper entities

---

## 🔴 P0 — Security (blocking)
- [ ] Verify ea() on all 5 remaining instances match line 970 fix (raw-byte audit)
- [ ] Confirm image MIME whitelist + size limit committed in 7b8e86b
- [ ] Confirm login rate-limit bypass committed in 7b8e86b
- [ ] Add regression guard: test that escHtml/ea escape all 5 chars

---

## 🟠 P1 — Accessibility (WCAG 2.1 AA)
- [x] Toolbar buttons: aria-label (8 × 2 = 16 instances)
- [x] Status divs: aria-live="polite" + role="status" (6 locations)
- [x] Content textarea: for="content" label association (2 forms)
- [x] Nav inputs: aria-label (navBody, 2 inputs)
- [x] Public link color: #b45309 (4.80:1 on #f8fafc, passes AA)

---

## 🟡 P2 — Correctness bugs
- [x] catCheckboxes → tagCheckboxes ID mismatch
- [x] JSON.parse with try/catch in middleware + index.ts (3 locations)
- [x] Logout <a href="#"> → <button type="button">
- [ ] Add skip-to-main-content link (adminShell + shellFull)
- [ ] Public 404: add <head>, styles, viewport

---

## 🟢 P3 — Polish (not blocking)
- [ ] Plugin pipeline: bare catch {} → console.error logging
- [ ] Standardize topbar/sidebar nav labels
- [ ] Image library: add pagination controls
- [ ] Image delete confirm → show filename
- [ ] Page editor: Markdown toolbar + preview (parity with post editor)

---

## Decision log
- Migration: runMigrations() in code + backfill.sql for manual runs; endpoint was one-shot and removed
- ea() fix: raw-byte verify before edit; line 970 had empty entities that deleted chars instead of escaping
- Auth: login rate-limit bypass for valid session cookies — prevents self-lockout
- Images: PNG/JPEG/WebP only, ≤700KB base64 before atob() (≈500KB decoded)
- P0 item count: originally 5, image+login fixes committed in 7b8e86b, escHtml+ea in latest

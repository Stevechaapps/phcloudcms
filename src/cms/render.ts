// src/cms/render.ts — public-site render helpers + shared content types.
// Everything that turns D1 rows into public HTML lives here, so index.ts
// and the route modules stay small. Post/page content is authored as HTML
// (contentEditable editor), sanitized on WRITE via src/cms/sanitize.ts, and
// emitted here on READ. We re-sanitize on read as defense-in-depth (idempotent
// on already-clean stored HTML) so the snapshot this code reads is never worse
// than the write path produced.

import { esc } from "./escape.js";
import { sanitizePostHtml, htmlToText } from "./sanitize.js";
import { css as themeCss } from "../themes/default.js";

// ── Shared types ───────────────────────────────────────────────────
export type NavItem = { label: string; url: string };
export type Post = { title: string; content: string; updated_at: string };
export type DbPost = Post & {
  id: number;
  slug: string;
  excerpt: string;
  published: number;
  type: string;
  publish_at: string | null;
  preview_token: string | null;
  meta_title: string | null;
  meta_description: string | null;
};

// ── Excerpt ────────────────────────────────────────────────────────
// Plain-text preview of a post. `content` is stored sanitized HTML; strip
// its tags (and raw-text/script content), decode entities, and collapse
// whitespace to a single line. Caller escapes the result.
export function autoExcerpt(content: string): string {
  const text = htmlToText(content);
  return text.slice(0, 160) + (text.length > 160 ? "…" : "");
}

// ── Public page shell ──────────────────────────────────────────────
const THEME_CSS = themeCss;

// Light/dark toggle. The public site adapts to the OS color scheme via a
// @media(prefers-color-scheme:dark) block in the theme CSS, AND offers a
// manual override stored in localStorage('phcloud-theme'). THEME_INIT_SCRIPT
// runs in <head> before paint so there's no flash of the wrong theme; the
// attribute it sets (html[data-theme="dark"|"light"]) is what the theme CSS
// selectors key off of. THEME_TOGGLE_SCRIPT (end of <body>) wires the button,
// keeps its glyph/aria in sync, and persists the choice.
export const THEME_INIT_SCRIPT = `<script>(function(){try{var t=localStorage.getItem('phcloud-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark')}else if(t==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})();</script>`;

export const THEME_TOGGLE_BTN =
  '<button type="button" class="theme-toggle" id="theme-toggle" aria-label="Toggle color theme" aria-pressed="false">☾</button>';

export const THEME_TOGGLE_SCRIPT = `<script>(function(){var d=document.documentElement,b=document.getElementById('theme-toggle');if(!b)return;function dark(){var t=d.getAttribute('data-theme');if(t==='dark')return true;if(t==='light')return false;return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches)}function render(){var on=dark();b.setAttribute('aria-pressed',on?'true':'false');b.setAttribute('aria-label',on?'Switch to light mode':'Switch to dark mode');b.textContent=on?'☀':'☾'}render();if(window.matchMedia){try{window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',render)}catch(e){}}b.addEventListener('click',function(){var next=dark()?'light':'dark';d.setAttribute('data-theme',next);try{localStorage.setItem('phcloud-theme',next)}catch(e){}render()})})();</script>`;

// Reading progress bar: a 3px accent bar that fills with scroll position.
// rAF-throttled; a no-op on pages too short to scroll.
export const PROGRESS_SCRIPT = `<script>(function(){var b=document.createElement('div');b.id='read-progress';document.body.appendChild(b);var h=document.documentElement;function up(){var max=h.scrollHeight-h.clientHeight;if(max<=0){b.style.width='0';return}b.style.width=((h.scrollTop||document.body.scrollTop)/max*100).toFixed(2)+'%'}var t=null;addEventListener('scroll',function(){if(t)return;t=requestAnimationFrame(function(){t=null;up()})},{passive:true});addEventListener('resize',up,{passive:true});up()})();</script>`;

export function shellFull(
  siteName: string,
  headMarkup: string,
  bodyHtml: string,
  nav: NavItem[],
  siteLogo: string | null = null,
): string {
  const navHtml = nav
    .map((n) => '<a href="' + esc(n.url) + '">' + esc(n.label) + "</a>")
    .join("");

  // The render:head pipeline (SEO plugin) emits its own <title>+meta+og, so
  // only fall back to a bare <site name> title when no pipeline ran (404s,
  // previews). Emitting both gave every page two <title> tags and browsers
  // use the first — silently killing all SEO titles.
  const defaultTitle = /<title/i.test(headMarkup)
    ? ""
    : "<title>" + esc(siteName) + "</title>";

  return (
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="generator" content="PHCloud CMS" /><meta name="theme-color" media="(prefers-color-scheme: light)" content="#f6f4ef" /><meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121110" /><link rel="icon" type="image/svg+xml" href="/favicon.svg" />' +
    defaultTitle +
    '<link rel="sitemap" type="application/xml" href="/sitemap.xml" /><link rel="alternate" type="application/rss+xml" title="' +
    esc(siteName) +
    '" href="/feed.xml" />' +
    // Head pipeline markup first (title/description/og/canonical/JSON-LD) so
    // crawlers that truncate long heads still see the SEO metadata, before
    // the ~25KB inline stylesheet.
    headMarkup +
    "<style>" +
    THEME_CSS +
    "</style>" +
    THEME_INIT_SCRIPT +
    '</head><body><a href="#main" class="sr-only">Skip to content</a><header><div class="inner"><a href="/" class="brand">' +
    (siteLogo
      ? '<img src="' + esc(siteLogo) + '" alt="' + esc(siteName) + '" style="height:38px;width:auto;vertical-align:middle;max-width:260px"/>'
      : '<span class="brand-name">' + esc(siteName) + '</span>') +
    '</a><nav><form action="/search" method="get" class="search-wrap" role="search"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.4" y2="16.4"/></svg><input type="text" name="q" placeholder="Search" aria-label="Search site"></form>' +
    navHtml +
    // Toggle is a sibling of <nav>, not inside it: the mobile CSS hides
    // header nav (display:none under 768px) to save space, so a toggle
    // inside the nav would vanish on phones. As a direct child of .inner
    // it stays reachable; .inner's space-between gives brand-left /
    // nav-center / toggle-right on desktop.
    "</nav>" +
    THEME_TOGGLE_BTN +
    '</div></header><main id="main">' +
    bodyHtml +
    '</main><footer><div class="inner"><div class="wordmark" aria-hidden="true">' +
    esc(siteName) +
    '</div><p class="colophon">Published with <a href="https://github.com/Stevechaapps/phcloudcms" target="_blank" rel="noopener">PHCloud CMS</a> on Cloudflare · <a href="/feed.xml" rel="noopener">RSS</a> · <a href="/sitemap.xml" rel="noopener">Sitemap</a> · <a href="/llms.txt" rel="noopener">llms.txt</a> · <a href="/admin" rel="nofollow">Manage</a></p></div></footer>' +
    PROGRESS_SCRIPT +
    THEME_TOGGLE_SCRIPT +
    '</body></html>'
  );
}

// ── Post + list rendering ──────────────────────────────────────────
// Reading time from stored HTML; ~200 wpm, floored at 1 min. Cheap, useful,
// and it only has to be approximately right.
export function readingTime(content: string): number {
  return Math.max(1, Math.round(htmlToText(content).split(/\s+/).filter(Boolean).length / 200));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function renderPost(post: Post, tags?: { name: string; slug: string }[]): string {
  const tagsHtml = tags && tags.length
    ? '<span class="tags">' +
      tags
        .map(
          (t) =>
            '<a class="tag-pill" href="/tag/' +
            esc(t.slug) +
            '">' +
            esc(t.name) +
            "</a>",
        )
        .join("") +
      "</span>"
    : "";
  return (
    '<article class="post"><nav class="back-link"><a href="/">Index</a></nav><h1 class="post-title">' +
    esc(post.title) +
    '</h1><div class="post-meta"><time datetime="' +
    esc(post.updated_at) +
    '">' +
    formatDate(post.updated_at) +
    "</time><span aria-hidden=\"true\">·</span><span>" +
    readingTime(post.content) +
    ' min read</span>' +
    tagsHtml +
    '</div><div class="post-content">' +
    sanitizePostHtml(post.content) +
    "</div></article>"
  );
}

export function renderHomepage(
  siteName: string,
  description: string,
  postCount: number,
  heroKicker: string = "",
): string {
  const kickerHtml = heroKicker
    ? '<div class="kicker">' + esc(heroKicker) + "</div>"
    : "";
  const meta =
    '<div class="meta-row"><span>' +
    postCount +
    (postCount === 1 ? " post</span>" : " posts</span>") +
    "</div>";
  return (
    '<section class="hero">' +
    kickerHtml +
    '<h1>' +
    esc(siteName) +
    "</h1><p class=\"lede\">" +
    esc(description || "A PHCloud site — fast, free, and built to read.") +
    "</p>" +
    meta +
    "</section>"
  );
}

export function renderPostList(
  posts: { slug: string; title: string; excerpt: string; updated_at: string }[],
  siteName: string,
): string {
  if (!posts.length) return "";
  const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  let html = siteName
    ? '<div class="list-head"><h2>Latest</h2><span>' +
      posts.length +
      (posts.length === 1 ? " entry</span></div>" : " entries</span></div>")
    : "";
  const [first, ...rest] = posts;
  html +=
    '<a class="post-featured" href="/' +
    esc(first.slug) +
    '"><div class="f-meta"><time datetime="' +
    esc(first.updated_at) +
    '">' +
    formatDate(first.updated_at) +
    "</time></div><h2 class=\"f-title\">" +
    esc(first.title) +
    '</h2>' +
    (first.excerpt ? '<p class="f-excerpt">' + esc(first.excerpt) + "</p>" : "") +
    '<span class="f-link">Read</span></a>';
  if (rest.length) {
    html += '<div class="post-list">';
    for (let i = 0; i < rest.length; i++) {
      const p = rest[i];
      html +=
        '<article class="post-row"><a href="/' +
        esc(p.slug) +
        '"><span class="idx">' +
        String(i + 2).padStart(2, "0") +
        '</span><span class="row-body"><span class="row-title">' +
        esc(p.title) +
        "</span>" +
        (p.excerpt ? '<span class="row-excerpt">' + esc(p.excerpt) + "</span>" : "") +
        '</span><time class="row-date" datetime="' +
        esc(p.updated_at) +
        '">' +
        shortDate(p.updated_at) +
        "</time></a></article>";
    }
    html += "</div>";
  }
  return html;
}

export function renderPagination(
  page: number,
  totalPages: number,
  basePath: string,
  additionalParams: Record<string, string>,
): string {
  if (totalPages <= 1) return "";
  const buildUrl = (p: number): string => {
    const params = new URLSearchParams(additionalParams);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return basePath + (qs ? "?" + qs : "");
  };
  let html =
    '<nav aria-label="Pagination" style="display:flex;justify-content:center;gap:0.5rem;margin-top:3rem;align-items:center;flex-wrap:wrap">';
  if (page > 1)
    html +=
      '<a href="' +
      esc(buildUrl(page - 1)) +
      '" style="padding:0.4rem 0.8rem;border:1px solid var(--border);border-radius:6px;text-decoration:none;color:var(--accent)">← Prev</a>';
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);
  if (startPage > 1) html += '<span style="color:var(--text-muted)">…</span>';
  for (let i = startPage; i <= endPage; i++) {
    if (i === page) {
      html +=
        '<span aria-current="page" style="padding:0.4rem 0.8rem;background:var(--accent);color:#fdfcf9;border-radius:6px;font-weight:600">' +
        i +
        "</span>";
    } else {
      html +=
        '<a href="' +
        esc(buildUrl(i)) +
        '" style="padding:0.4rem 0.8rem;border:1px solid var(--border);border-radius:6px;text-decoration:none;color:var(--accent)">' +
        i +
        "</a>";
    }
  }
  if (endPage < totalPages)
    html += '<span style="color:var(--text-muted)">…</span>';
  if (page < totalPages)
    html +=
      '<a href="' +
      esc(buildUrl(page + 1)) +
      '" style="padding:0.4rem 0.8rem;border:1px solid var(--border);border-radius:6px;text-decoration:none;color:var(--accent)">Next →</a>';
  html += "</nav>";
  return html;
}

// ── Helpers ────────────────────────────────────────────────────────
// OG / twitter card image: first <img src> of a post. Content is stored as
// sanitized HTML (see sanitize.ts); the sanitizer always emits double-quoted
// src. We return an absolute URL: absolute http(s) as-is, relative (/img/:id)
// with origin prefixed — anything else (data:, etc.) yields no card image.
export function extractFirstImage(
  content: string,
  origin: string,
): string | null {
  const match = content.match(/<img\s[^>]*?src="([^"]*)"/i);
  if (!match) return null;
  const src = match[1];
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return origin + src;
  return null;
}

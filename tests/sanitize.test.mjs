// tests/sanitize.test.mjs — node:test suite for src/cms/sanitize.ts.
//
// Zero deps: loads the TS source via Node's built-in --experimental-strip-types
// (Node ≥22.6) so we don't pull in vitest/jest/ts-node just to assert behavior
// on the security boundary that every post/page in the CMS passes through.
//
// Run: npm test
//      or: node --experimental-strip-types --test tests/sanitize.test.mjs
//
// When this file changes, update both: the table in src/cms/sanitize.ts docs
// AND the AGENTS.md standing rules. These three are the project's source of
// truth for what the sanitizer is supposed to do.
import test from "node:test";
import assert from "node:assert/strict";

const SANITIZER_PATH =
  "file:///" +
  new URL("../src/cms/sanitize.ts", import.meta.url).pathname.replace(
    /^\/([A-Za-z]:)/,
    "$1",
  );
const { sanitizePostHtml } = await import(SANITIZER_PATH);

const AMP = String.fromCharCode(38); // &
const LT = String.fromCharCode(60); // <

test("decodes editorial entities (mdash, hellip, lsquo, rsquo, ldquo, rdquo, le)", () => {
  assert.equal(
    sanitizePostHtml(`<p>foo ${AMP}mdash; bar</p>`),
    "<p>foo — bar</p>",
  );
  assert.equal(
    sanitizePostHtml(`<p>foo ${AMP}hellip; bar</p>`),
    "<p>foo … bar</p>",
  );
  assert.equal(
    sanitizePostHtml(`<p>${AMP}lsquo;quoted${AMP}rsquo;</p>`),
    "<p>‘quoted’</p>",
  );
  assert.equal(
    sanitizePostHtml(`<p>${AMP}ldquo;quoted${AMP}rdquo;</p>`),
    "<p>“quoted”</p>",
  );
  assert.equal(sanitizePostHtml(`<p>x ${AMP}le; 10</p>`), "<p>x ≤ 10</p>");
});

test("decodes numeric and hex character references", () => {
  assert.equal(sanitizePostHtml(`<p>${AMP}#8212;x</p>`), "<p>—x</p>");
  assert.equal(sanitizePostHtml(`<p>${AMP}#x2014;x</p>`), "<p>—x</p>");
});

test("escapes bare & and < in element text", () => {
  assert.equal(
    sanitizePostHtml(`<p>foo ${AMP} bar</p>`),
    `<p>foo ${AMP}amp; bar</p>`,
  );
  assert.equal(
    sanitizePostHtml(`<p>foo ${LT} bar</p>`),
    `<p>foo ${AMP}lt; bar</p>`,
  );
  assert.equal(
    sanitizePostHtml(`<p>Tom ${AMP} Jerry</p>`),
    `<p>Tom ${AMP}amp; Jerry</p>`,
  );
});

test("escapes the & prefix on unknown entity names (so they remain inert)", () => {
  // &foobarbaz; is not a defined entity — the & MUST escape, the rest stays.
  assert.equal(
    sanitizePostHtml(`<p>${AMP}foobarbaz;x</p>`),
    `<p>${AMP}amp;foobarbaz;x</p>`,
  );
});

test("allows id on block elements and <a>, validates the value", () => {
  assert.equal(
    sanitizePostHtml(`<h2 id="what-it-is">Title</h2>`),
    `<h2 id="what-it-is">Title</h2>`,
  );
  assert.equal(
    sanitizePostHtml(`<a id="t" href="/x">x</a>`),
    `<a id="t" href="/x">x</a>`,
  );
});

test("rejects id on inline elements (b, i, span, code, em, strong, img)", () => {
  for (const tag of ["b", "i", "span", "code", "em", "strong"]) {
    assert.equal(
      sanitizePostHtml(`<${tag} id="x">y</${tag}>`),
      `<${tag}>y</${tag}>`,
      `id should be stripped on <${tag}>`,
    );
  }
  // img is void; the test below also covers it
  assert.equal(
    sanitizePostHtml(`<img id="x" src="/a.png" alt="a" />`),
    `<img src="/a.png" alt="a" />`,
  );
});

test("rejects id values that are not CSS-compatible identifiers", () => {
  // Must start with letter or underscore — numeric start is rejected
  assert.equal(sanitizePostHtml(`<h2 id="1bad">x</h2>`), "<h2>x</h2>");
  // Empty value rejected
  assert.equal(sanitizePostHtml(`<h2 id="">x</h2>`), "<h2>x</h2>");
  // Whitespace / special chars rejected
  assert.equal(sanitizePostHtml(`<h2 id="a b">x</h2>`), "<h2>x</h2>");
  // Markup-injection attempt via id value: '<script>' makes the whole id
  // value invalid, so the id attribute is dropped entirely and the inner
  // '>' closes the tag. Net output: clean <h2>x</h2>. No attribute context
  // breaks, no script context survives.
  assert.equal(sanitizePostHtml(`<h2 id="x<script>">x</h2>`), `<h2>x</h2>`);
});

test("strips event handler and unsafe URL attributes (existing security boundaries)", () => {
  assert.equal(
    sanitizePostHtml(`<h2 id="x" onclick="alert(1)">y</h2>`),
    `<h2 id="x">y</h2>`,
  );
  assert.equal(
    sanitizePostHtml(`<a href="javascript:alert(1)" id="t">x</a>`),
    `<a id="t">x</a>`,
  );
  assert.equal(
    sanitizePostHtml(`<p>safe<script>alert(1)</script></p>`),
    "<p>safe</p>",
  );
});

test("is idempotent: re-sanitizing stored output is a no-op", () => {
  // A post that was already cleaned (entity decoded) round-trips unchanged.
  // This is the contract public.ts depends on: read-path re-sanitization is
  // defense-in-depth and must not mutate stored content.
  const once = sanitizePostHtml(`<p>foo ${AMP}mdash; bar</p>`);
  const twice = sanitizePostHtml(once);
  assert.equal(once, twice);
  assert.equal(once, "<p>foo — bar</p>");
});

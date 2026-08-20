// src/plugins/tag-cloud.ts — Tag Cloud visualization plugin
// Renders a weighted tag cloud at the bottom of every public page.

import type { PluginHook, CMSRegistry } from '../cms/registry.js';

export function initTagCloudPlugin(registry: CMSRegistry): void {
  registry.register('render:body', tagCloudHook);
}

const tagCloudHook: PluginHook = async (payload) => {
  const bodyHtml = String(payload.bodyHtml ?? '');
  const db = (payload as Record<string, unknown>).DB as D1Database | undefined;
  if (!db) return payload;

  const rows = await db
    .prepare(
      "SELECT t.name, t.slug, COUNT(pt.post_id) as cnt FROM tags t JOIN post_tags pt ON t.id = pt.tag_id GROUP BY t.id ORDER BY cnt DESC",
    )
    .all<{ name: string; slug: string; cnt: number }>();

  if (!rows.results.length) return payload;

  const maxCnt = Math.max(...rows.results.map((r) => r.cnt));
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let cloud =
    '<div style="margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--border-strong)">' +
    '<h3 style="font-size:0.9rem;color:var(--ink-3);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.05em;font-family:var(--font-mono)">Tags</h3>' +
    '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center">';

  for (const tag of rows.results) {
    const weight = tag.cnt / maxCnt;
    const size = 0.8 + weight * 0.5;
    cloud +=
      '<a href="/tag/' +
      esc(tag.slug) +
      '" style="font-size:' +
      size.toFixed(2) +
      'rem;color:var(--accent);text-decoration:none;display:inline-block;border-bottom:1px solid color-mix(in srgb,var(--accent) 40%,transparent);transition:color .15s ease">' +
      esc(tag.name) +
      ' (' +
      tag.cnt +
      ')</a>';
  }

  cloud += '</div></div>';
  return { ...payload, bodyHtml: bodyHtml + cloud };
};

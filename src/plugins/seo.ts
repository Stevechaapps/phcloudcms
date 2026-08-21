// src/plugins/seo.ts — SEO injection plugin
// Hooks into the render:head pipeline to inject meta tags, Open Graph, and canonical URLs.

import type { PluginHook, CMSRegistry } from "../cms/registry.js";
import { esc } from "../cms/escape.js";

export function initSEOPlugin(registry: CMSRegistry): void {
  registry.register("render:head", seoHook);
}

const seoHook: PluginHook = (payload) => {
  const meta = payload.meta as Record<string, string> | undefined;
  if (!meta) return payload;

  const siteName = String(payload.siteName ?? "Site");
  const title =
    meta.title && meta.title !== siteName
      ? `${meta.title} · ${siteName}`
      : meta.title || siteName;
  const desc = meta.description ?? "";
  const url = meta.url ?? "";
  const image = meta.image ?? "";
  const post = payload.post as Record<string, unknown> | undefined;
  // Only true blog posts are articles; pages (about/privacy) are WebPages.
  const isArticle =
    post?.type === "post" || (post !== undefined && post.type === undefined);

  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    // Open Graph
    ...(isArticle
      ? [`<meta property="og:type" content="article" />`]
      : [`<meta property="og:type" content="website" />`]),
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    ...(image ? [`<meta property="og:image" content="${esc(image)}" />`] : []),
    `<meta property="og:site_name" content="${esc(siteName)}" />`,
    // Twitter Card
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
  ];

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type":
      post?.type === "page" ? "WebPage" : isArticle ? "Article" : "WebSite",
    ...(isArticle
      ? {
          headline: post.title,
          author: { "@type": "Person", name: siteName },
          datePublished: post.publish_at || post.updated_at,
          dateModified: post.updated_at,
          image: image || undefined,
        }
      : {
          name: siteName,
          url,
        }),
    ...(desc ? { description: desc } : {}),
  };

  return {
    ...payload,
    // Escape "<" so content containing "</script>" can't break out of the
    // ld+json block (same defense as the catch-all's JSON-LD in public.ts).
    markup: `${tags.join("\n    ")}\n    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>\n    ${payload.markup ?? ""}`,
  };
};

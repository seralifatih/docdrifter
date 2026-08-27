import type { Post } from "./markdown";

const SITE = "https://docdrifter.com";

export function robotsTxt(): string {
  // /checkout, /status, /dashboard already carry <meta name="robots"
  // content="noindex"> (they're per-user/per-repo pages, not content),
  // but disallowing them here too means a crawler never even fetches
  // them to find that out, and keeps them out of crawl budget entirely.
  return `User-agent: *
Disallow: /checkout
Disallow: /status
Disallow: /dashboard
Disallow: /auth/

Sitemap: ${SITE}/sitemap.xml
`;
}

export function sitemapXml(posts: Post[]): string {
  const staticUrls = [
    { loc: `${SITE}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE}/blog`, changefreq: "weekly", priority: "0.8" },
    { loc: `${SITE}/privacy`, changefreq: "monthly", priority: "0.3" },
    { loc: `${SITE}/terms`, changefreq: "monthly", priority: "0.3" },
  ];

  const postUrls = posts.map((p) => ({
    loc: `${SITE}/blog/${p.slug}`,
    lastmod: p.date,
    changefreq: "monthly",
    priority: "0.6",
  }));

  const entries = [...staticUrls, ...postUrls]
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
${"lastmod" in u ? `    <lastmod>${u.lastmod}</lastmod>\n` : ""}    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

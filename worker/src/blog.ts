import { BASE_STYLES, FAVICON_TAG, THEME_INIT_SCRIPT } from "./styles";
import type { Post, PostMeta } from "./markdown";

const BOOK_ICON = `<svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" fill="var(--brand)" opacity=".22"></path><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" stroke="var(--brand)" stroke-width="1.6" stroke-linejoin="round"></path><path d="M16 8.5v20" stroke="var(--brand)" stroke-width="1.6"></path></svg>`;

function esc(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const BLOG_STYLES = `
body { padding: 0; }
.topbar { display: flex; align-items: center; gap: 10px; padding: 16px clamp(20px, 4vw, 48px); border-bottom: 1px solid var(--color-divider); }
.brand { font-family: var(--font-heading); font-weight: 600; font-size: 18px; letter-spacing: -0.01em; color: var(--color-text); text-decoration: none; }
.topbar nav { margin-left: auto; display: flex; gap: 18px; }
.topbar nav a { font-size: 13.5px; color: var(--color-text-muted); }
.main { max-width: 720px; margin: 0 auto; padding: 48px clamp(20px, 4vw, 48px) 80px; }
.kicker { display: block; font-family: var(--font-mono); font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-faint); margin: 0 0 14px; }
h1 { font-size: clamp(28px, 4vw, 38px); line-height: 1.15; margin-bottom: 6px; }
.post-list { margin-top: 32px; display: flex; flex-direction: column; gap: 4px; }
.post-item { display: block; padding: 22px 24px; text-decoration: none; color: inherit; transition: border-color .15s ease; }
.post-item:hover { border-color: color-mix(in srgb, var(--brand) 45%, var(--color-divider)); text-decoration: none; }
.post-item .date { font-family: var(--font-mono); font-size: 11.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-faint); }
.post-item h2 { font-size: 19px; margin: 8px 0 0; line-height: 1.35; }
.post-item p { font-size: 14px; line-height: 22px; color: var(--color-text-muted); margin: 8px 0 0; }
.post-header { margin-bottom: 8px; }
.post-header .date { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-faint); }
.post-header p.lede { font-size: 16px; line-height: 25px; color: var(--color-text-muted); margin: 14px 0 0; }
.post-body { margin-top: 34px; font-size: 16px; line-height: 27px; }
.post-body h2 { font-size: 23px; margin: 40px 0 14px; line-height: 1.35; }
.post-body h3 { font-size: 18px; margin: 28px 0 10px; }
.post-body p { margin: 16px 0; }
.post-body ul, .post-body ol { margin: 16px 0; padding-left: 24px; }
.post-body li { margin: 8px 0; }
.post-body blockquote { margin: 20px 0; padding: 4px 0 4px 18px; border-left: 3px solid var(--color-divider); color: var(--color-text-muted); }
.post-body pre { margin: 20px 0; padding: 18px 20px; overflow: auto; }
.post-body pre code { font-family: var(--font-mono); font-size: 13.5px; line-height: 21px; }
.post-body code.inline { font-family: var(--font-mono); font-size: 0.9em; background: color-mix(in srgb, var(--brand) 12%, transparent); padding: 1px 5px; border-radius: 4px; }
.post-body a { text-decoration: underline; text-underline-offset: 3px; }
.back-link { display: inline-block; margin-top: 48px; font-size: 14px; color: var(--color-accent-700); }
.empty { margin-top: 40px; color: var(--color-text-muted); font-size: 14.5px; }
`;

function shell(title: string, description: string, ogUrl: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#6b3fa0">
${FAVICON_TAG}
<link rel="alternate" type="application/rss+xml" title="DocDrifter Blog" href="/blog/rss.xml">
<meta property="og:type" content="article">
<meta property="og:site_name" content="DocDrifter">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(ogUrl)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${THEME_INIT_SCRIPT}
<style>
${BASE_STYLES}
${BLOG_STYLES}
</style>
</head>
<body>
<div class="topbar">
  ${BOOK_ICON}
  <a class="brand" href="/">DocDrifter</a>
  <nav>
    <a href="/#pricing">Pricing</a>
    <a href="/blog">Blog</a>
    <a href="/blog/rss.xml">RSS</a>
  </nav>
</div>
<div class="main">
${body}
</div>
</body>
</html>`;
}

export function blogIndexPage(posts: PostMeta[]): string {
  const list = posts.length
    ? posts
        .map(
          (p) => `
    <a class="post-item card" href="/blog/${esc(p.slug)}">
      <span class="date">${formatDate(p.date)}</span>
      <h2>${esc(p.title)}</h2>
      <p>${esc(p.description)}</p>
    </a>`
        )
        .join("")
    : `<p class="empty">Nothing published yet — check back soon.</p>`;

  const body = `
  <span class="kicker">Blog</span>
  <h1>Notes on docs drift, detection, and building this in public</h1>
  <div class="post-list">${list}</div>`;

  return shell(
    "Blog — DocDrifter",
    "Notes on documentation drift detection, evaluation methodology, and building DocDrifter in public.",
    "https://docdrifter.com/blog",
    body
  );
}

export function blogPostPage(post: Post): string {
  const body = `
  <div class="post-header">
    <span class="date">${formatDate(post.date)}</span>
    <h1>${esc(post.title)}</h1>
    <p class="lede">${esc(post.description)}</p>
  </div>
  <div class="post-body">
${post.html}
  </div>
  <a class="back-link" href="/blog">← Back to the blog</a>`;

  return shell(`${post.title} — DocDrifter`, post.description, `https://docdrifter.com/blog/${post.slug}`, body);
}

export function blogRssFeed(posts: Post[]): string {
  const items = posts
    .map(
      (p) => `
  <item>
    <title>${esc(p.title)}</title>
    <link>https://docdrifter.com/blog/${esc(p.slug)}</link>
    <guid>https://docdrifter.com/blog/${esc(p.slug)}</guid>
    <pubDate>${new Date(p.date + "T00:00:00Z").toUTCString()}</pubDate>
    <description>${esc(p.description)}</description>
  </item>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>DocDrifter Blog</title>
  <link>https://docdrifter.com/blog</link>
  <description>Notes on documentation drift detection, evaluation methodology, and building DocDrifter in public.</description>
  <language>en-us</language>
${items}
</channel>
</rss>`;
}

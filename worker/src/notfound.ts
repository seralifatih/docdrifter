import { BASE_STYLES, FAVICON_TAG, THEME_INIT_SCRIPT } from "./styles";

const BOOK_ICON = `<svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" fill="var(--brand)" opacity=".22"></path><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" stroke="var(--brand)" stroke-width="1.6" stroke-linejoin="round"></path><path d="M16 8.5v20" stroke="var(--brand)" stroke-width="1.6"></path></svg>`;

export function notFoundPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found — DocDrifter</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#6b3fa0">
${FAVICON_TAG}
${THEME_INIT_SCRIPT}
<style>
${BASE_STYLES}
body { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px 16px; }
.wrap { text-align: center; max-width: 420px; }
.brand-row { display: flex; align-items: center; gap: 9px; justify-content: center; margin-bottom: 26px; }
.brand { font-family: var(--font-heading); font-weight: 600; font-size: 18px; letter-spacing: -0.01em; }
.code { font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-faint); }
h1 { font-size: 24px; margin: 14px 0 0; }
p { font-size: 14.5px; line-height: 22px; color: var(--color-text-muted); margin: 12px 0 0; }
.links { display: flex; gap: 10px; justify-content: center; margin-top: 26px; flex-wrap: wrap; }
</style>
</head>
<body>
<div class="wrap">
  <div class="brand-row">
    ${BOOK_ICON}
    <span class="brand">DocDrifter</span>
  </div>
  <div class="code">404</div>
  <h1>That page doesn't exist</h1>
  <p>The link might be old, or the URL has a typo. Here's where to go instead:</p>
  <div class="links">
    <a class="btn btn-primary" href="/">Home</a>
    <a class="btn btn-secondary" href="/blog">Blog</a>
  </div>
</div>
</body>
</html>`;
}

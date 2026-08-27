// Shared design tokens + base rules for all DocDrifter web pages.
// Light stays the default theme; dark is opt-in via `data-theme="dark"` or
// `prefers-color-scheme`. Component language (radius, cards, dot-grid) leans
// on Railway; spacing/weight leans on Cal.com. See plan doc for rationale.

export const BASE_STYLES = `
:root {
  --color-bg: #fafafa;
  --color-surface: #ffffff;
  --color-text: #18181b;
  --color-text-muted: color-mix(in srgb, #18181b 60%, transparent);
  --color-text-faint: color-mix(in srgb, #18181b 45%, transparent);
  --color-divider: color-mix(in srgb, #18181b 10%, transparent);
  --color-accent-700: #006786;
  --brand: #6b3fa0;
  --brand-600: #5a3389;
  --status-active: #1a7f4e;
  --status-warn: #a56a00;
  --status-error: #b23b2e;
  --radius-card: 12px;
  --radius-sm: 6px;
  --font-heading: Georgia, "Source Serif 4", serif;
  --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  --shadow-card: 0 1px 2px color-mix(in srgb, #18181b 6%, transparent), 0 1px 1px color-mix(in srgb, #18181b 4%, transparent);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg: #0f0f10;
    --color-surface: #18181b;
    --color-text: #f4f4f5;
    --color-text-muted: color-mix(in srgb, #f4f4f5 62%, transparent);
    --color-text-faint: color-mix(in srgb, #f4f4f5 45%, transparent);
    --color-divider: color-mix(in srgb, #f4f4f5 12%, transparent);
    --color-accent-700: #62c5ee;
    --brand: #a687e0;
    --brand-600: #bda3ec;
    --shadow-card: 0 1px 2px color-mix(in srgb, #000000 40%, transparent), 0 1px 1px color-mix(in srgb, #000000 30%, transparent);
  }
}
:root[data-theme="dark"] {
  --color-bg: #0f0f10;
  --color-surface: #18181b;
  --color-text: #f4f4f5;
  --color-text-muted: color-mix(in srgb, #f4f4f5 62%, transparent);
  --color-text-faint: color-mix(in srgb, #f4f4f5 45%, transparent);
  --color-divider: color-mix(in srgb, #f4f4f5 12%, transparent);
  --color-accent-700: #62c5ee;
  --brand: #a687e0;
  --brand-600: #bda3ec;
  --shadow-card: 0 1px 2px color-mix(in srgb, #000000 40%, transparent), 0 1px 1px color-mix(in srgb, #000000 30%, transparent);
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--color-bg); color: var(--color-text); font-family: var(--font-body); }
h1, h2, h3 { font-family: var(--font-heading); letter-spacing: -0.02em; margin: 0; }
a { color: var(--brand); text-underline-offset: 3px; }
.dot-grid-bg {
  background-image: radial-gradient(color-mix(in srgb, var(--color-text) 14%, transparent) 1px, transparent 1px);
  background-size: 20px 20px;
}
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: 999px;
  padding: 5px 12px;
  font: 11px/1.4 var(--font-mono);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.dot { border-radius: 50%; flex: none; display: inline-block; }
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  padding: 10px 18px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
}
.btn:hover { text-decoration: none; }
.btn-primary { background: var(--brand); color: #ffffff; border-color: var(--brand); }
.btn-primary:hover { background: var(--brand-600); border-color: var(--brand-600); }
.btn-secondary { color: var(--color-text); border-color: var(--color-divider); background: var(--color-surface); }
.btn-secondary:hover { background: color-mix(in srgb, var(--color-text) 5%, transparent); }
.btn-ghost { color: var(--color-accent-700); padding-inline: 6px; border-color: transparent; background: transparent; }
`;

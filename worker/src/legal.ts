import { BASE_STYLES } from "./styles";

const BOOK_ICON = `<svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" fill="var(--brand)" opacity=".22"></path><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" stroke="var(--brand)" stroke-width="1.6" stroke-linejoin="round"></path><path d="M16 8.5v20" stroke="var(--brand)" stroke-width="1.6"></path></svg>`;

function shell(title: string, active: "privacy" | "terms", body: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DocDrifter — ${title}</title>
<style>
${BASE_STYLES}
body { display: flex; justify-content: center; padding: 40px 16px 80px; }
.wrap { width: 720px; max-width: 100%; }
.hdr { display: flex; align-items: center; gap: 10px; padding: 0 4px 24px; }
.brand { font-family: var(--font-heading); font-weight: 600; font-size: 18px; letter-spacing: -0.01em; }
.hdr nav { margin-left: auto; display: flex; gap: 18px; }
.hdr nav a { font-size: 13.5px; color: var(--color-text-muted); }
.hdr nav a.active { color: var(--color-text); font-weight: 600; }
.card { padding: 40px 44px; }
h1 { font-size: 27px; margin-bottom: 4px; }
.updated { font: 11px/1 var(--font-mono); letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-faint); }
h2 { font-size: 17px; margin: 30px 0 10px; }
h2:first-of-type { margin-top: 26px; }
p, li { font-size: 14.5px; line-height: 23px; color: var(--color-text-muted); }
ul { margin: 8px 0; padding-left: 20px; }
li { margin-bottom: 6px; }
strong { color: var(--color-text); }
a { color: var(--color-accent-700); text-decoration: none; }
a:hover { text-decoration: underline; }
code { font-family: var(--font-mono); font-size: 13px; background: color-mix(in srgb, var(--brand) 12%, transparent); padding: 1px 5px; border-radius: 4px; }
.footer { display: flex; justify-content: space-between; gap: 16px; margin-top: 22px; padding: 0 4px; font-size: 13px; color: var(--color-text-faint); flex-wrap: wrap; }
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    ${BOOK_ICON}
    <span class="brand">DocDrifter</span>
    <nav>
      <a href="/privacy" class="${active === "privacy" ? "active" : ""}">Privacy</a>
      <a href="/terms" class="${active === "terms" ? "active" : ""}">Terms</a>
    </nav>
  </div>
  <div class="card">
    ${body}
  </div>
  <div class="footer">
    <span>Questions about either page: <a href="mailto:h.f.ilhan@gmail.com">h.f.ilhan@gmail.com</a></span>
    <a href="https://github.com/seralifatih/docdrifter">github.com/seralifatih/docdrifter ↗</a>
  </div>
</div>
</body>
</html>`;
}

export function privacyPage(): string {
  const body = `
  <h1>Privacy</h1>
  <div class="updated">Last updated 27 August 2026</div>

  <h2>What DocDrifter sees</h2>
  <p>When a pull request opens on a repo running the DocDrifter Action, the Action sends your <strong>PR diff</strong> (the changed source and docs hunks) and the <strong>PR title</strong> to DocDrifter's backend for evaluation. Nothing else in your repository is read or transmitted — not the full checkout, not unrelated files, not commit history beyond the diff itself.</p>

  <h2>Where it goes from there</h2>
  <p>The diff and title are forwarded, for that single evaluation, to <strong>DeepSeek</strong> (deepseek.com), the third-party LLM provider that judges whether the change needs a docs update. That request is DeepSeek's standard API call — DocDrifter does not fine-tune models on your code, and does not control what DeepSeek itself does with API traffic beyond their own published terms. If you need code that never leaves infrastructure you control, DocDrifter is not the right tool for that repo.</p>

  <h2>What DocDrifter stores</h2>
  <p>DocDrifter's own database does <strong>not</strong> store your diff, your code, or the LLM's reasoning text beyond the single response returned to your PR. What is persisted, per request, is limited to:</p>
  <ul>
    <li>The repository name (<code>owner/repo</code>)</li>
    <li>Whether that repo is public or private</li>
    <li>Whether the request was allowed (licensed) or blocked</li>
  </ul>
  <p>This is enough to run billing and basic abuse monitoring — it is not enough to reconstruct what your code does.</p>

  <h2>Accounts and the dashboard</h2>
  <p>Signing in to the DocDrifter dashboard uses GitHub OAuth. We store your GitHub login, avatar URL, and numeric GitHub ID to show you which repos you've installed DocDrifter on. We do not request access to your repository contents through this login — the dashboard only reads installation metadata GitHub provides directly.</p>

  <h2>Payments</h2>
  <p>Private-repo subscriptions are billed through <strong>Paddle</strong>, who act as merchant of record. DocDrifter never sees or stores your card details — Paddle handles checkout, receipts, and card storage under their own <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener">privacy policy</a>. DocDrifter's database stores only your Paddle subscription and customer IDs, needed to check license status and open the customer portal.</p>

  <h2>Your options</h2>
  <p>Uninstalling the GitHub App or removing the workflow file stops all data flow immediately — there's nothing further to delete on our side beyond the request log described above, which you can ask to have cleared by emailing <a href="mailto:h.f.ilhan@gmail.com">h.f.ilhan@gmail.com</a>.</p>
  `;
  return shell("Privacy", "privacy", body);
}

export function termsPage(): string {
  const body = `
  <h1>Terms of Service</h1>
  <div class="updated">Last updated 27 August 2026</div>

  <h2>The service</h2>
  <p>DocDrifter is a GitHub Action that reads pull request diffs and flags PRs that likely need a documentation update, by comment on the PR. It runs as a GitHub Actions job in your own CI, authenticating to DocDrifter's backend with a GitHub Actions OIDC token — no API key or long-lived credential is stored in your repo.</p>

  <h2>Free and paid usage</h2>
  <p>DocDrifter is free for public repositories. Private repositories require an active subscription on their GitHub App installation, billed monthly at $9 per private repo through Paddle. If a subscription lapses or falls under quota, DocDrifter stops evaluating PRs on the uncovered repos until it's reactivated — it does not delete or modify anything in your repository.</p>
  <p>Each repo also has a fair-use cap on how many pull requests get evaluated per calendar month: 100 for private repos, 50 for public ones. This exists because our cost is per-PR (each evaluation is an LLM call) while pricing is flat per repo — the cap keeps one unusually high-traffic repo from costing far more than it pays. Past the cap, DocDrifter simply stops commenting on new PRs until the next month; it never fails your build or blocks a merge. If your repo regularly needs a higher cap, email <a href="mailto:h.f.ilhan@gmail.com">h.f.ilhan@gmail.com</a>.</p>

  <h2>No guarantee of accuracy</h2>
  <p>DocDrifter's drift detection is powered by an LLM and is <strong>not guaranteed to be accurate</strong>. It can miss real drift (false negative) or flag a PR that didn't need a docs update (false positive). Our published precision/recall numbers, from a hand-labeled evaluation set, are in the <a href="https://github.com/seralifatih/docdrifter#validation" target="_blank" rel="noopener">README</a> — read them before treating a missing comment as proof your docs are current. DocDrifter never blocks a merge or fails your build; it only comments.</p>

  <h2>Acceptable use</h2>
  <p>Don't use DocDrifter to process code you don't have the right to submit to a third-party LLM provider, and don't attempt to abuse the free tier (e.g. routing unrelated traffic through the public-repo path) to bypass private-repo billing.</p>

  <h2>Cancellation and refunds</h2>
  <p>Cancel a private-repo subscription anytime from the <a href="/status">status page</a> or Paddle's customer portal — access continues until the end of the paid period, no partial refunds for unused time. If DocDrifter is broken for your repo in a way we can't quickly fix, email <a href="mailto:h.f.ilhan@gmail.com">h.f.ilhan@gmail.com</a> and we'll sort out a refund.</p>

  <h2>Liability</h2>
  <p>DocDrifter is provided as-is, without warranty of any kind. We are not liable for missed documentation drift, false-positive comments, or any downstream consequence of relying on DocDrifter's output. Use it as one signal among several, not as your only documentation review process.</p>

  <h2>Changes</h2>
  <p>We may update these terms as the product changes. Material changes affecting paid subscribers will be posted here with an updated date at the top of this page.</p>
  `;
  return shell("Terms", "terms", body);
}

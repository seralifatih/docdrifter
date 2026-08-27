import { BASE_STYLES, FAVICON_TAG, THEME_INIT_SCRIPT } from "./styles";

const DESCRIPTION = "A GitHub Action that flags pull requests which change code but leave documentation untouched. Free for public repos.";

export function landingPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DocDrifter — docs that quietly stop being true</title>
<meta name="description" content="${DESCRIPTION}">
<meta name="theme-color" content="#6b3fa0">
${FAVICON_TAG}
<meta property="og:type" content="website">
<meta property="og:site_name" content="DocDrifter">
<meta property="og:title" content="DocDrifter — docs that quietly stop being true">
<meta property="og:description" content="${DESCRIPTION}">
<meta property="og:url" content="https://docdrifter.com/">
<meta property="og:image" content="https://docdrifter.com/og-image.svg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="DocDrifter — docs that quietly stop being true">
<meta name="twitter:description" content="${DESCRIPTION}">
<meta name="twitter:image" content="https://docdrifter.com/og-image.svg">
${THEME_INIT_SCRIPT}
<style>
${BASE_STYLES}
:root {
  --color-accent-2: #d6006c;
  --leading: 28px;
  --half: 14px;
  --edge: clamp(20px, 5vw, 72px);
  --measure: 62ch;
  --mono: var(--font-mono);
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { text-wrap: pretty; font-size: 15px; }
a { text-decoration: none; }
a:hover { text-decoration: underline; }
.wrap { max-width: 1180px; margin: 0 auto; padding: 0 var(--edge); }
.kicker { display: block; font-family: var(--mono); font-size: 11.5px; line-height: var(--half); letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 var(--leading); }
nav { display: flex; align-items: center; gap: var(--leading); padding: 18px var(--edge); flex-wrap: wrap; border-bottom: 1px solid var(--color-divider); }
nav a { color: inherit; font-size: 14px; white-space: nowrap; }
.nav-brand { font-family: var(--font-heading); font-weight: 600; font-size: 19px; margin-right: auto; letter-spacing: -0.01em; color: var(--color-text); }
.theme-toggle { cursor: pointer; font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text); background: transparent; border: 1px solid var(--color-divider); border-radius: var(--radius-sm); padding: 6px 10px; }
.theme-toggle:hover { background: color-mix(in srgb, var(--color-text) 7%, transparent); }
h1 { font-size: clamp(36px, 6vw, 66px); line-height: 1.08; }
.lede { font-size: 17px; line-height: var(--leading); max-width: var(--measure); margin: calc(var(--leading) * 1.3) 0 0; color: var(--color-text-muted); }
.stat-strip { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--half) var(--leading); margin: 0; padding: var(--half) 0; font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); }
.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: calc(1.5 * var(--leading)) clamp(28px, 4vw, 64px); }
.step-num { font-family: var(--font-heading); font-weight: 600; font-size: 44px; line-height: 1; color: var(--brand); letter-spacing: -0.02em; }
.step-title { font-family: var(--font-heading); font-weight: 600; font-size: 21px; line-height: var(--leading); margin: 14px 0 0; }
.step-body { font-size: 15px; line-height: var(--leading); margin: 10px 0 0; color: var(--color-text-muted); }
.evidence-grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: calc(1.5 * var(--leading)) clamp(24px, 5vw, 80px); align-items: start; }
.evidence-title { font-size: 28px; line-height: 1.4; }
.evidence-body { font-size: 15px; line-height: var(--leading); margin: 14px 0 0; color: var(--color-text-muted); max-width: 48ch; }
.stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--leading) 20px; }
.stat-num { font-family: var(--font-heading); font-weight: 600; font-size: 40px; line-height: 1; letter-spacing: -0.02em; color: var(--brand); }
.stat-label { font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 10px; color: var(--color-text-muted); }
.stat-desc { font-size: 13.5px; line-height: 20px; margin: 8px 0 0; color: var(--color-text-muted); }
.bar-row { display: grid; grid-template-columns: 180px 1fr 52px; gap: 14px; align-items: center; margin-bottom: 12px; }
.bar-track { height: 10px; background: color-mix(in srgb, var(--color-text) 8%, transparent); border-radius: 999px; display: block; }
.bar-fill { display: block; height: 10px; border-radius: 999px; }
.pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: calc(1.5 * var(--leading)) clamp(28px, 5vw, 48px); max-width: 900px; }
.pricing-card { padding: 30px 32px; }
.price-num { font-family: var(--font-heading); font-weight: 600; font-size: 44px; line-height: 1; letter-spacing: -0.02em; }
.feature-list { display: flex; flex-direction: column; gap: 10px; margin-top: var(--leading); font-size: 14.5px; line-height: 23px; }
.feature-item { display: flex; gap: 10px; }
.feature-item .dot-mark { color: var(--brand); }
.install-grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: var(--leading) clamp(24px, 5vw, 80px); align-items: center; }
pre { margin: 0; padding: 20px 22px; overflow: auto; font-family: var(--mono); font-size: 13px; line-height: 22px; color: var(--color-text); }
.comment-card { overflow: hidden; text-decoration: none; transition: border-color .15s ease; }
.comment-card:hover { text-decoration: none; border-color: color-mix(in srgb, var(--brand) 45%, var(--color-divider)); }
.comment-head { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--color-divider); font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-muted); }
.comment-body { padding: 18px 20px 22px; }
code.inline { font-family: var(--mono); font-size: 13px; background: color-mix(in srgb, var(--brand) 12%, transparent); padding: 1px 5px; border-radius: 4px; }
footer { padding: calc(1.5 * var(--leading)) 0 calc(2 * var(--leading)); font-size: 13.5px; line-height: var(--leading); color: var(--color-text-faint); }
.footer-row { display: flex; flex-wrap: wrap; gap: var(--half) var(--leading); align-items: baseline; }
section { padding: calc(2.2 * var(--leading)) 0; }
@media (max-width: 720px) {
  .evidence-grid, .install-grid { grid-template-columns: 1fr; }
  .stat-row { grid-template-columns: repeat(3, 1fr); }
}
</style>
</head>
<body>

<nav>
  <a class="nav-brand" href="/">DocDrifter</a>
  <a href="#how">How it works</a>
  <a href="#evidence">Evidence</a>
  <a href="#pricing">Pricing</a>
  <a href="/blog">Blog</a>
  <button type="button" id="theme-toggle" class="theme-toggle">Dark</button>
  <a href="#install" class="btn btn-primary">Install</a>
</nav>

<div class="wrap">

  <section style="padding: calc(3 * var(--leading)) 0 calc(2 * var(--leading))">
    <h1>
      <span style="display:block">Docs don't break loudly.</span>
      <span style="display:block">They just quietly stop being true.</span>
    </h1>
    <p class="lede">DocDrifter is a GitHub Action that watches pull requests which change code but leave documentation untouched. An LLM reads the diff against your docs tree and answers one question: is anything written here now wrong? If yes, it comments once, on the PR, with the files to check. If no — internal refactor, test-only change, dependency bump — it says nothing at all.</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:var(--leading)">
      <a href="#install" class="btn btn-primary">Install on GitHub</a>
      <a href="https://github.com/seralifatih/docdrifter" class="btn btn-ghost">View the source</a>
    </div>
  </section>

  <section aria-label="At a glance" style="padding: var(--half) 0 calc(2.2 * var(--leading))">
    <p class="stat-strip">
      <span>GitHub Action</span>
      <span>runs on pull_request</span>
      <span>no API key to configure</span>
      <span>free for public repos</span>
    </p>
  </section>

  <section id="how">
    <span class="kicker">How it works</span>
    <div class="steps">
      <div>
        <div class="step-num">01</div>
        <h2 class="step-title">A pull request opens</h2>
        <p class="step-body">The action splits the diff by path into source and documentation. If the PR touches any file under your docs path, it exits immediately — no model call, no comment. That's a coarse check: it assumes touching docs at all means the right docs got touched, so a one-line docs edit next to a bigger undocumented change will still go quiet. Point <code class="inline">docs-path</code> narrowly, or use <code class="inline">skip-labels</code> to opt specific PRs back in.</p>
      </div>
      <div>
        <div class="step-num">02</div>
        <h2 class="step-title">The diff is read, not grepped</h2>
        <p class="step-body">The changed hunks and the PR title go to an LLM together. It judges user-visible surface: public APIs, config keys, defaults, behavior. Internal helpers and test-only changes are excluded by design.</p>
      </div>
      <div>
        <div class="step-num">03</div>
        <h2 class="step-title">One comment, or silence</h2>
        <p class="step-body">If docs drifted, DocDrifter leaves a single comment explaining why. It never fails your build, never blocks the merge, and updates the same comment instead of piling up new ones.</p>
      </div>
    </div>
  </section>

  <section>
    <span class="kicker">What it leaves behind</span>
    <div class="evidence-grid">
      <a class="comment-card card" href="https://github.com/seralifatih/congress-lobbying-trades-overlap/pull/1" target="_blank" rel="noopener" style="display:block;color:inherit">
        <div class="comment-head">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--brand);flex:none"></span>
          <span>docdrifter</span>
          <span style="margin-left:auto;text-transform:none;letter-spacing:0">on a real public PR ↗</span>
        </div>
        <div class="comment-body">
          <p style="font-family:var(--font-heading);font-weight:600;font-size:17px;line-height:24px;margin:0">DocDrifter: possible docs drift detected</p>
          <p style="font-size:15px;line-height:26px;margin:10px 0 0;color:var(--color-text-muted)">This PR changes source files under <code class="inline">src/</code> but doesn't update anything under <code class="inline">README.md</code>. The PR adds a new user-facing input option (<code class="inline">min_disclosure_lag_days</code>) that external users can configure, which should be documented in the README.</p>
          <p style="font-size:13.5px;line-height:22px;margin:18px 0 0;color:var(--color-text-faint);font-style:italic">If this doesn't need a docs update, feel free to ignore this comment.</p>
        </div>
      </a>
      <div>
        <h2 style="font-size:20px;line-height:var(--leading)">And the PRs it said nothing about</h2>
        <p class="step-body">Silence is the feature. A bot that comments on every diff gets muted in a week — the whole point is separating the internal refactor from the change your users will actually notice. That comment above is real, not a mock — <a href="https://github.com/seralifatih/congress-lobbying-trades-overlap/pull/1" target="_blank" rel="noopener">click through</a> and see it on the actual PR.</p>
      </div>
    </div>
  </section>

  <section id="evidence">
    <span class="kicker">Measured, not asserted</span>
    <div class="evidence-grid">
      <div>
        <h2 class="evidence-title">Hand-labeled against 92 real pull requests</h2>
        <p class="evidence-body" style="font-size:16px;font-weight:600;color:var(--color-text)">68–85% precision, 92–100% recall, across two repos. Not one repo above the other — apiflask lands lower than pygeoapi even after correction.</p>
        <p class="evidence-body">We pulled 92 merged PRs from two open-source projects (apiflask, pygeoapi), read each one, and recorded whether documentation genuinely needed an update — then ran DocDrifter against the same set. This was not a blind eval: the prompt went through a few iterations against this same labeled set before we settled on the version shipping today. Along the way we also found two labeling misses of our own on apiflask — PRs we'd marked "no drift" that a manual re-read confirmed were real drift, mislabeled before the model ever saw them. We're showing both the raw numbers (original labels) and the corrected numbers (after fixing those two), so you can judge either one. Nothing is held back — the labels, the prompt history, and every run are in <a href="https://github.com/seralifatih/docdrifter/tree/master/data" target="_blank" rel="noopener">the repository</a>.</p>
      </div>
      <div>
        <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="border-bottom:1px solid var(--color-divider)">
              <th style="text-align:left;padding:0 0 10px;font-family:var(--mono);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-text-faint);font-weight:600">Repo</th>
              <th style="text-align:right;padding:0 0 10px;font-family:var(--mono);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-text-faint);font-weight:600">Precision</th>
              <th style="text-align:right;padding:0 0 10px;font-family:var(--mono);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-text-faint);font-weight:600">Recall</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid var(--color-divider)">
              <td style="padding:10px 0">apiflask <span style="color:var(--color-text-faint);font-size:12.5px">(raw labels)</span></td>
              <td style="text-align:right;padding:10px 0;font-family:var(--font-heading);font-weight:600">68.2%</td>
              <td style="text-align:right;padding:10px 0;font-family:var(--font-heading);font-weight:600">100%</td>
            </tr>
            <tr style="border-bottom:1px solid var(--color-divider)">
              <td style="padding:10px 0">apiflask <span style="color:var(--color-text-faint);font-size:12.5px">(2 labels corrected)</span></td>
              <td style="text-align:right;padding:10px 0;font-family:var(--font-heading);font-weight:600;color:var(--brand)">77.3%</td>
              <td style="text-align:right;padding:10px 0;font-family:var(--font-heading);font-weight:600;color:var(--brand)">100%</td>
            </tr>
            <tr>
              <td style="padding:10px 0">pygeoapi <span style="color:var(--color-text-faint);font-size:12.5px">(raw labels)</span></td>
              <td style="text-align:right;padding:10px 0;font-family:var(--font-heading);font-weight:600">84.6%</td>
              <td style="text-align:right;padding:10px 0;font-family:var(--font-heading);font-weight:600">91.7%</td>
            </tr>
          </tbody>
        </table>
        </div>
        <p style="font-size:13px;line-height:20px;margin:12px 0 0;color:var(--color-text-faint)">apiflask: 17 of 44 PRs were real drift, corrected precision 77.3% is below pygeoapi's — we're not claiming a uniform 85%+ across both repos, apiflask is the weaker of the two. pygeoapi's ground truth was never revised — only apiflask had labels we caught and fixed.</p>
        <div style="margin-top: var(--leading)">
          <div class="stat-label" style="margin-bottom: var(--half)">Precision vs. the obvious baseline (apiflask, corrected)</div>
          <div class="bar-row">
            <span style="font-size:14.5px">DocDrifter</span>
            <span class="bar-track"><span class="bar-fill" style="width:77%;background:var(--brand)"></span></span>
            <span style="font-family:var(--mono);font-size:13px;text-align:right">77.3%</span>
          </div>
          <div class="bar-row">
            <span style="font-size:14.5px">Keyword / path heuristic</span>
            <span class="bar-track"><span class="bar-fill" style="width:42%;background:var(--color-accent-2)"></span></span>
            <span style="font-family:var(--mono);font-size:13px;text-align:right">42%</span>
          </div>
          <p style="font-size:13.5px;line-height:22px;margin:var(--half) 0 0;color:var(--color-text-muted);max-width:58ch">The baseline is what most teams write first: flag any PR touching <code class="inline">src/</code> without touching <code class="inline">docs/</code>. It fires on almost every refactor, which is why nobody keeps it switched on.</p>
        </div>
      </div>
    </div>
  </section>

  <section id="pricing">
    <span class="kicker">Pricing</span>
    <div class="pricing-grid">
      <div class="pricing-card card">
        <h2 style="font-size:22px;line-height:var(--leading)">Public repositories</h2>
        <div class="price-num" style="margin-top:var(--leading);color:var(--brand)">Free</div>
        <p style="font-size:14px;line-height:22px;margin:10px 0 0;color:var(--color-text-muted);font-family:var(--mono)">no card required</p>
        <div class="feature-list">
          <div class="feature-item"><span class="dot-mark">·</span><span>Runs in your own Actions minutes</span></div>
          <div class="feature-item"><span class="dot-mark">·</span><span>Hosted model calls included</span></div>
          <div class="feature-item"><span class="dot-mark">·</span><span>No API key to configure</span></div>
        </div>
        <a href="#install" class="btn btn-primary" style="margin-top:var(--leading)">Add to a public repo</a>
      </div>
      <div class="pricing-card card">
        <h2 style="font-size:22px;line-height:var(--leading)">Private repositories</h2>
        <div style="display:flex;align-items:baseline;gap:8px;margin-top:var(--leading)">
          <span class="price-num">$9</span>
          <span style="font-family:var(--mono);font-size:14px;color:var(--color-text-muted)">/ repo / month</span>
        </div>
        <p style="font-size:14px;line-height:22px;margin:10px 0 0;color:var(--color-text-muted);font-family:var(--mono)">one subscription per GitHub install, billed per private repo</p>
        <div class="feature-list">
          <div class="feature-item"><span class="dot-mark">·</span><span>Everything in the free tier</span></div>
          <div class="feature-item"><span class="dot-mark">·</span><span>One subscription covers every private repo in your account or org</span></div>
          <div class="feature-item"><span class="dot-mark">·</span><span>New repo added later gets covered automatically</span></div>
          <div class="feature-item"><span class="dot-mark">·</span><span>Dashboard to manage every repo in one place</span></div>
          <div class="feature-item"><span class="dot-mark">·</span><span>Custom docs/source paths and skip labels</span></div>
        </div>
        <a href="#install" class="btn btn-secondary" style="margin-top:var(--leading)">Start on a private repo</a>
      </div>
    </div>
    <p style="font-size:13.5px;line-height:22px;margin:var(--half) 0 0;color:var(--color-text-faint)">Billing is per GitHub installation, not per repo — install DocDrifter Dashboard once on your account or org, and one subscription's quantity tracks how many private repos it covers, at $9/repo/month flat. Add a private repo later and it's covered automatically; no separate subscription to set up for each one.</p>
    <p style="font-size:13.5px;line-height:22px;margin:8px 0 0;color:var(--color-text-faint)">Fair use: 100 PR checks/month per private repo, 50 for public — plenty for almost everyone, and there if you ever need more. <a href="/terms">Details in the terms.</a></p>
  </section>

  <section id="install">
    <div class="install-grid">
      <div>
        <h2 style="font-size:28px;line-height:1.4">A few lines and it's watching</h2>
        <p class="step-body" style="max-width:46ch">No setup UI required, no webhook to register. Commit the workflow, open your next PR, and see whether it stays quiet. <code class="inline">repo-description</code> is optional but not just decoration — a real one-liner about what your project does noticeably sharpens the model's judgment calls.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:var(--leading)">
          <a href="https://github.com/seralifatih/docdrifter" class="btn btn-primary">View on GitHub</a>
        </div>
        <p style="font-size:13.5px;line-height:22px;margin:18px 0 0;color:var(--color-text-faint)">Have private repos, or want the dashboard? <a href="https://github.com/apps/docdrifter-dashboard/installations/new">Install DocDrifter Dashboard</a> instead — same Action underneath, plus billing and a repo list in one place.</p>
      </div>
      <pre class="card"><span style="color:var(--color-text-faint)"># .github/workflows/docdrifter.yml</span>
name: DocDrifter
on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]
permissions:
  pull-requests: write
  contents: read
  id-token: write
jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: <span style="color:var(--brand)">seralifatih/docdrifter@v1</span>
        with:
          src-path: <span style="color:var(--brand)">"src/"</span>
          docs-path: <span style="color:var(--brand)">"docs/"</span>
          repo-description: <span style="color:var(--brand)">"describe your project here"</span></pre>
    </div>
  </section>

  <section id="waitlist" class="card" style="padding:32px 36px;display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin-bottom:calc(1.5 * var(--leading))">
    <div style="flex:1;min-width:220px">
      <h2 style="font-size:19px;line-height:1.4">Not ready to install yet?</h2>
      <p style="font-size:14px;line-height:21px;margin:6px 0 0;color:var(--color-text-muted)">Leave your email and we'll let you know when there's something worth coming back for — new results, a pricing change, nothing spammy.</p>
    </div>
    <form id="waitlist-form" style="display:flex;gap:10px;flex-wrap:wrap;flex:1;min-width:260px">
      <input type="email" id="waitlist-email" required placeholder="you@example.com" style="flex:1;min-width:180px;padding:10px 14px;border-radius:var(--radius-sm);border:1px solid var(--color-divider);background:var(--color-bg);color:var(--color-text);font-family:var(--font-body);font-size:14px">
      <button type="submit" class="btn btn-primary">Notify me</button>
    </form>
    <p id="waitlist-msg" style="display:none;font-size:13.5px;color:var(--status-active,#1a7f4e);width:100%;margin:0"></p>
  </section>

  <footer>
    <hr style="height:0;border:0;border-top:1px solid var(--color-divider);margin:0 0 var(--leading)">
    <div class="footer-row">
      <span style="font-family:var(--font-heading);font-weight:600;font-size:15px;color:var(--color-text)">DocDrifter</span>
      <a href="https://github.com/seralifatih/docdrifter" style="font-family:var(--mono);font-size:12.5px">github.com/seralifatih/docdrifter</a>
      <a href="/blog" style="font-family:var(--mono);font-size:12.5px">blog</a>
      <a href="/privacy" style="font-family:var(--mono);font-size:12.5px">privacy</a>
      <a href="/terms" style="font-family:var(--mono);font-size:12.5px">terms</a>
      <span style="margin-left:auto;font-family:var(--mono);font-size:12.5px;letter-spacing:0.06em;text-transform:uppercase">Built for people who read the diff</span>
    </div>
  </footer>

</div>
<script>
(function () {
  var btn = document.getElementById("theme-toggle");
  var root = document.documentElement;
  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function currentTheme() {
    var attr = root.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    return systemPrefersDark() ? "dark" : "light";
  }
  function label(theme) {
    return theme === "dark" ? "Light" : "Dark";
  }
  function apply(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem("docdrifter-theme", theme); } catch (e) {}
    if (btn) btn.textContent = label(theme);
  }
  if (btn) {
    btn.textContent = label(currentTheme());
    btn.addEventListener("click", function () {
      apply(currentTheme() === "dark" ? "light" : "dark");
    });
  }
})();
(function () {
  var form = document.getElementById("waitlist-form");
  if (!form) return;
  var input = document.getElementById("waitlist-email");
  var msg = document.getElementById("waitlist-msg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = input.value.trim();
    var submitBtn = form.querySelector("button");
    submitBtn.disabled = true;
    fetch("/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email })
    }).then(function (r) {
      if (!r.ok) throw new Error("failed");
      form.style.display = "none";
      msg.textContent = "You're on the list — thanks.";
      msg.style.display = "block";
    }).catch(function () {
      submitBtn.disabled = false;
      msg.style.color = "var(--status-error)";
      msg.textContent = "Something went wrong — try again in a bit.";
      msg.style.display = "block";
    });
  });
})();
</script>
</body>
</html>`;
}

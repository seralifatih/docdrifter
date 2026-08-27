export function landingPage(): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DocDrifter — docs that quietly stop being true</title>
<meta name="description" content="A GitHub Action that flags pull requests which change code but leave documentation untouched. Free for public repos.">
<style>
:root {
  --color-bg: #f3f2f2;
  --color-surface: #eae9e9;
  --color-text: #201e1d;
  --color-divider: color-mix(in srgb, #201e1d 16%, transparent);
  --color-accent-2: #d6006c;
  --brand: #6b3fa0;
  --leading: 28px;
  --half: 14px;
  --edge: clamp(20px, 5vw, 72px);
  --measure: 62ch;
  --font-heading: Georgia, "Source Serif 4", serif;
  --font-body: Georgia, "Source Serif 4", serif;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg: #161514;
    --color-surface: #211f1e;
    --color-text: #ece8e3;
    --color-divider: color-mix(in srgb, #ece8e3 20%, transparent);
    --brand: #b294ee;
  }
}
:root[data-theme="dark"] {
  --color-bg: #161514;
  --color-surface: #211f1e;
  --color-text: #ece8e3;
  --color-divider: color-mix(in srgb, #ece8e3 20%, transparent);
  --brand: #b294ee;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; text-wrap: pretty; background: var(--color-bg); color: var(--color-text); font-family: var(--font-body); font-size: 15px; }
a { color: var(--brand); text-underline-offset: 3px; text-decoration: none; }
a:hover { text-decoration: underline; }
.wrap { max-width: 1180px; margin: 0 auto; padding: 0 var(--edge); }
.kicker { display: block; font-family: var(--mono); font-size: 11.5px; line-height: var(--half); letter-spacing: 0.1em; text-transform: uppercase; color: color-mix(in srgb, var(--color-text) 72%, transparent); margin: 0 0 var(--leading); }
.btn { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-heading); font-weight: 600; font-size: 15px; padding: 11px 20px; border-radius: 2px; }
.btn-primary { background: var(--brand); color: var(--color-bg); }
.btn-secondary { color: var(--brand); border: 1px solid var(--color-divider); }
.btn-ghost { color: var(--brand); padding: 11px 8px; }
nav { display: flex; align-items: center; gap: var(--leading); padding: 18px var(--edge); flex-wrap: wrap; }
nav a { color: inherit; font-size: 14px; white-space: nowrap; }
.nav-brand { font-family: var(--font-heading); font-weight: 600; font-size: 19px; margin-right: auto; letter-spacing: -0.01em; color: var(--color-text); }
h1 { font-family: var(--font-heading); font-weight: 600; font-size: clamp(36px, 6vw, 68px); line-height: 1.08; letter-spacing: -0.02em; margin: 0; }
h2 { font-family: var(--font-heading); font-weight: 600; letter-spacing: -0.015em; margin: 0; }
.lede { font-size: 17px; line-height: var(--leading); max-width: var(--measure); margin: calc(var(--leading) * 1.3) 0 0; }
.rule-thick { height: 3px; background: var(--color-text); margin: 0; }
.rule-thin { height: 1px; background: var(--color-text); margin: 0; }
.stat-strip { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--half) var(--leading); margin: 0; padding: var(--half) 0; font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase; color: color-mix(in srgb, var(--color-text) 72%, transparent); }
.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: calc(1.5 * var(--leading)) clamp(28px, 4vw, 64px); }
.step-num { font-family: var(--font-heading); font-weight: 600; font-size: 48px; line-height: 1; color: var(--brand); letter-spacing: -0.02em; }
.step-title { font-family: var(--font-heading); font-weight: 600; font-size: 22px; line-height: var(--leading); margin: 14px 0 0; }
.step-body { font-size: 15px; line-height: var(--leading); margin: 10px 0 0; color: color-mix(in srgb, var(--color-text) 80%, transparent); }
.evidence-grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: calc(1.5 * var(--leading)) clamp(24px, 5vw, 80px); align-items: start; }
.evidence-title { font-size: 30px; line-height: 1.4; }
.evidence-body { font-size: 15px; line-height: var(--leading); margin: 14px 0 0; color: color-mix(in srgb, var(--color-text) 80%, transparent); max-width: 48ch; }
.stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--leading) 20px; }
.stat-num { font-family: var(--font-heading); font-weight: 600; font-size: 42px; line-height: 1; letter-spacing: -0.02em; color: var(--brand); }
.stat-label { font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 10px; color: color-mix(in srgb, var(--color-text) 72%, transparent); }
.stat-desc { font-size: 13.5px; line-height: 20px; margin: 8px 0 0; color: color-mix(in srgb, var(--color-text) 68%, transparent); }
.bar-row { display: grid; grid-template-columns: 180px 1fr 52px; gap: 14px; align-items: center; margin-bottom: 12px; }
.bar-track { height: 14px; background: color-mix(in srgb, var(--color-text) 8%, transparent); border-radius: 1px; display: block; }
.bar-fill { display: block; height: 14px; border-radius: 1px; }
.pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: calc(1.5 * var(--leading)) clamp(32px, 6vw, 96px); max-width: 900px; }
.price-num { font-family: var(--font-heading); font-weight: 600; font-size: 48px; line-height: 1; letter-spacing: -0.02em; }
.feature-list { display: flex; flex-direction: column; gap: 10px; margin-top: var(--leading); font-size: 15px; line-height: 24px; }
.feature-item { display: flex; gap: 10px; }
.feature-item .dot { color: var(--brand); }
.install-grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: var(--leading) clamp(24px, 5vw, 80px); align-items: center; }
pre { margin: 0; background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 2px; padding: 20px 22px; overflow: auto; font-family: var(--mono); font-size: 13px; line-height: 22px; color: var(--color-text); }
.comment-card { background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 2px; overflow: hidden; }
.comment-head { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--color-divider); font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.06em; text-transform: uppercase; color: color-mix(in srgb, var(--color-text) 72%, transparent); }
.comment-body { padding: 18px 20px 22px; }
code.inline { font-family: var(--mono); font-size: 13px; background: color-mix(in srgb, var(--brand) 12%, transparent); padding: 1px 5px; border-radius: 2px; }
footer { padding: calc(1.5 * var(--leading)) 0 calc(2 * var(--leading)); font-size: 13.5px; line-height: var(--leading); color: color-mix(in srgb, var(--color-text) 70%, transparent); }
.footer-row { display: flex; flex-wrap: wrap; gap: var(--half) var(--leading); align-items: baseline; }
@media (max-width: 720px) {
  .evidence-grid, .install-grid { grid-template-columns: 1fr; }
  .stat-row { grid-template-columns: repeat(3, 1fr); }
}
</style>
</head>
<body>

<nav>
  <span class="nav-brand">DocDrifter</span>
  <a href="#how">How it works</a>
  <a href="#evidence">Evidence</a>
  <a href="#pricing">Pricing</a>
  <a href="https://github.com/marketplace/actions/docdrifter" class="btn btn-primary">Install</a>
</nav>

<div class="wrap">

  <section style="padding: calc(3 * var(--leading)) 0 calc(2 * var(--leading))">
    <h1>
      <span style="display:block">Docs don't break loudly.</span>
      <span style="display:block">They just quietly stop being true.</span>
    </h1>
    <p class="lede">DocDrifter is a GitHub Action that watches pull requests which change code but leave documentation untouched. An LLM reads the diff against your docs tree and answers one question: is anything written here now wrong? If yes, it comments once, on the PR, with the files to check. If no — internal refactor, test-only change, dependency bump — it says nothing at all.</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:var(--leading)">
      <a href="https://github.com/marketplace/actions/docdrifter" class="btn btn-primary">Install on GitHub</a>
      <a href="#install" class="btn btn-ghost">See the workflow file</a>
    </div>
  </section>

  <section aria-label="At a glance" style="padding: 0 0 calc(2.5 * var(--leading))">
    <hr class="rule-thick">
    <p class="stat-strip">
      <span>GitHub Action</span>
      <span>runs on pull_request</span>
      <span>no API key to configure</span>
      <span>free for public repos</span>
    </p>
    <hr class="rule-thin">
  </section>

  <section id="how" style="padding: var(--half) 0 calc(3 * var(--leading))">
    <span class="kicker">How it works</span>
    <div class="steps">
      <div>
        <div class="step-num">01</div>
        <h2 class="step-title">A pull request opens</h2>
        <p class="step-body">The action splits the diff by path into source and documentation. If the PR already touches docs, it exits immediately — no model call, no comment. It only continues when code moved and prose didn't.</p>
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

  <section style="padding: 0 0 calc(3 * var(--leading))">
    <span class="kicker">What it leaves behind</span>
    <div class="evidence-grid">
      <div class="comment-card">
        <div class="comment-head">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--brand);flex:none"></span>
          <span>docdrifter</span>
          <span style="margin-left:auto;text-transform:none;letter-spacing:0">on your PR</span>
        </div>
        <div class="comment-body">
          <p style="font-family:var(--font-heading);font-weight:600;font-size:17px;line-height:24px;margin:0">DocDrifter: possible docs drift detected</p>
          <p style="font-size:15px;line-height:26px;margin:10px 0 0;color:color-mix(in srgb,var(--color-text) 84%,transparent)">This PR changes source files under <code class="inline">src/</code> but doesn't update anything under <code class="inline">docs/</code>. Adds a new configuration option (<code class="inline">retry.backoff</code>) that isn't documented in the config reference.</p>
          <p style="font-size:13.5px;line-height:22px;margin:18px 0 0;color:color-mix(in srgb,var(--color-text) 62%,transparent);font-style:italic">If this doesn't need a docs update, feel free to ignore this comment.</p>
        </div>
      </div>
      <div>
        <h2 style="font-size:20px;line-height:var(--leading)">And the PRs it said nothing about</h2>
        <p class="step-body">Silence is the feature. A bot that comments on every diff gets muted in a week — the whole point is separating the internal refactor from the change your users will actually notice.</p>
      </div>
    </div>
  </section>

  <section id="evidence" style="padding: 0 0 calc(2.5 * var(--leading))">
    <hr class="rule-thick" style="margin-bottom: var(--half)">
    <span class="kicker">Measured, not asserted</span>
    <div class="evidence-grid">
      <div>
        <h2 class="evidence-title">Hand-labeled against 90+ real pull requests</h2>
        <p class="evidence-body">We pulled 90+ merged PRs from two open-source projects (apiflask, pygeoapi), read each one, and recorded whether documentation genuinely needed an update — then ran DocDrifter blind against the same set. The methodology, prompt iteration history, and raw results are in the repository.</p>
      </div>
      <div>
        <div class="stat-row">
          <div>
            <div class="stat-num">85%+</div>
            <div class="stat-label">Precision</div>
            <div class="stat-desc">Of the PRs it flagged, most really did need a docs change.</div>
          </div>
          <div>
            <div class="stat-num">90%+</div>
            <div class="stat-label">Recall</div>
            <div class="stat-desc">Of the PRs that needed one, it caught nearly all of them.</div>
          </div>
          <div>
            <div class="stat-num">90+</div>
            <div class="stat-label">PRs scored</div>
            <div class="stat-desc">Two repos, Python, manually labeled ground truth.</div>
          </div>
        </div>
        <div style="margin-top: var(--leading)">
          <div class="stat-label" style="margin-bottom: var(--half)">Precision vs. the obvious baseline</div>
          <div class="bar-row">
            <span style="font-size:14.5px">DocDrifter</span>
            <span class="bar-track"><span class="bar-fill" style="width:85%;background:var(--brand)"></span></span>
            <span style="font-family:var(--mono);font-size:13px;text-align:right">85%+</span>
          </div>
          <div class="bar-row">
            <span style="font-size:14.5px">Keyword / path heuristic</span>
            <span class="bar-track"><span class="bar-fill" style="width:42%;background:var(--color-accent-2)"></span></span>
            <span style="font-family:var(--mono);font-size:13px;text-align:right">42%</span>
          </div>
          <p style="font-size:13.5px;line-height:22px;margin:var(--half) 0 0;color:color-mix(in srgb,var(--color-text) 68%,transparent);max-width:58ch">The baseline is what most teams write first: flag any PR touching <code class="inline">src/</code> without touching <code class="inline">docs/</code>. It fires on almost every refactor, which is why nobody keeps it switched on.</p>
        </div>
      </div>
    </div>
    <hr class="rule-thin" style="margin-top: calc(2 * var(--leading))">
  </section>

  <section id="pricing" style="padding: var(--half) 0 calc(3 * var(--leading))">
    <span class="kicker">Pricing</span>
    <div class="pricing-grid">
      <div>
        <h2 style="font-size:24px;line-height:var(--leading)">Public repositories</h2>
        <div class="price-num" style="margin-top:var(--leading);color:var(--brand)">Free</div>
        <p style="font-size:14px;line-height:22px;margin:10px 0 0;color:color-mix(in srgb,var(--color-text) 68%,transparent);font-family:var(--mono)">forever, unmetered</p>
        <div class="feature-list">
          <div class="feature-item"><span class="dot">·</span><span>Unlimited pull requests</span></div>
          <div class="feature-item"><span class="dot">·</span><span>Runs in your own Actions minutes</span></div>
          <div class="feature-item"><span class="dot">·</span><span>Hosted model quota included</span></div>
          <div class="feature-item"><span class="dot">·</span><span>No API key to configure</span></div>
        </div>
        <a href="https://github.com/marketplace/actions/docdrifter" class="btn btn-primary" style="margin-top:var(--leading)">Add to a public repo</a>
      </div>
      <div>
        <h2 style="font-size:24px;line-height:var(--leading)">Private repositories</h2>
        <div style="display:flex;align-items:baseline;gap:8px;margin-top:var(--leading)">
          <span class="price-num">$9</span>
          <span style="font-family:var(--mono);font-size:14px;color:color-mix(in srgb,var(--color-text) 68%,transparent)">/ month</span>
        </div>
        <p style="font-size:14px;line-height:22px;margin:10px 0 0;color:color-mix(in srgb,var(--color-text) 68%,transparent);font-family:var(--mono)">per repository, cancel anytime</p>
        <div class="feature-list">
          <div class="feature-item"><span class="dot">·</span><span>Everything in the free tier</span></div>
          <div class="feature-item"><span class="dot">·</span><span>Same OIDC-based setup, no dashboard</span></div>
          <div class="feature-item"><span class="dot">·</span><span>Manage or cancel anytime</span></div>
          <div class="feature-item"><span class="dot">·</span><span>Custom docs/source paths and skip labels</span></div>
        </div>
        <a href="https://github.com/marketplace/actions/docdrifter" class="btn btn-secondary" style="margin-top:var(--leading)">Start on a private repo</a>
      </div>
    </div>
  </section>

  <section id="install" style="padding: 0 0 calc(3 * var(--leading))">
    <div class="install-grid">
      <div>
        <h2 style="font-size:28px;line-height:1.4">A few lines and it's watching</h2>
        <p class="step-body" style="max-width:46ch">No dashboard to configure, no webhook to register. Commit the workflow, open your next PR, and see whether it stays quiet.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:var(--leading)">
          <a href="https://github.com/marketplace/actions/docdrifter" class="btn btn-primary">Get it on GitHub Marketplace</a>
        </div>
      </div>
      <pre><span style="color:color-mix(in srgb,var(--color-text) 55%,transparent)"># .github/workflows/docdrifter.yml</span>
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
          docs-path: <span style="color:var(--brand)">"docs/"</span></pre>
    </div>
  </section>

  <footer>
    <hr style="height:0;border:0;border-top:1px solid var(--color-divider);margin:0 0 var(--leading)">
    <div class="footer-row">
      <span style="font-family:var(--font-heading);font-weight:600;font-size:15px;color:var(--color-text)">DocDrifter</span>
      <a href="https://github.com/seralifatih/docdrifter" style="font-family:var(--mono);font-size:12.5px">github.com/seralifatih/docdrifter</a>
      <span style="margin-left:auto;font-family:var(--mono);font-size:12.5px;letter-spacing:0.06em;text-transform:uppercase">Built for people who read the diff</span>
    </div>
  </footer>

</div>
</body>
</html>`;
}

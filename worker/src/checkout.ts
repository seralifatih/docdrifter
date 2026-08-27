import { BASE_STYLES } from "./styles";

function esc(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
}

const BOOK_ICON = `<svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" fill="var(--brand)" opacity=".22"></path><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" stroke="var(--brand)" stroke-width="1.6" stroke-linejoin="round"></path><path d="M16 8.5v20" stroke="var(--brand)" stroke-width="1.6"></path></svg>`;

const LOCK_ICON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.5" y="7" width="11" height="7" rx="1.5" fill="var(--color-text)" opacity=".18"></rect><rect x="2.5" y="7" width="11" height="7" rx="1.5" stroke="var(--color-text)" stroke-width="1.3"></rect><path d="M5.2 7V4.9a2.8 2.8 0 0 1 5.6 0V7" stroke="var(--color-text)" stroke-width="1.3"></path></svg>`;

export function checkoutPage(
  repo: string,
  clientToken: string,
  priceId: string,
  installationId: number,
  accountLogin: string,
  privateRepoCount: number
): string {
  const safeRepo = esc(repo);
  const safeAccount = esc(accountLogin);
  const qty = Math.max(privateRepoCount, 1);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DocDrifter — activate ${safeAccount}</title>
<style>
${BASE_STYLES}
body { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 24px 16px; }
.wrap { width: 440px; max-width: 100%; }
.brand-row { display: flex; align-items: center; gap: 9px; justify-content: center; margin-bottom: 22px; }
.brand { font-family: var(--font-heading); font-weight: 600; font-size: 18px; letter-spacing: -0.01em; }
.panel { padding: 36px 34px; text-align: center; }
.repo-pill { justify-content: center; width: 100%; }
h1 { font-size: 22px; margin-top: 18px; line-height: 1.35; }
p.lede { font-size: 14px; line-height: 21px; color: var(--color-text-muted); margin: 12px 0 0; }
.divider { height: 1px; background: var(--color-divider); margin: 26px 0; }
.price-row { display: flex; align-items: baseline; justify-content: center; gap: 8px; }
.price { font-family: var(--font-heading); font-weight: 600; font-size: 40px; letter-spacing: -0.02em; color: var(--brand); }
.price-unit { font-size: 13px; color: var(--color-text-faint); }
.qty-note { font-size: 13px; color: var(--color-text-muted); margin-top: 8px; }
#checkout-btn { width: 100%; justify-content: center; margin-top: 22px; font-size: 15px; padding: 12px 18px; }
.fine-print { font-size: 12.5px; color: var(--color-text-faint); margin-top: 14px; line-height: 18px; }
.fine-print a { color: var(--color-accent-700); text-decoration: none; }
.fine-print a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="wrap">
  <div class="brand-row">
    ${BOOK_ICON}
    <span class="brand">DocDrifter</span>
  </div>
  <div class="panel card">
    <span class="pill repo-pill">${LOCK_ICON} ${safeAccount}</span>
    <h1>Activate DocDrifter for ${safeAccount}</h1>
    <p class="lede">This subscription covers every private repo under this GitHub installation — not just <code>${safeRepo}</code>. Public repos stay free and don't count toward the total.</p>
    <div class="divider"></div>
    <div class="price-row">
      <span class="price">$9</span>
      <span class="price-unit">/ repo / month<br>volume pricing applies at checkout</span>
    </div>
    <p class="qty-note">${qty} private repo${qty === 1 ? "" : "s"} on this installation today</p>
    <button id="checkout-btn" class="btn btn-primary">Subscribe</button>
    <p class="fine-print">Paddle checkout · cancel any time · <a href="/privacy">privacy</a> · <a href="/terms">terms</a></p>
  </div>
</div>
<script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
<script>
Paddle.Environment.set("production");
Paddle.Initialize({
  token: "${clientToken}",
  eventCallback: function (event) {
    if (event.name === "checkout.completed") {
      window.location.href = "/status?repo=" + encodeURIComponent("${safeRepo}");
    }
  }
});
document.getElementById("checkout-btn").addEventListener("click", function () {
  Paddle.Checkout.open({
    items: [{ priceId: "${priceId}", quantity: ${qty} }],
    customData: { installation_id: ${installationId} }
  });
});
</script>
</body>
</html>`;
}

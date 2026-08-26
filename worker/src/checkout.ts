export function checkoutPage(repo: string, clientToken: string, priceId: string): string {
  const safeRepo = repo.replace(/[<>&"]/g, "");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>DocDrifter — activate ${safeRepo}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 480px; margin: 4rem auto; padding: 0 1rem; }
  h1 { font-size: 1.25rem; }
  button { font-size: 1rem; padding: 0.75rem 1.5rem; cursor: pointer; }
</style>
</head>
<body>
<h1>Activate DocDrifter for <code>${safeRepo}</code></h1>
<p>This repo is private. DocDrifter is free for public repos, and a paid subscription for private ones.</p>
<button id="checkout-btn">Subscribe</button>
<script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
<script>
  Paddle.Environment.set("production");
  Paddle.Initialize({ token: "${clientToken}" });
  document.getElementById("checkout-btn").addEventListener("click", function () {
    Paddle.Checkout.open({
      items: [{ priceId: "${priceId}", quantity: 1 }],
      customData: { repo: "${safeRepo}" }
    });
  });
</script>
</body>
</html>`;
}

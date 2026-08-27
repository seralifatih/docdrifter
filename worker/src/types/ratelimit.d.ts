// Not yet in @cloudflare/workers-types (as of 5.20260826.1) even though the
// binding itself has been GA on the platform for a while. Verified against
// `wrangler types`' generated output -- the real interface is `RateLimit`
// with this exact shape.
interface RateLimitOutcome {
  success: boolean;
}

interface RateLimit {
  limit(options: { key: string }): Promise<RateLimitOutcome>;
}

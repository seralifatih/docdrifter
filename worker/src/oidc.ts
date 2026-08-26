const JWKS_URL = "https://token.actions.githubusercontent.com/.well-known/jwks";
const EXPECTED_ISSUER = "https://token.actions.githubusercontent.com";
const EXPECTED_AUDIENCE = "docdrifter";

interface Jwk {
  kid: string;
  n: string;
  e: string;
  kty: string;
  alg?: string;
}

interface OidcClaims {
  iss: string;
  aud: string;
  exp: number;
  repository: string; // "owner/name"
}

function base64UrlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b64url.length / 4) * 4, "=");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlDecodeJson<T>(b64url: string): T {
  const bytes = base64UrlToUint8Array(b64url);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

async function fetchJwks(): Promise<{ keys: Jwk[] }> {
  // GitHub's JWKS is served with normal HTTP cache headers; the fetch cache
  // (default in Workers) avoids re-fetching on every request within its TTL.
  const resp = await fetch(JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!resp.ok) throw new Error(`Failed to fetch JWKS: ${resp.status}`);
  return resp.json();
}

async function importRsaKey(jwk: Jwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/**
 * Verifies a GitHub Actions OIDC JWT and returns the trusted `repository`
 * claim, or null if verification fails for any reason. Never throws.
 */
export async function verifyGithubOidcToken(token: string): Promise<string | null> {
  try {
    const [headerB64, payloadB64, sigB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !sigB64) return null;

    const header = base64UrlDecodeJson<{ kid: string; alg: string }>(headerB64);
    const claims = base64UrlDecodeJson<OidcClaims>(payloadB64);

    if (claims.iss !== EXPECTED_ISSUER) return null;
    if (claims.aud !== EXPECTED_AUDIENCE) return null;
    if (!claims.exp || claims.exp * 1000 < Date.now()) return null;
    if (!claims.repository) return null;

    const jwks = await fetchJwks();
    const jwk = jwks.keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;

    const key = await importRsaKey(jwk);
    const signature = base64UrlToUint8Array(sigB64);
    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signedData);
    if (!valid) return null;

    return claims.repository;
  } catch {
    return null;
  }
}

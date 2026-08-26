import { upsertRepoBySubscription, type RepoStatus } from "./db";

function mapPaddleStatus(paddleStatus: string): RepoStatus {
  switch (paddleStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
    case "cancelled":
      return "cancelled";
    default:
      return "cancelled";
  }
}

// Workers doesn't expose Node's crypto.timingSafeEqual, so compare manually
// in constant time (independent of where a mismatch first occurs).
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function computeHmac(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPaddleSignature(
  signatureHeader: string | null,
  body: string,
  secret: string
): Promise<boolean> {
  if (!signatureHeader) return false;

  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(";")) {
    const [key, value] = part.split("=");
    if (key && value) parts[key] = value;
  }

  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const computed = await computeHmac(secret, `${ts}:${body}`);
  return timingSafeEqualHex(computed, h1);
}

interface PaddleEvent {
  event_type: string;
  data: {
    id: string; // subscription id (for subscription.*) or transaction id (for transaction.*)
    customer_id?: string;
    subscription_id?: string; // present on transaction.* events
    status?: string;
    custom_data?: { repo?: string } | null;
    current_billing_period?: { ends_at?: string } | null;
  };
}

export async function handlePaddleEvent(db: D1Database, raw: string): Promise<void> {
  const event = JSON.parse(raw) as PaddleEvent;
  const data = event.data;

  switch (event.event_type) {
    case "subscription.created": {
      const repo = data.custom_data?.repo;
      if (!repo) {
        // No repo to attach this subscription to -- nothing we can do.
        return;
      }
      await upsertRepoBySubscription(db, {
        repo,
        paddleSubscriptionId: data.id,
        paddleCustomerId: data.customer_id ?? "",
        status: mapPaddleStatus(data.status ?? "active"),
        currentPeriodEnd: data.current_billing_period?.ends_at ?? null,
      });
      return;
    }

    case "subscription.updated":
    case "subscription.canceled": {
      await upsertRepoBySubscription(db, {
        paddleSubscriptionId: data.id,
        paddleCustomerId: data.customer_id ?? "",
        status: mapPaddleStatus(data.status ?? "cancelled"),
        currentPeriodEnd: data.current_billing_period?.ends_at ?? null,
      });
      return;
    }

    case "transaction.completed": {
      if (!data.subscription_id) return;
      await upsertRepoBySubscription(db, {
        paddleSubscriptionId: data.subscription_id,
        paddleCustomerId: data.customer_id ?? "",
        status: "active",
      });
      return;
    }

    case "transaction.payment_failed": {
      if (!data.subscription_id) return;
      await upsertRepoBySubscription(db, {
        paddleSubscriptionId: data.subscription_id,
        paddleCustomerId: data.customer_id ?? "",
        status: "past_due",
      });
      return;
    }

    default:
      // Unhandled event types are fine to ignore.
      return;
  }
}

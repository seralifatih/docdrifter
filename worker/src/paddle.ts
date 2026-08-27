import { upsertRepoBySubscription, type RepoStatus } from "./db";
import { timingSafeEqualHex, computeHmac } from "./crypto";

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

export async function createPortalSessionUrl(
  apiKey: string,
  customerId: string,
  subscriptionId: string | null
): Promise<string | null> {
  try {
    const resp = await fetch(`https://api.paddle.com/customers/${customerId}/portal-sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        subscriptionId ? { subscription_ids: [subscriptionId] } : {}
      ),
    });
    if (!resp.ok) return null;
    const result = await resp.json<{ data: { urls: { general: { overview: string } } } }>();
    return result.data.urls.general.overview;
  } catch {
    return null;
  }
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

import { upsertSubscriptionByPaddleId, type SubscriptionStatus } from "./db";
import { timingSafeEqualHex, computeHmac } from "./crypto";

function mapPaddleStatus(paddleStatus: string): SubscriptionStatus {
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
    custom_data?: { installation_id?: number } | null;
    current_billing_period?: { ends_at?: string } | null;
    items?: { quantity: number }[]; // present on subscription.* events
  };
}

function totalQuantity(items: { quantity: number }[] | undefined): number | undefined {
  if (!items) return undefined;
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

// Bumps (or shrinks) the quantity on an already-active Paddle subscription,
// so a newly-added private repo is covered immediately instead of waiting
// for the customer to notice and update it manually. Paddle prorates the
// difference onto the next invoice by default.
export async function updateSubscriptionQuantity(
  apiKey: string,
  subscriptionId: string,
  priceId: string,
  quantity: number
): Promise<boolean> {
  try {
    const resp = await fetch(`https://api.paddle.com/subscriptions/${subscriptionId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity }],
        proration_billing_mode: "prorated_immediately",
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
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
      const installationId = data.custom_data?.installation_id;
      if (!installationId) {
        // No installation to attach this subscription to -- nothing we can do.
        return;
      }
      await upsertSubscriptionByPaddleId(db, {
        installationId,
        paddleSubscriptionId: data.id,
        paddleCustomerId: data.customer_id ?? "",
        status: mapPaddleStatus(data.status ?? "active"),
        quantity: totalQuantity(data.items),
        currentPeriodEnd: data.current_billing_period?.ends_at ?? null,
      });
      return;
    }

    case "subscription.updated":
    case "subscription.canceled": {
      await upsertSubscriptionByPaddleId(db, {
        paddleSubscriptionId: data.id,
        paddleCustomerId: data.customer_id ?? "",
        status: mapPaddleStatus(data.status ?? "cancelled"),
        quantity: totalQuantity(data.items),
        currentPeriodEnd: data.current_billing_period?.ends_at ?? null,
      });
      return;
    }

    case "transaction.completed": {
      if (!data.subscription_id) return;
      await upsertSubscriptionByPaddleId(db, {
        paddleSubscriptionId: data.subscription_id,
        paddleCustomerId: data.customer_id ?? "",
        status: "active",
      });
      return;
    }

    case "transaction.payment_failed": {
      if (!data.subscription_id) return;
      await upsertSubscriptionByPaddleId(db, {
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

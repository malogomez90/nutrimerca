import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getUserById,
  getUserByStripeCustomerId,
  mapStripeStatus,
  markBillingEventProcessed,
  upsertSubscription,
  type PlanType,
} from "@/lib/billing";
import { getStripeClient } from "@/lib/stripe";

function resolvePlan(priceId: string | undefined): PlanType {
  if (!priceId) return "free";

  if (priceId === process.env.STRIPE_PRICE_PRO_ANNUAL) return "pro_annual";
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return "pro_monthly";
  return "free";
}

function getCurrentPeriodEndFromSubscription(subscription: Stripe.Subscription): Date | null {
  const endTs = subscription.items.data[0]?.current_period_end;
  if (typeof endTs !== "number") return null;
  return new Date(endTs * 1000);
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;

  if (typeof sub === "string") return sub;
  return sub.id;
}

async function applySubscriptionUpdate(
  stripe: Stripe,
  subscriptionId: string,
  customerId: string,
  fallbackUserId?: string
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const parsedUserId = Number(fallbackUserId);
  const user = Number.isFinite(parsedUserId) && parsedUserId > 0
    ? await getUserById(parsedUserId)
    : await getUserByStripeCustomerId(customerId);

  if (!user) return;

  const priceId = subscription.items.data[0]?.price?.id;
  const plan = resolvePlan(priceId);
  const status = mapStripeStatus(subscription.status);
  const currentPeriodEnd = getCurrentPeriodEndFromSubscription(subscription);

  await upsertSubscription({
    userId: user.id,
    stripeSubscriptionId: subscription.id,
    plan,
    status,
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

export async function POST(req: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "STRIPE_WEBHOOK_SECRET no configurado.",
        },
      },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Falta stripe-signature.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const shouldProcess = await markBillingEventProcessed(event.id, event.type);
    if (!shouldProcess) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        const metadataUserId = session.metadata?.userId;

        if (customerId && subscriptionId) {
          await applySubscriptionUpdate(stripe, subscriptionId, customerId, metadataUserId);
        }
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        const subscriptionId = getInvoiceSubscriptionId(invoice);

        if (customerId && subscriptionId) {
          await applySubscriptionUpdate(stripe, subscriptionId, customerId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;
        const metadataUserId = subscription.metadata?.userId;

        if (customerId) {
          await applySubscriptionUpdate(
            stripe,
            subscription.id,
            customerId,
            metadataUserId
          );
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Webhook inválido o no verificable.",
        },
      },
      { status: 400 }
    );
  }
}

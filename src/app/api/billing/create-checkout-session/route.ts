import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getOrCreateUserBySession,
  updateUserStripeCustomerId,
  type PlanType,
} from "@/lib/billing";
import { getStripeClient } from "@/lib/stripe";

type CheckoutPayload = {
  sessionId?: string;
  plan?: PlanType;
  email?: string;
};

const ALLOWED_PLANS: PlanType[] = ["pro_monthly", "pro_annual"];

function badRequest(message: string) {
  return NextResponse.json(
    {
      error: {
        code: "BAD_REQUEST",
        message,
      },
    },
    { status: 400 }
  );
}

function formatCheckoutError(error: unknown) {
  if (error instanceof Stripe.errors.StripeError) {
    return {
      code: error.code ?? "STRIPE_ERROR",
      message: `Stripe: ${error.message}`,
    };
  }

  if (error instanceof Error) {
    return {
      code: "INTERNAL_ERROR",
      message: error.message || "Error interno creando checkout.",
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Error interno creando checkout.",
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CheckoutPayload;
    const sessionId = body.sessionId?.trim();
    const plan = body.plan;

    if (!sessionId || sessionId.length < 8 || sessionId.length > 128) {
      return badRequest("sessionId inválido");
    }

    if (!plan || !ALLOWED_PLANS.includes(plan)) {
      return badRequest("plan inválido");
    }

    const stripe = getStripeClient();
    const appUrl = process.env.APP_URL;
    const monthlyPriceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
    const annualPriceId = process.env.STRIPE_PRICE_PRO_ANNUAL;

    if (!appUrl || !monthlyPriceId || !annualPriceId) {
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Falta configuración de billing (APP_URL / price IDs).",
          },
        },
        { status: 500 }
      );
    }

    const user = await getOrCreateUserBySession(sessionId, body.email?.trim() || null);

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: body.email?.trim() || undefined,
        metadata: {
          nutrimercaSessionId: sessionId,
          nutrimercaUserId: String(user.id),
        },
      });
      customerId = customer.id;
      await updateUserStripeCustomerId(user.id, customer.id);
    }

    const price = plan === "pro_annual" ? annualPriceId : monthlyPriceId;

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancelled`,
      metadata: {
        sessionId,
        plan,
        userId: String(user.id),
      },
      subscription_data: {
        metadata: {
          sessionId,
          plan,
          userId: String(user.id),
        },
      },
    });

    if (!checkout.url) {
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "No se pudo generar URL de checkout.",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ checkoutUrl: checkout.url });
  } catch (error) {
    const formatted = formatCheckoutError(error);
    console.error("[billing:create-checkout-session]", error);

    return NextResponse.json(
      {
        error: {
          code: formatted.code,
          message: formatted.message,
        },
      },
      { status: 500 }
    );
  }
}

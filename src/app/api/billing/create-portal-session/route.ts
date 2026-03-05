import { NextResponse } from "next/server";
import { getUserBySession } from "@/lib/billing";
import { getStripeClient } from "@/lib/stripe";

type PortalPayload = {
  sessionId?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PortalPayload;
    const sessionId = body.sessionId?.trim();

    if (!sessionId || sessionId.length < 8 || sessionId.length > 128) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "sessionId inválido",
          },
        },
        { status: 400 }
      );
    }

    const user = await getUserBySession(sessionId);
    if (!user?.stripe_customer_id) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "No existe cliente de Stripe para esta sesión.",
          },
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.APP_URL;
    if (!appUrl) {
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "APP_URL no configurado.",
          },
        },
        { status: 500 }
      );
    }

    const stripe = getStripeClient();
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${appUrl}/`,
    });

    return NextResponse.json({ portalUrl: portal.url });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "No se pudo crear sesión del portal de facturación.",
        },
      },
      { status: 500 }
    );
  }
}

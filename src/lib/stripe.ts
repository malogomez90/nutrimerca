import Stripe from "stripe";

declare global {
  var __nutrimercaStripe: Stripe | undefined;
}

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY no configurado");
  }

  if (!global.__nutrimercaStripe) {
    global.__nutrimercaStripe = new Stripe(secretKey);
  }

  return global.__nutrimercaStripe;
}

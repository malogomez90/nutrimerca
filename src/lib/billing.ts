import { ensureCoreSchema, isDatabaseConfigured, query } from "@/lib/db";

export type SubscriptionStatus =
  | "free"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export type PlanType = "free" | "pro_monthly" | "pro_annual";

type UserRow = {
  id: number;
  session_id: string;
  email: string | null;
  stripe_customer_id: string | null;
};

export type BillingUser = UserRow;

type SubscriptionRow = {
  user_id: number;
  stripe_subscription_id: string | null;
  plan: PlanType;
  status: SubscriptionStatus;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
};

export type BillingStatus = {
  isPro: boolean;
  plan: PlanType;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export function mapStripeStatus(status: string): SubscriptionStatus {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due") return "past_due";
  if (status === "incomplete") return "incomplete";
  if (status === "canceled" || status === "unpaid") return "canceled";
  return "free";
}

export function isProByStatus(status: SubscriptionStatus, plan: PlanType) {
  return (status === "active" || status === "trialing") && plan !== "free";
}

export async function getOrCreateUserBySession(sessionId: string, email?: string | null) {
  if (!isDatabaseConfigured()) {
    return {
      id: 0,
      session_id: sessionId,
      email: email ?? null,
      stripe_customer_id: null,
    } satisfies UserRow;
  }

  await ensureCoreSchema();

  const existing = await query<UserRow>(
    `SELECT id, session_id, email, stripe_customer_id FROM users WHERE session_id = $1 LIMIT 1`,
    [sessionId]
  );

  if (existing.rowCount && existing.rows[0]) {
    const row = existing.rows[0];
    if (email && row.email !== email) {
      await query(`UPDATE users SET email = $1 WHERE id = $2`, [email, row.id]);
      row.email = email;
    }
    return row;
  }

  const inserted = await query<UserRow>(
    `
      INSERT INTO users (session_id, email)
      VALUES ($1, $2)
      RETURNING id, session_id, email, stripe_customer_id
    `,
    [sessionId, email ?? null]
  );

  return inserted.rows[0];
}

export async function getUserBySession(sessionId: string): Promise<BillingUser | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  await ensureCoreSchema();
  const existing = await query<UserRow>(
    `SELECT id, session_id, email, stripe_customer_id FROM users WHERE session_id = $1 LIMIT 1`,
    [sessionId]
  );

  return existing.rows[0] ?? null;
}

export async function getUserById(userId: number): Promise<BillingUser | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  await ensureCoreSchema();
  const rows = await query<UserRow>(
    `SELECT id, session_id, email, stripe_customer_id FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );

  return rows.rows[0] ?? null;
}

export async function updateUserStripeCustomerId(userId: number, stripeCustomerId: string) {
  if (!isDatabaseConfigured() || userId <= 0) return;
  await ensureCoreSchema();
  await query(`UPDATE users SET stripe_customer_id = $1 WHERE id = $2`, [stripeCustomerId, userId]);
}

export async function getBillingStatusBySession(sessionId: string): Promise<BillingStatus> {
  if (!isDatabaseConfigured()) {
    return {
      isPro: false,
      plan: "free",
      status: "free",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  await ensureCoreSchema();
  const data = await query<SubscriptionRow>(
    `
      SELECT s.user_id, s.stripe_subscription_id, s.plan, s.status, s.current_period_end, s.cancel_at_period_end
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      WHERE u.session_id = $1
      LIMIT 1
    `,
    [sessionId]
  );

  if (!data.rowCount || !data.rows[0]) {
    return {
      isPro: false,
      plan: "free",
      status: "free",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  const row = data.rows[0];
  const plan = row.plan ?? "free";
  const status = row.status ?? "free";

  return {
    isPro: isProByStatus(status, plan),
    plan,
    status,
    currentPeriodEnd: row.current_period_end ? row.current_period_end.toISOString() : null,
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
  };
}

export async function getBillingStatusByUserId(userId: number): Promise<BillingStatus> {
  if (!isDatabaseConfigured() || userId <= 0) {
    return {
      isPro: false,
      plan: "free",
      status: "free",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  await ensureCoreSchema();
  const data = await query<SubscriptionRow>(
    `
      SELECT s.user_id, s.stripe_subscription_id, s.plan, s.status, s.current_period_end, s.cancel_at_period_end
      FROM subscriptions s
      WHERE s.user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  if (!data.rowCount || !data.rows[0]) {
    return {
      isPro: false,
      plan: "free",
      status: "free",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  const row = data.rows[0];
  const plan = row.plan ?? "free";
  const status = row.status ?? "free";

  return {
    isPro: isProByStatus(status, plan),
    plan,
    status,
    currentPeriodEnd: row.current_period_end ? row.current_period_end.toISOString() : null,
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
  };
}

export async function upsertSubscription(params: {
  userId: number;
  stripeSubscriptionId: string;
  plan: PlanType;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}) {
  if (!isDatabaseConfigured() || params.userId <= 0) return;

  await ensureCoreSchema();
  await query(
    `
      INSERT INTO subscriptions (
        user_id,
        stripe_subscription_id,
        plan,
        status,
        current_period_end,
        cancel_at_period_end,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        plan = EXCLUDED.plan,
        status = EXCLUDED.status,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        updated_at = NOW()
    `,
    [
      params.userId,
      params.stripeSubscriptionId,
      params.plan,
      params.status,
      params.currentPeriodEnd,
      params.cancelAtPeriodEnd,
    ]
  );
}

export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  if (!isDatabaseConfigured()) return null;
  await ensureCoreSchema();
  const rows = await query<UserRow>(
    `SELECT id, session_id, email, stripe_customer_id FROM users WHERE stripe_customer_id = $1 LIMIT 1`,
    [stripeCustomerId]
  );
  return rows.rows[0] ?? null;
}

export async function markBillingEventProcessed(eventId: string, eventType: string) {
  if (!isDatabaseConfigured()) return true;
  await ensureCoreSchema();

  const res = await query(
    `
      INSERT INTO billing_events (event_id, event_type)
      VALUES ($1, $2)
      ON CONFLICT (event_id) DO NOTHING
    `,
    [eventId, eventType]
  );

  return (res.rowCount ?? 0) > 0;
}

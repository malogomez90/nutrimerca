import { ensureCoreSchema, isDatabaseConfigured, query } from "@/lib/db";

const MONTHLY_LIMITS = {
  starter_monthly: 30,
  pro_monthly: 150,
  pro_annual: 150,
} as const;

type MonthlyPlan = keyof typeof MONTHLY_LIMITS;

function getMonthKeyUTC(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function consumePersistent(sessionId: string, plan: MonthlyPlan) {
  await ensureCoreSchema();

  const totalMessages = MONTHLY_LIMITS[plan];
  const monthKey = getMonthKeyUTC();

  const current = await query<{ used_messages: number }>(
    `SELECT used_messages FROM message_quota_monthly WHERE session_id = $1 AND month_key = $2 LIMIT 1`,
    [sessionId, monthKey]
  );

  const used = current.rows[0]?.used_messages ?? 0;
  if (used >= totalMessages) {
    return {
      allowed: false as const,
      usedMessages: used,
      totalMessages,
      remainingMessages: 0,
    };
  }

  const nextUsed = used + 1;
  await query(
    `
      INSERT INTO message_quota_monthly (session_id, month_key, used_messages, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (session_id, month_key)
      DO UPDATE SET used_messages = EXCLUDED.used_messages, updated_at = NOW()
    `,
    [sessionId, monthKey, nextUsed]
  );

  return {
    allowed: true as const,
    usedMessages: nextUsed,
    totalMessages,
    remainingMessages: Math.max(0, totalMessages - nextUsed),
  };
}

export async function consumeMonthlyQuota(sessionId: string, plan: MonthlyPlan) {
  if (!isDatabaseConfigured()) {
    return {
      allowed: true as const,
      usedMessages: 0,
      totalMessages: MONTHLY_LIMITS[plan],
      remainingMessages: MONTHLY_LIMITS[plan],
    };
  }

  return consumePersistent(sessionId, plan);
}

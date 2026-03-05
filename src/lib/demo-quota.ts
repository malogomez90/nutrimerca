import { ensureCoreSchema, isDatabaseConfigured, query } from "@/lib/db";

type QuotaState = {
  usedMessages: number;
};

const MAX_FREE_MESSAGES = 5;

declare global {
  var __nutrimercaQuotaStore: Map<string, QuotaState> | undefined;
}

const quotaStore = global.__nutrimercaQuotaStore ?? new Map<string, QuotaState>();
global.__nutrimercaQuotaStore = quotaStore;

async function consumeDemoQuotaPersistent(sessionId: string) {
  await ensureCoreSchema();

  const existing = await query<{ used_messages: number }>(
    `SELECT used_messages FROM demo_quota WHERE session_id = $1 LIMIT 1`,
    [sessionId]
  );

  const used = existing.rows[0]?.used_messages ?? 0;
  if (used >= MAX_FREE_MESSAGES) {
    return {
      allowed: false as const,
      remainingFreeMessages: 0,
    };
  }

  const nextUsed = used + 1;
  await query(
    `
      INSERT INTO demo_quota (session_id, used_messages, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (session_id)
      DO UPDATE SET used_messages = EXCLUDED.used_messages, updated_at = NOW()
    `,
    [sessionId, nextUsed]
  );

  return {
    allowed: true as const,
    remainingFreeMessages: Math.max(0, MAX_FREE_MESSAGES - nextUsed),
  };
}

function consumeDemoQuotaInMemory(sessionId: string) {
  const current = quotaStore.get(sessionId) ?? { usedMessages: 0 };

  if (current.usedMessages >= MAX_FREE_MESSAGES) {
    return {
      allowed: false as const,
      remainingFreeMessages: 0,
    };
  }

  const usedMessages = current.usedMessages + 1;
  quotaStore.set(sessionId, { usedMessages });

  return {
    allowed: true as const,
    remainingFreeMessages: Math.max(0, MAX_FREE_MESSAGES - usedMessages),
  };
}

export async function consumeDemoQuota(sessionId: string) {
  if (isDatabaseConfigured()) {
    return consumeDemoQuotaPersistent(sessionId);
  }

  return consumeDemoQuotaInMemory(sessionId);
}

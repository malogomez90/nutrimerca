type QuotaState = {
  usedMessages: number;
};

const MAX_FREE_MESSAGES = 5;

declare global {
  var __nutrimercaQuotaStore: Map<string, QuotaState> | undefined;
}

const quotaStore = global.__nutrimercaQuotaStore ?? new Map<string, QuotaState>();
global.__nutrimercaQuotaStore = quotaStore;

export function consumeDemoQuota(sessionId: string) {
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

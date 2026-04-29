import { abuseConfig } from "../config";
import type { RiskContext } from "../types";
import { defaultRateLimiter } from "./memory";
import type { RateLimitDecision, RateLimiter } from "./types";

export type { RateLimiter, RateLimitDecision } from "./types";
export { defaultRateLimiter, InMemoryRateLimiter } from "./memory";

export interface ContextRateLimitResult {
  allowed: boolean;
  decisions: RateLimitDecision[];
  hardestScope: RateLimitDecision | null;
}

export async function checkContextRateLimits(
  ctx: RiskContext,
  limiter: RateLimiter = defaultRateLimiter
): Promise<ContextRateLimitResult> {
  const cfg = abuseConfig.rateLimit.perAction[ctx.action];
  if (!cfg) return { allowed: true, decisions: [], hardestScope: null };
  const decisions: RateLimitDecision[] = [];
  const candidates = [
    ctx.subject.userId !== null && ctx.subject.userId !== undefined
      ? { scope: "user" as const, identity: String(ctx.subject.userId) }
      : null,
    ctx.subject.ipHash ? { scope: "ip" as const, identity: ctx.subject.ipHash } : null,
    ctx.subject.sessionId ? { scope: "session" as const, identity: ctx.subject.sessionId } : null,
    ctx.subject.deviceHash ? { scope: "device" as const, identity: ctx.subject.deviceHash } : null,
  ].filter(Boolean) as { scope: "user" | "ip" | "session" | "device"; identity: string }[];

  let hardest: RateLimitDecision | null = null;
  let allowed = true;
  for (const c of candidates) {
    const k = { ...c, action: ctx.action };
    if (await limiter.isBlocked(k)) {
      const d: RateLimitDecision = {
        allowed: false,
        count: cfg.limit + 1,
        limit: cfg.limit,
        windowSec: cfg.windowSec,
        resetAt: 0,
      };
      decisions.push(d);
      hardest = d;
      allowed = false;
      continue;
    }
    const d = await limiter.check(k, cfg.limit, cfg.windowSec);
    decisions.push(d);
    if (!d.allowed) {
      allowed = false;
      if (!hardest || d.count > hardest.count) hardest = d;
    }
  }
  return { allowed, decisions, hardestScope: hardest };
}

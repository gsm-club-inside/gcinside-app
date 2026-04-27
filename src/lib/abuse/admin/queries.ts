import { defaultDecisionRepo } from "../repo/decisions";
import { defaultReputationStore } from "../reputation";
import { defaultRateLimiter } from "../rate-limit";
import type { RiskDecision } from "../types";
import { defaultRuleEngine } from "../rules/engine";

export async function listRecentDecisions(limit = 50): Promise<RiskDecision[]> {
  return defaultDecisionRepo.recent(limit);
}

export async function listUserDecisions(userId: number, limit = 50): Promise<RiskDecision[]> {
  return defaultDecisionRepo.byUser(userId, limit);
}

export async function ruleHitCounts(limit = 200): Promise<Record<string, number>> {
  const items = await defaultDecisionRepo.recent(limit);
  const counts: Record<string, number> = {};
  for (const d of items) for (const r of d.reasons) counts[r.code] = (counts[r.code] ?? 0) + 1;
  return counts;
}

export async function activeRules() {
  return defaultRuleEngine.list().map((r) => ({ id: r.id, name: r.name, weight: r.weight, enabled: r.enabled }));
}

export async function unblockUser(userId: number, action: string) {
  await defaultRateLimiter.unblock({ scope: "user", action, identity: String(userId) });
}

export async function resetUserReputation(userId: number) {
  await defaultReputationStore.reset("user", String(userId));
}

export async function setUserReputation(userId: number, value: number) {
  await defaultReputationStore.set("user", String(userId), value);
}

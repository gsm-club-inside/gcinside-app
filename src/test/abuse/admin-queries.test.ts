import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activeRules,
  listRecentDecisions,
  listUserDecisions,
  resetUserReputation,
  ruleHitCounts,
  setUserReputation,
  unblockUser,
} from "@/lib/abuse/admin/queries";
import { defaultDecisionRepo } from "@/lib/abuse/repo/decisions";
import { defaultRateLimiter } from "@/lib/abuse/rate-limit";
import { defaultReputationStore } from "@/lib/abuse/reputation";
import { defaultRuleEngine } from "@/lib/abuse/rules/engine";
import type { RiskDecision } from "@/lib/abuse/types";

afterEach(() => vi.restoreAllMocks());

const decision = (codes: string[], userId: number | null = 1): RiskDecision => ({
  action: "create_post",
  subject: { userId, ipHash: "ih", sessionId: "s", deviceHash: "dh" },
  score: 0.5,
  level: "MONITOR",
  decision: "MONITOR",
  reasons: codes.map((code) => ({ code, weight: 0.5 })),
  signals: [],
  breakdown: {
    ruleScore: 0,
    behaviorScore: 0,
    velocityScore: 0,
    reputationScore: 0,
    contentSimilarityScore: 0,
    mlScore: null,
  },
  ruleVersion: "rules-v1",
  modelVersion: null,
  challenge: null,
  createdAt: new Date().toISOString(),
  metadata: {},
});

describe("admin/queries", () => {
  it("delegates listRecentDecisions and listUserDecisions to repo", async () => {
    const recent = vi.spyOn(defaultDecisionRepo, "recent").mockResolvedValue([]);
    const byUser = vi.spyOn(defaultDecisionRepo, "byUser").mockResolvedValue([]);
    await listRecentDecisions(11);
    await listUserDecisions(7, 5);
    expect(recent).toHaveBeenCalledWith(11);
    expect(byUser).toHaveBeenCalledWith(7, 5);
  });

  it("ruleHitCounts aggregates reasons across recent decisions", async () => {
    vi.spyOn(defaultDecisionRepo, "recent").mockResolvedValue([
      decision(["a", "b"]),
      decision(["a"]),
      decision(["c"]),
    ]);
    expect(await ruleHitCounts(50)).toEqual({ a: 2, b: 1, c: 1 });
  });

  it("activeRules returns enabled rules with weights", async () => {
    const list = await activeRules();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((r) => r.enabled)).toBe(true);
    expect(list[0]).toHaveProperty("weight");
    // sanity: rules engine uses same builtins
    expect(defaultRuleEngine.list().length).toBe(list.length);
  });

  it("unblockUser/resetUserReputation/setUserReputation forward to dependencies", async () => {
    const unblock = vi.spyOn(defaultRateLimiter, "unblock").mockResolvedValue();
    const reset = vi.spyOn(defaultReputationStore, "reset").mockResolvedValue();
    const set = vi.spyOn(defaultReputationStore, "set").mockResolvedValue();

    await unblockUser(2, "vote");
    await resetUserReputation(2);
    await setUserReputation(2, 0.7);

    expect(unblock).toHaveBeenCalledWith({ scope: "user", action: "vote", identity: "2" });
    expect(reset).toHaveBeenCalledWith("user", "2");
    expect(set).toHaveBeenCalledWith("user", "2", 0.7);
  });
});

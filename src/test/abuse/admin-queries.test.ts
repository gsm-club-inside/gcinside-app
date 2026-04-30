import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  riskDecisionRecord: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  abuseAdminLog: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  activeRules,
  createAbuseAdminLog,
  listDetectedAbuseRecords,
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

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

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

  it("listDetectedAbuseRecords reads persisted non-allow decisions with logs", async () => {
    prismaMock.riskDecisionRecord.findMany.mockResolvedValue([
      {
        id: BigInt(10),
        requestId: "req-1",
        userId: 7,
        sessionId: null,
        ipHash: "ip",
        deviceHash: null,
        action: "create_post",
        score: 0.8,
        decision: "RATE_LIMIT",
        reasons: [{ code: "burst_requests_60" }],
        signals: [],
        ruleVersion: "rules-v1",
        modelVersion: "m1",
        metadata: {},
        createdAt: new Date("2026-04-30T00:00:00Z"),
      },
    ]);
    prismaMock.abuseAdminLog.findMany.mockResolvedValue([
      {
        id: BigInt(5),
        requestId: "req-1",
        adminUserId: 1,
        adminName: "Admin",
        adminEmail: "admin@example.com",
        action: "confirmed_abuse",
        note: "반복 요청 확인",
        createdAt: new Date("2026-04-30T00:01:00Z"),
      },
    ]);

    const rows = await listDetectedAbuseRecords(20);

    expect(prismaMock.riskDecisionRecord.findMany).toHaveBeenCalledWith({
      where: { decision: { not: "ALLOW" } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    expect(rows[0].id).toBe("10");
    expect(rows[0].logs[0]).toMatchObject({
      id: "5",
      action: "confirmed_abuse",
      note: "반복 요청 확인",
    });
  });

  it("createAbuseAdminLog validates decision and writes a note", async () => {
    prismaMock.riskDecisionRecord.findUnique.mockResolvedValue({ requestId: "req-1" });
    prismaMock.abuseAdminLog.create.mockResolvedValue({
      id: BigInt(6),
      requestId: "req-1",
      adminUserId: 1,
      adminName: "Admin",
      adminEmail: "admin@example.com",
      action: "resolved",
      note: "처리 완료",
      createdAt: new Date("2026-04-30T00:02:00Z"),
    });

    const log = await createAbuseAdminLog({
      requestId: " req-1 ",
      adminUserId: 1,
      adminName: "Admin",
      adminEmail: "admin@example.com",
      action: "resolved",
      note: " 처리 완료 ",
    });

    expect(prismaMock.riskDecisionRecord.findUnique).toHaveBeenCalledWith({
      where: { requestId: "req-1" },
    });
    expect(prismaMock.abuseAdminLog.create).toHaveBeenCalledWith({
      data: {
        requestId: "req-1",
        adminUserId: 1,
        adminName: "Admin",
        adminEmail: "admin@example.com",
        action: "resolved",
        note: "처리 완료",
      },
    });
    expect(log.id).toBe("6");
  });
});

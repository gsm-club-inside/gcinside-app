import { describe, expect, it, vi, beforeEach } from "vitest";
import { HybridDecisionRepo, InMemoryDecisionRepo } from "@/lib/abuse/repo/decisions";
import type { RiskDecision } from "@/lib/abuse/types";

const upsertMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    riskDecisionRecord: {
      get upsert() {
        return upsertMock;
      },
    },
  },
}));

beforeEach(() => {
  upsertMock.mockReset();
  upsertMock.mockResolvedValue(undefined);
});

function fakeDecision(userId: number | null, action = "create_post"): RiskDecision {
  return {
    action: action as RiskDecision["action"],
    subject: { userId, ipHash: "ih", sessionId: "s", deviceHash: "dh" },
    score: 0.42,
    level: "MONITOR",
    decision: "MONITOR",
    reasons: [{ code: "demo", weight: 0.5 }],
    signals: [{ ruleId: "demo", reason: { code: "demo", weight: 0.5 } }],
    breakdown: {
      ruleScore: 0.5,
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
  };
}

describe("InMemoryDecisionRepo", () => {
  it("stores and lists recent decisions in LIFO order", async () => {
    const repo = new InMemoryDecisionRepo();
    await repo.save(fakeDecision(1), "req-1");
    await repo.save(fakeDecision(2), "req-2");
    const recent = await repo.recent(10);
    expect(recent[0]?.subject.userId).toBe(2);
    expect(recent[1]?.subject.userId).toBe(1);
  });

  it("filters by userId", async () => {
    const repo = new InMemoryDecisionRepo();
    await repo.save(fakeDecision(1), "req-a");
    await repo.save(fakeDecision(2), "req-b");
    await repo.save(fakeDecision(1), "req-c");
    const list = await repo.byUser(1, 5);
    expect(list).toHaveLength(2);
    expect(list.every((d) => d.subject.userId === 1)).toBe(true);
  });

  it("caps stored items at 1000", async () => {
    const repo = new InMemoryDecisionRepo();
    for (let i = 0; i < 1100; i++) {
      await repo.save(fakeDecision(i % 5), `req-${i}`);
    }
    expect(await repo.recent(2000)).toHaveLength(1000);
  });
});

describe("HybridDecisionRepo", () => {
  it("writes through to in-memory and prisma upsert", async () => {
    const mem = new InMemoryDecisionRepo();
    const repo = new HybridDecisionRepo(mem);
    await repo.save(fakeDecision(7), "req-7");

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const call = upsertMock.mock.calls[0]![0];
    expect(call.where.requestId).toBe("req-7");
    expect((await repo.recent(5))[0]?.subject.userId).toBe(7);
  });

  it("swallows prisma errors but keeps in-memory state", async () => {
    upsertMock.mockRejectedValueOnce(new Error("db down"));
    const mem = new InMemoryDecisionRepo();
    const repo = new HybridDecisionRepo(mem);
    await expect(repo.save(fakeDecision(8), "req-8")).resolves.toBeUndefined();
    expect((await repo.byUser(8, 5)).length).toBe(1);
  });
});

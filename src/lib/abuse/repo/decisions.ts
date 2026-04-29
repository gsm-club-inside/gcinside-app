import type { RiskDecision } from "../types";
import type { Prisma } from "@prisma/client";

export interface DecisionRepo {
  save(decision: RiskDecision, requestId: string): Promise<void>;
  recent(limit: number): Promise<RiskDecision[]>;
  byUser(userId: number, limit: number): Promise<RiskDecision[]>;
}

class InMemoryDecisionRepo implements DecisionRepo {
  private items: { d: RiskDecision; requestId: string }[] = [];

  async save(d: RiskDecision, requestId: string) {
    this.items.unshift({ d, requestId });
    if (this.items.length > 1000) this.items.pop();
  }
  async recent(limit: number) {
    return this.items.slice(0, limit).map((x) => x.d);
  }
  async byUser(userId: number, limit: number) {
    return this.items
      .filter((x) => x.d.subject.userId === userId)
      .slice(0, limit)
      .map((x) => x.d);
  }
}

class HybridDecisionRepo implements DecisionRepo {
  constructor(private memory: InMemoryDecisionRepo) {}

  async save(d: RiskDecision, requestId: string) {
    await this.memory.save(d, requestId);

    try {
      const { prisma } = await import("@/lib/prisma");
      const metadata = toJson({
        ...d.metadata,
        breakdown: d.breakdown,
        challenge: d.challenge,
      });
      await prisma.riskDecisionRecord.upsert({
        where: { requestId },
        create: {
          requestId,
          userId: d.subject.userId ?? null,
          sessionId: d.subject.sessionId ?? null,
          ipHash: d.subject.ipHash ?? null,
          deviceHash: d.subject.deviceHash ?? null,
          action: d.action,
          score: d.score,
          decision: d.level,
          reasons: toJson(d.reasons),
          signals: toJson(d.signals),
          ruleVersion: d.ruleVersion,
          modelVersion: d.modelVersion,
          metadata,
        },
        update: {
          score: d.score,
          decision: d.level,
          reasons: toJson(d.reasons),
          signals: toJson(d.signals),
          ruleVersion: d.ruleVersion,
          modelVersion: d.modelVersion,
          metadata,
        },
      });
    } catch {
      // Keep request handling fail-open; DB persistence is a learning/audit aid.
    }
  }

  async recent(limit: number) {
    return this.memory.recent(limit);
  }

  async byUser(userId: number, limit: number) {
    return this.memory.byUser(userId, limit);
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const g = globalThis as unknown as { abuseDecisionRepo?: DecisionRepo };
export const defaultDecisionRepo: DecisionRepo =
  g.abuseDecisionRepo ?? new HybridDecisionRepo(new InMemoryDecisionRepo());
if (!g.abuseDecisionRepo) g.abuseDecisionRepo = defaultDecisionRepo;

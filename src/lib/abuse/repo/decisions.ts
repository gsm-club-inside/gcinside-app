import type { RiskDecision } from "../types";

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
    return this.items.filter((x) => x.d.subject.userId === userId).slice(0, limit).map((x) => x.d);
  }
}

const g = globalThis as unknown as { abuseDecisionRepo?: DecisionRepo };
export const defaultDecisionRepo: DecisionRepo = g.abuseDecisionRepo ?? new InMemoryDecisionRepo();
if (!g.abuseDecisionRepo) g.abuseDecisionRepo = defaultDecisionRepo;

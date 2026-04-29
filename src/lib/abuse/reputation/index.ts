export type ReputationScope = "user" | "ip" | "device";

export interface ReputationStore {
  get(scope: ReputationScope, identity: string): Promise<number>;
  adjust(scope: ReputationScope, identity: string, delta: number): Promise<number>;
  set(scope: ReputationScope, identity: string, value: number): Promise<void>;
  reset(scope: ReputationScope, identity: string): Promise<void>;
  isAllowlisted(scope: ReputationScope, identity: string): Promise<boolean>;
  isBlocklisted(scope: ReputationScope, identity: string): Promise<boolean>;
}

export class InMemoryReputationStore implements ReputationStore {
  private values = new Map<string, number>();
  private allow = new Set<string>();
  private block = new Set<string>();

  private k(scope: ReputationScope, id: string) {
    return `${scope}:${id}`;
  }

  async get(scope: ReputationScope, id: string) {
    return this.values.get(this.k(scope, id)) ?? 0.5;
  }
  async adjust(scope: ReputationScope, id: string, delta: number) {
    const cur = await this.get(scope, id);
    const next = Math.max(0, Math.min(1, cur + delta));
    this.values.set(this.k(scope, id), next);
    return next;
  }
  async set(scope: ReputationScope, id: string, v: number) {
    this.values.set(this.k(scope, id), Math.max(0, Math.min(1, v)));
  }
  async reset(scope: ReputationScope, id: string) {
    this.values.delete(this.k(scope, id));
  }
  async isAllowlisted(scope: ReputationScope, id: string) {
    return this.allow.has(this.k(scope, id));
  }
  async isBlocklisted(scope: ReputationScope, id: string) {
    return this.block.has(this.k(scope, id));
  }

  /** test-only: allow seeding without going through public API */
  __seedAllow(scope: ReputationScope, id: string) {
    this.allow.add(this.k(scope, id));
  }
  __seedBlock(scope: ReputationScope, id: string) {
    this.block.add(this.k(scope, id));
  }
}

const g = globalThis as unknown as { abuseReputation?: ReputationStore };
export const defaultReputationStore: ReputationStore =
  g.abuseReputation ?? new InMemoryReputationStore();
if (!g.abuseReputation) g.abuseReputation = defaultReputationStore;

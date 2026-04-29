import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { abuseConfig } from "@/lib/abuse/config";
import { checkAbuseRisk } from "@/lib/abuse/orchestrator";
import { InMemoryRateLimiter } from "@/lib/abuse/rate-limit";
import { defaultRuleEngine } from "@/lib/abuse/rules/engine";
import { InMemoryReputationStore } from "@/lib/abuse/reputation";
import { defaultAuditSink, type AuditSink } from "@/lib/abuse/audit";
import { InMemoryDecisionRepo } from "@/lib/abuse/repo/decisions";
import type { AiInferenceClient } from "@/lib/abuse/ai-client";
import type { RiskContext } from "@/lib/abuse/types";

const okAi: AiInferenceClient = {
  async predict() {
    return { ok: true, data: { mlScore: 0.5, modelVersion: "test", reasons: [] } };
  },
};

const ctx: RiskContext = {
  action: "create_post",
  subject: { userId: 5, ipHash: "ih", sessionId: "s", deviceHash: "dh" },
  recentRequestCount1m: 1,
  telemetry: { keydownCount: 10, submitElapsedMs: 4000, pointerMoveCount: 10 },
};

let savedShadow: boolean;

beforeEach(() => {
  savedShadow = abuseConfig.shadowMode;
});
afterEach(() => {
  abuseConfig.shadowMode = savedShadow;
});

function deps(overrides: Partial<Parameters<typeof checkAbuseRisk>[2]> = {}) {
  return {
    rules: defaultRuleEngine,
    ai: okAi,
    limiter: new InMemoryRateLimiter(),
    reputation: new InMemoryReputationStore(),
    audit: defaultAuditSink,
    decisions: new InMemoryDecisionRepo(),
    ...overrides,
  } satisfies Parameters<typeof checkAbuseRisk>[2];
}

describe("orchestrator branches", () => {
  it("enriches reputation when context omits it", async () => {
    const reputation = new InMemoryReputationStore();
    await reputation.set("user", "5", 0.1);
    const r = await checkAbuseRisk(ctx, {}, deps({ reputation }));
    expect(r.decision.breakdown.reputationScore).toBeCloseTo(0.9, 2);
  });

  it("rate-limit override forces RATE_LIMIT level and prepends rate_limit_exceeded reason", async () => {
    const limiter = new InMemoryRateLimiter();
    await limiter.block({ scope: "user", action: "create_post", identity: "5" }, 60);
    const r = await checkAbuseRisk(ctx, {}, deps({ limiter }));
    expect(r.rateLimited).toBe(true);
    expect(r.decision.level).toBe("RATE_LIMIT");
    expect(r.decision.reasons[0]?.code).toBe("rate_limit_exceeded");
  });

  it("does not persist decision when learningEnabled=false", async () => {
    const decisions = new InMemoryDecisionRepo();
    const save = vi.spyOn(decisions, "save");
    await checkAbuseRisk(ctx, { runtimeSettings: { learningEnabled: false } }, deps({ decisions }));
    expect(save).not.toHaveBeenCalled();
  });

  it("shadowMode disables enforcement even at high risk levels", async () => {
    abuseConfig.shadowMode = true;
    const limiter = new InMemoryRateLimiter();
    await limiter.block({ scope: "user", action: "create_post", identity: "5" }, 60);
    const r = await checkAbuseRisk(ctx, {}, deps({ limiter }));
    expect(r.rateLimited).toBe(true);
    expect(r.enforced).toBe(false);
  });

  it("emits an ai_failure audit event on AI errors", async () => {
    const sink: AuditSink = { write: vi.fn(async () => {}) };
    const failingAi: AiInferenceClient = {
      async predict() {
        return { ok: false, error: { reason: "timeout" } };
      },
    };
    await checkAbuseRisk(ctx, {}, deps({ audit: sink, ai: failingAi }));
    const kinds = (sink.write as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => (c[0] as { kind: string }).kind
    );
    expect(kinds).toContain("ai_failure");
  });

  it("skipAi short-circuits to rule-only scoring", async () => {
    const decisions = new InMemoryDecisionRepo();
    const r = await checkAbuseRisk(ctx, { skipAi: true }, deps({ decisions }));
    expect(r.decision.modelVersion).toBeNull();
    expect(r.decision.breakdown.mlScore).toBeNull();
  });
});

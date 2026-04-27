import { describe, expect, it } from "vitest";
import { checkAbuseRisk } from "@/lib/abuse/orchestrator";
import { InMemoryRateLimiter } from "@/lib/abuse/rate-limit";
import { defaultRuleEngine } from "@/lib/abuse/rules/engine";
import { defaultReputationStore } from "@/lib/abuse/reputation";
import { defaultAuditSink } from "@/lib/abuse/audit";
import type { AiInferenceClient } from "@/lib/abuse/ai-client";
import type { RiskContext } from "@/lib/abuse/types";

const failingAi: AiInferenceClient = {
  async predict() { return { ok: false, error: { reason: "timeout" } }; },
};

const okAi: AiInferenceClient = {
  async predict() { return { ok: true, data: { mlScore: 0.9, modelVersion: "test", reasons: [] } }; },
};

const baseCtx: RiskContext = {
  action: "create_post",
  subject: { userId: 1, ipHash: "ih", sessionId: "s" },
  recentRequestCount1m: 1,
  telemetry: { keydownCount: 10, submitElapsedMs: 4000, pointerMoveCount: 10 },
};

describe("orchestrator AI fallback", () => {
  it("falls back to rule-only when AI fails", async () => {
    const r = await checkAbuseRisk(baseCtx, {}, {
      rules: defaultRuleEngine, ai: failingAi, limiter: new InMemoryRateLimiter(),
      reputation: defaultReputationStore, audit: defaultAuditSink,
    });
    expect(r.decision.modelVersion).toBeNull();
    expect(r.decision.breakdown.mlScore).toBeNull();
  });

  it("incorporates ml score when AI succeeds", async () => {
    const r = await checkAbuseRisk(baseCtx, {}, {
      rules: defaultRuleEngine, ai: okAi, limiter: new InMemoryRateLimiter(),
      reputation: defaultReputationStore, audit: defaultAuditSink,
    });
    expect(r.decision.modelVersion).toBe("test");
    expect(r.decision.breakdown.mlScore).toBe(0.9);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { auditDecision, defaultAuditSink, setAuditSinks, type AuditSink } from "@/lib/abuse/audit";
import type { RiskDecision } from "@/lib/abuse/types";

function fakeDecision(): RiskDecision {
  return {
    action: "create_post",
    subject: { userId: 9, ipHash: "ih", sessionId: "s", deviceHash: "dh" },
    score: 0.42,
    level: "MONITOR",
    decision: "MONITOR",
    reasons: [{ code: "demo", weight: 0.5 }],
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
  };
}

afterEach(() => {
  // restore default sink so cross-file tests are not affected
  (globalThis as unknown as { abuseAuditSink?: AuditSink }).abuseAuditSink = defaultAuditSink;
});

describe("abuse/audit", () => {
  it("default sink stays silent in NODE_ENV=test", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await defaultAuditSink.write({
      kind: "risk_decision",
      at: new Date().toISOString(),
      payload: {},
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("setAuditSinks fans out via composite and tolerates failures", async () => {
    const ok: AuditSink = { write: vi.fn(async () => {}) };
    const failing: AuditSink = {
      write: vi.fn(async () => {
        throw new Error("boom");
      }),
    };
    setAuditSinks([ok, failing]);

    await auditDecision(fakeDecision(), { extra: "v" });

    expect(ok.write).toHaveBeenCalledTimes(1);
    expect(failing.write).toHaveBeenCalledTimes(1);
    const event = (ok.write as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(event.kind).toBe("risk_decision");
    expect(event.payload.action).toBe("create_post");
    expect(event.payload.extra).toBe("v");
    expect((event.payload.reasons as string[])[0]).toBe("demo");
  });
});

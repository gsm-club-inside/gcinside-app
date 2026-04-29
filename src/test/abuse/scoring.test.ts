import { describe, expect, it } from "vitest";
import { buildDecision, combineScore, buildBreakdown } from "@/lib/abuse/scoring/score";
import { decisionForScore } from "@/lib/abuse/config";
import type { RiskContext, RiskSignal } from "@/lib/abuse/types";

const ctx: RiskContext = {
  action: "vote",
  subject: { userId: 1 },
  recentRequestCount1m: 5,
  recentRequestCount10m: 10,
  accountAgeMinutes: 100_000,
  reputationScore: 0.5,
  telemetry: { keydownCount: 10, pasteUsed: false, submitElapsedMs: 4000, pointerMoveCount: 20 },
};

describe("scoring", () => {
  it("returns ALLOW for empty signals & clean ctx", () => {
    const d = buildDecision({ ctx, signals: [], mlScore: null });
    expect(d.score).toBeLessThan(0.3);
    expect(d.level).toBe("ALLOW");
  });

  it("returns higher score with strong signals", () => {
    const signals: RiskSignal[] = [
      { ruleId: "x", reason: { code: "burst_requests_60", weight: 1.0 } },
      { ruleId: "y", reason: { code: "submit_under_300ms", weight: 0.9 } },
    ];
    const d = buildDecision({
      ctx: {
        ...ctx,
        recentRequestCount1m: 70,
        telemetry: { submitElapsedMs: 80, keydownCount: 0 },
      },
      signals,
      mlScore: 0.9,
      modelVersion: "test",
    });
    expect(d.score).toBeGreaterThan(0.4);
    expect(["MONITOR", "CHALLENGE", "RATE_LIMIT", "TEMP_BLOCK", "MANUAL_REVIEW"]).toContain(
      d.level
    );
  });

  it("threshold mapping is monotonic", () => {
    expect(decisionForScore(0.0)).toBe("ALLOW");
    expect(decisionForScore(0.4)).toBe("MONITOR");
    expect(decisionForScore(0.6)).toBe("CHALLENGE");
    expect(decisionForScore(0.8)).toBe("RATE_LIMIT");
  });

  it("breakdown weights add up sensibly", () => {
    const b = buildBreakdown({ ctx, signals: [], mlScore: 0.5 });
    expect(combineScore(b)).toBeGreaterThanOrEqual(0);
    expect(combineScore(b)).toBeLessThanOrEqual(1);
  });

  it("promotes impossible enrollment automation to an enforced level", () => {
    const signals: RiskSignal[] = [
      { ruleId: "too_fast_submit", reason: { code: "submit_under_300ms", weight: 1.0 } },
      { ruleId: "no_telemetry_submit", reason: { code: "telemetry_empty", weight: 0.7 } },
    ];
    const d = buildDecision({
      ctx: {
        ...ctx,
        action: "vote",
        telemetry: { submitElapsedMs: 120, keydownCount: 0, pointerMoveCount: 0 },
      },
      signals,
      mlScore: null,
    });

    expect(d.score).toBeGreaterThanOrEqual(0.9);
    expect(d.level).toBe("RATE_LIMIT");
  });

  it("promotes automation user-agents without telemetry", () => {
    const signals: RiskSignal[] = [
      { ruleId: "automation_user_agent", reason: { code: "ua_match_curl", weight: 1.0 } },
      { ruleId: "no_telemetry_submit", reason: { code: "telemetry_absent", weight: 0.5 } },
    ];
    const d = buildDecision({
      ctx: { ...ctx, telemetry: undefined, userAgent: "curl/8.0" },
      signals,
      mlScore: null,
    });

    expect(d.score).toBeGreaterThanOrEqual(0.9);
    expect(d.level).toBe("RATE_LIMIT");
  });
});

import { describe, expect, it } from "vitest";
import { buildBreakdown, buildDecision, combineScore } from "@/lib/abuse/scoring/score";
import type { RiskContext, RiskSignal } from "@/lib/abuse/types";

const ctx: RiskContext = {
  action: "create_post",
  subject: { userId: 1 },
  recentRequestCount1m: 0,
  recentRequestCount10m: 0,
  accountAgeMinutes: 100,
  reputationScore: 0.5,
  telemetry: { keydownCount: 5, pasteUsed: false, submitElapsedMs: 3000, pointerMoveCount: 5 },
};

describe("scoring branch coverage", () => {
  it("behaviorScore returns 0.4 when telemetry is undefined", () => {
    const b = buildBreakdown({
      ctx: { ...ctx, telemetry: undefined },
      signals: [],
      mlScore: null,
    });
    expect(b.behaviorScore).toBeCloseTo(0.4);
  });

  it("behaviorScore counts paste-only and zero-interaction patterns", () => {
    const b = buildBreakdown({
      ctx: {
        ...ctx,
        telemetry: {
          submitElapsedMs: 200,
          pasteUsed: true,
          keydownCount: 0,
          pointerMoveCount: 0,
          typingIntervalVariance: 0.001,
        },
      },
      signals: [],
      mlScore: null,
    });
    expect(b.behaviorScore).toBe(1);
  });

  it("velocityScore is driven by 1m or 10m, whichever is higher", () => {
    const b1 = buildBreakdown({
      ctx: { ...ctx, recentRequestCount1m: 60 },
      signals: [],
      mlScore: null,
    });
    expect(b1.velocityScore).toBe(1);
    const b10 = buildBreakdown({
      ctx: { ...ctx, recentRequestCount1m: 0, recentRequestCount10m: 200 },
      signals: [],
      mlScore: null,
    });
    expect(b10.velocityScore).toBeCloseTo(0.7, 5);
  });

  it("reputationScore inverts the supplied reputation, defaults to 0 when missing", () => {
    expect(
      buildBreakdown({ ctx: { ...ctx, reputationScore: 0.2 }, signals: [], mlScore: null })
        .reputationScore
    ).toBeCloseTo(0.8);
    expect(
      buildBreakdown({ ctx: { ...ctx, reputationScore: undefined }, signals: [], mlScore: null })
        .reputationScore
    ).toBe(0);
  });

  it("contentSimilarityScore caps at 1 once 5 matches are seen", () => {
    expect(
      buildBreakdown({ ctx: { ...ctx, contentSimilarityCount: 0 }, signals: [], mlScore: null })
        .contentSimilarityScore
    ).toBe(0);
    expect(
      buildBreakdown({ ctx: { ...ctx, contentSimilarityCount: 10 }, signals: [], mlScore: null })
        .contentSimilarityScore
    ).toBe(1);
  });

  it("combineScore drops the ml term when mlScore is null", () => {
    const b = buildBreakdown({ ctx, signals: [], mlScore: null });
    const total = combineScore(b);
    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBeLessThanOrEqual(1);
  });

  it("combineScore returns 0 when given an all-zero, all-null breakdown", () => {
    const total = combineScore({
      ruleScore: 0,
      behaviorScore: 0,
      velocityScore: 0,
      reputationScore: 0,
      contentSimilarityScore: 0,
      mlScore: null,
    });
    expect(total).toBe(0);
  });

  it("buildDecision maps challenge type per action", () => {
    const signals: RiskSignal[] = [
      { ruleId: "x", reason: { code: "burst_requests_30", weight: 0.7 } },
      { ruleId: "y", reason: { code: "ua_match_curl", weight: 0.7 } },
    ];
    const post = buildDecision({
      ctx: { ...ctx, action: "create_post", recentRequestCount1m: 30, userAgent: "curl" },
      signals,
      mlScore: 0.7,
    });
    if (post.level === "CHALLENGE") expect(post.challenge).toBe("captcha");
    const signIn = buildDecision({
      ctx: { ...ctx, action: "sign_in", recentRequestCount1m: 30, userAgent: "curl" },
      signals,
      mlScore: 0.7,
    });
    if (signIn.level === "CHALLENGE") expect(signIn.challenge).toBe("re_auth");
  });

  it("aggregates duplicate reasons by max weight", () => {
    const signals: RiskSignal[] = [
      { ruleId: "a", reason: { code: "x", weight: 0.3 } },
      { ruleId: "b", reason: { code: "x", weight: 0.7 } },
      { ruleId: "c", reason: { code: "y", weight: 0.5 } },
    ];
    const d = buildDecision({ ctx, signals, mlScore: null });
    const codes = d.reasons.map((r) => r.code);
    expect(codes).toEqual(["x", "y"]);
    expect(d.reasons[0]!.weight).toBe(0.7);
  });

  it("vote action with fast submit + missing telemetry promotes to ≥0.8", () => {
    const signals: RiskSignal[] = [
      { ruleId: "too_fast_submit", reason: { code: "submit_under_800ms", weight: 0.5 } },
      { ruleId: "no_telemetry_submit", reason: { code: "telemetry_absent", weight: 0.5 } },
    ];
    const d = buildDecision({
      ctx: { ...ctx, action: "vote", telemetry: undefined, userAgent: "Mozilla" },
      signals,
      mlScore: null,
    });
    expect(d.score).toBeGreaterThanOrEqual(0.8);
  });
});

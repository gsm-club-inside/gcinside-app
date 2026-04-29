import { describe, expect, it } from "vitest";
import { defaultRuleEngine, RuleEngine } from "@/lib/abuse/rules/engine";
import {
  duplicateContentRule,
  newAccountVolumeRule,
  sameSubjectRepetitionRule,
  tooFastSubmitRule,
  voteRepetitionRule,
} from "@/lib/abuse/rules/builtins";
import type { AbuseRule } from "@/lib/abuse/rules/types";
import type { RiskContext } from "@/lib/abuse/types";

const baseCtx: RiskContext = {
  action: "create_post",
  subject: { userId: 1 },
  recentRequestCount1m: 0,
  recentRequestCount10m: 0,
  accountAgeMinutes: 60_000,
  reputationScore: 0.5,
  telemetry: { keydownCount: 20, pasteUsed: false, submitElapsedMs: 5000, pointerMoveCount: 30 },
  userAgent: "Mozilla/5.0",
};

describe("builtin rule branches", () => {
  it("emits young_account_volume when age<1day and req≥50", () => {
    const sigs = newAccountVolumeRule.evaluate({
      ...baseCtx,
      accountAgeMinutes: 600,
      recentRequestCount10m: 60,
    });
    expect((sigs as { reason: { code: string } }[])[0]?.reason.code).toBe("young_account_volume");
  });

  it("emits subject_repeat_1m at ≥20 requests/min", () => {
    const sigs = sameSubjectRepetitionRule.evaluate({ ...baseCtx, recentRequestCount1m: 25 });
    expect((sigs as { reason: { code: string } }[])[0]?.reason.code).toBe("subject_repeat_1m");
  });

  it("emits submit_under_800ms in 300..800 range", () => {
    const sigs = tooFastSubmitRule.evaluate({
      ...baseCtx,
      telemetry: { submitElapsedMs: 500, keydownCount: 5 },
    });
    expect((sigs as { reason: { code: string } }[])[0]?.reason.code).toBe("submit_under_800ms");
  });

  it("emits content_dup_2 in 2..4 similarity range", () => {
    const sigs = duplicateContentRule.evaluate({ ...baseCtx, contentSimilarityCount: 3 });
    expect((sigs as { reason: { code: string } }[])[0]?.reason.code).toBe("content_dup_2");
  });

  it("emits vote_burst when action=vote and rapid", () => {
    const sigs = voteRepetitionRule.evaluate({
      ...baseCtx,
      action: "vote",
      recentRequestCount1m: 35,
    });
    expect((sigs as { reason: { code: string } }[])[0]?.reason.code).toBe("vote_burst");
  });

  it("flags missing user-agent", async () => {
    const sigs = await defaultRuleEngine.evaluate({ ...baseCtx, userAgent: null });
    expect(sigs.find((s) => s.reason.code === "ua_missing")).toBeDefined();
  });
});

describe("RuleEngine", () => {
  it("skips disabled rules", async () => {
    const r: AbuseRule = {
      id: "x",
      name: "x",
      enabled: false,
      weight: 1,
      evaluate: () => [{ ruleId: "x", reason: { code: "x", weight: 1 } }],
    };
    const engine = new RuleEngine([r]);
    expect(await engine.evaluate(baseCtx)).toEqual([]);
    expect(engine.list()).toEqual([]);
  });

  it("swallows individual rule errors and continues", async () => {
    const bad: AbuseRule = {
      id: "bad",
      name: "bad",
      enabled: true,
      weight: 1,
      evaluate: () => {
        throw new Error("boom");
      },
    };
    const good: AbuseRule = {
      id: "good",
      name: "good",
      enabled: true,
      weight: 1,
      evaluate: () => [{ ruleId: "good", reason: { code: "good", weight: 0.5 } }],
    };
    const engine = new RuleEngine([bad, good]);
    const out = await engine.evaluate(baseCtx);
    expect(out).toHaveLength(1);
    expect(out[0]!.reason.weight).toBeCloseTo(0.5);
  });

  it("scales reason weight by rule weight", async () => {
    const r: AbuseRule = {
      id: "scale",
      name: "scale",
      enabled: true,
      weight: 0.5,
      evaluate: () => [{ ruleId: "scale", reason: { code: "scale", weight: 1 } }],
    };
    const engine = new RuleEngine([r]);
    const out = await engine.evaluate(baseCtx);
    expect(out[0]!.reason.weight).toBeCloseTo(0.5);
  });
});

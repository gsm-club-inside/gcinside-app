import { describe, expect, it } from "vitest";
import * as abuse from "@/lib/abuse";

describe("lib/abuse barrel", () => {
  it("re-exports the main entry points", () => {
    expect(typeof abuse.checkAbuseRisk).toBe("function");
    expect(typeof abuse.buildRiskContext).toBe("function");
    expect(typeof abuse.sanitizeTelemetry).toBe("function");
    expect(typeof abuse.checkContextRateLimits).toBe("function");
    expect(abuse.defaultRuleEngine).toBeDefined();
    expect(abuse.defaultReputationStore).toBeDefined();
    expect(abuse.defaultAuditSink).toBeDefined();
    expect(abuse.defaultAiInferenceClient).toBeDefined();
    expect(abuse.builtinRules.length).toBeGreaterThan(0);
  });
});

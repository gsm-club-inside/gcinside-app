import { describe, expect, it } from "vitest";
import { abuseConfig, decisionForScore } from "@/lib/abuse/config";

describe("abuse/config decisionForScore", () => {
  it("returns ALLOW under the allow threshold", () => {
    expect(decisionForScore(0)).toBe("ALLOW");
    expect(decisionForScore(0.29)).toBe("ALLOW");
  });

  it("returns MONITOR up to the monitor threshold", () => {
    expect(decisionForScore(0.3)).toBe("MONITOR");
    expect(decisionForScore(0.54)).toBe("MONITOR");
  });

  it("returns CHALLENGE up to the challenge threshold", () => {
    expect(decisionForScore(0.55)).toBe("CHALLENGE");
    expect(decisionForScore(0.74)).toBe("CHALLENGE");
  });

  it("returns RATE_LIMIT or TEMP_BLOCK depending on enableHardBlock", () => {
    const original = abuseConfig.enableHardBlock;
    abuseConfig.enableHardBlock = false;
    expect(decisionForScore(0.92)).toBe("RATE_LIMIT");
    expect(decisionForScore(0.99)).toBe("RATE_LIMIT");
    abuseConfig.enableHardBlock = true;
    expect(decisionForScore(0.92)).toBe("TEMP_BLOCK");
    abuseConfig.enableHardBlock = original;
  });

  it("returns HARD_BLOCK or MANUAL_REVIEW at the cap", () => {
    const original = abuseConfig.enableHardBlock;
    abuseConfig.enableHardBlock = false;
    expect(decisionForScore(1)).toBe("MANUAL_REVIEW");
    abuseConfig.enableHardBlock = true;
    expect(decisionForScore(1)).toBe("HARD_BLOCK");
    abuseConfig.enableHardBlock = original;
  });

  it("exposes per-action rate-limit configuration", () => {
    expect(abuseConfig.rateLimit.perAction.sign_up).toEqual({ windowSec: 600, limit: 5 });
    expect(abuseConfig.rateLimit.perAction.create_post.limit).toBeGreaterThan(0);
  });
});

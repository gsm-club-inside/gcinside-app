import { describe, expect, it } from "vitest";
import { defaultRuleEngine } from "@/lib/abuse/rules/engine";
import type { RiskContext } from "@/lib/abuse/types";

const baseCtx: RiskContext = {
  action: "create_post",
  subject: { userId: 1, sessionId: "s", ipHash: "ih", deviceHash: "dh" },
  recentRequestCount1m: 0,
  recentRequestCount10m: 0,
  accountAgeMinutes: 60_000,
  reputationScore: 0.5,
  telemetry: { keydownCount: 20, pasteUsed: false, submitElapsedMs: 5000, pointerMoveCount: 30 },
  userAgent: "Mozilla/5.0",
};

describe("rule engine", () => {
  it("emits no signals on a clean context", async () => {
    const sigs = await defaultRuleEngine.evaluate(baseCtx);
    expect(sigs).toEqual([]);
  });

  it("flags burst requests at 60+/min", async () => {
    const sigs = await defaultRuleEngine.evaluate({ ...baseCtx, recentRequestCount1m: 70 });
    expect(sigs.find((s) => s.reason.code === "burst_requests_60")).toBeDefined();
  });

  it("flags too-fast submit and paste-only patterns", async () => {
    const sigs = await defaultRuleEngine.evaluate({
      ...baseCtx,
      telemetry: { keydownCount: 0, pasteUsed: true, submitElapsedMs: 100 },
    });
    expect(sigs.find((s) => s.reason.code === "submit_under_300ms")).toBeDefined();
    expect(sigs.find((s) => s.reason.code === "paste_no_typing")).toBeDefined();
  });

  it("flags automation user-agents", async () => {
    const sigs = await defaultRuleEngine.evaluate({ ...baseCtx, userAgent: "Mozilla python-requests/2.32" });
    expect(sigs.some((s) => s.reason.code.startsWith("ua_match_"))).toBe(true);
  });

  it("flags new accounts producing volume", async () => {
    const sigs = await defaultRuleEngine.evaluate({
      ...baseCtx,
      accountAgeMinutes: 10,
      recentRequestCount10m: 25,
    });
    expect(sigs.find((s) => s.reason.code === "new_account_burst")).toBeDefined();
  });
});

import { describe, expect, it } from "vitest";
import { buildRiskContext } from "@/lib/abuse/context";

describe("risk context", () => {
  it("preserves client telemetry and account age inputs", () => {
    const ctx = buildRiskContext({
      action: "vote",
      request: {
        headers: new Headers({
          "user-agent": "Mozilla/5.0",
          "x-forwarded-for": "203.0.113.10",
        }),
      },
      userId: 7,
      sessionId: "student@example.com",
      accountAgeMinutes: 123,
      telemetry: {
        submitElapsedMs: 2000,
        keydownCount: 3,
        pointerMoveCount: 12,
      },
      metadata: { clubId: 1 },
    });

    expect(ctx.accountAgeMinutes).toBe(123);
    expect(ctx.telemetry?.submitElapsedMs).toBe(2000);
    expect(ctx.telemetry?.pointerMoveCount).toBe(12);
    expect(ctx.metadata?.clubId).toBe(1);
  });
});

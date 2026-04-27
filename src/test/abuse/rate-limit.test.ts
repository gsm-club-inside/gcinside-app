import { describe, expect, it } from "vitest";
import { InMemoryRateLimiter, checkContextRateLimits } from "@/lib/abuse/rate-limit";
import type { RiskContext } from "@/lib/abuse/types";

const ctx: RiskContext = {
  action: "vote",
  subject: { userId: 1, ipHash: "ih", sessionId: "s", deviceHash: "dh" },
};

describe("rate-limit", () => {
  it("allows within limit and blocks beyond", async () => {
    const limiter = new InMemoryRateLimiter();
    let lastAllowed = true;
    for (let i = 0; i < 70; i++) {
      const r = await checkContextRateLimits(ctx, limiter);
      lastAllowed = r.allowed;
    }
    expect(lastAllowed).toBe(false);
  });

  it("respects manual block / unblock", async () => {
    const limiter = new InMemoryRateLimiter();
    await limiter.block({ scope: "user", action: "vote", identity: "1" }, 60);
    expect(await limiter.isBlocked({ scope: "user", action: "vote", identity: "1" })).toBe(true);
    await limiter.unblock({ scope: "user", action: "vote", identity: "1" });
    expect(await limiter.isBlocked({ scope: "user", action: "vote", identity: "1" })).toBe(false);
  });
});

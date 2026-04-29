import { afterEach, describe, expect, it, vi } from "vitest";
import { InMemoryRateLimiter } from "@/lib/abuse/rate-limit";
import type { RiskContext } from "@/lib/abuse/types";
import { checkContextRateLimits } from "@/lib/abuse/rate-limit";

afterEach(() => vi.useRealTimers());

const key = { scope: "user" as const, action: "vote", identity: "1" };

describe("rate-limit memory adapter", () => {
  it("resets the bucket after the window passes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const lim = new InMemoryRateLimiter();
    for (let i = 0; i < 5; i++) await lim.check(key, 5, 60);
    const blocked = await lim.check(key, 5, 60);
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(60_000 + 1);
    const refreshed = await lim.check(key, 5, 60);
    expect(refreshed.allowed).toBe(true);
    expect(refreshed.count).toBe(1);
  });

  it("expires manual blocks after their TTL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const lim = new InMemoryRateLimiter();
    await lim.block(key, 1);
    expect(await lim.isBlocked(key)).toBe(true);
    vi.advanceTimersByTime(1_001);
    expect(await lim.isBlocked(key)).toBe(false);
  });

  it("checkContextRateLimits returns allowed=true when no per-action config exists", async () => {
    const ctx: RiskContext = {
      action: "search",
      subject: { userId: 99, ipHash: null, sessionId: null, deviceHash: null },
    };
    // search has its own entry; force an unknown action by casting to any
    const r = await checkContextRateLimits(
      { ...ctx, action: "__unknown" as unknown as RiskContext["action"] },
      new InMemoryRateLimiter()
    );
    expect(r.allowed).toBe(true);
    expect(r.decisions).toEqual([]);
  });

  it("includes manual block as a denied decision in checkContextRateLimits", async () => {
    const lim = new InMemoryRateLimiter();
    await lim.block({ scope: "user", action: "vote", identity: "9" }, 60);
    const ctx: RiskContext = {
      action: "vote",
      subject: { userId: 9, ipHash: "ih", sessionId: "s", deviceHash: "dh" },
    };
    const r = await checkContextRateLimits(ctx, lim);
    expect(r.allowed).toBe(false);
    expect(r.decisions.find((d) => !d.allowed)).toBeDefined();
    expect(r.hardestScope?.allowed).toBe(false);
  });
});

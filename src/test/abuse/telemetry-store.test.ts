import { afterEach, describe, expect, it, vi } from "vitest";
import { putTelemetry, takeTelemetry } from "@/lib/abuse/telemetry/store";

afterEach(() => {
  vi.useRealTimers();
});

describe("abuse/telemetry/store", () => {
  it("returns undefined for unknown keys", () => {
    expect(takeTelemetry("nope-" + Math.random())).toBeUndefined();
  });

  it("put then take returns the stored telemetry once", () => {
    const key = "k-" + Math.random();
    putTelemetry(key, { keydownCount: 7 });
    expect(takeTelemetry(key)).toEqual({ keydownCount: 7 });
    expect(takeTelemetry(key)).toBeUndefined();
  });

  it("expires entries after TTL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const key = "k-ttl-" + Math.random();
    putTelemetry(key, { pasteUsed: true });
    vi.advanceTimersByTime(5 * 60_000 + 1);
    expect(takeTelemetry(key)).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { sanitizeTelemetry } from "@/lib/abuse/telemetry/sanitize";

describe("telemetry sanitizer", () => {
  it("drops non-numeric fields", () => {
    expect(sanitizeTelemetry({ keydownCount: "abc" }).keydownCount).toBeUndefined();
  });

  it("clamps absurdly large values", () => {
    const t = sanitizeTelemetry({ submitElapsedMs: 10 ** 12, pointerMoveCount: -5 });
    expect(t.submitElapsedMs).toBeLessThanOrEqual(24 * 60 * 60_000);
    expect(t.pointerMoveCount).toBe(0);
  });

  it("ignores extra unknown fields", () => {
    const t = sanitizeTelemetry({ pasteUsed: true, secret: "xxx" }) as Record<string, unknown>;
    expect(t.pasteUsed).toBe(true);
    expect(t.secret).toBeUndefined();
  });

  it("returns empty object on bad input", () => {
    expect(sanitizeTelemetry(null)).toEqual({});
    expect(sanitizeTelemetry(123)).toEqual({});
  });
});

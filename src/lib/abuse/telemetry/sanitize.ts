import type { ClientTelemetry } from "../types";

const num = (v: unknown, max = 1e9): number | undefined => {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  if (v < 0) return 0;
  if (v > max) return max;
  return v;
};
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);

export function sanitizeTelemetry(input: unknown): ClientTelemetry {
  if (typeof input !== "object" || input === null) return {};
  const i = input as Record<string, unknown>;
  return {
    typingIntervalAvg: num(i.typingIntervalAvg, 60_000),
    typingIntervalVariance: num(i.typingIntervalVariance, 1e6),
    keydownCount: num(i.keydownCount, 100_000),
    pasteUsed: bool(i.pasteUsed),
    focusCount: num(i.focusCount, 1000),
    blurCount: num(i.blurCount, 1000),
    pointerMoveCount: num(i.pointerMoveCount, 100_000),
    pointerDistance: num(i.pointerDistance, 1e9),
    scrollCount: num(i.scrollCount, 10_000),
    visibilityChangeCount: num(i.visibilityChangeCount, 1000),
    movementEntropy: num(i.movementEntropy, 100),
    submitElapsedMs: num(i.submitElapsedMs, 24 * 60 * 60_000),
  };
}

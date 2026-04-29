import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultAuditSink } from "@/lib/abuse/audit";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("ConsoleAuditSink in non-test environment", () => {
  it("logs the event to console.log when NODE_ENV is not 'test'", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await defaultAuditSink.write({
      kind: "block_applied",
      at: "2026-01-01T00:00:00Z",
      payload: { foo: "bar" },
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toContain("[audit] block_applied");
  });
});

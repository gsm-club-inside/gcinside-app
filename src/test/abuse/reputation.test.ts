import { describe, expect, it } from "vitest";
import { InMemoryReputationStore } from "@/lib/abuse/reputation";

describe("abuse/reputation InMemoryReputationStore", () => {
  it("returns 0.5 for unknown identities", async () => {
    const s = new InMemoryReputationStore();
    expect(await s.get("user", "1")).toBe(0.5);
    expect(await s.get("ip", "ih")).toBe(0.5);
  });

  it("adjust clamps within 0..1 and persists", async () => {
    const s = new InMemoryReputationStore();
    expect(await s.adjust("user", "1", -1)).toBe(0);
    expect(await s.get("user", "1")).toBe(0);
    expect(await s.adjust("user", "1", 5)).toBe(1);
    expect(await s.adjust("user", "1", -0.4)).toBeCloseTo(0.6, 5);
  });

  it("set clamps and reset removes", async () => {
    const s = new InMemoryReputationStore();
    await s.set("user", "2", 1.5);
    expect(await s.get("user", "2")).toBe(1);
    await s.set("user", "2", -0.2);
    expect(await s.get("user", "2")).toBe(0);
    await s.reset("user", "2");
    expect(await s.get("user", "2")).toBe(0.5);
  });

  it("allow/blocklist default to false", async () => {
    const s = new InMemoryReputationStore();
    expect(await s.isAllowlisted("user", "1")).toBe(false);
    expect(await s.isBlocklisted("ip", "x")).toBe(false);
    s.__seedAllow("user", "1");
    s.__seedBlock("ip", "x");
    expect(await s.isAllowlisted("user", "1")).toBe(true);
    expect(await s.isBlocklisted("ip", "x")).toBe(true);
  });
});

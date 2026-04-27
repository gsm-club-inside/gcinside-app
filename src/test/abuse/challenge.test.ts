import { describe, expect, it, vi } from "vitest";
import { getChallengeProvider } from "@/lib/abuse/challenge";

describe("challenge providers", () => {
  it("issues delay challenge with payload waitMs", async () => {
    vi.useFakeTimers();
    const p = getChallengeProvider("delay");
    const c = await p.issue({} as never);
    expect(c.type).toBe("delay");
    expect(c.payload?.waitMs).toBe(2000);
    expect(await p.verify(c.token, {})).toBe(false);
    vi.advanceTimersByTime(2_000);
    expect(await p.verify(c.token, {})).toBe(true);
    vi.useRealTimers();
  });

  it("re_auth verifies only when reAuthenticated=true", async () => {
    const p = getChallengeProvider("re_auth");
    const c = await p.issue({} as never);
    expect(await p.verify(c.token, {})).toBe(false);
    expect(await p.verify(c.token, { reAuthenticated: true })).toBe(true);
  });

  it("captcha verifies a matching math answer", async () => {
    const p = getChallengeProvider("captcha");
    const c = await p.issue({} as never);
    const question = String(c.payload?.question ?? "");
    const [a, b] = question.split(" + ").map(Number);
    expect(c.payload?.provider).toBe("math");
    expect(await p.verify(c.token, { answer: String(a + b) })).toBe(true);
  });

  it("admin_review never auto-verifies", async () => {
    const p = getChallengeProvider("admin_review");
    const c = await p.issue({} as never);
    expect(await p.verify(c.token, { ok: true })).toBe(false);
  });
});

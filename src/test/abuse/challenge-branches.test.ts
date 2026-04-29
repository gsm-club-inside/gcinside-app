import { afterEach, describe, expect, it, vi } from "vitest";
import { getChallengeProvider } from "@/lib/abuse/challenge";

afterEach(() => vi.useRealTimers());

describe("challenge branch coverage", () => {
  it("email_verification verifies only on emailVerified=true", async () => {
    const p = getChallengeProvider("email_verification");
    const c = await p.issue({} as never);
    expect(c.type).toBe("email_verification");
    expect(await p.verify(c.token, {})).toBe(false);
    expect(await p.verify(c.token, { emailVerified: true })).toBe(true);
  });

  it("captcha rejects on a wrong answer and on accidental token reuse", async () => {
    const p = getChallengeProvider("captcha");
    const c = await p.issue({} as never);
    expect(await p.verify(c.token, { answer: "0" })).toBe(false);
    // already taken: subsequent verify is false
    expect(await p.verify(c.token, { answer: "anything" })).toBe(false);
  });

  it("delay rejects unknown tokens and expired tokens", async () => {
    const p = getChallengeProvider("delay");
    expect(await p.verify("does-not-exist", {})).toBe(false);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const c = await p.issue({} as never);
    vi.advanceTimersByTime(31_000);
    expect(await p.verify(c.token, {})).toBe(false);
  });

  it("wrong-type token never verifies", async () => {
    const captcha = getChallengeProvider("captcha");
    const reAuth = getChallengeProvider("re_auth");
    const c = await captcha.issue({} as never);
    expect(await reAuth.verify(c.token, { reAuthenticated: true })).toBe(false);
  });

  it("admin_review issues a long-lived token but never auto-verifies", async () => {
    const p = getChallengeProvider("admin_review");
    const c = await p.issue({} as never);
    expect(c.type).toBe("admin_review");
    expect(c.expiresAt).toBeGreaterThan(Date.now() + 60_000);
    expect(await p.verify(c.token, { ok: true })).toBe(false);
  });
});

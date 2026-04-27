import { describe, expect, it } from "vitest";
import { getChallengeProvider } from "@/lib/abuse/challenge";

describe("challenge providers", () => {
  it("issues delay challenge with payload waitMs", async () => {
    const p = getChallengeProvider("delay");
    const c = await p.issue({} as never);
    expect(c.type).toBe("delay");
    expect(c.payload?.waitMs).toBe(1500);
    expect(await p.verify(c.token, {})).toBe(true);
  });

  it("re_auth verifies only when reAuthenticated=true", async () => {
    const p = getChallengeProvider("re_auth");
    const c = await p.issue({} as never);
    expect(await p.verify(c.token, {})).toBe(false);
    expect(await p.verify(c.token, { reAuthenticated: true })).toBe(true);
  });

  it("admin_review never auto-verifies", async () => {
    const p = getChallengeProvider("admin_review");
    const c = await p.issue({} as never);
    expect(await p.verify(c.token, { ok: true })).toBe(false);
  });
});

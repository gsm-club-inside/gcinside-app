import { describe, expect, it } from "vitest";
import {
  fingerprintFromHeaders,
  hashDevice,
  hashIdentity,
  hashIp,
  shortContentHash,
} from "@/lib/abuse/hash";

describe("abuse/hash", () => {
  it("returns null for null/undefined/empty", () => {
    expect(hashIdentity(null)).toBeNull();
    expect(hashIdentity(undefined)).toBeNull();
    expect(hashIdentity("")).toBeNull();
    expect(hashIp(null)).toBeNull();
    expect(hashDevice(undefined)).toBeNull();
  });

  it("hashIdentity is deterministic and salted", () => {
    const a = hashIdentity("203.0.113.10");
    const b = hashIdentity("203.0.113.10");
    expect(a).toEqual(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fingerprintFromHeaders combines UA, accept-language and sessionId", () => {
    const h = new Headers({ "user-agent": "Mozilla/5.0", "accept-language": "ko-KR" });
    expect(fingerprintFromHeaders(h, "sid-1")).toBe("Mozilla/5.0|ko-KR|sid-1");
    expect(fingerprintFromHeaders(new Headers())).toBe("||");
  });

  it("shortContentHash normalises whitespace + case", () => {
    const a = shortContentHash("  Hello   WORLD\n");
    const b = shortContentHash("hello world");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{16}$/);
    expect(shortContentHash(null)).toBeNull();
    expect(shortContentHash("")).toBeNull();
  });
});

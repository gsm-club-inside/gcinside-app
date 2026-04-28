import { describe, expect, it } from "vitest";
import { hasOAuthScope } from "@/lib/oauth";

describe("OAuth scope validation", () => {
  it("accepts the canonical self:read scope", () => {
    expect(hasOAuthScope("self:read", "self:read")).toBe(true);
  });

  it("accepts the DataGSM self read scope alias", () => {
    expect(hasOAuthScope("datagsm:self_read", "self:read")).toBe(true);
  });

  it("does not accept unrelated scopes", () => {
    expect(hasOAuthScope("datagsm:other_read", "self:read")).toBe(false);
  });
});

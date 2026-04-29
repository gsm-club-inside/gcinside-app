import { describe, expect, it } from "vitest";
import { parseClubPayload } from "@/lib/clubs/validation";

describe("clubs/validation parseClubPayload", () => {
  const valid = {
    name: "밴드부",
    description: "음악 동아리",
    grade1Capacity: 5,
    grade23Capacity: 10,
    isOpen: true,
  };

  it("returns parsed payload on valid input", () => {
    expect(parseClubPayload(valid)).toEqual(valid);
  });

  it("trims whitespace and defaults isOpen to true when missing", () => {
    const out = parseClubPayload({ ...valid, name: "  밴드부 ", isOpen: undefined });
    expect(out.name).toBe("밴드부");
    expect(out.isOpen).toBe(true);
  });

  it("coerces isOpen to boolean", () => {
    expect(parseClubPayload({ ...valid, isOpen: 0 }).isOpen).toBe(false);
    expect(parseClubPayload({ ...valid, isOpen: "yes" }).isOpen).toBe(true);
  });

  it("rejects non-object body", () => {
    expect(() => parseClubPayload(null)).toThrow(/올바르지/);
    expect(() => parseClubPayload(123)).toThrow(/올바르지/);
  });

  it("rejects empty name or description", () => {
    expect(() => parseClubPayload({ ...valid, name: "" })).toThrow(/입력/);
    expect(() => parseClubPayload({ ...valid, description: "   " })).toThrow(/입력/);
  });

  it("rejects negative or non-integer capacity", () => {
    expect(() => parseClubPayload({ ...valid, grade1Capacity: -1 })).toThrow(/정수/);
    expect(() => parseClubPayload({ ...valid, grade23Capacity: 1.5 })).toThrow(/정수/);
    expect(() => parseClubPayload({ ...valid, grade1Capacity: "abc" })).toThrow(/정수/);
  });
});

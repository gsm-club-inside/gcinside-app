import { describe, it, expect } from "vitest";

function kstInputToUtc(kstStr: string): string | null {
  if (!kstStr) return null;
  return new Date(kstStr + ":00+09:00").toISOString();
}

function utcToKstInput(utcStr: string | null): string {
  if (!utcStr) return "";
  const date = new Date(utcStr);
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16);
}

describe("KST 시간 변환", () => {
  it("KST 입력 → UTC 변환", () => {
    const result = kstInputToUtc("2026-03-12T09:00");
    expect(result).toBe("2026-03-12T00:00:00.000Z");
  });

  it("UTC → KST 입력 변환", () => {
    const result = utcToKstInput("2026-03-12T00:00:00.000Z");
    expect(result).toBe("2026-03-12T09:00");
  });

  it("빈 문자열 입력 시 null 반환 (kstInputToUtc)", () => {
    expect(kstInputToUtc("")).toBeNull();
  });

  it("null 입력 시 빈 문자열 반환 (utcToKstInput)", () => {
    expect(utcToKstInput(null)).toBe("");
  });

  it("KST↔UTC 왕복 변환 정확성", () => {
    const kst = "2026-06-01T18:30";
    const utc = kstInputToUtc(kst)!;
    expect(utcToKstInput(utc)).toBe(kst);
  });
});

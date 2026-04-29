import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    club: { findMany: vi.fn() },
    settings: { upsert: vi.fn() },
    enrollment: { findMany: vi.fn() },
  },
}));

import {
  TAGS,
  getCachedClubs,
  getCachedEnrollments,
  getCachedSettings,
  getCachedUserProfile,
} from "@/lib/queries";
import { prisma } from "@/lib/prisma";

beforeEach(() => vi.clearAllMocks());

describe("lib/queries TAGS", () => {
  it("exposes a stable set of cache tag names", () => {
    expect(Object.values(TAGS).sort()).toEqual([
      "club-requests",
      "clubs",
      "enrollments",
      "settings",
      "users",
    ]);
  });
});

describe("getCachedUserProfile", () => {
  it("calls prisma.user.findUnique with the userId", async () => {
    (prisma.user.findUnique as Mock).mockResolvedValue({ name: "Alice" });
    const u = await getCachedUserProfile(42);
    expect(u).toEqual({ name: "Alice" });
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 42 } })
    );
  });
});

describe("getCachedClubs", () => {
  it("aggregates enrollments by grade", async () => {
    (prisma.club.findMany as Mock).mockResolvedValue([
      {
        id: 1,
        name: "Music",
        enrollments: [{ user: { grade: 1 } }, { user: { grade: 2 } }, { user: { grade: 3 } }],
      },
    ]);
    const [club] = await getCachedClubs();
    expect(club._count.enrollments).toBe(3);
    expect(club.gradeEnrollments).toEqual({ grade1: 1, grade23: 2 });
    expect(club).not.toHaveProperty("enrollments");
  });
});

describe("getCachedSettings", () => {
  it("upserts settings row with id=1", async () => {
    (prisma.settings.upsert as Mock).mockResolvedValue({ id: 1 });
    await getCachedSettings();
    expect(prisma.settings.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
  });
});

describe("getCachedEnrollments", () => {
  it("queries enrollments scoped to userId", async () => {
    (prisma.enrollment.findMany as Mock).mockResolvedValue([{ id: 7 }]);
    const out = await getCachedEnrollments(11);
    expect(out).toEqual([{ id: 7 }]);
    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 11 } })
    );
  });
});

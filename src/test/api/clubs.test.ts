import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

import { GET, POST } from "@/app/api/clubs/route";
import { GET as GET_ONE, PATCH, DELETE } from "@/app/api/clubs/[id]/route";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const adminSession = { role: "ADMIN", userId: 1 };
const studentSession = { role: "STUDENT", userId: 2 };

const mockClub = {
  id: 1,
  name: "밴드부",
  description: "음악 동아리",
  grade1Capacity: 5,
  grade23Capacity: 10,
  isOpen: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/clubs", () => {
  it("빈 배열 반환", async () => {
    (prisma.club.findMany as Mock).mockResolvedValue([]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });

  it("학년별 신청 수 올바르게 집계", async () => {
    const rawClub = {
      ...mockClub,
      enrollments: [
        { user: { grade: 1 } },
        { user: { grade: 1 } },
        { user: { grade: 2 } },
        { user: { grade: 3 } },
      ],
    };
    (prisma.club.findMany as Mock).mockResolvedValue([rawClub]);

    const res = await GET();
    const [club] = await res.json();

    expect(club._count.enrollments).toBe(4);
    expect(club.gradeEnrollments.grade1).toBe(2);
    expect(club.gradeEnrollments.grade23).toBe(2);
  });

  it("enrollments 필드는 응답에 포함되지 않음", async () => {
    (prisma.club.findMany as Mock).mockResolvedValue([{ ...mockClub, enrollments: [] }]);

    const res = await GET();
    const [club] = await res.json();

    expect(club).not.toHaveProperty("enrollments");
  });
});

// ──────────────────────────────────────
// POST /api/clubs
// ──────────────────────────────────────
describe("POST /api/clubs", () => {
  it("직접 생성 요청 → 405", async () => {
    (getSession as Mock).mockResolvedValue(studentSession);

    const req = new NextRequest("http://localhost/api/clubs", {
      method: "POST",
      body: JSON.stringify({ name: "테스트", description: "설명" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    const body = await res.json();

    expect(res.status).toBe(405);
    expect(body.error).toContain("생성 요청 승인");
    expect(prisma.club.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/clubs/[id]", () => {
  it("존재하지 않는 동아리 → 404", async () => {
    (prisma.club.findUnique as Mock).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/clubs/999");
    const res = await GET_ONE(req, { params: Promise.resolve({ id: "999" }) });

    expect(res.status).toBe(404);
  });

  it("동아리 반환", async () => {
    (prisma.club.findUnique as Mock).mockResolvedValue({
      ...mockClub,
      _count: { enrollments: 3 },
    });

    const req = new NextRequest("http://localhost/api/clubs/1");
    const res = await GET_ONE(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe(1);
    expect(body._count.enrollments).toBe(3);
  });
});

describe("PATCH /api/clubs/[id]", () => {
  it("비어드민 → 403", async () => {
    (getSession as Mock).mockResolvedValue(studentSession);

    const req = new NextRequest("http://localhost/api/clubs/1", {
      method: "PATCH",
      body: JSON.stringify({ name: "수정명" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });

    expect(res.status).toBe(403);
  });

  it("어드민 → 수정 성공", async () => {
    (getSession as Mock).mockResolvedValue(adminSession);
    const updated = { ...mockClub, name: "수정된 밴드부" };
    (prisma.club.update as Mock).mockResolvedValue(updated);

    const req = new NextRequest("http://localhost/api/clubs/1", {
      method: "PATCH",
      body: JSON.stringify({ name: "수정된 밴드부" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.name).toBe("수정된 밴드부");
  });

  it("isOpen 필드 업데이트", async () => {
    (getSession as Mock).mockResolvedValue(adminSession);
    (prisma.club.update as Mock).mockResolvedValue({ ...mockClub, isOpen: false });

    const req = new NextRequest("http://localhost/api/clubs/1", {
      method: "PATCH",
      body: JSON.stringify({ isOpen: false }),
      headers: { "Content-Type": "application/json" },
    });
    await PATCH(req, { params: Promise.resolve({ id: "1" }) });

    expect(prisma.club.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isOpen: false }) })
    );
  });
});

describe("DELETE /api/clubs/[id]", () => {
  it("비어드민 → 403", async () => {
    (getSession as Mock).mockResolvedValue(studentSession);

    const req = new NextRequest("http://localhost/api/clubs/1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });

    expect(res.status).toBe(403);
  });

  it("어드민 → 삭제 성공", async () => {
    (getSession as Mock).mockResolvedValue(adminSession);
    (prisma.club.delete as Mock).mockResolvedValue(mockClub);

    const req = new NextRequest("http://localhost/api/clubs/1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(prisma.club.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    clubCreationRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    club: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) =>
      callback({
        clubCreationRequest: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        club: {
          create: vi.fn(),
        },
      })
    ),
  },
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

import { GET, POST } from "@/app/api/club-requests/route";
import { GET as ADMIN_GET } from "@/app/api/admin/club-requests/route";
import { PATCH } from "@/app/api/admin/club-requests/[id]/route";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const adminSession = { role: "ADMIN", userId: 1 };
const studentSession = { role: "STUDENT", userId: 2 };

const mockRequest = {
  id: 1,
  requesterId: 2,
  reviewerId: null,
  clubId: null,
  name: "영상제작부",
  description: "영상 제작",
  grade1Capacity: 4,
  grade23Capacity: 8,
  isOpen: true,
  status: "PENDING",
  rejectionReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  reviewedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/club-requests", () => {
  it("비로그인 → 401", async () => {
    (getSession as Mock).mockResolvedValue({});

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("내 생성 요청 목록 반환", async () => {
    (getSession as Mock).mockResolvedValue(studentSession);
    (prisma.clubCreationRequest.findMany as Mock).mockResolvedValue([mockRequest]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body[0].name).toBe("영상제작부");
    expect(prisma.clubCreationRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { requesterId: 2 } })
    );
  });
});

describe("POST /api/club-requests", () => {
  it("정상 생성 → 201", async () => {
    (getSession as Mock).mockResolvedValue(studentSession);
    (prisma.clubCreationRequest.create as Mock).mockResolvedValue(mockRequest);

    const req = new NextRequest("http://localhost/api/club-requests", {
      method: "POST",
      body: JSON.stringify({
        name: "영상제작부",
        description: "영상 제작",
        grade1Capacity: 4,
        grade23Capacity: 8,
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(prisma.clubCreationRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requesterId: 2, name: "영상제작부" }),
      })
    );
  });
});

describe("GET /api/admin/club-requests", () => {
  it("비어드민 → 403", async () => {
    (getSession as Mock).mockResolvedValue(studentSession);

    const res = await ADMIN_GET();

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/club-requests/[id]", () => {
  it("거절 사유 누락 → 400", async () => {
    (getSession as Mock).mockResolvedValue(adminSession);

    const req = new NextRequest("http://localhost/api/admin/club-requests/1", {
      method: "PATCH",
      body: JSON.stringify({ action: "reject" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });

    expect(res.status).toBe(400);
  });

  it("거절 성공 → 사유 저장", async () => {
    (getSession as Mock).mockResolvedValue(adminSession);
    (prisma.clubCreationRequest.findUnique as Mock).mockResolvedValue(mockRequest);
    (prisma.clubCreationRequest.update as Mock).mockResolvedValue({
      ...mockRequest,
      status: "REJECTED",
      rejectionReason: "활동 계획이 부족합니다.",
    });

    const req = new NextRequest("http://localhost/api/admin/club-requests/1", {
      method: "PATCH",
      body: JSON.stringify({ action: "reject", rejectionReason: "활동 계획이 부족합니다." }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("REJECTED");
    expect(prisma.clubCreationRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ rejectionReason: "활동 계획이 부족합니다." }),
      })
    );
  });

  it("승인 성공 → 실제 동아리 생성", async () => {
    (getSession as Mock).mockResolvedValue(adminSession);
    (prisma.$transaction as Mock).mockImplementation((callback) =>
      callback({
        clubCreationRequest: prisma.clubCreationRequest,
        club: prisma.club,
      })
    );
    (prisma.clubCreationRequest.findUnique as Mock).mockResolvedValue(mockRequest);
    (prisma.club.create as Mock).mockResolvedValue({ id: 7, name: "영상제작부" });
    (prisma.clubCreationRequest.update as Mock).mockResolvedValue({
      ...mockRequest,
      status: "APPROVED",
      clubId: 7,
    });

    const req = new NextRequest("http://localhost/api/admin/club-requests/1", {
      method: "PATCH",
      body: JSON.stringify({ action: "approve" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("APPROVED");
    expect(prisma.club.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "영상제작부", grade23Capacity: 8 }),
      })
    );
    expect(prisma.clubCreationRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clubId: 7, status: "APPROVED" }),
      })
    );
  });
});

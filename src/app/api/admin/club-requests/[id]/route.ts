import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TAGS } from "@/lib/queries";

const includeRequest = {
  requester: {
    select: {
      id: true,
      name: true,
      studentNumber: true,
      grade: true,
      classNum: true,
      number: true,
    },
  },
  reviewer: { select: { id: true, name: true } },
  club: { select: { id: true, name: true } },
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.role !== "ADMIN" || !session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  const body = await req.json();
  const action = String(body.action ?? "");

  try {
    if (action === "approve") {
      const updated = await prisma.$transaction(async (tx) => {
        const request = await tx.clubCreationRequest.findUnique({ where: { id: requestId } });
        if (!request) throw new Error("NOT_FOUND");
        if (request.status !== "PENDING") throw new Error("ALREADY_REVIEWED");

        const club = await tx.club.create({
          data: {
            name: request.name,
            description: request.description,
            grade1Capacity: request.grade1Capacity,
            grade23Capacity: request.grade23Capacity,
            isOpen: request.isOpen,
          },
        });

        return tx.clubCreationRequest.update({
          where: { id: requestId },
          data: {
            status: "APPROVED",
            reviewerId: session.userId,
            reviewedAt: new Date(),
            clubId: club.id,
            rejectionReason: null,
          },
          include: includeRequest,
        });
      });

      revalidateTag(TAGS.clubs, {});
      revalidateTag(TAGS.clubRequests, {});
      return NextResponse.json(updated);
    }

    if (action === "reject") {
      const rejectionReason = String(body.rejectionReason ?? "").trim();
      if (!rejectionReason) {
        return NextResponse.json({ error: "거절 사유를 입력해주세요." }, { status: 400 });
      }

      const current = await prisma.clubCreationRequest.findUnique({ where: { id: requestId } });
      if (!current)
        return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
      if (current.status !== "PENDING") {
        return NextResponse.json({ error: "이미 처리된 요청입니다." }, { status: 409 });
      }

      const updated = await prisma.clubCreationRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewerId: session.userId,
          reviewedAt: new Date(),
          rejectionReason,
        },
        include: includeRequest,
      });

      revalidateTag(TAGS.clubRequests, {});
      return NextResponse.json(updated);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "ALREADY_REVIEWED") {
      return NextResponse.json({ error: "이미 처리된 요청입니다." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ error: "지원하지 않는 처리 방식입니다." }, { status: 400 });
}

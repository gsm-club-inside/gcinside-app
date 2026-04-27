import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TAGS } from "@/lib/queries";

// 신청 시간 수정 (어드민 전용)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { enrolledAt } = await req.json();

  if (!enrolledAt) {
    return NextResponse.json({ error: "enrolledAt is required" }, { status: 400 });
  }

  const enrollment = await prisma.enrollment.update({
    where: { id: Number(id) },
    data: { enrolledAt: new Date(enrolledAt) },
    include: { user: true, club: true },
  });

  return NextResponse.json(enrollment);
}

// 신청 취소
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: Number(id) },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 본인 신청이거나 어드민만 삭제 가능
  if (enrollment.userId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.enrollment.delete({ where: { id: Number(id) } });
  revalidateTag(TAGS.enrollments, {});
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TAGS } from "@/lib/queries";

// 동아리 단건 조회
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const club = await prisma.club.findUnique({
    where: { id: Number(id) },
    include: {
      _count: { select: { enrollments: true } },
    },
  });

  if (!club) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(club);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  if (
    (body.grade1Capacity !== undefined && Number(body.grade1Capacity) < 0) ||
    (body.grade23Capacity !== undefined && Number(body.grade23Capacity) < 0)
  ) {
    return NextResponse.json({ error: "정원은 0 이상의 정수로 입력해주세요." }, { status: 400 });
  }

  const club = await prisma.club.update({
    where: { id: Number(id) },
    data: {
      ...(body.name !== undefined && { name: String(body.name).trim() }),
      ...(body.description !== undefined && { description: String(body.description).trim() }),
      ...(body.grade1Capacity !== undefined && { grade1Capacity: Number(body.grade1Capacity) }),
      ...(body.grade23Capacity !== undefined && {
        grade23Capacity: Number(body.grade23Capacity),
      }),
      ...(body.isOpen !== undefined && { isOpen: Boolean(body.isOpen) }),
    },
  });

  revalidateTag(TAGS.clubs, {});
  return NextResponse.json(club);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.club.delete({ where: { id: Number(id) } });

  revalidateTag(TAGS.clubs, {});
  return NextResponse.json({ ok: true });
}

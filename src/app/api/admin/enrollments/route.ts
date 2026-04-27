import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TAGS } from "@/lib/queries";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, clubId } = await req.json();
  if (!userId || !clubId) {
    return NextResponse.json({ error: "userId and clubId are required" }, { status: 400 });
  }

  const [user, club] = await Promise.all([
    prisma.user.findUnique({ where: { id: Number(userId) }, select: { id: true, name: true } }),
    prisma.club.findUnique({ where: { id: Number(clubId) }, select: { id: true, name: true } }),
  ]);

  if (!user) return NextResponse.json({ error: "유저를 찾을 수 없습니다." }, { status: 404 });
  if (!club) return NextResponse.json({ error: "동아리를 찾을 수 없습니다." }, { status: 404 });

  try {
    const enrollment = await prisma.enrollment.create({
      data: { userId: Number(userId), clubId: Number(clubId) },
    });
    revalidateTag(TAGS.enrollments, {});
    return NextResponse.json(enrollment, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "이미 신청된 유저입니다." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clubId = searchParams.get("clubId");

  const enrollments = await prisma.enrollment.findMany({
    where: clubId ? { clubId: Number(clubId) } : undefined,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          studentNumber: true,
          grade: true,
          classNum: true,
          number: true,
          major: true,
        },
      },
      club: { select: { id: true, name: true } },
    },
    orderBy: { enrolledAt: "asc" },
  });

  return NextResponse.json(enrollments);
}

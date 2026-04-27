import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clubs = await prisma.club.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      enrollments: {
        select: { user: { select: { grade: true } } },
      },
    },
  });

  return NextResponse.json(
    clubs.map(({ enrollments, ...club }) => ({
      ...club,
      _count: { enrollments: enrollments.length },
      gradeEnrollments: {
        grade1: enrollments.filter((e) => e.user.grade === 1).length,
        grade23: enrollments.filter((e) => e.user.grade === 2 || e.user.grade === 3).length,
      },
    })),
    { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30" } }
  );
}

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "동아리 생성은 생성 요청 승인 절차를 통해서만 가능합니다." },
    { status: 405 }
  );
}

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TAGS, getCachedSettings } from "@/lib/queries";
import { buildRiskContext, checkAbuseRisk, abuseConfig } from "@/lib/abuse";

const enrollRateLimit = new Map<number, number>();
const RATE_LIMIT_MS = 5_000;

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.userId },
    include: { club: true },
    orderBy: { enrolledAt: "asc" },
  });

  return NextResponse.json(enrollments);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = await req.json();
  if (!clubId) {
    return NextResponse.json({ error: "clubId is required" }, { status: 400 });
  }

  const now = Date.now();
  const lastAttempt = enrollRateLimit.get(session.userId);
  if (lastAttempt && now - lastAttempt < RATE_LIMIT_MS) {
    return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429 });
  }
  enrollRateLimit.set(session.userId, now);

  try {
    const riskCtx = buildRiskContext({
      action: "vote",
      request: req,
      userId: session.userId,
      sessionId: session.email ?? null,
      metadata: { clubId },
    });
    const risk = await checkAbuseRisk(riskCtx);
    if (risk.enforced) {
      return NextResponse.json(
        { error: "abuse_protection", level: risk.decision.level, reasons: risk.decision.reasons.map((r) => r.code) },
        { status: 429 }
      );
    }
    if (risk.challenge && abuseConfig.enableHardBlock) {
      return NextResponse.json(
        { error: "challenge_required", challenge: risk.challenge.type },
        { status: 428 }
      );
    }
  } catch (err) {
    if (!abuseConfig.failOpen) {
      return NextResponse.json({ error: "abuse_check_failed" }, { status: 500 });
    }
    console.warn("[abuse] fail-open:", err instanceof Error ? err.message : err);
  }

  try {
    const grade = session.grade;
    if (!grade) throw new Error("GRADE_REQUIRED");

    const [club, settings] = await Promise.all([
      prisma.club.findUnique({
        where: { id: Number(clubId) },
        select: { id: true, grade1Capacity: true, grade23Capacity: true, isOpen: true },
      }),
      getCachedSettings(),
    ]);

    if (!club) throw new Error("CLUB_NOT_FOUND");

    const now = new Date();
    if (!club.isOpen && settings?.openAt && now < settings.openAt) throw new Error("NOT_OPEN_YET");

    const gradeCapacity = grade === 1 ? club.grade1Capacity : club.grade23Capacity;
    if (gradeCapacity === 0) throw new Error("GRADE_NOT_ALLOWED");

    const enrollment = await prisma.$transaction(
      async (tx) => {
        const gradeCount = await tx.enrollment.count({
          where: {
            clubId: Number(clubId),
            user: grade === 1 ? { grade: 1 } : { grade: { in: [2, 3] } },
          },
        });

        if (gradeCount >= gradeCapacity) throw new Error("GRADE_FULL");

        return tx.enrollment.create({
          data: { userId: session.userId!, clubId: Number(clubId) },
          include: { club: true },
        });
      },
      { isolationLevel: "Serializable" }
    );

    revalidateTag(TAGS.enrollments, {});
    return NextResponse.json(enrollment, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNKNOWN";

    if (message === "CLUB_NOT_FOUND")
      return NextResponse.json({ error: "동아리를 찾을 수 없습니다." }, { status: 404 });
    if (message === "NOT_OPEN_YET")
      return NextResponse.json({ error: "아직 신청 시간이 아닙니다." }, { status: 409 });
    if (message === "GRADE_REQUIRED")
      return NextResponse.json(
        { error: "학년 정보가 없습니다. 프로필을 먼저 설정해주세요." },
        { status: 400 }
      );
    if (message === "GRADE_NOT_ALLOWED")
      return NextResponse.json(
        { error: "해당 학년은 신청할 수 없는 동아리입니다." },
        { status: 409 }
      );
    if (message === "GRADE_FULL")
      return NextResponse.json({ error: "해당 학년 정원이 마감되었습니다." }, { status: 409 });
    if (message.includes("Unique constraint"))
      return NextResponse.json({ error: "이미 신청한 동아리입니다." }, { status: 409 });

    console.error(err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

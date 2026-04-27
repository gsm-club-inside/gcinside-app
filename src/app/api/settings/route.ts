import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TAGS } from "@/lib/queries";
import { normalizeCanaryRatio, parseAiMode } from "@/lib/abuse";

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  return NextResponse.json(settings, {
    headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60" },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    openAt,
    abuseLearningEnabled,
    abuseAiMode,
    abuseActiveModel,
    abuseCandidateModel,
    abuseCanaryRatio,
    action,
  } = body;

  if (abuseAiMode !== undefined && parseAiMode(abuseAiMode) !== abuseAiMode) {
    return NextResponse.json({ error: "Invalid AI mode" }, { status: 400 });
  }

  if (action === "promoteCandidate") {
    const current = await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });

    if (!current.abuseCandidateModel) {
      return NextResponse.json({ error: "후보 모델이 없습니다." }, { status: 400 });
    }

    const settings = await prisma.settings.update({
      where: { id: 1 },
      data: {
        abuseActiveModel: current.abuseCandidateModel,
        abuseCandidateModel: null,
        abuseCanaryRatio: 0,
      },
    });

    revalidateTag(TAGS.settings, {});
    return NextResponse.json(settings);
  }

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      openAt: openAt ? new Date(openAt) : null,
      ...(abuseLearningEnabled !== undefined && {
        abuseLearningEnabled: Boolean(abuseLearningEnabled),
      }),
      ...(abuseAiMode !== undefined && { abuseAiMode }),
      ...(abuseActiveModel !== undefined && {
        abuseActiveModel: String(abuseActiveModel || "mock-risk-v1").trim(),
      }),
      ...(abuseCandidateModel !== undefined && {
        abuseCandidateModel: String(abuseCandidateModel).trim() || null,
      }),
      ...(abuseCanaryRatio !== undefined && {
        abuseCanaryRatio: normalizeCanaryRatio(abuseCanaryRatio),
      }),
    },
    update: {
      ...(openAt !== undefined && { openAt: openAt ? new Date(openAt) : null }),
      ...(abuseLearningEnabled !== undefined && {
        abuseLearningEnabled: Boolean(abuseLearningEnabled),
      }),
      ...(abuseAiMode !== undefined && { abuseAiMode }),
      ...(abuseActiveModel !== undefined && {
        abuseActiveModel: String(abuseActiveModel || "mock-risk-v1").trim(),
      }),
      ...(abuseCandidateModel !== undefined && {
        abuseCandidateModel: String(abuseCandidateModel).trim() || null,
      }),
      ...(abuseCanaryRatio !== undefined && {
        abuseCanaryRatio: normalizeCanaryRatio(abuseCanaryRatio),
      }),
    },
  });

  revalidateTag(TAGS.settings, {});
  return NextResponse.json(settings);
}

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TAGS } from "@/lib/queries";
import { parseClubPayload } from "@/lib/clubs/validation";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await prisma.clubCreationRequest.findMany({
    where: { requesterId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      club: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload;
  try {
    payload = parseClubPayload(await req.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "요청을 저장할 수 없습니다." },
      { status: 400 }
    );
  }

  const request = await prisma.clubCreationRequest.create({
    data: {
      ...payload,
      requesterId: session.userId,
    },
  });

  revalidateTag(TAGS.clubRequests, {});
  return NextResponse.json(request, { status: 201 });
}

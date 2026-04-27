import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await prisma.clubCreationRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
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
    },
  });

  return NextResponse.json(requests);
}

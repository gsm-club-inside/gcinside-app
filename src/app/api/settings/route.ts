import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TAGS } from "@/lib/queries";

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

  const { openAt } = await req.json();

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      openAt: openAt ? new Date(openAt) : null,
    },
    update: {
      ...(openAt !== undefined && { openAt: openAt ? new Date(openAt) : null }),
    },
  });

  revalidateTag(TAGS.settings, {});
  return NextResponse.json(settings);
}

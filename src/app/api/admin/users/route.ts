import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: {
      id: true,
      name: true,
      studentNumber: true,
      grade: true,
      classNum: true,
      number: true,
    },
    orderBy: [{ grade: "asc" }, { classNum: "asc" }, { number: "asc" }],
  });

  return NextResponse.json(users);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.abuseModelArtifact.upsert({
    where: { version: "mock-risk-v1" },
    create: {
      version: "mock-risk-v1",
      status: "ACTIVE",
      description: "기본 mock risk 모델",
      promotedAt: new Date(),
    },
    update: {},
  });

  const models = await prisma.abuseModelArtifact.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ models });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const version = String(body.version ?? "").trim();
  const description = String(body.description ?? "").trim();
  const storageUri = String(body.storageUri ?? "").trim();

  if (!version) {
    return NextResponse.json({ error: "모델 버전을 입력해주세요." }, { status: 400 });
  }

  const model = await prisma.abuseModelArtifact.upsert({
    where: { version },
    create: {
      version,
      description: description || null,
      storageUri: storageUri || null,
      status: "CANDIDATE",
    },
    update: {
      description: description || null,
      storageUri: storageUri || null,
    },
  });

  return NextResponse.json(model, { status: 201 });
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listRecentDecisions } from "@/lib/abuse/admin/queries";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? 50)));
  const decisions = await listRecentDecisions(limit);
  return NextResponse.json({ decisions });
}

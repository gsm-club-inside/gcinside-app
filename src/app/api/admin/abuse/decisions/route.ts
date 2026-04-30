import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  createAbuseAdminLog,
  listDetectedAbuseRecords,
  listRecentDecisions,
  type AbuseAdminLogAction,
} from "@/lib/abuse/admin/queries";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? 50)));
  const source = url.searchParams.get("source") ?? "db";
  const decisions =
    source === "memory" ? await listRecentDecisions(limit) : await listDetectedAbuseRecords(limit);
  return NextResponse.json({ decisions });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    requestId?: string;
    action?: AbuseAdminLogAction;
    note?: string;
  };

  try {
    const log = await createAbuseAdminLog({
      requestId: String(body.requestId ?? ""),
      action: body.action ?? "monitoring",
      note: String(body.note ?? ""),
      adminUserId: session.userId,
      adminName: session.name ?? null,
      adminEmail: session.email ?? null,
    });
    return NextResponse.json({ log }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    const status = message === "decision_not_found" ? 404 : message === "empty_note" ? 400 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

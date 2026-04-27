import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listUserDecisions, resetUserReputation, setUserReputation, unblockUser } from "@/lib/abuse/admin/queries";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const decisions = await listUserDecisions(userId, 50);
  return NextResponse.json({ userId, decisions });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { op?: string; action?: string; value?: number };
  switch (body.op) {
    case "unblock":
      await unblockUser(userId, body.action ?? "*");
      return NextResponse.json({ ok: true, op: "unblock" });
    case "reset_reputation":
      await resetUserReputation(userId);
      return NextResponse.json({ ok: true, op: "reset_reputation" });
    case "set_reputation":
      if (typeof body.value !== "number") return NextResponse.json({ error: "invalid_value" }, { status: 400 });
      await setUserReputation(userId, body.value);
      return NextResponse.json({ ok: true, op: "set_reputation", value: body.value });
    default:
      return NextResponse.json({ error: "invalid_op" }, { status: 400 });
  }
}

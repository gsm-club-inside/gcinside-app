import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { activeRules, ruleHitCounts } from "@/lib/abuse/admin/queries";

export async function GET() {
  const session = await getSession();
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const [rules, hits] = await Promise.all([activeRules(), ruleHitCounts()]);
  return NextResponse.json({ rules, hits });
}

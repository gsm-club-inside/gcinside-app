import { NextResponse } from "next/server";
import { putTelemetry } from "@/lib/abuse/telemetry/store";
import { sanitizeTelemetry } from "@/lib/abuse/telemetry/sanitize";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { key, telemetry } = body as { key?: unknown; telemetry?: unknown };
  if (typeof key !== "string" || key.length < 4 || key.length > 128) {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }
  putTelemetry(key, sanitizeTelemetry(telemetry));
  return NextResponse.json({ ok: true });
}

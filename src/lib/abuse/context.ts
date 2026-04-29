import type { NextRequest } from "next/server";
import { fingerprintFromHeaders, hashDevice, hashIp } from "./hash";
import type { AbuseAction, ClientTelemetry, RiskContext, RiskSubject } from "./types";

export function clientIpFromHeaders(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? null;
}

export interface BuildContextInput {
  action: AbuseAction;
  request: NextRequest | { headers: Headers };
  userId?: number | null;
  sessionId?: string | null;
  accountAgeMinutes?: number | null;
  recentRequestCount1m?: number;
  recentRequestCount10m?: number;
  contentHash?: string | null;
  telemetry?: ClientTelemetry;
  metadata?: Record<string, unknown>;
}

export function buildRiskSubject(
  headers: Headers,
  userId?: number | null,
  sessionId?: string | null
): RiskSubject {
  const ip = clientIpFromHeaders(headers);
  const fp = fingerprintFromHeaders(headers, sessionId);
  return {
    userId: userId ?? null,
    sessionId: sessionId ?? null,
    ipHash: hashIp(ip),
    deviceHash: hashDevice(fp),
  };
}

export function buildRiskContext(inp: BuildContextInput): RiskContext {
  const headers = inp.request.headers;
  const subject = buildRiskSubject(headers, inp.userId, inp.sessionId);
  return {
    action: inp.action,
    subject,
    userAgent: headers.get("user-agent"),
    accountAgeMinutes: inp.accountAgeMinutes ?? null,
    recentRequestCount1m: inp.recentRequestCount1m,
    recentRequestCount10m: inp.recentRequestCount10m,
    contentHash: inp.contentHash ?? null,
    telemetry: inp.telemetry,
    metadata: inp.metadata ?? {},
  };
}

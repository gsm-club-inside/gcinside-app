import type { RiskDecision } from "../types";

export interface AuditEvent {
  kind: "risk_decision" | "ai_failure" | "challenge_issued" | "challenge_verified" | "rate_limit_hit" | "block_applied" | "block_lifted";
  at: string;
  payload: Record<string, unknown>;
}

export interface AuditSink {
  write(event: AuditEvent): Promise<void>;
}

class ConsoleAuditSink implements AuditSink {
  async write(event: AuditEvent) {
    if (process.env.NODE_ENV === "test") return;
    console.log(`[audit] ${event.kind} ${event.at}`, JSON.stringify(event.payload));
  }
}

class CompositeAuditSink implements AuditSink {
  constructor(private sinks: AuditSink[]) {}
  async write(event: AuditEvent) {
    await Promise.allSettled(this.sinks.map((s) => s.write(event)));
  }
}

const g = globalThis as unknown as { abuseAuditSink?: AuditSink };
const console_ = new ConsoleAuditSink();
export const defaultAuditSink: AuditSink = g.abuseAuditSink ?? console_;
if (!g.abuseAuditSink) g.abuseAuditSink = defaultAuditSink;

export function setAuditSinks(sinks: AuditSink[]) {
  const composite = new CompositeAuditSink(sinks);
  g.abuseAuditSink = composite;
}

export async function auditDecision(decision: RiskDecision, extra?: Record<string, unknown>) {
  await (g.abuseAuditSink ?? defaultAuditSink).write({
    kind: "risk_decision",
    at: decision.createdAt,
    payload: {
      action: decision.action,
      score: decision.score,
      level: decision.level,
      ruleVersion: decision.ruleVersion,
      modelVersion: decision.modelVersion,
      reasons: decision.reasons.map((r) => r.code),
      subject: decision.subject,
      ...(extra ?? {}),
    },
  });
}

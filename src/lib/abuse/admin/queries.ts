import { defaultDecisionRepo } from "../repo/decisions";
import { defaultReputationStore } from "../reputation";
import { defaultRateLimiter } from "../rate-limit";
import type { RiskDecision } from "../types";
import { defaultRuleEngine } from "../rules/engine";

export type AbuseAdminLogAction = "confirmed_abuse" | "false_positive" | "monitoring" | "resolved";

export interface AbuseAdminLogView {
  id: string;
  requestId: string;
  adminUserId: number | null;
  adminName: string | null;
  adminEmail: string | null;
  action: AbuseAdminLogAction;
  note: string;
  createdAt: string;
}

export interface AbuseDecisionRecordView {
  id: string;
  requestId: string;
  userId: number | null;
  sessionId: string | null;
  ipHash: string | null;
  deviceHash: string | null;
  action: string;
  score: number;
  decision: string;
  reasons: unknown;
  signals: unknown;
  ruleVersion: string;
  modelVersion: string | null;
  metadata: unknown;
  createdAt: string;
  logs: AbuseAdminLogView[];
}

export interface CreateAbuseAdminLogInput {
  requestId: string;
  adminUserId?: number | null;
  adminName?: string | null;
  adminEmail?: string | null;
  action: AbuseAdminLogAction;
  note: string;
}

const ADMIN_LOG_ACTIONS = new Set<AbuseAdminLogAction>([
  "confirmed_abuse",
  "false_positive",
  "monitoring",
  "resolved",
]);

export async function listRecentDecisions(limit = 50): Promise<RiskDecision[]> {
  return defaultDecisionRepo.recent(limit);
}

export async function listDetectedAbuseRecords(limit = 50): Promise<AbuseDecisionRecordView[]> {
  const { prisma } = await import("@/lib/prisma");
  const records = await prisma.riskDecisionRecord.findMany({
    where: { decision: { not: "ALLOW" } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const requestIds = records.map((record) => record.requestId);
  const logs = requestIds.length
    ? await prisma.abuseAdminLog.findMany({
        where: { requestId: { in: requestIds } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const logsByRequestId = new Map<string, AbuseAdminLogView[]>();
  for (const log of logs) {
    const view = toAdminLogView(log);
    logsByRequestId.set(log.requestId, [...(logsByRequestId.get(log.requestId) ?? []), view]);
  }

  return records.map((record) => ({
    id: record.id.toString(),
    requestId: record.requestId,
    userId: record.userId,
    sessionId: record.sessionId,
    ipHash: record.ipHash,
    deviceHash: record.deviceHash,
    action: record.action,
    score: record.score,
    decision: record.decision,
    reasons: record.reasons,
    signals: record.signals,
    ruleVersion: record.ruleVersion,
    modelVersion: record.modelVersion,
    metadata: record.metadata,
    createdAt: record.createdAt.toISOString(),
    logs: logsByRequestId.get(record.requestId) ?? [],
  }));
}

export async function createAbuseAdminLog(input: CreateAbuseAdminLogInput) {
  const { prisma } = await import("@/lib/prisma");
  if (!ADMIN_LOG_ACTIONS.has(input.action)) {
    throw new Error("invalid_action");
  }
  const requestId = input.requestId.trim();
  const note = input.note.trim();
  if (!requestId) throw new Error("invalid_request_id");
  if (!note) throw new Error("empty_note");

  const decision = await prisma.riskDecisionRecord.findUnique({ where: { requestId } });
  if (!decision) throw new Error("decision_not_found");

  const log = await prisma.abuseAdminLog.create({
    data: {
      requestId,
      adminUserId: input.adminUserId ?? null,
      adminName: input.adminName?.trim() || null,
      adminEmail: input.adminEmail?.trim() || null,
      action: input.action,
      note: note.slice(0, 2000),
    },
  });
  return toAdminLogView(log);
}

export async function listUserDecisions(userId: number, limit = 50): Promise<RiskDecision[]> {
  return defaultDecisionRepo.byUser(userId, limit);
}

export async function ruleHitCounts(limit = 200): Promise<Record<string, number>> {
  const items = await defaultDecisionRepo.recent(limit);
  const counts: Record<string, number> = {};
  for (const d of items) for (const r of d.reasons) counts[r.code] = (counts[r.code] ?? 0) + 1;
  return counts;
}

export async function activeRules() {
  return defaultRuleEngine
    .list()
    .map((r) => ({ id: r.id, name: r.name, weight: r.weight, enabled: r.enabled }));
}

export async function unblockUser(userId: number, action: string) {
  await defaultRateLimiter.unblock({ scope: "user", action, identity: String(userId) });
}

export async function resetUserReputation(userId: number) {
  await defaultReputationStore.reset("user", String(userId));
}

export async function setUserReputation(userId: number, value: number) {
  await defaultReputationStore.set("user", String(userId), value);
}

function toAdminLogView(log: {
  id: bigint;
  requestId: string;
  adminUserId: number | null;
  adminName: string | null;
  adminEmail: string | null;
  action: string;
  note: string;
  createdAt: Date;
}): AbuseAdminLogView {
  return {
    id: log.id.toString(),
    requestId: log.requestId,
    adminUserId: log.adminUserId,
    adminName: log.adminName,
    adminEmail: log.adminEmail,
    action: log.action as AbuseAdminLogAction,
    note: log.note,
    createdAt: log.createdAt.toISOString(),
  };
}

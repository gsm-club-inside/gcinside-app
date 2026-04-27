import { abuseConfig, decisionForScore } from "../config";
import type {
  AbuseAction,
  RiskContext,
  RiskDecision,
  RiskScoreBreakdown,
  RiskSignal,
  RiskLevel,
  ChallengeType,
  RiskReason,
} from "../types";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function ruleScore(signals: RiskSignal[]): number {
  if (signals.length === 0) return 0;
  let s = 0;
  for (const sig of signals) s = 1 - (1 - s) * (1 - clamp01(sig.reason.weight));
  return clamp01(s);
}

function behaviorScore(ctx: RiskContext): number {
  const t = ctx.telemetry;
  if (!t) return 0.4;
  let score = 0;
  if (t.submitElapsedMs !== undefined && t.submitElapsedMs < 500) score += 0.5;
  if (t.pasteUsed && (t.keydownCount ?? 0) < 3) score += 0.4;
  if ((t.typingIntervalVariance ?? 1) < 0.01 && (t.keydownCount ?? 0) > 5) score += 0.3;
  if ((t.pointerMoveCount ?? 0) === 0 && (t.keydownCount ?? 0) === 0) score += 0.4;
  return clamp01(score);
}

function velocityScore(ctx: RiskContext): number {
  const a = ctx.recentRequestCount1m ?? 0;
  const b = ctx.recentRequestCount10m ?? 0;
  const va = Math.min(1, a / 60);
  const vb = Math.min(1, b / 200);
  return clamp01(Math.max(va, vb * 0.7));
}

function reputationScore(ctx: RiskContext): number {
  const r = ctx.reputationScore;
  if (r === undefined) return 0;
  return clamp01(1 - r);
}

function contentSimScore(ctx: RiskContext): number {
  const c = ctx.contentSimilarityCount ?? 0;
  if (c === 0) return 0;
  return clamp01(c / 5);
}

export interface RiskScoreInput {
  ctx: RiskContext;
  signals: RiskSignal[];
  mlScore?: number | null;
  modelVersion?: string | null;
}

export function buildBreakdown(inp: RiskScoreInput): RiskScoreBreakdown {
  return {
    ruleScore: ruleScore(inp.signals),
    behaviorScore: behaviorScore(inp.ctx),
    velocityScore: velocityScore(inp.ctx),
    reputationScore: reputationScore(inp.ctx),
    contentSimilarityScore: contentSimScore(inp.ctx),
    mlScore: inp.mlScore ?? null,
  };
}

export function combineScore(b: RiskScoreBreakdown): number {
  const w = abuseConfig.weights;
  let total = 0;
  let totalWeight = 0;
  total += w.rule * b.ruleScore; totalWeight += w.rule;
  total += w.behavior * b.behaviorScore; totalWeight += w.behavior;
  total += w.velocity * b.velocityScore; totalWeight += w.velocity;
  total += w.reputation * b.reputationScore; totalWeight += w.reputation;
  total += w.contentSimilarity * b.contentSimilarityScore; totalWeight += w.contentSimilarity;
  if (b.mlScore !== null && Number.isFinite(b.mlScore)) {
    total += w.ml * b.mlScore; totalWeight += w.ml;
  }
  return totalWeight === 0 ? 0 : clamp01(total / totalWeight);
}

function applyAutomationFloors(ctx: RiskContext, signals: RiskSignal[], score: number): number {
  const reasonCodes = new Set(signals.map((s) => s.reason.code));
  const hasAutomationUa = [...reasonCodes].some((code) => code.startsWith("ua_match_"));
  const hasNoTelemetry = reasonCodes.has("telemetry_absent") || reasonCodes.has("telemetry_empty");
  const hasVeryFastSubmit = reasonCodes.has("submit_under_300ms");
  const hasFastSubmit = hasVeryFastSubmit || reasonCodes.has("submit_under_800ms");
  const noInteraction =
    (ctx.telemetry?.keydownCount ?? 0) === 0 && (ctx.telemetry?.pointerMoveCount ?? 0) === 0;

  if (hasAutomationUa && hasNoTelemetry) return Math.max(score, 0.9);
  if (ctx.action === "vote" && hasVeryFastSubmit && noInteraction) return Math.max(score, 0.9);
  if (ctx.action === "vote" && hasFastSubmit && hasNoTelemetry) return Math.max(score, 0.8);

  return score;
}

function mapChallenge(level: RiskLevel, action: AbuseAction): ChallengeType | null {
  if (level !== "CHALLENGE") return null;
  if (action === "sign_in" || action === "sign_up") return "re_auth";
  if (action === "upload" || action === "create_post") return "captcha";
  return "delay";
}

function aggregateReasons(signals: RiskSignal[]): RiskReason[] {
  const seen = new Map<string, RiskReason>();
  for (const s of signals) {
    const cur = seen.get(s.reason.code);
    if (!cur || (s.reason.weight ?? 0) > (cur.weight ?? 0)) seen.set(s.reason.code, s.reason);
  }
  return [...seen.values()].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
}

export function buildDecision(inp: RiskScoreInput): RiskDecision {
  const breakdown = buildBreakdown(inp);
  const score = applyAutomationFloors(inp.ctx, inp.signals, combineScore(breakdown));
  const level = decisionForScore(score);
  const reasons = aggregateReasons(inp.signals);
  return {
    action: inp.ctx.action,
    subject: inp.ctx.subject,
    score,
    level,
    decision: level,
    reasons,
    signals: inp.signals,
    breakdown,
    ruleVersion: abuseConfig.ruleVersion,
    modelVersion: inp.modelVersion ?? null,
    challenge: mapChallenge(level, inp.ctx.action),
    createdAt: new Date().toISOString(),
    metadata: inp.ctx.metadata ?? {},
  };
}

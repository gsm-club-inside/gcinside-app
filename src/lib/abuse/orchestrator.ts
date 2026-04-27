import { abuseConfig } from "./config";
import { defaultRuleEngine, RuleEngine } from "./rules/engine";
import { buildDecision } from "./scoring/score";
import { defaultAiInferenceClient, type AiInferenceClient } from "./ai-client";
import { checkContextRateLimits, defaultRateLimiter, type RateLimiter } from "./rate-limit";
import { defaultReputationStore, type ReputationStore } from "./reputation";
import { auditDecision, defaultAuditSink, type AuditSink } from "./audit";
import { defaultDecisionRepo, type DecisionRepo } from "./repo/decisions";
import {
  chooseModelForRequest,
  DEFAULT_ABUSE_RUNTIME_SETTINGS,
  type AbuseRuntimeSettings,
} from "./runtime-settings";
import type { RiskContext, RiskDecision } from "./types";

export interface AbuseDeps {
  rules: RuleEngine;
  ai: AiInferenceClient;
  limiter: RateLimiter;
  reputation: ReputationStore;
  audit: AuditSink;
  decisions: DecisionRepo;
}

export const defaultDeps: AbuseDeps = {
  rules: defaultRuleEngine,
  ai: defaultAiInferenceClient,
  limiter: defaultRateLimiter,
  reputation: defaultReputationStore,
  audit: defaultAuditSink,
  decisions: defaultDecisionRepo,
};

export interface CheckOptions {
  requestId?: string;
  skipAi?: boolean;
  runtimeSettings?: Partial<AbuseRuntimeSettings>;
}

export interface CheckResult {
  decision: RiskDecision;
  rateLimited: boolean;
  enforced: boolean; // true if level should block the request
  challenge: ReturnType<typeof challengeFromDecision>;
}

function challengeFromDecision(d: RiskDecision) {
  if (d.level !== "CHALLENGE") return null;
  return { type: d.challenge ?? "delay" };
}

function shouldEnforce(decision: RiskDecision): boolean {
  if (abuseConfig.shadowMode) return false;
  return decision.level === "RATE_LIMIT" || decision.level === "TEMP_BLOCK" || decision.level === "HARD_BLOCK";
}

export async function checkAbuseRisk(
  ctx: RiskContext,
  opts: CheckOptions = {},
  deps: AbuseDeps = defaultDeps,
): Promise<CheckResult> {
  const requestId = opts.requestId ?? randomId();
  const runtimeSettings: AbuseRuntimeSettings = {
    ...DEFAULT_ABUSE_RUNTIME_SETTINGS,
    ...(opts.runtimeSettings ?? {}),
  };

  // 1) reputation augmentation
  let repScore = ctx.reputationScore;
  if (repScore === undefined && ctx.subject.userId !== null && ctx.subject.userId !== undefined) {
    repScore = await deps.reputation.get("user", String(ctx.subject.userId));
  }
  const enrichedCtx: RiskContext = { ...ctx, reputationScore: repScore };

  // 2) rate limit pre-check
  const rl = await checkContextRateLimits(enrichedCtx, deps.limiter);
  const ctxWithVelocity = withRateLimitVelocity(enrichedCtx, rl.decisions);

  // 3) rules
  const signals = await deps.rules.evaluate(ctxWithVelocity);

  // 4) AI inference (best-effort)
  let mlScore: number | null = null;
  let modelVersion: string | null = null;
  let aiFailureReason: string | null = null;
  let shadowMlScore: number | null = null;
  const shouldCallAi =
    !opts.skipAi && abuseConfig.aiInference.enabled && runtimeSettings.aiMode !== "OFF";
  if (shouldCallAi) {
    try {
      const requestedModel = chooseModelForRequest(runtimeSettings);
      const r = await deps.ai.predict(ctxWithVelocity, requestId, requestedModel);
      if (r.ok) {
        shadowMlScore = r.data.mlScore;
        mlScore = runtimeSettings.aiMode === "ENFORCE" ? r.data.mlScore : null;
        modelVersion = r.data.modelVersion;
      } else {
        aiFailureReason = r.error.reason;
      }
    } catch (err) {
      aiFailureReason = err instanceof Error ? err.message : "exception";
    }
  }

  // 5) decision
  let decision = buildDecision({ ctx: ctxWithVelocity, signals, mlScore, modelVersion });
  decision = {
    ...decision,
    metadata: {
      ...decision.metadata,
      abuseLearningEnabled: runtimeSettings.learningEnabled,
      aiMode: runtimeSettings.aiMode,
      activeModel: runtimeSettings.activeModel,
      candidateModel: runtimeSettings.candidateModel,
      canaryRatio: runtimeSettings.canaryRatio,
      ...(shadowMlScore !== null && runtimeSettings.aiMode === "SHADOW" && { shadowMlScore }),
    },
  };

  // 6) rate-limit override
  if (!rl.allowed) {
    decision = {
      ...decision,
      level: "RATE_LIMIT",
      decision: "RATE_LIMIT",
      reasons: [{ code: "rate_limit_exceeded", weight: 1.0 }, ...decision.reasons],
    };
  }

  const enforced = shouldEnforce(decision);

  if (runtimeSettings.learningEnabled) {
    await deps.decisions.save(decision, requestId);
  }

  await auditDecision(decision, { requestId, aiFailureReason, rateLimitDecisions: rl.decisions });

  if (aiFailureReason) {
    await deps.audit.write({
      kind: "ai_failure",
      at: new Date().toISOString(),
      payload: { requestId, action: ctx.action, reason: aiFailureReason },
    });
  }

  return { decision, rateLimited: !rl.allowed, enforced, challenge: challengeFromDecision(decision) };
}

function withRateLimitVelocity(ctx: RiskContext, decisions: { count: number; windowSec: number }[]): RiskContext {
  if (decisions.length === 0) return ctx;

  const max1m = Math.max(
    ctx.recentRequestCount1m ?? 0,
    ...decisions.filter((d) => d.windowSec <= 60).map((d) => d.count),
  );
  const max10m = Math.max(
    ctx.recentRequestCount10m ?? 0,
    ...decisions.filter((d) => d.windowSec <= 600).map((d) => d.count),
  );

  return {
    ...ctx,
    recentRequestCount1m: max1m,
    recentRequestCount10m: max10m,
  };
}

function randomId(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

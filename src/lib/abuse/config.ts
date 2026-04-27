import type { RiskLevel } from "./types";

export interface AbuseConfig {
  ruleVersion: string;
  enableHardBlock: boolean;
  failOpen: boolean;
  aiInference: {
    url: string | null;
    token: string | null;
    timeoutMs: number;
    retries: number;
    enabled: boolean;
  };
  thresholds: { allow: number; monitor: number; challenge: number; rateLimit: number; hardBlock: number };
  weights: {
    rule: number;
    behavior: number;
    velocity: number;
    reputation: number;
    contentSimilarity: number;
    ml: number;
  };
  rateLimit: {
    perAction: Record<string, { windowSec: number; limit: number }>;
  };
  shadowMode: boolean;
  canaryRatio: number;
  modelRollback: boolean;
}

const numEnv = (k: string, dflt: number): number => {
  const v = process.env[k];
  if (!v) return dflt;
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
};
const boolEnv = (k: string, dflt: boolean): boolean => {
  const v = process.env[k];
  if (v === undefined) return dflt;
  return v === "1" || v.toLowerCase() === "true";
};

export const abuseConfig: AbuseConfig = {
  ruleVersion: process.env.ABUSE_RULE_VERSION ?? "rules-v1",
  enableHardBlock: boolEnv("ABUSE_ENABLE_HARD_BLOCK", false),
  failOpen: boolEnv("ABUSE_FAIL_OPEN", true),
  aiInference: {
    url: process.env.AI_INFERENCE_URL ?? null,
    token: process.env.AI_INFERENCE_TOKEN ?? null,
    timeoutMs: numEnv("AI_INFERENCE_TIMEOUT_MS", 250),
    retries: numEnv("AI_INFERENCE_RETRIES", 1),
    enabled: boolEnv("AI_INFERENCE_ENABLED", true),
  },
  thresholds: {
    allow: 0.30,
    monitor: 0.55,
    challenge: 0.75,
    rateLimit: 0.90,
    hardBlock: 1.00,
  },
  weights: {
    rule: 0.30,
    behavior: 0.15,
    velocity: 0.20,
    reputation: 0.10,
    contentSimilarity: 0.10,
    ml: 0.15,
  },
  rateLimit: {
    perAction: {
      sign_in: { windowSec: 60, limit: 10 },
      sign_up: { windowSec: 600, limit: 5 },
      create_post: { windowSec: 60, limit: 10 },
      create_comment: { windowSec: 60, limit: 30 },
      vote: { windowSec: 60, limit: 60 },
      search: { windowSec: 60, limit: 120 },
      upload: { windowSec: 600, limit: 20 },
      report: { windowSec: 600, limit: 10 },
    },
  },
  shadowMode: boolEnv("ABUSE_SHADOW_MODE", false),
  canaryRatio: numEnv("ABUSE_CANARY_RATIO", 0),
  modelRollback: boolEnv("ABUSE_MODEL_ROLLBACK", false),
};

export function decisionForScore(score: number): RiskLevel {
  const t = abuseConfig.thresholds;
  if (score < t.allow) return "ALLOW";
  if (score < t.monitor) return "MONITOR";
  if (score < t.challenge) return "CHALLENGE";
  if (score < t.rateLimit) return "RATE_LIMIT";
  if (score < t.hardBlock) return abuseConfig.enableHardBlock ? "TEMP_BLOCK" : "RATE_LIMIT";
  return abuseConfig.enableHardBlock ? "HARD_BLOCK" : "MANUAL_REVIEW";
}

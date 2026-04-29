import { abuseConfig } from "./config";

export type AbuseAiMode = "OFF" | "SHADOW" | "ENFORCE";

export interface AbuseRuntimeSettings {
  learningEnabled: boolean;
  aiMode: AbuseAiMode;
  activeModel: string;
  candidateModel: string | null;
  canaryRatio: number;
}

export const DEFAULT_ABUSE_RUNTIME_SETTINGS: AbuseRuntimeSettings = {
  learningEnabled: true,
  aiMode: parseEnvAiMode(
    process.env.ABUSE_AI_MODE,
    abuseConfig.aiInference.enabled ? "SHADOW" : "OFF"
  ),
  activeModel: process.env.ABUSE_ACTIVE_MODEL ?? "mock-risk-v1",
  candidateModel: null,
  canaryRatio: abuseConfig.canaryRatio,
};

function parseEnvAiMode(value: string | undefined, fallback: AbuseAiMode): AbuseAiMode {
  if (value === "OFF" || value === "SHADOW" || value === "ENFORCE") return value;
  return fallback;
}

export function parseAiMode(value: unknown): AbuseAiMode {
  if (value === "OFF" || value === "SHADOW" || value === "ENFORCE") return value;
  return DEFAULT_ABUSE_RUNTIME_SETTINGS.aiMode;
}

export function normalizeCanaryRatio(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function settingsToAbuseRuntimeSettings(
  settings:
    | {
        abuseLearningEnabled?: boolean | null;
        abuseAiMode?: string | null;
        abuseActiveModel?: string | null;
        abuseCandidateModel?: string | null;
        abuseCanaryRatio?: number | null;
      }
    | null
    | undefined
): AbuseRuntimeSettings {
  if (!settings) return DEFAULT_ABUSE_RUNTIME_SETTINGS;

  const activeModel = String(
    settings.abuseActiveModel || DEFAULT_ABUSE_RUNTIME_SETTINGS.activeModel
  ).trim();
  const candidateModel = settings.abuseCandidateModel?.trim() || null;

  return {
    learningEnabled: settings.abuseLearningEnabled ?? true,
    aiMode: parseAiMode(settings.abuseAiMode),
    activeModel,
    candidateModel,
    canaryRatio: normalizeCanaryRatio(settings.abuseCanaryRatio ?? 0),
  };
}

export function chooseModelForRequest(
  settings: AbuseRuntimeSettings,
  random = Math.random
): string {
  if (settings.candidateModel && settings.canaryRatio > 0 && random() < settings.canaryRatio) {
    return settings.candidateModel;
  }
  return settings.activeModel;
}

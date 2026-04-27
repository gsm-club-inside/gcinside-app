import { abuseConfig } from "../config";
import type { ClientTelemetry, RiskContext, RiskSubject } from "../types";

export interface AiInferenceRequest {
  requestId: string;
  action: string;
  modelVersion?: string;
  subject: RiskSubject;
  features: {
    requestCount1m: number;
    requestCount10m: number;
    accountAgeMinutes: number;
    typingIntervalAvg: number;
    typingIntervalVariance: number;
    pasteUsed: boolean;
    submitElapsedMs: number;
    reputationScore: number;
    contentSimilarityCount: number;
  };
}

export interface AiInferenceResponse {
  mlScore: number;
  modelVersion: string;
  reasons: string[];
}

export interface AiInferenceFailure {
  reason: "disabled" | "missing_url" | "timeout" | "http_error" | "invalid_response" | "exception";
  detail?: string;
}

export interface AiInferenceClient {
  predict(ctx: RiskContext, requestId: string, modelVersion?: string): Promise<{ ok: true; data: AiInferenceResponse } | { ok: false; error: AiInferenceFailure }>;
}

function buildFeatures(ctx: RiskContext): AiInferenceRequest["features"] {
  const t: ClientTelemetry = ctx.telemetry ?? {};
  return {
    requestCount1m: ctx.recentRequestCount1m ?? 0,
    requestCount10m: ctx.recentRequestCount10m ?? 0,
    accountAgeMinutes: ctx.accountAgeMinutes ?? 0,
    typingIntervalAvg: t.typingIntervalAvg ?? 0,
    typingIntervalVariance: t.typingIntervalVariance ?? 0,
    pasteUsed: !!t.pasteUsed,
    submitElapsedMs: t.submitElapsedMs ?? 0,
    reputationScore: ctx.reputationScore ?? 0,
    contentSimilarityCount: ctx.contentSimilarityCount ?? 0,
  };
}

class HttpAiInferenceClient implements AiInferenceClient {
  async predict(
    ctx: RiskContext,
    requestId: string,
    modelVersion?: string,
  ): Promise<{ ok: true; data: AiInferenceResponse } | { ok: false; error: AiInferenceFailure }> {
    const cfg = abuseConfig.aiInference;
    if (!cfg.enabled) return { ok: false, error: { reason: "disabled" } };
    if (!cfg.url) return { ok: false, error: { reason: "missing_url" } };
    const body: AiInferenceRequest = {
      requestId,
      action: ctx.action,
      ...(modelVersion && { modelVersion }),
      subject: ctx.subject,
      features: buildFeatures(ctx),
    };
    let attempts = 0;
    const max = Math.max(1, cfg.retries + 1);
    let lastErr: AiInferenceFailure = { reason: "exception" };
    while (attempts < max) {
      attempts++;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
      try {
        const headers: Record<string, string> = { "content-type": "application/json" };
        if (cfg.token) headers["authorization"] = `Bearer ${cfg.token}`;
        const res = await fetch(`${cfg.url.replace(/\/$/, "")}/v1/predict-risk`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (!res.ok) {
          lastErr = { reason: "http_error", detail: `${res.status}` };
          continue;
        }
        const data = (await res.json()) as Partial<AiInferenceResponse>;
        if (typeof data.mlScore !== "number" || !Number.isFinite(data.mlScore)) {
          lastErr = { reason: "invalid_response", detail: "missing mlScore" };
          continue;
        }
        return {
          ok: true,
          data: {
            mlScore: Math.max(0, Math.min(1, data.mlScore)),
            modelVersion: data.modelVersion ?? "unknown",
            reasons: Array.isArray(data.reasons) ? data.reasons.map(String) : [],
          },
        };
      } catch (err) {
        clearTimeout(t);
        const msg = err instanceof Error ? err.message : String(err);
        lastErr = { reason: msg.includes("aborted") ? "timeout" : "exception", detail: msg.slice(0, 120) };
      }
    }
    return { ok: false, error: lastErr };
  }
}

export const defaultAiInferenceClient: AiInferenceClient = new HttpAiInferenceClient();

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { abuseConfig } from "@/lib/abuse/config";
import { defaultAiInferenceClient } from "@/lib/abuse/ai-client";
import type { RiskContext } from "@/lib/abuse/types";

const baseCtx: RiskContext = {
  action: "create_post",
  subject: { userId: 1, sessionId: "s", ipHash: "ih", deviceHash: "dh" },
  recentRequestCount1m: 1,
  recentRequestCount10m: 2,
  accountAgeMinutes: 30,
  reputationScore: 0.4,
  contentSimilarityCount: 0,
  telemetry: {
    submitElapsedMs: 1500,
    typingIntervalAvg: 80,
    typingIntervalVariance: 100,
    keydownCount: 12,
    pasteUsed: false,
  },
};

let savedCfg: typeof abuseConfig.aiInference;
let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  savedCfg = { ...abuseConfig.aiInference };
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  abuseConfig.aiInference = savedCfg;
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

describe("ai-client", () => {
  it("returns disabled when feature flag is off", async () => {
    abuseConfig.aiInference = { ...savedCfg, enabled: false };
    const r = await defaultAiInferenceClient.predict(baseCtx, "req-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.reason).toBe("disabled");
  });

  it("returns missing_url when URL not set", async () => {
    abuseConfig.aiInference = { ...savedCfg, enabled: true, url: null };
    const r = await defaultAiInferenceClient.predict(baseCtx, "req-2");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.reason).toBe("missing_url");
  });

  it("calls fetch with auth header and clamps mlScore", async () => {
    abuseConfig.aiInference = {
      ...savedCfg,
      enabled: true,
      url: "http://ai.local",
      token: "secret",
      timeoutMs: 1000,
      retries: 0,
    };
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ mlScore: 1.5, modelVersion: "m1", reasons: [42] }), {
          status: 200,
        })
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const r = await defaultAiInferenceClient.predict(baseCtx, "req-3", "candidate-v2");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.mlScore).toBe(1);
      expect(r.data.modelVersion).toBe("m1");
      expect(r.data.reasons).toEqual(["42"]);
    }
    const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe("http://ai.local/v1/predict-risk");
    expect((init.headers as Record<string, string>)["authorization"]).toBe("Bearer secret");
    const body = JSON.parse(init.body as string);
    expect(body.requestId).toBe("req-3");
    expect(body.modelVersion).toBe("candidate-v2");
    expect(body.features.requestCount1m).toBe(1);
  });

  it("retries on http_error and surfaces final failure", async () => {
    abuseConfig.aiInference = {
      ...savedCfg,
      enabled: true,
      url: "http://ai.local/",
      token: null,
      timeoutMs: 1000,
      retries: 2,
    };
    const fetchMock = vi.fn(async () => new Response("err", { status: 500 }));
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const r = await defaultAiInferenceClient.predict(baseCtx, "req-4");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.reason).toBe("http_error");
      expect(r.error.detail).toBe("500");
    }
    expect(fetchMock).toHaveBeenCalledTimes(3); // retries + 1
  });

  it("treats missing mlScore as invalid_response", async () => {
    abuseConfig.aiInference = {
      ...savedCfg,
      enabled: true,
      url: "http://ai.local",
      token: null,
      timeoutMs: 1000,
      retries: 0,
    };
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ modelVersion: "m" }), { status: 200 })
    ) as unknown as typeof globalThis.fetch;

    const r = await defaultAiInferenceClient.predict(baseCtx, "req-5");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.reason).toBe("invalid_response");
  });

  it("classifies abort as timeout", async () => {
    abuseConfig.aiInference = {
      ...savedCfg,
      enabled: true,
      url: "http://ai.local",
      token: null,
      timeoutMs: 1000,
      retries: 0,
    };
    globalThis.fetch = vi.fn(async () => {
      throw new Error("The operation was aborted");
    }) as unknown as typeof globalThis.fetch;

    const r = await defaultAiInferenceClient.predict(baseCtx, "req-6");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.reason).toBe("timeout");
  });
});

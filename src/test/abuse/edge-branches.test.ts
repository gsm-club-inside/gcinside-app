import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { abuseConfig } from "@/lib/abuse/config";

const upsertMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    riskDecisionRecord: {
      get upsert() {
        return upsertMock;
      },
    },
  },
}));

import { defaultAiInferenceClient } from "@/lib/abuse/ai-client";
import { HybridDecisionRepo, InMemoryDecisionRepo } from "@/lib/abuse/repo/decisions";
import { buildRiskContext, clientIpFromHeaders } from "@/lib/abuse/context";
import type { RiskContext } from "@/lib/abuse/types";

beforeEach(() => {
  upsertMock.mockReset();
  upsertMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("ai-client buildFeatures defaults", () => {
  it("uses zeros for all features when telemetry/context fields are missing", async () => {
    const saved = { ...abuseConfig.aiInference };
    abuseConfig.aiInference = {
      ...saved,
      enabled: true,
      url: "http://ai.local",
      token: null,
      timeoutMs: 1000,
      retries: 0,
    };
    let captured: Record<string, unknown> | undefined;
    globalThis.fetch = vi.fn(async (_url: unknown, init: RequestInit) => {
      captured = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ mlScore: 0.1, modelVersion: "m" }), { status: 200 });
    }) as unknown as typeof globalThis.fetch;

    const ctx: RiskContext = {
      action: "create_post",
      subject: { userId: 1 },
      // no telemetry, no counts, no reputation
    };
    const r = await defaultAiInferenceClient.predict(ctx, "req-zeros");
    abuseConfig.aiInference = saved;

    expect(r.ok).toBe(true);
    expect(captured?.features).toEqual({
      requestCount1m: 0,
      requestCount10m: 0,
      accountAgeMinutes: 0,
      typingIntervalAvg: 0,
      typingIntervalVariance: 0,
      pasteUsed: false,
      submitElapsedMs: 0,
      reputationScore: 0,
      contentSimilarityCount: 0,
    });
  });
});

describe("decisions repo handles null subject fields", () => {
  it("accepts subjects with all-null identifiers", async () => {
    const mem = new InMemoryDecisionRepo();
    const repo = new HybridDecisionRepo(mem);
    await repo.save(
      {
        action: "sign_in",
        subject: { userId: null, sessionId: null, ipHash: null, deviceHash: null },
        score: 0.1,
        level: "ALLOW",
        decision: "ALLOW",
        reasons: [],
        signals: [],
        breakdown: {
          ruleScore: 0,
          behaviorScore: 0,
          velocityScore: 0,
          reputationScore: 0,
          contentSimilarityScore: 0,
          mlScore: null,
        },
        ruleVersion: "rules-v1",
        modelVersion: null,
        challenge: null,
        createdAt: new Date().toISOString(),
        metadata: {},
      },
      "req-null"
    );
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const call = upsertMock.mock.calls[0]![0];
    expect(call.create.userId).toBeNull();
    expect(call.create.sessionId).toBeNull();
    expect(call.create.ipHash).toBeNull();
    expect(call.create.deviceHash).toBeNull();
    expect(await repo.recent(1)).toHaveLength(1);
  });
});

describe("context/clientIpFromHeaders fallback", () => {
  it("uses x-real-ip when x-forwarded-for is absent", () => {
    const h = new Headers({ "x-real-ip": "10.0.0.1" });
    expect(clientIpFromHeaders(h)).toBe("10.0.0.1");
  });

  it("returns null when no client IP headers present", () => {
    expect(clientIpFromHeaders(new Headers())).toBeNull();
  });

  it("buildRiskContext defaults metadata, telemetry, accountAgeMinutes to safe values", () => {
    const ctx = buildRiskContext({
      action: "vote",
      request: { headers: new Headers() },
    });
    expect(ctx.metadata).toEqual({});
    expect(ctx.telemetry).toBeUndefined();
    expect(ctx.accountAgeMinutes).toBeNull();
    expect(ctx.contentHash).toBeNull();
  });
});

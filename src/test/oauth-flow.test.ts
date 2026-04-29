import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchUserInfo,
  generateCodeVerifier,
  generateState,
  isAdminEmail,
  refreshAccessToken,
} from "@/lib/oauth";

const ENV_KEYS = ["OAUTH_CLIENT_ID", "OAUTH_REDIRECT_URI", "OAUTH_SCOPE", "ADMIN_EMAILS"] as const;
const saved: Record<string, string | undefined> = {};
let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  globalThis.fetch = originalFetch;
});

describe("oauth code/state generators", () => {
  it("produces base64url-safe verifiers and states", () => {
    const v = generateCodeVerifier();
    const s = generateState();
    expect(v).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32-byte verifier ≈ 43 base64url chars
    expect(v.length).toBeGreaterThanOrEqual(40);
  });
});

describe("oauth/buildAuthorizationUrl", () => {
  // OAUTH_SCOPE is captured at module load, so we can't toggle it per test.
  // We assert on the params buildAuthorizationUrl always emits.
  it("includes client_id, redirect_uri, code_challenge and S256 method", async () => {
    process.env.OAUTH_CLIENT_ID = "client-xyz";
    process.env.OAUTH_REDIRECT_URI = "https://app.local/callback";
    const url = new URL(await buildAuthorizationUrl("verifier-123", "state-abc"));
    expect(url.searchParams.get("client_id")).toBe("client-xyz");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.local/callback");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("state-abc");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("oauth/exchangeCodeForToken", () => {
  it("returns the payload nested under data", async () => {
    process.env.OAUTH_CLIENT_ID = "c";
    process.env.OAUTH_REDIRECT_URI = "u";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              access_token: "AT",
              token_type: "Bearer",
              expires_in: 60,
              refresh_token: "RT",
              scope: "self:read",
            },
          }),
          { status: 200 }
        )
    ) as unknown as typeof globalThis.fetch;

    const token = await exchangeCodeForToken("code", "verifier");
    expect(token.access_token).toBe("AT");
    expect(token.refresh_token).toBe("RT");
  });

  it("throws when payload contains an error", async () => {
    process.env.OAUTH_CLIENT_ID = "c";
    process.env.OAUTH_REDIRECT_URI = "u";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "invalid_grant", error_description: "bad" }), {
          status: 400,
        })
    ) as unknown as typeof globalThis.fetch;

    await expect(exchangeCodeForToken("c", "v")).rejects.toThrow(/invalid_grant/);
  });

  it("throws when response has no access_token", async () => {
    process.env.OAUTH_CLIENT_ID = "c";
    process.env.OAUTH_REDIRECT_URI = "u";
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ data: {} }), { status: 200 })
    ) as unknown as typeof globalThis.fetch;
    await expect(exchangeCodeForToken("c", "v")).rejects.toThrow(/no access_token/);
  });
});

describe("oauth/fetchUserInfo", () => {
  it("returns the unwrapped data on success", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: { id: 5, email: "a@b", role: "STUDENT" } }), {
          status: 200,
        })
    ) as unknown as typeof globalThis.fetch;
    const u = await fetchUserInfo("token");
    expect(u.id).toBe(5);
  });

  it("throws on non-OK status", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error_description: "invalid token" }), { status: 401 })
    ) as unknown as typeof globalThis.fetch;
    await expect(fetchUserInfo("token")).rejects.toThrow(/UserInfo fetch failed: 401/);
  });
});

describe("oauth/refreshAccessToken", () => {
  it("returns new token on success", async () => {
    process.env.OAUTH_CLIENT_ID = "c";
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ data: { access_token: "AT2" } }), { status: 200 })
    ) as unknown as typeof globalThis.fetch;
    const t = await refreshAccessToken("rt");
    expect(t.access_token).toBe("AT2");
  });

  it("throws when payload reports error or missing token", async () => {
    process.env.OAUTH_CLIENT_ID = "c";
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })
    ) as unknown as typeof globalThis.fetch;
    await expect(refreshAccessToken("rt")).rejects.toThrow(/invalid_grant/);

    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({}), { status: 200 })
    ) as unknown as typeof globalThis.fetch;
    await expect(refreshAccessToken("rt")).rejects.toThrow(/no access_token/);
  });
});

describe("oauth/isAdminEmail", () => {
  it("matches case-insensitively against ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = "Admin@x.com, second@y.com";
    expect(isAdminEmail("admin@x.com")).toBe(true);
    expect(isAdminEmail("SECOND@y.com")).toBe(true);
    expect(isAdminEmail("other@z.com")).toBe(false);
  });

  it("returns false when ADMIN_EMAILS is empty", () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail("anyone@x.com")).toBe(false);
  });
});

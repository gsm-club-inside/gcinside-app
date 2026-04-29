import type { ChallengeType, RiskDecision } from "../types";

export interface ChallengeIssued {
  type: ChallengeType;
  token: string;
  expiresAt: number;
  payload?: Record<string, unknown>;
}

export interface ChallengeProvider {
  type: ChallengeType;
  issue(decision: RiskDecision): Promise<ChallengeIssued>;
  verify(token: string, response: unknown): Promise<boolean>;
}

interface StoredChallenge {
  type: ChallengeType;
  issuedAt: number;
  expiresAt: number;
  answer?: string;
  waitUntil?: number;
}

const g = globalThis as unknown as { abuseChallengeStore?: Map<string, StoredChallenge> };
const store = g.abuseChallengeStore ?? new Map<string, StoredChallenge>();
if (!g.abuseChallengeStore) g.abuseChallengeStore = store;

class DelayChallenge implements ChallengeProvider {
  type: ChallengeType = "delay";
  async issue(_d: RiskDecision): Promise<ChallengeIssued> {
    const token = cryptoRandom();
    const issuedAt = Date.now();
    const waitMs = 2_000;
    const expiresAt = issuedAt + 30_000;
    store.set(token, { type: "delay", issuedAt, expiresAt, waitUntil: issuedAt + waitMs });
    return { type: "delay", token, expiresAt, payload: { waitMs } };
  }
  async verify(token: string): Promise<boolean> {
    const c = getChallenge(token, "delay");
    if (!c || Date.now() < (c.waitUntil ?? c.issuedAt)) return false;
    store.delete(token);
    return true;
  }
}

class ReAuthChallenge implements ChallengeProvider {
  type: ChallengeType = "re_auth";
  async issue(_d: RiskDecision): Promise<ChallengeIssued> {
    const token = cryptoRandom();
    const expiresAt = Date.now() + 5 * 60_000;
    store.set(token, { type: "re_auth", issuedAt: Date.now(), expiresAt });
    return { type: "re_auth", token, expiresAt };
  }
  async verify(_t: string, response: unknown): Promise<boolean> {
    if (
      typeof response !== "object" ||
      response === null ||
      (response as Record<string, unknown>).reAuthenticated !== true
    ) {
      return false;
    }
    return !!takeChallenge(_t, "re_auth");
  }
}

class EmailVerificationChallenge implements ChallengeProvider {
  type: ChallengeType = "email_verification";
  async issue(_d: RiskDecision): Promise<ChallengeIssued> {
    const token = cryptoRandom();
    const expiresAt = Date.now() + 30 * 60_000;
    store.set(token, { type: "email_verification", issuedAt: Date.now(), expiresAt });
    return { type: "email_verification", token, expiresAt };
  }
  async verify(_t: string, response: unknown): Promise<boolean> {
    if (
      typeof response !== "object" ||
      response === null ||
      (response as Record<string, unknown>).emailVerified !== true
    ) {
      return false;
    }
    return !!takeChallenge(_t, "email_verification");
  }
}

class MathCaptchaChallenge implements ChallengeProvider {
  type: ChallengeType = "captcha";
  async issue(_d: RiskDecision): Promise<ChallengeIssued> {
    const token = cryptoRandom();
    const a = 2 + Math.floor(Math.random() * 8);
    const b = 2 + Math.floor(Math.random() * 8);
    const expiresAt = Date.now() + 5 * 60_000;
    store.set(token, {
      type: "captcha",
      issuedAt: Date.now(),
      expiresAt,
      answer: String(a + b),
    });
    return {
      type: "captcha",
      token,
      expiresAt,
      payload: { provider: "math", question: `${a} + ${b}` },
    };
  }
  async verify(token: string, response: unknown): Promise<boolean> {
    const c = takeChallenge(token, "captcha");
    if (!c) return false;
    const answer =
      typeof response === "object" && response !== null
        ? (response as Record<string, unknown>).answer
        : response;
    return String(answer ?? "").trim() === c.answer;
  }
}

class AdminReviewChallenge implements ChallengeProvider {
  type: ChallengeType = "admin_review";
  async issue(_d: RiskDecision): Promise<ChallengeIssued> {
    return {
      type: "admin_review",
      token: cryptoRandom(),
      expiresAt: Date.now() + 24 * 60 * 60_000,
    };
  }
  async verify(): Promise<boolean> {
    return false;
  }
}

function cryptoRandom(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function takeChallenge(token: string, type: ChallengeType): StoredChallenge | null {
  const challenge = getChallenge(token, type);
  if (!challenge) return null;
  store.delete(token);
  return challenge;
}

function getChallenge(token: string, type: ChallengeType): StoredChallenge | null {
  gc();
  const challenge = store.get(token);
  if (!challenge || challenge.type !== type || challenge.expiresAt < Date.now()) {
    store.delete(token);
    return null;
  }
  return challenge;
}

function gc() {
  const now = Date.now();
  for (const [token, challenge] of store.entries()) {
    if (challenge.expiresAt < now) store.delete(token);
  }
}

const providers: Record<ChallengeType, ChallengeProvider> = {
  delay: new DelayChallenge(),
  re_auth: new ReAuthChallenge(),
  email_verification: new EmailVerificationChallenge(),
  captcha: new MathCaptchaChallenge(),
  admin_review: new AdminReviewChallenge(),
};

export function getChallengeProvider(t: ChallengeType): ChallengeProvider {
  return providers[t];
}

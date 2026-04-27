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

class DelayChallenge implements ChallengeProvider {
  type: ChallengeType = "delay";
  async issue(_d: RiskDecision): Promise<ChallengeIssued> {
    return { type: "delay", token: cryptoRandom(), expiresAt: Date.now() + 5_000, payload: { waitMs: 1500 } };
  }
  async verify(): Promise<boolean> { return true; }
}

class ReAuthChallenge implements ChallengeProvider {
  type: ChallengeType = "re_auth";
  async issue(_d: RiskDecision): Promise<ChallengeIssued> {
    return { type: "re_auth", token: cryptoRandom(), expiresAt: Date.now() + 5 * 60_000 };
  }
  async verify(_t: string, response: unknown): Promise<boolean> {
    return typeof response === "object" && response !== null && (response as Record<string, unknown>).reAuthenticated === true;
  }
}

class EmailVerificationChallenge implements ChallengeProvider {
  type: ChallengeType = "email_verification";
  async issue(_d: RiskDecision): Promise<ChallengeIssued> {
    return { type: "email_verification", token: cryptoRandom(), expiresAt: Date.now() + 30 * 60_000 };
  }
  async verify(_t: string, response: unknown): Promise<boolean> {
    return typeof response === "object" && response !== null && (response as Record<string, unknown>).emailVerified === true;
  }
}

class CaptchaPlaceholder implements ChallengeProvider {
  type: ChallengeType = "captcha";
  async issue(_d: RiskDecision): Promise<ChallengeIssued> {
    return { type: "captcha", token: cryptoRandom(), expiresAt: Date.now() + 5 * 60_000, payload: { provider: "placeholder" } };
  }
  async verify(_t: string, response: unknown): Promise<boolean> {
    return typeof response === "object" && response !== null && (response as Record<string, unknown>).captchaToken !== undefined;
  }
}

class AdminReviewChallenge implements ChallengeProvider {
  type: ChallengeType = "admin_review";
  async issue(_d: RiskDecision): Promise<ChallengeIssued> {
    return { type: "admin_review", token: cryptoRandom(), expiresAt: Date.now() + 24 * 60 * 60_000 };
  }
  async verify(): Promise<boolean> { return false; }
}

function cryptoRandom(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const providers: Record<ChallengeType, ChallengeProvider> = {
  delay: new DelayChallenge(),
  re_auth: new ReAuthChallenge(),
  email_verification: new EmailVerificationChallenge(),
  captcha: new CaptchaPlaceholder(),
  admin_review: new AdminReviewChallenge(),
};

export function getChallengeProvider(t: ChallengeType): ChallengeProvider {
  return providers[t];
}

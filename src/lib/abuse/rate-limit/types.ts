export interface RateLimitKey {
  scope: "user" | "ip" | "session" | "device";
  identity: string;
  action: string;
}

export interface RateLimitDecision {
  allowed: boolean;
  count: number;
  limit: number;
  windowSec: number;
  resetAt: number;
}

export interface RateLimiter {
  check(key: RateLimitKey, limit: number, windowSec: number): Promise<RateLimitDecision>;
  block(key: RateLimitKey, ttlSec: number): Promise<void>;
  isBlocked(key: RateLimitKey): Promise<boolean>;
  unblock(key: RateLimitKey): Promise<void>;
}

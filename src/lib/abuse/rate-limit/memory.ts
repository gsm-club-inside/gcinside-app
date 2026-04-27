import type { RateLimitDecision, RateLimitKey, RateLimiter } from "./types";

interface Bucket { count: number; resetAt: number }

function keyOf(k: RateLimitKey): string {
  return `${k.scope}:${k.action}:${k.identity}`;
}

export class InMemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();
  private blocks = new Map<string, number>();

  async check(key: RateLimitKey, limit: number, windowSec: number): Promise<RateLimitDecision> {
    const k = keyOf(key);
    const now = Date.now();
    const b = this.buckets.get(k);
    if (!b || b.resetAt <= now) {
      const newBucket = { count: 1, resetAt: now + windowSec * 1000 };
      this.buckets.set(k, newBucket);
      return { allowed: true, count: 1, limit, windowSec, resetAt: newBucket.resetAt };
    }
    b.count += 1;
    return { allowed: b.count <= limit, count: b.count, limit, windowSec, resetAt: b.resetAt };
  }

  async block(key: RateLimitKey, ttlSec: number): Promise<void> {
    this.blocks.set(keyOf(key), Date.now() + ttlSec * 1000);
  }

  async isBlocked(key: RateLimitKey): Promise<boolean> {
    const expiry = this.blocks.get(keyOf(key));
    if (!expiry) return false;
    if (expiry <= Date.now()) {
      this.blocks.delete(keyOf(key));
      return false;
    }
    return true;
  }

  async unblock(key: RateLimitKey): Promise<void> {
    this.blocks.delete(keyOf(key));
  }
}

const globalForLimiter = globalThis as unknown as { abuseLimiter?: RateLimiter };
export const defaultRateLimiter: RateLimiter = globalForLimiter.abuseLimiter ?? new InMemoryRateLimiter();
if (!globalForLimiter.abuseLimiter) globalForLimiter.abuseLimiter = defaultRateLimiter;

/**
 * In-memory rate limiter. Works in single-instance deployment.
 * For multi-instance: swap to Upstash/Redis (same interface).
 *
 * Usage:
 *   const limiter = rateLimiter({ windowMs: 60000, max: 100 });
 *   const result = limiter.check(key);
 *   if (!result.allowed) return apiError("Rate limit exceeded", { status: 429 });
 */

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private windowMs: number;
  private max: number;

  constructor(opts: RateLimitOptions) {
    this.windowMs = opts.windowMs;
    this.max = opts.max;
    this.prune();
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.max - 1, resetMs: this.windowMs };
    }

    if (bucket.count >= this.max) {
      return { allowed: false, remaining: 0, resetMs: bucket.resetAt - now };
    }

    bucket.count++;
    return { allowed: true, remaining: this.max - bucket.count, resetMs: bucket.resetAt - now };
  }

  private prune() {
    const now = Date.now();
    for (const [key, b] of this.buckets) {
      if (now >= b.resetAt) this.buckets.delete(key);
    }
  }
}

// --- Pre-configured limiters ---

// General API: 100 req/min per user
export const apiLimiter = new RateLimiter({ windowMs: 60_000, max: 100 });

// Webhook triggers: 10 req/min per workflow
export const webhookLimiter = new RateLimiter({ windowMs: 60_000, max: 10 });

// AI agent: 20 req/min per user
export const aiLimiter = new RateLimiter({ windowMs: 60_000, max: 20 });

// Auth endpoints: 5 req/min per IP
export const authLimiter = new RateLimiter({ windowMs: 60_000, max: 5 });

// Workflow execution: 30 req/min per user
export const runLimiter = new RateLimiter({ windowMs: 60_000, max: 30 });

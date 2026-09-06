import { type NextRequest } from "next/server";

/**
 * Simple in-memory rate limiter (per IP per route).
 * For production, replace with Upstash Ratelimit (Redis-based).
 *
 * Limits:
 * - Auth routes (/api/auth/*): 10 req/min
 * - API routes (/api/*): 60 req/min
 * - Webhook (/api/webhooks/*): 30 req/min (public)
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000; // 1 minute

// Cleanup old buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 300_000).unref();

function getRateLimit(pathname: string): number {
  if (pathname.startsWith("/api/auth/")) return 10;
  if (pathname.startsWith("/api/webhooks/")) return 30;
  if (pathname.startsWith("/api/billing/")) return 5;
  return 60;
}

export function rateLimit(request: NextRequest): { ok: boolean; retryAfter?: number } {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const key = `${ip}:${request.nextUrl.pathname}`;
  const limit = getRateLimit(request.nextUrl.pathname);
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  bucket.count++;

  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return { ok: false, retryAfter };
  }

  return { ok: true };
}
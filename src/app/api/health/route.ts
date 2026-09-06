import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — Health check endpoint
 * Checks: Supabase DB connectivity, Redis (optional)
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; latency?: number; error?: string }> = {};
  const start = Date.now();

  // 1) Supabase DB
  try {
    const t0 = Date.now();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (error) {
      checks.supabase = { ok: false, error: error.message };
    } else {
      checks.supabase = { ok: true, latency: Date.now() - t0 };
    }
  } catch (e) {
    checks.supabase = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 2) Redis (optional — only if UPSTASH_REDIS_URL is set)
  if (process.env.UPSTASH_REDIS_URL) {
    try {
      const t0 = Date.now();
      const IORedis = (await import("ioredis")).default;
      const redis = new IORedis(process.env.UPSTASH_REDIS_URL, {
        connectTimeout: 3000,
        commandTimeout: 3000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      await redis.connect();
      await redis.ping();
      await redis.disconnect();
      checks.redis = { ok: true, latency: Date.now() - t0 };
    } catch (e) {
      checks.redis = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? 200 : 503;

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      latency: Date.now() - start,
      checks,
    },
    { status }
  );
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/health — Public health check (no auth)
 */
export async function GET() {
  const startTime = Date.now();

  // Check Supabase connectivity
  let dbOk = false;
  let dbMs = 0;
  try {
    const dbStart = Date.now();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workflows")
      .select("id", { count: "exact", head: true })
      .limit(1);
    dbMs = Date.now() - dbStart;
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  const totalMs = Date.now() - startTime;
  const healthy = dbOk;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime_ms: totalMs,
      checks: {
        database: {
          status: dbOk ? "ok" : "error",
          latency_ms: dbMs,
        },
      },
      version: "7.8.0",
    },
    { status: healthy ? 200 : 503 }
  );
}

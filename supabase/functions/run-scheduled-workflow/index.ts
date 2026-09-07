import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Supabase Edge Function: run-scheduled-workflow
 * Called by GitHub Actions (every 5 min) or PG Cron (every 1 min).
 *
 * Flow:
 *   1. Find due workflows (next_run_at <= now())
 *   2. For each: call Vercel API /api/workflows/[id]/run (full engine)
 *   3. Update next_run_at
 */

const VERCEL_URL = Deno.env.get("VERCEL_URL") || "https://flowly.vercel.app";

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (authHeader !== `Bearer ${serviceKey}` && apikey !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json() as {
      workflow_id?: string;
      workspace_id?: string;
      scan?: boolean;
    };
    const { workflow_id, workspace_id, scan } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey
    );

    // --- Scan mode: find all due, call Vercel for each ---
    if (scan) {
      const { data: dueWfs, error: dueError } = await supabase
        .from("workflows")
        .select("id, workspace_id, schedule")
        .eq("schedule_enabled", true)
        .not("schedule", "is", null)
        .not("next_run_at", "is", null)
        .lte("next_run_at", new Date().toISOString())
        .limit(20);

      if (dueError) throw dueError;

      const wfs = (dueWfs ?? []) as {
        id: string;
        workspace_id: string;
        schedule: string;
      }[];

      const results: { id: string; status: string }[] = [];

      for (const wf of wfs) {
        try {
          // Call Vercel run API (full engine with integrations)
          const runRes = await fetch(
            `${VERCEL_URL}/api/workflows/${wf.id}/run`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-service-role": serviceKey,
              },
              body: JSON.stringify({ trigger: "schedule" }),
            }
          );

          const runData = (await runRes.json().catch(() => ({}))) as {
            success?: boolean;
            error?: string;
            run?: { status?: string };
          };

          const status = runData.run?.status || (runRes.ok ? "success" : "failed");
          results.push({ id: wf.id, status });

          // Update next_run_at
          const nextRun = nextCronOccurrence(wf.schedule, new Date());
          await supabase
            .from("workflows")
            .update({ next_run_at: nextRun.toISOString() })
            .eq("id", wf.id);
        } catch (e) {
          results.push({
            id: wf.id,
            status: `error: ${e instanceof Error ? e.message : "unknown"}`,
          });
        }
      }

      return new Response(
        JSON.stringify({ executed: results.length, results }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // --- Single workflow mode ---
    if (!workflow_id || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "Missing workflow_id/workspace_id or scan:true" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const runRes = await fetch(
      `${VERCEL_URL}/api/workflows/${workflow_id}/run`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-service-role": serviceKey,
        },
        body: JSON.stringify({ trigger: "schedule" }),
      }
    );

    const runData = (await runRes.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      run?: { status?: string; id?: string };
    };

    return new Response(
      JSON.stringify({
        status: runData.run?.status || (runRes.ok ? "success" : "failed"),
        run_id: runData.run?.id,
        error: runData.error,
      }),
      {
        status: runRes.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// Simple cron next-occurrence (mirrors the app logic)
function nextCronOccurrence(cron: string, from: Date): Date {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return new Date(from.getTime() + 3600_000);

  const [min, hour, , , dow] = parts;
  const result = new Date(from);
  result.setSeconds(0, 0);

  if (min === "*" && hour === "*") {
    result.setMinutes(result.getMinutes() + 1);
    return result;
  }
  if (hour === "*") {
    result.setMinutes(parseInt(min, 10) || 0);
    result.setHours(result.getHours() + 1);
    return result;
  }

  result.setMinutes(parseInt(min, 10) || 0);
  result.setHours(parseInt(hour, 10) || 0);

  if (dow !== "*") {
    const days: number[] = [];
    for (const p of dow.split(",")) {
      if (p.includes("-")) {
        const [a, b] = p.split("-").map(Number);
        for (let d = a; d <= b; d++) days.push(d);
      } else {
        days.push(parseInt(p, 10));
      }
    }
    let add = 0;
    while (!days.includes(result.getDay()) && add < 8) {
      add++;
      result.setDate(result.getDate() + 1);
    }
  }

  if (result <= from) result.setDate(result.getDate() + 1);
  return result;
}

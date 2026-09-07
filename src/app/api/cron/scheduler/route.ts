import { NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Vercel Cron: runs every minute.
 * Finds due scheduled workflows (next_run_at <= now()) and executes them.
 * Updates next_run_at to next cron occurrence.
 */

function nextCronOccurrence(cron: string, from: Date): Date {
  // Simple cron parser for common patterns
  // Supports: "M H * * *" (daily), "M H * * 1-5" (weekdays), "0 * * * *" (hourly)
  // Returns next occurrence after `from`
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return new Date(from.getTime() + 3600_000);

  const [min, hour, , , dow] = parts;
  const result = new Date(from);
  result.setSeconds(0, 0);

  if (min === "*" && hour === "*") {
    // Every minute
    result.setMinutes(result.getMinutes() + 1);
    return result;
  }

  if (hour === "*") {
    // Every hour at minute M
    result.setMinutes(parseInt(min, 10) || 0);
    result.setHours(result.getHours() + 1);
    return result;
  }

  // Specific hour:minute
  result.setMinutes(parseInt(min, 10) || 0);
  result.setHours(parseInt(hour, 10) || 0);

  // Check day of week
  if (dow !== "*") {
    const allowedDays = parseDow(dow);
    let daysToAdd = 0;
    while (!allowedDays.includes((result.getDay() + daysToAdd) % 7) && daysToAdd < 8) {
      daysToAdd++;
    }
    result.setDate(result.getDate() + daysToAdd);
  }

  // If we ended up in the past, push to next day
  if (result <= from) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

function parseDow(dow: string): number[] {
  if (dow === "*") return [0, 1, 2, 3, 4, 5, 6];
  const days: number[] = [];
  for (const part of dow.split(",")) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      for (let d = a; d <= b; d++) days.push(d);
    } else {
      days.push(parseInt(part, 10));
    }
  }
  return days;
}

export async function GET(request: Request) {
  // Verify cron secret
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { createClient } = await import("@/lib/supabase/admin");
  const supabase = createClient();
  const now = new Date();

  // Find due workflows
  const { data: rawWorkflows, error } = await supabase
    .from("workflows")
    .select("id, workspace_id, schedule, next_run_at")
    .eq("schedule_enabled", true)
    .neq("schedule", "")
    .lte("next_run_at", now.toISOString())
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dueWorkflows = (rawWorkflows ?? []) as {
    id: string;
    workspace_id: string;
    schedule: string;
    next_run_at: string | null;
  }[];

  if (dueWorkflows.length === 0) {
    return NextResponse.json({ executed: 0 });
  }

  const { executeWorkflow } = await import("@/lib/workflow-engine");
  const results: { id: string; status: string }[] = [];

  for (const wf of dueWorkflows) {
    try {
      const result = await executeWorkflow({
        workflowId: wf.id,
        workspaceId: wf.workspace_id,
        trigger: "schedule",
      });
      results.push({ id: wf.id, status: result.status });

      const nextRun = nextCronOccurrence(wf.schedule, now);
      await (supabase as any)
        .from("workflows")
        .update({ next_run_at: nextRun.toISOString() })
        .eq("id", wf.id);
    } catch (e) {
      results.push({ id: wf.id, status: `error: ${e instanceof Error ? e.message : "unknown"}` });
    }
  }

  return NextResponse.json({ executed: results.length, results });
}

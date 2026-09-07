import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/analytics?period=7d|30d|90d&workspace_id=...
 * Returns aggregated workflow run statistics.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const period = (sp.get("period") || "30d") as "7d" | "30d" | "90d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const workspaceId = sp.get("workspace_id");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const since = new Date(Date.now() - days * 86400_000).toISOString();

  // 1. Total runs in period
  const { data: runs } = await supabase
    .from("workflow_runs")
    .select("id, status, started_at, finished_at, workflow_id, error")
    .eq("workspace_id", workspaceId)
    .gte("started_at", since);

  const allRuns = (runs || []) as Array<{
    id: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    workflow_id: string;
    error: string | null;
  }>;

  const total = allRuns.length;
  const success = allRuns.filter((r) => r.status === "success").length;
  const failed = allRuns.filter((r) => r.status === "failed").length;
  const running = allRuns.filter((r) => r.status === "running").length;
  const successRate = total > 0 ? Math.round((success / total) * 1000) / 10 : 0;

  // 2. Avg duration (ms)
  let totalDuration = 0;
  let durationCount = 0;
  for (const r of allRuns) {
    if (r.finished_at && r.started_at) {
      const ms = new Date(r.finished_at).getTime() - new Date(r.started_at).getTime();
      if (ms > 0 && ms < 3600_000) {
        totalDuration += ms;
        durationCount++;
      }
    }
  }
  const avgDurationMs = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

  // 3. Time series (per day)
  const byDay: Record<string, { total: number; success: number; failed: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    byDay[d] = { total: 0, success: 0, failed: 0 };
  }
  for (const r of allRuns) {
    const day = r.started_at.slice(0, 10);
    if (byDay[day]) {
      byDay[day].total++;
      if (r.status === "success") byDay[day].success++;
      else if (r.status === "failed") byDay[day].failed++;
    }
  }
  const timeSeries = Object.entries(byDay).map(([date, v]) => ({ date, ...v }));

  // 4. Top workflows
  const wfCounts: Record<string, { runs: number; success: number; totalMs: number; msCount: number }> = {};
  for (const r of allRuns) {
    if (!wfCounts[r.workflow_id]) wfCounts[r.workflow_id] = { runs: 0, success: 0, totalMs: 0, msCount: 0 };
    const w = wfCounts[r.workflow_id];
    w.runs++;
    if (r.status === "success") w.success++;
    if (r.finished_at && r.started_at) {
      const ms = new Date(r.finished_at).getTime() - new Date(r.started_at).getTime();
      if (ms > 0 && ms < 3600_000) { w.totalMs += ms; w.msCount++; }
    }
  }
  const workflowIds = Object.keys(wfCounts);
  let topWorkflows: Array<{ workflow_id: string; name: string; runs: number; success_rate: number; avg_ms: number }> = [];
  if (workflowIds.length > 0) {
    const { data: wfData } = await supabase
      .from("workflows")
      .select("id, name")
      .in("id", workflowIds);
    const nameMap = new Map((wfData || []).map((w) => [w.id, w.name]));
    topWorkflows = Object.entries(wfCounts)
      .map(([wid, v]) => ({
        workflow_id: wid,
        name: nameMap.get(wid) || "Unknown",
        runs: v.runs,
        success_rate: v.runs > 0 ? Math.round((v.success / v.runs) * 100) : 0,
        avg_ms: v.msCount > 0 ? Math.round(v.totalMs / v.msCount) : 0,
      }))
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 10);
  }

  // 5. Integration usage (from run_logs node types)
  const { data: logs } = await supabase
    .from("run_logs")
    .select("node_label, status")
    .eq("workspace_id", workspaceId)
    .gte("created_at", since)
    .limit(10000);

  const integrationCounts: Record<string, number> = {};
  for (const log of (logs || []) as Array<{ node_label: string | null; status: string }>) {
    if (!log.node_label) continue;
    const label = log.node_label;
    integrationCounts[label] = (integrationCounts[label] || 0) + 1;
  }
  const integrationUsage = Object.entries(integrationCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    period,
    days,
    totals: { total, success, failed, running, success_rate: successRate, avg_duration_ms: avgDurationMs },
    time_series: timeSeries,
    top_workflows: topWorkflows,
    integration_usage: integrationUsage,
  });
}
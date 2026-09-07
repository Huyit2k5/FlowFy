import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkWorkspaceAdmin } from "@/lib/rbac";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/workspaces/[id]/retention/cleanup
 * Manually trigger retention cleanup (auto-run via cron in production).
 */
export async function POST(_request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: workspaceId } = await params;
  const isAdmin = await checkWorkspaceAdmin(user.id, workspaceId);
  if (!isAdmin) return NextResponse.json({ error: "Chỉ owner/admin" }, { status: 403 });

  // Get retention config
  const { data: sec } = await supabase
    .from("workspace_security")
    .select("retention_days, archive_inactive_days")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const retentionDays = sec?.retention_days ?? 90;
  const archiveDays = sec?.archive_inactive_days ?? 180;

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const archiveCutoff = new Date(Date.now() - archiveDays * 24 * 60 * 60 * 1000).toISOString();

  // 1. Delete old run logs (keep runs but clear detailed logs)
  const oldRuns = await supabase
    .from("workflow_runs")
    .select("id")
    .eq("workspace_id", workspaceId)
    .lt("created_at", cutoff);

  let logsDeleted = 0;
  if (oldRuns.data && oldRuns.data.length > 0) {
    const runIds = oldRuns.data.map((r: any) => r.id);
    const { error: logErr } = await supabase
      .from("run_logs")
      .delete()
      .in("run_id", runIds);
    if (!logErr) logsDeleted = runIds.length;
  }

  // 2. Delete old completed runs (keep running/failed)
  let runsDeleted = 0;
  const { data: completedRuns, error: runErr } = await supabase
    .from("workflow_runs")
    .select("id")
    .eq("workspace_id", workspaceId)
    .lt("created_at", cutoff)
    .in("status", ["completed", "failed"]);

  if (!runErr && completedRuns && completedRuns.length > 0) {
    const ids = completedRuns.map((r: any) => r.id);
    const { error: delErr } = await supabase
      .from("workflow_runs")
      .delete()
      .in("id", ids);
    if (!delErr) runsDeleted = ids.length;
  }

  // 3. Archive inactive workflows (set status to archived)
  let archived = 0;
  const { data: staleWf, error: wfErr } = await supabase
    .from("workflows")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .not("status", "eq", "archived");

  if (!wfErr && staleWf) {
    const idsToArchive: string[] = [];
    for (const wf of staleWf) {
      const { count } = await supabase
        .from("workflow_runs")
        .select("id", { count: "exact", head: true })
        .eq("workflow_id", wf.id)
        .gte("created_at", archiveCutoff);
      if ((count ?? 0) === 0) idsToArchive.push(wf.id);
    }
    if (idsToArchive.length > 0) {
      const { error: archErr } = await supabase
        .from("workflows")
        .update({ status: "archived", is_active: false })
        .in("id", idsToArchive);
      if (!archErr) archived = idsToArchive.length;
    }
  }

  return NextResponse.json({
    ok: true,
    retention_days: retentionDays,
    logs_deleted: logsDeleted,
    runs_deleted: runsDeleted,
    workflows_archived: archived,
  });
}

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/lib/plan-limits";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/[id]/usage — Current usage + alerts
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: workspaceId } = await params;

  // Get workspace plan
  const { data: member } = await supabase
    .from("members")
    .select("workspaces (plan)")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const plan = (member?.workspaces as any)?.plan ?? "free";
  const limits = getPlanLimits(plan);

  // Get security config for quota overrides + alert settings
  const { data: sec } = await supabase
    .from("workspace_security")
    .select("quota_workflows, quota_members, usage_alert_80, usage_alert_95")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const effMembers = sec?.quota_members ?? limits.members;
  const effWorkflows = sec?.quota_workflows ?? limits.workflows;
  const alert80 = sec?.usage_alert_80 ?? true;
  const alert95 = sec?.usage_alert_95 ?? true;

  // Current usage
  const [mCount, wCount, runCount] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active"),
    supabase.from("workflows").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("workflow_runs").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);

  const membersUsed = mCount.count ?? 0;
  const workflowsUsed = wCount.count ?? 0;
  const runsUsed = runCount.count ?? 0;

  const memberPct = effMembers === Infinity ? 0 : (membersUsed / effMembers) * 100;
  const workflowPct = effWorkflows === Infinity ? 0 : (workflowsUsed / effWorkflows) * 100;

  const alerts: string[] = [];
  if (alert95 && memberPct >= 95 && effMembers !== Infinity) alerts.push(`⚠️ Thành viên: ${membersUsed}/${effMembers} (${memberPct.toFixed(0)}%)`);
  if (alert80 && memberPct >= 80 && memberPct < 95 && effMembers !== Infinity) alerts.push(`Thành viên: ${membersUsed}/${effMembers} (${memberPct.toFixed(0)}%)`);
  if (alert95 && workflowPct >= 95 && effWorkflows !== Infinity) alerts.push(`⚠️ Workflow: ${workflowsUsed}/${effWorkflows} (${workflowPct.toFixed(0)}%)`);
  if (alert80 && workflowPct >= 80 && workflowPct < 95 && effWorkflows !== Infinity) alerts.push(`Workflow: ${workflowsUsed}/${effWorkflows} (${workflowPct.toFixed(0)}%)`);

  return NextResponse.json({
    plan,
    usage: {
      members: { used: membersUsed, limit: effMembers, percent: memberPct },
      workflows: { used: workflowsUsed, limit: effWorkflows, percent: workflowPct },
      runs: { used: runsUsed },
    },
    alerts,
  });
}

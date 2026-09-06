import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/lib/plan-limits";

/**
 * Check if user's workspace plan allows creating another workflow.
 * Returns { allowed: boolean, current: number, limit: number, plan: string }
 */
export async function canCreateWorkflow(workspaceId: string) {
  const supabase = await createClient();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", workspaceId)
    .maybeSingle();

  const plan = (ws as { plan?: string } | null)?.plan ?? "free";
  const limits = getPlanLimits(plan);

  if (limits.workflows === Infinity) {
    return { allowed: true, current: 0, limit: Infinity, plan };
  }

  const { count } = await supabase
    .from("workflows")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  const current = count ?? 0;
  return {
    allowed: current < limits.workflows,
    current,
    limit: limits.workflows,
    plan,
  };
}

/**
 * Check if workspace can add another member.
 */
export async function canAddMember(workspaceId: string) {
  const supabase = await createClient();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", workspaceId)
    .maybeSingle();

  const plan = (ws as { plan?: string } | null)?.plan ?? "free";
  const limits = getPlanLimits(plan);

  if (limits.members === Infinity) {
    return { allowed: true, current: 0, limit: Infinity, plan };
  }

  const { count } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "active");

  const current = count ?? 0;
  return {
    allowed: current < limits.members,
    current,
    limit: limits.members,
    plan,
  };
}
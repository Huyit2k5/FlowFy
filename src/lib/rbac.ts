import { createClient } from "@/lib/supabase/server";

/**
 * Enterprise RBAC: 5 roles per-workflow.
 * Hierarchy: viewer < commenter < runner < editor < admin
 * Workspace owner/admin always has full access.
 */

export const RBAC_ROLES = ["viewer", "commenter", "runner", "editor", "admin"] as const;
export type RbacRole = (typeof RBAC_ROLES)[number];

const ROLE_LEVEL: Record<RbacRole, number> = {
  viewer: 0,
  commenter: 1,
  runner: 2,
  editor: 3,
  admin: 4,
};

export function roleAtLeast(role: string, min: RbacRole): boolean {
  if (role === "owner" || role === "admin") return true;
  const level = ROLE_LEVEL[role as RbacRole];
  if (level === undefined) return false;
  return level >= ROLE_LEVEL[min];
}

export interface RbacCheck {
  allowed: boolean;
  reason?: string;
  effectiveRole: string;
}

/**
 * Check if user can perform an action on a workflow.
 * Action → minimum role required:
 * - view: viewer
 * - comment: commenter
 * - run: runner
 * - edit: editor
 * - manage_permissions / delete: admin
 */
export async function checkWorkflowAccess(
  userId: string,
  workspaceId: string,
  workflowId: string,
  action: "view" | "comment" | "run" | "edit" | "admin"
): Promise<RbacCheck> {
  const supabase = await createClient();

  // 1. Check workspace membership
  const { data: membership } = await supabase
    .from("members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return { allowed: false, reason: "Không phải thành viên workspace", effectiveRole: "none" };
  }

  // Workspace owner/admin → full access
  if (membership.role === "owner" || membership.role === "admin") {
    return { allowed: true, effectiveRole: "admin" };
  }

  // 2. Check workflow-specific permission
  const { data: perm } = await supabase
    .from("workflow_permissions")
    .select("role")
    .eq("workflow_id", workflowId)
    .eq("user_id", userId)
    .maybeSingle();

  const effectiveRole = perm?.role ?? "viewer"; // default: viewer for workspace members

  const minRole: RbacRole = action === "view" ? "viewer"
    : action === "comment" ? "commenter"
    : action === "run" ? "runner"
    : action === "edit" ? "editor"
    : "admin";

  const allowed = roleAtLeast(effectiveRole, minRole);

  return {
    allowed,
    reason: allowed ? undefined : `Cần quyền ${minRole}, hiện có ${effectiveRole}`,
    effectiveRole,
  };
}

/**
 * Check if user can manage workspace security settings.
 * Only workspace owner/admin.
 */
export async function checkWorkspaceAdmin(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return data?.role === "owner" || data?.role === "admin";
}

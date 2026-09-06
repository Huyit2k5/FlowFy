import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

/**
 * Log an audit event. Fire-and-forget (doesn't block the request).
 */
export async function logAudit(params: {
  userId?: string;
  workspaceId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
}) {
  try {
    const supabase = await createClient();
    const ip = params.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

    await supabase.from("audit_logs").insert({
      user_id: params.userId ?? null,
      workspace_id: params.workspaceId ?? null,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? {},
      ip_address: ip ?? null,
    });
  } catch (e) {
    // Never let audit logging break the request
    console.error("[AuditLog] Failed to write:", e);
  }
}

/**
 * Quick helpers
 */
export function logLogin(userId: string, request?: NextRequest) {
  return logAudit({ userId, action: "auth.login", request });
}

export function logLogout(userId: string, request?: NextRequest) {
  return logAudit({ userId, action: "auth.logout", request });
}

export function logCreateWorkflow(userId: string, workspaceId: string, workflowId: string, request?: NextRequest) {
  return logAudit({
    userId,
    workspaceId,
    action: "workflow.create",
    entityType: "workflow",
    entityId: workflowId,
    request,
  });
}

export function logDeleteWorkflow(userId: string, workspaceId: string, workflowId: string, request?: NextRequest) {
  return logAudit({
    userId,
    workspaceId,
    action: "workflow.delete",
    entityType: "workflow",
    entityId: workflowId,
    request,
  });
}

export function logInvite(userId: string, workspaceId: string, email: string, request?: NextRequest) {
  return logAudit({
    userId,
    workspaceId,
    action: "member.invite",
    metadata: { email },
    request,
  });
}
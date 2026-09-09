import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkWorkspaceAdmin } from "@/lib/rbac";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: workspaceId } = await params;
  const { data: sec } = await supabase
    .from("workspace_security")
    .select(
      "id, workspace_id, sso_enabled, sso_provider, sso_client_id, sso_redirect_uri, " +
      "enforce_2fa, ip_allowlist, retention_days, archive_inactive_days, " +
      "usage_alert_80, usage_alert_95, quota_workflows, quota_members, " +
      "sso_client_secret, hmac_secret, scim_token"
    )
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  // Never return secrets in full. Expose only whether a value is set.
  const s = sec as Record<string, unknown> | null;
  const sanitized = s
    ? {
        ...s,
        sso_client_secret: s.sso_client_secret ? "********" : "",
        hmac_secret: s.hmac_secret ? "********" : "",
        scim_token: s.scim_token ? "********" : "",
      }
    : null;

  return NextResponse.json({ security: sanitized });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: workspaceId } = await params;
  const isAdmin = await checkWorkspaceAdmin(user.id, workspaceId);
  if (!isAdmin) return NextResponse.json({ error: "Chỉ owner/admin" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const allowed: string[] = [
    "sso_enabled", "sso_provider", "sso_client_id", "sso_client_secret", "sso_redirect_uri",
    "enforce_2fa", "ip_allowlist", "hmac_secret", "scim_token",
    "retention_days", "archive_inactive_days",
    "usage_alert_80", "usage_alert_95",
    "quota_workflows", "quota_members",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("workspace_security")
    .upsert({ workspace_id: workspaceId, ...updates }, { onConflict: "workspace_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const s = data as Record<string, unknown>;
  return NextResponse.json({
    security: {
      ...s,
      sso_client_secret: s.sso_client_secret ? "********" : "",
      hmac_secret: s.hmac_secret ? "********" : "",
      scim_token: s.scim_token ? "********" : "",
    },
  });
}

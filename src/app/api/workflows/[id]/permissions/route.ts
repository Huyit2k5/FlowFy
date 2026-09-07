import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkWorkflowAccess, RBAC_ROLES } from "@/lib/rbac";

/**
 * GET /api/workflows/[id]/permissions
 * PUT /api/workflows/[id]/permissions  { user_id, role }
 * DELETE /api/workflows/[id]/permissions?id=...
 */

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: workflowId } = await params;
  const { data: wf } = await supabase.from("workflows").select("workspace_id").eq("id", workflowId).maybeSingle();
  if (!wf) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("workflow_permissions")
    .select("*, user:profiles(id, username)")
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ permissions: data ?? [] });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: workflowId } = await params;
  const { data: wf } = await supabase.from("workflows").select("workspace_id").eq("id", workflowId).maybeSingle();
  if (!wf) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const access = await checkWorkflowAccess(user.id, wf.workspace_id, workflowId, "admin");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.user_id || !body?.role) {
    return NextResponse.json({ error: "user_id and role required" }, { status: 400 });
  }
  if (!RBAC_ROLES.includes(body.role)) {
    return NextResponse.json({ error: `role must be one of: ${RBAC_ROLES.join(", ")}` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("workflow_permissions")
    .upsert(
      { workflow_id: workflowId, user_id: body.user_id, role: body.role },
      { onConflict: "workflow_id,user_id" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ permission: data });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: workflowId } = await params;
  const { data: wf } = await supabase.from("workflows").select("workspace_id").eq("id", workflowId).maybeSingle();
  if (!wf) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const access = await checkWorkflowAccess(user.id, wf.workspace_id, workflowId, "admin");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("workflow_permissions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
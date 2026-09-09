import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/templates/[id]/install
 * Install a public template: duplicate it into the user's workspace as a new workflow.
 * Increments the source template's install_count.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: templateId } = await params;
  const body = await request.json().catch(() => null);
  const wsId = body?.workspace_id ?? request.nextUrl.searchParams.get("workspace_id");
  if (!wsId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  // Verify user is a member of the target workspace
  const { data: membership, error: memErr } = await supabase
    .from("members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("workspace_id", wsId)
    .eq("status", "active")
    .maybeSingle();
  if (memErr || !membership) return NextResponse.json({ error: "Không có quyền trong workspace này" }, { status: 403 });

  // Fetch the public template
  const { data: template, error: fetchErr } = await supabase
    .from("workflow_templates")
    .select("*")
    .eq("id", templateId)
    .eq("is_public", true)
    .single();
  if (fetchErr || !template) return NextResponse.json({ error: "Template không tồn tại hoặc chưa public" }, { status: 404 });

  // Check plan limits for workflows
  const { data: ws } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", wsId)
    .maybeSingle();
  const plan = (ws as { plan?: string } | null)?.plan ?? "free";
  const limits = getPlanLimits(plan);
  if (limits.workflows !== Infinity) {
    const { count } = await supabase
      .from("workflows")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", wsId);
    if ((count ?? 0) >= limits.workflows) {
      return NextResponse.json({ error: `Gói ${plan} chỉ cho phép tối đa ${limits.workflows} workflow` }, { status: 403 });
    }
  }

  // Create the workflow
  const { data: workflow, error: wfErr } = await supabase
    .from("workflows")
    .insert({
      workspace_id: wsId,
      name: template.name,
      description: template.description,
      trigger_type: "manual",
      status: "draft",
      created_by: user.id,
    })
    .select()
    .single();
  if (wfErr) return NextResponse.json({ error: wfErr.message }, { status: 500 });

  const nodesArr = (template.nodes ?? []) as Array<{ id: string; type: string; label: string; position: { x: number; y: number }; data: Record<string, unknown> }>;
  const edgesArr = (template.edges ?? []) as Array<{ id: string; source: string; target: string; label?: string }>;

  const { error: nodeErr } = await supabase
    .from("workflow_nodes")
    .insert({ workflow_id: workflow.id, nodes: nodesArr, edges: edgesArr, version: 1 });
  if (nodeErr) return NextResponse.json({ error: nodeErr.message }, { status: 500 });

  // Increment install count
  await supabase
    .from("workflow_templates")
    .update({ install_count: (template.install_count ?? 0) + 1 })
    .eq("id", templateId);

  return NextResponse.json({ workflow }, { status: 201 });
}

function getPlanLimits(plan: string) {
  const limits: Record<string, { workflows: number; members: number }> = {
    free: { workflows: 5, members: 3 },
    pro: { workflows: Infinity, members: Infinity },
    enterprise: { workflows: Infinity, members: Infinity },
  };
  return limits[plan] ?? limits.free;
}

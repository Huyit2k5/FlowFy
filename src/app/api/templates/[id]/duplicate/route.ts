import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/templates/[id]/duplicate?workspace_id=...
 * Duplicates a template into a new workflow.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: templateId } = await params;
  const wsId = request.nextUrl.searchParams.get("workspace_id");
  if (!wsId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const { data: template, error: fetchErr } = await supabase
    .from("workflow_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (fetchErr || !template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const { data: workflow, error: wfErr } = await supabase
    .from("workflows")
    .insert({
      workspace_id: wsId,
      name: `${template.name} (copy)`,
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

  return NextResponse.json({ workflow }, { status: 201 });
}
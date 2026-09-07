import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkWorkspaceAdmin } from "@/lib/rbac";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/[id]/export — Export toàn bộ workspace (workflows + nodes + runs)
 * Returns JSON download.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: workspaceId } = await params;
  const isAdmin = await checkWorkspaceAdmin(user.id, workspaceId);
  if (!isAdmin) return NextResponse.json({ error: "Chỉ owner/admin" }, { status: 403 });

  const sp = request.nextUrl.searchParams;
  const includeRuns = sp.get("include_runs") !== "false";

  // Workflows
  const { data: workflows, error: wfErr } = await supabase
    .from("workflows")
    .select("*")
    .eq("workspace_id", workspaceId);
  if (wfErr) return NextResponse.json({ error: wfErr.message }, { status: 500 });

  // Workflow nodes/edges
  const wfIds = (workflows ?? []).map((w: any) => w.id);
  let nodesData: any[] = [];
  if (wfIds.length > 0) {
    const { data: nodes } = await supabase
      .from("workflow_nodes")
      .select("*")
      .in("workflow_id", wfIds);
    nodesData = nodes ?? [];
  }

  // Runs (optional)
  let runsData: any[] = [];
  if (includeRuns) {
    const { data: runs } = await supabase
      .from("workflow_runs")
      .select("*")
      .in("workflow_id", wfIds)
      .limit(10000);
    runsData = runs ?? [];
  }

  // Security config
  const { data: security } = await supabase
    .from("workspace_security")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const exportData = {
    exported_at: new Date().toISOString(),
    workspace: {
      id: workspaceId,
      plan: null, // fetched separately
    },
    workflows: workflows ?? [],
    nodes: nodesData,
    runs: runsData,
    security: security ?? null,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="flowly-export-${workspaceId.slice(0, 8)}.json"`,
    },
  });
}

/**
 * POST /api/workspaces/[id]/import — Import workspace data from JSON
 */
export async function POST(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: workspaceId } = await params;
  const isAdmin = await checkWorkspaceAdmin(user.id, workspaceId);
  if (!isAdmin) return NextResponse.json({ error: "Chỉ owner/admin" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body?.workflows) {
    return NextResponse.json({ error: "Expected { workflows: [...] }" }, { status: 400 });
  }

  const created: string[] = [];
  for (const wf of body.workflows) {
    const { data: newWf, error } = await supabase
      .from("workflows")
      .insert({
        workspace_id: workspaceId,
        name: wf.name,
        description: wf.description ?? "",
        trigger_type: wf.trigger_type ?? "manual",
        status: "draft",
        is_active: false,
      })
      .select()
      .single();

    if (error || !newWf) continue;
    created.push(newWf.id);

    // Insert nodes
    const wfNodes = (body.nodes ?? []).filter((n: any) => n.workflow_id === wf.id);
    if (wfNodes.length > 0) {
      const first = wfNodes[0];
      await supabase.from("workflow_nodes").upsert({
        workflow_id: newWf.id,
        nodes: first.nodes ?? [],
        edges: first.edges ?? [],
      }, { onConflict: "workflow_id" });
    }
  }

  return NextResponse.json({ imported: created.length, workflow_ids: created });
}

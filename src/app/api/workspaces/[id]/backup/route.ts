import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkWorkspaceAdmin } from "@/lib/rbac";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/[id]/backup — Trigger backup (in production: Supabase PITR)
 * For now: returns export JSON (same as /export) + metadata
 */
export async function GET(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: workspaceId } = await params;
  const isAdmin = await checkWorkspaceAdmin(user.id, workspaceId);
  if (!isAdmin) return NextResponse.json({ error: "Chỉ owner/admin" }, { status: 403 });

  // Count data
  const [wfCount, runCount] = await Promise.all([
    supabase.from("workflows").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("workflow_runs").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);

  return NextResponse.json({
    ok: true,
    message: "Sử dụng /api/workspaces/[id]/export để export data",
    backup_info: {
      workspace_id: workspaceId,
      workflows: wfCount.count ?? 0,
      runs: runCount.count ?? 0,
      last_backup: null,
      pitr_available: false,
    },
  });
}

/**
 * POST /api/workspaces/[id]/restore — Restore from backup JSON
 * (Same as import in /export route)
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

  let restored = 0;
  for (const wf of body.workflows) {
    const { data: newWf, error } = await supabase
      .from("workflows")
      .insert({
        workspace_id: workspaceId,
        name: `${wf.name} (restored)`,
        description: wf.description ?? "",
        trigger_type: wf.trigger_type ?? "manual",
        status: "draft",
        is_active: false,
      })
      .select()
      .single();

    if (error || !newWf) continue;
    restored++;

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

  return NextResponse.json({ restored, message: `Đã khôi phục ${restored} workflow` });
}

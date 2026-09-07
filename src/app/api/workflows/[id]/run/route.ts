import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeWorkflow } from "@/lib/workflow-engine";
import { checkWorkflowAccess } from "@/lib/rbac";
import { checkIpAccess } from "@/lib/ip-enforce";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await params;

  // Lấy workflow để có workspace_id
  const { data: wf } = await supabase
    .from("workflows")
    .select("id, workspace_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!wf) {
    return NextResponse.json({ error: "Không tìm thấy workflow" }, { status: 404 });
  }

  const workflow = wf as { id: string; workspace_id: string; status: string };

  // IP Allowlist check
  const ipCheck = await checkIpAccess(request, supabase, workflow.workspace_id);
  if (!ipCheck.allowed) {
    return NextResponse.json({ error: ipCheck.reason }, { status: 403 });
  }

  // RBAC: cần quyền runner
  const access = await checkWorkflowAccess(user.id, workflow.workspace_id, id, "run");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  try {
    const result = await executeWorkflow({
      workflowId: workflow.id,
      workspaceId: workflow.workspace_id,
      trigger: "manual",
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi khi chạy workflow" },
      { status: 500 }
    );
  }
}
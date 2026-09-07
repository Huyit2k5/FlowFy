import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@/lib/supabase/admin";
import { executeWorkflow } from "@/lib/workflow-engine";
import { checkWorkflowAccess } from "@/lib/rbac";
import { checkIpAccess } from "@/lib/ip-enforce";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Service-role bypass (called by Supabase Edge Function for scheduled runs)
  const serviceRoleHeader = request.headers.get("x-service-role");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceRoleHeader && serviceKey && serviceRoleHeader === serviceKey) {
    return handleServiceRun(request, id);
  }

  // Normal user auth path
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { data: wf } = await supabase
    .from("workflows")
    .select("id, workspace_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!wf) {
    return NextResponse.json({ error: "Không tìm thấy workflow" }, { status: 404 });
  }

  const workflow = wf as { id: string; workspace_id: string; status: string };

  const ipCheck = await checkIpAccess(request, supabase, workflow.workspace_id);
  if (!ipCheck.allowed) {
    return NextResponse.json({ error: ipCheck.reason }, { status: 403 });
  }

  const access = await checkWorkflowAccess(user.id, workflow.workspace_id, id, "run");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const trigger = (body as { trigger?: string }).trigger ?? "manual";
    const result = await executeWorkflow({
      workflowId: workflow.id,
      workspaceId: workflow.workspace_id,
      trigger,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi khi chạy workflow" },
      { status: 500 }
    );
  }
}

async function handleServiceRun(request: NextRequest, workflowId: string) {
  const service = createServiceClient();

  const { data: wf } = await service
    .from("workflows")
    .select("id, workspace_id")
    .eq("id", workflowId)
    .maybeSingle();

  if (!wf) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const workflow = wf as { id: string; workspace_id: string };
  const body = await request.json().catch(() => ({}));
  const trigger = (body as { trigger?: string }).trigger ?? "schedule";

  try {
    const result = await executeWorkflow({
      workflowId: workflow.id,
      workspaceId: workflow.workspace_id,
      trigger,
    });
    return NextResponse.json({ success: true, run: result });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Execution failed" },
      { status: 500 }
    );
  }
}

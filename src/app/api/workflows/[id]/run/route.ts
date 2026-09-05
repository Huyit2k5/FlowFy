import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeWorkflow } from "@/lib/workflow-engine";

export async function POST(
  _request: NextRequest,
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
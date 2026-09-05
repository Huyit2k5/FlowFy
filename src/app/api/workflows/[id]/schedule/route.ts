import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scheduleWorkflowJob, getQueue } from "@/lib/workflow-queue";

/**
 * PUT: bật/tắt schedule cho workflow.
 * Body: { cron: "0 9 * * 1-5", enabled: true/false }
 */
export async function PUT(
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
  const body = await request.json();
  const { cron, enabled } = body as { cron?: string; enabled?: boolean };

  const { data: wf } = await supabase
    .from("workflows")
    .select("id, workspace_id, trigger_type")
    .eq("id", id)
    .maybeSingle();

  if (!wf) {
    return NextResponse.json({ error: "Không tìm thấy workflow" }, { status: 404 });
  }

  const workflow = wf as {
    id: string;
    workspace_id: string;
    trigger_type: string;
  };

  // Nếu tắt schedule
  if (enabled === false) {
    await supabase
      .from("workflows")
      .update({ schedule: null, schedule_enabled: false })
      .eq("id", id);

    // Xóa job scheduler
    try {
      const queue = getQueue();
      await queue.removeJobScheduler(`wf-${id}`);
    } catch {
      // Redis chưa sẵn sàng — ignore
    }

    return NextResponse.json({ ok: true, message: "Đã tắt lịch chạy" });
  }

  // Bật schedule
  if (!cron) {
    return NextResponse.json({ error: "Cần cron expression" }, { status: 400 });
  }

  await supabase
    .from("workflows")
    .update({ schedule: cron, schedule_enabled: true, trigger_type: "schedule" })
    .eq("id", id);

  try {
    await scheduleWorkflowJob({
      workflowId: id,
      workspaceId: workflow.workspace_id,
      trigger: "schedule",
      cron,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Redis chưa sẵn sàng: ${e instanceof Error ? e.message : "Lỗi"}` },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, message: "Đã bật lịch chạy" });
}
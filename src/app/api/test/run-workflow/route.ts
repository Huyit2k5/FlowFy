import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Test endpoint — DÙNG RIÊNG CHO TESTING, XÓA TRƯỚC KHI DEPLOY.
 * Tạo workflow test + chạy để verify engine hoạt động.
 */
export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    // 1) Lấy user đầu tiên (hoặc tạo test user)
    const { data: users } = await supabase
      .from("profiles")
      .select("id, email")
      .limit(1);

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "Không có user nào. Đăng ký 1 user trước." }, { status: 400 });
    }

    const userId = users[0].id;

    // 2) Lấy workspace đầu tiên của user
    const { data: member } = await supabase
      .from("members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: "User chưa có workspace" }, { status: 400 });
    }

    const workspaceId = member.workspace_id;

    // 3) Tạo workflow test
    const workflowName = `Test Workflow ${new Date().toLocaleTimeString("vi-VN")}`;
    const { data: wf, error: wfErr } = await supabase
      .from("workflows")
      .insert({
        workspace_id: workspaceId,
        name: workflowName,
        description: "Test tự động - xóa sau khi test",
        trigger_type: "manual",
        status: "active",
        created_by: userId,
      })
      .select()
      .single();

    if (wfErr || !wf) {
      return NextResponse.json({ error: `Tạo workflow lỗi: ${wfErr?.message}` }, { status: 500 });
    }

    const workflowId = wf.id;

    // 4) Tạo nodes: Trigger → Delay(2s) → Slack (mock)
    const nodes = [
      {
        id: "trigger_1",
        type: "trigger",
        label: "Bắt đầu",
        position: { x: 100, y: 200 },
        data: { triggerType: "manual" },
      },
      {
        id: "delay_1",
        type: "delay",
        label: "Đợi 2 giây",
        position: { x: 350, y: 200 },
        data: { seconds: 2 },
      },
      {
        id: "webhook_1",
        type: "webhook",
        label: "Gọi API test",
        position: { x: 600, y: 200 },
        data: {
          method: "GET",
          url: "https://httpbin.org/get",
          timeout: 10,
        },
      },
    ];

    const edges = [
      { id: "e1", source: "trigger_1", target: "delay_1" },
      { id: "e2", source: "delay_1", target: "webhook_1" },
    ];

    const { error: nodesErr } = await supabase
      .from("workflow_nodes")
      .insert({
        workflow_id: workflowId,
        nodes,
        edges,
      });

    if (nodesErr) {
      return NextResponse.json({ error: `Tạo nodes lỗi: ${nodesErr.message}` }, { status: 500 });
    }

    // 5) Chạy workflow (pass service role client để bypass RLS)
    const { executeWorkflow } = await import("@/lib/workflow-engine");
    const result = await executeWorkflow({
      workflowId,
      workspaceId,
      trigger: "manual",
      supabase,
    });

    // 6) Xóa workflow test (giữ lại nếu muốn xem log)
    // await supabase.from("workflows").delete().eq("id", workflowId);

    return NextResponse.json({
      success: true,
      message: "Test hoàn thành!",
      workflowId,
      workflowName,
      result,
      workflowUrl: `/app/${workspaceId}/workflows/${workflowId}`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
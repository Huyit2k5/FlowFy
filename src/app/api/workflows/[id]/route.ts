import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  updateWorkflow,
  deleteWorkflow,
  saveWorkflowNodes,
  getWorkflow,
} from "@/lib/workflow-db";
import type { WorkflowNode, WorkflowEdge } from "@/lib/workflow-types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wf = await getWorkflow(id);
  if (!wf) {
    return NextResponse.json({ error: "Không tìm thấy workflow" }, { status: 404 });
  }
  return NextResponse.json({ workflow: wf });
}

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

  try {
    // Cập nhật metadata
    if (body.name || body.description || body.trigger_type || body.status) {
      await updateWorkflow(id, {
        name: body.name,
        description: body.description,
        trigger_type: body.trigger_type,
        status: body.status,
      });
    }

    // Cập nhật nodes/edges
    if (body.nodes !== undefined || body.edges !== undefined) {
      await saveWorkflowNodes(
        id,
        (body.nodes ?? []) as WorkflowNode[],
        (body.edges ?? []) as WorkflowEdge[]
      );
    }

    const updated = await getWorkflow(id);
    return NextResponse.json({ workflow: updated });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi cập nhật" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
  try {
    await deleteWorkflow(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi xoá" },
      { status: 500 }
    );
  }
}
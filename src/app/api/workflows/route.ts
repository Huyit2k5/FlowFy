import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWorkflow } from "@/lib/workflow-db";
import { getPlanLimits } from "@/lib/plan-limits";
import { z } from "zod";
import { logCreateWorkflow } from "@/lib/audit-log";

const createWorkflowSchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  trigger_type: z.enum(["manual", "webhook", "schedule"]).optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "Thiếu workspace_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ workflows: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { workspace_id, name, description, trigger_type } = parsed.data;

  // Kiểm tra giới hạn workflow theo gói
  const { data: ws } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", workspace_id)
    .maybeSingle();

  const plan = (ws as { plan: string } | null)?.plan ?? "free";
  const limits = getPlanLimits(plan);

  const { count } = await supabase
    .from("workflows")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace_id);

  if ((count ?? 0) >= limits.workflows) {
    return NextResponse.json(
      {
        error: `Gói ${plan} chỉ cho phép tối đa ${limits.workflows} workflow. Hãy nâng cấp gói để tạo thêm.`,
      },
      { status: 403 }
    );
  }

  try {
    const wf = await createWorkflow({
      workspace_id,
      name,
      description: description || undefined,
      trigger_type: trigger_type ?? "manual",
      created_by: user.id,
    });
    // Audit log (fire-and-forget)
    logCreateWorkflow(user.id, workspace_id, wf.id, request);
    return NextResponse.json({ workflow: wf }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi tạo workflow" },
      { status: 500 }
    );
  }
}
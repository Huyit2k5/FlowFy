import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWorkflow } from "@/lib/workflow-db";

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

  const body = await request.json();
  const { workspace_id, name, description, trigger_type } = body;

  if (!workspace_id || !name) {
    return NextResponse.json(
      { error: "Cần workspace_id và name" },
      { status: 400 }
    );
  }

  try {
    const wf = await createWorkflow({
      workspace_id,
      name,
      description,
      trigger_type: trigger_type ?? "manual",
      created_by: user.id,
    });
    return NextResponse.json({ workflow: wf }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi tạo workflow" },
      { status: 500 }
    );
  }
}
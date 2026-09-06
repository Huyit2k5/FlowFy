import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET: Lấy tất cả integrations của workspace.
 * ?workspace_id=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "Thiếu workspace_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ integrations: data ?? [] });
}

/**
 * POST: Tạo hoặc cập nhật integration.
 * Body: { workspace_id, type, name, config, is_active }
 * Nếu đã có integration cùng type → update, chưa có → create.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = await request.json();
  const { workspace_id, type, name, config, is_active } = body;

  if (!workspace_id || !type) {
    return NextResponse.json(
      { error: "Cần workspace_id và type" },
      { status: 400 }
    );
  }

  const validTypes = ["slack", "email", "notion", "webhook"];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Type phải là: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  // Kiểm tra có tồn tại integration cùng type không
  const { data: existing } = await supabase
    .from("integrations")
    .select("id")
    .eq("workspace_id", workspace_id)
    .eq("type", type)
    .maybeSingle();

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from("integrations")
      .update({ name: name ?? type, config: config ?? {}, is_active: is_active ?? true })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ integration: data });
  } else {
    // Create
    const { data, error } = await supabase
      .from("integrations")
      .insert({
        workspace_id,
        type,
        name: name ?? type,
        config: config ?? {},
        is_active: is_active ?? true,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ integration: data }, { status: 201 });
  }
}

/**
 * DELETE: Xóa integration.
 * ?id=xxx
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("integrations").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
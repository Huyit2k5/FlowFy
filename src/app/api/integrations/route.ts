import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const integrationSchema = z.object({
  workspace_id: z.string().uuid(),
  type: z.enum(["slack", "email", "notion", "webhook"]),
  name: z.string().max(100).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

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

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = integrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { workspace_id, type, name, config, is_active } = parsed.data;

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
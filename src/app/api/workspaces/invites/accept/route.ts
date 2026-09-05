import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Xác nhận lời mời: khi user đăng ký/đăng nhập và có email khớp invite,
 * convert invite (status invited) thành member active.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const formData = await request.formData();
  const workspaceId = String(formData.get("workspace_id") ?? "");

  if (!workspaceId) {
    return NextResponse.json({ error: "Thiếu thông tin." }, { status: 400 });
  }

  // Tìm invite khớp email của user trong workspace này
  const { data: invite } = await supabase
    .from("members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("invited_email", user.email ?? "")
    .eq("status", "invited")
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy lời mời." }, { status: 404 });
  }

  // Convert thành member active
  const { error } = await supabase
    .from("members")
    .update({ user_id: user.id, status: "active", invited_email: null })
    .eq("id", invite.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
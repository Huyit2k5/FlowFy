import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Mời thành viên vào workspace bằng email (chỉ owner/admin).
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
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = formData.get("role") === "admin" ? "admin" : "member";

  if (!workspaceId || !email) {
    return NextResponse.json({ error: "Thiếu thông tin." }, { status: 400 });
  }

  // Kiểm tra quyền: chỉ owner/admin mới được mời
  const { data: me } = await supabase
    .from("members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!me || !["owner", "admin"].includes(me.role)) {
    return NextResponse.json({ error: "Bạn không có quyền mời thành viên." }, { status: 403 });
  }

  const { error } = await supabase.from("members").insert({
    workspace_id: workspaceId,
    user_id: null as unknown as string, // placeholder, sẽ cập nhật khi user xác nhận
    invited_email: email,
    role,
    status: "invited",
  });

  if (error) {
    // Nếu user đã tồn tại và là thành viên, thông báo
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
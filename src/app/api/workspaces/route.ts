import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Tạo workspace mới + member (owner) cho user hiện tại.
 * Dùng cho onboarding sau khi đăng ký.
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
  const name = String(formData.get("workspace_name") ?? "").trim() || "Workspace của tôi";

  // Gọi RPC create_workspace (security definer, bypass RLS)
  const { data, error } = await supabase.rpc("create_workspace", {
    p_name: name,
    p_user: user.id,
  });

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Không thể tạo workspace." },
      { status: 500 }
    );
  }

  return NextResponse.json({ workspaceId: data });
}
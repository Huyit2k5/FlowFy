import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/activity?workspace_id=...&action=...&limit=...
 * Returns recent audit log entries for the workspace.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const wsId = sp.get("workspace_id");
  if (!wsId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const action = sp.get("action");
  const limit = Math.min(parseInt(sp.get("limit") || "50", 10), 100);

  let query = supabase
    .from("audit_logs")
    .select("*, user:profiles(id, username)")
    .eq("workspace_id", wsId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (action && action !== "all") {
    query = query.eq("action", action);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activities: data ?? [] });
}
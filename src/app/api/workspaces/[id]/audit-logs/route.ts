import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkWorkspaceAdmin } from "@/lib/rbac";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/[id]/audit-logs?from=...&to=...&action=...&user=...&format=csv|json&limit=...
 */
export async function GET(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: workspaceId } = await params;
  const isAdmin = await checkWorkspaceAdmin(user.id, workspaceId);
  if (!isAdmin) return NextResponse.json({ error: "Chỉ owner/admin" }, { status: 403 });

  const sp = request.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const action = sp.get("action");
  const userId = sp.get("user");
  const format = sp.get("format") ?? "json";
  const limit = Math.min(parseInt(sp.get("limit") ?? "1000", 10), 10000);

  let query = supabase
    .from("audit_logs")
    .select("*, user:profiles(username)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (action) query = query.eq("action", action);
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const logs = data ?? [];

  if (format === "csv") {
    const header = "timestamp,username,action,entity_type,entity_id,detail,ip";
    const rows = logs.map((log: any) =>
      [
        log.created_at,
        log.user?.username ?? log.user_id ?? "system",
        log.action,
        log.entity_type ?? "",
        log.entity_id ?? "",
        `"${(log.detail ?? "").replace(/"/g, '""')}"`,
        log.ip_address ?? "",
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-logs-${workspaceId.slice(0, 8)}.csv"`,
      },
    });
  }

  return NextResponse.json({ logs, count: logs.length });
}

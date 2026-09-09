import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/templates/marketplace
 * List public templates from the marketplace.
 * Query params: category, search, sort (installs|newest|name), page, limit
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  // Allow anonymous browsing of public templates (no auth required)

  const sp = request.nextUrl.searchParams;
  const category = sp.get("category");
  const search = sp.get("search");
  const sort = sp.get("sort") ?? "installs";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") ?? "12", 10)));
  const offset = (page - 1) * limit;

  // Query public templates directly (RLS allows reading is_public=true)
  let query = supabase
    .from("workflow_templates")
    .select("id, name, description, category, install_count, author_name, author_avatar, published_at, workspace_id, nodes, edges, workspaces(name)", { count: "exact" })
    .eq("is_public", true)
    .order("install_count", { ascending: false });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    query = query.or(`name.ilike.%${s}%,description.ilike.%${s}%`);
  }

  if (sort === "newest") {
    query = query.order("published_at", { ascending: false, nullsFirst: false });
  } else if (sort === "name") {
    query = query.order("name", { ascending: true });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform: flatten workspaces relation
  const templates = (data ?? []).map((t) => ({
    ...t,
    workspace_name: (t as { workspaces?: { name?: string } }).workspaces?.name ?? null,
    nodes: (t as { nodes: unknown[] }).nodes ?? [],
    edges: (t as { edges: unknown[] }).edges ?? [],
  }));

  return NextResponse.json({
    templates,
    total: count ?? 0,
    page,
    limit,
    hasMore: offset + templates.length < (count ?? 0),
  });
}

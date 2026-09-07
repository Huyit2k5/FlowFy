import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/workflows/[id]/nodes/[nodeId]/comments
 * POST /api/workflows/[id]/nodes/[nodeId]/comments  { body: "..." }
 * DELETE /api/workflows/[id]/nodes/[nodeId]/comments?id=...
 */

interface Params {
  params: Promise<{ id: string; nodeId: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: workflowId, nodeId } = await params;
  const { data, error } = await supabase
    .from("node_comments")
    .select("*, user:profiles(id, username)")
    .eq("workflow_id", workflowId)
    .eq("node_id", nodeId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: workflowId, nodeId } = await params;
  const body = await request.json().catch(() => null);
  if (!body?.body || typeof body.body !== "string" || !body.body.trim()) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("node_comments")
    .insert({ workflow_id: workflowId, node_id: nodeId, user_id: user.id, body: body.body.trim().slice(0, 500) })
    .select("*, user:profiles(id, username)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { nodeId: _nodeId } = await params;
  const commentId = request.nextUrl.searchParams.get("id");
  if (!commentId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("node_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
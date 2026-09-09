import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const publishSchema = z.object({
  is_public: z.boolean(),
  category: z.enum(["crm", "marketing", "operations", "hr", "finance", "general"]).optional(),
  author_name: z.string().max(100).optional(),
});

/**
 * PATCH /api/templates/[id]/publish
 * Publish or unpublish a template to the marketplace.
 * Only the template creator can do this.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id: templateId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });

  // Fetch the template to verify ownership
  const { data: template, error: fetchErr } = await supabase
    .from("workflow_templates")
    .select("id, workspace_id, created_by, name, description, nodes, edges")
    .eq("id", templateId)
    .single();
  if (fetchErr || !template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  if (template.created_by !== user.id) {
    return NextResponse.json({ error: "Chỉ tác giả template mới có thể publish" }, { status: 403 });
  }

  const { is_public, category, author_name } = parsed.data;

  const updatePayload: Record<string, unknown> = {
    is_public,
    published_at: is_public ? new Date().toISOString() : null,
  };
  if (category) updatePayload.category = category;
  if (author_name) updatePayload.author_name = author_name;

  // If publishing, default author_name to user's email prefix if not set
  if (is_public && !author_name) {
    updatePayload.author_name = user.email?.split("@")[0] ?? "Unknown";
  }

  const { data: updated, error: upErr } = await supabase
    .from("workflow_templates")
    .update(updatePayload)
    .eq("id", templateId)
    .select()
    .single();
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ template: updated });
}

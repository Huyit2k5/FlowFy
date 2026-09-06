import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createPublicClient } from "@supabase/supabase-js";
import { executeWorkflow } from "@/lib/workflow-engine";
import crypto from "crypto";

function getServiceClient() {
  return createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Public webhook endpoint — không cần auth.
 * Service ngoài (GitHub, Shopify, Zapier...) POST vào để chạy workflow.
 *
 * URL: POST /api/webhooks/:workflowId
 * Body: JSON bất kỳ (pass vào trigger data)
 *
 * Hoặc dùng token: /api/webhooks/:workflowId?token=xxx
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();

  // Lấy workflow (dùng service role để bypass RLS — public endpoint)
  const { data: wf } = await supabase
    .from("workflows")
    .select("id, workspace_id, status, trigger_type, webhook_token")
    .eq("id", id)
    .maybeSingle();

  if (!wf) {
    return NextResponse.json({ error: "Workflow không tồn tại" }, { status: 404 });
  }

  const workflow = wf as {
    id: string;
    workspace_id: string;
    status: string;
    trigger_type: string;
    webhook_token: string | null;
  };

  // Nếu workflow có trigger_type = webhook, kiểm tra token
  if (workflow.trigger_type === "webhook" && workflow.webhook_token) {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (token !== workflow.webhook_token) {
      return NextResponse.json({ error: "Token không hợp lệ" }, { status: 403 });
    }
  }

  // Workflow phải active
  if (workflow.status !== "active") {
    return NextResponse.json({ error: "Workflow không active" }, { status: 400 });
  }

  // Parse body
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // body rỗng hoặc không phải JSON — vẫn chạy
  }

  try {
    const result = await executeWorkflow({
      workflowId: workflow.id,
      workspaceId: workflow.workspace_id,
      trigger: "webhook",
      input: body,
      supabase,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi chạy workflow" },
      { status: 500 }
    );
  }
}

/**
 * GET: trả về webhook URL + token (chỉ cho user đã login).
 * Dùng để copy URL vào config.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { data: wf } = await supabase
    .from("workflows")
    .select("id, workspace_id, webhook_token")
    .eq("id", id)
    .maybeSingle();

  if (!wf) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }

  // Generate token nếu chưa có
  let token = (wf as { webhook_token: string | null }).webhook_token;
  if (!token) {
    token = crypto.randomBytes(24).toString("hex");
    await supabase.from("workflows").update({ webhook_token: token }).eq("id", id);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/webhooks/${id}?token=${token}`;

  return NextResponse.json({ webhookUrl, token });
}
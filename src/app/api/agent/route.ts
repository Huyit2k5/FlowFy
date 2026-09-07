import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAgent } from "@/lib/agent/agent";
import type { AgentMessage } from "@/lib/agent/tools";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const { message, workspaceId, workflowId, mode = "create", history } = body;

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  try {
    const result = await runAgent(
      {
        message,
        workspaceId,
        workflowId,
        mode: mode as "create" | "edit" | "explain",
        history: history as AgentMessage[] | undefined,
      },
      supabase
    );

    return NextResponse.json({
      response: result.response,
      workflow: result.workflow ?? null,
      mode: result.mode,
      toolCalls: result.toolCalls,
      confidence: result.confidence,
      source: result.source,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Agent error" },
      { status: 500 }
    );
  }
}

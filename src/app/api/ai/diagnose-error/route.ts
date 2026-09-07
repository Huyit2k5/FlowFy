import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const diagnoseSchema = z.object({
  run_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
});

/**
 * POST /api/ai/diagnose-error
 * Input: run_id + workspace_id
 * Output: { diagnosis: string, suggestions: string[], failedNode: string }
 *
 * Reads run_logs for the failed run, sends to LLM for diagnosis.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = diagnoseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { run_id, workspace_id } = parsed.data;

  // Get run + logs
  const { data: run } = await supabase
    .from("workflow_runs")
    .select("*")
    .eq("id", run_id)
    .eq("workspace_id", workspace_id)
    .single();

  if (!run) {
    return NextResponse.json({ error: "Không tìm thấy run" }, { status: 404 });
  }

  const { data: logs } = await supabase
    .from("run_logs")
    .select("*")
    .eq("run_id", run_id)
    .order("created_at", { ascending: true });

  const failedLog = (logs ?? []).find((l: { status: string }) => l.status === "failed");
  if (!failedLog) {
    return NextResponse.json({
      diagnosis: "Không có node lỗi trong run này.",
      suggestions: [],
      failedNode: null,
    });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  // Without LLM: return basic diagnosis
  if (!openaiKey && !deepseekKey) {
    return NextResponse.json({
      diagnosis: `Node "${(failedLog as { node_label?: string }).node_label}" thất bại: ${(failedLog as { error?: string }).error}`,
      suggestions: [
        "Kiểm tra config của node này",
        "Xác nhận API key / URL đúng",
        "Thử chạy lại với input đơn giản hơn",
      ],
      failedNode: (failedLog as { node_id: string }).node_id,
      source: "basic",
    });
  }

  // With LLM: detailed diagnosis
  try {
    const useDeepseek = !!deepseekKey;
    const url = useDeepseek ? "https://api.deepseek.com/chat/completions" : "https://api.openai.com/v1/chat/completions";
    const key = useDeepseek ? deepseekKey! : openaiKey!;
    const model = useDeepseek ? "deepseek-chat" : "gpt-4o-mini";

    const prompt = `A workflow run failed. Here's the info:

Run status: ${run.status}
Run trigger: ${run.trigger}
Run error: ${run.error}

Failed node: ${(failedLog as { node_label?: string }).node_label} (id: ${(failedLog as { node_id: string }).node_id})
Node error: ${(failedLog as { error?: string }).error}
Node input: ${JSON.stringify((failedLog as { input?: unknown }).input)?.slice(0, 500)}

All logs:
${(logs ?? []).map((l: Record<string, unknown>) => `[${l.status}] ${l.node_label}: ${l.error ?? ""}`).join("\n")}

Diagnose the error and suggest fixes. Reply in Vietnamese.
Format: { "diagnosis": "string", "suggestions": ["string", ...], "failedNode": "node_id" }`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ ...result, source: "llm" });
    }
    return NextResponse.json({
      diagnosis: content,
      suggestions: [],
      failedNode: (failedLog as { node_id: string }).node_id,
      source: "llm",
    });
  } catch (e) {
    console.error("[AI:Diagnose] LLM error:", e);
    return NextResponse.json({
      diagnosis: `Node lỗi: ${(failedLog as { error?: string }).error}`,
      suggestions: ["Kiểm tra config node", "Thử chạy lại"],
      failedNode: (failedLog as { node_id: string }).node_id,
      source: "fallback",
    });
  }
}
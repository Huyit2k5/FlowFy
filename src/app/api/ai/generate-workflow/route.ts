import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const generateSchema = z.object({
  description: z.string().min(5).max(2000),
  workspace_id: z.string().uuid(),
});

/**
 * POST /api/ai/generate-workflow
 * Input: "Khi nhận form đăng ký, gửi email xác nhận + thêm vào Google Sheets"
 * Output: { nodes: [...], edges: [...] } ready to render on canvas
 *
 * Uses: OPENAI_API_KEY or DEEPSEEK_API_KEY (VN-friendly)
 * Falls back to template-based generation if no API key.
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

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { description, workspace_id } = parsed.data;

  // Try LLM first, fall back to template
  const openaiKey = process.env.OPENAI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  let result: { nodes: unknown[]; edges: unknown[] } | null = null;

  if (openaiKey || deepseekKey) {
    try {
      result = await generateWithLLM(description, openaiKey, deepseekKey);
    } catch (e) {
      console.error("[AI] LLM generation failed, falling back to template:", e);
    }
  }

  if (!result) {
    result = generateWithTemplate(description);
  }

  return NextResponse.json({
    success: true,
    nodes: result.nodes,
    edges: result.edges,
    source: openaiKey || deepseekKey ? "llm" : "template",
  });
}

// ---- LLM-based generation ----
async function generateWithLLM(
  description: string,
  openaiKey: string | undefined,
  deepseekKey: string | undefined
): Promise<{ nodes: unknown[]; edges: unknown[] }> {
  const systemPrompt = `You are a workflow automation expert. Given a description in Vietnamese or English, generate a workflow as JSON.

Available node types:
- trigger (manual/webhook/schedule)
- webhook (HTTP request to external API)
- http (REST API call with auth)
- slack (Slack webhook message)
- email (send email via Resend)
- telegram (Telegram bot message)
- discord (Discord webhook)
- zalo (Zalo OA message)
- sms (Vietnam SMS)
- google (Gmail/Calendar/Sheets/Drive)
- airtable (create/update/search records)
- trello (create/move cards)
- notion (create page)
- transform (data mapping/filtering)
- condition (if/else branching)
- delay (wait N seconds)

Each node: { id, type, label, position: {x, y}, data: {...} }
Each edge: { id, source, target }

Rules:
- Always start with a "trigger" node
- Position nodes left-to-right with 250px spacing
- Use descriptive labels in Vietnamese
- For integration nodes, include a "config" object in data with the fields needed
- Keep it simple: max 6 nodes unless user specifies more

Return ONLY valid JSON: { "nodes": [...], "edges": [...] }`;

  const userPrompt = `Generate a workflow for: "${description}"`;

  // Use DeepSeek (cheaper, VN-friendly) if available, else OpenAI
  const useDeepseek = !!deepseekKey;
  const url = useDeepseek
    ? "https://api.deepseek.com/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
  const key = useDeepseek ? deepseekKey! : openaiKey!;
  const model = useDeepseek ? "deepseek-chat" : "gpt-4o-mini";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  // Extract JSON from response (may have markdown fences)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in LLM response");

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error("Invalid LLM response format");
  }

  return { nodes: parsed.nodes, edges: parsed.edges };
}

// ---- Template-based generation (no API key needed) ----
function generateWithTemplate(description: string): { nodes: unknown[]; edges: unknown[] } {
  const desc = description.toLowerCase();
  const nodes: unknown[] = [];
  const edges: unknown[] = [];
  let x = 100;
  let nodeCount = 0;

  function addNode(type: string, label: string, data: Record<string, unknown> = {}) {
    nodeCount++;
    const id = `${type}_${nodeCount}`;
    nodes.push({ id, type, label, position: { x, y: 200 }, data: { ...data } });
    x += 250;
    return id;
  }

  function addEdge(source: string, target: string) {
    edges.push({ id: `e_${edges.length + 1}`, source, target });
  }

  // Trigger
  const triggerType = desc.includes("webhook") ? "webhook" : desc.includes("định kỳ") || desc.includes("cron") ? "schedule" : "manual";
  const triggerId = addNode("trigger", "Bắt đầu", { triggerType });

  // Detect actions
  function lastNodeId(): string {
    const last = nodes[nodes.length - 1] as { id: string };
    return last.id;
  }

  if (desc.includes("email") || desc.includes("gửi email")) {
    const emailId = addNode("email", "Gửi Email", { to: "", subject: "Thông báo", body: "" });
    addEdge(triggerId, emailId);
  }
  if (desc.includes("slack") || desc.includes("thông báo")) {
    const slackId = addNode("slack", "Gửi Slack", { text: "Thông báo workflow" });
    addEdge(lastNodeId(), slackId);
  }
  if (desc.includes("telegram")) {
    const tgId = addNode("telegram", "Gửi Telegram", { text: "Thông báo" });
    addEdge(lastNodeId(), tgId);
  }
  if (desc.includes("zalo")) {
    const zaloId = addNode("zalo", "Gửi Zalo", { content: "Thông báo" });
    addEdge(lastNodeId(), zaloId);
  }
  if (desc.includes("google sheets") || desc.includes("sheet") || desc.includes("bảng tính")) {
    const sheetId = addNode("google", "Google Sheets", { action: "sheets_append" });
    addEdge(lastNodeId(), sheetId);
  }
  if (desc.includes("airtable")) {
    const atId = addNode("airtable", "Airtable", { action: "create" });
    addEdge(lastNodeId(), atId);
  }
  if (desc.includes("trello")) {
    const trId = addNode("trello", "Trello", { action: "create_card" });
    addEdge(lastNodeId(), trId);
  }
  if (desc.includes("api") || desc.includes("webhook") || desc.includes("http")) {
    const httpId = addNode("http", "Gọi API", { url: "", method: "POST" });
    addEdge(lastNodeId(), httpId);
  }
  if (desc.includes("notion")) {
    const nId = addNode("notion", "Notion", { content: "" });
    addEdge(lastNodeId(), nId);
  }

  // If no actions detected, add a generic HTTP node
  if (nodes.length === 1) {
    const httpId = addNode("http", "Gọi API", { url: "", method: "GET" });
    addEdge(triggerId, httpId);
  }

  // Connect all in sequence if not already chained
  // (edges are added as we go, so this is already done)

  return { nodes, edges };
}
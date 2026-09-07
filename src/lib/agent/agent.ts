import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSystemPrompt, agentTools, type AgentMessage, type AgentResponse } from "./tools";
import { executeTool, type ToolContext } from "./tool-executor";
import { findPreset, industryPresets, listPresets } from "./industry-presets";

const MAX_TOOL_ITERATIONS = 5;

export interface AgentInput {
  message: string;
  workspaceId: string;
  workflowId?: string;
  mode?: "create" | "edit" | "explain";
  history?: AgentMessage[];
}

export interface AgentOutput {
  response: string;
  workflow?: { nodes: unknown[]; edges: unknown[] };
  mode: string;
  toolCalls: number;
  confidence: "high" | "medium" | "low";
  source: "ai" | "preset" | "template";
}

export async function runAgent(
  input: AgentInput,
  supabase: SupabaseClient
): Promise<AgentOutput> {
  const { message, workspaceId, workflowId, mode = "create" } = input;

  // Load workspace integrations for context
  const { data: integrations } = await supabase
    .from("integrations")
    .select("provider, config")
    .eq("workspace_id", workspaceId);

  // Load current workflow if editing
  let currentWorkflow: { nodes: unknown[]; edges: unknown[] } | null = null;
  if (workflowId && mode !== "create") {
    const { data: nodesData } = await supabase
      .from("workflow_nodes")
      .select("nodes, edges")
      .eq("workflow_id", workflowId)
      .maybeSingle();
    if (nodesData) {
      currentWorkflow = { nodes: nodesData.nodes ?? [], edges: nodesData.edges ?? [] };
    }
  }

  const systemPrompt = buildSystemPrompt({
    integrations: integrations ?? [],
    currentWorkflow,
  });

  const toolContext: ToolContext = { supabase, workspaceId, workflowId };

  // Build messages
  const messages: AgentMessage[] = [
    { role: "system", content: systemPrompt },
    ...(input.history ?? []),
    { role: "user", content: message },
  ];

  let toolCalls = 0;
  let finalContent = "";

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const llmResponse = await callLLM(messages);

    if (llmResponse.error) {
      // Fallback: template-based generation
      return templateFallback(message, workspaceId, supabase);
    }

    const choice = llmResponse.choices?.[0];
    if (!choice) {
      return { response: "Lỗi: Không nhận được phản hồi từ AI.", mode, toolCalls: 0, confidence: "low", source: "ai" };
    }

    const assistantMsg = choice.message;
    messages.push(assistantMsg as AgentMessage);

    // Check for tool calls
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      for (const toolCall of assistantMsg.tool_calls) {
        toolCalls++;
        const funcName = toolCall.function.name;
        const funcArgs = JSON.parse(toolCall.function.arguments || "{}");

        const result = await executeTool(funcName, funcArgs, toolContext);

        messages.push({
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
          name: funcName,
        });
      }
      // Continue loop to get AI's response after tool results
      continue;
    }

    // No tool calls — this is the final response
    finalContent = assistantMsg.content ?? "";
    break;
  }

  // Parse workflow from response
  const workflow = extractWorkflow(finalContent);

  const confidence: "high" | "medium" | "low" = workflow
    ? (toolCalls >= 2 ? "high" : "medium")
    : "low";

  return {
    response: finalContent,
    workflow,
    mode,
    toolCalls,
    confidence,
    source: "ai",
  };
}

async function callLLM(messages: AgentMessage[]): Promise<{
  choices?: Array<{ message: { content?: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }>;
  error?: string;
}> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  // Try OpenAI first, then DeepSeek
  const apiKey = openaiKey || deepseekKey;
  if (!apiKey) {
    return { error: "No API key configured" };
  }

  const isDeepSeek = !openaiKey && !!deepseekKey;
  const baseUrl = isDeepSeek ? "https://api.deepseek.com/v1" : "https://api.openai.com/v1";
  const model = isDeepSeek ? "deepseek-chat" : "gpt-4o-mini";

  const tools = agentTools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: zodToJsonSchema(t.parameters),
    },
  }));

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools,
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { error: `API ${res.status}: ${errText.slice(0, 200)}` };
    }

    return await res.json();
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

function extractWorkflow(content: string): { nodes: unknown[]; edges: unknown[] } | undefined {
  // Try to find JSON in the response
  const jsonMatch = content.match(/\{[\s\S]*"nodes"\s*:\s*\[[\s\S]*\][\s\S]*"edges"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
  if (!jsonMatch) return undefined;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return { nodes: parsed.nodes, edges: parsed.edges };
    }
  } catch {
    // Try to find the last JSON object
    const lastBrace = content.lastIndexOf("}");
    const firstBrace = content.indexOf("{");
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        const parsed = JSON.parse(content.slice(firstBrace, lastBrace + 1));
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          return { nodes: parsed.nodes, edges: parsed.edges };
        }
      } catch { /* ignore */ }
    }
  }
  return undefined;
}

// Simple Zod → JSON Schema converter (for tool definitions)
function zodToJsonSchema(schema: any): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return { type: "object", properties: {} };

  // Zod object
  if (schema._def?.typeName === "ZodObject") {
    const shape = schema._def.shape();
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const val: any = value;
      if (val._def?.typeName === "ZodString") {
        properties[key] = { type: "string" };
        const desc = val._def?.checks?.find((c: any) => c.kind === "description")?.value;
        if (desc) properties[key] = { type: "string", description: desc };
      } else if (val._def?.typeName === "ZodNumber") {
        properties[key] = { type: "number" };
      } else if (val._def?.typeName === "ZodBoolean") {
        properties[key] = { type: "boolean" };
      } else if (val._def?.typeName === "ZodEnum") {
        properties[key] = { type: "string", enum: val._def.values };
      } else if (val._def?.typeName === "ZodArray") {
        properties[key] = { type: "array", items: { type: "string" } };
      } else if (val._def?.typeName === "ZodRecord") {
        properties[key] = { type: "object" };
      } else if (val.isOptional?.() || val._def?.typeName === "ZodOptional") {
        properties[key] = { type: "string" };
      } else {
        properties[key] = { type: "string" };
      }

      if (!val.isOptional?.()) required.push(key);
    }

    return { type: "object", properties, ...(required.length ? { required } : {}) };
  }

  return { type: "object", properties: {} };
}

// Template fallback (no API key)
async function templateFallback(
  message: string,
  workspaceId: string,
  supabase: SupabaseClient
): Promise<AgentOutput> {
  const lower = message.toLowerCase();

  // Try industry presets first
  const preset = findPreset(message);
  if (preset) {
    return {
      response:
        "Đã tạo workflow từ template \"" + preset.name + "\" (" + preset.icon + ").\n" +
        "Mô tả: " + preset.description + "\n\n" +
        "Vui lòng kiểm tra config (API keys, webhook URLs) và điều chỉnh nếu cần.\n" +
        "(Template mode - không có AI API key)",
      workflow: { nodes: preset.workflow.nodes, edges: preset.workflow.edges },
      mode: "create",
      toolCalls: 0,
      confidence: "medium",
      source: "preset",
    };
  }

  const nodes: any[] = [];
  const edges: any[] = [];

  // Detect trigger
  if (lower.includes("webhook") || lower.includes("nhận") || lower.includes("khi")) {
    nodes.push({
      id: "trigger-1",
      type: "webhook",
      label: "Nhận webhook",
      position: { x: 0, y: 0 },
      data: { method: "POST", url: "https://flowly.vn/api/webhooks/{{token}}" },
    });
  } else {
    nodes.push({
      id: "trigger-1",
      type: "trigger",
      label: "Bắt đầu",
      position: { x: 0, y: 0 },
      data: { triggerType: "manual" },
    });
  }

  let x = 250;
  let lastId = "trigger-1";

  // Detect actions
  const actionMap: Array<{ keywords: string[]; node: () => any }> = [
    { keywords: ["slack"], node: () => ({ id: "slack-1", type: "slack", label: "Gửi Slack", position: { x: x, y: 0 }, data: { text: "Workflow notification" } }) },
    { keywords: ["email", "mail"], node: () => ({ id: "email-1", type: "email", label: "Gửi Email", position: { x: x, y: 0 }, data: { to: "", subject: "Notification", body: "Chi tiết..." } }) },
    { keywords: ["zalo"], node: () => ({ id: "zalo-1", type: "zalo", label: "Gửi Zalo", position: { x: x, y: 0 }, data: { to: "", content: "Xin chào" } }) },
    { keywords: ["telegram"], node: () => ({ id: "telegram-1", type: "telegram", label: "Gửi Telegram", position: { x: x, y: 0 }, data: { chatId: "", text: "Notification" } }) },
    { keywords: ["trello"], node: () => ({ id: "trello-1", type: "trello", label: "Tạo card Trello", position: { x: x, y: 0 }, data: { boardId: "", listId: "", action: "create_card", cardTitle: "New task" } }) },
    { keywords: ["notion"], node: () => ({ id: "notion-1", type: "notion", label: "Tạo trang Notion", position: { x: x, y: 0 }, data: { action: "create_page", content: "Content" } }) },
    { keywords: ["airtable"], node: () => ({ id: "airtable-1", type: "airtable", label: "Airtable", position: { x: x, y: 0 }, data: { action: "create", fields: {} } }) },
    { keywords: ["http", "api"], node: () => ({ id: "http-1", type: "http", label: "HTTP Request", position: { x: x, y: 0 }, data: { method: "POST", url: "" } }) },
    { keywords: ["sms"], node: () => ({ id: "sms-1", type: "sms", label: "Gửi SMS", position: { x: x, y: 0 }, data: { provider: "vnpt", to: "", content: "" } }) },
    { keywords: ["discord"], node: () => ({ id: "discord-1", type: "discord", label: "Gửi Discord", position: { x: x, y: 0 }, data: { content: "Notification" } }) },
  ];

  for (const action of actionMap) {
    if (action.keywords.some((k) => lower.includes(k))) {
      const node = action.node();
      nodes.push(node);
      edges.push({ id: `e-${lastId}-${node.id}`, source: lastId, target: node.id });
      lastId = node.id;
      x += 250;
    }
  }

  // Detect condition
  if (lower.includes("nếu") || lower.includes("nếu") || lower.includes("nếu") || lower.includes("if ") || lower.includes("condition") || lower.includes("điều kiện")) {
    const condId = "condition-1";
    nodes.push({
      id: condId,
      type: "condition",
      label: "Điều kiện",
      position: { x: x, y: 0 },
      data: { expression: "{{trigger-1.data}} === 'ok'" },
    });
    edges.push({ id: `e-${lastId}-${condId}`, source: lastId, target: condId });
    lastId = condId;
    x += 250;

    // True branch
    const trueNode = { id: "action-true", type: "slack", label: "Thỏa mãn", position: { x: x, y: -75 }, data: { text: "Điều kiện đúng" } };
    // False branch
    const falseNode = { id: "action-false", type: "slack", label: "Không thỏa mãn", position: { x: x, y: 75 }, data: { text: "Điều kiện sai" } };
    nodes.push(trueNode, falseNode);
    edges.push(
      { id: "e-cond-true", source: condId, target: "action-true", label: "true" },
      { id: "e-cond-false", source: condId, target: "action-false", label: "false" }
    );
  }

  if (nodes.length <= 1) {
    const presetList = industryPresets.map((p) => "  " + p.icon + " " + p.name + ": " + p.description).join("\n");
    return {
      response: "Tôi chưa hiểu rõ yêu cầu. Hãy mô tả cụ thể hơn, ví dụ:\n- \"Tạo workflow khi nhận webhook thì gửi Slack\"\n- \"Khi nhận đơn hàng, nếu > 5 triệu thì gửi Zalo cho manager\"\n\nCác template có sẵn:\n" + presetList + "\n\nTôi hỗ trợ: Slack, Email, Zalo, Telegram, Trello, Notion, Airtable, HTTP, Condition, Delay...",
      mode: "create",
      toolCalls: 0,
      confidence: "low",
      source: "template",
    };
  }

  return {
    response: "Đã tạo workflow với " + nodes.length + " nodes. Vui lòng kiểm tra config và điều chỉnh nếu cần. (Template mode - không có AI API key)",
    workflow: { nodes, edges },
    mode: "create",
    toolCalls: 0,
    confidence: "low",
    source: "template",
  };
}

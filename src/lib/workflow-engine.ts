import { createClient } from "@/lib/supabase/server";
import type {
  WorkflowNode,
  WorkflowEdge,
  RunLog,
} from "./workflow-types";

// ============================================================
// Execution engine
// ============================================================

export interface NodeResult {
  status: "success" | "failed" | "skipped";
  output: unknown;
  error?: string;
}

export interface RunResult {
  runId: string;
  status: "success" | "failed";
  error?: string;
  logs: RunLog[];
}

interface Ctx {
  // context data passed between nodes (key: nodeId, value: output)
  data: Record<string, unknown>;
}

// ---------- Template helper: thay {{nodeId.field}} trong string ----------
function interpolate(template: string, ctx: Ctx): string {
  return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, nodeId, field) => {
    const val = ctx.data[nodeId];
    if (val == null) return "";
    if (typeof val === "object") {
      return String((val as Record<string, unknown>)[field] ?? "");
    }
    return String(val);
  });
}

// ---------- Runners cho từng loại node ----------
async function runTrigger(node: WorkflowNode, ctx: Ctx): Promise<NodeResult> {
  const cfg = node.data as Record<string, unknown>;
  if (cfg.triggerType === "webhook") {
    // Input từ webhook đã được inject vào ctx.data["trigger"]
    const input = ctx.data["trigger"] ?? {};
    return { status: "success", output: { triggeredBy: "webhook", input } };
  }
  if (cfg.triggerType === "schedule" && cfg.scheduleCron) {
    return { status: "success", output: { triggeredBy: "schedule", cron: cfg.scheduleCron } };
  }
  return { status: "success", output: { triggeredBy: "manual" } };
}

async function runWebhook(node: WorkflowNode, ctx: Ctx): Promise<NodeResult> {
  const cfg = node.data as Record<string, unknown>;
  const url = interpolate(String(cfg.url ?? ""), ctx);
  const method = String(cfg.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((cfg.headers as Record<string, string>) ?? {}),
  };
  const body = cfg.body ? interpolate(String(cfg.body), ctx) : undefined;
  const timeout = Number(cfg.timeout ?? 30);

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeout * 1000);
    const res = await fetch(url, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : body,
      signal: controller.signal,
    });
    clearTimeout(t);

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return {
      status: "success",
      output: { status: res.status, ok: res.ok, data: json },
    };
  } catch (e) {
    return { status: "failed", output: null, error: e instanceof Error ? e.message : String(e) };
  }
}

async function runSlack(node: WorkflowNode, ctx: Ctx): Promise<NodeResult> {
  const cfg = node.data as Record<string, unknown>;
  const webhookUrl = String(cfg.webhookUrl ?? "");
  const text = interpolate(String(cfg.text ?? ""), ctx);
  const channel = cfg.channel ? String(cfg.channel) : undefined;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, ...(channel ? { channel } : {}) }),
    });
    if (!res.ok) {
      return { status: "failed", output: null, error: `Slack HTTP ${res.status}` };
    }
    return { status: "success", output: { sent: true } };
  } catch (e) {
    return { status: "failed", output: null, error: e instanceof Error ? e.message : String(e) };
  }
}

async function runEmail(node: WorkflowNode, ctx: Ctx): Promise<NodeResult> {
  const cfg = node.data as Record<string, unknown>;
  const to = interpolate(String(cfg.to ?? ""), ctx);
  const subject = interpolate(String(cfg.subject ?? ""), ctx);
  const body = interpolate(String(cfg.body ?? ""), ctx);

  // MVP: log email thay vì gửi thật (cần SMTP provider)
  console.log("[Flowly:Email] to:", to, "subject:", subject, "body:", body.slice(0, 200));
  return { status: "success", output: { to, subject, sent: true, simulated: true } };
}

async function runNotion(node: WorkflowNode, ctx: Ctx): Promise<NodeResult> {
  const cfg = node.data as Record<string, unknown>;
  const token = String(cfg.notionToken ?? "");
  const action = String(cfg.action ?? "create_page");
  const content = interpolate(String(cfg.content ?? ""), ctx);

  try {
    if (action === "create_page") {
      const res = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parent: { page_id: String(cfg.pageId ?? "") },
          properties: {},
          children: [
            {
              object: "block",
              type: "paragraph",
              paragraph: { rich_text: [{ type: "text", text: { content } }] },
            },
          ],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return { status: "failed", output: null, error: `Notion HTTP ${res.status}: ${err}` };
      }
      const data = await res.json();
      return { status: "success", output: { pageId: data.id, sent: true } };
    }
    // create_item / update_page - cần thêm logic, MVP chỉ hỗ trợ create_page
    return { status: "failed", output: null, error: `Action ${action} chưa hỗ trợ` };
  } catch (e) {
    return { status: "failed", output: null, error: e instanceof Error ? e.message : String(e) };
  }
}

async function runCondition(node: WorkflowNode, ctx: Ctx): Promise<NodeResult> {
  const cfg = node.data as Record<string, unknown>;
  const expression = interpolate(String(cfg.expression ?? "true"), ctx);
  try {
    // Eval an toàn: chỉ cho phép các toán tử so sánh đơn giản
    const result = new Function("ctx", `with(ctx){return (function(){ ${expression}; return true; })()}`)(ctx);
    return { status: "success", output: { result: Boolean(result) } };
  } catch (e) {
    return { status: "failed", output: null, error: e instanceof Error ? e.message : String(e) };
  }
}

async function runDelay(node: WorkflowNode): Promise<NodeResult> {
  const cfg = node.data as Record<string, unknown>;
  const seconds = Number(cfg.seconds ?? 1);
  await new Promise((r) => setTimeout(r, seconds * 1000));
  return { status: "success", output: { delayed: seconds } };
}

const runners: Record<string, (node: WorkflowNode, ctx: Ctx) => Promise<NodeResult>> = {
  trigger: runTrigger,
  webhook: runWebhook,
  slack: runSlack,
  email: runEmail,
  notion: runNotion,
  condition: runCondition,
  delay: (n) => runDelay(n),
};

// ============================================================
// Chạy workflow
// ============================================================

export async function executeWorkflow(params: {
  workflowId: string;
  workspaceId: string;
  trigger: string;
  input?: Record<string, unknown>;
  supabase?: import("@supabase/supabase-js").SupabaseClient;
}): Promise<RunResult> {
  const supabase = params.supabase ?? (await createClient());

  // 1) Tạo run
  const { data: run, error: runErr } = await supabase
    .from("workflow_runs")
    .insert({
      workflow_id: params.workflowId,
      workspace_id: params.workspaceId,
      status: "running",
      trigger: params.trigger,
    })
    .select()
    .single();
  if (runErr || !run) {
    throw new Error(runErr?.message ?? "Không tạo được run");
  }
  const runId = (run as { id: string }).id;

  // 2) Lấy nodes + edges
  const { data: nodeRow } = await supabase
    .from("workflow_nodes")
    .select("nodes, edges")
    .eq("workflow_id", params.workflowId)
    .maybeSingle();

  const raw = nodeRow as { nodes: WorkflowNode[]; edges: WorkflowEdge[] } | null;
  const nodes: WorkflowNode[] = raw?.nodes ?? [];
  const edges: WorkflowEdge[] = raw?.edges ?? [];

  if (nodes.length === 0) {
    await supabase
      .from("workflow_runs")
      .update({ status: "failed", finished_at: new Date().toISOString(), error: "Workflow trống" })
      .eq("id", runId);
    return { runId, status: "failed", error: "Workflow trống", logs: [] };
  }

  const ctx: Ctx = { data: {} };
  // Nếu có input từ webhook, inject vào ctx cho trigger node
  if (params.input) {
    ctx.data["trigger"] = params.input;
  }
  const logs: RunLog[] = [];
  let failed = false;

  // 3) Xác định thứ tự: bắt đầu từ trigger node, đi theo edges (topological)
  const triggerNode = nodes.find((n) => n.type === "trigger") ?? nodes[0];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const queue: string[] = [triggerNode.id];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) continue;

    // Create log
    const { data: log, error: logErr } = await supabase
      .from("run_logs")
      .insert({
        run_id: runId,
        node_id: node.id,
        node_label: node.label,
        status: "running",
        input: node.data,
      })
      .select()
      .single();
    if (logErr) continue;
    const logId = (log as { id: string }).id;

    // Run
    const runner = runners[node.type];
    let result: NodeResult;
    if (!runner) {
      result = { status: "failed", output: null, error: `Không có runner cho type ${node.type}` };
    } else {
      result = await runner(node, ctx);
    }

    if (result.status === "success") {
      ctx.data[node.id] = result.output;
    }

    // Update log
    await supabase
      .from("run_logs")
      .update({ status: result.status, output: result.output, error: result.error ?? null })
      .eq("id", logId);

    logs.push({
      id: logId,
      run_id: runId,
      node_id: node.id,
      node_label: node.label,
      status: result.status,
      input: node.data,
      output: result.output,
      error: result.error ?? null,
      created_at: new Date().toISOString(),
    });

    if (result.status === "failed") {
      failed = true;
      break;
    }

    // Thêm các node kế tiếp
    const nexts = edges.filter((e) => e.source === nodeId).map((e) => e.target);
    for (const nid of nexts) {
      if (!visited.has(nid)) queue.push(nid);
    }
  }

  // 4) Cập nhật run
  const finalStatus = failed ? "failed" : "success";
  await supabase
    .from("workflow_runs")
    .update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      error: failed ? "Có node chạy lỗi" : null,
    })
    .eq("id", runId);

  return { runId, status: finalStatus, error: failed ? "Có node chạy lỗi" : undefined, logs };
}
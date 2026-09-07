import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { Workflow, WorkflowNode, WorkflowEdge } from "./workflow-types";
import { executeProviderNode } from "./integrations/registry";

// ============================================================
// Types
// ============================================================

export interface ExecutionContext {
  data: Record<string, unknown>;
  input: unknown;
  workflowId: string;
  workspaceId: string;
  runId: string;
  supabase: SupabaseClient;
  loopIndex?: number;
  loopItem?: unknown;
}

export interface ExecutionResult {
  runId: string;
  status: "success" | "failed";
  output: unknown;
  error?: string;
}

export interface NodeResult {
  status: "success" | "failed";
  output: unknown;
  error?: string;
}

// ============================================================
// Helpers
// ============================================================

function resolveTemplate(str: string, data: Record<string, unknown>): string {
  return str.replace(/\{\{(\w+)\.(\w+(?:\.\w+)*)\}\}/g, (_, nodeId, fieldPath) => {
    const nodeData = data[nodeId];
    if (nodeData === undefined) return `{{${nodeId}.${fieldPath}}}`;
    const parts = fieldPath.split(".");
    let val: unknown = nodeData;
    for (const p of parts) {
      if (typeof val === "object" && val !== null && p in (val as Record<string, unknown>)) {
        val = (val as Record<string, unknown>)[p];
      } else return `{{${nodeId}.${fieldPath}}}`;
    }
    return typeof val === "string" ? val : JSON.stringify(val);
  });
}

function resolveTemplateDeep(obj: unknown, data: Record<string, unknown>): unknown {
  if (typeof obj === "string") return resolveTemplate(obj, data);
  if (typeof obj === "number" || typeof obj === "boolean" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map((item) => resolveTemplateDeep(item, data));
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = resolveTemplateDeep(v, data);
    }
    return result;
  }
  return obj;
}

// ============================================================
// Node runners
// ============================================================

const nodeRunners: Record<string, (node: WorkflowNode, ctx: ExecutionContext) => Promise<unknown>> = {
  async trigger(_node, ctx) { return ctx.input; },
  async webhook(node, ctx) {
    const cfg = node.data;
    const method = (cfg.method as string) || "GET";
    const url = resolveTemplate((cfg.url as string) || "", ctx.data);
    const headers = resolveTemplateDeep(cfg.headers || {}, ctx.data) as Record<string, string>;
    const body = cfg.body ? resolveTemplate(cfg.body as string, ctx.data) : undefined;
    const timeout = (cfg.timeout as number) || 30;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout * 1000);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: method !== "GET" ? body : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      let json: unknown = text;
      try { json = JSON.parse(text); } catch { /* keep raw */ }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      return { status: res.status, statusText: res.statusText, data: json, headers: Object.fromEntries(res.headers) };
    } finally { clearTimeout(timer); }
  },
  async http(node, ctx) {
    const cfg = node.data;
    const method = (cfg.method as string) || "GET";
    const url = resolveTemplate((cfg.url as string) || "", ctx.data);
    const headers: Record<string, string> = { "Content-Type": "application/json", ...((cfg.headers as Record<string, string>) || {}) };
    if (cfg.authType === "bearer" && cfg.authValue) headers["Authorization"] = `Bearer ${resolveTemplate(cfg.authValue as string, ctx.data)}`;
    else if (cfg.authType === "basic" && cfg.authUsername) {
      const pw = cfg.authPassword || "";
      headers["Authorization"] = `Basic ${Buffer.from(`${resolveTemplate(cfg.authUsername as string, ctx.data)}:${pw}`).toString("base64")}`;
    } else if (cfg.authType === "api_key" && cfg.apiKeyHeader) {
      headers[cfg.apiKeyHeader as string] = resolveTemplate((cfg.apiKeyValue || "") as string, ctx.data);
    }
    const body = cfg.body ? resolveTemplate(cfg.body as string, ctx.data) : undefined;
    const timeout = (cfg.timeout as number) || 30;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout * 1000);
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: method !== "GET" ? body : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      let json: unknown = text;
      try { json = JSON.parse(text); } catch { /* keep raw */ }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      return { status: res.status, statusText: res.statusText, data: json, headers: Object.fromEntries(res.headers) };
    } finally { clearTimeout(timer); }
  },
  async condition(node, ctx) {
    const expression = resolveTemplate((node.data.expression as string) || "", ctx.data);
    try {
      const result = new Function(`"use strict"; return (${expression});`)() as boolean;
      return { matched: Boolean(result) };
    } catch { return { matched: false, error: "Invalid expression" }; }
  },
  async delay(node, ctx) {
    const seconds = (node.data.seconds as number) || 5;
    const capped = Math.min(seconds, 60);
    await new Promise((r) => setTimeout(r, capped * 1000));
    return { waited: capped };
  },
  async integration(node, ctx) {
    const providerId = (node.data.providerId as string) || (node.data.provider as string) || "slack";
    const integrations = (ctx.data.__integrations || []) as Array<{ provider: string; config: Record<string, unknown> }>;
    const wsConfig: Record<string, Record<string, string>> = {};
    for (const i of integrations) {
      wsConfig[i.provider] = Object.fromEntries(Object.entries(i.config || {}).map(([k, v]) => [k, String(v)]));
    }
    const result = await executeProviderNode(node, { data: ctx.data }, wsConfig);
    if (result.status === "failed") throw new Error(result.error || `Integration ${providerId} failed`);
    return result.output;
  },
  async transform(node, ctx) {
    const cfg = node.data;
    const inputNodeId = (cfg.inputNode as string) || "";
    const input = inputNodeId ? (ctx.data[inputNodeId] as unknown) : ctx.input;
    const mapping = (cfg.mapping as Record<string, string>) || {};
    const output: Record<string, unknown> = {};
    for (const [key, template] of Object.entries(mapping)) {
      output[key] = resolveTemplate(template as string, ctx.data);
    }
    return { input, output };
  },
  async database(node, ctx) {
    const cfg = node.data;
    const query = resolveTemplate((cfg.query as string) || "", ctx.data);
    if (cfg.mode === "supabase" || !cfg.mode) {
      if (!query) throw new Error("Query không được để trống");
      const { data, error } = await ctx.supabase.rpc("execute_sql", { sql: query });
      if (error) throw new Error(error.message);
      return { rows: data, rowCount: Array.isArray(data) ? data.length : 1 };
    } else {
      const url = resolveTemplate((cfg.url as string) || "", ctx.data);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
      const res = await fetch(url, { method: "GET", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { data: await res.json() };
    }
  },
  async slack(node, ctx) {
    const integrations = (ctx.data.__integrations || []) as Array<{ provider: string; config: Record<string, unknown> }>;
    const slackInt = integrations.find((i) => i.provider === "slack");
    const webhookUrl = (node.data.webhookUrl as string) || (slackInt?.config.webhookUrl as string) || "";
    const text = resolveTemplate((node.data.text as string) || "Workflow notification", ctx.data);
    const payload: Record<string, unknown> = { text };
    if (node.data.channel) payload.channel = node.data.channel;
    if (!webhookUrl) return { ok: false, simulated: true, message: "No Slack webhook configured", payload };
    const res = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await res.json();
    return { ok: res.ok, ...result, payload };
  },
  async email(node, ctx) {
    const integrations = (ctx.data.__integrations || []) as Array<{ provider: string; config: Record<string, unknown> }>;
    const emailInt = integrations.find((i) => i.provider === "email");
    const to = resolveTemplate((node.data.to as string) || (emailInt?.config.to as string) || "", ctx.data);
    const subject = resolveTemplate((node.data.subject as string) || "Workflow Notification", ctx.data);
    const body = resolveTemplate((node.data.body as string) || "", ctx.data);
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || !to) return { ok: false, simulated: true, to, subject, body, message: "Resend not configured" };
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Flowly <notifications@flowly.vn>", to: [to], subject, html: `<pre>${body}</pre>` }),
    });
    const result = await res.json();
    return { ok: res.ok, ...result, to, subject };
  },
  async notion(node, ctx) {
    const integrations = (ctx.data.__integrations || []) as Array<{ provider: string; config: Record<string, unknown> }>;
    const notionInt = integrations.find((i) => i.provider === "notion");
    const token = (node.data.notionToken as string) || (notionInt?.config.notionToken as string) || "";
    const action = (node.data.action as string) || "create_item";
    const content = resolveTemplate((node.data.content as string) || "", ctx.data);
    if (!token) return { ok: false, simulated: true, message: "No Notion token", action, content };
    const notionUrl = action === "create_item"
      ? "https://api.notion.com/v1/databases/" + (node.data.databaseId as string || "") + "/query"
      : "https://api.notion.com/v1/blocks/" + (node.data.pageId as string || "") + "/children";
    const notionBody = action === "create_item"
      ? { page: { properties: { Content: { rich_text: [{ type: "text", text: { content } }] } } } }
      : { children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content } }] } }] };
    const res = await fetch(notionUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
      body: JSON.stringify(notionBody),
    });
    return { ok: res.ok, data: await res.json() };
  },
  async sub_workflow(node, ctx) {
    const cfg = node.data;
    const targetWorkflowId = resolveTemplate((cfg.workflowId as string) || "", ctx.data);
    if (!targetWorkflowId) throw new Error("Sub-workflow: workflowId is required");
    const inputMapping = (cfg.inputMapping as Record<string, string>) || {};
    const subInput: Record<string, unknown> = {};
    for (const [key, template] of Object.entries(inputMapping)) {
      subInput[key] = resolveTemplate(template as string, ctx.data);
    }
    const result = await executeWorkflow({
      workflowId: targetWorkflowId,
      workspaceId: ctx.workspaceId,
      trigger: `sub_workflow:${ctx.workflowId}:${node.id}`,
      input: subInput,
      supabase: ctx.supabase,
    });
    const outputKey = (cfg.outputKey as string) || "subResult";
    const out: Record<string, unknown> = { subRunId: result.runId, status: result.status, error: result.error || null };
    out[outputKey] = result.output;
    return out;
  },
  async parallel(node, ctx) {
    const cfg = node.data;
    const maxConcurrent = (cfg.maxConcurrent as number) || 5;
    const failFast = (cfg.failFast as boolean) || false;
    const output: Record<string, unknown> = { branches: [], errors: [] };
    return output;
  },
  async loop(node, ctx) {
    const cfg = node.data;
    const sourceNode = (cfg.sourceNode as string) || "";
    const arrayField = (cfg.arrayField as string) || "items";
    const maxIterations = (cfg.maxIterations as number) || 50;
    const sourceData = sourceNode ? ctx.data[sourceNode] : ctx.input;
    let items: unknown[] = [];
    if (Array.isArray(sourceData)) items = sourceData;
    else if (sourceData && typeof sourceData === "object" && arrayField in (sourceData as Record<string, unknown>)) {
      const fieldVal = (sourceData as Record<string, unknown>)[arrayField];
      items = Array.isArray(fieldVal) ? fieldVal : [fieldVal];
    }
    const results: unknown[] = [];
    for (let i = 0; i < Math.min(items.length, maxIterations); i++) {
      results.push({ index: i, item: items[i] });
      ctx.loopIndex = i;
      ctx.loopItem = items[i];
    }
    ctx.loopIndex = undefined;
    ctx.loopItem = undefined;
    return { count: results.length, items: results, truncated: items.length > maxIterations };
  },
  async condition_group(node, ctx) {
    const cfg = node.data;
    const operator = (cfg.operator as string) || "AND";
    let conditions: string[] = [];
    const raw = cfg.conditions;
    if (Array.isArray(raw)) {
      conditions = raw.map((c: { expression?: string } | string) => typeof c === "string" ? c : c.expression || "");
    } else if (typeof raw === "string") {
      conditions = raw.split("\n").map((s: string) => s.trim()).filter(Boolean);
    }
    const results = conditions.map((expr) => {
      const expression = resolveTemplate(expr, ctx.data);
      try { return Boolean(new Function(`"use strict"; return (${expression});`)()); }
      catch { return false; }
    });
    const matched = operator === "AND" ? results.every(Boolean) : results.some(Boolean);
    return { matched, results, operator };
  },
};

// Integration provider types (dispatch to provider registry)
const integrationTypes = new Set([
  "google", "telegram", "discord", "zalo", "sms", "airtable", "trello",
  "transform", "database",
]);
for (const type of integrationTypes) {
  nodeRunners[type] = async (node, ctx) => {
    const integrations = (ctx.data.__integrations || []) as Array<{ provider: string; config: Record<string, unknown> }>;
    const wsConfig: Record<string, Record<string, string>> = {};
    for (const i of integrations) {
      wsConfig[i.provider] = Object.fromEntries(Object.entries(i.config || {}).map(([k, v]) => [k, String(v)]));
    }
    const result = await executeProviderNode(node, { data: ctx.data }, wsConfig);
    if (result.status === "failed") throw new Error(result.error || `Integration ${type} failed`);
    return result.output;
  };
}

// ============================================================
// Workflow execution
// ============================================================

const MAX_NODES = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = [1000, 2000, 4000];
const RETRYABLE_ERROR = /network|timeout|fetch failed|econnrefused|econnreset|aborted/i;

export async function executeWorkflow(opts: {
  workflowId: string;
  workspaceId: string;
  trigger: string;
  input?: unknown;
  supabase?: SupabaseClient;
}): Promise<ExecutionResult> {
  const { workflowId, workspaceId, trigger, input, supabase } = opts;
  const sb = supabase || createDefaultClient();

  const runData = await sb.from("workflow_runs").insert({
    workflow_id: workflowId,
    workspace_id: workspaceId,
    trigger,
    status: "running",
  }).select().single();
  if (runData.error) throw new Error(`Cannot create run: ${runData.error.message}`);
  const runId = runData.data.id as string;

  const ctx: ExecutionContext = {
    data: {},
    input: input ?? null,
    workflowId,
    workspaceId,
    runId,
    supabase: sb,
  };

  try {
    const wf = await sb.from("workflows").select("*").eq("id", workflowId).single();
    if (wf.error) throw new Error(`Workflow not found: ${wf.error.message}`);

    const { data: nodesData } = await sb.from("workflow_nodes").select("*").eq("workflow_id", workflowId).maybeSingle();
    const rawNodes: unknown[] = (nodesData as { nodes?: unknown[] })?.nodes ?? [];
    const rawEdges: unknown[] = (nodesData as { edges?: unknown[] })?.edges ?? [];
    const nodes: WorkflowNode[] = (rawNodes as Array<{ id: string; type: string; label: string; position: { x: number; y: number }; data: Record<string, unknown> }>).map((n) => ({
      id: n.id, type: n.type as WorkflowNode["type"], label: n.label,
      position: n.position, data: n.data || {},
    }));
    const edges: WorkflowEdge[] = (rawEdges as Array<{ id: string; source: string; target: string; label?: string }>).map((e) => ({
      id: e.id, source: e.source, target: e.target,
      label: (e.label === "true" || e.label === "false") ? e.label as "true" | "false" : undefined,
    }));
    if (nodes.length === 0) throw new Error("Workflow has no nodes");

    // Load integrations
    const { data: intData } = await sb.from("integrations").select("*").eq("workspace_id", workspaceId);
    ctx.data.__integrations = (intData || []).map((i) => ({ provider: i.provider, config: i.config || {} }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const edgesFrom = (sourceId: string) => edges.filter((e) => e.source === sourceId);

    let triggerNode = nodes.find((n) => n.type === "webhook" || n.type === "trigger");
    if (!triggerNode) triggerNode = nodes[0];

    const visited = new Set<string>();
    let currentNodeId: string | null = triggerNode.id;
    let currentInput: unknown = input ?? null;
    let steps = 0;

    while (currentNodeId && steps < MAX_NODES) {
      if (visited.has(currentNodeId)) break;
      visited.add(currentNodeId);
      steps++;
      const node = nodeMap.get(currentNodeId);
      if (!node) break;
      currentInput = await executeNodeWithRetry(node, ctx, sb, runId);
      ctx.data[node.id] = currentInput;

      const outEdges = edgesFrom(node.id);
      if (outEdges.length === 0) {
        currentNodeId = null;
      } else if (node.type === "condition" || node.type === "condition_group") {
        const result = currentInput as { matched?: boolean };
        const branch = result.matched ? "true" : "false";
        const branchEdge = outEdges.find((e) => e.label === branch) || outEdges.find((e) => !e.label);
        currentNodeId = branchEdge?.target || null;
      } else {
        currentNodeId = outEdges[0].target;
      }
    }

    const lastNodeId = [...visited].pop();
    const lastOutput = lastNodeId ? ctx.data[lastNodeId] : null;
    await sb.from("workflow_runs").update({ status: "success", finished_at: new Date().toISOString() }).eq("id", runId);
    return { runId, status: "success", output: lastOutput };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sb.from("workflow_runs").update({
      status: "failed", finished_at: new Date().toISOString(), error: msg,
    }).eq("id", runId);
    return { runId, status: "failed", output: null, error: msg };
  }
}

// ============================================================
// Node execution with retry
// ============================================================

async function executeNodeWithRetry(
  node: WorkflowNode,
  ctx: ExecutionContext,
  sb: SupabaseClient,
  runId: string,
): Promise<unknown> {
  const log = await sb.from("run_logs").insert({
    run_id: runId, node_id: node.id, node_label: node.label, status: "running",
  }).select().single();
  const logId = log.data ? (log.data.id as string) : null;

  let lastError: string | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const runner = nodeRunners[node.type];
      if (!runner) throw new Error(`Unknown node type: ${node.type}`);
      const output = await runner(node, ctx);
      if (logId) await sb.from("run_logs").update({ status: "success", output: output ?? null }).eq("id", logId);
      return output;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      const isRetryable = RETRYABLE_ERROR.test(lastError);
      if (!isRetryable || attempt === MAX_RETRIES - 1) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS[attempt]));
    }
  }

  if (logId) await sb.from("run_logs").update({ status: "failed", error: lastError }).eq("id", logId);
  throw new Error(`Node "${node.label}" (${node.type}) failed: ${lastError}`);
}

// ============================================================
// Default Supabase client
// ============================================================

function createDefaultClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createServerClient(url, key, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}
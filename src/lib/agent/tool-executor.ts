import type { SupabaseClient } from "@supabase/supabase-js";
import { providers } from "@/lib/integrations/registry";
import { NODE_TYPES } from "@/lib/workflow-types";
import type { WorkflowNode, WorkflowEdge } from "@/lib/workflow-types";
import { industryPresets, findPreset } from "./industry-presets";

export interface ToolContext {
  supabase: SupabaseClient;
  workspaceId: string;
  workflowId?: string;
}

const nodeDescriptions: Record<string, { label: string; description: string; config: string[] }> = {
  trigger: { label: "Trigger", description: "Start point (manual, webhook, schedule)", config: ["triggerType", "scheduleCron?"] },
  webhook: { label: "Webhook/HTTP", description: "Make HTTP request to URL", config: ["method", "url", "headers?", "body?", "timeout?"] },
  http: { label: "HTTP Request", description: "Make HTTP request (alias webhook)", config: ["method", "url", "headers?", "body?", "timeout?"] },
  slack: { label: "Slack", description: "Send Slack message", config: ["webhookUrl", "text", "channel?"] },
  email: { label: "Email", description: "Send email via Resend", config: ["to", "subject", "body", "html?"] },
  notion: { label: "Notion", description: "Create/update Notion page", config: ["notionToken", "databaseId?", "pageId?", "action", "content"] },
  condition: { label: "Condition", description: "If/else branch (2 output: true/false)", config: ["expression"] },
  condition_group: { label: "Condition Group", description: "Multi-condition AND/OR (2 output)", config: ["operator", "conditions[]"] },
  delay: { label: "Delay", description: "Wait N seconds", config: ["seconds"] },
  integration: { label: "Integration", description: "Generic integration node", config: ["provider", "action", "inputNode?"] },
  transform: { label: "Transform", description: "Data transform (map, filter, aggregate, parse)", config: ["operation", "params"] },
  google: { label: "Google", description: "Google Workspace (Gmail, Calendar, Sheets, Drive)", config: ["action", "params"] },
  telegram: { label: "Telegram", description: "Send Telegram message", config: ["botToken", "chatId", "text", "parseMode?"] },
  discord: { label: "Discord", description: "Send Discord message", config: ["webhookUrl", "content", "embed?"] },
  zalo: { label: "Zalo OA", description: "Send Zalo OA message", config: ["accessToken", "to", "content"] },
  sms: { label: "SMS", description: "Send SMS (VNPT, Viettel, Mobifone)", config: ["provider", "apiKey", "to", "content"] },
  airtable: { label: "Airtable", description: "CRUD Airtable records", config: ["apiKey", "baseId", "tableId", "action", "fields?"] },
  trello: { label: "Trello", description: "Create/move Trello card", config: ["apiKey", "apiToken", "boardId", "listId", "action", "cardTitle"] },
  database: { label: "Database", description: "Query database (Supabase/HTTP)", config: ["type", "query?", "url?"] },
  sub_workflow: { label: "Sub-workflow", description: "Call another workflow as a node", config: ["workflowId", "inputMapping?", "outputKey?"] },
  parallel: { label: "Parallel", description: "Run branches concurrently", config: ["maxConcurrent?", "failFast?"] },
  loop: { label: "Loop", description: "For-each over array", config: ["sourceNode", "arrayField", "maxIterations?"] },
};

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  try {
    switch (toolName) {
      case "listNodeTypes": {
        const list: string[] = [];
        for (const t of NODE_TYPES) {
          const d = nodeDescriptions[t];
          const label = d ? d.label : t;
          const desc = d ? d.description : "";
          const cfg = d ? d.config.join(", ") : "";
          list.push("- " + t + ": " + label + " - " + desc + ". Config: [" + cfg + "]");
        }
        return "Available node types (" + NODE_TYPES.length + "):\n" + list.join("\n");
      }

      case "getNodeSchema": {
        const type = args.nodeType as string;
        const d = nodeDescriptions[type];
        if (!d) return "Unknown node type: " + type;
        const example = JSON.stringify(getNodeExample(type), null, 2);
        return "Node: " + type + " (" + d.label + ")\nDescription: " + d.description + "\nConfig fields: [" + d.config.join(", ") + "]\n\nExample:\n" + example;
      }

      case "searchIntegration": {
        const keyword = (args.keyword as string).toLowerCase();
        const matches = providers.filter(
          (p) =>
            p.id.toLowerCase().includes(keyword) ||
            p.name.toLowerCase().includes(keyword) ||
            p.description.toLowerCase().includes(keyword)
        );
        const nodeMatches = Object.entries(nodeDescriptions).filter(
          ([key, val]) =>
            key.toLowerCase().includes(keyword) ||
            val.label.toLowerCase().includes(keyword) ||
            val.description.toLowerCase().includes(keyword)
        );
        const parts: string[] = [];
        if (matches.length > 0) {
          const pList = matches.map((p) => "  - " + p.name + " (" + p.id + "): " + p.description + " [auth: " + p.authType + "]");
          parts.push("Providers:\n" + pList.join("\n"));
        }
        if (nodeMatches.length > 0) {
          const nList = nodeMatches.map(([key, val]) => "  - " + val.label + " (" + key + "): " + val.description);
          parts.push("Node types:\n" + nList.join("\n"));
        }
        if (parts.length === 0) {
          const avail = providers.map((p) => p.id).join(", ");
          return 'No integrations found for "' + keyword + '". Available: ' + avail;
        }
        return parts.join("\n\n");
      }

      case "getWorkspaceIntegrations": {
        const provider = args.provider as string | undefined;
        let query = ctx.supabase
          .from("integrations")
          .select("provider, config")
          .eq("workspace_id", ctx.workspaceId);
        if (provider) query = query.eq("provider", provider);
        const { data, error } = await query;
        if (error) return "Error: " + error.message;
        if (!data || data.length === 0) {
          return provider ? 'No "' + provider + '" integration configured.' : "No integrations configured.";
        }
        const lines = data.map((i: any) => "  - " + i.provider + ": " + JSON.stringify(i.config));
        return "Configured integrations:\n" + lines.join("\n");
      }

      case "getWorkflow": {
        if (!ctx.workflowId) return "No workflow ID provided.";
        const { data, error } = await ctx.supabase
          .from("workflow_nodes")
          .select("nodes, edges")
          .eq("workflow_id", ctx.workflowId)
          .maybeSingle();
        if (error) return "Error: " + error.message;
        if (!data) return "No nodes found for this workflow.";
        return "Current workflow:\n" + JSON.stringify({ nodes: data.nodes, edges: data.edges }, null, 2);
      }

      case "validateWorkflow": {
        const nodes = args.nodes as WorkflowNode[];
        const edges = args.edges as WorkflowEdge[];
        const errors: string[] = [];

        const hasTrigger = nodes.some((n) => n.type === "trigger" || n.type === "webhook");
        if (!hasTrigger) errors.push("Missing trigger or webhook node (workflow must start with one)");

        const nodeIds = new Set(nodes.map((n) => n.id));
        for (const node of nodes) {
          if (node.type === "trigger" || node.type === "webhook") continue;
          const hasIncoming = edges.some((e) => e.target === node.id);
          if (!hasIncoming) errors.push('Node "' + node.label + '" (' + node.id + ") has no incoming edge");
        }

        for (const edge of edges) {
          if (!nodeIds.has(edge.source)) errors.push("Edge " + edge.id + ': source "' + edge.source + '" not found');
          if (!nodeIds.has(edge.target)) errors.push("Edge " + edge.id + ': target "' + edge.target + '" not found');
        }

        for (const node of nodes) {
          if (node.type === "condition" || node.type === "condition_group") {
            const outEdges = edges.filter((e) => e.source === node.id);
            const hasTrue = outEdges.some((e) => e.label === "true");
            const hasFalse = outEdges.some((e) => e.label === "false");
            if (!hasTrue) errors.push('Condition "' + node.label + '" missing "true" branch edge');
            if (!hasFalse) errors.push('Condition "' + node.label + '" missing "false" branch edge');
          }
        }

        if (nodes.length > 10) errors.push("Too many nodes (" + nodes.length + "). Max 10 per workflow.");

        if (errors.length === 0) return "OK: Workflow is valid.";
        return "Validation errors:\n" + errors.map((e) => "  - " + e).join("\n");
      }

      case "searchTemplates": {
        const keyword = (args.keyword as string).toLowerCase();
        const { data, error } = await ctx.supabase
          .from("workflow_templates")
          .select("id, name, description, nodes, edges")
          .eq("workspace_id", ctx.workspaceId);
        if (error) return "Error: " + error.message;
        if (!data || data.length === 0) return "No templates available.";
        const matches = data.filter(
          (t: any) =>
            t.name.toLowerCase().includes(keyword) ||
            (t.description || "").toLowerCase().includes(keyword)
        );
        if (matches.length === 0) {
          const names = data.map((t: any) => t.name).join(", ");
          return 'No templates matching "' + keyword + '". Available: ' + names;
        }
        const lines = matches.map((t: any) => "  - " + t.name + ": " + t.description + " (" + (t.nodes ? t.nodes.length : 0) + " nodes)");
        return "Matching templates:\n" + lines.join("\n");
      }

      case "suggestPreset": {
        const keyword = (args.keyword as string).toLowerCase();
        const matches = industryPresets.filter(
          (p) =>
            p.id.includes(keyword) ||
            p.name.toLowerCase().includes(keyword) ||
            p.description.toLowerCase().includes(keyword) ||
            p.keywords.some((k) => keyword.includes(k))
        );
        if (matches.length === 0) {
          const all = industryPresets.map((p) => "  - " + p.icon + " " + p.name + ": " + p.description);
          return "No preset matched. Available presets:\n" + all.join("\n");
        }
        const best = matches[0];
        return "Best matching preset:\n" +
          "ID: " + best.id + "\n" +
          "Name: " + best.icon + " " + best.name + "\n" +
          "Description: " + best.description + "\n\n" +
          "Workflow JSON:\n" +
          JSON.stringify(best.workflow, null, 2);
      }

      default:
        return "Unknown tool: " + toolName;
    }
  } catch (e) {
    return "Error executing " + toolName + ": " + (e instanceof Error ? e.message : String(e));
  }
}

function getNodeExample(type: string): Record<string, unknown> {
  const examples: Record<string, Record<string, unknown>> = {
    trigger: { triggerType: "webhook" },
    webhook: { method: "POST", url: "https://api.example.com/webhook", timeout: 30 },
    http: { method: "GET", url: "https://api.example.com/data" },
    slack: { webhookUrl: "https://hooks.slack.com/...", text: "Workflow notification" },
    email: { to: "user@company.com", subject: "Notification", body: "Chi tiet..." },
    notion: { notionToken: "secret_...", action: "create_page", content: "Page content" },
    condition: { expression: "{{webhook-1.status}} === 'ok'" },
    condition_group: { operator: "AND", conditions: [{ expression: "{{node.field}} > 100" }] },
    delay: { seconds: 5 },
    integration: { provider: "slack", action: "send_message" },
    transform: { operation: "map", source: "{{trigger-1.items}}" },
    google: { action: "gmail_send", to: "user@company.com", subject: "Test", body: "Hello" },
    telegram: { botToken: "123456:ABC...", chatId: "-100123456", text: "Notification" },
    discord: { webhookUrl: "https://discord.com/api/webhooks/...", content: "Hello" },
    zalo: { accessToken: "access_token_...", to: "user_id", content: "Xin chao" },
    sms: { provider: "vnpt", apiKey: "key...", to: "0912345678", content: "OTP: 123456" },
    airtable: { apiKey: "pat_...", baseId: "base_...", tableId: "tbl...", action: "create", fields: { Name: "Test" } },
    trello: { apiKey: "key", apiToken: "token", boardId: "board", listId: "list", action: "create_card", cardTitle: "New task" },
    database: { type: "supabase", query: "SELECT * FROM orders WHERE status = 'new'" },
    sub_workflow: { workflowId: "uuid-...", outputKey: "result" },
    parallel: { maxConcurrent: 5, failFast: false },
    loop: { sourceNode: "trigger-1", arrayField: "items", maxIterations: 50 },
  };
  return examples[type] || {};
}

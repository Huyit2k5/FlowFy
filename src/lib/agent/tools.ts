import { z } from "zod";

// ============================================================
// Agent Tool Definitions (OpenAI function calling format)
// ============================================================

export interface AgentTool {
  name: string;
  description: string;
  parameters: z.ZodTypeAny;
}

export const agentTools: AgentTool[] = [
  {
    name: "listNodeTypes",
    description: "List all available node types in Flowly with their descriptions and required config fields. Call this first to understand what nodes are available.",
    parameters: z.object({}),
  },
  {
    name: "getNodeSchema",
    description: "Get the detailed config schema for a specific node type. Returns required fields, types, defaults, and examples.",
    parameters: z.object({
      nodeType: z.enum([
        "trigger", "webhook", "slack", "email", "notion", "condition",
        "delay", "integration", "transform", "http", "google", "telegram",
        "discord", "zalo", "sms", "airtable", "trello", "database",
        "sub_workflow", "parallel", "loop", "condition_group",
      ]),
    }),
  },
  {
    name: "searchIntegration",
    description: "Search available integrations by keyword. Returns matching providers with their config requirements. Use this to find the right integration for the user's request.",
    parameters: z.object({
      keyword: z.string().describe("Search term: 'email', 'zalo', 'trello', 'slack', 'http', etc."),
    }),
  },
  {
    name: "getWorkspaceIntegrations",
    description: "Get all integrations already configured in the user's workspace. Use this to check if the user has already connected a service (e.g., Zalo, Slack) and get their config.",
    parameters: z.object({
      provider: z.string().optional().describe("Filter by provider ID (e.g., 'slack', 'zalo', 'email'). Omit to get all."),
    }),
  },
  {
    name: "getWorkflow",
    description: "Get the current workflow's nodes and edges from the canvas. Use this in EDIT mode to understand what's already there before making changes.",
    parameters: z.object({}),
  },
  {
    name: "validateWorkflow",
    description: "Validate a proposed workflow (nodes + edges) for correctness. Returns errors if there are issues (missing trigger, disconnected nodes, invalid config).",
    parameters: z.object({
      nodes: z.array(z.object({
        id: z.string(),
        type: z.string(),
        label: z.string(),
        position: z.object({ x: z.number(), y: z.number() }),
        data: z.record(z.string(), z.unknown()),
      })),
      edges: z.array(z.object({
        id: z.string(),
        source: z.string(),
        target: z.string(),
        label: z.enum(["true", "false"]).optional(),
      })),
    }),
  },
  {
    name: "searchTemplates",
    description: "Search workflow templates by keyword. Returns matching templates that can be used as a starting point.",
    parameters: z.object({
      keyword: z.string().describe("What the workflow does: 'order processing', 'notification', 'data sync'"),
    }),
  },
  {
    name: "suggestPreset",
    description: "Find a pre-built industry preset workflow (e-commerce, CRM, logistics, HR, marketing, finance). Returns the full workflow JSON for the best matching preset.",
    parameters: z.object({
      keyword: z.string().describe("Industry or use case: 'ecommerce', 'crm', 'logistics', 'hr', 'marketing', 'finance'"),
    }),
  },
];

// ============================================================
// Agent Message Types
// ============================================================

export interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: AgentToolCall[];
}

export interface AgentToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AgentResponse {
  messages: AgentMessage[];
  workflow?: {
    nodes: unknown[];
    edges: unknown[];
  };
  explanation: string;
  mode: "create" | "edit" | "explain";
}

// ============================================================
// System Prompt
// ============================================================

export function buildSystemPrompt(workspaceContext: {
  integrations: Array<{ provider: string; config: Record<string, unknown> }>;
  currentWorkflow?: { nodes: unknown[]; edges: unknown[] } | null;
}): string {
  const integrationList = workspaceContext.integrations
    .map((i) => `- ${i.provider}: ${JSON.stringify(i.config).slice(0, 100)}`)
    .join("\n") || "(none configured)";

  const currentWorkflow = workspaceContext.currentWorkflow
    ? `\n\nCURRENT CANVAS (for edit mode):\n${JSON.stringify(workspaceContext.currentWorkflow, null, 2).slice(0, 2000)}`
    : "";

  return `You are Flowly AI Agent, a workflow automation expert for Vietnamese SMB businesses.

## Your Role
You help users create, edit, and debug automation workflows. You generate JSON nodes and edges that render on a visual canvas (React Flow).

## Available Node Types (22 types)
1. **trigger** — Start point. Config: { triggerType: "manual"|"webhook"|"schedule", scheduleCron? }
2. **webhook** — Make HTTP request. Config: { method, url, headers?, body?, timeout? }
3. **http** — Same as webhook (alias). Config: { method, url, headers?, body?, timeout? }
4. **slack** — Send Slack message. Config: { webhookUrl, text, channel? }
5. **email** — Send email. Config: { to, subject, body, html? }
6. **notion** — Notion action. Config: { notionToken, databaseId?, pageId?, action, content }
7. **condition** — If/else branch. Config: { expression }. Has 2 output handles: "true" (green) and "false" (red). Edge label: "true" or "false".
8. **condition_group** — Multi-condition AND/OR. Config: { operator: "AND"|"OR", conditions: [{expression}] }. 2 output handles.
9. **delay** — Wait. Config: { seconds } (1-86400)
10. **integration** — Generic integration node. Config: { provider, action, inputNode?, ...providerSpecific }
11. **transform** — Data transform. Config: { operation: "map"|"filter"|"aggregate"|"parse"|"stringify"|"extract", ... }
12. **google** — Google Workspace. Config: { action: "gmail_send"|"calendar_event"|"sheets_append"|"drive_upload", ... }
13. **telegram** — Telegram message. Config: { botToken, chatId, text, parseMode? }
14. **discord** — Discord message. Config: { webhookUrl, content, embed? }
15. **zalo** — Zalo OA message. Config: { accessToken, to, content }
16. **sms** — SMS (Vietnam). Config: { provider: "vnpt"|"viettel"|"mobifone", apiKey, to, content }
17. **airtable** — Airtable. Config: { apiKey, baseId, tableId, action: "create"|"update"|"search", fields? }
18. **trello** — Trello card. Config: { apiKey, apiToken, boardId, listId, action: "create_card"|"move_card", cardTitle }
19. **database** — Database query. Config: { type: "supabase"|"http", query?, url?, ... }
20. **sub_workflow** — Call another workflow. Config: { workflowId, inputMapping?, outputKey? }
21. **parallel** — Run branches concurrently. Config: { maxConcurrent?, failFast? }
22. **loop** — For-each over array. Config: { sourceNode, arrayField, maxIterations? }

## Edge Rules
- Each edge: { id, source, target, label? }
- For condition/condition_group nodes: source handle "true" → edge.label = "true", source handle "false" → edge.label = "false"
- Non-condition nodes: no label
- Every node (except trigger) must have at least one incoming edge
- Trigger node must have exactly one outgoing edge (or two for condition)

## Position Rules
- Layout: left-to-right flow
- X spacing: 250px between columns
- Y spacing: 150px between parallel branches
- Start at position (0, 0) for trigger
- For branches: true branch at y-75, false branch at y+75

## Node ID Convention
- Use readable IDs: "trigger-1", "condition-1", "zalo-1", "trello-1"
- Label: human-readable Vietnamese description

## Template Variables
- Reference previous node output: {{nodeId.field}} or {{nodeId}} for whole output
- Example: text: "Đơn hàng {{trigger-1.orderId}}"

## User's Configured Integrations
${integrationList}

## Industry Presets (pre-built workflows)
When the user's request matches an industry use case, call suggestPreset to get a pre-built workflow:
- 📦 E-commerce Order Processing (Shopee/Lazada/Tiki orders)
- 👤 CRM Lead Notification (new lead from form)
- 🚚 Logistics & Shipment Tracking (delivery + SMS + delay check)
- 🏢 HR Employee Onboarding (new hire notification + IT tasks)
- 📣 Marketing Campaign (email + SMS + tracking loop)
- 💰 Finance & Invoice Processing (invoice → accounting → email)

## Workflow Context
${currentWorkflow || "(No current workflow — create mode)"}

## Rules
1. ALWAYS start with a trigger or webhook node
2. ALWAYS connect all nodes with edges (no orphans)
3. For condition nodes, ALWAYS create both true and false branches
4. Use Vietnamese for node labels
5. Max 10 nodes per workflow (keep it simple)
6. If user hasn't configured an integration, use the node type directly with placeholder config
7. Return your workflow as JSON in the format: {"nodes": [...], "edges": [...]}
8. In edit mode: only modify the specific nodes/edges the user asked to change, keep the rest intact
9. When editing, preserve existing node IDs and positions unless the user asks to move them

## Response Format
Always respond with:
1. A brief explanation in Vietnamese of what you're doing
2. The workflow JSON (or the diff for edits)
3. Any questions or suggestions

For EDIT mode, return:
{"explanation": "...", "nodes": [...full updated nodes...], "edges": [...full updated edges...]}

For CREATE mode, return:
{"explanation": "...", "nodes": [...], "edges": [...]}

For EXPLAIN/FIX mode, return:
{"explanation": "...", "suggestions": [...], "fixed_nodes": [...] (optional)}`;
}

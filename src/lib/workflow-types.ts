import { z } from "zod";

// ============================================================
// Node types
// ============================================================

export const NODE_TYPES = [
  "trigger",
  "webhook",
  "slack",
  "email",
  "notion",
  "condition",
  "delay",
  "integration",
  "transform",
  "http",
  "google",
  "telegram",
  "discord",
  "zalo",
  "sms",
  "airtable",
  "trello",
  "database",
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const TRIGGER_TYPES = ["manual", "webhook", "schedule"] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

// ============================================================
// Config schemas (zod) cho từng loại node
// ============================================================

export const triggerConfigSchema = z.object({
  triggerType: z.enum(TRIGGER_TYPES),
  scheduleCron: z.string().optional(), // cho schedule
});

export const webhookConfigSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  timeout: z.number().int().min(1).max(120).default(30),
});

export const slackConfigSchema = z.object({
  webhookUrl: z.string().url(),
  text: z.string(),
  channel: z.string().optional(),
});

export const emailConfigSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  html: z.boolean().default(false),
});

export const notionConfigSchema = z.object({
  notionToken: z.string(),
  databaseId: z.string().optional(),
  pageId: z.string().optional(),
  action: z.enum(["create_page", "create_item", "update_page"]),
  content: z.string().default(""),
});

export const conditionConfigSchema = z.object({
  expression: z.string(), // VD: {{output.status}} === 'ok'
});

export const delayConfigSchema = z.object({
  seconds: z.number().int().min(1).max(86400),
});

export const nodeConfigSchema = z.discriminatedUnion("nodeType", [
  z.object({ nodeType: z.literal("trigger"), ...triggerConfigSchema.shape }),
  z.object({ nodeType: z.literal("webhook"), ...webhookConfigSchema.shape }),
  z.object({ nodeType: z.literal("slack"), ...slackConfigSchema.shape }),
  z.object({ nodeType: z.literal("email"), ...emailConfigSchema.shape }),
  z.object({ nodeType: z.literal("notion"), ...notionConfigSchema.shape }),
  z.object({ nodeType: z.literal("condition"), ...conditionConfigSchema.shape }),
  z.object({ nodeType: z.literal("delay"), ...delayConfigSchema.shape }),
]);

// ============================================================
// Workflow node (lưu trong DB)
// ============================================================

export interface WorkflowNode {
  id: string; // node id trên canvas
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  data: Record<string, unknown>; // config theo type
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

// ============================================================
// Workflow (lưu trong DB)
// ============================================================

export interface Workflow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  status: "draft" | "active" | "paused";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowWithNodes extends Workflow {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  workspace_id: string;
  status: "running" | "success" | "failed" | "cancelled";
  trigger: string;
  started_at: string;
  finished_at: string | null;
  error: string | null;
}

export interface RunLog {
  id: string;
  run_id: string;
  node_id: string | null;
  node_label: string | null;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  input: unknown;
  output: unknown;
  error: string | null;
  created_at: string;
}
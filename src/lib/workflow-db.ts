import { createClient } from "@/lib/supabase/server";
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowWithNodes,
  WorkflowRun,
  RunLog,
} from "./workflow-types";

interface RawWorkflowRow extends Omit<Workflow, "nodes" | "edges"> {
  workflow_nodes?: { nodes: unknown; edges: unknown } | null;
}

interface RawNodeRow {
  nodes: unknown;
  edges: unknown;
}

/** Lấy danh sách workflow của workspace. */
export async function listWorkflows(workspaceId: string): Promise<Workflow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Workflow[];
}

/** Lấy 1 workflow kèm nodes/edges. */
export async function getWorkflow(
  workflowId: string
): Promise<WorkflowWithNodes | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("*, workflow_nodes (nodes, edges)")
    .eq("id", workflowId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const raw = data as RawWorkflowRow;
  const nodeRow = raw.workflow_nodes as RawNodeRow | undefined;
  return {
    ...raw,
    nodes: (nodeRow?.nodes ?? []) as WorkflowNode[],
    edges: (nodeRow?.edges ?? []) as WorkflowEdge[],
  };
}

/** Tạo workflow mới. */
export async function createWorkflow(params: {
  workspace_id: string;
  name: string;
  description?: string;
  trigger_type: string;
  created_by: string;
}): Promise<Workflow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflows")
    .insert({
      workspace_id: params.workspace_id,
      name: params.name,
      description: params.description ?? null,
      trigger_type: params.trigger_type,
      status: "draft",
      created_by: params.created_by,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Workflow;
}

/** Cập nhật workflow (name/description/trigger/status). */
export async function updateWorkflow(
  workflowId: string,
  patch: Partial<Pick<Workflow, "name" | "description" | "trigger_type" | "status">>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workflows")
    .update(patch)
    .eq("id", workflowId);
  if (error) throw error;
}

/** Xoá workflow. */
export async function deleteWorkflow(workflowId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("workflows").delete().eq("id", workflowId);
  if (error) throw error;
}

/** Lưu nodes/edges của workflow (upsert). */
export async function saveWorkflowNodes(
  workflowId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Promise<void> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("workflow_nodes")
    .select("id, version")
    .eq("workflow_id", workflowId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("workflow_nodes")
      .update({
        nodes,
        edges,
        version: ((existing as { version: number }).version ?? 0) + 1,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("workflow_nodes")
      .insert({ workflow_id: workflowId, nodes, edges, version: 1 });
    if (error) throw error;
  }
}

/** Lấy lịch sử run của workflow. */
export async function listWorkflowRuns(
  workflowId: string,
  limit = 20
): Promise<WorkflowRun[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WorkflowRun[];
}

/** Lấy log chi tiết của 1 run. */
export async function getRunLogs(runId: string): Promise<RunLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("run_logs")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RunLog[];
}
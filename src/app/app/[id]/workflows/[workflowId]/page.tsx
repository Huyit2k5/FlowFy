import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { getWorkflow, listWorkflowRuns } from "@/lib/workflow-db";
import WorkflowCanvas from "@/components/workflow-canvas";
import RunHistory from "@/components/run-history";
import WorkflowCanvasWithAI from "@/components/workflow-canvas-ai";

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ id: string; workflowId: string }>;
}) {
  const { id, workflowId } = await params;
  const ws = await getCurrentWorkspace(id);
  if (!ws) return null;

  const workflow = await getWorkflow(workflowId);
  if (!workflow || workflow.workspace_id !== id) {
    return (
      <div className="p-8">
        <p>Không tìm thấy workflow.</p>
        <Link href={`/app/${id}/workflows`} className="text-brand hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  const runs = await listWorkflowRuns(workflowId, 10);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/app/${id}/workflows`}
            className="text-sm text-zinc-500 hover:text-brand"
          >
            ← Danh sách
          </Link>
          <span className="text-zinc-300">/</span>
          <span className="text-sm font-semibold">{workflow.name}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <ReactFlowProvider>
            <WorkflowCanvasWithAI workspaceId={id} workflow={workflow} />
          </ReactFlowProvider>
        </div>

        {/* Run history */}
        <div className="border-t border-zinc-200 bg-white">
          <RunHistory
            workspaceId={id}
            workflowId={workflowId}
            initialRuns={runs as {
              id: string;
              status: string;
              trigger: string;
              started_at: string;
              finished_at: string | null;
              error: string | null;
            }[]}
          />
        </div>
      </div>
    </div>
  );
}
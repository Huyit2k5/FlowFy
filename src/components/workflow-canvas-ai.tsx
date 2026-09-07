"use client";

import { useState, useCallback, useRef } from "react";
import { type Node, type Edge } from "@xyflow/react";
import WorkflowCanvas from "@/components/workflow-canvas";
import AIAssistant from "@/components/ai-assistant";
import type { WorkflowWithNodes } from "@/lib/workflow-types";

interface Props {
  workspaceId: string;
  workflow: WorkflowWithNodes;
}

function toFlowNode(n: { id: string; type: string; label: string; position: { x: number; y: number }; data: Record<string, unknown> }): Node {
  return {
    id: n.id,
    type: "flow",
    position: n.position,
    data: { nodeType: n.type, label: n.label, ...n.data },
  };
}

function toFlowEdge(e: { id: string; source: string; target: string }): Edge {
  return { id: e.id, source: e.source, target: e.target };
}

export default function WorkflowCanvasWithAI({ workspaceId, workflow }: Props) {
  const [aiNodes, setAiNodes] = useState<Node[] | null>(null);
  const [aiEdges, setAiEdges] = useState<Edge[] | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);
  const [aiApplied, setAiApplied] = useState(false);
  const counter = useRef(0);

  const handleApplyWorkflow = useCallback((nodes: unknown[], edges: unknown[]) => {
    const flowNodes = (nodes as Array<{ id: string; type: string; label: string; position: { x: number; y: number }; data: Record<string, unknown> }>).map(toFlowNode);
    const flowEdges = (edges as Array<{ id: string; source: string; target: string }>).map(toFlowEdge);
    setAiNodes(flowNodes);
    setAiEdges(flowEdges);
    setCanvasKey((k) => k + 1);
    setAiApplied(true);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-zinc-100 bg-white/50 px-4 py-1.5">
        <AIAssistant workspaceId={workspaceId} onApplyWorkflow={handleApplyWorkflow} />
        {aiApplied && (
          <span className="text-xs text-green-600">
            ✓ Đã áp dụng {aiNodes?.length ?? 0} nodes từ AI — kéo thả chỉnh sửa rồi bấm Lưu
          </span>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <WorkflowCanvas
          key={canvasKey}
          workspaceId={workspaceId}
          workflow={workflow}
          initialNodes={aiNodes ?? undefined}
          initialEdges={aiEdges ?? undefined}
        />
      </div>
    </div>
  );
}
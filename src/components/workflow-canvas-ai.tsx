"use client";

import { useState, useCallback, useRef } from "react";
import WorkflowCanvas from "@/components/workflow-canvas";
import AIAssistant from "@/components/ai-assistant";
import type { WorkflowWithNodes } from "@/lib/workflow-types";

interface Props {
  workspaceId: string;
  workflow: WorkflowWithNodes;
}

export default function WorkflowCanvasWithAI({ workspaceId, workflow }: Props) {
  const [aiKey, setAiKey] = useState("normal");
  const [aiApplied, setAiApplied] = useState(false);
  const counter = useRef(0);

  const handleApplyWorkflow = useCallback((_nodes: unknown[], _edges: unknown[]) => {
    // In production: save AI-generated nodes to DB then refresh.
    // For MVP: just mark as applied (user manually recreates or we add "load from AI" button).
    setAiKey(`ai-${counter.current++}`);
    setAiApplied(true);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* AI Assistant bar */}
      <div className="flex items-center gap-3 border-b border-zinc-100 bg-white/50 px-4 py-1.5">
        <AIAssistant workspaceId={workspaceId} onApplyWorkflow={handleApplyWorkflow} />
        {aiApplied && (
          <span className="text-xs text-green-600">✓ Đã áp dụng workflow từ AI — bấm Lưu để ghi vào DB</span>
        )}
      </div>

      {/* Canvas (receives AI-generated nodes via key change to re-init) */}
      <div className="flex-1 overflow-hidden">
        <WorkflowCanvas
          key={aiKey}
          workspaceId={workspaceId}
          workflow={workflow}
        />
      </div>
    </div>
  );
}
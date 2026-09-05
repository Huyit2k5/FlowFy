"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeType } from "@/lib/workflow-types";

const typeMeta: Record<NodeType, { icon: string; label: string; color: string }> = {
  trigger: { icon: "▶", label: "Trigger", color: "border-green-300 bg-green-50" },
  webhook: { icon: "🔗", label: "Webhook", color: "border-blue-300 bg-blue-50" },
  slack: { icon: "💬", label: "Slack", color: "border-purple-300 bg-purple-50" },
  email: { icon: "✉", label: "Email", color: "border-amber-300 bg-amber-50" },
  notion: { icon: "📄", label: "Notion", color: "border-zinc-300 bg-zinc-50" },
  condition: { icon: "⋔", label: "Điều kiện", color: "border-red-300 bg-red-50" },
  delay: { icon: "⏱", label: "Đợi", color: "border-cyan-300 bg-cyan-50" },
};

export const FlowNode = memo(function FlowNode({ data, selected }: NodeProps) {
  const nodeType = (data as { nodeType?: NodeType }).nodeType ?? "trigger";
  const meta = typeMeta[nodeType] ?? typeMeta.trigger;

  return (
    <div
      className={`min-w-[160px] rounded-lg border-2 px-3 py-2 text-sm shadow-sm transition ${meta.color} ${
        selected ? "ring-2 ring-brand ring-offset-1" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden>
          {meta.icon}
        </span>
        <div>
          <p className="font-semibold text-foreground">{meta.label}</p>
          {typeof data.label === "string" && data.label && (
            <p className="max-w-[180px] truncate text-xs text-zinc-500">
              {data.label}
            </p>
          )}
        </div>
      </div>
      {/* Target handle (vào) - không cho trigger */}
      {nodeType !== "trigger" && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !border-2 !border-white !bg-brand"
        />
      )}
      {/* Source handle (ra) - không cho delay/condition (leaf) */}
      {nodeType !== "delay" && nodeType !== "condition" && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-2 !border-white !bg-brand"
        />
      )}
      {/* Condition có 2 output (true/false) */}
      {nodeType === "condition" && (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            className="!h-2.5 !w-2.5 !border-2 !border-white !bg-green-500"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Right}
            style={{ top: "70%" }}
            className="!h-2.5 !w-2.5 !border-2 !border-white !bg-red-500"
          />
        </>
      )}
    </div>
  );
});
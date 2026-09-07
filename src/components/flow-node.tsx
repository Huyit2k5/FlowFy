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
  integration: { icon: "🔌", label: "Integration", color: "border-indigo-300 bg-indigo-50" },
  transform: { icon: "🔄", label: "Transform", color: "border-teal-300 bg-teal-50" },
  http: { icon: "🌐", label: "HTTP", color: "border-blue-300 bg-blue-50" },
  google: { icon: "📧", label: "Google", color: "border-red-300 bg-red-50" },
  telegram: { icon: "✈️", label: "Telegram", color: "border-sky-300 bg-sky-50" },
  discord: { icon: "🎮", label: "Discord", color: "border-indigo-300 bg-indigo-50" },
  zalo: { icon: "💚", label: "Zalo", color: "border-green-300 bg-green-50" },
  sms: { icon: "📱", label: "SMS", color: "border-orange-300 bg-orange-50" },
  airtable: { icon: "📊", label: "Airtable", color: "border-pink-300 bg-pink-50" },
  trello: { icon: "📋", label: "Trello", color: "border-yellow-300 bg-yellow-50" },
  database: { icon: "🗄️", label: "Database", color: "border-slate-300 bg-slate-50" },
  sub_workflow: { icon: "🔁", label: "Sub-workflow", color: "border-fuchsia-300 bg-fuchsia-50" },
  parallel: { icon: "🔀", label: "Parallel", color: "border-rose-300 bg-rose-50" },
  loop: { icon: "🔂", label: "Loop", color: "border-lime-300 bg-lime-50" },
  condition_group: { icon: "⚙️", label: "Condition Group", color: "border-slate-400 bg-slate-100" },
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
      {/* Source handle (ra) - không cho delay (leaf) */}
      {nodeType !== "delay" && nodeType !== "condition" && nodeType !== "condition_group" && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-2 !border-white !bg-brand"
        />
      )}
      {/* Condition + Condition Group có 2 output (true/false) */}
      {(nodeType === "condition" || nodeType === "condition_group") && (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            style={{ top: "30%" }}
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
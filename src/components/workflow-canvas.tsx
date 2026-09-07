"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { FlowNode } from "@/components/flow-node";
import NodeConfigPanel from "@/components/node-config-panel";
import type {
  WorkflowNode,
  WorkflowWithNodes,
  NodeType,
} from "@/lib/workflow-types";
import { createClient } from "@/lib/supabase/browser";

interface Props {
  workspaceId: string;
  workflow: WorkflowWithNodes;
  initialNodes?: Node[];
  initialEdges?: Edge[];
}

const nodeTypes = { flow: FlowNode };

function toFlowNode(n: WorkflowNode): Node {
  return {
    id: n.id,
    type: "flow",
    position: n.position,
    data: { nodeType: n.type, label: n.label, ...n.data },
  };
}

function fromFlowNode(n: Node): WorkflowNode {
  const { nodeType, label, ...data } = n.data as {
    nodeType: NodeType;
    label?: string;
    [k: string]: unknown;
  };
  return {
    id: n.id,
    type: nodeType,
    label: label ?? "",
    position: n.position,
    data: data as Record<string, unknown>,
  };
}

interface PresenceUser {
  user_id: string;
  username: string;
  avatar_url?: string;
  last_seen: string;
}

export default function WorkflowCanvas({ workflow, initialNodes, initialEdges }: Props) {
  const router = useRouter();
  const { screenToFlowPosition } = useReactFlow();
  const supabase = createClient();

  const [nodes, setNodes] = useState<Node[]>(initialNodes ?? workflow.nodes.map(toFlowNode));
  const [edges, setEdges] = useState<Edge[]>(initialEdges ?? workflow.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [scheduleOn, setScheduleOn] = useState<boolean>(
    (workflow as { schedule_enabled?: boolean }).schedule_enabled ?? false
  );
  const [remoteUsers, setRemoteUsers] = useState<PresenceUser[]>([]);
  const [remoteUpdate, setRemoteUpdate] = useState(false);
  const nodeCounter = useRef(0);
  const isSavingRef = useRef(false);

  // ---- Real-time: subscribe workflow_nodes changes ----
  useEffect(() => {
    const channel = supabase
      .channel(`canvas-${workflow.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workflow_nodes",
          filter: `workflow_id=eq.${workflow.id}`,
        },
        async (payload) => {
          // Bỏ qua nếu chính mình vừa lưu
          if (isSavingRef.current) return;
          const { nodes: rawNodes, edges: rawEdges } = payload.new as {
            nodes: WorkflowNode[];
            edges: { id: string; source: string; target: string }[];
          };
          if (rawNodes && rawEdges) {
            setNodes(rawNodes.map(toFlowNode));
            setEdges(rawEdges.map((e) => ({ ...e, animated: true, id: e.id })));
            setDirty(false);
            setRemoteUpdate(true);
            setTimeout(() => setRemoteUpdate(false), 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workflow.id, supabase]);

  // ---- Real-time: Presence (ai đang online trên canvas) ----
  useEffect(() => {
    const channel = supabase.channel(`presence-${workflow.id}`);

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, PresenceUser[]>;
      setRemoteUsers(Object.values(state).flat());
    });

    channel.on("presence", { event: "join" }, (payload) => {
      const p = (payload as unknown) as { user: PresenceUser };
      setRemoteUsers((prev) => [
        ...prev.filter((u) => u.user_id !== p.user.user_id),
        p.user,
      ]);
    });

    channel.on("presence", { event: "leave" }, (payload) => {
      const p = (payload as unknown) as { user: PresenceUser };
      setRemoteUsers((prev) => prev.filter((u) => u.user_id !== p.user.user_id));
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle();
          await channel.track({
            user_id: user.id,
            username: (profile as { full_name?: string } | null)?.full_name ?? "User",
            avatar_url: (profile as { avatar_url?: string } | null)?.avatar_url,
            last_seen: new Date().toISOString(),
          } satisfies PresenceUser);
        }
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [workflow.id, supabase]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    setDirty(true);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    setDirty(true);
  }, []);

  const onConnect = useCallback(
    (conn: Connection) => {
      const label = (conn.sourceHandle === "true" || conn.sourceHandle === "false") ? conn.sourceHandle : undefined;
      setEdges((eds) => addEdge({ ...conn, animated: true, label: label || undefined }, eds));
      setDirty(true);
    },
    []
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedId(node.id);
    setRunResult(null);
  }, []);

  const onPaneClick = useCallback(() => setSelectedId(null), []);

  // Thêm node khi bấm nút
  const addNode = (type: NodeType) => {
    nodeCounter.current += 1;
    const id = `${type}_${nodeCounter.current}`;
    const pos = screenToFlowPosition({ x: 200, y: 150 });
    const newNode: Node = {
      id,
      type: "flow",
      position: { x: pos.x + (nodeCounter.current % 5) * 20, y: pos.y + (nodeCounter.current % 3) * 20 },
      data: { nodeType: type, label: "" },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedId(id);
    setDirty(true);
  };

  const saveNodeConfig = (id: string, data: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        const { _label, ...rest } = data;
        return {
          ...n,
          data: {
            ...n.data,
            ...rest,
            label: (_label as string) ?? n.data.label ?? "",
          },
        };
      })
    );
    setDirty(true);
  };

  const deleteNode = (id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
    setDirty(true);
  };

  // Lưu workflow vào DB
  const saveWorkflow = async () => {
    setSaving(true);
    isSavingRef.current = true;
    const res = await fetch(`/api/workflows/${workflow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodes: nodes.map(fromFlowNode),
        edges,
      }),
    });
    setSaving(false);
    setTimeout(() => { isSavingRef.current = false; }, 1000);
    if (res.ok) {
      setDirty(false);
      setRunResult("✓ Đã lưu workflow.");
    } else {
      setRunResult("✗ Lỗi khi lưu. Xem console.");
    }
  };

  // Chạy workflow
  const runWorkflow = async () => {
    if (dirty) {
      if (!confirm("Chưa lưu. Lưu rồi chạy?")) return;
      await saveWorkflow();
    }
    setRunning(true);
    setRunResult(null);
    const res = await fetch(`/api/workflows/${workflow.id}/run`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setRunning(false);
    if (data.status === "success") {
      setRunResult(`✓ Chạy thành công! ${data.logs?.length ?? 0} bước.`);
    } else {
      setRunResult(`✗ Chạy lỗi: ${data.error ?? "Có node lỗi"}`);
    }
    router.refresh();
  };

  // Toggle schedule
  const toggleSchedule = async () => {
    if (!scheduleOn) {
      // Bật: tìm trigger node có scheduleCron
      const triggerNode = nodes.find(
        (n) => n.data.nodeType === "trigger" && n.data.triggerType === "schedule" && n.data.scheduleCron
      );
      if (!triggerNode) {
        setRunResult("⚠ Cần tạo trigger node với loại 'Định kỳ' và nhập cron trước.");
        return;
      }
      const cron = triggerNode.data.scheduleCron as string;
      const res = await fetch(`/api/workflows/${workflow.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cron, enabled: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setScheduleOn(true);
        setRunResult(`✓ Đã bật lịch: ${cron}`);
      } else {
        setRunResult(`✗ ${data.error ?? "Lỗi bật lịch"}`);
      }
    } else {
      const res = await fetch(`/api/workflows/${workflow.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setScheduleOn(false);
        setRunResult("✓ Đã tắt lịch chạy");
      } else {
        setRunResult(`✗ ${data.error ?? "Lỗi tắt lịch"}`);
      }
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  const palette: { type: NodeType; icon: string; label: string }[] = [
    { type: "trigger", icon: "▶", label: "Trigger" },
    { type: "webhook", icon: "🔗", label: "Webhook" },
    { type: "http", icon: "🌐", label: "HTTP" },
    { type: "slack", icon: "💬", label: "Slack" },
    { type: "email", icon: "✉", label: "Email" },
    { type: "notion", icon: "📄", label: "Notion" },
    { type: "condition", icon: "⋔", label: "Điều kiện" },
    { type: "condition_group", icon: "⚙️", label: "Condition Group" },
    { type: "delay", icon: "⏱", label: "Đợi" },
    { type: "transform", icon: "🔄", label: "Transform" },
    { type: "database", icon: "🗄️", label: "Database" },
    { type: "integration", icon: "🔌", label: "Integration" },
    { type: "sub_workflow", icon: "🔁", label: "Sub-workflow" },
    { type: "parallel", icon: "🔀", label: "Parallel" },
    { type: "loop", icon: "🔂", label: "Loop" },
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">{workflow.name}</h2>
          {dirty && <span className="text-xs text-amber-600">• chưa lưu</span>}
          {remoteUpdate && (
            <span className="animate-pulse rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              ⚡ Người khác vừa cập nhật
            </span>
          )}
          {remoteUsers.length > 0 && (
            <div className="flex -space-x-1.5">
              {remoteUsers.slice(0, 3).map((u) => (
                <span
                  key={u.user_id}
                  title={u.username}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand/20 text-[10px] font-bold text-brand"
                >
                  {u.username?.[0]?.toUpperCase() ?? "U"}
                </span>
              ))}
              {remoteUsers.length > 3 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-zinc-100 text-[10px] font-medium text-zinc-500">
                  +{remoteUsers.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={saveWorkflow}
            disabled={saving}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
          <button
            type="button"
            onClick={runWorkflow}
            disabled={running || nodes.length === 0}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {running ? "Đang chạy..." : "▶ Chạy"}
          </button>
          <button
            type="button"
            onClick={toggleSchedule}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              scheduleOn
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "border border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {scheduleOn ? "⏰ Đang bật lịch" : "⏰ Bật lịch"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Palette */}
        <div className="w-44 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Thêm node
          </p>
          <div className="flex flex-col gap-1.5">
            {palette.map((p) => (
              <button
                key={p.type}
                type="button"
                onClick={() => addNode(p.type)}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm transition hover:border-brand/40 hover:bg-zinc-50"
              >
                <span aria-hidden>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
          {runResult && (
            <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
              {runResult}
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background gap={16} size={1} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Config panel */}
        <div className="w-80 shrink-0 overflow-hidden border-l border-zinc-200 bg-white">
          <NodeConfigPanel
            key={selectedNode?.id ?? "none"}
            node={selectedNode ? fromFlowNode(selectedNode) : null}
            onSave={saveNodeConfig}
            onDelete={deleteNode}
          />
        </div>
      </div>
    </div>
  );
}
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  workflow?: { nodes: unknown[]; edges: unknown[] } | null;
  toolCalls?: number;
  confidence?: "high" | "medium" | "low";
  source?: "ai" | "preset" | "template";
}

interface Props {
  workspaceId: string;
  workflowId?: string;
  onApplyWorkflow?: (nodes: unknown[], edges: unknown[]) => void;
  onClose?: () => void;
}

export default function AiAgentChat({ workspaceId, workflowId, onApplyWorkflow, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | "explain">("create");
  const [showPreview, setShowPreview] = useState(false);
  const [previewNodes, setPreviewNodes] = useState<unknown[]>([]);
  const [previewEdges, setPreviewEdges] = useState<unknown[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<Message[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    historyRef.current = updatedMessages;
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          workspaceId,
          workflowId: mode !== "create" ? workflowId : undefined,
          mode,
          history: historyRef.current
            .filter((m) => m.role !== "assistant" || !m.workflow)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${data.error}` }]);
      } else {
        const aiMsg: Message = {
          role: "assistant",
          content: data.response,
          workflow: data.workflow,
          toolCalls: data.toolCalls,
          confidence: data.confidence,
          source: data.source,
        };
        setMessages((prev) => [...prev, aiMsg]);
        historyRef.current = [...historyRef.current, aiMsg];

        if (data.workflow) {
          setPreviewNodes(data.workflow.nodes);
          setPreviewEdges(data.workflow.edges);
          setShowPreview(true);
        }
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ Lỗi: ${e instanceof Error ? e.message : "Unknown"}` }]);
    }

    setLoading(false);
  }, [input, loading, messages, workspaceId, workflowId, mode]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function applyToCanvas() {
    if (onApplyWorkflow && previewNodes.length > 0) {
      onApplyWorkflow(previewNodes, previewEdges);
      setShowPreview(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">🤖 Flowly AI Agent</h2>
            <p className="text-xs text-zinc-500">
              {mode === "create" ? "Tạo workflow mới" : mode === "edit" ? "Sửa workflow hiện tại" : "Giải thích / Sửa lỗi"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              className="rounded-lg border border-zinc-200 px-2 py-1 text-xs"
            >
              <option value="create">Tạo mới</option>
              <option value="edit">Sửa</option>
              <option value="explain">Giải thích</option>
            </select>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">✕</button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-2 text-center py-8">
              <p className="text-3xl">🤖</p>
              <p className="text-sm text-zinc-600">Mô tả workflow bạn muốn tạo</p>
            <div className="mt-3 space-y-1.5">
                <button
                  onClick={() => setInput("Tạo workflow: khi nhận webhook đơn hàng mới thì gửi Slack cho team và tạo task Trello")}
                  className="block w-full rounded-lg bg-zinc-50 px-3 py-2 text-left text-xs text-zinc-600 hover:bg-zinc-100"
                >
                  {"Khi nhận đơn hàng → gửi Slack + tạo Trello"}
                </button>
                <button
                  onClick={() => setInput("Tạo workflow: khi nhận webhook, nếu order.total > 5000000 thì gửi Zalo cho manager, nếu không thì gửi email cho khách")}
                  className="block w-full rounded-lg bg-zinc-50 px-3 py-2 text-left text-xs text-zinc-600 hover:bg-zinc-100"
                >
                  {"Nếu đơn > 5 trieu → Zalo manager, không → email khách"}
                </button>
                <button
                  onClick={() => setInput("Tạo workflow: mỗi sáng 8h gửi email tổng hợp đơn hàng trong ngày cho team")}
                  className="block w-full rounded-lg bg-zinc-50 px-3 py-2 text-left text-xs text-zinc-600 hover:bg-zinc-100"
                >
                  {"Mỗi sáng 8h → email tổng hợp đơn hàng"}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                <button onClick={() => setInput("Tạo workflow xử lý đơn hàng Shopee")} className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] text-violet-700 hover:bg-violet-100">📦 Đơn hàng</button>
                <button onClick={() => setInput("Tạo workflow chăm sóc khách hàng mới")} className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] text-violet-700 hover:bg-violet-100">👤 CRM</button>
                <button onClick={() => setInput("Tạo workflow theo dõi vận chuyển")} className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] text-violet-700 hover:bg-violet-100">🚚 Logistics</button>
                <button onClick={() => setInput("Tạo workflow onboarding nhân viên mới")} className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] text-violet-700 hover:bg-violet-100">🏢 HR</button>
                <button onClick={() => setInput("Tạo workflow marketing campaign")} className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] text-violet-700 hover:bg-violet-100">📣 Marketing</button>
                <button onClick={() => setInput("Tạo workflow xử lý hóa đơn")} className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] text-violet-700 hover:bg-violet-100">💰 Tài chính</button>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-brand text-white"
                    : "bg-zinc-100 text-zinc-800"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.toolCalls !== undefined && msg.toolCalls > 0 && (
                  <p className="mt-1 text-[10px] text-zinc-400">{msg.toolCalls} tool calls</p>
                )}
                {msg.confidence && (
                  <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    msg.confidence === "high" ? "bg-green-100 text-green-700" :
                    msg.confidence === "medium" ? "bg-amber-100 text-amber-700" :
                    "bg-zinc-100 text-zinc-500"
                  }`}>
                    {msg.confidence === "high" ? "✓ Khớp cao" : msg.confidence === "medium" ? "~ Khớp vừa" : "● Khớp thấp"}
                    {msg.source === "preset" ? " (preset)" : msg.source === "template" ? " (template)" : ""}
                  </span>
                )}
                {msg.workflow && !showPreview && (
                  <button
                    onClick={() => {
                      setPreviewNodes(msg.workflow!.nodes);
                      setPreviewEdges(msg.workflow!.edges);
                      setShowPreview(true);
                    }}
                    className="mt-2 rounded-lg bg-white/20 px-2 py-1 text-[11px] font-medium"
                  >
                    Xem preview ({msg.workflow.nodes.length} nodes)
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-zinc-100 px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Preview */}
        {showPreview && previewNodes.length > 0 && (
          <div className="border-t border-zinc-100 px-4 py-3 bg-zinc-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-zinc-600">
                Preview: {previewNodes.length} nodes, {previewEdges.length} edges
              </h4>
              <button onClick={() => setShowPreview(false)} className="text-xs text-zinc-400 hover:text-zinc-600">Ẩn</button>
            </div>
            <div className="max-h-32 overflow-y-auto rounded-lg bg-white p-2 text-[11px] font-mono text-zinc-600">
              <pre>{JSON.stringify({ nodes: previewNodes.map((n: any) => ({ id: n.id, type: n.type, label: n.label })), edges: previewEdges.map((e: any) => `${e.source} → ${e.target}${e.label ? ` (${e.label})` : ""}`) }, null, 1)}</pre>
            </div>
            <button
              onClick={applyToCanvas}
              className="mt-2 w-full rounded-lg bg-brand py-2 text-sm font-medium text-white"
            >
              Áp dụng vào canvas
            </button>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-zinc-100 px-4 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mô tả workflow... (Enter để gửi)"
              className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Gửi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

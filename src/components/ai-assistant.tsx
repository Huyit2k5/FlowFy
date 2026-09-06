"use client";

import { useState } from "react";

interface Props {
  workspaceId: string;
  workflowId?: string;
  onApplyWorkflow?: (nodes: unknown[], edges: unknown[]) => void;
}

export default function AIAssistant({ workspaceId, onApplyWorkflow }: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ nodes: unknown[]; edges: unknown[]; source: string } | null>(null);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!description.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ai/generate-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, workspace_id: workspaceId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Lỗi sinh workflow");
        return;
      }

      setResult({ nodes: data.nodes, edges: data.edges, source: data.source });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/5 px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand/10"
      >
        <span aria-hidden>✨</span> AI Assistant
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">✨ AI Workflow Generator</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Mô tả workflow bạn muốn tạo, AI sẽ sinh nodes + edges tự động.
            </p>

            <div className="mt-4">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='VD: "Khi nhận webhook từ form, validate data rồi gửi email xác nhận + thêm vào Google Sheets + thông báo Slack"'
                rows={3}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-zinc-400">
                  Hỗ trợ: email, slack, telegram, zalo, google, airtable, trello, http, notion...
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading || !description.trim()}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {loading ? "Đang sinh..." : "✨ Sinh workflow"}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            {result && (
              <div className="mt-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-700">
                    ✓ Đã sinh {result.nodes.length} nodes, {result.edges.length} edges
                    {result.source === "llm" ? " (AI)" : " (template)"}
                  </p>
                  <div className="mt-3 max-h-48 overflow-y-auto rounded bg-white p-3">
                    <pre className="text-xs text-zinc-600">
                      {result.nodes.map((n) => {
                        const node = n as { type: string; label: string };
                        return `${node.type}: ${node.label}\n`;
                      }).join("")}
                    </pre>
                  </div>
                  {onApplyWorkflow && (
                    <button
                      type="button"
                      onClick={() => {
                        onApplyWorkflow(result.nodes, result.edges);
                        setOpen(false);
                      }}
                      className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                    >
                      Áp dụng vào canvas
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
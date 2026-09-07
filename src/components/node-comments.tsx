"use client";

import { useCallback, useEffect, useState } from "react";

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user: { id: string; username: string } | null;
}

interface Props {
  workflowId: string;
  nodeId: string;
}

export default function NodeComments({ workflowId, nodeId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/workflows/${workflowId}/nodes/${nodeId}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments ?? []);
    }
  }, [workflowId, nodeId]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/workflows/${workflowId}/nodes/${nodeId}/comments`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments ?? []);
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [workflowId, nodeId]);

  async function handleSend() {
    if (!newComment.trim()) return;
    setSending(true);
    const res = await fetch(`/api/workflows/${workflowId}/nodes/${nodeId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newComment.trim() }),
    });
    setSending(false);
    if (res.ok) {
      setNewComment("");
      fetchComments();
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/workflows/${workflowId}/nodes/${nodeId}/comments?id=${id}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return <p className="text-xs text-zinc-400">Đang tải comments...</p>;

  return (
    <div className="border-t border-zinc-100 pt-3">
      <p className="mb-2 text-xs font-semibold text-zinc-500">💬 Comments ({comments.length})</p>

      {comments.length > 0 && (
        <div className="mb-3 max-h-32 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="mb-2 rounded-lg bg-zinc-50 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-600">
                  {c.user?.username ?? "User"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400">{new Date(c.created_at).toLocaleString("vi-VN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  <button onClick={() => handleDelete(c.id)} className="text-[10px] text-zinc-400 hover:text-red-500">✕</button>
                </div>
              </div>
              <p className="mt-0.5 text-xs text-zinc-700">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Thêm comment..."
          className="flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-xs outline-none focus:border-brand"
        />
        <button
          onClick={handleSend}
          disabled={sending || !newComment.trim()}
          className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {sending ? "..." : "Gửi"}
        </button>
      </div>
    </div>
  );
}
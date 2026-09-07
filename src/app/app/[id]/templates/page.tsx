"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Template {
  id: string;
  name: string;
  description: string;
  nodes: unknown[];
  edges: unknown[];
  created_at: string;
}

export default function TemplatesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const wsId = params.id;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch(`/api/templates?workspace_id=${wsId}`);
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates ?? []);
    }
  }, [wsId]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/templates?workspace_id=${wsId}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates ?? []);
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [wsId]);

  async function handleDuplicate(templateId: string) {
    setDuplicating(templateId);
    const res = await fetch(`/api/templates/${templateId}/duplicate?workspace_id=${wsId}`, { method: "POST" });
    setDuplicating(null);
    if (res.ok) {
      const data = await res.json();
      router.push(`/app/${wsId}/workflows/${data.workflow.id}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá template này?")) return;
    await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    // Create from current workflow: user needs to be on a workflow page first
    // For now, create empty template placeholder
    const res = await fetch(`/api/templates?workspace_id=${wsId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        description: newDesc,
        nodes: [{ id: "trigger_1", type: "trigger", label: "Bắt đầu", position: { x: 100, y: 200 }, data: { triggerType: "manual" } }],
        edges: [],
      }),
    });
    if (res.ok) {
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      fetchTemplates();
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">📋 Workflow Templates</h1>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-100" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">📋 Workflow Templates</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          ＋ Tạo template
        </button>
      </div>

      {showCreate && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tên template"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Mô tả (optional)"
            className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={handleCreate} className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white">Tạo</button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm">Hủy</button>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Tip: Tạo workflow trước, sau đó save làm template từ canvas.
          </p>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-4xl" aria-hidden>📋</p>
          <p className="mt-2 text-sm text-zinc-500">Chưa có template nào.</p>
          <p className="text-xs text-zinc-400">Tạo workflow rồi save làm template để chia sẻ với team.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-semibold">{t.name}</h3>
                <button onClick={() => handleDelete(t.id)} className="text-xs text-zinc-400 hover:text-red-500" aria-label="Xoá">✕</button>
              </div>
              {t.description && <p className="mt-1 text-xs text-zinc-500">{t.description}</p>}
              <p className="mt-2 text-xs text-zinc-400">
                {(t.nodes ?? []).length} nodes · {(t.edges ?? []).length} edges · {new Date(t.created_at).toLocaleDateString("vi-VN")}
              </p>
              <button
                onClick={() => handleDuplicate(t.id)}
                disabled={duplicating === t.id}
                className="mt-3 w-full rounded-lg border border-brand/30 bg-brand/5 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
              >
                {duplicating === t.id ? "Đang tạo..." : "📋 Duplicate thành workflow"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
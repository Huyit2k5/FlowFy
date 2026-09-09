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
  created_by?: string;
  is_public: boolean;
  category: string;
  install_count: number;
  author_name: string | null;
  published_at: string | null;
}

const CATEGORIES = [
  { value: "general", label: "Tổng hợp" },
  { value: "crm", label: "CRM" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "hr", label: "HR" },
  { value: "finance", label: "Tài chính" },
];

export default function TemplatesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const wsId = params.id;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
    const res = await fetch(`/api/templates?workspace_id=${wsId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        description: newDesc,
        category: newCategory,
        nodes: [{ id: "trigger_1", type: "trigger", label: "Bắt đầu", position: { x: 100, y: 200 }, data: { triggerType: "manual" } }],
        edges: [],
      }),
    });
    if (res.ok) {
      setNewName("");
      setNewDesc("");
      setNewCategory("general");
      setShowCreate(false);
      fetchTemplates();
    }
  }

  async function handlePublish(templateId: string, isPublic: boolean) {
    setPublishing(templateId);
    setToast(null);
    const res = await fetch(`/api/templates/${templateId}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: isPublic }),
    });
    setPublishing(null);
    if (res.ok) {
      const data = await res.json();
      setTemplates((prev) => prev.map((t) => (t.id === templateId ? data.template : t)));
      setToast(isPublic ? "Đã publish lên Marketplace!" : "Đã bỏ publish");
      setTimeout(() => setToast(null), 3000);
    } else {
      const err = await res.json();
      setToast(err.error ?? "Lỗi khi publish");
      setTimeout(() => setToast(null), 3000);
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
        <div className="flex gap-2">
          <a
            href="/templates/marketplace"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            🏪 Marketplace
          </a>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            ＋ Tạo template
          </button>
        </div>
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
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="mt-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <div className="mt-3 flex gap-2">
            <button onClick={handleCreate} className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white">Tạo</button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm">Hủy</button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-4xl" aria-hidden>📋</p>
          <p className="mt-2 text-sm text-zinc-500">Chưa có template nào.</p>
          <p className="mt-1 text-xs text-zinc-400">Tạo workflow rồi save làm template để chia sẻ với team.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{t.name}</h3>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {CATEGORIES.find((c) => c.value === t.category)?.label ?? t.category}
                    {t.is_public && <span className="ml-2 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Public</span>}
                  </p>
                </div>
                <button onClick={() => handleDelete(t.id)} className="shrink-0 text-xs text-zinc-400 hover:text-red-500" aria-label="Xoá">✕</button>
              </div>
              {t.description && <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{t.description}</p>}
              <p className="mt-2 text-xs text-zinc-400">
                {(t.nodes ?? []).length} nodes · {(t.edges ?? []).length} edges
                {t.is_public && <span className="ml-2">⬇ {t.install_count} installs</span>}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleDuplicate(t.id)}
                  disabled={duplicating === t.id}
                  className="flex-1 rounded-lg border border-brand/30 bg-brand/5 px-2 py-1.5 text-xs font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
                >
                  {duplicating === t.id ? "..." : "Duplicate"}
                </button>
                <button
                  onClick={() => handlePublish(t.id, !t.is_public)}
                  disabled={publishing === t.id}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium disabled:opacity-50 ${
                    t.is_public
                      ? "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                      : "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                  }`}
                >
                  {publishing === t.id ? "..." : t.is_public ? "Unpublish" : "Publish"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

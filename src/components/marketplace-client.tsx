"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  install_count: number;
  author_name: string | null;
  author_avatar: string | null;
  workspace_name: string | null;
  published_at: string | null;
  nodes: unknown[];
  edges: unknown[];
}

const CATEGORIES = [
  { value: "all", label: "Tất cả" },
  { value: "crm", label: "CRM" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "hr", label: "HR" },
  { value: "finance", label: "Tài chính" },
  { value: "general", label: "Tổng hợp" },
];

const SORTS = [
  { value: "installs", label: "Popular" },
  { value: "newest", label: "Mới nhất" },
  { value: "name", label: "A-Z" },
];

export default function MarketplaceClient() {
  const router = useRouter();
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("installs");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (reset = false) => {
    const targetPage = reset ? 1 : page;
    if (reset) setPage(1);
    setLoading(true);
    const params = new URLSearchParams({
      page: String(targetPage),
      limit: "12",
      sort,
    });
    if (category !== "all") params.set("category", category);
    if (search.trim()) params.set("search", search.trim());

    try {
      const res = await fetch(`/api/templates/marketplace?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(prev => (reset ? data.templates : [...prev, ...data.templates]));
        setTotal(data.total);
        setHasMore(data.hasMore);
      }
    } finally {
      setLoading(false);
    }
  }, [page, category, search, sort]);

  useEffect(() => {
    const t = setTimeout(() => fetchTemplates(true), 300);
    return () => clearTimeout(t);
  }, [fetchTemplates]);

  async function handleInstall(id: string) {
    setInstalling(id);
    setToast(null);
    // Use the first workspace from localStorage or redirect to app
    const wsId = localStorage.getItem("flowly_ws_id");
    if (!wsId) {
      setToast("Vui lòng đăng nhập và tạo workspace trước");
      setTimeout(() => setToast(null), 3000);
      setInstalling(null);
      return;
    }
    const res = await fetch(`/api/templates/${id}/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: wsId }),
    });
    setInstalling(null);
    if (res.ok) {
      const data = await res.json();
      setToast("Đã cài template! Đang mở workflow...");
      setTimeout(() => router.push(`/app/${wsId}/workflows/${data.workflow.id}`), 800);
    } else {
      const err = await res.json();
      setToast(err.error ?? "Lỗi khi cài template");
      setTimeout(() => setToast(null), 3000);
    }
  }

  function nodeCount(t: MarketplaceTemplate) {
    return (t.nodes as unknown[]).length;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Hero */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight">📋 Template Marketplace</h1>
          <p className="mt-2 text-zinc-600">
            Khám phá {total} workflow templates do cộng đồng chia sẻ. Cài đặt và tùy biến theo nhu cầu của bạn.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  category === c.value
                    ? "bg-brand text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm template..."
              className="w-48 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* Grid */}
        {templates.length === 0 && !loading ? (
          <div className="py-16 text-center">
            <p className="text-4xl" aria-hidden>📋</p>
            <p className="mt-3 text-zinc-500">Chưa có template công khai nào.</p>
            <p className="mt-1 text-sm text-zinc-400">Be the first to publish a template from your workspace!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div key={t.id} className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 transition hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-zinc-900">{t.name}</h3>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      bởi <span className="font-medium text-zinc-500">{t.author_name ?? "Unknown"}</span>
                      {t.workspace_name && <span className="ml-1 text-zinc-400">· {t.workspace_name}</span>}
                    </p>
                  </div>
                  <span className="ml-2 shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase text-zinc-500">
                    {t.category}
                  </span>
                </div>

                {t.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{t.description}</p>
                )}

                <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
                  <span>📊 {nodeCount(t)} nodes</span>
                  <span>⬇ {t.install_count} installs</span>
                  {t.published_at && (
                    <span className="ml-auto">{new Date(t.published_at).toLocaleDateString("vi-VN")}</span>
                  )}
                </div>

                <button
                  onClick={() => handleInstall(t.id)}
                  disabled={installing === t.id}
                  className="mt-3 w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
                >
                  {installing === t.id ? "Đang cài..." : "Cài đặt template"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={() => fetchTemplates(false)}
              disabled={loading}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            >
              {loading ? "Đang tải..." : "Tải thêm"}
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

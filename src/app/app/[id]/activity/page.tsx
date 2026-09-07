"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Activity {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user: { id: string; username: string } | null;
}

const actionMeta: Record<string, { icon: string; label: string }> = {
  "workflow.create": { icon: "🟢", label: "Tạo workflow" },
  "workflow.update": { icon: "🟡", label: "Sửa workflow" },
  "workflow.delete": { icon: "🔴", label: "Xoá workflow" },
  "workflow.run": { icon: "🔵", label: "Chạy workflow" },
  "integration.create": { icon: "🔌", label: "Tạo integration" },
  "integration.update": { icon: "🔌", label: "Sửa integration" },
  "integration.delete": { icon: "🔌", label: "Xoá integration" },
  "member.invite": { icon: "👤", label: "Mời thành viên" },
  "member.remove": { icon: "👤", label: "Xoá thành viên" },
  "billing.upgrade": { icon: "💳", label: "Upgrade" },
  "billing.downgrade": { icon: "💳", label: "Downgrade" },
};

const actionFilters = [
  { id: "all", label: "Tất cả" },
  { id: "workflow.create", label: "Tạo" },
  { id: "workflow.update", label: "Sửa" },
  { id: "workflow.run", label: "Chạy" },
  { id: "integration.create", label: "Integration" },
];

export default function ActivityPage() {
  const params = useParams<{ id: string }>();
  const wsId = params.id;
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    const action = filter === "all" ? "" : `&action=${filter}`;
    const res = await fetch(`/api/activity?workspace_id=${wsId}${action}`);
    if (res.ok) {
      const data = await res.json();
      setActivities(data.activities ?? []);
    }
  }, [wsId, filter]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const action = filter === "all" ? "" : `&action=${filter}`;
        const res = await fetch(`/api/activity?workspace_id=${wsId}${action}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities ?? []);
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [wsId, filter]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">📋 Team Activity</h1>
        <div className="flex gap-1 rounded-lg border border-zinc-200 p-0.5">
          {actionFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                filter === f.id ? "bg-brand text-white" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-100" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-4xl" aria-hidden>📋</p>
          <p className="mt-2 text-sm text-zinc-500">Chưa có hoạt động nào.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {activities.map((a) => {
            const meta = actionMeta[a.action] ?? { icon: "⚪", label: a.action };
            const entityName = (a.metadata?.name as string) || (a.metadata?.entity as string) || "";
            return (
              <div key={a.id} className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-white p-3">
                <span className="mt-0.5 text-lg" aria-hidden>{meta.icon}</span>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{a.user?.username ?? "System"}</span>{" "}
                    <span className="text-zinc-600">{meta.label}</span>
                    {entityName && <span className="text-zinc-500"> &quot;{entityName}&quot;</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {new Date(a.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
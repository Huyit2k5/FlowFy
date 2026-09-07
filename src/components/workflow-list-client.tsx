"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SampleWorkflows from "@/components/sample-workflows";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  status: string;
  created_at: string;
}

interface Props {
  workspaceId: string;
  workflows: Workflow[];
}

export default function WorkflowListClient({ workspaceId, workflows }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("manual");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên workflow.");
      return;
    }
    setError("");
    setCreating(true);

    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspace_id: workspaceId,
        name: name.trim(),
        trigger_type: triggerType,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);

    if (!res.ok) {
      setError(data.error || "Không thể tạo workflow.");
      return;
    }
    router.push(`/app/${workspaceId}/workflows/${data.workflow.id}`);
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá workflow này?")) return;
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const statusStyle: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    draft: "bg-zinc-100 text-zinc-600",
    paused: "bg-amber-100 text-amber-700",
  };
  const statusLabel: Record<string, string> = {
    active: "Hoạt động",
    draft: "Bản nháp",
    paused: "Tạm dừng",
  };
  const triggerLabel: Record<string, string> = {
    manual: "Chạy tay",
    webhook: "Webhook",
    schedule: "Định kỳ",
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setShowModal(true);
          setError("");
          setName("");
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
      >
        + Tạo workflow
      </button>

      {workflows.length === 0 ? (
        <SampleWorkflows workspaceId={workspaceId} />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((w) => (
            <div
              key={w.id}
              className="group relative rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-brand/40 hover:shadow-md"
            >
              <Link href={`/app/${workspaceId}/workflows/${w.id}`} className="block">
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-brand">
                    {w.name}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[w.status] ?? statusStyle.draft}`}
                  >
                    {statusLabel[w.status] ?? w.status}
                  </span>
                </div>
                {w.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-500">
                    {w.description}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
                  <span>{triggerLabel[w.trigger_type] ?? w.trigger_type}</span>
                  <span>{new Date(w.created_at).toLocaleDateString("vi-VN")}</span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(w.id)}
                className="absolute right-3 bottom-3 hidden rounded-md px-2 py-1 text-xs text-red-500 transition hover:bg-red-50 group-hover:block"
              >
                Xoá
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Tạo workflow mới</h2>
            <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Báo cáo bán hàng hằng ngày"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Loại trigger</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  <option value="manual">Chạy tay</option>
                  <option value="webhook">Webhook</option>
                  <option value="schedule">Định kỳ (cron)</option>
                </select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {creating ? "Đang tạo..." : "Tạo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
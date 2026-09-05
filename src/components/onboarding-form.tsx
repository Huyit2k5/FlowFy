"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên workspace.");
      return;
    }
    setError("");
    setLoading(true);

    const body = new FormData();
    body.set("workspace_name", name.trim());

    const res = await fetch("/api/workspaces", { method: "POST", body });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.workspaceId) {
      setError(data.error || "Không thể tạo workspace. Vui lòng thử lại.");
      setLoading(false);
      return;
    }

    router.push(`/app/${data.workspaceId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Tên workspace
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: Công ty ABC, Team Marketing"
          className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          autoFocus
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Đang tạo..." : "Tạo và bắt đầu"}
      </button>
    </form>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    const body = new FormData();
    body.set("workspace_id", workspaceId);
    body.set("email", email.trim());
    body.set("role", role);

    const res = await fetch("/api/workspaces/invites", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Không thể mời thành viên.");
      return;
    }
    setSuccess(`Đã gửi lời mời đến ${email}.`);
    setEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@company.com"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Vai trò</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "member" | "admin")}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Đang gửi..." : "Gửi lời mời"}
      </button>
    </form>
  );
}
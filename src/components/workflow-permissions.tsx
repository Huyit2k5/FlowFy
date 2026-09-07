"use client";

import { useCallback, useEffect, useState } from "react";

interface Permission {
  id: string;
  user_id: string;
  role: string;
  user: { id: string; username: string } | null;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  user?: { username: string } | null;
}

interface Props {
  workflowId: string;
  workspaceId: string;
  members?: Member[];
}

const ROLES = [
  { value: "viewer", label: "Xem", color: "bg-zinc-100 text-zinc-600" },
  { value: "commenter", label: "Bình luận", color: "bg-purple-100 text-purple-700" },
  { value: "runner", label: "Chạy", color: "bg-blue-100 text-blue-700" },
  { value: "editor", label: "Sửa", color: "bg-amber-100 text-amber-700" },
  { value: "admin", label: "Quản trị", color: "bg-red-100 text-red-700" },
];

const roleMap = Object.fromEntries(ROLES.map((r) => [r.value, r]));

export default function WorkflowPermissions({ workflowId, members = [] }: Props) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const [loading, setLoading] = useState(true);

  const fetchPerms = useCallback(async () => {
    const res = await fetch(`/api/workflows/${workflowId}/permissions`);
    if (res.ok) {
      const data = await res.json();
      setPermissions(data.permissions ?? []);
    }
  }, [workflowId]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/workflows/${workflowId}/permissions`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setPermissions(data.permissions ?? []);
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [workflowId]);

  async function handleAdd() {
    if (!newUserId) return;
    await fetch(`/api/workflows/${workflowId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: newUserId, role: newRole }),
    });
    setNewUserId("");
    fetchPerms();
  }

  async function handleRemove(id: string) {
    await fetch(`/api/workflows/${workflowId}/permissions?id=${id}`, { method: "DELETE" });
    setPermissions((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleRoleChange(permId: string, roleId: string, userId: string) {
    await fetch(`/api/workflows/${workflowId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, role: roleId }),
    });
    setPermissions((prev) => prev.map((p) => (p.id === permId ? { ...p, role: roleId } : p)));
  }

  const availableMembers = members.filter((m) => !permissions.some((p) => p.user?.id === m.user_id));

  if (loading) return <p className="text-xs text-zinc-400">Đang tải...</p>;

  return (
    <div>
      <p className="mb-2 text-sm font-medium">Quyền theo workflow</p>

      {permissions.length > 0 && (
        <div className="mb-3 space-y-1">
          {permissions.map((p) => {
            const roleInfo = roleMap[p.role] ?? ROLES[0];
            return (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5">
                <span className="text-sm">{p.user?.username ?? p.user_id.slice(0, 8)}</span>
                <div className="flex items-center gap-2">
                  <select
                    value={p.role}
                    onChange={(e) => handleRoleChange(p.id, e.target.value, p.user_id)}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium border-0 cursor-pointer ${roleInfo.color}`}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <button onClick={() => handleRemove(p.id)} className="text-xs text-zinc-400 hover:text-red-500">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <select
          value={newUserId}
          onChange={(e) => setNewUserId(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
        >
          <option value="">Chọn thành viên...</option>
          {availableMembers.map((m) => (
            <option key={m.id} value={m.user_id}>
              {m.user?.username ?? m.user_id.slice(0, 8)}
            </option>
          ))}
        </select>
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!newUserId}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Thêm
        </button>
      </div>
    </div>
  );
}
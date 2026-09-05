import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspaces";
import InviteForm from "@/components/invite-form";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await getCurrentWorkspace(id);
  if (!ws) return null;

  const supabase = await createClient();
  interface MemberRow {
    id: string;
    role: string;
    status: string;
    invited_email: string | null;
    created_at: string;
    profiles: { id: string; email: string | null; full_name: string | null } | null;
  }

  const { data: rows } = await supabase
    .from("members")
    .select("id, role, status, invited_email, created_at, profiles (id, email, full_name)")
    .eq("workspace_id", id)
    .order("created_at", { ascending: true });

  const members = (rows ?? []) as unknown as MemberRow[];
  const canManage = ws.role === "owner" || ws.role === "admin";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Thành viên</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Quản lý người dùng trong workspace {ws.name}.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Member list */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-semibold">
                {members.length} thành viên
              </h2>
            </div>
            <ul className="divide-y divide-zinc-100">
              {members.map((m) => {
                const name =
                  m.profiles?.full_name || m.profiles?.email || m.invited_email || "—";
                const isInvite = m.status === "invited";
                return (
                  <li key={m.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-light text-sm font-semibold text-white">
                        {name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{name}</p>
                        <p className="text-xs text-zinc-400">
                          {isInvite ? "Đang chờ xác nhận" : m.profiles?.email}
                        </p>
                      </div>
                    </div>
                    <RoleBadge role={m.role} invited={isInvite} />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Invite */}
        <div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Mời thành viên</h2>
            {canManage ? (
              <div className="mt-4">
                <InviteForm workspaceId={id} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">
                Chỉ owner và admin mới có quyền mời thành viên.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role, invited }: { role: string; invited: boolean }) {
  const map: Record<string, string> = {
    owner: "bg-brand/10 text-brand",
    admin: "bg-purple-100 text-purple-700",
    member: "bg-zinc-100 text-zinc-600",
  };
  const label: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${invited ? "bg-amber-100 text-amber-700" : map[role] ?? map.member}`}>
      {invited ? "Đã mời" : label[role] ?? role}
    </span>
  );
}
import { createClient } from "@/lib/supabase/server";

export interface WorkspaceWithRole {
  id: string;
  name: string;
  plan: string;
  role: string;
}

interface MemberRow {
  role: string;
  workspaces: { id: string; name: string; plan: string } | null;
}

/** Lấy danh sách workspace mà user là thành viên active, kèm role. */
export async function getWorkspaces(): Promise<WorkspaceWithRole[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("role, workspaces (id, name, plan)")
    .eq("status", "active")
    .order("role", { ascending: false });

  if (error) throw error;

  return (data as unknown as MemberRow[])
    .filter((row) => row.workspaces)
    .map((row) => ({
      id: row.workspaces!.id,
      name: row.workspaces!.name,
      plan: row.workspaces!.plan,
      role: row.role,
    }));
}

/** Lấy workspace hiện tại + role của user, hoặc null. */
export async function getCurrentWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("role, workspaces (id, name, plan)")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .maybeSingle();

  if (error) return null;
  if (!data || !data.workspaces) return null;

  const row = data as unknown as MemberRow;
  return {
    id: row.workspaces!.id,
    name: row.workspaces!.name,
    plan: row.workspaces!.plan,
    role: row.role,
  };
}

/** User đã có workspace chưa? */
export async function hasAnyWorkspace(): Promise<boolean> {
  const ws = await getWorkspaces();
  return ws.length > 0;
}
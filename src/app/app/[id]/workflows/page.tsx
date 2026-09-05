import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspaces";
import WorkflowListClient from "@/components/workflow-list-client";

export default async function WorkflowsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await getCurrentWorkspace(id);
  if (!ws) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("workflows")
    .select("*")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false });

  const workflows = (data ?? []) as {
    id: string;
    name: string;
    description: string | null;
    trigger_type: string;
    status: string;
    created_at: string;
  }[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Quản lý quy trình tự động trong {ws.name}.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <WorkflowListClient
          workspaceId={id}
          workflows={workflows}
        />
      </div>
    </div>
  );
}
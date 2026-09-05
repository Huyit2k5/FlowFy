import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspaces";
import { getPlanLimits } from "@/lib/plan-limits";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await getCurrentWorkspace(id);
  if (!ws) return null;

  const supabase = await createClient();
  const limits = getPlanLimits(ws.plan);

  const [memberCount, workflowCount] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }).eq("workspace_id", id).eq("status", "active"),
    supabase.from("workflows").select("id", { count: "exact", head: true }).eq("workspace_id", id),
  ]);

  const membersUsed = memberCount.count ?? 0;
  const workflowsUsed = workflowCount.count ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Cài đặt</h1>
      <p className="mt-1 text-sm text-zinc-600">Cài đặt cho workspace {ws.name}.</p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Thông tin</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Tên</dt>
              <dd className="font-medium">{ws.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Gói hiện tại</dt>
              <dd className="font-medium capitalize">{ws.plan}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Vai trò của bạn</dt>
              <dd className="font-medium capitalize">{ws.role}</dd>
            </div>
          </dl>
          <div className="mt-4 rounded-lg bg-zinc-50 p-4">
            <h3 className="text-xs font-semibold uppercase text-zinc-400">Giới hạn gói {ws.plan}</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li className="flex justify-between">
                <span className="text-zinc-500">Thành viên</span>
                <span className={`font-medium ${membersUsed >= limits.members ? "text-red-600" : ""}`}>
                  {membersUsed} / {limits.members === Infinity ? "∞" : limits.members}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-zinc-500">Workflow</span>
                <span className={`font-medium ${workflowsUsed >= limits.workflows ? "text-red-600" : ""}`}>
                  {workflowsUsed} / {limits.workflows === Infinity ? "∞" : limits.workflows}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-zinc-500">Lưu trữ</span>
                <span className="font-medium">{limits.storageGB === Infinity ? "∞" : limits.storageGB} GB</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Tích hợp</h2>
          <p className="mt-3 text-sm text-zinc-500">
            Cấu hình webhook, Slack, email và Notion sẽ được thêm ở Phase 4.
          </p>
        </div>
      </div>
    </div>
  );
}
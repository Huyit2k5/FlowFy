import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspaces";
import DashboardTour from "@/components/dashboard-tour";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await getCurrentWorkspace(id);
  if (!ws) return null;

  const supabase = await createClient();

  const [wfRes, runRes, memberRes] = await Promise.all([
    supabase
      .from("workflows")
      .select("id, name, status, created_at")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("workflow_runs")
      .select("id, status, started_at")
      .eq("workspace_id", id)
      .order("started_at", { ascending: false })
      .limit(8),
    supabase.from("members").select("id, role, invited_email").eq("workspace_id", id),
  ]);

  interface Workflow { id: string; name: string; status: string; created_at: string }
  interface Run { id: string; status: string; started_at: string }
  interface MemberRow { id: string; role: string; status: string; invited_email: string | null }

  const workflows = (wfRes.data ?? []) as Workflow[];
  const runs = (runRes.data ?? []) as Run[];
  const members = (memberRes.data ?? []) as MemberRow[];

  const activeWf = workflows.filter((w) => w.status === "active").length;
  const failedRuns = runs.filter((r) => r.status === "failed").length;

  const stats = [
    { label: "Workflow", value: workflows.length, hint: `${activeWf} đang hoạt động` },
    { label: "Lượt chạy gần đây", value: runs.length, hint: "72h gần nhất" },
    { label: "Thành viên", value: members.length, hint: `${members.filter((m) => m.status === "active").length} active` },
    { label: "Chạy lỗi", value: failedRuns, hint: "cần kiểm tra" },
  ];

  return (
    <div>
      <DashboardTour />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tổng quan</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Xin chào! Đây là workspace <span className="font-medium">{ws.name}</span>.
          </p>
        </div>
        <Link
          id="create-workflow-btn"
          href={`/app/${ws.id}/workflows`}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          + Tạo workflow
        </Link>
      </div>

      {/* Stats */}
      <div id="dashboard-stats" className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
            <p className="text-xs text-zinc-500 sm:text-sm">{s.label}</p>
            <p className="mt-2 text-2xl font-bold sm:text-3xl">{s.value}</p>
            <p className="mt-1 hidden text-xs text-zinc-400 sm:block">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Workflows */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-semibold">Workflow của bạn</h2>
              <Link href={`/app/${ws.id}/workflows`} className="text-sm text-brand hover:underline">
                Xem tất cả
              </Link>
            </div>
            {workflows.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-4xl" aria-hidden>⚡</p>
                <p className="mt-3 text-sm font-medium">Chưa có workflow nào</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Tạo workflow đầu tiên để tự động hóa quy trình làm việc.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {workflows.slice(0, 5).map((w) => (
                  <li key={w.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium">{w.name}</p>
                      <p className="text-xs text-zinc-400">
                        {new Date(w.created_at).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <StatusBadge status={w.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent runs */}
        <div>
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-semibold">Lượt chạy gần đây</h2>
            </div>
            {runs.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-zinc-500">
                Chưa có lượt chạy nào.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {runs.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-5 py-3">
                    <span className="text-xs text-zinc-500">
                      {new Date(r.started_at).toLocaleString("vi-VN")}
                    </span>
                    <RunBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    draft: "bg-zinc-100 text-zinc-600",
    paused: "bg-amber-100 text-amber-700",
  };
  const label: Record<string, string> = {
    active: "Hoạt động",
    draft: "Bản nháp",
    paused: "Tạm dừng",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status] ?? map.draft}`}>
      {label[status] ?? status}
    </span>
  );
}

function RunBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "bg-green-100 text-green-700",
    running: "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-zinc-100 text-zinc-600",
  };
  const label: Record<string, string> = {
    success: "Thành công",
    running: "Đang chạy",
    failed: "Lỗi",
    cancelled: "Hủy",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status] ?? map.running}`}>
      {label[status] ?? status}
    </span>
  );
}
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function getSevenDaysAgo(): string {
  return new Date(Date.now() - 7 * 86400_000).toISOString();
}

export const metadata = {
  title: "Admin — Flowly",
};

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");

  // Check if user is admin (for MVP: any user with owner role in any workspace)
  // In production, add a `is_admin` column to profiles
  const { data: member } = await supabase
    .from("members")
    .select("role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (!member) {
    redirect("/app");
  }

  // Gather stats
  const sevenDaysAgo = getSevenDaysAgo();

  const [
    { count: userCount },
    { count: workspaceCount },
    { count: workflowCount },
    { count: runCount },
    { data: recentRuns },
    { data: workspaces },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("workspaces").select("id", { count: "exact", head: true }),
    supabase.from("workflows").select("id", { count: "exact", head: true }),
    supabase
      .from("workflow_runs")
      .select("id", { count: "exact", head: true })
      .gte("started_at", sevenDaysAgo),
    supabase
      .from("workflow_runs")
      .select("id, status, started_at, trigger, workspaces (name)")
      .order("started_at", { ascending: false })
      .limit(10),
    supabase
      .from("workspaces")
      .select("id, name, plan, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const failedRuns = (recentRuns ?? []).filter(
    (r: { status: string }) => r.status === "failed"
  ).length;

  const stats = [
    { label: "Users", value: userCount ?? 0 },
    { label: "Workspaces", value: workspaceCount ?? 0 },
    { label: "Workflows", value: workflowCount ?? 0 },
    { label: "Runs (7d)", value: runCount ?? 0 },
    { label: "Failed (7d)", value: failedRuns },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-lg">
            🛡️
          </span>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-zinc-500">{user.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-500">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.label === "Failed (7d)" && s.value > 0 ? "text-red-600" : ""}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Workspaces */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold">Workspaces (20 recent)</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {(workspaces ?? []).map((ws: { id: string; name: string; plan: string; created_at: string }) => (
                  <tr key={ws.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5 font-medium">{ws.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ws.plan === "pro" ? "bg-brand/10 text-brand" :
                        ws.plan === "enterprise" ? "bg-amber-100 text-amber-700" :
                        "bg-zinc-100 text-zinc-600"
                      }`}>
                        {ws.plan}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500">
                      {new Date(ws.created_at).toLocaleDateString("vi-VN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent runs */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold">Recent Runs (10)</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Trigger</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {(recentRuns ?? []).map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5 text-zinc-500">
                      {new Date(r.started_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-2.5">{(() => { const ws = r.workspaces as unknown; if (Array.isArray(ws)) return (ws[0] as { name: string })?.name ?? "—"; if (ws && typeof ws === "object") return (ws as { name: string }).name ?? "—"; return "—"; })()}</td>
                    <td className="px-4 py-2.5 text-zinc-500">{r.trigger}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "success" ? "bg-green-100 text-green-700" :
                        r.status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Health check link */}
        <div className="mt-8">
          <a
            href="/api/health"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            🏥 Health Check
          </a>
        </div>
      </div>
    </div>
  );
}
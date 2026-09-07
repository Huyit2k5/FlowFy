"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BarChart, StatCard } from "@/components/analytics-charts";

interface AnalyticsData {
  period: string;
  days: number;
  totals: { total: number; success: number; failed: number; running: number; success_rate: number; avg_duration_ms: number };
  time_series: Array<{ date: string; total: number; success: number; failed: number }>;
  top_workflows: Array<{ workflow_id: string; name: string; runs: number; success_rate: number; avg_ms: number }>;
  integration_usage: Array<{ name: string; count: number }>;
}

export default function AnalyticsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const workspaceId = params.id;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    const res = await fetch(`/api/analytics?period=${period}&workspace_id=${workspaceId}`);
    if (res.ok) {
      setData(await res.json());
      setLoading(false);
    }
  }, [period, workspaceId]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/analytics?period=${period}&workspace_id=${workspaceId}`, { signal: controller.signal });
        if (res.ok) {
          setData(await res.json());
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [period, workspaceId]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">📊 Analytics</h1>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
        <div className="mt-4 h-48 animate-pulse rounded-xl bg-zinc-100" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-sm text-zinc-500">Không tải được dữ liệu. <button onClick={() => router.push(`/app/${workspaceId}/dashboard`)} className="text-brand underline">Về dashboard</button></div>;
  }

  const { totals, time_series, top_workflows, integration_usage } = data;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">📊 Analytics</h1>
        <div className="flex gap-1 rounded-lg border border-zinc-200 p-0.5">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                period === p ? "bg-brand text-white" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {p === "7d" ? "7 ngày" : p === "30d" ? "30 ngày" : "90 ngày"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon="⚡" label="Tổng runs" value={totals.total.toLocaleString()} sub={`${totals.running} đang chạy`} />
        <StatCard icon="✅" label="Success rate" value={`${totals.success_rate}%`} sub={`${totals.success} thành công`} />
        <StatCard icon="❌" label="Failed" value={totals.failed} sub={`${data.period} vừa qua`} />
        <StatCard icon="⏱" label="Avg duration" value={totals.avg_duration_ms < 1000 ? `${totals.avg_duration_ms}ms` : `${(totals.avg_duration_ms / 1000).toFixed(1)}s`} sub="trung bình" />
      </div>

      {/* Time Series Chart */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
        <BarChart
          data={time_series.map((d) => ({ date: d.date, value: d.total, secondary: d.failed }))}
          height={180}
          color="hsl(222 70% 50%)"
          secondaryColor="hsl(0 70% 50%)"
          label="Runs per day (blue=tổng, red=failed)"
        />
      </div>

      {/* Bottom grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Top Workflows */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">Top Workflows</h3>
          {top_workflows.length === 0 ? (
            <p className="text-sm text-zinc-400">Chưa có workflow chạy</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                  <th className="pb-2">Workflow</th>
                  <th className="pb-2 text-right">Runs</th>
                  <th className="pb-2 text-right">Success</th>
                  <th className="pb-2 text-right">Avg</th>
                </tr>
              </thead>
              <tbody>
                {top_workflows.map((wf) => (
                  <tr key={wf.workflow_id} className="border-b border-zinc-50">
                    <td className="py-2 pr-2">
                      <button
                        onClick={() => router.push(`/app/${workspaceId}/workflows/${wf.workflow_id}`)}
                        className="text-left text-brand hover:underline"
                      >
                        {wf.name}
                      </button>
                    </td>
                    <td className="py-2 text-right tabular-nums">{wf.runs}</td>
                    <td className={`py-2 text-right tabular-nums ${wf.success_rate >= 90 ? "text-green-600" : wf.success_rate >= 70 ? "text-amber-600" : "text-red-600"}`}>
                      {wf.success_rate}%
                    </td>
                    <td className="py-2 text-right tabular-nums text-zinc-500">
                      {wf.avg_ms < 1000 ? `${wf.avg_ms}ms` : `${(wf.avg_ms / 1000).toFixed(1)}s`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Integration Usage */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">Integration Usage</h3>
          {integration_usage.length === 0 ? (
            <p className="text-sm text-zinc-400">Chưa có dữ liệu</p>
          ) : (
            <div className="flex flex-col gap-2">
              {integration_usage.map((item) => {
                const maxCount = integration_usage[0].count || 1;
                const pct = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="w-24 truncate text-xs text-zinc-600">{item.name}</span>
                    <div className="h-4 flex-1 overflow-hidden rounded bg-zinc-100">
                      <div className="h-full rounded bg-brand/70" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-xs tabular-nums text-zinc-500">{item.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
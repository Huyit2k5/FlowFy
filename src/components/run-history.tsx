"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/browser";

interface Run {
  id: string;
  status: string;
  trigger: string;
  started_at: string;
  finished_at: string | null;
  error: string | null;
}

interface Log {
  id: string;
  node_id: string | null;
  node_label: string | null;
  status: string;
  input: unknown;
  output: unknown;
  error: string | null;
  created_at: string;
}

interface Props {
  workspaceId: string;
  workflowId: string;
  initialRuns: Run[];
}

export default function RunHistory({ workflowId, initialRuns }: Props) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const logsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const filteredRuns = statusFilter === "all" ? runs : runs.filter((r) => r.status === statusFilter);

  function exportCSV() {
    const header = "id,status,trigger,started_at,finished_at,error\n";
    const rows = filteredRuns.map((r) =>
      [r.id, r.status, r.trigger, r.started_at, r.finished_at ?? "", (r.error ?? "").replace(/[\n,]/g, " ")].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `runs-${workflowId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Realtime: subscribe khi chọn run
  useEffect(() => {
    if (!selectedRun) return;

    // Load logs ban đầu
    loadLogs(selectedRun.id);

    // Subscribe realtime cho run logs
    const channel = supabase
      .channel(`run-logs-${selectedRun.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "run_logs", filter: `run_id=eq.${selectedRun.id}` },
        (payload) => {
          const newLog = payload.new as Log;
          setLogs((prev) => {
            if (prev.some((l) => l.id === newLog.id)) return prev;
            return [...prev, newLog].sort((a, b) => a.created_at.localeCompare(b.created_at));
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "workflow_runs", filter: `id=eq.${selectedRun.id}` },
        (payload) => {
          const updated = payload.new as Run;
          setSelectedRun(updated);
          setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          // Nếu run kết thúc, refresh logs
          if (updated.status !== "running") {
            loadLogs(updated.id);
          }
        }
      )
      .subscribe();

    logsChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRun?.id]);

  // Realtime: subscribe run mới (khi workflow chạy)
  useEffect(() => {
    const channel = supabase
      .channel(`workflow-runs-${workflowId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "workflow_runs", filter: `workflow_id=eq.${workflowId}` },
        (payload) => {
          const newRun = payload.new as Run;
          setRuns((prev) => [newRun, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workflowId]);

  async function loadLogs(runId: string) {
    setLoadingLogs(true);
    const res = await fetch(`/api/workflows/runs/${runId}/logs`);
    const data = await res.json().catch(() => ({}));
    setLogs(data.logs ?? []);
    setLoadingLogs(false);
  }

  async function refreshRuns() {
    const res = await fetch(`/api/workflows/${workflowId}/runs`);
    const data = await res.json().catch(() => ({}));
    setRuns(data.runs ?? []);
  }

  const statusStyle: Record<string, string> = {
    success: "bg-green-100 text-green-700",
    running: "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-zinc-100 text-zinc-600",
  };
  const statusLabel: Record<string, string> = {
    success: "Thành công",
    running: "Đang chạy",
    failed: "Lỗi",
    cancelled: "Hủy",
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between px-6 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
      >
        <span>📜 Lịch sử chạy ({runs.length})</span>
        <span aria-hidden>▴</span>
      </button>
    );
  }

  return (
    <div className="max-h-72 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-2">
        <span className="text-sm font-semibold">Lịch sử chạy ({filteredRuns.length}/{runs.length})</span>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-zinc-200 px-2 py-0.5 text-xs"
          >
            <option value="all">Tất cả</option>
            <option value="success">Thành công</option>
            <option value="failed">Lỗi</option>
            <option value="running">Đang chạy</option>
          </select>
          <button type="button" onClick={exportCSV} className="text-xs text-brand hover:underline">
            ⬇ CSV
          </button>
          <button
            type="button"
            onClick={refreshRuns}
            className="text-xs text-brand hover:underline"
          >
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-zinc-400 hover:text-zinc-600"
            aria-hidden
          >
            ▾
          </button>
        </div>
      </div>

      {filteredRuns.length === 0 ? (
        <p className="px-6 py-6 text-center text-sm text-zinc-400">
          {runs.length === 0 ? 'Chưa có lần chạy nào. Bấm "Chạy" để thử workflow.' : "Không có run nào khớp bộ lọc."}
        </p>
      ) : (
        <div className="flex h-64 overflow-hidden">
          {/* Run list */}
          <div className="w-64 overflow-y-auto border-r border-zinc-100">
            {filteredRuns.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedRun(r);
                  loadLogs(r.id);
                }}
                className={`block w-full border-b border-zinc-50 px-4 py-2.5 text-left text-xs transition hover:bg-zinc-50 ${
                  selectedRun?.id === r.id ? "bg-brand/5" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle[r.status] ?? statusStyle.running}`}
                  >
                    {statusLabel[r.status] ?? r.status}
                  </span>
                  <span className="text-zinc-400">{r.trigger}</span>
                </div>
                <p className="mt-1 text-zinc-500">
                  {new Date(r.started_at).toLocaleString("vi-VN")}
                </p>
              </button>
            ))}
          </div>

          {/* Log detail */}
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedRun ? (
              <p className="text-sm text-zinc-400">Chọn 1 lần chạy để xem log.</p>
            ) : loadingLogs ? (
              <p className="text-sm text-zinc-400">Đang tải log...</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log, i) => (
                  <div
                    key={log.id}
                    className={`rounded-lg border p-3 ${
                      log.status === "failed"
                        ? "border-red-200 bg-red-50"
                        : "border-zinc-100 bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {i + 1}. {log.node_label ?? log.node_id ?? "Node"}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          log.status === "success"
                            ? "text-green-600"
                            : log.status === "failed"
                            ? "text-red-600"
                            : "text-zinc-500"
                        }`}
                      >
                        {statusLabel[log.status] ?? log.status}
                      </span>
                    </div>
                    {log.error && (
                      <p className="mt-1 text-xs text-red-600">{log.error}</p>
                    )}
                    {log.output != null && (
                      <pre className="mt-2 max-h-32 overflow-auto rounded bg-white p-2 text-[11px] text-zinc-600">
                        {JSON.stringify(log.output, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
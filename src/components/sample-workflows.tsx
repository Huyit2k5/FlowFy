"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SAMPLES = [
  {
    id: "ecommerce-order",
    icon: "📦",
    name: "Xử lý đơn hàng",
    desc: "Nhận đơn → thông báo kho → tạo task đóng gói",
    steps: "Webhook → Slack → Trello",
  },
  {
    id: "crm-lead",
    icon: "👤",
    name: "Chăm sóc khách hàng",
    desc: "Lead mới → email welcome → task sales → lưu CRM",
    steps: "Webhook → Email → Trello → Airtable",
  },
  {
    id: "logistics-shipment",
    icon: "🚚",
    name: "Theo dõi vận chuyển",
    desc: "Hàng đi → SMS tracking → chờ 24h → cảnh báo trễ",
    steps: "Webhook → SMS → Delay → Condition",
  },
  {
    id: "hr-onboarding",
    icon: "🏢",
    name: "Onboarding nhân viên",
    desc: "NV mới → email → task IT → Notion → thông báo team",
    steps: "Webhook → Email → Trello → Notion → Slack",
  },
  {
    id: "marketing-campaign",
    icon: "📣",
    name: "Marketing campaign",
    desc: "Loop danh sách → email → chờ 2h → SMS reminder",
    steps: "Trigger → Loop → Email → Delay → SMS",
  },
  {
    id: "finance-invoice",
    icon: "💰",
    name: "Xử lý hóa đơn",
    desc: "Invoice → task kế toán → email khách → lưu Sheets",
    steps: "Webhook → Trello → Email → Google Sheets",
  },
];

interface Props {
  workspaceId: string;
}

export default function SampleWorkflows({ workspaceId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleUseSample(id: string) {
    setLoading(id);
    setError("");
    try {
      const sampleMap: Record<string, string> = {
        "ecommerce-order": "don hang shopee",
        "crm-lead": "lead khach hang",
        "logistics-shipment": "van chuyen",
        "hr-onboarding": "nhan vien moi",
        "marketing-campaign": "marketing campaign",
        "finance-invoice": "hoa don",
      };
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: "Mẫu mới",
          trigger_type: "webhook",
          _sample: sampleMap[id] ?? id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Lỗi tạo workflow");
        setLoading(null);
        return;
      }
      router.push(`/app/${workspaceId}/workflows/${data.workflow.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
      setLoading(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-white p-8">
        <div className="text-center">
          <p className="text-4xl" aria-hidden>⚡</p>
          <h2 className="mt-4 text-lg font-semibold">Chưa có workflow nào</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            Bắt đầu từ mẫu có sẵn hoặc để AI tạo workflow cho bạn.
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-center text-sm text-red-600">{error}</p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              onClick={() => handleUseSample(s.id)}
              disabled={loading !== null}
              className="group rounded-xl border border-zinc-200 p-4 text-left transition hover:border-brand/50 hover:shadow-md disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{s.icon}</span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-800 group-hover:text-brand">{s.name}</h3>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{s.desc}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-zinc-400">{s.steps}</span>
                <span className="text-xs font-medium text-brand opacity-0 transition group-hover:opacity-100">
                  {loading === s.id ? "Đang tạo..." : "Dùng mẫu →"}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 border-t border-zinc-100 pt-4 text-center">
          <p className="text-xs text-zinc-400">
            Hoặc vào canvas workflow và bấm <span className="font-medium text-violet-600">🤖 AI Agent</span> để mô tả workflow bạn muốn
          </p>
        </div>
      </div>
    </div>
  );
}

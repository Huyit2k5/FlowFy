"use client";

import { useState, useCallback } from "react";
import type { WorkflowNode } from "@/lib/workflow-types";

interface Props {
  node: WorkflowNode | null;
  onSave: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}

function ScheduleConfig({
  cron,
  onChange,
}: {
  cron: string;
  onChange: (v: string) => void;
}) {
  const presets = [
    { label: "Mỗi giờ", value: "0 * * * *" },
    { label: "Mỗi ngày 9h", value: "0 9 * * *" },
    { label: "T2-T6 9h", value: "0 9 * * 1-5" },
    { label: "Hàng tuần (T2)", value: "0 9 * * 1" },
  ];

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Cron expression</label>
        <input
          type="text"
          value={cron}
          onChange={(e) => onChange(e.target.value)}
          placeholder="VD: 0 9 * * 1-5 (9h T2-T6)"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Lựa chọn nhanh</label>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                cron === p.value
                  ? "bg-brand text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-zinc-400">
        Sau khi lưu, bấm &quot;Bật lịch chạy&quot; ở trên canvas để kích hoạt.
      </p>
    </div>
  );
}

function WebhookUrlBlock() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUrl = useCallback(async () => {
    setLoading(true);
    try {
      // Lấy workflow id từ parent qua context — đơn giản: dùng data prop
      // Nhưng component này không có workflow id, nên ta dùng query param
      const params = new URLSearchParams(window.location.search);
      const wfId = params.get("workflow_id");
      if (!wfId) {
        setUrl("Không tìm thấy workflow ID");
        return;
      }
      const res = await fetch(`/api/webhooks/${wfId}`);
      const json = await res.json();
      setUrl(json.webhookUrl ?? json.error ?? "Lỗi");
    } catch {
      setUrl("Lỗi mạng");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <label className="block text-sm font-medium">Webhook URL (public)</label>
      <p className="mt-1 text-xs text-zinc-500">
        Service ngoài POST JSON vào URL này để chạy workflow.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={url ?? ""}
          placeholder="Bấm nút để lấy URL"
          className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-600"
        />
        <button
          type="button"
          onClick={fetchUrl}
          disabled={loading}
          className="shrink-0 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "..." : url ? "Lấy lại" : "Lấy URL"}
        </button>
      </div>
      {url && !url.startsWith("Lỗi") && !url.startsWith("Không") && (
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(url)}
          className="mt-2 text-xs text-brand hover:underline"
        >
          Copy URL
        </button>
      )}
    </div>
  );
}

const emptyDefaults: Record<string, Record<string, unknown>> = {
  trigger: { triggerType: "manual", scheduleCron: "" },
  webhook: { method: "POST", url: "", headers: {}, body: "", timeout: 30 },
  slack: { webhookUrl: "", text: "", channel: "" },
  email: { to: "", subject: "", body: "", html: false },
  notion: { notionToken: "", databaseId: "", pageId: "", action: "create_page", content: "" },
  condition: { expression: "true" },
  delay: { seconds: 5 },
};

export default function NodeConfigPanel({ node, onSave, onDelete }: Props) {
  // Dùng key-based reset: component được remount khi đổi node (qua key ở cha)
  const [data, setData] = useState<Record<string, unknown>>(
    () => (node ? { ...(emptyDefaults[node.type] ?? {}), ...node.data } : {})
  );
  const [label, setLabel] = useState(() => (node?.label ?? ""));

  if (!node) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        Chọn 1 node để chỉnh sửa
      </div>
    );
  }

  function set(key: string, value: unknown) {
    setData((d) => ({ ...d, [key]: value }));
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Tên node</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className={inputCls}
          placeholder="Tên mô tả"
        />
      </div>

      {node.type === "trigger" && (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Loại trigger</label>
            <select
              value={data.triggerType as string}
              onChange={(e) => set("triggerType", e.target.value)}
              className={inputCls}
            >
              <option value="manual">Chạy tay</option>
              <option value="webhook">Webhook</option>
              <option value="schedule">Định kỳ (cron)</option>
            </select>
          </div>
          {data.triggerType === "schedule" && (
            <ScheduleConfig
              cron={(data.scheduleCron as string) ?? ""}
              onChange={(v) => set("scheduleCron", v)}
            />
          )}
          {data.triggerType === "webhook" && <WebhookUrlBlock />}
        </>
      )}

      {node.type === "webhook" && (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Method</label>
            <select
              value={data.method as string}
              onChange={(e) => set("method", e.target.value)}
              className={inputCls}
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">URL</label>
            <input
              type="url"
              value={(data.url as string) ?? ""}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://api.example.com/endpoint"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Headers (JSON)</label>
            <textarea
              value={
                data.headers
                  ? typeof data.headers === "string"
                    ? (data.headers as string)
                    : JSON.stringify(data.headers)
                  : ""
              }
              onChange={(e) => {
                try {
                  set("headers", e.target.value ? JSON.parse(e.target.value) : {});
                } catch {
                  set("headers", e.target.value);
                }
              }}
              placeholder='{"Authorization": "Bearer ..."}'
              rows={3}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Body (cho POST/PUT)</label>
            <textarea
              value={(data.body as string) ?? ""}
              onChange={(e) => set("body", e.target.value)}
              placeholder='{"key": "value"} hoặc plain text'
              rows={4}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Timeout (giây)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={(data.timeout as number) ?? 30}
              onChange={(e) => set("timeout", Number(e.target.value))}
              className={inputCls}
            />
          </div>
        </>
      )}

      {node.type === "slack" && (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Webhook URL</label>
            <input
              type="url"
              value={(data.webhookUrl as string) ?? ""}
              onChange={(e) => set("webhookUrl", e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nội dung</label>
            <textarea
              value={(data.text as string) ?? ""}
              onChange={(e) => set("text", e.target.value)}
              placeholder="Tin nhắn gửi lên Slack (hỗ trợ {{nodeId.field}})"
              rows={3}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Channel (tuỳ chọn)</label>
            <input
              type="text"
              value={(data.channel as string) ?? ""}
              onChange={(e) => set("channel", e.target.value)}
              placeholder="#general"
              className={inputCls}
            />
          </div>
        </>
      )}

      {node.type === "email" && (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email người nhận</label>
            <input
              type="email"
              value={(data.to as string) ?? ""}
              onChange={(e) => set("to", e.target.value)}
              placeholder="a@company.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Tiêu đề</label>
            <input
              type="text"
              value={(data.subject as string) ?? ""}
              onChange={(e) => set("subject", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nội dung</label>
            <textarea
              value={(data.body as string) ?? ""}
              onChange={(e) => set("body", e.target.value)}
              rows={5}
              className={inputCls}
            />
          </div>
        </>
      )}

      {node.type === "notion" && (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Notion Token</label>
            <input
              type="text"
              value={(data.notionToken as string) ?? ""}
              onChange={(e) => set("notionToken", e.target.value)}
              placeholder="secret_..."
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Thao tác</label>
            <select
              value={data.action as string}
              onChange={(e) => set("action", e.target.value)}
              className={inputCls}
            >
              <option value="create_page">Tạo page con</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Parent Page ID</label>
            <input
              type="text"
              value={(data.pageId as string) ?? ""}
              onChange={(e) => set("pageId", e.target.value)}
              placeholder="d8f3... (id page cha)"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nội dung</label>
            <textarea
              value={(data.content as string) ?? ""}
              onChange={(e) => set("content", e.target.value)}
              rows={4}
              className={inputCls}
            />
          </div>
        </>
      )}

      {node.type === "condition" && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Biểu thức</label>
          <input
            type="text"
            value={(data.expression as string) ?? ""}
            onChange={(e) => set("expression", e.target.value)}
            placeholder="VD: {{webhook_1.data.status}} === 'ok'"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-zinc-400">
            Dùng <code>{"{{nodeId.field}}"}</code> để tham chiếu output của node khác.
          </p>
        </div>
      )}

      {node.type === "delay" && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Thời gian (giây)</label>
          <input
            type="number"
            min={1}
            max={86400}
            value={(data.seconds as number) ?? 5}
            onChange={(e) => set("seconds", Number(e.target.value))}
            className={inputCls}
          />
        </div>
      )}

      {/* Phase 7.1: Generic integration config for new node types */}
      {["integration", "http", "google", "telegram", "discord", "zalo", "sms", "airtable", "trello", "transform", "database"].includes(node.type) && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {node.type === "integration" ? "Integration" : node.type.charAt(0).toUpperCase() + node.type.slice(1)} Config
          </p>
          {/* Dynamic fields based on node.data config keys */}
          {Object.entries(node.data).filter(([k]) => !["nodeType", "label", "providerId", "config", "inputNode"].includes(k)).map(([key, val]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-zinc-600">{key}</label>
              <input
                type="text"
                value={String(val ?? "")}
                onChange={(e) => set(key, e.target.value)}
                className={inputCls}
              />
            </div>
          ))}
          {/* Provider ID (for generic integration node) */}
          {node.type === "integration" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Provider</label>
              <select
                value={String(data.providerId ?? "")}
                onChange={(e) => set("providerId", e.target.value)}
                className={inputCls}
              >
                <option value="">— Chọn —</option>
                <option value="http">HTTP Request</option>
                <option value="google">Google Workspace</option>
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
                <option value="zalo">Zalo OA</option>
                <option value="sms">SMS (VN)</option>
                <option value="airtable">Airtable</option>
                <option value="trello">Trello</option>
                <option value="transform">Data Transform</option>
                <option value="database">Database</option>
              </select>
            </div>
          )}
          {/* Input node reference */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Input (node ID trước)</label>
            <input
              type="text"
              value={String(data.inputNode ?? "")}
              onChange={(e) => set("inputNode", e.target.value)}
              placeholder="VD: webhook_1"
              className={inputCls}
            />
            <p className="mt-0.5 text-[11px] text-zinc-400">ID của node trước để lấy output làm input</p>
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <button
          type="button"
          onClick={() => onSave(node.id, { ...data, _label: label })}
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Lưu cấu hình
        </button>
        <button
          type="button"
          onClick={() => onDelete(node.id)}
          className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Xoá node
        </button>
      </div>
    </div>
  );
}
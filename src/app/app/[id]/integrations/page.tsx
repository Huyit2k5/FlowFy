"use client";

import { useState, useEffect, useCallback } from "react";

interface Integration {
  id: string;
  type: string;
  name: string;
  config: Record<string, string>;
  is_active: boolean;
}

interface Props {
  workspaceId: string;
}

const integrationTypes = [
  {
    type: "slack",
    label: "Slack",
    icon: "💬",
    description: "Gửi thông báo lên Slack channel",
    fields: [
      { key: "webhookUrl", label: "Incoming Webhook URL", placeholder: "https://hooks.slack.com/services/...", required: true },
    ],
  },
  {
    type: "email",
    label: "Email",
    icon: "✉️",
    description: "Gửi email qua Resend API",
    fields: [
      { key: "apiKey", label: "Resend API Key", placeholder: "re_...", required: true },
      { key: "from", label: "Email người gửi", placeholder: "no-reply@yourdomain.com", required: true },
    ],
  },
  {
    type: "notion",
    label: "Notion",
    icon: "📄",
    description: "Tạo page trong Notion workspace",
    fields: [
      { key: "token", label: "Notion Integration Token", placeholder: "secret_...", required: true },
      { key: "pageId", label: "Parent Page ID", placeholder: "d8f3... (không có gạch nối)", required: false },
    ],
  },
];

export default function IntegrationsPage({ workspaceId }: Props) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/integrations?workspace_id=${workspaceId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setIntegrations(data.integrations ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Lỗi tải integrations");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const loadIntegrations = useCallback(async () => {
    try {
      const res = await fetch(`/api/integrations?workspace_id=${workspaceId}`);
      const data = await res.json();
      setIntegrations(data.integrations ?? []);
    } catch {
      setError("Lỗi tải integrations");
    }
  }, [workspaceId]);

  async function saveIntegration(type: string, config: Record<string, string>) {
    setSaving(type);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, type, config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Đã lưu ${type}`);
      loadIntegrations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi lưu");
    } finally {
      setSaving(null);
    }
  }

  async function deleteIntegration(id: string) {
    if (!confirm("Xóa integration này?")) return;
    try {
      await fetch(`/api/integrations?id=${id}`, { method: "DELETE" });
      loadIntegrations();
    } catch {
      setError("Lỗi xóa");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-zinc-400">Đang tải...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight">Tích hợp</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Cấu hình các dịch vụ bên ngoài để workflow có thể tương tác.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="mt-6 space-y-6">
        {integrationTypes.map((it) => {
          const existing = integrations.find((i) => i.type === it.type);
          return (
            <div key={it.type} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{it.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold">{it.label}</h3>
                    <p className="text-xs text-zinc-500">{it.description}</p>
                  </div>
                </div>
                {existing && (
                  <button
                    type="button"
                    onClick={() => deleteIntegration(existing.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Xóa
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {it.fields.map((f) => (
                  <div key={f.key}>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">
                      {f.label} {f.required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type={f.key.includes("key") || f.key === "token" ? "password" : "text"}
                      defaultValue={existing?.config?.[f.key] ?? ""}
                      placeholder={f.placeholder}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                      id={`int-${it.type}-${f.key}`}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={async () => {
                    const config: Record<string, string> = {};
                    for (const f of it.fields) {
                      const el = document.getElementById(`int-${it.type}-${f.key}`) as HTMLInputElement;
                      config[f.key] = el?.value?.trim() ?? "";
                    }
                    await saveIntegration(it.type, config);
                  }}
                  disabled={saving === it.type}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {saving === it.type ? "Đang lưu..." : existing ? "Cập nhật" : "Lưu"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
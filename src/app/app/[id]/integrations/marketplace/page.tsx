"use client";

import { useState } from "react";

interface IntegrationCard {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  authType: string;
  configSchema: { key: string; label: string; type: string; required: boolean; placeholder?: string; help?: string; options?: { value: string; label: string }[]; default?: string }[];
}

const allIntegrations: IntegrationCard[] = [
  { id: "http", name: "HTTP Request", icon: "🔗", description: "Gọi API REST bất kỳ với auth linh hoạt", category: "development", authType: "none", configSchema: [
    { key: "url", label: "URL", type: "url", required: true, placeholder: "https://api.example.com" },
    { key: "method", label: "Method", type: "select", required: true, options: [{ value: "GET", label: "GET" }, { value: "POST", label: "POST" }, { value: "PUT", label: "PUT" }, { value: "PATCH", label: "PATCH" }, { value: "DELETE", label: "DELETE" }], default: "GET" },
    { key: "authType", label: "Auth", type: "select", required: false, options: [{ value: "none", label: "None" }, { value: "bearer", label: "Bearer" }, { value: "basic", label: "Basic" }, { value: "api_key", label: "API Key" }], default: "none" },
    { key: "authValue", label: "Token", type: "password", required: false },
    { key: "body", label: "Body", type: "textarea", required: false },
  ]},
  { id: "google", name: "Google Workspace", icon: "📧", description: "Gmail, Calendar, Sheets, Drive", category: "productivity", authType: "oauth2", configSchema: [
    { key: "action", label: "Action", type: "select", required: true, options: [{ value: "gmail_send", label: "Gmail: Gửi" }, { value: "calendar_create", label: "Calendar: Event" }, { value: "sheets_append", label: "Sheets: Row" }, { value: "drive_upload", label: "Drive: Upload" }] },
    { key: "accessToken", label: "Access Token", type: "password", required: true },
  ]},
  { id: "telegram", name: "Telegram", icon: "✈️", description: "Gửi message qua Telegram Bot", category: "communication", authType: "api_key", configSchema: [
    { key: "botToken", label: "Bot Token", type: "password", required: true, placeholder: "123456:ABC..." },
    { key: "chatId", label: "Chat ID", type: "text", required: true },
    { key: "text", label: "Message", type: "textarea", required: true },
  ]},
  { id: "discord", name: "Discord", icon: "🎮", description: "Gửi message/embed qua Discord webhook", category: "communication", authType: "webhook_url", configSchema: [
    { key: "webhookUrl", label: "Webhook URL", type: "url", required: true },
    { key: "content", label: "Message", type: "textarea", required: true },
    { key: "embedTitle", label: "Embed Title", type: "text", required: false },
  ]},
  { id: "zalo", name: "Zalo OA", icon: "💚", description: "Gửi message qua Zalo Official Account", category: "vnm", authType: "api_key", configSchema: [
    { key: "accessToken", label: "Access Token", type: "password", required: true },
    { key: "userIds", label: "User IDs", type: "text", required: true },
    { key: "content", label: "Content", type: "textarea", required: true },
  ]},
  { id: "sms", name: "SMS (VN)", icon: "📱", description: "Gửi SMS qua VNPT / Viettel / Mobifone", category: "vnm", authType: "api_key", configSchema: [
    { key: "provider", label: "Provider", type: "select", required: true, options: [{ value: "vnpt", label: "VNPT" }, { value: "viettel", label: "Viettel" }, { value: "mobifone", label: "Mobifone" }] },
    { key: "apiKey", label: "API Key", type: "password", required: true },
    { key: "phoneNumber", label: "Phone", type: "text", required: true },
    { key: "content", label: "Content", type: "textarea", required: true },
  ]},
  { id: "airtable", name: "Airtable", icon: "📊", description: "Create, update, search records", category: "productivity", authType: "api_key", configSchema: [
    { key: "action", label: "Action", type: "select", required: true, options: [{ value: "create", label: "Create" }, { value: "update", label: "Update" }, { value: "search", label: "Search" }] },
    { key: "baseUrl", label: "Base URL", type: "text", required: true },
    { key: "apiKey", label: "API Key", type: "password", required: true },
    { key: "tableName", label: "Table", type: "text", required: true },
    { key: "fields", label: "Fields (JSON)", type: "textarea", required: true },
  ]},
  { id: "trello", name: "Trello", icon: "📋", description: "Create/move cards trong Trello", category: "productivity", authType: "api_key", configSchema: [
    { key: "action", label: "Action", type: "select", required: true, options: [{ value: "create_card", label: "Create" }, { value: "move_card", label: "Move" }] },
    { key: "apiKey", label: "API Key", type: "text", required: true },
    { key: "token", label: "Token", type: "password", required: true },
    { key: "boardId", label: "Board ID", type: "text", required: true },
    { key: "listId", label: "List ID", type: "text", required: true },
  ]},
  { id: "transform", name: "Data Transform", icon: "🔄", description: "Map, filter, aggregate, parse JSON", category: "data", authType: "none", configSchema: [
    { key: "action", label: "Action", type: "select", required: true, options: [{ value: "map", label: "Map" }, { value: "filter", label: "Filter" }, { value: "aggregate", label: "Aggregate" }, { value: "parse", label: "Parse" }, { value: "stringify", label: "Stringify" }, { value: "extract", label: "Extract" }] },
    { key: "input", label: "Input", type: "textarea", required: true },
    { key: "mapping", label: "Mapping", type: "textarea", required: false },
  ]},
  { id: "database", name: "Database", icon: "🗄️", description: "Query Supabase / HTTP API", category: "data", authType: "api_key", configSchema: [
    { key: "provider", label: "Provider", type: "select", required: true, options: [{ value: "supabase", label: "Supabase" }, { value: "http", label: "HTTP API" }] },
    { key: "query", label: "Query / URL", type: "textarea", required: true },
  ]},
  { id: "slack", name: "Slack", icon: "💬", description: "Gửi tin qua Slack incoming webhook", category: "communication", authType: "webhook_url", configSchema: [
    { key: "webhookUrl", label: "Webhook URL", type: "url", required: true },
    { key: "text", label: "Message", type: "textarea", required: true },
  ]},
  { id: "email", name: "Email", icon: "✉️", description: "Gửi email qua Resend API", category: "communication", authType: "api_key", configSchema: [
    { key: "apiKey", label: "Resend API Key", type: "password", required: true },
    { key: "from", label: "From", type: "text", required: true },
    { key: "to", label: "To", type: "text", required: true },
    { key: "subject", label: "Subject", type: "text", required: true },
    { key: "body", label: "Body", type: "textarea", required: true },
  ]},
  { id: "notion", name: "Notion", icon: "📄", description: "Tạo page trong Notion workspace", category: "productivity", authType: "api_key", configSchema: [
    { key: "notionToken", label: "Token", type: "password", required: true },
    { key: "pageId", label: "Parent Page ID", type: "text", required: false },
    { key: "content", label: "Content", type: "textarea", required: true },
  ]},
];

const categoryLabels: Record<string, string> = {
  all: "Tất cả",
  communication: "Giao tiếp",
  productivity: "Sản xuất",
  development: "Phát triển",
  data: "Dữ liệu",
  vnm: "Việt Nam",
  utility: "Công cụ",
};

export default function MarketplacePage({ workspaceId }: { workspaceId: string }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<IntegrationCard | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const filtered = allIntegrations.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || i.category === category;
    return matchSearch && matchCat;
  });

  function openConnect(integ: IntegrationCard) {
    setSelected(integ);
    setConfigValues({});
    setError("");
    setSaved(false);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError("");

    // Validate required fields
    for (const field of selected.configSchema) {
      if (field.required && !configValues[field.key]) {
        setError(`Thiếu trường: ${field.label}`);
        setSaving(false);
        return;
      }
    }

    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspace_id: workspaceId,
        type: selected.id,
        name: selected.name,
        config: configValues,
        is_active: true,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Lỗi lưu");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tích hợp</h1>
          <p className="mt-1 text-sm text-zinc-600">Kết nối Flowly với {allIntegrations.length} dịch vụ</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tích hợp..."
          className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 sm:w-64"
        />
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                category === key ? "bg-brand text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((integ) => (
          <div
            key={integ.id}
            className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-brand/40 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden>{integ.icon}</span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">{integ.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{integ.description}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                {categoryLabels[integ.category] ?? integ.category}
              </span>
              <button
                type="button"
                onClick={() => openConnect(integ)}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
              >
                Kết nối
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-12 rounded-xl border-2 border-dashed border-zinc-200 p-12 text-center">
          <p className="text-3xl" aria-hidden>🔍</p>
          <p className="mt-3 text-sm text-zinc-500">Không tìm thấy tích hợp phù hợp</p>
        </div>
      )}

      {/* Connect Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selected.icon}</span>
              <div>
                <h2 className="text-lg font-semibold">Kết nối {selected.name}</h2>
                <p className="text-xs text-zinc-500">{selected.description}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="ml-auto text-zinc-400 hover:text-zinc-600">✕</button>
            </div>

            {saved ? (
              <div className="mt-6 rounded-lg bg-green-50 p-4 text-center">
                <p className="text-sm font-medium text-green-700">✓ Đã kết nối {selected.name}</p>
                <p className="mt-1 text-xs text-green-600">Dùng node {selected.name} trong workflow để gọi integration này.</p>
                <button type="button" onClick={() => setSelected(null)} className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white">
                  Đóng
                </button>
              </div>
            ) : (
              <div className="mt-4 max-h-80 space-y-4 overflow-y-auto">
                {selected.configSchema.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1 block text-sm font-medium">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === "select" ? (
                      <select
                        value={configValues[field.key] ?? field.default ?? ""}
                        onChange={(e) => setConfigValues((v) => ({ ...v, [field.key]: e.target.value }))}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
                      >
                        <option value="">— Chọn —</option>
                        {field.options?.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        value={configValues[field.key] ?? ""}
                        onChange={(e) => setConfigValues((v) => ({ ...v, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
                      />
                    ) : (
                      <input
                        type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
                        value={configValues[field.key] ?? ""}
                        onChange={(e) => setConfigValues((v) => ({ ...v, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
                      />
                    )}
                    {field.help && <p className="mt-1 text-xs text-zinc-400">{field.help}</p>}
                  </div>
                ))}
              </div>
            )}

            {!saved && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {saving ? "Đang lưu..." : "Lưu & Kết nối"}
                </button>
                <button type="button" onClick={() => setSelected(null)} className="text-sm text-zinc-500 hover:text-zinc-700">
                  Hủy
                </button>
                {error && <span className="text-xs text-red-500">{error}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
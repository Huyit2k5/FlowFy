"use client";

import { useState, useEffect, useCallback } from "react";

interface SecurityConfig {
  sso_enabled?: boolean;
  sso_provider?: string;
  sso_client_id?: string;
  sso_client_secret?: string;
  sso_redirect_uri?: string;
  enforce_2fa?: boolean;
  ip_allowlist?: string;
  hmac_secret?: string;
  retention_days?: number;
  archive_inactive_days?: number;
  usage_alert_80?: boolean;
  usage_alert_95?: boolean;
  quota_workflows?: number | null;
  quota_members?: number | null;
}

interface Props {
  workspaceId: string;
  initial: SecurityConfig;
}

const SSO_PROVIDERS = [
  { value: "google", label: "Google Workspace" },
  { value: "microsoft", label: "Microsoft (Azure AD)" },
  { value: "okta", label: "Okta" },
  { value: "custom", label: "Custom (OIDC/SAML)" },
];

export function SecuritySettings({ workspaceId, initial }: Props) {
  const [config, setConfig] = useState<SecurityConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/security`);
    if (res.ok) {
      const data = await res.json();
      if (data.security) setConfig(data.security);
    }
  }, [workspaceId]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/security`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.security) setConfig(data.security);
        }
      } catch { /* ignore */ }
    })();
    return () => controller.abort();
  }, [workspaceId]);

  function update<K extends keyof SecurityConfig>(key: K, value: SecurityConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/workspaces/${workspaceId}/security`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      const data = await res.json();
      setConfig(data.security);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Lỗi lưu");
    }
    setSaving(false);
  }

  return (
    <div className="mt-4 space-y-5">
      {/* SSO */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase text-zinc-400">SSO / SAML</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Đăng nhập bằng tài khoản công ty</p>
          </div>
          <button
            onClick={() => update("sso_enabled", !config.sso_enabled)}
            className={`relative h-5 w-9 rounded-full transition-colors ${config.sso_enabled ? "bg-brand" : "bg-zinc-200"}`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${config.sso_enabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
          </button>
        </div>
        {config.sso_enabled && (
          <div className="mt-3 space-y-2">
            <select
              value={config.sso_provider ?? "google"}
              onChange={(e) => update("sso_provider", e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            >
              {SSO_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Client ID"
              value={config.sso_client_id ?? ""}
              onChange={(e) => update("sso_client_id", e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            />
            <input
              type="password"
              placeholder="Client Secret"
              value={config.sso_client_secret ?? ""}
              onChange={(e) => update("sso_client_secret", e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            />
            <input
              type="text"
              placeholder="Redirect URI (https://flowly.vn/sso/callback)"
              value={config.sso_redirect_uri ?? ""}
              onChange={(e) => update("sso_redirect_uri", e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            />
          </div>
        )}
      </div>

      {/* 2FA */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase text-zinc-400">Buộc 2FA</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Tất cả thành viên phải bật xác thực 2 lớp</p>
          </div>
          <button
            onClick={() => update("enforce_2fa", !config.enforce_2fa)}
            className={`relative h-5 w-9 rounded-full transition-colors ${config.enforce_2fa ? "bg-brand" : "bg-zinc-200"}`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${config.enforce_2fa ? "translate-x-4.5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* IP Allowlist */}
      <div>
        <h3 className="text-xs font-semibold uppercase text-zinc-400">IP Allowlist</h3>
        <p className="text-xs text-zinc-500 mt-0.5">Chỉ cho phép access từ IP/CIDR (phân cách bằng dấu phẩy)</p>
        <input
          type="text"
          placeholder="10.0.0.0/8, 192.168.1.0/24"
          value={config.ip_allowlist ?? ""}
          onChange={(e) => update("ip_allowlist", e.target.value)}
          className="mt-2 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
        />
        {config.ip_allowlist && (
          <p className="mt-1 text-[11px] text-amber-600">
            ⚠ Traffic từ IP khác sẽ bị chặn
          </p>
        )}
      </div>

      {/* HMAC Secret */}
      <div>
        <h3 className="text-xs font-semibold uppercase text-zinc-400">Webhook HMAC Secret</h3>
        <p className="text-xs text-zinc-500 mt-0.5">Signature cho outbound webhooks (HMAC-SHA256)</p>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            placeholder={config.hmac_secret ? "•••••••• (đã thiết lập)" : "Tự động sinh..."}
            value={config.hmac_secret ?? ""}
            onChange={(e) => update("hmac_secret", e.target.value)}
            className="flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
          />
          <button
            onClick={() => update("hmac_secret", crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""))}
            className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs hover:bg-zinc-50"
          >
            Sinh
          </button>
        </div>
      </div>

      {/* Data Retention */}
      <div>
        <h3 className="text-xs font-semibold uppercase text-zinc-400">Data Retention</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-zinc-500">Run history (ngày)</label>
            <input
              type="number"
              min={7}
              max={365}
              value={config.retention_days ?? 90}
              onChange={(e) => update("retention_days", parseInt(e.target.value) || 90)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500">Archive inactive (ngày)</label>
            <input
              type="number"
              min={30}
              max={730}
              value={config.archive_inactive_days ?? 180}
              onChange={(e) => update("archive_inactive_days", parseInt(e.target.value) || 180)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Usage Alerts */}
      <div>
        <h3 className="text-xs font-semibold uppercase text-zinc-400">Usage Alerts</h3>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={config.usage_alert_80 ?? true}
              onChange={(e) => update("usage_alert_80", e.target.checked)}
            />
            Alert khi dùng 80% quota
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={config.usage_alert_95 ?? true}
              onChange={(e) => update("usage_alert_95", e.target.checked)}
            />
            Alert khi dùng 95% quota
          </label>
        </div>
      </div>

      {/* Quota Override */}
      <div>
        <h3 className="text-xs font-semibold uppercase text-zinc-400">Quota Override</h3>
        <p className="text-xs text-zinc-500 mt-0.5">Ghi đè limit gói (để trống = dùng limit gói)</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-zinc-500">Max workflows</label>
            <input
              type="number"
              placeholder="∞"
              value={config.quota_workflows ?? ""}
              onChange={(e) => update("quota_workflows", e.target.value ? parseInt(e.target.value) : null)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500">Max members</label>
            <input
              type="number"
              placeholder="∞"
              value={config.quota_members ?? ""}
              onChange={(e) => update("quota_members", e.target.value ? parseInt(e.target.value) : null)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
        {saved && <span className="text-xs text-green-600">Đã lưu</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}

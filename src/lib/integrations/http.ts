import type { IntegrationProvider, IntegrationContext, IntegrationResult, ConfigField } from "./types";

const configSchema: ConfigField[] = [
  { key: "url", label: "URL", type: "url", required: true, placeholder: "https://api.example.com/endpoint" },
  { key: "method", label: "Method", type: "select", required: true, options: [
    { value: "GET", label: "GET" },
    { value: "POST", label: "POST" },
    { value: "PUT", label: "PUT" },
    { value: "PATCH", label: "PATCH" },
    { value: "DELETE", label: "DELETE" },
  ], default: "GET" },
  { key: "authType", label: "Auth", type: "select", required: false, options: [
    { value: "none", label: "None" },
    { value: "bearer", label: "Bearer Token" },
    { value: "basic", label: "Basic Auth" },
    { value: "api_key", label: "API Key (header)" },
  ], default: "none" },
  { key: "authValue", label: "Token / API Key", type: "password", required: false, placeholder: "sk-..." },
  { key: "basicUser", label: "Basic Auth User", type: "text", required: false },
  { key: "basicPass", label: "Basic Auth Pass", type: "password", required: false },
  { key: "headers", label: "Headers (JSON)", type: "textarea", required: false, placeholder: '{"X-Custom": "value"}' },
  { key: "body", label: "Body (JSON or text)", type: "textarea", required: false },
  { key: "timeout", label: "Timeout (s)", type: "number", required: false, default: "30" },
];

export const httpProvider: IntegrationProvider = {
  id: "http",
  name: "HTTP Request",
  icon: "🔗",
  description: "Gọi API REST bất kỳ với auth linh hoạt",
  category: "development",
  authType: "none",
  configSchema,

  async execute(ctx: IntegrationContext): Promise<IntegrationResult> {
    const cfg = ctx.config;
    const url = cfg.url;
    const method = (cfg.method ?? "GET").toUpperCase();
    const timeout = Number(cfg.timeout ?? 30);

    if (!url) return { success: false, error: "Thiếu URL", retryable: false };

    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // Custom headers
    if (cfg.headers) {
      try { Object.assign(headers, JSON.parse(cfg.headers)); } catch { /* ignore */ }
    }

    // Auth
    const authType = cfg.authType ?? "none";
    if (authType === "bearer" && cfg.authValue) {
      headers["Authorization"] = `Bearer ${cfg.authValue}`;
    } else if (authType === "basic" && cfg.basicUser) {
      headers["Authorization"] = `Basic ${Buffer.from(`${cfg.basicUser}:${cfg.basicPass ?? ""}`).toString("base64")}`;
    } else if (authType === "api_key" && cfg.authValue) {
      headers["X-API-Key"] = cfg.authValue;
    }

    const body = (method !== "GET" && method !== "HEAD" && cfg.body) ? cfg.body : undefined;

    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeout * 1000);
      const res = await fetch(url, { method, headers, body, signal: controller.signal });
      clearTimeout(t);

      const text = await res.text();
      let json: unknown;
      try { json = JSON.parse(text); } catch { json = text; }

      return {
        success: res.ok,
        data: { status: res.status, ok: res.ok, data: json, headers: Object.fromEntries(res.headers) },
        error: res.ok ? undefined : `HTTP ${res.status}: ${text.slice(0, 200)}`,
        retryable: !res.ok && res.status >= 500,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: msg, retryable: /timeout|ECONN|fetch|network|abort/i.test(msg) };
    }
  },
};
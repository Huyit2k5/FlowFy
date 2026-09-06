import type { IntegrationProvider, IntegrationContext, IntegrationResult, ConfigField } from "./types";

// ---- Telegram ----
const telegramConfig: ConfigField[] = [
  { key: "botToken", label: "Bot Token", type: "password", required: true, placeholder: "123456:ABC-DEF..." },
  { key: "chatId", label: "Chat ID", type: "text", required: true, placeholder: "123456789 or @channel" },
  { key: "text", label: "Message", type: "textarea", required: true },
  { key: "parseMode", label: "Parse Mode", type: "select", required: false, options: [
    { value: "", label: "None" },
    { value: "HTML", label: "HTML" },
    { value: "Markdown", label: "Markdown" },
  ] },
];

export const telegramProvider: IntegrationProvider = {
  id: "telegram",
  name: "Telegram",
  icon: "✈️",
  description: "Gửi message qua Telegram Bot",
  category: "communication",
  authType: "api_key",
  configSchema: telegramConfig,

  async execute(ctx: IntegrationContext): Promise<IntegrationResult> {
    const cfg = ctx.config;
    if (!cfg.botToken || !cfg.chatId) return { success: false, error: "Thiếu bot token hoặc chat ID", retryable: false };

    try {
      const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: cfg.chatId,
          text: cfg.text ?? "",
          ...(cfg.parseMode ? { parse_mode: cfg.parseMode } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { success: false, error: `Telegram: ${data.description ?? res.status}`, retryable: res.status >= 500 };
      }
      return { success: true, data: { messageId: data.result?.message_id, sent: true } };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: msg, retryable: /timeout|ECONN|network/i.test(msg) };
    }
  },
};

// ---- Discord ----
const discordConfig: ConfigField[] = [
  { key: "webhookUrl", label: "Webhook URL", type: "url", required: true, placeholder: "https://discord.com/api/webhooks/..." },
  { key: "content", label: "Message", type: "textarea", required: true },
  { key: "username", label: "Bot Name", type: "text", required: false },
  { key: "embedTitle", label: "Embed Title", type: "text", required: false },
  { key: "embedDesc", label: "Embed Description", type: "textarea", required: false },
  { key: "embedColor", label: "Embed Color (hex)", type: "text", required: false, placeholder: "5967748" },
];

export const discordProvider: IntegrationProvider = {
  id: "discord",
  name: "Discord",
  icon: "🎮",
  description: "Gửi message/embed qua Discord webhook",
  category: "communication",
  authType: "webhook_url",
  configSchema: discordConfig,

  async execute(ctx: IntegrationContext): Promise<IntegrationResult> {
    const cfg = ctx.config;
    if (!cfg.webhookUrl) return { success: false, error: "Thiếu webhook URL", retryable: false };

    const body: Record<string, unknown> = { content: cfg.content ?? "" };
    if (cfg.username) body.username = cfg.username;
    if (cfg.embedTitle || cfg.embedDesc) {
      body.embeds = [{
        title: cfg.embedTitle,
        description: cfg.embedDesc,
        ...(cfg.embedColor ? { color: parseInt(cfg.embedColor, 10) } : {}),
      }];
    }

    try {
      const res = await fetch(cfg.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: `Discord ${res.status}: ${err.slice(0, 100)}`, retryable: res.status >= 500 };
      }
      return { success: true, data: { sent: true } };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: msg, retryable: /timeout|ECONN|network/i.test(msg) };
    }
  },
};

// ---- Zalo OA ----
const zaloConfig: ConfigField[] = [
  { key: "accessToken", label: "Access Token", type: "password", required: true },
  { key: "userIds", label: "User IDs (comma-sep)", type: "text", required: true, help: "Zalo user IDs nhận message" },
  { key: "content", label: "Content", type: "textarea", required: true },
];

export const zaloProvider: IntegrationProvider = {
  id: "zalo",
  name: "Zalo OA",
  icon: "💚",
  description: "Gửi message qua Zalo Official Account",
  category: "vnm",
  authType: "api_key",
  configSchema: zaloConfig,

  async execute(ctx: IntegrationContext): Promise<IntegrationResult> {
    const cfg = ctx.config;
    if (!cfg.accessToken || !cfg.userIds) return { success: false, error: "Thiếu token hoặc user IDs", retryable: false };

    const userIds = cfg.userIds.split(",").map((s: string) => s.trim()).filter(Boolean);
    const target = userIds.length === 1 ? userIds[0] : userIds.join(",");

    try {
      const res = await fetch("https://api.zalooa.com/v2/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.accessToken}`,
        },
        body: JSON.stringify({
          target,
          target_type: userIds.length > 1 ? "group" : "user",
          content: cfg.content ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        return { success: false, error: `Zalo: ${data.error ?? data.message ?? res.status}`, retryable: res.status >= 500 };
      }
      return { success: true, data: { sent: true, target } };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: msg, retryable: /timeout|ECONN|network/i.test(msg) };
    }
  },
};

// ---- SMS (VN) ----
const smsConfig: ConfigField[] = [
  { key: "provider", label: "Provider", type: "select", required: true, options: [
    { value: "vnpt", label: "VNPT" },
    { value: "viettel", label: "Viettel" },
    { value: "mobifone", label: "Mobifone" },
  ] },
  { key: "apiKey", label: "API Key", type: "password", required: true },
  { key: "senderId", label: "Sender ID", type: "text", required: true },
  { key: "phoneNumber", label: "Phone Number", type: "text", required: true, placeholder: "0912345678" },
  { key: "content", label: "Content", type: "textarea", required: true },
];

export const smsProvider: IntegrationProvider = {
  id: "sms",
  name: "SMS (VN)",
  icon: "📱",
  description: "Gửi SMS qua VNPT / Viettel / Mobifone",
  category: "vnm",
  authType: "api_key",
  configSchema: smsConfig,

  async execute(ctx: IntegrationContext): Promise<IntegrationResult> {
    const cfg = ctx.config;
    if (!cfg.apiKey || !cfg.phoneNumber || !cfg.content) {
      return { success: false, error: "Thiếu API key, phone, hoặc content", retryable: false };
    }

    // Simulate (real implementation needs provider-specific API)
    console.log(`[Flowly:SMS] (${cfg.provider}) to: ${cfg.phoneNumber}, content: ${cfg.content.slice(0, 50)}`);
    return { success: true, data: { to: cfg.phoneNumber, provider: cfg.provider, sent: true, simulated: true } };
  },
};
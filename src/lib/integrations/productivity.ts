import type { IntegrationProvider, IntegrationContext, IntegrationResult, ConfigField } from "./types";

// ---- Airtable ----
const airtableConfig: ConfigField[] = [
  { key: "action", label: "Action", type: "select", required: true, options: [
    { value: "create", label: "Create record" },
    { value: "update", label: "Update record" },
    { value: "search", label: "Search records" },
  ] },
  { key: "baseUrl", label: "Base URL", type: "text", required: true, placeholder: "https://airtable.com/api/v0/appXXXXX" },
  { key: "apiKey", label: "API Key", type: "password", required: true },
  { key: "tableName", label: "Table Name / ID", type: "text", required: true },
  { key: "fields", label: "Fields (JSON)", type: "textarea", required: true, placeholder: '{"Tên": "John", "Email": "j@x.com"}' },
  { key: "recordId", label: "Record ID (update)", type: "text", required: false },
  { key: "filter", label: "Filter (search)", type: "text", required: false, placeholder: "CurrentValue.{Status}='Done'" },
];

export const airtableProvider: IntegrationProvider = {
  id: "airtable",
  name: "Airtable",
  icon: "📊",
  description: "Create, update, search records trong Airtable",
  category: "productivity",
  authType: "api_key",
  configSchema: airtableConfig,

  async execute(ctx: IntegrationContext): Promise<IntegrationResult> {
    const cfg = ctx.config;
    if (!cfg.baseUrl || !cfg.apiKey || !cfg.tableName) {
      return { success: false, error: "Thiếu base URL, API key, hoặc table name", retryable: false };
    }

    let fields: Record<string, unknown> = {};
    try { fields = JSON.parse(cfg.fields ?? "{}"); } catch { /* ignore */ }

    const headers = { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" };
    const base = cfg.baseUrl.replace(/\/$/, "");

    try {
      switch (cfg.action) {
        case "create": {
          const res = await fetch(`${base}/tables/${cfg.tableName}/records`, {
            method: "POST", headers, body: JSON.stringify({ fields }),
          });
          if (!res.ok) { const e = await res.text(); return { success: false, error: `Airtable ${res.status}: ${e.slice(0, 150)}`, retryable: res.status >= 500 }; }
          const data = await res.json();
          return { success: true, data: { recordId: data.record?.id, sent: true } };
        }
        case "update": {
          if (!cfg.recordId) return { success: false, error: "Thiếu record ID", retryable: false };
          const res = await fetch(`${base}/tables/${cfg.tableName}/records/${cfg.recordId}`, {
            method: "PATCH", headers, body: JSON.stringify({ fields }),
          });
          if (!res.ok) { const e = await res.text(); return { success: false, error: `Airtable ${res.status}: ${e.slice(0, 150)}`, retryable: res.status >= 500 }; }
          const data = await res.json();
          return { success: true, data: { recordId: data.record?.id, sent: true } };
        }
        case "search": {
          const params = new URLSearchParams({ maxRecords: "20" });
          if (cfg.filter) params.set("filterByFormula", cfg.filter);
          const res = await fetch(`${base}/tables/${cfg.tableName}/records?${params}`, { headers });
          if (!res.ok) { const e = await res.text(); return { success: false, error: `Airtable ${res.status}: ${e.slice(0, 150)}`, retryable: res.status >= 500 }; }
          const data = await res.json();
          return { success: true, data: { count: data.records?.length, records: data.records?.slice(0, 5) } };
        }
        default:
          return { success: false, error: `Action '${cfg.action}' chưa hỗ trợ`, retryable: false };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: msg, retryable: /timeout|ECONN|network/i.test(msg) };
    }
  },
};

// ---- Trello ----
const trelloConfig: ConfigField[] = [
  { key: "action", label: "Action", type: "select", required: true, options: [
    { value: "create_card", label: "Create card" },
    { value: "move_card", label: "Move card" },
  ] },
  { key: "apiKey", label: "API Key", type: "text", required: true },
  { key: "token", label: "Token", type: "password", required: true },
  { key: "boardId", label: "Board ID", type: "text", required: true },
  { key: "listId", label: "List ID", type: "text", required: true },
  { key: "cardTitle", label: "Card Title", type: "text", required: false },
  { key: "cardDesc", label: "Card Description", type: "textarea", required: false },
  { key: "cardId", label: "Card ID (move)", type: "text", required: false },
  { key: "targetListId", label: "Target List ID (move)", type: "text", required: false },
];

export const trelloProvider: IntegrationProvider = {
  id: "trello",
  name: "Trello",
  icon: "📋",
  description: "Create/move cards trong Trello board",
  category: "productivity",
  authType: "api_key",
  configSchema: trelloConfig,

  async execute(ctx: IntegrationContext): Promise<IntegrationResult> {
    const cfg = ctx.config;
    if (!cfg.apiKey || !cfg.token) return { success: false, error: "Thiếu API key hoặc token", retryable: false };

    const auth = `key=${cfg.apiKey}&token=${cfg.token}`;
    try {
      if (cfg.action === "create_card") {
        if (!cfg.boardId || !cfg.listId) return { success: false, error: "Thiếu board/list ID", retryable: false };
        const res = await fetch(`https://api.trello.com/1/cards?${auth}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idBoard: cfg.boardId, idList: cfg.listId, name: cfg.cardTitle ?? "New Card", desc: cfg.cardDesc }),
        });
        if (!res.ok) { const e = await res.text(); return { success: false, error: `Trello ${res.status}`, retryable: res.status >= 500 }; }
        const data = await res.json();
        return { success: true, data: { cardId: data.id, sent: true } };
      }
      if (cfg.action === "move_card") {
        if (!cfg.cardId || !cfg.targetListId) return { success: false, error: "Thiếu card ID hoặc target list", retryable: false };
        const res = await fetch(`https://api.trello.com/1/cards/${cfg.cardId}?${auth}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idList: cfg.targetListId }),
        });
        if (!res.ok) return { success: false, error: `Trello move: ${res.status}`, retryable: res.status >= 500 };
        return { success: true, data: { cardId: cfg.cardId, movedTo: cfg.targetListId, sent: true } };
      }
      return { success: false, error: `Action '${cfg.action}' chưa hỗ trợ`, retryable: false };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: msg, retryable: /timeout|ECONN|network/i.test(msg) };
    }
  },
};
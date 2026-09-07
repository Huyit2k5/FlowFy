import type { IntegrationProvider, IntegrationContext, IntegrationResult, ConfigField } from "./types";

// ---- Data Transform ----
const transformConfig: ConfigField[] = [
  { key: "action", label: "Action", type: "select", required: true, options: [
    { value: "map", label: "JSON Map (thay field)" },
    { value: "filter", label: "Filter (lọc condition)" },
    { value: "aggregate", label: "Aggregate (count, sum, avg)" },
    { value: "parse", label: "Parse (JSON → object)" },
    { value: "stringify", label: "Stringify (object → JSON)" },
    { value: "extract", label: "Extract path (a.b.c)" },
  ] },
  { key: "input", label: "Input (hoặc {{nodeId.field}})", type: "textarea", required: true },
  { key: "mapping", label: "Mapping (JSON: newField: oldPath)", type: "textarea", required: false, placeholder: '{"name": "user.full_name", "email": "user.email"}' },
  { key: "condition", label: "Condition (JS expression)", type: "text", required: false, placeholder: "status === 'active'" },
  { key: "groupBy", label: "Group By (field)", type: "text", required: false },
  { key: "aggField", label: "Aggregate Field", type: "text", required: false },
  { key: "aggType", label: "Aggregate Type", type: "select", required: false, options: [
    { value: "count", label: "Count" },
    { value: "sum", label: "Sum" },
    { value: "avg", label: "Avg" },
    { value: "min", label: "Min" },
    { value: "max", label: "Max" },
  ] },
  { key: "path", label: "Extract Path (a.b.c)", type: "text", required: false },
];

export const transformProvider: IntegrationProvider = {
  id: "transform",
  name: "Data Transform",
  icon: "🔄",
  description: "Map, filter, aggregate, parse JSON data",
  category: "data",
  authType: "none",
  configSchema: transformConfig,

  async execute(ctx: IntegrationContext): Promise<IntegrationResult> {
    const cfg = ctx.config;
    const action = cfg.action;

    let input: unknown;
    if (cfg.input) {
      // If it looks like a template reference ({{...}}), use ctx.input
      if (cfg.input.includes("{{") && ctx.input !== undefined) {
        input = ctx.input;
      } else {
        try { input = JSON.parse(cfg.input); } catch { input = cfg.input; }
      }
    } else {
      input = ctx.input;
    }

    try {
      switch (action) {
        case "map": {
          if (!cfg.mapping) return { success: true, data: input };
          const mapDef = JSON.parse(cfg.mapping) as Record<string, string>;
          const result: Record<string, unknown> = {};
          for (const [newField, pathStr] of Object.entries(mapDef)) {
            result[newField] = getPath(input, pathStr);
          }
          return { success: true, data: result };
        }
        case "filter": {
          if (!cfg.condition) return { success: true, data: input };
          const arr = Array.isArray(input) ? input : [input];
          const filtered = arr.filter((item) => {
            try { return Boolean(new Function("item", `return ${cfg.condition}`)(item)); }
            catch { return false; }
          });
          return { success: true, data: filtered };
        }
        case "aggregate": {
          const arr = Array.isArray(input) ? input : [input];
          if (cfg.groupBy) {
            const groups: Record<string, unknown[]> = {};
            for (const item of arr) {
              const key = String(getPath(item as object, cfg.groupBy));
              (groups[key] ??= []).push(item);
            }
            const result: Record<string, unknown> = {};
            for (const [key, items] of Object.entries(groups)) {
              result[key] = cfg.aggField
                ? aggregate(items, cfg.aggField, cfg.aggType ?? "count")
                : items.length;
            }
            return { success: true, data: result };
          }
          return { success: true, data: aggregate(arr, cfg.aggField, cfg.aggType ?? "count") };
        }
        case "parse":
          return { success: true, data: typeof input === "string" ? JSON.parse(input as string) : input };
        case "stringify":
          return { success: true, data: JSON.stringify(input, null, 2) };
        case "extract":
          if (!cfg.path) return { success: false, error: "Thiếu path", retryable: false };
          return { success: true, data: getPath(input, cfg.path) };
        default:
          return { success: false, error: `Action '${action}' chưa hỗ trợ`, retryable: false };
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e), retryable: false };
    }
  },
};

function getPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function aggregate(arr: unknown[], field: string | undefined, type: string): number {
  if (!field) return arr.length;
  const values = arr.map((item) => Number(getPath(item as object, field)) || 0);
  switch (type) {
    case "sum": return values.reduce((a, b) => a + b, 0);
    case "avg": return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    case "min": return values.length ? Math.min(...values) : 0;
    case "max": return values.length ? Math.max(...values) : 0;
    default: return arr.length;
  }
}

// ---- Database Query ----
const dbConfig: ConfigField[] = [
  { key: "provider", label: "Provider", type: "select", required: true, options: [
    { value: "supabase", label: "Supabase (PostgreSQL)" },
    { value: "http", label: "HTTP API (generic)" },
  ] },
  { key: "query", label: "SQL Query / API URL", type: "textarea", required: true },
  { key: "params", label: "Params (JSON array)", type: "textarea", required: false, placeholder: "[1, 'value']" },
  { key: "headers", label: "Headers (JSON, for HTTP)", type: "textarea", required: false },
];

export const databaseProvider: IntegrationProvider = {
  id: "database",
  name: "Database Query",
  icon: "🗄️",
  description: "Query Supabase PostgreSQL hoặc HTTP API",
  category: "data",
  authType: "api_key",
  configSchema: dbConfig,

  async execute(ctx: IntegrationContext): Promise<IntegrationResult> {
    const cfg = ctx.config;

    if (cfg.provider === "http") {
      if (!cfg.query) return { success: false, error: "Thiếu URL", retryable: false };
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (cfg.headers) Object.assign(headers, JSON.parse(cfg.headers));
        const res = await fetch(cfg.query, { headers });
        if (!res.ok) return { success: false, error: `HTTP ${res.status}`, retryable: res.status >= 500 };
        const data = await res.json();
        return { success: true, data };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e), retryable: true };
      }
    }

    // Supabase (using workspace's anon key from workspace config)
    const supabaseUrl = ctx.workspaceConfig?.database?.url;
    const supabaseKey = ctx.workspaceConfig?.database?.key;
    if (!supabaseUrl || !supabaseKey) {
      return { success: false, error: "Cần cấu hình database URL + key trong workspace integrations", retryable: false };
    }

    try {
      const params: string[] = [];
      if (cfg.params) params.push(...(JSON.parse(cfg.params) as string[]));
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_query`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: cfg.query, params }),
      });
      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: `DB ${res.status}: ${err.slice(0, 200)}`, retryable: false };
      }
      const data = await res.json();
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e), retryable: false };
    }
  },
};
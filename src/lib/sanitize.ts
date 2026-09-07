/**
 * Input sanitization utilities.
 * - Strip HTML tags / dangerous patterns from user text
 * - Validate and truncate strings
 * - Sanitize webhook payloads (remove prototype pollution keys)
 */

// XSS: strip <script>, onclick=, javascript:, etc.
const XSS_PATTERNS: RegExp[] = [
  /<script[\s\S]*?<\/script>/gi,
  /<\s*\/?\s*(iframe|object|embed|form|meta|link|base)[^>]*>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^\s>]+/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /expression\s*\(/gi,
  /vbscript\s*:/gi,
];

export function sanitizeHtml(input: string): string {
  if (!input) return "";
  let clean = input;
  for (const pattern of XSS_PATTERNS) {
    clean = clean.replace(pattern, "");
  }
  return clean.trim();
}

// HTML entity encode for safe display
export function htmlEncode(input: string): string {
  if (!input) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Truncate with ellipsis
export function truncate(input: string, maxLen: number): string {
  if (!input) return "";
  if (input.length <= maxLen) return input;
  return input.slice(0, maxLen - 1) + "…";
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(email.slice(0, 254));
}

// Validate URL (http/https only)
export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Strip prototype pollution keys from nested objects
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function sanitizePayload(obj: unknown, maxDepth = 10): unknown {
  if (maxDepth <= 0) return null;
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizePayload(item, maxDepth - 1)).slice(0, 1000);
  }

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    if (key.length > 255) continue;
    clean[key] = sanitizePayload(value, maxDepth - 1);
  }
  return clean;
}

// Sanitize workflow node config (user-provided values)
export function sanitizeNodeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    if (typeof value === "string") {
      result[key] = sanitizeHtml(truncate(value, 10_000));
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizePayload(value, 8);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Sanitize webhook name/description
export function sanitizeWorkflowInput(input: { name?: string; description?: string }) {
  return {
    name: truncate(sanitizeHtml(input.name ?? ""), 200),
    description: truncate(sanitizeHtml(input.description ?? ""), 2000),
  };
}

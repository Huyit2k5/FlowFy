/**
 * Open-redirect protection.
 *
 * Only allows relative, same-origin paths. Rejects:
 *   - absolute URLs (http://, https://, //evil.com, javascript:)
 *   - backslash tricks (/\/evil.com)
 *   - control characters
 *
 * Returns a safe relative path, or a fallback.
 */

export function safeRedirectPath(input: string | null | undefined, fallback = "/app"): string {
  if (!input) return fallback;

  const trimmed = input.trim();
  if (!trimmed) return fallback;

  // Must start with a single forward slash
  if (!trimmed.startsWith("/")) return fallback;
  // Block protocol-relative (//host) and double-slash tricks
  if (trimmed.startsWith("//")) return fallback;
  // Block backslashes (browsers may interpret /\/ as //)
  if (trimmed.includes("\\")) return fallback;
  // Block embedded schemes or control chars
  if (/^[a-z][\w+.-]*:/i.test(trimmed)) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return fallback;

  return trimmed;
}

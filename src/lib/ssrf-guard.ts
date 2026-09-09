/**
 * SSRF protection for outbound HTTP requests made by the workflow engine.
 *
 * Prevents user-configured URLs from reaching internal / reserved network
 * ranges (cloud metadata, loopback, private LAN).
 */

// RFC1918 + loopback + link-local + cloud metadata + unique-local
const BLOCKED_HOSTS = new Set([
  "localhost",
  "0.0.0.0",
  "127.0.0.1",
  "169.254.169.254", // AWS/GCP/Azure metadata
  "metadata.google.internal",
  "::1",
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;                    // 10.0.0.0/8
  if (a === 127) return true;                   // 127.0.0.0/8
  if (a === 169 && b === 254) return true;      // 169.254.0.0/16 (link-local + metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true;      // 192.168.0.0/16
  if (a === 0) return true;                     // 0.0.0.0/8
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local
  if (lower.startsWith("fe80")) return true;                          // link-local
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice(7);
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v4)) return isPrivateIpv4(v4);
  }
  return false;
}

/**
 * Validate that a URL is safe to fetch (no SSRF).
 * - Must be http/https
 * - Host must not be a known internal/blocked host or private IP range
 */
export function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;

    const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!host) return false;
    if (BLOCKED_HOSTS.has(host)) return false;

    // Numeric IP literal
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return !isPrivateIpv4(host);
    if (host.includes(":")) return !isPrivateIpv6(host);

    // Domain with a port like "localhost:8080" is already covered by hostname
    return true;
  } catch {
    return false;
  }
}

/**
 * fetch with timeout + SSRF guard.
 * Throws if the URL fails the safety check or the request times out.
 */
export async function fetchSafe(
  url: string,
  init: RequestInit = {},
  timeoutSec = 30
): Promise<Response> {
  if (!isSafeUrl(url)) {
    throw new Error(`URL bị chặn (SSRF protection): ${url}`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutSec * 1000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

import { NextResponse, type NextRequest } from "next/server";

/**
 * Simple CIDR match for IPv4.
 */
function ipInCidr(ip: string, cidr: string): boolean {
  const [network, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);
  if (isNaN(bits) || bits < 0 || bits > 32) return ip === cidr;

  const ipNum = ipToNum(ip);
  const netNum = ipToNum(network);
  if (ipNum === null || netNum === null) return false;

  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipNum & mask) === (netNum & mask);
}

function ipToNum(ip: string): number | null {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Check if request IP is in the allowlist.
 * Returns true if allowlist is empty (no restriction).
 */
export function checkIpAllowlist(requestIp: string, allowlist: string): boolean {
  if (!allowlist || allowlist.trim() === "") return true;
  const entries = allowlist.split(",").map((e) => e.trim()).filter(Boolean);
  if (entries.length === 0) return true;

  for (const entry of entries) {
    if (entry.includes("/")) {
      if (ipInCidr(requestIp, entry)) return true;
    } else {
      if (requestIp === entry) return true;
    }
  }
  return false;
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "127.0.0.1";
}

export function ipBlockedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Access denied: IP not in allowlist" },
    { status: 403 }
  );
}

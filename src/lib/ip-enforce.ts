import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkIpAllowlist, getClientIp } from "@/lib/ip-allowlist";

/**
 * Check if the request IP is allowed for this workspace.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 * Skips check if allowlist is empty (no restriction).
 */
export async function checkIpAccess(
  request: NextRequest,
  supabase: SupabaseClient,
  workspaceId: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const { data: sec } = await supabase
      .from("workspace_security")
      .select("ip_allowlist")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const allowlist = sec?.ip_allowlist ?? "";
    if (!allowlist || allowlist.trim() === "") {
      return { allowed: true };
    }

    const clientIp = getClientIp(request);
    if (checkIpAllowlist(clientIp, allowlist)) {
      return { allowed: true };
    }

    return { allowed: false, reason: "IP " + clientIp + " not in allowlist" };
  } catch {
    // Table may not exist yet — allow
    return { allowed: true };
  }
}

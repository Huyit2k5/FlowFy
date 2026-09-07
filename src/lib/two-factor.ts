import { createClient } from "@/lib/supabase/server";

/**
 * Check if the current user has 2FA enabled.
 * Returns true if 2FA is not enforced for this workspace,
 * or if the user has 2FA enabled.
 */
export async function check2faStatus(workspaceId: string): Promise<{
  enforced: boolean;
  userHas2fa: boolean;
  allowed: boolean;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { enforced: false, userHas2fa: false, allowed: true };

  // Check if workspace enforces 2FA
  const { data: sec } = await supabase
    .from("workspace_security")
    .select("enforce_2fa")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const enforced = sec?.enforce_2fa ?? false;
  if (!enforced) return { enforced: false, userHas2fa: false, allowed: true };

  // Check if user has phone verified (proxy for 2FA capability)
  // In production with Supabase MFA enabled, check auth factors
  const hasPhone = !!user.phone;
  const hasPhoneIdentity = user.identities?.some((i: any) => i.provider_name === "phone") ?? false;

  const userHas2fa = hasPhone || hasPhoneIdentity;

  return {
    enforced: true,
    userHas2fa,
    allowed: userHas2fa,
  };
}

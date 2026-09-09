import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback
 * Supabase OAuth callback — exchanges code for session, then redirects.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url));
  }

  try {
    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
    }

    // Get user's first workspace
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    const { data: wsData } = await supabase
      .from("members")
      .select("workspaces (id)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    const firstWs = wsData?.[0]?.workspaces as { id: string } | null | undefined;

    if (firstWs) {
      return NextResponse.redirect(new URL(`/app/${firstWs.id}`, request.url));
    }

    return NextResponse.redirect(new URL("/onboarding", request.url));
  } catch (e) {
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
}

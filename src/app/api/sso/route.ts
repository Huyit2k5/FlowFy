import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * GET /api/sso?provider=google|microsoft|okta
 * Initiates SSO login flow.
 * Redirects to Supabase's OAuth provider.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const provider = request.nextUrl.searchParams.get("provider") ?? "google";
  const redirectTo = safeRedirectPath(
    request.nextUrl.searchParams.get("redirect"),
    "/app"
  );

  // Map our provider names to Supabase OAuth providers
  const providerMap: Record<string, string> = {
    google: "google",
    microsoft: "azure",
    okta: "okta",
    github: "github",
    gitlab: "gitlab",
  };

  const supabaseProvider = providerMap[provider] ?? "google";

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: supabaseProvider as any,
      options: {
        redirectTo: `${request.nextUrl.origin}/auth/callback`,
        queryParams: {
          // Pass our redirect target
          flowly_redirect: redirectTo,
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data.url) {
      return NextResponse.redirect(data.url);
    }

    return NextResponse.json({ error: "No redirect URL returned" }, { status: 500 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "SSO error" },
      { status: 500 }
    );
  }
}

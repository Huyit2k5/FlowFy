import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/billing/checkout — Create Stripe Checkout Session
 * Requires: STRIPE_SECRET_KEY, STRIPE_PRICE_ID_PRO in env
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePriceId = process.env.STRIPE_PRICE_ID_PRO;
  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/app?upgraded=true`;
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/upgrade`;

  // If Stripe is not configured, simulate success (dev mode)
  if (!stripeSecretKey || !stripePriceId) {
    console.log("[Billing] Stripe not configured — simulating upgrade to Pro");

    // Simulate: update workspace plan to "pro"
    const { data: member } = await supabase
      .from("members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();

    if (member?.workspace_id) {
      await supabase
        .from("workspaces")
        .update({ plan: "pro" })
        .eq("id", member.workspace_id);
    }

    return NextResponse.json({
      success: true,
      simulated: true,
      message: "Đã nâng cấp lên Pro (simulated — chưa cấu hình Stripe)",
      redirect: successUrl,
    });
  }

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${stripeSecretKey}`,
      },
      body: new URLSearchParams({
        mode: "subscription",
        "line_items[0][price]": stripePriceId,
        "line_items[0][quantity]": "1",
        customer_email: user.email ?? "",
        success_url: successUrl,
        cancel_url: cancelUrl,
        "metadata[user_id]": user.id,
        "metadata[workspace_id]": "primary",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Billing] Stripe error:", err);
      return NextResponse.json(
        { error: `Stripe error: ${err}` },
        { status: 502 }
      );
    }

    const session = await res.json();

    // Store session ID for webhook verification
    const { data: member } = await supabase
      .from("members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();

    if (member?.workspace_id) {
      await supabase
        .from("workspaces")
        .update({ stripe_session_id: session.id } as Record<string, unknown>)
        .eq("id", member.workspace_id);
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[Billing] Checkout error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
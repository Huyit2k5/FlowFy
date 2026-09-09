import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * POST /api/billing/webhook — Stripe webhook handler
 * Handles: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 *
 * Requires: STRIPE_WEBHOOK_SECRET
 */

// Reject signatures older than this (replay protection)
const TOLERANCE_SECONDS = 5 * 60;

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare against same-length dummy to keep timing uniform, then fail.
    crypto.timingSafeEqual(
      crypto.createHash("sha256").update(a).digest(),
      crypto.createHash("sha256").update(a).digest()
    );
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.log("[Billing Webhook] Stripe not configured — simulating success");
    return NextResponse.json({ received: true, simulated: true });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const body = await request.text();

  try {
    const parts = signature.split(",");
    const timestamp = parts.find((p) => p.startsWith("t="))?.split("=")[1];
    const sigV1 = parts.find((p) => p.startsWith("v1="))?.split("=")[1];

    if (!timestamp || !sigV1) {
      return NextResponse.json({ error: "Invalid signature format" }, { status: 400 });
    }

    // Replay protection: reject events older than tolerance window
    const ts = parseInt(timestamp, 10);
    if (Number.isNaN(ts)) {
      return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 });
    }
    const ageSec = Math.floor(Date.now() / 1000) - ts;
    if (ageSec > TOLERANCE_SECONDS || ageSec < -TOLERANCE_SECONDS) {
      return NextResponse.json({ error: "Signature timestamp too old or invalid" }, { status: 400 });
    }

    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(`${timestamp}.${body}`)
      .digest("hex");

    if (!timingSafeEqualHex(expectedSig, sigV1)) {
      return NextResponse.json({ error: "Signature mismatch" }, { status: 400 });
    }

    const event = JSON.parse(body) as {
      type: string;
      data: { object: Record<string, unknown> };
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as { metadata?: Record<string, string> };
        const userId = session.metadata?.user_id;
        if (userId) await updateWorkspacePlan(userId, "pro");
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as { status: string; metadata?: Record<string, string> };
        const userId = sub.metadata?.user_id;
        if (userId) {
          // Active/past_due → pro; everything else (canceled, unpaid, paused) → free
          const isPaid = sub.status === "active" || sub.status === "trialing";
          await updateWorkspacePlan(userId, isPaid ? "pro" : "free");
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as { metadata?: Record<string, string> };
        const userId = sub.metadata?.user_id;
        if (userId) await updateWorkspacePlan(userId, "free");
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[Billing Webhook] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Webhook error" },
      { status: 400 }
    );
  }
}

async function updateWorkspacePlan(userId: string, plan: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: member } = await supabase
    .from("members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (member?.workspace_id) {
    await supabase
      .from("workspaces")
      .update({ plan })
      .eq("id", member.workspace_id);
    console.log(`[Billing Webhook] Updated workspace ${member.workspace_id} → ${plan}`);
  }
}
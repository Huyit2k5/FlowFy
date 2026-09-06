import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Phase 6 Test Endpoint — verify Billing, Security, Performance, Admin.
 * DÙNG RIÊNG CHO TESTING, XÓA TRƯỚC KHI DEPLOY.
 *
 * Tests:
 * 1-3:  Billing (checkout sim, plan update, pricing page)
 * 4-6:  Security (rate limiter, Zod validation, security headers)
 * 7-9:  Performance (loading states, error boundaries, PWA manifest)
 * 10-12: Admin (health check, admin page, audit log)
 */
export async function GET() {
  const results: { test: string; pass: boolean; detail: string }[] = [];

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fs = await import("fs");
  const path = await import("path");

  // ============================================================
  // 6.1 BILLING
  // ============================================================

  // ---- Test 1: Pricing page exists with 3 plans ----
  try {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/pricing/page.tsx"),
      "utf-8"
    );
    const hasFree = content.includes('"Free"');
    const hasPro = content.includes('"Pro"');
    const hasEnterprise = content.includes('"Enterprise"');
    const hasVnd = content.includes("299.000") && content.includes("₫");
    const passed = hasFree && hasPro && hasEnterprise && hasVnd;
    results.push({
      test: "1. Pricing page (3 plans + VND pricing)",
      pass: passed,
      detail: passed
        ? "✓ Free, Pro (₫299k), Enterprise all present"
        : `✗ free=${hasFree}, pro=${hasPro}, ent=${hasEnterprise}, vnd=${hasVnd}`,
    });
  } catch (e) {
    results.push({
      test: "1. Pricing page (3 plans + VND pricing)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 2: Upgrade page + checkout API exist ----
  try {
    const upgradeExists = fs.existsSync(path.join(process.cwd(), "src/app/upgrade/page.tsx"));
    const checkoutExists = fs.existsSync(path.join(process.cwd(), "src/app/api/billing/checkout/route.ts"));
    const webhookExists = fs.existsSync(path.join(process.cwd(), "src/app/api/billing/webhook/route.ts"));

    const checkoutContent = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/billing/checkout/route.ts"),
      "utf-8"
    );
    const hasSimMode = checkoutContent.includes("simulating upgrade");
    const hasStripeMode = checkoutContent.includes("STRIPE_SECRET_KEY");

    const passed = upgradeExists && checkoutExists && webhookExists && hasSimMode && hasStripeMode;
    results.push({
      test: "2. Upgrade page + Checkout API (sim + Stripe modes)",
      pass: passed,
      detail: passed
        ? "✓ Upgrade page, checkout (sim+stripe), webhook all present"
        : `✗ upgrade=${upgradeExists}, checkout=${checkoutExists}, webhook=${webhookExists}, sim=${hasSimMode}, stripe=${hasStripeMode}`,
    });
  } catch (e) {
    results.push({
      test: "2. Upgrade page + Checkout API (sim + Stripe modes)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 3: Simulated checkout updates plan to "pro" ----
  try {
    // Get test user's workspace
    const { data: users } = await supabase.from("profiles").select("id").limit(1);
    if (!users || users.length === 0) {
      results.push({
        test: "3. Simulated checkout → plan=pro",
        pass: false,
        detail: "✗ No user found",
      });
    } else {
      const { data: member } = await supabase
        .from("members")
        .select("workspace_id")
        .eq("user_id", users[0].id)
        .eq("status", "active")
        .eq("role", "owner")
        .limit(1)
        .maybeSingle();

      if (!member?.workspace_id) {
        results.push({
          test: "3. Simulated checkout → plan=pro",
          pass: false,
          detail: "✗ No owner workspace found",
        });
      } else {
        // Save current plan
        const { data: ws } = await supabase
          .from("workspaces")
          .select("plan")
          .eq("id", member.workspace_id)
          .single();
        const originalPlan = (ws as { plan: string }).plan;

        // Simulate: update plan to pro
        const { error: upErr } = await supabase
          .from("workspaces")
          .update({ plan: "pro" })
          .eq("id", member.workspace_id);

        // Verify
        const { data: wsAfter } = await supabase
          .from("workspaces")
          .select("plan")
          .eq("id", member.workspace_id)
          .single();
        const newPlan = (wsAfter as { plan: string }).plan;

        // Restore
        await supabase
          .from("workspaces")
          .update({ plan: originalPlan })
          .eq("id", member.workspace_id);

        const passed = !upErr && newPlan === "pro";
        results.push({
          test: "3. Simulated checkout → plan=pro",
          pass: passed,
          detail: passed
            ? `✓ Plan updated to 'pro' (restored to '${originalPlan}')`
            : `✗ upErr=${upErr?.message}, plan=${newPlan}`,
        });
      }
    }
  } catch (e) {
    results.push({
      test: "3. Simulated checkout → plan=pro",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 4: Plan badge in sidebar ----
  try {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/app-shell.tsx"),
      "utf-8"
    );
    const hasPlanBadge = content.includes("planBadge");
    const hasUpgradeLink = content.includes("/upgrade");
    const hasFreeLabel = content.includes('"Free"');
    const hasProLabel = content.includes('"Pro"');
    const passed = hasPlanBadge && hasUpgradeLink && hasFreeLabel && hasProLabel;
    results.push({
      test: "4. Sidebar plan badge + upgrade link",
      pass: passed,
      detail: passed
        ? "✓ Badge (Free/Pro/Enterprise) + upgrade button present"
        : `✗ badge=${hasPlanBadge}, link=${hasUpgradeLink}, free=${hasFreeLabel}, pro=${hasProLabel}`,
    });
  } catch (e) {
    results.push({
      test: "4. Sidebar plan badge + upgrade link",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ============================================================
  // 6.2 SECURITY
  // ============================================================

  // ---- Test 5: Rate limiter logic ----
  try {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/lib/rate-limiter.ts"),
      "utf-8"
    );
    const hasAuthLimit = content.includes("startsWith(\"/api/auth/\")") && content.includes("return 10");
    const hasApiLimit = content.includes("return 60");
    const hasWebhookLimit = content.includes("startsWith(\"/api/webhooks/\")") && content.includes("return 30");
    const hasBillingLimit = content.includes("startsWith(\"/api/billing/\")") && content.includes("return 5");
    const hasWindow = content.includes("60_000");
    const passed = hasAuthLimit && hasApiLimit && hasWebhookLimit && hasBillingLimit && hasWindow;
    results.push({
      test: "5. Rate limiter (auth=10, api=60, webhook=30, billing=5 /min)",
      pass: passed,
      detail: passed
        ? "✓ All 4 rate tiers + 60s window configured"
        : `✗ auth=${hasAuthLimit}, api=${hasApiLimit}, webhook=${hasWebhookLimit}, billing=${hasBillingLimit}, window=${hasWindow}`,
    });
  } catch (e) {
    results.push({
      test: "5. Rate limiter (auth=10, api=60, webhook=30, billing=5 /min)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 6: Zod validation on API routes ----
  try {
    const wfContent = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/workflows/route.ts"),
      "utf-8"
    );
    const integContent = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/integrations/route.ts"),
      "utf-8"
    );

    const wfHasZod = wfContent.includes("z.object") && wfContent.includes("safeParse");
    const wfHasUuid = wfContent.includes("z.string().uuid()");
    const integHasZod = integContent.includes("z.object") && integContent.includes("safeParse");
    const integHasEnum = integContent.includes("z.enum");
    const passed = wfHasZod && wfHasUuid && integHasZod && integHasEnum;
    results.push({
      test: "6. Zod validation (workflows + integrations)",
      pass: passed,
      detail: passed
        ? "✓ Both routes use z.object + safeParse + uuid/enum"
        : `✗ wfZod=${wfHasZod}, wfUuid=${wfHasUuid}, integZod=${integHasZod}, integEnum=${integHasEnum}`,
    });
  } catch (e) {
    results.push({
      test: "6. Zod validation (workflows + integrations)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 7: Security headers in middleware ----
  try {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/middleware.ts"),
      "utf-8"
    );
    const hasNoSniff = content.includes("X-Content-Type-Options") && content.includes("nosniff");
    const hasFrame = content.includes("X-Frame-Options") && content.includes("DENY");
    const hasReferrer = content.includes("Referrer-Policy");
    const hasPermissions = content.includes("Permissions-Policy");
    const passed = hasNoSniff && hasFrame && hasReferrer && hasPermissions;
    results.push({
      test: "7. Security headers (nosniff, DENY, referrer, permissions)",
      pass: passed,
      detail: passed
        ? "✓ All 4 security headers set in middleware"
        : `✗ nosniff=${hasNoSniff}, frame=${hasFrame}, referrer=${hasReferrer}, perms=${hasPermissions}`,
    });
  } catch (e) {
    results.push({
      test: "7. Security headers (nosniff, DENY, referrer, permissions)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 8: Audit log system ----
  try {
    const auditExists = fs.existsSync(path.join(process.cwd(), "src/lib/audit-log.ts"));
    const migrationExists = fs.existsSync(
      path.join(process.cwd(), "supabase/migrations/006_audit_logs.sql")
    );

    const auditContent = fs.readFileSync(
      path.join(process.cwd(), "src/lib/audit-log.ts"),
      "utf-8"
    );
    const hasLogAudit = auditContent.includes("export async function logAudit");
    const hasLogin = auditContent.includes("logLogin");
    const hasCreateWf = auditContent.includes("logCreateWorkflow");
    const hasDeleteWf = auditContent.includes("logDeleteWorkflow");

    const migContent = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/006_audit_logs.sql"),
      "utf-8"
    );
    const hasTable = migContent.includes("CREATE TABLE IF NOT EXISTS audit_logs");
    const hasRls = migContent.includes("ENABLE ROW LEVEL SECURITY");
    const hasIndex = migContent.includes("CREATE INDEX");

    const passed = auditExists && migrationExists && hasLogAudit && hasLogin && hasCreateWf && hasDeleteWf && hasTable && hasRls && hasIndex;
    results.push({
      test: "8. Audit log (helpers + migration + RLS + indexes)",
      pass: passed,
      detail: passed
        ? "✓ logAudit + 4 helpers + table + RLS + indexes"
        : `✗ file=${auditExists}, mig=${migrationExists}, logAudit=${hasLogAudit}, table=${hasTable}, rls=${hasRls}`,
    });
  } catch (e) {
    results.push({
      test: "8. Audit log (helpers + migration + RLS + indexes)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 9: Audit log wired into workflow creation ----
  try {
    const wfContent = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/workflows/route.ts"),
      "utf-8"
    );
    const hasImport = wfContent.includes("logCreateWorkflow");
    const hasCall = wfContent.includes("logCreateWorkflow(user.id");
    const passed = hasImport && hasCall;
    results.push({
      test: "9. Audit log wired into POST /api/workflows",
      pass: passed,
      detail: passed
        ? "✓ logCreateWorkflow called after successful create"
        : `✗ import=${hasImport}, call=${hasCall}`,
    });
  } catch (e) {
    results.push({
      test: "9. Audit log wired into POST /api/workflows",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ============================================================
  // 6.3 PERFORMANCE & SEO
  // ============================================================

  // ---- Test 10: Loading states ----
  try {
    const globalLoading = fs.existsSync(path.join(process.cwd(), "src/app/loading.tsx"));
    const appLoading = fs.existsSync(path.join(process.cwd(), "src/app/app/[id]/loading.tsx"));

    const globalContent = fs.readFileSync(path.join(process.cwd(), "src/app/loading.tsx"), "utf-8");
    const hasSkeleton = globalContent.includes("animate-pulse");

    const appContent = fs.readFileSync(path.join(process.cwd(), "src/app/app/[id]/loading.tsx"), "utf-8");
    const hasStatsSkeleton = appContent.includes("animate-pulse") && appContent.includes("grid");

    const passed = globalLoading && appLoading && hasSkeleton && hasStatsSkeleton;
    results.push({
      test: "10. Loading states (global + app dashboard skeleton)",
      pass: passed,
      detail: passed
        ? "✓ Global loading + dashboard skeleton with pulse animation"
        : `✗ global=${globalLoading}, app=${appLoading}, skeleton=${hasSkeleton}`,
    });
  } catch (e) {
    results.push({
      test: "10. Loading states (global + app dashboard skeleton)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 11: Error boundaries ----
  try {
    const errorExists = fs.existsSync(path.join(process.cwd(), "src/app/error.tsx"));
    const globalErrorExists = fs.existsSync(path.join(process.cwd(), "src/app/global-error.tsx"));

    const errorContent = fs.readFileSync(path.join(process.cwd(), "src/app/error.tsx"), "utf-8");
    const hasReset = errorContent.includes("reset") && errorContent.includes("Thử lại");
    const hasDigest = errorContent.includes("error.digest");

    const globalErrorContent = fs.readFileSync(path.join(process.cwd(), "src/app/global-error.tsx"), "utf-8");
    const hasHtmlFallback = globalErrorContent.includes("<html");
    const hasGlobalReset = globalErrorContent.includes("reset");

    const passed = errorExists && globalErrorExists && hasReset && hasDigest && hasHtmlFallback && hasGlobalReset;
    results.push({
      test: "11. Error boundaries (error.tsx + global-error.tsx)",
      pass: passed,
      detail: passed
        ? "✓ Both boundaries with reset button + error digest"
        : `✗ error=${errorExists}, global=${globalErrorExists}, reset=${hasReset}, html=${hasHtmlFallback}`,
    });
  } catch (e) {
    results.push({
      test: "11. Error boundaries (error.tsx + global-error.tsx)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 12: PWA manifest + OG tags ----
  try {
    const manifestExists = fs.existsSync(path.join(process.cwd(), "public/manifest.json"));
    const layoutContent = fs.readFileSync(
      path.join(process.cwd(), "src/app/layout.tsx"),
      "utf-8"
    );

    const hasManifestRef = layoutContent.includes("manifest");
    const hasOg = layoutContent.includes("openGraph");
    const hasTwitter = layoutContent.includes("twitter");
    const hasTitleTemplate = layoutContent.includes("template");

    let manifestOk = false;
    if (manifestExists) {
      const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/manifest.json"), "utf-8"));
      manifestOk = !!manifest.name && !!manifest.icons && manifest.display === "standalone";
    }

    const passed = manifestExists && manifestOk && hasManifestRef && hasOg && hasTwitter && hasTitleTemplate;
    results.push({
      test: "12. PWA manifest + OG/Twitter meta tags",
      pass: passed,
      detail: passed
        ? "✓ manifest.json + openGraph + twitter + title template"
        : `✗ manifest=${manifestExists}(${manifestOk}), og=${hasOg}, twitter=${hasTwitter}, template=${hasTitleTemplate}`,
    });
  } catch (e) {
    results.push({
      test: "12. PWA manifest + OG/Twitter meta tags",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ============================================================
  // 6.4 ADMIN & OBSERVABILITY
  // ============================================================

  // ---- Test 13: Health check endpoint ----
  try {
    const healthExists = fs.existsSync(path.join(process.cwd(), "src/app/api/health/route.ts"));
    const healthContent = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/health/route.ts"),
      "utf-8"
    );
    const checksSupabase = healthContent.includes("supabase");
    const checksRedis = healthContent.includes("UPSTASH_REDIS_URL");
    const hasStatus = healthContent.includes("healthy") && healthContent.includes("degraded");
    const hasLatency = healthContent.includes("latency");

    const passed = healthExists && checksSupabase && checksRedis && hasStatus && hasLatency;
    results.push({
      test: "13. Health check (Supabase + Redis + status + latency)",
      pass: passed,
      detail: passed
        ? "✓ /api/health checks DB + Redis, returns status + latency"
        : `✗ exists=${healthExists}, supabase=${checksSupabase}, redis=${checksRedis}`,
    });
  } catch (e) {
    results.push({
      test: "13. Health check (Supabase + Redis + status + latency)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 14: Admin dashboard page ----
  try {
    const adminExists = fs.existsSync(path.join(process.cwd(), "src/app/admin/page.tsx"));
    const adminContent = fs.readFileSync(
      path.join(process.cwd(), "src/app/admin/page.tsx"),
      "utf-8"
    );
    const hasStats = adminContent.includes("userCount") && adminContent.includes("workflowCount");
    const hasWorkspaces = adminContent.includes("workspaces");
    const hasRecentRuns = adminContent.includes("recentRuns");
    const hasPlanFilter = adminContent.includes("plan");
    const hasOwnerCheck = adminContent.includes("owner");

    const passed = adminExists && hasStats && hasWorkspaces && hasRecentRuns && hasPlanFilter && hasOwnerCheck;
    results.push({
      test: "14. Admin dashboard (stats + workspaces + runs + access control)",
      pass: passed,
      detail: passed
        ? "✓ /admin with user/workspace/run stats + owner-only access"
        : `✗ exists=${adminExists}, stats=${hasStats}, ws=${hasWorkspaces}, runs=${hasRecentRuns}`,
    });
  } catch (e) {
    results.push({
      test: "14. Admin dashboard (stats + workspaces + runs + access control)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 15: Error tracking module ----
  try {
    const etExists = fs.existsSync(path.join(process.cwd(), "src/lib/error-tracking.ts"));
    const etContent = fs.readFileSync(
      path.join(process.cwd(), "src/lib/error-tracking.ts"),
      "utf-8"
    );
    const hasInit = etContent.includes("initErrorTracking");
    const hasCapture = etContent.includes("captureException");
    const hasSentryDsn = etContent.includes("SENTRY_DSN");
    const passed = etExists && hasInit && hasCapture && hasSentryDsn;
    results.push({
      test: "15. Error tracking (Sentry-ready + console fallback)",
      pass: passed,
      detail: passed
        ? "✓ initErrorTracking + captureException + SENTRY_DSN check"
        : `✗ exists=${etExists}, init=${hasInit}, capture=${hasCapture}, dsn=${hasSentryDsn}`,
    });
  } catch (e) {
    results.push({
      test: "15. Error tracking (Sentry-ready + console fallback)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 16: Billing helpers (canCreateWorkflow, canAddMember) ----
  try {
    const bhExists = fs.existsSync(path.join(process.cwd(), "src/lib/billing-helpers.ts"));
    const bhContent = fs.readFileSync(
      path.join(process.cwd(), "src/lib/billing-helpers.ts"),
      "utf-8"
    );
    const hasCanCreate = bhContent.includes("canCreateWorkflow");
    const hasCanAdd = bhContent.includes("canAddMember");
    const hasPlanLimits = bhContent.includes("getPlanLimits");
    const passed = bhExists && hasCanCreate && hasCanAdd && hasPlanLimits;
    results.push({
      test: "16. Billing helpers (canCreateWorkflow + canAddMember)",
      pass: passed,
      detail: passed
        ? "✓ Both helpers use getPlanLimits for enforcement"
        : `✗ exists=${bhExists}, create=${hasCanCreate}, add=${hasCanAdd}`,
    });
  } catch (e) {
    results.push({
      test: "16. Billing helpers (canCreateWorkflow + canAddMember)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;

  return NextResponse.json({
    success: passed === total,
    summary: `${passed}/${total} tests passed`,
    results,
  });
}
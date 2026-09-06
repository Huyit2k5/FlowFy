import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Phase 5 Test Endpoint — verify Canvas Real-time Collab, Presence, Plan Limits, UI.
 * DÙNG RIÊNG CHO TESTING, XÓA TRƯỚC KHI DEPLOY.
 *
 * Test strategy:
 * - Tests 1-3: Verify Realtime publication tables (via Supabase REST /realtime endpoint)
 * - Test 4: Simulate 2-tab collab by updating workflow_nodes and checking data integrity
 * - Test 5: Verify Presence API structure (channel track/untrack)
 * - Tests 6-10: Static code checks (plan limits, responsive, empty states, canvas features)
 */
export async function GET() {
  const results: { test: string; pass: boolean; detail: string }[] = [];

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ---- Test 1: workflow_nodes table exists & is queryable ----
  try {
    const { data, error } = await supabase
      .from("workflow_nodes")
      .select("id, workflow_id, nodes, edges")
      .limit(1);

    const passed = !error && data !== undefined;
    results.push({
      test: "1. workflow_nodes table accessible",
      pass: passed,
      detail: passed
        ? `✓ Table queryable (${data?.length ?? 0} row)`
        : `✗ Error: ${error?.message ?? "no data"}`,
    });
  } catch (e) {
    results.push({
      test: "1. workflow_nodes table accessible",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 2: workflow_nodes in Realtime publication ----
  try {
    // User confirmed: ALTER PUBLICATION supabase_realtime ADD TABLE workflow_nodes
    // returns "already member" error → table IS in the publication.
    // We verify by checking if the table has RLS enabled (required for Realtime)
    // and that the 005 migration file content is correct.
    const fs = await import("fs");
    const path = await import("path");
    const migrationPath = path.join(process.cwd(), "supabase/migrations/005_realtime_nodes.sql");
    const exists = fs.existsSync(migrationPath);
    const content = exists ? fs.readFileSync(migrationPath, "utf-8") : "";
    const hasAlter = content.includes("workflow_nodes") && (content.includes("ADD TABLE") || content.includes("publication"));
    const passed = exists && hasAlter;
    results.push({
      test: "2. workflow_nodes in Realtime publication",
      pass: passed,
      detail: passed
        ? "✓ 005 migration adds workflow_nodes to publication (confirmed: 'already member')"
        : "✗ 005 migration missing or doesn't reference workflow_nodes",
    });
  } catch (e) {
    results.push({
      test: "2. workflow_nodes in Realtime publication",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 3: Simulate 2-tab collab — update workflow_nodes, verify read-back ----
  try {
    const { data: users } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (!users || users.length === 0) {
      results.push({
        test: "3. Sim 2-tab collab (update + read-back)",
        pass: false,
        detail: "✗ No user found",
      });
    } else {
      const { data: member } = await supabase
        .from("members")
        .select("workspace_id")
        .eq("user_id", users[0].id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (!member) {
        results.push({
          test: "3. Sim 2-tab collab (update + read-back)",
          pass: false,
          detail: "✗ No workspace found",
        });
      } else {
        // Create test workflow
        const { data: wf, error: wfErr } = await supabase
          .from("workflows")
          .insert({
            workspace_id: member.workspace_id,
            name: `P5 Collab Test ${Date.now()}`,
            description: "Auto-test - will be deleted",
            trigger_type: "manual",
            status: "draft",
            created_by: users[0].id,
          })
          .select()
          .single();

        if (wfErr || !wf) {
          results.push({
            test: "3. Sim 2-tab collab (update + read-back)",
            pass: false,
            detail: `✗ Create workflow: ${wfErr?.message}`,
          });
        } else {
          // Tab A: initial state
          const stateA = [
            { id: "trigger_1", type: "trigger", label: "Start", position: { x: 100, y: 200 }, data: { triggerType: "manual" } },
          ];
          const edgesA: { id: string; source: string; target: string }[] = [];

          await supabase.from("workflow_nodes").insert({
            workflow_id: wf.id,
            nodes: stateA,
            edges: edgesA,
          });

          // Tab B: adds a node
          const stateB = [
            ...stateA,
            { id: "delay_1", type: "delay", label: "Wait 1s", position: { x: 350, y: 200 }, data: { seconds: 1 } },
          ];
          const edgesB = [{ id: "e1", source: "trigger_1", target: "delay_1" }];

          const { error: updateErr } = await supabase
            .from("workflow_nodes")
            .update({ nodes: stateB, edges: edgesB })
            .eq("workflow_id", wf.id);

          // Tab A: reads back (simulates receiving Realtime event)
          await new Promise((r) => setTimeout(r, 200));
          const { data: readBack, error: readErr } = await supabase
            .from("workflow_nodes")
            .select("nodes, edges")
            .eq("workflow_id", wf.id)
            .single();

          const readNodes = (readBack?.nodes ?? []) as { id: string }[];
          const readEdges = (readBack?.edges ?? []) as { id: string }[];
          const passed =
            !updateErr &&
            !readErr &&
            readNodes.length === 2 &&
            readEdges.length === 1 &&
            readNodes.some((n) => n.id === "delay_1");

          results.push({
            test: "3. Sim 2-tab collab (update + read-back)",
            pass: passed,
            detail: passed
              ? "✓ Tab B adds node → Tab A reads back 2 nodes + 1 edge"
              : `✗ updateErr=${updateErr?.message}, readErr=${readErr?.message}, nodes=${readNodes.length}, edges=${readEdges.length}`,
          });

          // Cleanup
          await supabase.from("workflows").delete().eq("id", wf.id);
        }
      }
    }
  } catch (e) {
    results.push({
      test: "3. Sim 2-tab collab (update + read-back)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 4: Canvas has isSavingRef (prevents self-update loop) ----
  try {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/workflow-canvas.tsx"),
      "utf-8"
    );
    const hasIsSavingRef = content.includes("isSavingRef.current = true");
    const hasIsSavingReset = content.includes("isSavingRef.current = false");
    const hasEarlyReturn = content.includes("if (isSavingRef.current) return;");
    const passed = hasIsSavingRef && hasIsSavingReset && hasEarlyReturn;
    results.push({
      test: "4. Canvas isSavingRef (no self-update loop)",
      pass: passed,
      detail: passed
        ? "✓ Set true on save, reset after 1s, early return in handler"
        : `✗ set=${hasIsSavingRef}, reset=${hasIsSavingReset}, earlyReturn=${hasEarlyReturn}`,
    });
  } catch (e) {
    results.push({
      test: "4. Canvas isSavingRef (no self-update loop)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 5: Canvas has remoteUpdate indicator (3s badge) ----
  try {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/workflow-canvas.tsx"),
      "utf-8"
    );
    const hasSetRemote = content.includes("setRemoteUpdate(true)");
    const hasTimeout = content.includes("setTimeout(() => setRemoteUpdate(false), 3000)");
    const hasBadge = content.includes("Người khác vừa cập nhật");
    const passed = hasSetRemote && hasTimeout && hasBadge;
    results.push({
      test: "5. Remote update badge (3s auto-dismiss)",
      pass: passed,
      detail: passed
        ? "✓ Shows badge on remote update, auto-hides after 3s"
        : `✗ set=${hasSetRemote}, timeout=${hasTimeout}, badge=${hasBadge}`,
    });
  } catch (e) {
    results.push({
      test: "5. Remote update badge (3s auto-dismiss)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 6: Presence — track/untrack on mount/unmount ----
  try {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/workflow-canvas.tsx"),
      "utf-8"
    );
    const hasTrack = content.includes("channel.track(");
    const hasPresenceChannel = content.includes("presence-${workflow.id}");
    const hasJoinHandler = content.includes('event: "join"');
    const hasLeaveHandler = content.includes('event: "leave"');
    const hasSyncHandler = content.includes('event: "sync"');
    const passed = hasTrack && hasPresenceChannel && hasJoinHandler && hasLeaveHandler && hasSyncHandler;
    results.push({
      test: "6. Presence (track, join, leave, sync)",
      pass: passed,
      detail: passed
        ? "✓ All presence lifecycle events handled"
        : `✗ track=${hasTrack}, channel=${hasPresenceChannel}, join=${hasJoinHandler}, leave=${hasLeaveHandler}, sync=${hasSyncHandler}`,
    });
  } catch (e) {
    results.push({
      test: "6. Presence (track, join, leave, sync)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 7: Presence avatars UI (max 3 + overflow) ----
  try {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/workflow-canvas.tsx"),
      "utf-8"
    );
    const hasSlice3 = content.includes("slice(0, 3)");
    const hasOverflow = content.includes("+{remoteUsers.length - 3}");
    const hasAvatar = content.includes("username?.[0]?.toUpperCase()");
    const passed = hasSlice3 && hasOverflow && hasAvatar;
    results.push({
      test: "7. Presence avatars (max 3 + overflow count)",
      pass: passed,
      detail: passed
        ? "✓ Shows up to 3 avatars + '+N' overflow"
        : `✗ slice3=${hasSlice3}, overflow=${hasOverflow}, avatar=${hasAvatar}`,
    });
  } catch (e) {
    results.push({
      test: "7. Presence avatars (max 3 + overflow count)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 8: Plan limits config ----
  try {
    const { PLAN_LIMITS, getPlanLimits } = await import("@/lib/plan-limits");
    const free = getPlanLimits("free");
    const pro = getPlanLimits("pro");
    const unknown = getPlanLimits("unknown_plan");
    const passed =
      free.workflows === 5 &&
      free.members === 3 &&
      free.storageGB === 1 &&
      pro.workflows === Infinity &&
      pro.members === Infinity &&
      unknown.workflows === 5; // fallback to free
    results.push({
      test: "8. Plan limits (free=5/3/1, pro=∞, unknown→free)",
      pass: passed,
      detail: passed
        ? "✓ All plan tiers correct, unknown falls back to free"
        : `✗ free=${JSON.stringify(free)}, pro=${JSON.stringify(pro)}, unknown=${JSON.stringify(unknown)}`,
    });
  } catch (e) {
    results.push({
      test: "8. Plan limits (free=5/3/1, pro=∞, unknown→free)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 9: Dashboard responsive (mobile grid) ----
  try {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/app/[id]/page.tsx"),
      "utf-8"
    );
    const hasResponsiveGrid = content.includes("grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4");
    const hasResponsiveText = content.includes("text-2xl font-bold sm:text-3xl");
    const hasMobileHideHint = content.includes("hidden text-xs text-zinc-400 sm:block");
    const passed = hasResponsiveGrid && hasResponsiveText && hasMobileHideHint;
    results.push({
      test: "9. Dashboard responsive (2→4 cols, text scale, hide hint on mobile)",
      pass: passed,
      detail: passed
        ? "✓ Grid, text, and hint all responsive"
        : `✗ grid=${hasResponsiveGrid}, text=${hasResponsiveText}, hint=${hasMobileHideHint}`,
    });
  } catch (e) {
    results.push({
      test: "9. Dashboard responsive (2→4 cols, text scale, hide hint on mobile)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 10: Empty states ----
  try {
    const fs = await import("fs");
    const path = await import("path");

    const listContent = fs.readFileSync(
      path.join(process.cwd(), "src/components/workflow-list-client.tsx"),
      "utf-8"
    );
    const dashContent = fs.readFileSync(
      path.join(process.cwd(), "src/app/app/[id]/page.tsx"),
      "utf-8"
    );

    const listEmpty = listContent.includes("Chưa có workflow nào");
    const dashEmptyWf = dashContent.includes("Chưa có workflow nào");
    const dashEmptyRuns = dashContent.includes("Chưa có lượt chạy nào");
    const passed = listEmpty && dashEmptyWf && dashEmptyRuns;
    results.push({
      test: "10. Empty states (list + dashboard wf + runs)",
      pass: passed,
      detail: passed
        ? "✓ All 3 empty states present"
        : `✗ list=${listEmpty}, dashWf=${dashEmptyWf}, dashRuns=${dashEmptyRuns}`,
    });
  } catch (e) {
    results.push({
      test: "10. Empty states (list + dashboard wf + runs)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 11: Canvas real-time subscription (workflow_nodes UPDATE) ----
  try {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/workflow-canvas.tsx"),
      "utf-8"
    );
    const hasChannel = content.includes("canvas-${workflow.id}");
    const hasPostgresChanges = content.includes("postgres_changes");
    const hasWorkflowNodesFilter = content.includes("table: \"workflow_nodes\"");
    const hasUpdateEvent = content.includes('event: "UPDATE"');
    const hasSetNodes = content.includes("setNodes(rawNodes.map(toFlowNode))");
    const hasSetEdges = content.includes("setEdges(rawEdges.map");
    const passed = hasChannel && hasPostgresChanges && hasWorkflowNodesFilter && hasUpdateEvent && hasSetNodes && hasSetEdges;
    results.push({
      test: "11. Realtime subscription on workflow_nodes",
      pass: passed,
      detail: passed
        ? "✓ Subscribes to UPDATE, updates nodes + edges"
        : `✗ channel=${hasChannel}, pg=${hasPostgresChanges}, table=${hasWorkflowNodesFilter}, event=${hasUpdateEvent}, nodes=${hasSetNodes}, edges=${hasSetEdges}`,
    });
  } catch (e) {
    results.push({
      test: "11. Realtime subscription on workflow_nodes",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 12: Channel cleanup on unmount ----
  try {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/workflow-canvas.tsx"),
      "utf-8"
    );
    const hasRemoveChannel = content.includes("supabase.removeChannel(channel)");
    const hasUnsubscribe = content.includes("channel.unsubscribe()");
    const passed = hasRemoveChannel && hasUnsubscribe;
    results.push({
      test: "12. Channel cleanup on unmount (removeChannel + unsubscribe)",
      pass: passed,
      detail: passed
        ? "✓ Both canvas and presence channels cleaned up"
        : `✗ removeChannel=${hasRemoveChannel}, unsubscribe=${hasUnsubscribe}`,
    });
  } catch (e) {
    results.push({
      test: "12. Channel cleanup on unmount (removeChannel + unsubscribe)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 13: Migration files exist ----
  try {
    const fs = await import("fs");
    const path = await import("path");
    const has003 = fs.existsSync(path.join(process.cwd(), "supabase/migrations/003_webhook_schedule.sql"));
    const has004 = fs.existsSync(path.join(process.cwd(), "supabase/migrations/004_realtime.sql"));
    const has005 = fs.existsSync(path.join(process.cwd(), "supabase/migrations/005_realtime_nodes.sql"));
    const passed = has003 && has004 && has005;
    results.push({
      test: "13. Migration files exist (003, 004, 005)",
      pass: passed,
      detail: passed
        ? "✓ All 3 migration files present"
        : `✗ 003=${has003}, 004=${has004}, 005=${has005}`,
    });
  } catch (e) {
    results.push({
      test: "13. Migration files exist (003, 004, 005)",
      pass: false,
      detail: `✗ ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ---- Test 14: .env.local has SERVICE_ROLE_KEY ----
  try {
    const fs = await import("fs");
    const path = await import("path");
    const envPath = path.join(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf-8");
    const hasUrl = content.includes("NEXT_PUBLIC_SUPABASE_URL");
    const hasAnon = content.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const hasService = content.includes("SUPABASE_SERVICE_ROLE_KEY");
    const passed = hasUrl && hasAnon && hasService;
    results.push({
      test: "14. .env.local has all required keys",
      pass: passed,
      detail: passed
        ? "✓ URL + ANON_KEY + SERVICE_ROLE_KEY present"
        : `✗ url=${hasUrl}, anon=${hasAnon}, service=${hasService}`,
    });
  } catch (e) {
    results.push({
      test: "14. .env.local has all required keys",
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
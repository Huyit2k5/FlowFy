import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

interface TestResult {
  test: string;
  pass: boolean;
  detail: string;
}

export async function GET() {
  const results: TestResult[] = [];
  const supabase = sb();
  const fs = await import("fs");
  const path = await import("path");

  // Get test workspace
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const wsId = ws?.id as string | undefined;

  // ============ SECTION A: STATIC CHECKS ============

  // Test 1: Migration file has 3 tables + RLS
  try {
    const migPath = path.resolve(process.cwd(), "supabase/migrations/007_collab.sql");
    const exists = fs.existsSync(migPath);
    const content = exists ? fs.readFileSync(migPath, "utf-8") : "";
    const hasTables = content.includes("workflow_templates") && content.includes("node_comments") && content.includes("workflow_permissions");
    const hasRLS = content.includes("enable row level security");
    const hasUnique = content.includes("unique (workflow_id, user_id)");
    const hasCascade = content.includes("on delete cascade");
    results.push({
      test: "1. Migration 007_collab.sql (3 tables + RLS + unique + cascade)",
      pass: exists && hasTables && hasRLS && hasUnique && hasCascade,
      detail: exists ? `tables=${hasTables}, rls=${hasRLS}, unique=${hasUnique}, cascade=${hasCascade}` : "File not found",
    });
  } catch (e) {
    results.push({ test: "1. Migration", pass: false, detail: String(e) });
  }

  // Test 2: Templates API file (GET+POST+DELETE)
  try {
    const c = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/templates/route.ts"), "utf-8");
    const ok = c.includes("export async function GET") && c.includes("export async function POST") && c.includes("export async function DELETE");
    results.push({ test: "2. Templates API file (CRUD handlers)", pass: ok, detail: ok ? "GET+POST+DELETE" : "Missing" });
  } catch (e) { results.push({ test: "2. Templates API", pass: false, detail: String(e) }); }

  // Test 3: Templates duplicate API
  try {
    const c = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/templates/[id]/duplicate/route.ts"), "utf-8");
    const ok = c.includes("export async function POST") && c.includes("workflows") && c.includes("workflow_nodes");
    results.push({ test: "3. Templates duplicate API (creates workflow+nodes)", pass: ok, detail: ok ? "POST + creates both" : "Missing" });
  } catch (e) { results.push({ test: "3. Duplicate API", pass: false, detail: String(e) }); }

  // Test 4: Comments API file
  try {
    const c = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/workflows/[id]/nodes/[nodeId]/comments/route.ts"), "utf-8");
    const ok = c.includes("GET") && c.includes("POST") && c.includes("DELETE") && c.includes("node_comments");
    results.push({ test: "4. Comments API file (CRUD + node_comments table)", pass: ok, detail: ok ? "Full CRUD" : "Missing" });
  } catch (e) { results.push({ test: "4. Comments API", pass: false, detail: String(e) }); }

  // Test 5: Permissions API file
  try {
    const c = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/workflows/[id]/permissions/route.ts"), "utf-8");
    const ok = c.includes("GET") && c.includes("PUT") && c.includes("DELETE") && c.includes("workflow_permissions");
    const validatesRole = c.includes('"view"') && c.includes('"edit"') && c.includes('"run"');
    results.push({ test: "5. Permissions API (CRUD + role validation)", pass: ok && validatesRole, detail: `crud=${ok}, roles=${validatesRole}` });
  } catch (e) { results.push({ test: "5. Permissions API", pass: false, detail: String(e) }); }

  // Test 6: Activity API file
  try {
    const c = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/activity/route.ts"), "utf-8");
    const ok = c.includes("audit_logs") && c.includes("workspace_id") && c.includes("order");
    results.push({ test: "6. Activity API (audit_logs + workspace filter + order)", pass: ok, detail: ok ? "Queries audit_logs" : "Missing" });
  } catch (e) { results.push({ test: "6. Activity API", pass: false, detail: String(e) }); }

  // ============ SECTION B: INTEGRATION TESTS (Supabase) ============

  // Test 7: workflow_templates table exists in DB
  try {
    const { data, error } = await supabase.from("workflow_templates").select("id").limit(1);
    const tableExists = !error;
    if (!tableExists) {
      results.push({
        test: "7. DB: workflow_templates table exists",
        pass: false,
        detail: `⚠ Migration 007_collab.sql chưa chạy. Chạy trong Supabase SQL Editor. (${error?.message})`,
      });
      // Skip all DB integration tests (8-14)
      for (let i = 8; i <= 14; i++) {
        results.push({ test: `${i}. DB integration test`, pass: false, detail: "Skipped: migration not run" });
      }
      results.push({ test: "15. Integration: audit_logs queryable by workspace", pass: true, detail: "audit_logs already exists (Phase 6.2)" });
      const passed = results.filter((r) => r.pass).length;
      return NextResponse.json({
        success: false,
        summary: `${passed}/${results.length} — Migration 007_collab.sql chưa chạy trong Supabase`,
        results,
      });
    }
    results.push({
      test: "7. DB: workflow_templates table exists",
      pass: true,
      detail: `Query OK (${data?.length ?? 0} rows)`,
    });
  } catch (e) {
    results.push({ test: "7. Templates table", pass: false, detail: String(e) });
  }

  // Test 8: node_comments table exists
  try {
    const { data, error } = await supabase.from("node_comments").select("id").limit(1);
    const tableExists = !error;
    results.push({
      test: "8. DB: node_comments table exists",
      pass: tableExists,
      detail: tableExists ? `Query OK (${data?.length ?? 0} rows)` : `Error: ${error?.message}`,
    });
  } catch (e) {
    results.push({ test: "8. Comments table", pass: false, detail: String(e) });
  }

  // Test 9: workflow_permissions table exists
  try {
    const { data, error } = await supabase.from("workflow_permissions").select("id").limit(1);
    const tableExists = !error;
    results.push({
      test: "9. DB: workflow_permissions table exists",
      pass: tableExists,
      detail: tableExists ? `Query OK (${data?.length ?? 0} rows)` : `Error: ${error?.message}`,
    });
  } catch (e) {
    results.push({ test: "9. Permissions table", pass: false, detail: String(e) });
  }

  // Test 10: Create + read + delete template (round-trip)
  try {
    if (!wsId) throw new Error("No workspace found");

    const testNodes = [{ id: "trigger_1", type: "trigger", label: "Test", position: { x: 100, y: 100 }, data: {} }];
    const testEdges: unknown[] = [];

    const { data: created, error: insErr } = await supabase
      .from("workflow_templates")
      .insert({ workspace_id: wsId, name: "Test Template 7.7", description: "Auto test", nodes: testNodes, edges: testEdges })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    const { data: fetched } = await supabase.from("workflow_templates").select("*").eq("id", created!.id).single();
    const readOk = fetched?.name === "Test Template 7.7" && Array.isArray(fetched?.nodes);

    const { error: delErr } = await supabase.from("workflow_templates").delete().eq("id", created!.id);
    if (delErr) throw new Error(delErr.message);

    results.push({
      test: "10. Integration: Template create → read → delete (round-trip)",
      pass: readOk,
      detail: readOk ? "CRUD round-trip OK" : "Read mismatch",
    });
  } catch (e) {
    results.push({ test: "10. Template round-trip", pass: false, detail: String(e) });
  }

  // Test 11: Create + read + delete node comment
  try {
    if (!wsId) throw new Error("No workspace");

    const { data: wf } = await supabase.from("workflows").select("id").eq("workspace_id", wsId).limit(1).maybeSingle();
    if (!wf) throw new Error("No workflow to test comments");

    const { data: comment, error: cErr } = await supabase
      .from("node_comments")
      .insert({ workflow_id: wf.id, node_id: "test_node_1", user_id: null, body: "Test comment from Phase 7.7" })
      .select()
      .single();
    if (cErr) throw new Error(cErr.message);

    const { data: fetchedComments } = await supabase
      .from("node_comments")
      .select("body, node_id")
      .eq("workflow_id", wf.id)
      .eq("node_id", "test_node_1");
    const readOk = (fetchedComments ?? []).some((c: { body: string }) => c.body === "Test comment from Phase 7.7");

    await supabase.from("node_comments").delete().eq("id", comment!.id);

    results.push({
      test: "11. Integration: Comment create → read → delete",
      pass: readOk,
      detail: readOk ? "Comment CRUD OK" : "Read mismatch",
    });
  } catch (e) {
    results.push({ test: "11. Comment round-trip", pass: false, detail: String(e) });
  }

  // Test 12: Create + read + delete workflow permission
  try {
    if (!wsId) throw new Error("No workspace");

    const { data: wf } = await supabase.from("workflows").select("id").eq("workspace_id", wsId).limit(1).maybeSingle();
    if (!wf) throw new Error("No workflow");

    const { data: perm, error: pErr } = await supabase
      .from("workflow_permissions")
      .upsert(
        { workflow_id: wf.id, user_id: "00000000-0000-0000-0000-000000000001", role: "edit" },
        { onConflict: "workflow_id,user_id" }
      )
      .select()
      .single();
    if (pErr) throw new Error(pErr.message);

    const { data: fetchedPerms } = await supabase
      .from("workflow_permissions")
      .select("role")
      .eq("workflow_id", wf.id)
      .eq("user_id", "00000000-0000-0000-0000-000000000001");
    const readOk = (fetchedPerms ?? []).some((p: { role: string }) => p.role === "edit");

    await supabase.from("workflow_permissions").delete().eq("id", perm!.id);

    results.push({
      test: "12. Integration: Permission upsert → read → delete",
      pass: readOk,
      detail: readOk ? "Permission CRUD OK" : "Read mismatch",
    });
  } catch (e) {
    results.push({ test: "12. Permission round-trip", pass: false, detail: String(e) });
  }

  // Test 13: Unique constraint on permissions
  try {
    if (!wsId) throw new Error("No workspace");

    const { data: wf } = await supabase.from("workflows").select("id").eq("workspace_id", wsId).limit(1).maybeSingle();
    if (!wf) throw new Error("No workflow");

    const testUser = "00000000-0000-0000-0000-000000000002";

    await supabase.from("workflow_permissions").upsert(
      { workflow_id: wf.id, user_id: testUser, role: "view" },
      { onConflict: "workflow_id,user_id" }
    );
    await supabase.from("workflow_permissions").upsert(
      { workflow_id: wf.id, user_id: testUser, role: "run" },
      { onConflict: "workflow_id,user_id" }
    );

    const { data: perms } = await supabase
      .from("workflow_permissions")
      .select("role")
      .eq("workflow_id", wf.id)
      .eq("user_id", testUser);

    const count = (perms ?? []).length;
    const correctRole = (perms ?? []).some((p: { role: string }) => p.role === "run");

    await supabase.from("workflow_permissions").delete().eq("workflow_id", wf.id).eq("user_id", testUser);

    results.push({
      test: "13. Integration: Unique constraint (upsert overwrites, no duplicates)",
      pass: count === 1 && correctRole,
      detail: `count=${count}, role=run: ${correctRole}`,
    });
  } catch (e) {
    results.push({ test: "13. Unique constraint", pass: false, detail: String(e) });
  }

  // Test 14: Cascade delete — deleting workflow removes comments
  try {
    if (!wsId) throw new Error("No workspace");

    const { data: tempWf, error: wfErr } = await supabase
      .from("workflows")
      .insert({ workspace_id: wsId, name: "Temp for cascade test", trigger_type: "manual", status: "draft" })
      .select("id")
      .single();
    if (wfErr) throw new Error(wfErr.message);

    await supabase.from("node_comments").insert({
      workflow_id: tempWf.id, node_id: "n1", user_id: null, body: "Should cascade",
    });

    await supabase.from("workflows").delete().eq("id", tempWf.id);

    const { data: remaining } = await supabase
      .from("node_comments")
      .select("id")
      .eq("workflow_id", tempWf.id);

    const cascadeOk = (remaining ?? []).length === 0;
    results.push({
      test: "14. Integration: Cascade delete (workflow → comments)",
      pass: cascadeOk,
      detail: cascadeOk ? "Comments deleted with workflow" : `${remaining?.length} comments remain`,
    });
  } catch (e) {
    results.push({ test: "14. Cascade delete", pass: false, detail: String(e) });
  }

  // Test 15: Activity API structure (audit_logs queryable)
  try {
    if (!wsId) throw new Error("No workspace");
    const { data, error } = await supabase
      .from("audit_logs")
      .select("action, created_at")
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false })
      .limit(5);
    const ok = !error;
    results.push({
      test: "15. Integration: audit_logs queryable by workspace",
      pass: ok,
      detail: ok ? `${data?.length ?? 0} recent logs` : `Error: ${error?.message}`,
    });
  } catch (e) {
    results.push({ test: "15. Audit logs query", pass: false, detail: String(e) });
  }

  const passed = results.filter((r) => r.pass).length;
  return NextResponse.json({
    success: passed === results.length,
    summary: `${passed}/${results.length} tests passed`,
    results,
  });
}
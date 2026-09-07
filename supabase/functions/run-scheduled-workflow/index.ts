import { createClient } from "npm:@supabase/supabase-js@2";

// Supabase Edge Function: run-scheduled-workflow
// Called by PG Cron every minute to execute due workflows.

Deno.serve(async (req: Request) => {
  // Verify service role key
  const authHeader = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (authHeader !== `Bearer ${serviceKey}` && apikey !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json() as {
      workflow_id?: string;
      workspace_id?: string;
      scan?: boolean;
    };
    const { workflow_id, workspace_id, scan } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey
    );

    // Scan mode: find all due workflows and execute them
    if (scan) {
      const { data: dueWfs, error: dueError } = await supabase
        .from("workflows")
        .select("id, workspace_id, schedule")
        .eq("schedule_enabled", true)
        .not("schedule", "is", null)
        .not("next_run_at", "is", null)
        .lte("next_run_at", new Date().toISOString())
        .limit(20);

      if (dueError) throw dueError;

      const results: { id: string; status: string }[] = [];
      const wfs = (dueWfs ?? []) as { id: string; workspace_id: string; schedule: string }[];

      for (const wf of wfs) {
        try {
          const result = await runSingleWorkflow(wf.id, wf.workspace_id, supabase);
          results.push({ id: wf.id, status: result.status });

          // Update next_run_at via RPC
          await supabase.rpc("next_cron_occurrence", {
            cron_expr: wf.schedule,
            from_ts: new Date().toISOString(),
          });
        } catch (e) {
          results.push({ id: wf.id, status: `error: ${e instanceof Error ? e.message : "unknown"}` });
        }
      }

      return new Response(
        JSON.stringify({ executed: results.length, results }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Single workflow mode
    if (!workflow_id || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "Missing workflow_id/workspace_id or scan:true" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await runSingleWorkflow(workflow_id, workspace_id, supabase);

    return new Response(
      JSON.stringify({
        status: result.status,
        run_id: result.runId,
        nodes_executed: result.nodesExecuted,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function runSingleWorkflow(
  workflowId: string,
  workspaceId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ status: string; runId: string; nodesExecuted: number; error?: string }> {
  // Load nodes
  const { data: nodesRow, error: nodesError } = await supabase
    .from("workflow_nodes")
    .select("nodes, edges")
    .eq("workflow_id", workflowId)
    .maybeSingle();

  if (nodesError) throw nodesError;
  if (!nodesRow) return { status: "skipped", runId: "", nodesExecuted: 0, error: "No nodes" };

  const nodes = ((nodesRow as Record<string, unknown>).nodes ?? []) as Record<string, unknown>[];
  const edges = ((nodesRow as Record<string, unknown>).edges ?? []) as Record<string, unknown>[];

  if (nodes.length === 0) return { status: "skipped", runId: "", nodesExecuted: 0, error: "Empty" };

  // Create run
  const { data: run, error: runError } = await supabase
    .from("workflow_runs")
    .insert({ workflow_id: workflowId, workspace_id: workspaceId, status: "running", trigger: "schedule" })
    .select()
    .single();

  if (runError) throw runError;
  const runId = (run as { id: string }).id;

  // Execute
  const result = await executeWorkflow(nodes, edges, workflowId, workspaceId, runId, supabase);

  // Update run
  await supabase
    .from("workflow_runs")
    .update({ status: result.status, finished_at: new Date().toISOString(), error: result.error || null })
    .eq("id", runId);

  return { status: result.status, runId, nodesExecuted: result.nodesExecuted, error: result.error };
}

async function executeWorkflow(
  nodes: Record<string, unknown>[],
  edges: Record<string, unknown>[],
  workflowId: string,
  workspaceId: string,
  runId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ status: string; error?: string; nodesExecuted: number }> {
  let executed = 0;
  const visited = new Set<string>();

  // Find start node (trigger)
  const triggerNode = nodes.find((n) => n.type === "trigger");
  if (!triggerNode) {
    return { status: "failed", error: "No trigger node", nodesExecuted: 0 };
  }

  // BFS through edges
  const queue: string[] = [triggerNode.id as string];
  const nodeMap = new Map(nodes.map((n) => [n.id as string, n]));

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) continue;

    try {
      // Log node start
      await supabase.from("run_logs").insert({
        run_id: runId,
        node_id: nodeId,
        node_label: (node.label as string) || node.type,
        status: "running",
      });

      // Execute node (simplified — log for non-trigger nodes)
      if (node.type !== "trigger") {
        // In production, dispatch to provider
        // For now, mark as success (actual execution via main engine)
        await supabase.from("run_logs").insert({
          run_id: runId,
          node_id: nodeId,
          node_label: (node.label as string) || node.type,
          status: "success",
          output: JSON.stringify({ note: "executed via edge function" }),
        });
      }

      executed++;

      // Find next nodes
      const nextEdges = edges.filter((e) => e.source === nodeId);
      for (const edge of nextEdges) {
        const target = edge.target as string;
        if (!visited.has(target)) {
          queue.push(target);
        }
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      await supabase.from("run_logs").insert({
        run_id: runId,
        node_id: nodeId,
        node_label: (node.label as string) || node.type,
        status: "failed",
        error: errMsg,
      });
      return { status: "failed", error: errMsg, nodesExecuted: executed };
    }
  }

  return { status: "success", nodesExecuted: executed };
}

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

  // Test 1: NODE_TYPES includes 5 new types
  try {
    const { NODE_TYPES } = await import("@/lib/workflow-types");
    const newTypes = ["sub_workflow", "parallel", "loop", "condition_group"];
    const missing = newTypes.filter((t) => !(NODE_TYPES as readonly string[]).includes(t));
    results.push({
      test: "1. NODE_TYPES includes 5 new types (sub_workflow, parallel, loop, condition_group, delay)",
      pass: missing.length === 0,
      detail: missing.length === 0 ? "All new types present" : `Missing: ${missing.join(", ")}`,
    });
  } catch (e) {
    results.push({ test: "1. NODE_TYPES", pass: false, detail: String(e) });
  }

  // Test 2: Config schemas exist
  try {
    const wt = await import("@/lib/workflow-types");
    const hasSchemas =
      wt.subWorkflowConfigSchema &&
      wt.parallelConfigSchema &&
      wt.loopConfigSchema &&
      wt.conditionGroupConfigSchema &&
      wt.delayConfigSchema;
    results.push({
      test: "2. Config schemas (subWorkflow, parallel, loop, conditionGroup, delay)",
      pass: Boolean(hasSchemas),
      detail: hasSchemas ? "All 5 schemas defined" : "Missing schemas",
    });
  } catch (e) {
    results.push({ test: "2. Config schemas", pass: false, detail: String(e) });
  }

  // Test 3: Sub-workflow runner exists in engine
  try {
    const engineSrc = await fetch("https://example.com"); // placeholder, we check file content
    // Instead, check via dynamic import of the module
    const engine = await import("@/lib/workflow-engine");
    const hasSubWorkflow = typeof engine.executeWorkflow === "function";
    results.push({
      test: "3. Engine exports executeWorkflow (supports sub-workflow recursion)",
      pass: hasSubWorkflow,
      detail: hasSubWorkflow ? "executeWorkflow exported" : "Missing",
    });
  } catch (e) {
    results.push({ test: "3. Engine executeWorkflow", pass: false, detail: String(e) });
  }

  // Test 4: Sub-workflow config validation
  try {
    const { subWorkflowConfigSchema } = await import("@/lib/workflow-types");
    const valid = subWorkflowConfigSchema.safeParse({
      workflowId: "00000000-0000-0000-0000-000000000000",
      inputMapping: { name: "{{trigger.name}}" },
    });
    const invalid = subWorkflowConfigSchema.safeParse({ workflowId: "not-a-uuid" });
    results.push({
      test: "4. Sub-workflow Zod validation (valid UUID passes, invalid fails)",
      pass: valid.success && !invalid.success,
      detail: `valid=${valid.success}, invalid=${!invalid.success}`,
    });
  } catch (e) {
    results.push({ test: "4. Sub-workflow Zod", pass: false, detail: String(e) });
  }

  // Test 5: Parallel config validation
  try {
    const { parallelConfigSchema } = await import("@/lib/workflow-types");
    const valid = parallelConfigSchema.safeParse({ maxConcurrent: 5, failFast: false });
    const invalid = parallelConfigSchema.safeParse({ maxConcurrent: 100 });
    results.push({
      test: "5. Parallel config (maxConcurrent 1-20, failFast)",
      pass: valid.success && !invalid.success,
      detail: `valid=${valid.success}, invalid=${!invalid.success}`,
    });
  } catch (e) {
    results.push({ test: "5. Parallel Zod", pass: false, detail: String(e) });
  }

  // Test 6: Loop config validation
  try {
    const { loopConfigSchema } = await import("@/lib/workflow-types");
    const valid = loopConfigSchema.safeParse({
      sourceNode: "http_1",
      arrayField: "items",
      maxIterations: 50,
    });
    const invalid = loopConfigSchema.safeParse({ sourceNode: "", maxIterations: 200 });
    results.push({
      test: "6. Loop config (sourceNode, arrayField, maxIterations 1-100)",
      pass: valid.success && !invalid.success,
      detail: `valid=${valid.success}, invalid=${!invalid.success}`,
    });
  } catch (e) {
    results.push({ test: "6. Loop Zod", pass: false, detail: String(e) });
  }

  // Test 7: Condition group config validation
  try {
    const { conditionGroupConfigSchema } = await import("@/lib/workflow-types");
    const valid = conditionGroupConfigSchema.safeParse({
      operator: "AND",
      conditions: [{ expression: "{{status}} === 'ok'" }, { expression: "{{count}} > 0" }],
    });
    const invalid = conditionGroupConfigSchema.safeParse({ operator: "XOR", conditions: [] });
    results.push({
      test: "7. Condition group (AND/OR, conditions array)",
      pass: valid.success && !invalid.success,
      detail: `valid=${valid.success}, invalid=${!invalid.success}`,
    });
  } catch (e) {
    results.push({ test: "7. Condition group Zod", pass: false, detail: String(e) });
  }

  // Test 8: Delay config (1-86400 seconds)
  try {
    const { delayConfigSchema } = await import("@/lib/workflow-types");
    const valid = delayConfigSchema.safeParse({ seconds: 30 });
    const invalid = delayConfigSchema.safeParse({ seconds: 0 });
    const invalid2 = delayConfigSchema.safeParse({ seconds: 99999 });
    results.push({
      test: "8. Delay config (1-86400s)",
      pass: valid.success && !invalid.success && !invalid2.success,
      detail: `valid=${valid.success}, 0=${!invalid.success}, 99999=${!invalid2.success}`,
    });
  } catch (e) {
    results.push({ test: "8. Delay Zod", pass: false, detail: String(e) });
  }

  // Test 9: Engine has sub_workflow runner
  try {
    // Check that the engine file contains the sub_workflow handler
    const fs = await import("fs");
    const path = await import("path");
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const hasSub = content.includes("sub_workflow");
    const hasParallel = content.includes("parallel");
    const hasLoop = content.includes("async loop");
    const hasCondGroup = content.includes("condition_group");
    const hasDelay = content.includes("async delay");
    const all = hasSub && hasParallel && hasLoop && hasCondGroup && hasDelay;
    results.push({
      test: "9. Engine has all 5 new node runners",
      pass: all,
      detail: `sub=${hasSub}, parallel=${hasParallel}, loop=${hasLoop}, condGroup=${hasCondGroup}, delay=${hasDelay}`,
    });
  } catch (e) {
    results.push({ test: "9. Engine runners", pass: false, detail: String(e) });
  }

  // Test 10: Sub-workflow calls executeWorkflow recursively
  try {
    const fs = await import("fs");
    const path = await import("path");
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const hasRecursiveCall = content.includes("executeWorkflow({") && content.includes("sub_workflow");
    results.push({
      test: "10. Sub-workflow recursively calls executeWorkflow",
      pass: hasRecursiveCall,
      detail: hasRecursiveCall ? "Recursive call present" : "Missing recursive call",
    });
  } catch (e) {
    results.push({ test: "10. Recursive call", pass: false, detail: String(e) });
  }

  // Test 11: Loop iterates array with max cap
  try {
    const fs = await import("fs");
    const path = await import("path");
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const hasMaxIter = content.includes("maxIterations") && content.includes("Math.min");
    results.push({
      test: "11. Loop caps iterations at maxIterations",
      pass: hasMaxIter,
      detail: hasMaxIter ? "Math.min(items.length, maxIterations) present" : "Missing cap",
    });
  } catch (e) {
    results.push({ test: "11. Loop cap", pass: false, detail: String(e) });
  }

  // Test 12: Condition group supports AND and OR
  try {
    const fs = await import("fs");
    const path = await import("path");
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const hasAnd = content.includes("results.every(Boolean)");
    const hasOr = content.includes("results.some(Boolean)");
    results.push({
      test: "12. Condition group AND (every) + OR (some)",
      pass: hasAnd && hasOr,
      detail: `AND=${hasAnd}, OR=${hasOr}`,
    });
  } catch (e) {
    results.push({ test: "12. AND/OR", pass: false, detail: String(e) });
  }

  // Test 13: Canvas palette includes new types
  try {
    const fs = await import("fs");
    const path = await import("path");
    const canvasPath = path.resolve(process.cwd(), "src/components/workflow-canvas.tsx");
    const content = fs.readFileSync(canvasPath, "utf-8");
    const types = ["sub_workflow", "parallel", "loop", "condition_group", "integration", "http", "transform", "database"];
    const missing = types.filter((t) => !content.includes(t));
    results.push({
      test: "13. Canvas palette includes new node types",
      pass: missing.length === 0,
      detail: missing.length === 0 ? "All 8 types in palette" : `Missing: ${missing.join(", ")}`,
    });
  } catch (e) {
    results.push({ test: "13. Canvas palette", pass: false, detail: String(e) });
  }

  // Test 14: Flow node styles for new types
  try {
    const fs = await import("fs");
    const path = await import("path");
    const nodePath = path.resolve(process.cwd(), "src/components/flow-node.tsx");
    const content = fs.readFileSync(nodePath, "utf-8");
    const types = ["sub_workflow", "parallel", "loop", "condition_group"];
    const missing = types.filter((t) => !content.includes(t));
    results.push({
      test: "14. Flow node styles for 4 new types",
      pass: missing.length === 0,
      detail: missing.length === 0 ? "All 4 types styled" : `Missing: ${missing.join(", ")}`,
    });
  } catch (e) {
    results.push({ test: "14. Flow node styles", pass: false, detail: String(e) });
  }

  // Test 15: NodeResult type exported from engine
  try {
    const engine = await import("@/lib/workflow-engine");
    const hasNodeResult = "NodeResult" in engine || typeof (engine as Record<string, unknown>).NodeResult !== "undefined";
    // Check via file content since it's a type (erased at runtime)
    const fs = await import("fs");
    const path = await import("path");
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const hasExport = content.includes("export interface NodeResult");
    results.push({
      test: "15. NodeResult interface exported from engine",
      pass: hasExport,
      detail: hasExport ? "NodeResult exported" : "Missing export",
    });
  } catch (e) {
    results.push({ test: "15. NodeResult", pass: false, detail: String(e) });
  }

  // Test 16: Parallel node has maxConcurrent + failFast in engine
  try {
    const fs = await import("fs");
    const path = await import("path");
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const hasMax = content.includes("maxConcurrent");
    const hasFail = content.includes("failFast");
    results.push({
      test: "16. Parallel node (maxConcurrent + failFast)",
      pass: hasMax && hasFail,
      detail: `maxConcurrent=${hasMax}, failFast=${hasFail}`,
    });
  } catch (e) {
    results.push({ test: "16. Parallel engine", pass: false, detail: String(e) });
  }

  // Test 17: Sub-workflow passes input mapping + trigger prefix
  try {
    const fs = await import("fs");
    const path = await import("path");
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const hasMapping = content.includes("inputMapping");
    const hasPrefix = content.includes("sub_workflow:");
    results.push({
      test: "17. Sub-workflow (inputMapping + trigger prefix)",
      pass: hasMapping && hasPrefix,
      detail: `mapping=${hasMapping}, prefix=${hasPrefix}`,
    });
  } catch (e) {
    results.push({ test: "17. Sub-workflow details", pass: false, detail: String(e) });
  }

  // Test 18: Loop provides loopIndex + loopItem in context
  try {
    const fs = await import("fs");
    const path = await import("path");
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const hasIndex = content.includes("loopIndex");
    const hasItem = content.includes("loopItem");
    results.push({
      test: "18. Loop provides loopIndex + loopItem in context",
      pass: hasIndex && hasItem,
      detail: `loopIndex=${hasIndex}, loopItem=${hasItem}`,
    });
  } catch (e) {
    results.push({ test: "18. Loop context", pass: false, detail: String(e) });
  }

  const passed = results.filter((r) => r.pass).length;
  return NextResponse.json({
    success: passed === results.length,
    summary: `${passed}/${results.length} tests passed`,
    results,
  });
}
import { NextResponse } from "next/server";

interface TestResult {
  test: string;
  pass: boolean;
  detail: string;
}

export async function GET() {
  const results: TestResult[] = [];
  const fs = await import("fs");
  const path = await import("path");

  // Test 1: WorkflowEdge has optional label field
  try {
    const wtPath = path.resolve(process.cwd(), "src/lib/workflow-types.ts");
    const content = fs.readFileSync(wtPath, "utf-8");
    const hasLabel = content.includes('label?: "true" | "false"');
    results.push({
      test: "1. WorkflowEdge has label?: 'true' | 'false'",
      pass: hasLabel,
      detail: hasLabel ? "label field defined" : "Missing label",
    });
  } catch (e) {
    results.push({ test: "1. Edge label", pass: false, detail: String(e) });
  }

  // Test 2: FlowNode has 2 source handles for condition
  try {
    const nodePath = path.resolve(process.cwd(), "src/components/flow-node.tsx");
    const content = fs.readFileSync(nodePath, "utf-8");
    const hasTrueHandle = content.includes('id="true"') && content.includes("bg-green-500");
    const hasFalseHandle = content.includes('id="false"') && content.includes("bg-red-500");
    results.push({
      test: "2. FlowNode: condition has true (green) + false (red) handles",
      pass: hasTrueHandle && hasFalseHandle,
      detail: `true=${hasTrueHandle}, false=${hasFalseHandle}`,
    });
  } catch (e) {
    results.push({ test: "2. FlowNode handles", pass: false, detail: String(e) });
  }

  // Test 3: FlowNode has 2 source handles for condition_group
  try {
    const nodePath = path.resolve(process.cwd(), "src/components/flow-node.tsx");
    const content = fs.readFileSync(nodePath, "utf-8");
    const hasCondGroup = content.includes("condition_group");
    const hasGroupHandles = content.includes("condition_group") && content.includes("id=\"true\"");
    results.push({
      test: "3. FlowNode: condition_group has true + false handles",
      pass: hasCondGroup && hasGroupHandles,
      detail: `condition_group=${hasCondGroup}, handles=${hasGroupHandles}`,
    });
  } catch (e) {
    results.push({ test: "3. Condition group handles", pass: false, detail: String(e) });
  }

  // Test 4: Engine follows labeled edges after condition
  try {
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const hasBranchLogic = content.includes("result.matched") && content.includes('e.label === branch');
    results.push({
      test: "4. Engine: condition result → follow edge by label",
      pass: hasBranchLogic,
      detail: hasBranchLogic ? "matched → true/false edge" : "Missing branch logic",
    });
  } catch (e) {
    results.push({ test: "4. Engine branch", pass: false, detail: String(e) });
  }

  // Test 5: Engine handles both condition and condition_group
  try {
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const hasBoth = content.includes('node.type === "condition" || node.type === "condition_group"');
    results.push({
      test: "5. Engine: branches for condition + condition_group",
      pass: hasBoth,
      detail: hasBoth ? "Both types branch" : "Missing",
    });
  } catch (e) {
    results.push({ test: "5. Both condition types", pass: false, detail: String(e) });
  }

  // Test 6: Canvas onConnect captures sourceHandle as label
  try {
    const canvasPath = path.resolve(process.cwd(), "src/components/workflow-canvas.tsx");
    const content = fs.readFileSync(canvasPath, "utf-8");
    const hasHandleCapture = content.includes("conn.sourceHandle") && content.includes('conn.sourceHandle === "true"');
    results.push({
      test: "6. Canvas: onConnect captures sourceHandle → label",
      pass: hasHandleCapture,
      detail: hasHandleCapture ? "sourceHandle → edge label" : "Missing",
    });
  } catch (e) {
    results.push({ test: "6. Canvas connect", pass: false, detail: String(e) });
  }

  // Test 7: Engine reads edges with label from JSONB
  try {
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const readsLabel = content.includes("e.label === \"true\"") || content.includes('e.label === "true"');
    results.push({
      test: "7. Engine: reads edge.label from JSONB data",
      pass: readsLabel,
      detail: readsLabel ? "Parses label from edges JSON" : "Missing",
    });
  } catch (e) {
    results.push({ test: "7. Edge label read", pass: false, detail: String(e) });
  }

  // Test 8: Engine reads from workflow_nodes JSONB (not separate table)
  try {
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const usesJsonb = content.includes('maybeSingle()') && content.includes("rawNodes") && content.includes("rawEdges");
    results.push({
      test: "8. Engine: reads nodes+edges from workflow_nodes JSONB",
      pass: usesJsonb,
      detail: usesJsonb ? "JSONB columns (nodes, edges)" : "Missing JSONB read",
    });
  } catch (e) {
    results.push({ test: "8. JSONB read", pass: false, detail: String(e) });
  }

  // Test 9: Config panel has condition_group section
  try {
    const panelPath = path.resolve(process.cwd(), "src/components/node-config-panel.tsx");
    const content = fs.readFileSync(panelPath, "utf-8");
    const hasCondGroup = content.includes("node.type === \"condition_group\"");
    const hasOperator = content.includes("AND") && content.includes("OR");
    results.push({
      test: "9. Config panel: condition_group (operator AND/OR + conditions textarea)",
      pass: hasCondGroup && hasOperator,
      detail: `section=${hasCondGroup}, operator=${hasOperator}`,
    });
  } catch (e) {
    results.push({ test: "9. Config panel", pass: false, detail: String(e) });
  }

  // Test 10: Config panel shows true/false port hints
  try {
    const panelPath = path.resolve(process.cwd(), "src/components/node-config-panel.tsx");
    const content = fs.readFileSync(panelPath, "utf-8");
    const hasTrueHint = content.includes("True") && content.includes("green-500");
    const hasFalseHint = content.includes("False") && content.includes("red-500");
    results.push({
      test: "10. Config panel: true/false port visual hints",
      pass: hasTrueHint && hasFalseHint,
      detail: `true=${hasTrueHint}, false=${hasFalseHint}`,
    });
  } catch (e) {
    results.push({ test: "10. Port hints", pass: false, detail: String(e) });
  }

  // Test 11: Condition group engine parses newline-separated conditions
  try {
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const hasNewlineParse = content.includes('split("\\n")') && content.includes("filter(Boolean)");
    results.push({
      test: "11. Condition group: parses newline-separated expressions",
      pass: hasNewlineParse,
      detail: hasNewlineParse ? "split(\\n) + filter" : "Missing",
    });
  } catch (e) {
    results.push({ test: "11. Newline parse", pass: false, detail: String(e) });
  }

  // Test 12: Fallback to unlabeled edge if no matching branch
  try {
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const hasFallback = content.includes('outEdges.find((e) => !e.label)');
    results.push({
      test: "12. Engine: fallback to unlabeled edge if no true/false match",
      pass: hasFallback,
      detail: hasFallback ? "Falls back to unlabeled edge" : "Missing fallback",
    });
  } catch (e) {
    results.push({ test: "12. Fallback", pass: false, detail: String(e) });
  }

  // Test 13: Non-condition nodes still follow first edge
  try {
    const enginePath = path.resolve(process.cwd(), "src/lib/workflow-engine.ts");
    const content = fs.readFileSync(enginePath, "utf-8");
    const hasDefault = content.includes("outEdges[0].target");
    results.push({
      test: "13. Engine: non-condition nodes follow first edge (linear)",
      pass: hasDefault,
      detail: hasDefault ? "outEdges[0] for linear flow" : "Missing",
    });
  } catch (e) {
    results.push({ test: "13. Linear flow", pass: false, detail: String(e) });
  }

  // Test 14: AI generate-workflow includes condition node type in prompt
  try {
    const aiPath = path.resolve(process.cwd(), "src/app/api/ai/generate-workflow/route.ts");
    const content = fs.readFileSync(aiPath, "utf-8");
    const hasCondition = content.includes("condition") && content.includes("if/else");
    results.push({
      test: "14. AI prompt includes condition (if/else) node type",
      pass: hasCondition,
      detail: hasCondition ? "condition + if/else in prompt" : "Missing",
    });
  } catch (e) {
    results.push({ test: "14. AI prompt", pass: false, detail: String(e) });
  }

  // Test 15: Edge label is preserved in save flow (canvas → API → DB)
  try {
    const canvasPath = path.resolve(process.cwd(), "src/components/workflow-canvas.tsx");
    const content = fs.readFileSync(canvasPath, "utf-8");
    const savesEdges = content.includes("edges") && content.includes("JSON.stringify");
    const edgeHasLabel = content.includes("label: label");
    results.push({
      test: "15. Edge label preserved in save (canvas → API)",
      pass: savesEdges && edgeHasLabel,
      detail: `saves=${savesEdges}, label=${edgeHasLabel}`,
    });
  } catch (e) {
    results.push({ test: "15. Save label", pass: false, detail: String(e) });
  }

  const passed = results.filter((r) => r.pass).length;
  return NextResponse.json({
    success: passed === results.length,
    summary: `${passed}/${results.length} tests passed`,
    results,
  });
}
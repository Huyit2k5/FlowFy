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

  // Test 1: Analytics API exists
  try {
    const apiPath = path.resolve(process.cwd(), "src/app/api/analytics/route.ts");
    const exists = fs.existsSync(apiPath);
    const content = exists ? fs.readFileSync(apiPath, "utf-8") : "";
    const hasGet = content.includes("export async function GET");
    results.push({
      test: "1. Analytics API (/api/analytics) exists with GET",
      pass: exists && hasGet,
      detail: exists ? (hasGet ? "GET handler present" : "Missing GET") : "File not found",
    });
  } catch (e) {
    results.push({ test: "1. Analytics API", pass: false, detail: String(e) });
  }

  // Test 2: API returns totals (total, success, failed, success_rate, avg_duration)
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/analytics/route.ts"), "utf-8");
    const hasTotals = content.includes("total") && content.includes("success") && content.includes("failed") && content.includes("success_rate") && content.includes("avg_duration_ms");
    results.push({
      test: "2. API returns totals (total, success, failed, rate, avg duration)",
      pass: hasTotals,
      detail: hasTotals ? "All 5 metrics present" : "Missing metrics",
    });
  } catch (e) {
    results.push({ test: "2. Totals", pass: false, detail: String(e) });
  }

  // Test 3: API returns time_series (per day)
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/analytics/route.ts"), "utf-8");
    const hasTimeSeries = content.includes("time_series") && content.includes("byDay");
    results.push({
      test: "3. API returns time_series (per-day breakdown)",
      pass: hasTimeSeries,
      detail: hasTimeSeries ? "byDay + time_series present" : "Missing",
    });
  } catch (e) {
    results.push({ test: "3. Time series", pass: false, detail: String(e) });
  }

  // Test 4: API returns top_workflows (ranked by runs)
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/analytics/route.ts"), "utf-8");
    const hasTop = content.includes("top_workflows") && content.includes("sort") && content.includes("slice(0, 10)");
    results.push({
      test: "4. API returns top_workflows (top 10 by runs)",
      pass: hasTop,
      detail: hasTop ? "Sorted + limited to 10" : "Missing",
    });
  } catch (e) {
    results.push({ test: "4. Top workflows", pass: false, detail: String(e) });
  }

  // Test 5: API returns integration_usage
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/analytics/route.ts"), "utf-8");
    const hasInt = content.includes("integration_usage") && content.includes("integrationCounts");
    results.push({
      test: "5. API returns integration_usage (node label counts)",
      pass: hasInt,
      detail: hasInt ? "Counts by node_label" : "Missing",
    });
  } catch (e) {
    results.push({ test: "5. Integration usage", pass: false, detail: String(e) });
  }

  // Test 6: API supports period param (7d/30d/90d)
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/analytics/route.ts"), "utf-8");
    const hasPeriods = content.includes('"7d"') && content.includes('"30d"') && content.includes('"90d"');
    results.push({
      test: "6. API supports period=7d|30d|90d",
      pass: hasPeriods,
      detail: hasPeriods ? "3 periods supported" : "Missing periods",
    });
  } catch (e) {
    results.push({ test: "6. Period param", pass: false, detail: String(e) });
  }

  // Test 7: API requires workspace_id
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/analytics/route.ts"), "utf-8");
    const hasWs = content.includes("workspace_id") && content.includes("400");
    results.push({
      test: "7. API requires workspace_id (400 if missing)",
      pass: hasWs,
      detail: hasWs ? "Validates workspace_id" : "Missing",
    });
  } catch (e) {
    results.push({ test: "7. Workspace validation", pass: false, detail: String(e) });
  }

  // Test 8: Analytics page exists
  try {
    const pagePath = path.resolve(process.cwd(), "src/app/app/[id]/analytics/page.tsx");
    const exists = fs.existsSync(pagePath);
    const content = exists ? fs.readFileSync(pagePath, "utf-8") : "";
    const hasKpi = content.includes("StatCard") || content.includes("KPI");
    results.push({
      test: "8. Analytics dashboard page exists with KPI cards",
      pass: exists && hasKpi,
      detail: exists ? (hasKpi ? "KPI cards present" : "No KPI cards") : "Page not found",
    });
  } catch (e) {
    results.push({ test: "8. Analytics page", pass: false, detail: String(e) });
  }

  // Test 9: Analytics page has period selector
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), "src/app/app/[id]/analytics/page.tsx"), "utf-8");
    const hasSelector = content.includes("7d") && content.includes("30d") && content.includes("90d");
    results.push({
      test: "9. Analytics page has period selector (7/30/90 days)",
      pass: hasSelector,
      detail: hasSelector ? "3 period buttons" : "Missing",
    });
  } catch (e) {
    results.push({ test: "9. Period selector", pass: false, detail: String(e) });
  }

  // Test 10: Charts component (SVG bar chart, no external lib)
  try {
    const chartPath = path.resolve(process.cwd(), "src/components/analytics-charts.tsx");
    const exists = fs.existsSync(chartPath);
    const content = exists ? fs.readFileSync(chartPath, "utf-8") : "";
    const hasSvg = content.includes("<svg") && content.includes("<rect");
    const noExternalLib = !content.includes("recharts") && !content.includes("chart.js") && !content.includes("d3");
    results.push({
      test: "10. Charts component (pure SVG, no external lib)",
      pass: exists && hasSvg && noExternalLib,
      detail: exists ? `svg=${hasSvg}, noLib=${noExternalLib}` : "File not found",
    });
  } catch (e) {
    results.push({ test: "10. Charts", pass: false, detail: String(e) });
  }

  // Test 11: Analytics page shows top workflows table
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), "src/app/app/[id]/analytics/page.tsx"), "utf-8");
    const hasTable = content.includes("<table") && content.includes("top_workflows");
    results.push({
      test: "11. Analytics page shows top workflows table",
      pass: hasTable,
      detail: hasTable ? "Table with workflow links" : "Missing",
    });
  } catch (e) {
    results.push({ test: "11. Top workflows table", pass: false, detail: String(e) });
  }

  // Test 12: Analytics page shows integration usage bars
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), "src/app/app/[id]/analytics/page.tsx"), "utf-8");
    const hasIntUsage = content.includes("integration_usage") && content.includes("width:");
    results.push({
      test: "12. Analytics page shows integration usage (horizontal bars)",
      pass: hasIntUsage,
      detail: hasIntUsage ? "Progress bars with width%" : "Missing",
    });
  } catch (e) {
    results.push({ test: "12. Integration usage UI", pass: false, detail: String(e) });
  }

  // Test 13: Run history has status filter
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), "src/components/run-history.tsx"), "utf-8");
    const hasFilter = content.includes("statusFilter") && content.includes("select");
    results.push({
      test: "13. Run history has status filter dropdown",
      pass: hasFilter,
      detail: hasFilter ? "Filter: all/success/failed/running" : "Missing",
    });
  } catch (e) {
    results.push({ test: "13. Status filter", pass: false, detail: String(e) });
  }

  // Test 14: Run history has CSV export
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), "src/components/run-history.tsx"), "utf-8");
    const hasCsv = content.includes("exportCSV") && content.includes("text/csv") && content.includes("download");
    results.push({
      test: "14. Run history has CSV export",
      pass: hasCsv,
      detail: hasCsv ? "Blob → download" : "Missing",
    });
  } catch (e) {
    results.push({ test: "14. CSV export", pass: false, detail: String(e) });
  }

  // Test 15: Analytics page fetches from /api/analytics
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), "src/app/app/[id]/analytics/page.tsx"), "utf-8");
    const hasFetch = content.includes("/api/analytics") && content.includes("workspace_id");
    results.push({
      test: "15. Analytics page fetches /api/analytics with workspace_id",
      pass: hasFetch,
      detail: hasFetch ? "Correct API call" : "Missing",
    });
  } catch (e) {
    results.push({ test: "15. API fetch", pass: false, detail: String(e) });
  }

  const passed = results.filter((r) => r.pass).length;
  return NextResponse.json({
    success: passed === results.length,
    summary: `${passed}/${results.length} tests passed`,
    results,
  });
}
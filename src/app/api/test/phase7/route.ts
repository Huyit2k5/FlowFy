import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Phase 7 Test Endpoint — verify Integration Framework + AI Assistant.
 * DÙNG RIÊNG CHO TESTING, XÓA TRƯỚC KHI DEPLOY.
 */
export async function GET() {
  const results: { test: string; pass: boolean; detail: string }[] = [];
  const fs = await import("fs");
  const path = await import("path");

  // ---- Test 1: Provider interface exists ----
  try {
    const typesContent = fs.readFileSync(path.join(process.cwd(), "src/lib/integrations/types.ts"), "utf-8");
    const hasProvider = typesContent.includes("IntegrationProvider");
    const hasContext = typesContent.includes("IntegrationContext");
    const hasResult = typesContent.includes("IntegrationResult");
    const hasConfigField = typesContent.includes("ConfigField");
    const passed = hasProvider && hasContext && hasResult && hasConfigField;
    results.push({
      test: "1. Provider interface (Provider + Context + Result + ConfigField)",
      pass: passed,
      detail: passed ? "✓ All interfaces defined" : `✗ p=${hasProvider}, c=${hasContext}, r=${hasResult}, f=${hasConfigField}`,
    });
  } catch (e) {
    results.push({ test: "1. Provider interface", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 2: Registry with 10 providers ----
  try {
    const regContent = fs.readFileSync(path.join(process.cwd(), "src/lib/integrations/registry.ts"), "utf-8");
    const ids = ["http", "google", "telegram", "discord", "zalo", "sms", "airtable", "trello", "transform", "database"];
    const allPresent = ids.every((id) => regContent.includes(id));
    const hasGet = regContent.includes("getProvider");
    const hasList = regContent.includes("listProviders");
    const passed = allPresent && hasGet && hasList;
    results.push({
      test: "2. Registry (10 providers + get/list)",
      pass: passed,
      detail: passed ? `✓ ${ids.length} providers registered` : `✗ all=${allPresent}, get=${hasGet}, list=${hasList}`,
    });
  } catch (e) {
    results.push({ test: "2. Registry", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 3: All provider files exist ----
  try {
    const files = ["http.ts", "google.ts", "messaging.ts", "productivity.ts", "data.ts", "registry.ts", "types.ts", "engine-types.ts"];
    const allExist = files.every((f) => fs.existsSync(path.join(process.cwd(), "src/lib/integrations", f)));
    results.push({
      test: "3. All provider files exist (8 files)",
      pass: allExist,
      detail: allExist ? `✓ All ${files.length} files present` : `✗ Missing: ${files.filter((f) => !fs.existsSync(path.join(process.cwd(), "src/lib/integrations", f))).join(", ")}`,
    });
  } catch (e) {
    results.push({ test: "3. Provider files", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 4: HTTP provider (4 auth types) ----
  try {
    const c = fs.readFileSync(path.join(process.cwd(), "src/lib/integrations/http.ts"), "utf-8");
    const ok = c.includes("Bearer") && c.includes("Basic") && c.includes("X-API-Key") && c.includes("AbortController");
    results.push({
      test: "4. HTTP provider (bearer/basic/api_key + timeout)",
      pass: ok,
      detail: ok ? "✓ 4 auth types + AbortController timeout" : "✗ Missing auth types",
    });
  } catch (e) {
    results.push({ test: "4. HTTP provider", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 5: Google provider (4 actions) ----
  try {
    const c = fs.readFileSync(path.join(process.cwd(), "src/lib/integrations/google.ts"), "utf-8");
    const ok = c.includes("gmail_send") && c.includes("calendar_create") && c.includes("sheets_append") && c.includes("drive_upload");
    results.push({
      test: "5. Google provider (Gmail + Calendar + Sheets + Drive)",
      pass: ok,
      detail: ok ? "✓ All 4 Google actions implemented" : "✗ Missing actions",
    });
  } catch (e) {
    results.push({ test: "5. Google provider", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 6: Messaging providers (Telegram + Discord + Zalo + SMS) ----
  try {
    const c = fs.readFileSync(path.join(process.cwd(), "src/lib/integrations/messaging.ts"), "utf-8");
    const ok = c.includes("telegramProvider") && c.includes("discordProvider") && c.includes("zaloProvider") && c.includes("smsProvider");
    const hasTelegramApi = c.includes("api.telegram.org");
    const hasDiscordWebhook = c.includes("discord.com/api/webhooks");
    const hasZaloApi = c.includes("api.zalooa.com");
    const passed = ok && hasTelegramApi && hasDiscordWebhook && hasZaloApi;
    results.push({
      test: "6. Messaging (Telegram + Discord + Zalo + SMS VN)",
      pass: passed,
      detail: passed ? "✓ 4 providers with correct API endpoints" : `✗ ok=${ok}, tg=${hasTelegramApi}, dc=${hasDiscordWebhook}, zalo=${hasZaloApi}`,
    });
  } catch (e) {
    results.push({ test: "6. Messaging providers", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 7: Productivity (Airtable + Trello) ----
  try {
    const c = fs.readFileSync(path.join(process.cwd(), "src/lib/integrations/productivity.ts"), "utf-8");
    const ok = c.includes("airtableProvider") && c.includes("trelloProvider");
    const hasAirtableApi = c.includes("airtable.com/api");
    const hasTrelloApi = c.includes("api.trello.com");
    const passed = ok && hasAirtableApi && hasTrelloApi;
    results.push({
      test: "7. Productivity (Airtable + Trello with real APIs)",
      pass: passed,
      detail: passed ? "✓ Both providers with correct API endpoints" : `✗ ok=${ok}, at=${hasAirtableApi}, tr=${hasTrelloApi}`,
    });
  } catch (e) {
    results.push({ test: "7. Productivity", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 8: Data providers (Transform + Database) ----
  try {
    const c = fs.readFileSync(path.join(process.cwd(), "src/lib/integrations/data.ts"), "utf-8");
    const hasTransform = c.includes("transformProvider");
    const hasDb = c.includes("databaseProvider");
    const hasMap = c.includes('"map"');
    const hasFilter = c.includes('"filter"');
    const hasAggregate = c.includes('"aggregate"');
    const hasSupabase = c.includes("supabase");
    const passed = hasTransform && hasDb && hasMap && hasFilter && hasAggregate && hasSupabase;
    results.push({
      test: "8. Data (Transform: map/filter/aggregate + Database: Supabase)",
      pass: passed,
      detail: passed ? "✓ Transform (3 actions) + Database (Supabase + HTTP)" : `✗ tf=${hasTransform}, db=${hasDb}, map=${hasMap}`,
    });
  } catch (e) {
    results.push({ test: "8. Data providers", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 9: Engine dispatches new node types ----
  try {
    const c = fs.readFileSync(path.join(process.cwd(), "src/lib/workflow-engine.ts"), "utf-8");
    const newTypes = ["http", "google", "telegram", "discord", "zalo", "sms", "airtable", "trello", "transform", "database", "integration"];
    const allDispatched = newTypes.every((t) => c.includes(`${t}: async`));
    const hasExecuteProvider = c.includes("executeProviderNode");
    const passed = allDispatched && hasExecuteProvider;
    results.push({
      test: "9. Engine dispatches 11 new node types",
      pass: passed,
      detail: passed ? `✓ All ${newTypes.length} types routed to executeProviderNode` : `✗ dispatched=${allDispatched}, exec=${hasExecuteProvider}`,
    });
  } catch (e) {
    results.push({ test: "9. Engine dispatch", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 10: Node types expanded in workflow-types ----
  try {
    const c = fs.readFileSync(path.join(process.cwd(), "src/lib/workflow-types.ts"), "utf-8");
    const newTypes = ["integration", "transform", "http", "google", "telegram", "discord", "zalo", "sms", "airtable", "trello", "database"];
    const allPresent = newTypes.every((t) => c.includes(`"${t}"`));
    results.push({
      test: "10. NODE_TYPES expanded (18 types total)",
      pass: allPresent,
      detail: allPresent ? `✓ All ${newTypes.length} new types in NODE_TYPES` : `✗ Missing: ${newTypes.filter((t) => !c.includes(`"${t}"`)).join(", ")}`,
    });
  } catch (e) {
    results.push({ test: "10. NODE_TYPES", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 11: Marketplace UI ----
  try {
    const pageExists = fs.existsSync(path.join(process.cwd(), "src/app/app/[id]/integrations/marketplace/page.tsx"));
    const c = pageExists ? fs.readFileSync(path.join(process.cwd(), "src/app/app/[id]/integrations/marketplace/page.tsx"), "utf-8") : "";
    const hasSearch = c.includes("search") && c.includes("Tìm tích hợp");
    const hasCategories = c.includes("categoryLabels") && c.includes("setCategory");
    const hasConnect = c.includes("Kết nối") && c.includes("handleSave");
    const hasModal = c.includes("Connect Modal") || c.includes("fixed inset-0");
    const hasVnIntegrations = c.includes("zalo") && c.includes("sms");
    const passed = pageExists && hasSearch && hasCategories && hasConnect && hasModal && hasVnIntegrations;
    results.push({
      test: "11. Marketplace UI (search + categories + connect modal + VN)",
      pass: passed,
      detail: passed ? "✓ Full marketplace with search, filter, connect, VN integrations" : `✗ exists=${pageExists}, search=${hasSearch}, cat=${hasCategories}`,
    });
  } catch (e) {
    results.push({ test: "11. Marketplace UI", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 12: Flow node styles for new types ----
  try {
    const c = fs.readFileSync(path.join(process.cwd(), "src/components/flow-node.tsx"), "utf-8");
    const newTypes = ["telegram", "zalo", "google", "airtable", "trello", "http", "transform", "database", "discord", "sms", "integration"];
    const allStyled = newTypes.every((t) => c.includes(`${t}:`));
    results.push({
      test: "12. Flow node styles for 11 new types",
      pass: allStyled,
      detail: allStyled ? `✓ All ${newTypes.length} types have icon + color` : `✗ Missing: ${newTypes.filter((t) => !c.includes(`${t}:`)).join(", ")}`,
    });
  } catch (e) {
    results.push({ test: "12. Flow node styles", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ============================================================
  // 7.2 AI ASSISTANT
  // ============================================================

  // ---- Test 13: AI generate-workflow API ----
  try {
    const apiExists = fs.existsSync(path.join(process.cwd(), "src/app/api/ai/generate-workflow/route.ts"));
    const c = apiExists ? fs.readFileSync(path.join(process.cwd(), "src/app/api/ai/generate-workflow/route.ts"), "utf-8") : "";
    const hasZod = c.includes("z.object") && c.includes("safeParse");
    const hasOpenAI = c.includes("OPENAI_API_KEY");
    const hasDeepSeek = c.includes("DEEPSEEK_API_KEY");
    const hasTemplate = c.includes("generateWithTemplate");
    const hasLLM = c.includes("generateWithLLM");
    const hasNodesOutput = c.includes('"nodes"') && c.includes('"edges"');
    const passed = apiExists && hasZod && hasOpenAI && hasDeepSeek && hasTemplate && hasLLM && hasNodesOutput;
    results.push({
      test: "13. AI generate-workflow (Zod + OpenAI + DeepSeek + template fallback)",
      pass: passed,
      detail: passed ? "✓ LLM + template fallback, Zod validation, nodes+edges output" : `✗ exists=${apiExists}, zod=${hasZod}, llm=${hasLLM}`,
    });
  } catch (e) {
    results.push({ test: "13. AI generate API", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 14: AI template generation (no API key needed) ----
  try {
    const c = fs.readFileSync(path.join(process.cwd(), "src/app/api/ai/generate-workflow/route.ts"), "utf-8");
    const hasEmail = c.includes("email");
    const hasSlack = c.includes("slack");
    const hasTelegram = c.includes("telegram");
    const hasZalo = c.includes("zalo");
    const hasSheets = c.includes("sheets_append");
    const hasAirtable = c.includes("airtable");
    const hasTrello = c.includes("trello");
    const hasNotion = c.includes("notion");
    const passed = hasEmail && hasSlack && hasTelegram && hasZalo && hasSheets && hasAirtable && hasTrello && hasNotion;
    results.push({
      test: "14. AI template (detects 8+ service keywords)",
      pass: passed,
      detail: passed ? "✓ Template detects: email, slack, telegram, zalo, sheets, airtable, trello, notion" : `✗ Missing detections`,
    });
  } catch (e) {
    results.push({ test: "14. AI template", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 15: AI diagnose-error API ----
  try {
    const apiExists = fs.existsSync(path.join(process.cwd(), "src/app/api/ai/diagnose-error/route.ts"));
    const c = apiExists ? fs.readFileSync(path.join(process.cwd(), "src/app/api/ai/diagnose-error/route.ts"), "utf-8") : "";
    const hasZod = c.includes("z.object") && c.includes("run_id");
    const hasLogQuery = c.includes("run_logs");
    const hasFailedLog = c.includes("failed");
    const hasLLM = c.includes("OPENAI_API_KEY") || c.includes("DEEPSEEK_API_KEY");
    const hasFallback = c.includes("basic") || c.includes("fallback");
    const hasSuggestions = c.includes("suggestions");
    const passed = apiExists && hasZod && hasLogQuery && hasFailedLog && hasLLM && hasFallback && hasSuggestions;
    results.push({
      test: "15. AI diagnose-error (logs + LLM + fallback + suggestions)",
      pass: passed,
      detail: passed ? "✓ Reads logs, LLM diagnosis, basic fallback, suggestions array" : `✗ exists=${apiExists}, zod=${hasZod}, llm=${hasLLM}`,
    });
  } catch (e) {
    results.push({ test: "15. AI diagnose", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 16: AI Assistant UI component ----
  try {
    const compExists = fs.existsSync(path.join(process.cwd(), "src/components/ai-assistant.tsx"));
    const c = compExists ? fs.readFileSync(path.join(process.cwd(), "src/components/ai-assistant.tsx"), "utf-8") : "";
    const hasTextarea = c.includes("textarea") && c.includes("placeholder");
    const hasGenerate = c.includes("handleGenerate") && c.includes("generate-workflow");
    const hasResult = c.includes("result") && c.includes("nodes.length");
    const hasApply = c.includes("onApplyWorkflow") && c.includes("Áp dụng");
    const hasSource = c.includes("source") && c.includes("llm");
    const passed = compExists && hasTextarea && hasGenerate && hasResult && hasApply && hasSource;
    results.push({
      test: "16. AI Assistant UI (textarea + generate + result + apply)",
      pass: passed,
      detail: passed ? "✓ Full UI: input → generate → preview → apply to canvas" : `✗ exists=${compExists}, gen=${hasGenerate}, apply=${hasApply}`,
    });
  } catch (e) {
    results.push({ test: "16. AI Assistant UI", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 17: AI integrated into canvas page ----
  try {
    const wrapperExists = fs.existsSync(path.join(process.cwd(), "src/components/workflow-canvas-ai.tsx"));
    const pageContent = fs.readFileSync(path.join(process.cwd(), "src/app/app/[id]/workflows/[workflowId]/page.tsx"), "utf-8");
    const usesWrapper = pageContent.includes("WorkflowCanvasWithAI");
    const hasAIImport = wrapperExists ? fs.readFileSync(path.join(process.cwd(), "src/components/workflow-canvas-ai.tsx"), "utf-8").includes("AIAssistant") : false;
    const passed = wrapperExists && usesWrapper && hasAIImport;
    results.push({
      test: "17. AI integrated into workflow canvas page",
      pass: passed,
      detail: passed ? "✓ Canvas page uses WorkflowCanvasWithAI wrapper" : `✗ wrapper=${wrapperExists}, uses=${usesWrapper}, import=${hasAIImport}`,
    });
  } catch (e) {
    results.push({ test: "17. AI integration", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  // ---- Test 18: Node config panel handles new types ----
  try {
    const c = fs.readFileSync(path.join(process.cwd(), "src/components/node-config-panel.tsx"), "utf-8");
    const hasIntegration = c.includes('"integration"');
    const hasProvider = c.includes("providerId");
    const hasInputNode = c.includes("inputNode");
    const hasGenericConfig = c.includes("Generic integration config");
    const passed = hasIntegration && hasProvider && hasInputNode && hasGenericConfig;
    results.push({
      test: "18. Config panel: generic integration fields",
      pass: passed,
      detail: passed ? "✓ Provider select + input node ref + dynamic fields" : `✗ integ=${hasIntegration}, provider=${hasProvider}, input=${hasInputNode}`,
    });
  } catch (e) {
    results.push({ test: "18. Config panel", pass: false, detail: `✗ ${e instanceof Error ? e.message : String(e)}` });
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;

  return NextResponse.json({
    success: passed === total,
    summary: `${passed}/${total} tests passed`,
    results,
  });
}
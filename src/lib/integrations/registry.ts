import type { IntegrationProvider, IntegrationCategory } from "./types";
import { httpProvider } from "./http";
import { googleProvider } from "./google";
import { telegramProvider, discordProvider, zaloProvider, smsProvider } from "./messaging";
import { airtableProvider, trelloProvider } from "./productivity";
import { transformProvider, databaseProvider } from "./data";

// Legacy providers (Phase 2-4)
import type { WorkflowNode } from "@/lib/workflow-types";
import type { NodeResult } from "@/lib/workflow-engine";
import type { Ctx } from "./engine-types";

export const providers: IntegrationProvider[] = [
  httpProvider,
  googleProvider,
  telegramProvider,
  discordProvider,
  zaloProvider,
  smsProvider,
  airtableProvider,
  trelloProvider,
  transformProvider,
  databaseProvider,
];

export function getProvider(id: string): IntegrationProvider | undefined {
  return providers.find((p) => p.id === id);
}

export function listProviders(category?: IntegrationCategory): IntegrationProvider[] {
  if (!category) return providers;
  return providers.filter((p) => p.category === category);
}

export const categories: { id: IntegrationCategory; label: string; icon: string }[] = [
  { id: "communication", label: "Giao tiếp", icon: "💬" },
  { id: "productivity", label: "Sản xuất", icon: "📋" },
  { id: "development", label: "Phát triển", icon: "🔧" },
  { id: "data", label: "Dữ liệu", icon: "📊" },
  { id: "vnm", label: "Việt Nam", icon: "🇻🇳" },
  { id: "utility", label: "Công cụ", icon: "🛠️" },
];

/**
 * Execute an integration provider node in the workflow engine.
 * Bridges the provider interface to the engine's NodeResult format.
 */
export async function executeProviderNode(
  node: WorkflowNode,
  ctx: Ctx,
  workspaceConfig: Record<string, Record<string, string>>
): Promise<NodeResult> {
  const providerId = node.data.providerId as string;
  const provider = getProvider(providerId);

  if (!provider) {
    return { status: "failed", output: null, error: `Không tìm thấy integration: ${providerId}` };
  }

  const config = node.data.config as Record<string, string> ?? node.data;

  const result = await provider.execute({
    config,
    workspaceConfig,
    input: ctx.data[node.data.inputNode as string],
    runId: "",
    workspaceId: "",
  });

  return {
    status: result.success ? "success" : "failed",
    output: result.data,
    error: result.error,
  };
}
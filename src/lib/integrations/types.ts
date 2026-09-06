/**
 * Integration Provider Interface (Phase 7.1)
 * Each integration implements this interface to plug into the workflow engine.
 */

export interface IntegrationContext {
  // Template-interpolated config (already resolved {{nodeId.field}})
  config: Record<string, string>;
  // Workspace-level integration config (fallback)
  workspaceConfig?: Record<string, Record<string, string>>;
  // Input data from previous node
  input?: unknown;
  // Workflow run context
  runId: string;
  workspaceId: string;
}

export interface IntegrationResult {
  success: boolean;
  data?: unknown;
  error?: string;
  // Whether this error is retryable (network, timeout)
  retryable?: boolean;
}

export interface IntegrationProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: IntegrationCategory;
  // Config fields (for UI form generation)
  configSchema: ConfigField[];
  // Auth type
  authType: "none" | "api_key" | "bearer" | "basic" | "oauth2" | "webhook_url";
  // Execute the integration
  execute(ctx: IntegrationContext): Promise<IntegrationResult>;
  // Optional: validate config before saving
  validate?(config: Record<string, string>): string | null;
}

export type IntegrationCategory =
  | "communication"
  | "productivity"
  | "development"
  | "data"
  | "vnm" // Vietnam-specific
  | "utility";

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "select" | "number" | "textarea" | "boolean";
  placeholder?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  default?: string;
  help?: string;
}
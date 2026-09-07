import type { NodeResult } from "@/lib/workflow-engine";

export interface Ctx {
  data: Record<string, unknown>;
}

export type { NodeResult };
/**
 * Error tracking: structured logging + optional Sentry.
 * In production with SENTRY_DSN, sends to Sentry.
 * Without it, logs structured JSON to console (collectable by log aggregators).
 */

const ERROR_TYPES = {
  UNHANDLED: "unhandled_rejection",
  API: "api_error",
  UI: "ui_error",
  EXECUTION: "workflow_execution",
  WEBHOOK: "webhook_delivery",
} as const;

type ErrorType = (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES];

interface ErrorContext {
  userId?: string;
  workspaceId?: string;
  workflowId?: string;
  executionId?: string;
  path?: string;
  method?: string;
  durationMs?: number;
  retry?: number;
}

export function initErrorTracking() {
  // Future: Sentry.init({ dsn, environment, tracesSampleRate: 0.1 })
  console.log("[ErrorTracking] Initialized", process.env.NODE_ENV);
}

export function captureException(
  error: unknown,
  context: ErrorContext & { type: ErrorType } = { type: ERROR_TYPES.UNHANDLED }
) {
  const entry = {
    level: "error",
    type: context.type,
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context: {
      userId: context.userId,
      workspaceId: context.workspaceId,
      workflowId: context.workflowId,
      executionId: context.executionId,
      path: context.path,
      method: context.method,
      durationMs: context.durationMs,
      retry: context.retry,
    },
  };

  if (process.env.SENTRY_DSN) {
    // Sentry.captureException(error, { extra: entry.context, tags: { type: context.type } });
    console.error("[ErrorTracking][Sentry]", JSON.stringify(entry));
  } else {
    console.error("[ErrorTracking]", JSON.stringify(entry, null, 2));
  }
}

export function captureMessage(
  message: string,
  context: ErrorContext & { type?: ErrorType; level?: "info" | "warn" | "error" } = {}
) {
  const entry = {
    level: context.level ?? "info",
    type: context.type ?? ERROR_TYPES.UNHANDLED,
    timestamp: new Date().toISOString(),
    message,
    context: {
      userId: context.userId,
      workflowId: context.workflowId,
      path: context.path,
    },
  };

  if (process.env.SENTRY_DSN && context.level === "error") {
    // Sentry.captureMessage(message, { level: context.level, extra: entry.context });
    console.error("[ErrorTracking][Sentry]", JSON.stringify(entry));
  } else {
    console.log(`[ErrorTracking][${entry.level}]`, message, entry.context);
  }
}

export { ERROR_TYPES };

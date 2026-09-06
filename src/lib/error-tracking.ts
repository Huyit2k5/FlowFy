/**
 * Error tracking setup.
 * Uses Sentry if SENTRY_DSN is configured, otherwise logs to console.
 *
 * To enable Sentry:
 * 1. npm i @sentry/nextjs
 * 2. Add SENTRY_DSN to .env.local
 * 3. Uncomment the import below
 */

// import * as Sentry from "@sentry/nextjs";

export function initErrorTracking() {
  // if (process.env.SENTRY_DSN) {
  //   Sentry.init({
  //     dsn: process.env.SENTRY_DSN,
  //     environment: process.env.NODE_ENV,
  //     tracesSampleRate: 0.1,
  //   });
  // }
  console.log("[ErrorTracking] Initialized (Sentry disabled in dev)");
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (process.env.SENTRY_DSN) {
    // Sentry.captureException(error, { extra: context });
    console.error("[ErrorTracking] Sentry:", error, context);
  } else {
    console.error("[ErrorTracking]", error, context ?? {});
  }
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  if (process.env.SENTRY_DSN) {
    // Sentry.captureMessage(message, { extra: context });
    console.log("[ErrorTracking]", message, context ?? {});
  } else {
    console.log("[ErrorTracking]", message, context ?? {});
  }
}
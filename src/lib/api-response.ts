import { NextResponse } from "next/server";

interface ApiErrorOptions {
  status?: number;
  code?: string;
  detail?: string;
}

export function apiError(message: string, opts: ApiErrorOptions = {}) {
  const { status = 500, code, detail } = opts;
  console.error(`[API Error] ${status} ${code ?? ""} — ${message}`, detail ? { detail } : "");
  return NextResponse.json(
    { success: false, error: message, code, detail },
    { status }
  );
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function wrapHandler(
  handler: (req: Request) => Promise<NextResponse>
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Internal server error";
      const isZod = err && typeof err === "object" && "issues" in err;
      if (isZod) {
        return apiError("Validation failed", { status: 400, code: "VALIDATION", detail: JSON.stringify((err as { issues: unknown[] }).issues) });
      }
      const isAbort = err instanceof Error && err.name === "AbortError";
      if (isAbort) {
        return apiError("Request timed out", { status: 408, code: "TIMEOUT" });
      }
      return apiError(msg, { status: 500, code: "INTERNAL" });
    }
  };
}

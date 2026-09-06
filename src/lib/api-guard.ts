import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limiter";
import { z } from "zod";

/**
 * Guard for API route handlers.
 * - Rate limiting
 * - Optional Zod validation
 * - Security headers on response
 */

export function withSecurity(
  handler: (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    // Rate limit
    const rl = rateLimit(request);
    if (!rl.ok) {
      const res = NextResponse.json(
        { error: "Quá nhiều yêu cầu. Thử lại sau." },
        { status: 429 }
      );
      res.headers.set("Retry-After", String(rl.retryAfter ?? 60));
      return res;
    }

    const response = await handler(request, context);

    // Add security headers
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    return response;
  };
}

/**
 * Validate JSON body with Zod schema.
 * Returns { data, error } — if error, return 400 response.
 */
export function validateBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): { data: T } | { error: NextResponse } {
  let body: unknown;
  try {
    body = JSON.parse(request.body as unknown as string);
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 }
      ),
    };
  }

  return { data: result.data };
}
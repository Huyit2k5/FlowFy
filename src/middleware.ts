import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { apiLimiter, authLimiter } from "@/lib/rate-limiter";

const AUTH_PATHS = ["/api/auth", "/login", "/register"];
const WEBHOOK_PATHS = ["/webhook/", "/api/webhook"];

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Security headers
  if (response) {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }

  // Rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
             request.headers.get("x-real-ip") ||
             "unknown";
  const userAgent = request.headers.get("user-agent") || "";
  const rateKey = `${ip}:${userAgent.slice(0, 50)}`;

  // Auth endpoints: stricter limit
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    const result = authLimiter.check(rateKey);
    if (!result.allowed) {
      return NextResponse.json(
        { success: false, error: "Quá nhiều yêu cầu. Vui lòng thử lại sau.", code: "RATE_LIMIT" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(result.resetMs / 1000)) } }
      );
    }
  } else if (!WEBHOOK_PATHS.some((p) => pathname.startsWith(p))) {
    // General API: 100/min
    const result = apiLimiter.check(rateKey);
    if (!result.allowed) {
      return NextResponse.json(
        { success: false, error: "Quá nhiều yêu cầu. Vui lòng thử lại sau.", code: "RATE_LIMIT" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(result.resetMs / 1000)) } }
      );
    }
  }

  if (response) {
    // Attach rate limit headers
    response.headers.set("X-RateLimit-Remaining", "unknown");
    response.headers.set("X-RateLimit-Policy", "100/1min");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

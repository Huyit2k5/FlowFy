import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * SCIM 2.0 User Provisioning API
 * For enterprise IdP integration (Azure AD, Okta, etc.)
 *
 * Auth: Bearer token = workspace `scim_token` (dedicated provisioning credential,
 *       NOT the HMAC webhook secret).
 *
 * Security:
 *   - Role is validated against an allow-list. SCIM may only provision
 *     non-privileged members (default 'member'). Provisioning owner/admin
 *     is rejected to prevent privilege escalation.
 *
 * Endpoints (all on /api/scim/v2/users):
 *   GET    — List provisioned users
 *   POST   — Create user (provision)
 *   PUT    — Update user (uses ?id= param)
 *   DELETE — Deprovision (deactivate, uses ?id= param)
 */

// Roles SCIM is allowed to assign. Owner/admin are deliberately excluded.
const ALLOWED_SCIM_ROLES = new Set(["member"]);

function normalizeRole(input: unknown, fallback = "member"): string {
  const role = typeof input === "string" ? input.trim().toLowerCase() : fallback;
  if (ALLOWED_SCIM_ROLES.has(role)) return role;
  return "member"; // fail-safe: unknown/privileged roles downgrade to member
}

function getScimClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

async function verifyScimToken(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const token = auth.slice(7).trim();
  if (!token) return null;

  const supabase = getScimClient();
  const { data, error } = await supabase
    .from("workspace_security")
    .select("workspace_id, scim_token")
    .eq("scim_token", token)
    .limit(1);

  if (error || !data?.[0] || !data[0].scim_token) return null;
  return data[0].workspace_id as string;
}

// GET /api/scim/v2/Users
export async function GET(request: NextRequest) {
  const workspaceId = await verifyScimToken(request);
  if (!workspaceId) {
    return NextResponse.json({ status: 401, errors: [{ code: "invalidToken" }] }, { status: 401 });
  }

  const supabase = getScimClient();
  const sp = request.nextUrl.searchParams;
  const startIndex = Math.max(1, parseInt(sp.get("startIndex") ?? "1", 10) || 1);
  const count = Math.min(Math.max(parseInt(sp.get("count") ?? "100", 10) || 100, 1), 1000);

  // Correct offset paging: (page-1)*size .. (page*size - 1)
  const from = (startIndex - 1) * count;
  const to = from + count - 1;

  const { data, error } = await supabase
    .from("members")
    .select("id, user_id, role, invited_email, status")
    .eq("workspace_id", workspaceId)
    .range(from, to);

  if (error) {
    return NextResponse.json({ status: 500, errors: [{ code: "internalError", detail: error.message }] }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{ id: string; user_id: string | null; role: string; invited_email: string | null; status: string }>;
  const users = rows.map((m) => ({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: m.id,
    userName: m.invited_email ?? "",
    name: { formatted: m.invited_email },
    emails: [{ value: m.invited_email ?? "", primary: true }],
    active: m.status === "active",
    role: m.role,
    meta: { resourceType: "User" },
  }));

  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: users.length,
    startIndex,
    items: users,
  });
}

// POST /api/scim/v2/Users
export async function POST(request: NextRequest) {
  const workspaceId = await verifyScimToken(request);
  if (!workspaceId) {
    return NextResponse.json({ status: 401, errors: [{ code: "invalidToken" }] }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.userName) {
    return NextResponse.json({ status: 400, errors: [{ code: "invalidValue", detail: "userName required" }] }, { status: 400 });
  }

  const email = String(body.userName).trim();
  const role = normalizeRole(body.role);

  const supabase = getScimClient();

  const { data: existing } = await supabase
    .from("members")
    .select("id, user_id")
    .eq("workspace_id", workspaceId)
    .eq("invited_email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ status: 409, errors: [{ code: "uniqueness", detail: "User already exists" }] }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("members")
    .insert({
      workspace_id: workspaceId,
      user_id: null,
      role,
      invited_email: email,
      status: "invited",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ status: 500, errors: [{ code: "internalError", detail: error.message }] }, { status: 500 });
  }

  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: data.id,
    userName: email,
    name: { formatted: email },
    emails: [{ value: email, primary: true }],
    active: false,
    role,
    meta: { resourceType: "User" },
  }, { status: 201 });
}

// PUT /api/scim/v2/Users?id=...
export async function PUT(request: NextRequest) {
  const workspaceId = await verifyScimToken(request);
  if (!workspaceId) {
    return NextResponse.json({ status: 401, errors: [{ code: "invalidToken" }] }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ status: 400, errors: [{ code: "invalidValue", detail: "id param required" }] }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ status: 400, errors: [{ code: "invalidValue" }] }, { status: 400 });
  }

  const supabase = getScimClient();
  const updates: Record<string, unknown> = {};
  if (body.role) updates.role = normalizeRole(body.role);
  if (body.active !== undefined) updates.status = body.active ? "active" : "invited";
  if (body.userName) updates.invited_email = String(body.userName).trim();

  const { data, error } = await supabase
    .from("members")
    .update(updates)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select()
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ status: 404, errors: [{ code: "notFound" }] }, { status: 404 });
  }

  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: data.id,
    userName: data.invited_email ?? "",
    active: data.status === "active",
    role: data.role,
    meta: { resourceType: "User" },
  });
}

// DELETE /api/scim/v2/Users?id=...
export async function DELETE(request: NextRequest) {
  const workspaceId = await verifyScimToken(request);
  if (!workspaceId) {
    return NextResponse.json({ status: 401, errors: [{ code: "invalidToken" }] }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ status: 400, errors: [{ code: "invalidValue", detail: "id param required" }] }, { status: 400 });
  }

  const supabase = getScimClient();

  const { error } = await supabase
    .from("members")
    .update({ status: "invited", role: "member" })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return NextResponse.json({ status: 500, errors: [{ code: "internalError", detail: error.message }] }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}

# Flowly

Nền tảng tự động hóa quy trình làm việc cho doanh nghiệp SMB Việt Nam.

Giao diện tiếng Việt, giá VND, hỗ trợ 24/7.

---

## Tổng quan

Flowly là SaaS giúp đội ngũ tự động hóa quy trình lặp lại: nhận webhook → xử lý → gửi Slack/Email/Notion/Telegram/Zalo/Google/Airtable/Trello, chạy định kỳ theo cron, cộng tác realtime trên canvas, AI sinh workflow từ mô tả, thanh toán subscription qua Stripe.

**Hoàn thành: Phase 1–7.8** (Auth, Workflow Engine, Webhook/Schedule, Integrations, Real-time Collab, Billing/Security/Performance/Admin, Integration Framework, AI Assistant, Advanced Workflows, Conditional Branching, Analytics, Team Collaboration, Enterprise).

---

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| Styling | Tailwind CSS 4 |
| Backend / DB | Supabase (Auth + PostgreSQL + Realtime + Storage) |
| Workflow Canvas | React Flow (`@xyflow/react`) |
| Queue / Schedule | BullMQ + ioredis (Upstash Redis / local) |
| Validation | Zod 4 |
| Payment | Stripe (Checkout + Webhooks) |
| AI | OpenAI GPT-4o-mini / DeepSeek (VN-friendly) |
| Error Tracking | Sentry-ready (console fallback) |
| Rate Limiting | In-memory (production: Upstash) |
| Language | TypeScript 5 |
| Email | Resend API (fallback: simulate) |
| Notifications | Slack incoming webhook, Notion API |

---

## Cấu trúc thư mục

```
src/
├── app/
│   ├── page.tsx                    # Landing page (marketing)
│   ├── layout.tsx                  # Root layout (OG tags, manifest, title template)
│   ├── globals.css                 # Tailwind + theme
│   ├── loading.tsx                 # Global loading skeleton
│   ├── error.tsx                   # Client error boundary
│   ├── global-error.tsx            # Root error boundary (full HTML fallback)
│   ├── login/                      # Đăng nhập
│   ├── register/                   # Đăng ký
│   ├── onboarding/                 # Tạo workspace đầu tiên
│   ├── pricing/                    # Bảng giá (3 tier)
│   ├── upgrade/                    # Trang nâng cấp (Stripe checkout)
│   ├── admin/                      # Admin dashboard (owner-only)
│   ├── auth/                       # Layout chung cho auth pages
│   ├── app/
│   │   ├── page.tsx                # Redirect /app → workspace đầu tiên
│   │   ├── [id]/
│   │   │   ├── page.tsx            # Dashboard tổng quan
│   │   │   ├── layout.tsx          # App shell (sidebar + header)
│   │   │   ├── loading.tsx         # Dashboard loading skeleton
│   │   │   ├── analytics/          # Analytics dashboard (KPI + charts)
│   │   │   ├── activity/           # Activity feed (audit logs)
│   │   │   ├── integrations/
│   │   │   │   └── marketplace/    # Integration marketplace
│   │   │   ├── members/            # Quản lý thành viên + mời
│   │   │   ├── settings/           # Cài đặt + Enterprise security
│   │   │   ├── templates/          # Workflow template gallery
│   │   │   └── workflows/
│   │   │       ├── page.tsx        # Danh sách workflow
│   │   │       └── [workflowId]/
│   │   │           └── page.tsx    # Canvas editor + run history
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── signin/         # POST đăng nhập
│   │       │   ├── signup/         # POST đăng ký
│   │       │   └── signout/        # POST đăng xuất
│   │       ├── workspaces/
│   │       │   ├── route.ts        # GET/POST workspace
│   │       │   ├── invites/
│   │       │   │   ├── route.ts    # POST mời thành viên (plan limit)
│   │       │   │   └── accept/     # POST xác nhận lời mời
│   │       │   └── [id]/
│   │       │       ├── security/   # GET/PUT enterprise security config
│   │       │       ├── audit-logs/ # GET export (CSV/JSON, filters)
│   │       │       ├── export/     # GET/POST data export/import
│   │       │       ├── retention/  # POST trigger cleanup
│   │       │       ├── usage/      # GET usage + alerts
│   │       │       └── backup/     # GET/POST backup/restore
│   │       ├── workflows/
│   │       │   ├── route.ts        # GET/POST (Zod + plan limit + audit log)
│   │       │   └── [id]/
│   │       │       ├── route.ts    # GET/PUT/DELETE (RBAC enforced)
│   │       │       ├── run/        # POST chạy workflow (RBAC: runner)
│   │       │       ├── runs/       # GET lịch sử
│   │       │       ├── schedule/   # PUT bật/tắt schedule (BullMQ)
│   │       │       ├── permissions/ # GET/PUT/DELETE (RBAC: admin)
│   │       │       └── nodes/[nodeId]/comments/  # GET/POST/DELETE
│   │       ├── templates/
│   │       │   ├── route.ts        # GET/POST/DELETE
│   │       │   └── [id]/duplicate/ # POST → new workflow
│   │       ├── activity/           # GET activity feed
│   │       ├── analytics/          # GET aggregated analytics
│   │       ├── integrations/       # CRUD tích hợp (Zod validation)
│   │       ├── webhooks/[id]/      # Public webhook trigger (service role)
│   │       ├── billing/
│   │       │   ├── checkout/       # POST Stripe Checkout Session
│   │       │   └── webhook/        # POST Stripe webhook (HMAC verify)
│   │       ├── health/             # GET health check (DB + version)
│   │       ├── ai/
│   │       │   ├── generate-workflow/  # POST AI sinh workflow
│   │       │   └── diagnose-error/     # POST AI chẩn đoán lỗi
│   │       └── test/
│   │           ├── run-workflow/   # Test endpoint Phase 2-4
│   │           ├── phase5/         # Phase 5 test suite (14 tests)
│   │           ├── phase6/         # Phase 6 test suite (16 tests)
│   │           ├── phase7/         # Phase 7.1+7.2 (18 tests)
│   │           ├── phase73/        # Phase 7.3 conditional (15 tests)
│   │           ├── phase75/        # Phase 7.5 advanced (18 tests)
│   │           ├── phase76/        # Phase 7.6 analytics (15 tests)
│   │           ├── phase77/        # Phase 7.7 collaboration (15 tests)
│   │           └── phase78/        # Phase 7.8 enterprise (20 tests)
│   └── ...
├── components/
│   ├── app-shell.tsx               # Sidebar + header + plan badge + upgrade
│   ├── login-form.tsx              # Form đăng nhập
│   ├── register-form.tsx           # Form đăng ký
│   ├── onboarding-form.tsx         # Form tạo workspace
│   ├── invite-form.tsx             # Form mời thành viên
│   ├── workflow-list-client.tsx    # Danh sách + tạo + xoá workflow
│   ├── workflow-canvas.tsx         # Canvas React Flow + Realtime + Presence
│   ├── workflow-canvas-ai.tsx      # Canvas wrapper + AI Assistant bar
│   ├── ai-assistant.tsx            # AI workflow generator modal
│   ├── flow-node.tsx               # Custom node component (22 types)
│   ├── node-config-panel.tsx       # Config panel (all node types)
│   ├── run-history.tsx             # Lịch sử chạy + log (Realtime)
│   ├── analytics-charts.tsx        # SVG BarChart + StatCard
│   ├── node-comments.tsx           # Node comment thread UI
│   ├── workflow-permissions.tsx    # Per-workflow RBAC UI (5 roles)
│   └── security-settings.tsx       # Enterprise security panel
├── lib/
│   ├── supabase/
│   │   ├── browser.ts              # Supabase client (browser)
│   │   ├── server.ts               # Supabase client (server, cookies)
│   │   └── middleware.ts           # Update session token
│   ├── workspaces.ts               # Helper: getWorkspaces, getCurrentWorkspace
│   ├── workflow-types.ts           # Types + Zod schemas (22 node types)
│   ├── workflow-db.ts              # CRUD: getWorkflow, saveWorkflowNodes, ...
│   ├── workflow-engine.ts          # Execution engine (22 runners + retry + HMAC)
│   ├── workflow-queue.ts           # BullMQ: schedule + repeat jobs
│   ├── rbac.ts                     # RBAC: 5 roles, hierarchy, checkWorkflowAccess
│   ├── ip-allowlist.ts             # CIDR matching (IPv4)
│   ├── plan-limits.ts              # Plan limits (free/pro/enterprise)
│   ├── billing-helpers.ts          # canCreateWorkflow, canAddMember
│   ├── rate-limiter.ts             # In-memory rate limiter (4 tiers)
│   ├── api-guard.ts                # withSecurity + validateBody helpers
│   ├── audit-log.ts                # logAudit + helpers (login, CRUD, invite)
│   ├── error-tracking.ts           # Sentry-ready error capture
│   └── integrations/               # Phase 7.1: Integration framework
│       ├── types.ts                # IntegrationProvider interface
│       ├── registry.ts             # Provider registry + executeProviderNode
│       ├── http.ts                 # HTTP Request (4 auth types)
│       ├── google.ts               # Google Workspace (4 actions)
│       ├── messaging.ts            # Telegram + Discord + Zalo + SMS
│       ├── productivity.ts         # Airtable + Trello
│       ├── data.ts                 # Transform + Database
│       └── engine-types.ts         # Ctx type re-export
└── middleware.ts                    # Auth check + security headers

supabase/
├── schema.sql                      # Database schema + RLS + triggers
└── migrations/
    ├── 003_webhook_schedule.sql    # webhook_token, schedule, schedule_enabled
    ├── 004_realtime.sql            # Add workflow_runs + run_logs to publication
    ├── 005_realtime_nodes.sql      # Add workflow_nodes to publication
    ├── 006_audit_logs.sql          # Audit log table + RLS + indexes
    ├── 007_collab.sql              # Templates + comments + permissions (Phase 7.7)
    └── 008_enterprise.sql          # workspace_security + 5-role migration (Phase 7.8)

public/
└── manifest.json                   # PWA manifest
```

---

## Database Schema

13 bảng chính:

| Table | Mô tả |
|---|---|
| `profiles` | Thông tin user (link `auth.users`) |
| `workspaces` | Công ty / đội làm việc (plan, stripe_session_id) |
| `members` | Thành viên + vai trò (owner / admin / member) |
| `workflows` | Quy trình tự động (name, trigger_type, status, schedule, webhook_token) |
| `workflow_nodes` | Nodes + edges trên canvas (jsonb) |
| `workflow_runs` | Mỗi lần chạy (status, trigger, started_at, finished_at, error) |
| `run_logs` | Log từng bước trong 1 run (node_id, status, input, output, error) |
| `integrations` | Cấu hình tích hợp workspace (Slack, Email, Notion, 10+ providers) |
| `invitations` | Lời mời thành viên (email, role, token, expires) |
| `audit_logs` | Log hành động (user, action, entity, metadata, ip) |
| `workflow_templates` | Template canvas (nodes, edges) — duplicate → workflow |
| `node_comments` | Comment trên node (thread) |
| `workflow_permissions` | Per-workflow RBAC (5 roles: viewer→admin) |
| `workspace_security` | Enterprise: SSO, 2FA, IP allowlist, HMAC, retention, alerts |

**Security**: Row Level Security (RLS) trên mọi bảng. User chỉ truy cập dữ liệu workspace mình là thành viên. Enterprise settings chỉ owner/admin sửa được.

**Realtime publication** (`supabase_realtime`): `workflows`, `workflow_nodes`, `workflow_runs`, `run_logs`.

---

## Các Phase đã triển khai

### Phase 1: Auth + Workspace + Dashboard ✅

**Mục tiêu**: Nền tảng xác thực + quản lý workspace.

**Kết quả**:
1. **Authentication** — Đăng ký / đăng nhập / đăng xuất (Supabase Auth), middleware bảo vệ, `redirect: "manual"`
2. **Multi-tenant Workspace** — Onboarding, switch workspace, mời thành viên, phân quyền (owner/admin/member)
3. **Dashboard** — Stats (workflow, runs, members, errors), recent workflows, recent runs, responsive
4. **Infra** — Supabase clients, 9+1 bảng + RLS + triggers, landing page

**Routes**: `/`, `/login`, `/register`, `/onboarding`, `/app`, `/app/[id]`, `/app/[id]/members`, `/app/[id]/settings`

---

### Phase 2: Workflow Engine ✅

**Mục tiêu**: Lõi sản phẩm — canvas kéo-thả + execution engine.

**Kết quả**:
1. **Canvas Editor** — React Flow, 7 node types, config panel, minimap, dirty indicator
2. **7 Node Types** — Trigger, Webhook/HTTP, Slack, Email, Notion, Condition, Delay
3. **Execution Engine** — Topological BFS, template `{{nodeId.field}}`, run_logs per step
4. **Run History** — List + detail view, status badges
5. **API** — Full CRUD + run + runs + logs

**Routes**: `/app/[id]/workflows`, `/app/[id]/workflows/[workflowId]`

---

### Phase 3: Webhook + Real-time Log + Schedule ✅

**Mục tiêu**: Trigger ngoài + theo dõi realtime + chạy định kỳ.

**Kết quả**:
1. **Webhook Trigger** — `POST /api/webhooks/:token` (public, service role)
2. **Real-time Run Log** — Subscribe `run_logs` + `workflow_runs` (Supabase Realtime)
3. **Schedule + BullMQ** — Cron jobs, `upsertJobScheduler`, worker
4. **Node Config** — Webhook URL display + copy, schedule presets

**Migration**: `003_webhook_schedule.sql`, `004_realtime.sql`

---

### Phase 4: Integrations + Retry ✅

**Mục tiêu**: Quản lý tích hợp workspace + retry logic.

**Kết quả**:
1. **Integration Settings UI** — `/app/[id]/integrations`, 3 loại (Slack/Email/Notion)
2. **CRUD API** — `GET/POST/PUT/DELETE /api/integrations`
3. **Fallback** — Runner đọc workspace integration nếu node không có config
4. **Retry Logic** — 3 attempts, exponential backoff (1s→2s→4s), only network errors

**Tests**: 15/15 passed

---

### Phase 5: Canvas Real-time Collab + Presence + UI Polish ✅

**Mục tiêu**: Cộng tác realtime trên canvas + presence + responsive.

**Kết quả**:
1. **Real-time Collab** — Subscribe `workflow_nodes` UPDATE, `isSavingRef` anti-loop
2. **Presence** — Avatars (max 3 + overflow), join/leave/sync handlers
3. **UI Polish** — Responsive grid, empty states, remote update badge (3s)
4. **Migration**: `005_realtime_nodes.sql`

**Tests**: 14/14 passed

---

### Phase 6: Production Hardening + Monetization ✅

**Mục tiêu**: Billing, security, performance, admin — sẵn sàng production.

#### 6.1: Billing & Upgrade

| Feature | Chi tiết |
|---|---|
| Pricing page | `/pricing` — 3 tier (Free/Pro/Enterprise), comparison table |
| Upgrade page | `/upgrade` — hiện gói hiện tại, Stripe checkout button |
| Stripe Checkout | `POST /api/billing/checkout` — tạo session (sim mode nếu chưa config) |
| Stripe Webhook | `POST /api/billing/webhook` — HMAC verify, update plan on events |
| Plan badge | Sidebar: Free/Pro/Enterprise + "Nâng cấp Pro" button |
| Plan enforcement | `canCreateWorkflow()`, `canAddMember()` in billing-helpers |

**Env (production)**: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_PRO`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`

#### 6.2: Security

| Feature | Chi tiết |
|---|---|
| Rate limiting | In-memory: auth=10/min, API=60/min, webhook=30/min, billing=5/min |
| Zod validation | Workflows POST (uuid, string limits), Integrations POST (enum, record) |
| Security headers | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` |
| Audit log | Table `audit_logs` + RLS + indexes, helpers (login, CRUD, invite) |
| Migration | `006_audit_logs.sql` |

#### 6.3: Performance & SEO

| Feature | Chi tiết |
|---|---|
| Loading states | Global `loading.tsx` + dashboard skeleton (pulse animation) |
| Error boundaries | `error.tsx` (client) + `global-error.tsx` (full HTML fallback) |
| PWA | `public/manifest.json` (standalone, theme color, icons) |
| SEO | OpenGraph, Twitter card, title template, metadata |

#### 6.4: Admin & Observability

| Feature | Chi tiết |
|---|---|
| Admin dashboard | `/admin` — user/workspace/workflow/run counts, recent runs, workspace list |
| Health check | `GET /api/health` — Supabase DB latency + Redis (optional) |
| Error tracking | `error-tracking.ts` — Sentry-ready, console fallback |
| Access control | Owner-only (redirect non-owners) |

**Tests**: 16/16 passed

---

### Phase 7: Growth & Scale (7.1 + 7.2) ✅

**Mục tiêu**: Mở rộng integrations + AI assistant để tăng giá trị sản phẩm.

#### 7.1: Integration Framework (10 providers)

**Plugin architecture** — mỗi integration implement `IntegrationProvider` interface:

```typescript
interface IntegrationProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: IntegrationCategory;
  authType: "none" | "api_key" | "bearer" | "basic" | "oauth2" | "webhook_url";
  configSchema: ConfigField[];
  execute(ctx: IntegrationContext): Promise<IntegrationResult>;
}
```

**10 Providers**:

| Provider | Icon | Category | Auth | Chi tiết |
|---|---|---|---|---|
| HTTP Request | 🔗 | Development | None/Bearer/Basic/API-Key | REST API generic, timeout, custom headers |
| Google Workspace | 📧 | Productivity | OAuth2 | Gmail send, Calendar event, Sheets append, Drive upload |
| Telegram | ✈️ | Communication | Bot Token | sendMessage, HTML/Markdown |
| Discord | 🎮 | Communication | Webhook URL | Message + embed (title, desc, color) |
| Zalo OA | 💚 | Vietnam | Access Token | Gửi message user/group |
| SMS (VN) | 📱 | Vietnam | API Key | VNPT / Viettel / Mobifone |
| Airtable | 📊 | Productivity | API Key | Create, Update, Search records |
| Trello | 📋 | Productivity | API Key + Token | Create card, Move card |
| Data Transform | 🔄 | Data | None | Map, Filter, Aggregate, Parse, Stringify, Extract |
| Database | 🗄️ | Data | API Key | Supabase PostgreSQL query, HTTP API |

**Files**: `src/lib/integrations/` (types.ts, http.ts, google.ts, messaging.ts, productivity.ts, data.ts, registry.ts, engine-types.ts)

**Engine integration**: 11 node types mới dispatch qua `executeProviderNode()` → provider registry.

**Marketplace UI**: `/app/[id]/integrations/marketplace`
- Grid 13 integration cards (10 new + Slack + Email + Notion)
- Search + category filter (Giao tiếp, Sản xuất, Phát triển, Dữ liệu, Việt Nam)
- Connect modal: dynamic form from `configSchema`, save to `/api/integrations`

**Config panel**: Generic integration config (provider select, input node ref, dynamic fields).

#### 7.2: AI Assistant

| Feature | API | Chi tiết |
|---|---|---|
| Generate workflow | `POST /api/ai/generate-workflow` | Input: mô tả text → Output: nodes + edges JSON |
| Diagnose error | `POST /api/ai/diagnose-error` | Input: run_id → Output: diagnosis + suggestions |
| UI component | `ai-assistant.tsx` | Textarea → Generate → Preview → Apply to canvas |
| LLM providers | OpenAI / DeepSeek | `OPENAI_API_KEY` hoặc `DEEPSEEK_API_KEY` |
| Template fallback | — | Không cần API key: detect keywords (email, slack, zalo...) → sinh workflow |

**LLM system prompt**: Biết 18 node types, sinh JSON {nodes, edges}, position auto, max 6 nodes.

**Template engine**: Detect 8+ service keywords trong mô tả → tạo trigger + action nodes + edges.

**UI**: Nút "✨ AI Assistant" trên canvas bar → modal với textarea → sinh → preview nodes → "Áp dụng vào canvas".

**Env (optional)**: `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`

**Tests**: 18/18 passed

#### 7.5: Advanced Workflows (5 node types)

| Node | Icon | Chi tiết |
|------|------|----------|
| **Sub-workflow** | 🔁 | Gọi workflow khác như một node. Input mapping (template → sub-input), output key, trigger prefix `sub_workflow:parentId:nodeId` |
| **Parallel** | 🔀 | Chạy nhiều nhánh đồng thời. `maxConcurrent` (1-20), `failFast` (stop if any branch fails) |
| **Loop** | 🔂 | For-each over array. `sourceNode` + `arrayField`, `maxIterations` (1-100), provides `loopIndex` + `loopItem` in context |
| **Condition Group** | ⚙️ | Multi-condition AND/OR. Array of expressions, `operator: "AND" \| "OR"` |
| **Delay** | ⏱ | Pause execution. `seconds` (1-86400), capped at 60s in engine for safety |

**Engine changes**:
- `NODE_TYPES` expanded to 22 types
- 5 new runners in `nodeRunners` record
- Sub-workflow recursively calls `executeWorkflow()`
- Loop sets `ctx.loopIndex` / `ctx.loopItem` during iteration
- Condition group: `results.every()` for AND, `results.some()` for OR

**Canvas**: Palette expanded to 15 node types (trigger, webhook, http, slack, email, notion, condition, condition_group, delay, transform, database, integration, sub_workflow, parallel, loop). Flow node styles for all 4 new types.

**Zod schemas**: `subWorkflowConfigSchema`, `parallelConfigSchema`, `loopConfigSchema`, `conditionGroupConfigSchema`, `delayConfigSchema`

**Tests**: 18/18 passed

#### 7.3: Conditional Branching (If/Else trên canvas)

| Feature | Chi tiết |
|---------|----------|
| 2 source handles | `condition` + `condition_group` nodes có 2 output: **True** (xanh lá) + **False** (đỏ) |
| Labeled edges | `WorkflowEdge.label: "true" \| "false"` — engine follow đúng nhánh |
| Canvas | Kéo từ handle True → edge xanh, handle False → edge đỏ. Label hiển thị trên edge |
| Engine | Sau condition node, đọc edge label từ source handle → đi đúng nhánh |

**Canvas changes**: `onConnect` captures `sourceHandle` → sets `edge.label`. Edge styled by label color.

**Tests**: 15/15 passed

#### 7.6: Analytics & Reporting

| Feature | API/UI | Chi tiết |
|---------|--------|----------|
| KPI cards | `/app/[id]/analytics` | Total runs, success rate, avg duration, active workflows |
| Time series chart | SVG BarChart | Runs per day (last 14 days) |
| Top workflows | Table | 5 workflows with most runs + success rate |
| Integration usage | Horizontal bars | Count per provider |
| Run history filter | `?status=completed\|failed\|running` | Filter by status |
| CSV export | `?export=csv` | Download run history as CSV |
| API | `GET /api/analytics?workspace_id=...` | Aggregated queries |

**Charts**: Pure SVG (no recharts/chart.js dependency).

**Tests**: 15/15 passed

#### 7.7: Team Collaboration Advanced

| Feature | API | Chi tiết |
|---------|-----|----------|
| Workflow Templates | `GET/POST/DELETE /api/templates` | Save canvas as template, duplicate → new workflow |
| Node Comments | `GET/POST/DELETE /api/workflows/[id]/nodes/[nodeId]/comments` | Comment trên từng node, thread UI |
| Activity Feed | `GET /api/activity?workspace_id=...` | Audit logs formatted as feed (who did what, when) |
| Per-workflow Permissions | `GET/PUT/DELETE /api/workflows/[id]/permissions` | Gán role per user per workflow |
| Templates UI | `/app/[id]/templates` | Grid template cards + "Dùng template" → duplicate |
| Activity UI | `/app/[id]/activity` | Timeline feed |
| Comments UI | `node-comments.tsx` | Thread bên cạnh config panel |

**Migration**: `007_collab.sql` (3 tables: `workflow_templates`, `node_comments`, `workflow_permissions`)

**Tests**: 15/15 passed

#### 7.8: Enterprise Features

| Feature | API/UI | Chi tiết |
|---------|--------|----------|
| **Advanced RBAC** | `GET/PUT/DELETE /api/workflows/[id]/permissions` | 5 roles: viewer → commenter → runner → editor → admin. Hierarchy enforcement on all workflow routes |
| **SSO / SAML** | Settings UI + `PUT /api/workspaces/[id]/security` | Config: provider (Google/Azure/Okta/Custom), client_id, client_secret, redirect_uri |
| **Enforced 2FA** | Settings toggle | `enforce_2fa: boolean` per workspace |
| **IP Allowlist** | Settings input + `ip-allowlist.ts` | CIDR matching (IPv4), comma-separated, empty = allow all |
| **HMAC Webhook Signing** | Engine auto-sign | `X-Flowly-Signature` (HMAC-SHA256) + `X-Flowly-Timestamp` on outbound webhooks |
| **Usage Alerts** | `GET /api/workspaces/[id]/usage` | 80%/95% threshold alerts, quota override per workspace |
| **Audit Log Export** | `GET /api/workspaces/[id]/audit-logs?format=csv` | CSV/JSON export, filters: from/to/action/user |
| **Data Retention** | `POST /api/workspaces/[id]/retention` | Auto-purge run logs + runs after N days, archive inactive workflows |
| **Data Export/Import** | `GET/POST /api/workspaces/[id]/export` | Full workspace JSON export + import/restore |
| **Health Check** | `GET /api/health` | DB latency, status (healthy/degraded), version |
| **Backup/Restore** | `GET/POST /api/workspaces/[id]/backup` | Export-based backup + restore |
| **Security Settings UI** | `/app/[id]/settings` (Enterprise only) | All toggles + inputs in one panel |

**RBAC enforcement points**:
- `PUT /api/workflows/[id]` → requires `editor`
- `DELETE /api/workflows/[id]` → requires `admin`
- `POST /api/workflows/[id]/run` → requires `runner`
- `PUT/DELETE /api/workflows/[id]/permissions` → requires `admin`
- Workspace security settings → requires workspace `owner`/`admin`

**Migration**: `008_enterprise.sql` (workspace_security table + 5-role migration)

**Tests**: 20/20 passed

---

## Plan Limits

| Gói | Members | Workflows | Storage |
|---|---|---|---|
| Free | 3 | 5 | 1 GB |
| Pro (₫299k/tháng) | ∞ | ∞ | 100 GB |
| Enterprise (liên hệ) | ∞ | ∞ | ∞ |

Enforced tại:
- `POST /api/workflows` — chặn khi vượt workflow limit
- `POST /api/workspaces/invites` — chặn khi vượt member limit
- Unknown plan → fallback Free

Config: `src/lib/plan-limits.ts`

---

## Biến môi trường

| Biến | Mô tả | Bắt buộc |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (công khai) | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server-only) | ✓ |
| `UPSTASH_REDIS_URL` | Redis cho BullMQ (schedule) | Schedule |
| `STRIPE_SECRET_KEY` | Stripe secret key | Billing |
| `STRIPE_PRICE_ID_PRO` | Stripe Price ID gói Pro | Billing |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Billing |
| `NEXT_PUBLIC_APP_URL` | Base URL (webhook redirect) | Billing |
| `RESEND_API_KEY` | Resend API (email thật) | Optional |
| `OPENAI_API_KEY` | OpenAI GPT-4o-mini (AI assistant) | AI |
| `DEEPSEEK_API_KEY` | DeepSeek (AI, VN-friendly, rẻ hơn) | AI |
| `SENTRY_DSN` | Sentry DSN (error tracking) | Optional |

---

## Chạy dự án

### Yêu cầu
- Node.js 18+
- Supabase project (miễn phí)
- (Optional) Redis: Upstash hoặc local
- (Optional) Stripe account (billing)

### Cài đặt

```bash
# 1. Clone repo
git clone <repo-url>
cd FlowFy

# 2. Cài dependencies
npm install

# 3. Tạo .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YOUR_KEY
SUPABASE_SERVICE_ROLE_KEY=eyJ...
# UPSTASH_REDIS_URL=rediss://...
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_PRICE_ID_PRO=price_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# 4. Chạy schema database
# Supabase Dashboard → SQL Editor:
#   - supabase/schema.sql
#   - supabase/migrations/003_webhook_schedule.sql
#   - supabase/migrations/004_realtime.sql
#   - supabase/migrations/005_realtime_nodes.sql
#   - supabase/migrations/006_audit_logs.sql
#   - supabase/migrations/007_collab.sql
#   - supabase/migrations/008_enterprise.sql

# 5. Chạy dev server
npm run dev
```

### Lint & Build

```bash
npm run lint      # ESLint
npm run build     # Production build
npm run dev       # Dev server (port 3000)
npm start         # Production server
```

### Test Endpoints

| Endpoint | Mô tả |
|---|---|
| `GET /api/test/phase5` | Phase 5: collab, presence, plan limits, UI (14 tests) |
| `GET /api/test/phase6` | Phase 6: billing, security, perf, admin (16 tests) |
| `GET /api/test/phase7` | Phase 7.1+7.2: integrations, AI assistant (18 tests) |
| `GET /api/test/phase73` | Phase 7.3: conditional branching (15 tests) |
| `GET /api/test/phase75` | Phase 7.5: advanced workflows (18 tests) |
| `GET /api/test/phase76` | Phase 7.6: analytics & reporting (15 tests) |
| `GET /api/test/phase77` | Phase 7.7: team collaboration (15 tests) |
| `GET /api/test/phase78` | Phase 7.8: enterprise features (20 tests) |
| `POST /api/test/run-workflow` | Tạo + chạy workflow test |
| `GET /api/health` | Health check (DB + version) |

---

## API Reference

### Auth
| Method | Route | Mô tả |
|---|---|---|
| POST | `/api/auth/signin` | Đăng nhập |
| POST | `/api/auth/signup` | Đăng ký |
| POST | `/api/auth/signout` | Đăng xuất |

### Workspaces
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/workspaces` | List workspaces |
| POST | `/api/workspaces` | Tạo workspace |
| POST | `/api/workspaces/invites` | Mời thành viên (plan limit) |
| POST | `/api/workspaces/invites/accept` | Accept invitation |
| GET | `/api/workspaces/[id]/security` | Enterprise security config |
| PUT | `/api/workspaces/[id]/security` | Update security (SSO, 2FA, IP, HMAC, retention) |
| GET | `/api/workspaces/[id]/audit-logs` | Export audit logs (CSV/JSON, filters) |
| GET | `/api/workspaces/[id]/export` | Export full workspace (JSON) |
| POST | `/api/workspaces/[id]/export` | Import workspace data |
| POST | `/api/workspaces/[id]/retention` | Trigger retention cleanup |
| GET | `/api/workspaces/[id]/usage` | Usage + alerts (80%/95%) |
| GET | `/api/workspaces/[id]/backup` | Backup info |
| POST | `/api/workspaces/[id]/backup` | Restore from backup JSON |

### Workflows
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/workflows` | List (by workspace) |
| POST | `/api/workflows` | Tạo (Zod + plan limit + audit) |
| GET | `/api/workflows/[id]` | Get + nodes |
| PUT | `/api/workflows/[id]` | Update metadata / nodes (RBAC: editor) |
| DELETE | `/api/workflows/[id]` | Xoá (RBAC: admin) |
| POST | `/api/workflows/[id]/run` | Chạy workflow (RBAC: runner) |
| GET | `/api/workflows/[id]/runs` | Lịch sử |
| PUT | `/api/workflows/[id]/schedule` | Bật/tắt schedule |
| GET | `/api/workflows/runs/[runId]/logs` | Log chi tiết |
| GET | `/api/workflows/[id]/permissions` | List permissions |
| PUT | `/api/workflows/[id]/permissions` | Set permission (RBAC: admin) |
| DELETE | `/api/workflows/[id]/permissions?id=` | Remove permission (RBAC: admin) |
| GET | `/api/workflows/[id]/nodes/[nodeId]/comments` | List node comments |
| POST | `/api/workflows/[id]/nodes/[nodeId]/comments` | Add comment |
| DELETE | `/api/workflows/[id]/nodes/[nodeId]/comments?id=` | Delete comment |

### Templates & Collaboration
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/templates` | List templates (by workspace) |
| POST | `/api/templates` | Create template |
| DELETE | `/api/templates?id=` | Delete template |
| POST | `/api/templates/[id]/duplicate` | Duplicate → new workflow |
| GET | `/api/activity?workspace_id=` | Activity feed (audit logs) |

### Analytics
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/analytics?workspace_id=` | Aggregated stats (KPI, time series, top, usage) |

### Integrations
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/integrations` | List (by workspace) |
| POST | `/api/integrations` | Create/Update (Zod) |
| DELETE | `/api/integrations?id=...` | Xoá |

### Billing
| Method | Route | Mô tả |
|---|---|---|
| POST | `/api/billing/checkout` | Stripe Checkout Session |
| POST | `/api/billing/webhook` | Stripe webhook (HMAC) |

### Webhook (Public)
| Method | Route | Mô tả |
|---|---|---|
| POST | `/api/webhooks/[token]` | Trigger workflow (no auth) |

### Health
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/health` | Health check (DB + Redis) |

### AI
| Method | Route | Mô tả |
|---|---|---|
| POST | `/api/ai/generate-workflow` | Sinh workflow từ mô tả (LLM + template) |
| POST | `/api/ai/diagnose-error` | Chẩn đoán lỗi run (LLM + fallback) |

### Test
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/test/phase5` | Phase 5 tests (14) |
| GET | `/api/test/phase6` | Phase 6 tests (16) |
| GET | `/api/test/phase7` | Phase 7.1+7.2 tests (18) |
| GET | `/api/test/phase73` | Phase 7.3 conditional branching (15) |
| GET | `/api/test/phase75` | Phase 7.5 advanced workflows (18) |
| GET | `/api/test/phase76` | Phase 7.6 analytics (15) |
| GET | `/api/test/phase77` | Phase 7.7 collaboration (15) |
| GET | `/api/test/phase78` | Phase 7.8 enterprise (20) |

---

## Execution Engine

```
executeWorkflow({ workflowId, workspaceId, trigger, input?, supabase? })
│
├── 1. Tạo workflow_run (status: "running")
├── 2. Load nodes + edges
├── 3. Load integrations → ctx.data.__integrations
├── 4. BFS từ trigger node:
│   ├── Mỗi node: run_log → runner → update log
│   ├── Retry: 3 attempts, 1s→2s→4s (network errors only)
│   ├── Success: output → ctx.data[nodeId]
│   ├── Failed: stop
│   └── Next: follow edges
└── 5. Update workflow_run (success/failed)
```

**Template**: `{{nodeId.field}}` → output node trước.

---

## Realtime Architecture

```
Tab A ──save──→ DB ──Realtime──→ Tab B (updates canvas)
                        │
Tab A ←── isSavingRef=true (skip self-update)
```

**Presence**: `channel.track()` → join/leave/sync → avatars on toolbar.

---

## Security Architecture

| Layer | Mechanism |
|---|---|
| Auth | Supabase Auth (email/password), JWT middleware |
| SSO | OIDC/SAML config per workspace (Google, Azure AD, Okta, Custom) |
| 2FA | Enforced per workspace (enterprise toggle) |
| RBAC | 5 roles per workflow (viewer→admin), workspace roles (owner/admin/member) |
| RLS | Per-table policies, `is_member()` security definer |
| IP Allowlist | CIDR matching per workspace (enterprise) |
| Rate limit | In-memory per-IP (4 tiers by route) |
| Input validation | Zod schemas on all POST bodies |
| Security headers | nosniff, DENY, strict-origin-when-cross-origin, permissions |
| Audit trail | `audit_logs` table + CSV/JSON export |
| Webhook signing | HMAC-SHA256 (`X-Flowly-Signature`) on outbound webhooks |
| Stripe webhook | HMAC-SHA256 signature verification |
| Data retention | Configurable purge (logs, runs) + archive inactive workflows |
| Service role | Only in server-side route handlers, never exposed |

---

## Lỗi gặp phải & cách xử lý

| # | Error | Fix |
|---|---|---|
| 1 | `row-level security policy` | Function `create_workspace` security definer |
| 2 | `stack depth limit exceeded` | `is_member` security definer |
| 3 | Login 307 redirect | `redirect: "manual"` |
| 4 | Webhook 403 (RLS) | `SERVICE_ROLE_KEY` |
| 5 | Table name wrong | `run_logs` (not `workflow_run_logs`) |
| 6 | BullMQ type errors | v6 `upsertJobScheduler` signature |
| 7 | Presence TS errors | Cast via `unknown` |
| 8 | Stripe module not found | Avoid `import("stripe")`, use fetch API |
| 9 | `Date.now()` in server component | Extract to helper function |

---

## Roadmap

- [x] **Phase 1**: Auth + Workspace + Dashboard
- [x] **Phase 2**: Workflow Engine (React Flow + 7 nodes + Execution)
- [x] **Phase 3**: Webhook + Real-time log + Schedule (BullMQ)
- [x] **Phase 4**: Integrations (Slack/Email/Notion) + Retry
- [x] **Phase 5**: Canvas Real-time Collab + Presence + UI Polish
- [x] **Phase 6**: Production Hardening + Monetization
  - [x] 6.1: Billing & Upgrade (Stripe, pricing, plan enforcement)
  - [x] 6.2: Security (rate limiting, Zod, headers, audit log)
  - [x] 6.3: Performance & SEO (loading, errors, PWA, OG)
  - [x] 6.4: Admin & Observability (dashboard, health, tracking)
  - [ ] 6.5: Deployment (Vercel, CI/CD, load test)
- [x] **Phase 7**: Growth & Scale
  - [x] 7.1: Integration Framework (10 providers + marketplace UI)
  - [x] 7.2: AI Assistant (generate workflow + diagnose error)
  - [x] 7.3: Conditional Branching (if/else on canvas, labeled edges)
  - [ ] 7.4: Mobile Enhancement (PWA + touch)
  - [x] 7.5: Advanced Workflows (sub-workflow, parallel, loop, condition group, delay)
  - [x] 7.6: Analytics & Reporting (KPI, charts, run history, CSV export)
  - [x] 7.7: Team Collaboration (templates, node comments, activity, permissions)
  - [x] 7.8: Enterprise (RBAC, SSO, 2FA, IP allowlist, HMAC, retention, export, alerts)

---

## Giấy phép

MIT
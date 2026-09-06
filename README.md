# Flowly

Nền tảng tự động hóa quy trình làm việc cho doanh nghiệp SMB Việt Nam.

Giao diện tiếng Việt, giá VND, hỗ trợ 24/7.

---

## Tổng quan

Flowly là SaaS giúp đội ngũ tự động hóa quy trình lặp lại: nhận webhook → xử lý → gửi Slack/Email/Notion, chạy định kỳ theo cron, cộng tác realtime trên canvas, thanh toán subscription qua Stripe.

**Hoàn thành: Phase 1–6** (Auth, Workflow Engine, Webhook/Schedule, Integrations, Real-time Collab, Billing/Security/Performance/Admin).

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
│   │   │   ├── members/            # Quản lý thành viên + mời
│   │   │   ├── settings/           # Cài đặt workspace
│   │   │   ├── integrations/       # Cấu hình tích hợp (Slack/Email/Notion)
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
│   │       │   └── invites/
│   │       │       ├── route.ts    # POST mời thành viên (plan limit)
│   │       │       └── accept/     # POST xác nhận lời mời
│   │       ├── workflows/
│   │       │   ├── route.ts        # GET/POST (Zod + plan limit + audit log)
│   │       │   └── [id]/
│   │       │       ├── route.ts    # GET/PUT/DELETE
│   │       │       ├── run/        # POST chạy workflow
│   │       │       ├── runs/       # GET lịch sử
│   │       │       └── schedule/   # PUT bật/tắt schedule (BullMQ)
│   │       ├── integrations/       # CRUD tích hợp (Zod validation)
│   │       ├── webhooks/[id]/      # Public webhook trigger (service role)
│   │       ├── billing/
│   │       │   ├── checkout/       # POST Stripe Checkout Session
│   │       │   └── webhook/        # POST Stripe webhook (HMAC verify)
│   │       ├── health/             # GET health check (DB + Redis)
│   │       └── test/
│   │           ├── run-workflow/   # Test endpoint Phase 2-4
│   │           ├── phase5/         # Phase 5 test suite (14 tests)
│   │           └── phase6/         # Phase 6 test suite (16 tests)
│   └── ...
├── components/
│   ├── app-shell.tsx               # Sidebar + header + plan badge + upgrade
│   ├── login-form.tsx              # Form đăng nhập
│   ├── register-form.tsx           # Form đăng ký
│   ├── onboarding-form.tsx         # Form tạo workspace
│   ├── invite-form.tsx             # Form mời thành viên
│   ├── workflow-list-client.tsx    # Danh sách + tạo + xoá workflow
│   ├── workflow-canvas.tsx         # Canvas React Flow + Realtime + Presence
│   ├── flow-node.tsx               # Custom node component
│   ├── node-config-panel.tsx       # Config panel (7 loại node)
│   └── run-history.tsx             # Lịch sử chạy + log (Realtime)
├── lib/
│   ├── supabase/
│   │   ├── browser.ts              # Supabase client (browser)
│   │   ├── server.ts               # Supabase client (server, cookies)
│   │   └── middleware.ts           # Update session token
│   ├── workspaces.ts               # Helper: getWorkspaces, getCurrentWorkspace
│   ├── workflow-types.ts           # Types + Zod schemas (7 node types)
│   ├── workflow-db.ts              # CRUD: getWorkflow, saveWorkflowNodes, ...
│   ├── workflow-engine.ts          # Execution engine (7 runners + retry)
│   ├── workflow-queue.ts           # BullMQ: schedule + repeat jobs
│   ├── plan-limits.ts              # Plan limits (free/pro/enterprise)
│   ├── billing-helpers.ts          # canCreateWorkflow, canAddMember
│   ├── rate-limiter.ts             # In-memory rate limiter (4 tiers)
│   ├── api-guard.ts                # withSecurity + validateBody helpers
│   ├── audit-log.ts                # logAudit + helpers (login, CRUD, invite)
│   └── error-tracking.ts           # Sentry-ready error capture
└── middleware.ts                    # Auth check + security headers

supabase/
├── schema.sql                      # Database schema + RLS + triggers
└── migrations/
    ├── 003_webhook_schedule.sql    # webhook_token, schedule, schedule_enabled
    ├── 004_realtime.sql            # Add workflow_runs + run_logs to publication
    ├── 005_realtime_nodes.sql      # Add workflow_nodes to publication
    └── 006_audit_logs.sql          # Audit log table + RLS + indexes

public/
└── manifest.json                   # PWA manifest
```

---

## Database Schema

10 bảng chính:

| Table | Mô tả |
|---|---|
| `profiles` | Thông tin user (link `auth.users`) |
| `workspaces` | Công ty / đội làm việc (plan, stripe_session_id) |
| `members` | Thành viên + vai trò (owner / admin / member) |
| `workflows` | Quy trình tự động (name, trigger_type, status, schedule, webhook_token) |
| `workflow_nodes` | Nodes + edges trên canvas (jsonb) |
| `workflow_runs` | Mỗi lần chạy (status, trigger, started_at, finished_at, error) |
| `run_logs` | Log từng bước trong 1 run (node_id, status, input, output, error) |
| `integrations` | Cấu hình tích hợp workspace (Slack, Email, Notion) |
| `invitations` | Lời mời thành viên (email, role, token, expires) |
| `audit_logs` | Log hành động (user, action, entity, metadata, ip) |

**Security**: Row Level Security (RLS) trên mọi bảng. User chỉ truy cập dữ liệu workspace mình là thành viên.

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
| `POST /api/test/run-workflow` | Tạo + chạy workflow test |
| `GET /api/health` | Health check (DB + Redis) |

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

### Workflows
| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/workflows` | List (by workspace) |
| POST | `/api/workflows` | Tạo (Zod + plan limit + audit) |
| GET | `/api/workflows/[id]` | Get + nodes |
| PUT | `/api/workflows/[id]` | Update metadata / nodes |
| DELETE | `/api/workflows/[id]` | Xoá |
| POST | `/api/workflows/[id]/run` | Chạy workflow |
| GET | `/api/workflows/[id]/runs` | Lịch sử |
| PUT | `/api/workflows/[id]/schedule` | Bật/tắt schedule |
| GET | `/api/workflows/runs/[runId]/logs` | Log chi tiết |

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
| RLS | Per-table policies, `is_member()` security definer |
| Rate limit | In-memory per-IP (4 tiers by route) |
| Input validation | Zod schemas on all POST bodies |
| Security headers | nosniff, DENY, strict-origin-when-cross-origin, permissions |
| Audit trail | `audit_logs` table (action, entity, IP, timestamp) |
| Webhook | HMAC-SHA256 signature verification (Stripe) |
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
- [ ] **Phase 7**: Mở rộng
  - [ ] 50+ integrations (Google, Trello, Asana...)
  - [ ] Multi-language (EN)
  - [ ] Mobile app (React Native / PWA enhancement)
  - [ ] AI assistant (gợi ý workflow từ mô tả)

---

## Giấy phép

MIT
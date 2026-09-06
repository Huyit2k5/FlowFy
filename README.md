# Flowly

Nền tảng tự động hóa quy trình làm việc cho doanh nghiệp SMB Việt Nam.

Giao diện tiếng Việt, giá VND, hỗ trợ 24/7.

---

## Tổng quan

Flowly là SaaS giúp đội ngũ tự động hóa quy trình lặp lại: nhận webhook → xử lý → gửi Slack/Email/Notion, chạy định kỳ theo cron, cộng tác realtime trên canvas.

**MVP hoàn thành: Phase 1–5** (Auth, Workflow Engine, Webhook/Schedule, Integrations, Real-time Collab).

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
| Language | TypeScript 5 |
| Email | Resend API (fallback: simulate) |
| Notifications | Slack incoming webhook, Notion API |

---

## Cấu trúc thư mục

```
src/
├── app/
│   ├── page.tsx                    # Landing page (marketing)
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Tailwind + theme
│   ├── login/                      # Đăng nhập
│   ├── register/                   # Đăng ký
│   ├── onboarding/                 # Tạo workspace đầu tiên
│   ├── auth/                       # Layout chung cho auth pages
│   ├── app/
│   │   ├── page.tsx                # Redirect /app → workspace đầu tiên
│   │   └── [id]/
│   │       ├── page.tsx            # Dashboard tổng quan
│   │       ├── layout.tsx          # App shell (sidebar + header)
│   │       ├── members/            # Quản lý thành viên + mời
│   │       ├── settings/           # Cài đặt workspace
│   │       ├── integrations/       # Cấu hình tích hợp (Slack/Email/Notion)
│   │       └── workflows/
│   │           ├── page.tsx        # Danh sách workflow
│   │           └── [workflowId]/
│   │               └── page.tsx    # Canvas editor + run history
│   └── api/
│       ├── auth/
│       │   ├── signin/             # POST đăng nhập
│       │   ├── signup/             # POST đăng ký
│       │   └── signout/            # POST đăng xuất
│       ├── workspaces/
│       │   ├── route.ts            # GET/POST workspace
│       │   └── invites/
│       │       ├── route.ts        # POST mời thành viên (enforce plan limit)
│       │       └── accept/         # POST xác nhận lời mời
│       ├── workflows/
│       │   ├── route.ts            # GET/POST (enforce workflow limit)
│       │   └── [id]/
│       │       ├── route.ts        # GET/PUT/DELETE
│       │       ├── run/            # POST chạy workflow
│       │       ├── runs/           # GET lịch sử
│       │       └── schedule/       # PUT bật/tắt schedule (BullMQ)
│       ├── integrations/           # CRUD tích hợp workspace
│       ├── webhooks/[id]/          # Public webhook trigger (service role)
│       └── test/
│           ├── run-workflow/       # Test endpoint (xóa trước deploy)
│           └── phase5/             # Phase 5 test suite (14 tests)
├── components/
│   ├── app-shell.tsx               # Sidebar + header (nav: Workflows, Tích hợp, Thành viên, Cài đặt)
│   ├── login-form.tsx              # Form đăng nhập (redirect: "manual")
│   ├── register-form.tsx           # Form đăng ký
│   ├── onboarding-form.tsx         # Form tạo workspace
│   ├── invite-form.tsx             # Form mời thành viên
│   ├── workflow-list-client.tsx    # Danh sách + tạo + xoá workflow
│   ├── workflow-canvas.tsx         # Canvas React Flow + Realtime + Presence
│   ├── flow-node.tsx               # Custom node component
│   ├── node-config-panel.tsx       # Config panel (7 loại node + webhook URL + schedule)
│   └── run-history.tsx             # Lịch sử chạy + log chi tiết (Realtime)
├── lib/
│   ├── supabase/
│   │   ├── browser.ts              # Supabase client (browser)
│   │   ├── server.ts               # Supabase client (server, cookies)
│   │   └── middleware.ts           # Update session token (middleware)
│   ├── workspaces.ts               # Helper: getCurrentWorkspace
│   ├── workflow-types.ts           # Types + Zod schemas (7 node types)
│   ├── workflow-db.ts              # CRUD: getWorkflow, saveWorkflowNodes, ...
│   ├── workflow-engine.ts          # Execution engine (7 runners + retry)
│   ├── workflow-queue.ts           # BullMQ: schedule + repeat jobs
│   └── plan-limits.ts              # Plan limits config (free/pro/enterprise)
└── middleware.ts                    # Bảo vệ routes /app (auth check)

supabase/
├── schema.sql                      # Database schema + RLS + triggers
└── migrations/
    ├── 003_webhook_schedule.sql    # webhook_token, schedule, schedule_enabled
    ├── 004_realtime.sql            # Add workflow_runs + run_logs to publication
    └── 005_realtime_nodes.sql      # Add workflow_nodes to publication
```

---

## Database Schema

9 bảng chính:

| Table | Mô tả |
|---|---|
| `profiles` | Thông tin user (link `auth.users`) |
| `workspaces` | Công ty / đội làm việc |
| `members` | Thành viên + vai trò (owner / admin / member) |
| `workflows` | Quy trình tự động (name, trigger_type, status, schedule, webhook_token) |
| `workflow_nodes` | Nodes + edges trên canvas (jsonb) |
| `workflow_runs` | Mỗi lần chạy (status, trigger, started_at, finished_at, error) |
| `run_logs` | Log từng bước trong 1 run (node_id, status, input, output, error) |
| `integrations` | Cấu hình tích hợp workspace (Slack, Email, Notion) |
| `invitations` | Lời mời thành viên (email, role, token, expires) |

**Security**: Row Level Security (RLS) trên mọi bảng. User chỉ truy cập dữ liệu workspace mình là thành viên.

**Realtime publication** (`supabase_realtime`): `workflows`, `workflow_nodes`, `workflow_runs`, `run_logs`.

---

## Các Phase đã triển khai

### Phase 1: Auth + Workspace + Dashboard ✅

**Mục tiêu**: Nền tảng xác thực + quản lý workspace.

**Kết quả**:

1. **Authentication**
   - Đăng ký / đăng nhập / đăng xuất (email + mật khẩu, Supabase Auth)
   - Middleware bảo vệ routes: đã login vào `/app`, chưa login về `/login`
   - Tạo profile tự động khi đăng ký (trigger on `auth.users`)
   - `redirect: "manual"` tránh Server Action intercept

2. **Multi-tenant Workspace**
   - Onboarding: tạo workspace đầu tiên sau đăng ký
   - Switch workspace trong sidebar
   - Mời thành viên bằng email (chỉ owner/admin)
   - Phân quyền: owner / admin / member
   - Accept invitation qua token

3. **Dashboard**
   - Tổng quan: số workflow, lượt chạy, thành viên, lỗi
   - Danh sách workflow gần đây (5)
   - Lịch sử chạy gần đây (8)
   - Responsive: grid 2→4 cols, text scale mobile

4. **Infra**
   - Supabase clients (browser, server, middleware)
   - Database schema 9 bảng + RLS + triggers
   - Landing page marketing

**Routes**: `/`, `/login`, `/register`, `/onboarding`, `/app`, `/app/[id]`, `/app/[id]/members`, `/app/[id]/settings`

---

### Phase 2: Workflow Engine ✅

**Mục tiêu**: Lõi sản phẩm — canvas kéo-thả + execution engine.

**Kết quả**:

1. **Canvas Editor (React Flow)**
   - Kéo-thả node, nối bằng edge
   - Palette 7 loại node
   - Panel config bên phải (form cho từng loại)
   - Minimap, controls, fit-view, delete key
   - Lưu / Chạy workflow
   - Dirty indicator ("• chưa lưu")

2. **7 loại Node**

   | Node | Icon | Mô tả | Config chính |
   |---|---|---|---|
   | Trigger | ▶ | Manual / Webhook / Schedule (cron) | `triggerType`, `scheduleCron` |
   | Webhook/HTTP | 🔗 | Gọi API bất kỳ | `method`, `url`, `headers`, `body`, `timeout` |
   | Slack | 💬 | Gửi tin qua incoming webhook | `webhookUrl`, `text`, `channel` |
   | Email | ✉ | Gửi email qua Resend | `to`, `subject`, `body`, `html` |
   | Notion | 📄 | Tạo page trong Notion | `notionToken`, `pageId`, `action`, `content` |
   | Condition | ⋔ | Branching true/false | `expression` |
   | Delay | ⏱ | Chờ N giây | `seconds` (1–86400) |

3. **Execution Engine** (`src/lib/workflow-engine.ts`)
   - Chạy tuần tự theo topological order (BFS từ trigger node)
   - Template `{{nodeId.field}}` tham chiếu output node trước
   - Ghi `workflow_runs` + `run_logs` cho từng bước
   - **Retry logic**: 3 attempts, exponential backoff (1s → 2s → 4s), chỉ retry lỗi mạng (timeout, ECONN, fetch, network, EAI_AGAIN, ENOTFOUND)
   - Accept optional `supabase` param (service role) để bypass RLS cho public endpoints

4. **Run History UI**
   - `/app/[id]/workflows/[workflowId]` — Canvas + run history panel
   - Chọn run → xem log chi tiết từng node (input, output, error, timestamp)
   - Status badges: Thành công / Đang chạy / Lỗi / Hủy

5. **API**
   - `GET/POST /api/workflows` — list / create (enforce plan limit)
   - `GET/PUT/DELETE /api/workflows/[id]` — get / update / delete
   - `POST /api/workflows/[id]/run` — chạy workflow
   - `GET /api/workflows/[id]/runs` — lịch sử
   - `GET /api/workflows/runs/[runId]/logs` — log chi tiết

**Routes mới**: `/app/[id]/workflows`, `/app/[id]/workflows/[workflowId]`

---

### Phase 3: Webhook + Real-time Log + Schedule ✅

**Mục tiêu**: Trigger ngoài + theo dõi realtime + chạy định kỳ.

**Kết quả**:

1. **Webhook Trigger** (public endpoint)
   - `POST /api/webhooks/:token` — không cần auth
   - Dùng `SUPABASE_SERVICE_ROLE_KEY` để bypass RLS
   - Tạo workflow run + inject payload vào `ctx.data["trigger"]`
   - Webhook URL hiển thị trong node config panel
   - Migration: `003_webhook_schedule.sql` (cột `webhook_token`)

2. **Real-time Run Log**
   - Subscribe Supabase Realtime trên `run_logs` (INSERT/UPDATE) + `workflow_runs` (UPDATE)
   - Log mới hiện ngay khi workflow đang chạy
   - Status tự cập nhật: running → success/failed
   - Migration: `004_realtime.sql`

3. **Schedule + BullMQ**
   - Trigger node loại "Định kỳ" → nhập cron expression
   - `PUT /api/workflows/[id]/schedule` — bật/tắt
   - BullMQ `upsertJobScheduler` (cron) + `repeatable` job
   - `createWorker()` — worker xử lý job (chạy `executeWorkflow`)
   - Env: `UPSTASH_REDIS_URL` (hoặc local `redis://localhost:6379`)
   - Migration: `003_webhook_schedule.sql` (cột `schedule`, `schedule_enabled`)

4. **Node Config Panel nâng cấp**
   - Trigger node: chọn loại (manual/webhook/schedule), nhập cron, hiển thị webhook URL
   - Webhook URL có nút copy

---

### Phase 4: Integrations + Retry ✅

**Mục tiêu**: Quản lý tích hợp workspace + retry logic.

**Kết quả**:

1. **Integration Settings UI**
   - `/app/[id]/integrations` — trang cấu hình tích hợp
   - 3 loại: Slack (webhook URL), Email (Resend API key + from), Notion (token + page ID)
   - Mỗi integration: active/inactive toggle, config fields
   - CRUD: thêm, sửa, xoá

2. **CRUD API**
   - `GET/POST /api/integrations` — list / create
   - `PUT/DELETE /api/integrations/[id]` — update / delete
   - Scoped theo workspace_id

3. **Integration Fallback trong Engine**
   - Runner Slack/Email/Notion: nếu node không có config → đọc từ `ctx.data.__integrations` (workspace-level)
   - Email: không có API key → simulate (log + success)
   - Slack: không có webhook → error rõ ràng

4. **Retry Logic**
   - 3 attempts per node
   - Exponential backoff: 1s → 2s → 4s
   - Chỉ retry lỗi mạng: `timeout`, `ECONN`, `fetch`, `network`, `EAI_AGAIN`, `ENOTFOUND`
   - Lỗi logic (4xx, validation) → fail ngay, không retry

5. **Sidebar nav**: thêm link "Tích hợp" (PlugIcon)

**Tests**: 15/15 passed (`/api/test/run-workflow`)

---

### Phase 5: Canvas Real-time Collab + Presence + UI Polish ✅

**Mục tiêu**: Cộng tác realtime trên canvas + presence + responsive.

**Kết quả**:

1. **Canvas Real-time Collaboration**
   - Subscribe `workflow_nodes` UPDATE (filtered by `workflow_id`)
   - Khi người khác lưu → canvas tự cập nhật nodes + edges
   - `isSavingRef` chống self-update loop (set true on save, reset after 1s, early return in handler)
   - Badge "⚡ Người khác vừa cập nhật" hiện 3s rồi ẩn
   - Channel: `canvas-{workflowId}`, cleanup on unmount

2. **Presence (Ai đang online)**
   - Supabase Realtime Presence trên channel `presence-{workflowId}`
   - `channel.track()` với `{ user_id, username, avatar_url, last_seen }`
   - Handlers: `sync`, `join`, `leave`
   - UI: avatar (chữ cái đầu tên) max 3 + "+N" overflow
   - Hiển thị trên toolbar canvas

3. **UI Polish**
   - Dashboard responsive: grid 2→4 cols, text 2xl→3xl, hide hint on mobile
   - Empty states: workflows list, dashboard workflows, dashboard runs
   - Canvas: remote update indicator, presence avatars, dirty state

4. **Migration**: `005_realtime_nodes.sql` — đảm bảo `workflow_nodes` trong publication

**Tests**: 14/14 passed (`/api/test/phase5`)

---

## Plan Limits

| Gói | Members | Workflows | Storage |
|---|---|---|---|
| Free | 3 | 5 | 1 GB |
| Pro | ∞ | ∞ | 100 GB |
| Enterprise | ∞ | ∞ | ∞ |

Enforced tại:
- `POST /api/workflows` — chặn khi vượt workflow limit
- `POST /api/workspaces/invites` — chặn khi vượt member limit
- Unknown plan → fallback Free

Config: `src/lib/plan-limits.ts`

---

## Biến môi trường

| Biến | Mô tả | Nguồn |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase | Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (công khai) | Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server-only, bypass RLS) | Dashboard → Settings → API |
| `UPSTASH_REDIS_URL` | Redis cho BullMQ (schedule) | Upstash / local |
| `RESEND_API_KEY` | Resend API (email thật) | resend.com (optional) |

**Lưu ý**: `SUPABASE_SERVICE_ROLE_KEY` KHÔNG được expose ra client. Chỉ dùng trong route handlers / server components.

---

## Chạy dự án

### Yêu cầu
- Node.js 18+
- Supabase project (miễn phí)
- (Optional) Redis: Upstash hoặc local (`docker run -p 6379:6379 redis:alpine`)

### Cài đặt

```bash
# 1. Clone repo
git clone <repo-url>
cd FlowFy

# 2. Cài dependencies
npm install

# 3. Tạo .env.local
cp .env.example .env.local
# Sửa .env.local:
# NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YOUR_KEY
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
# UPSTASH_REDIS_URL=rediss://...  (optional, cho schedule)

# 4. Chạy schema database
# Mở Supabase Dashboard → SQL Editor:
#   - Dán nội dung supabase/schema.sql → Run
#   - Dán nội dung supabase/migrations/003_webhook_schedule.sql → Run
#   - Dán nội dung supabase/migrations/004_realtime.sql → Run
#   - Dán nội dung supabase/migrations/005_realtime_nodes.sql → Run

# 5. Chạy dev server
npm run dev
```

### Lint & Build

```bash
npm run lint      # ESLint
npm run build     # Production build
npm run dev       # Dev server (port 3000)
```

### Test Endpoints (dev only — xóa trước deploy)

| Endpoint | Mô tả |
|---|---|
| `GET /api/test/phase5` | Phase 5 test suite (14 tests: collab, presence, plan limits, UI) |
| `POST /api/test/run-workflow` | Tạo + chạy workflow test (Trigger → Delay → Webhook) |

---

## API Reference

### Auth

| Method | Route | Mô tả |
|---|---|---|
| POST | `/api/auth/signin` | Đăng nhập (email, password) |
| POST | `/api/auth/signup` | Đăng ký (email, password) |
| POST | `/api/auth/signout` | Đăng xuất |

### Workspaces

| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/workspaces` | List workspaces của user |
| POST | `/api/workspaces` | Tạo workspace |
| POST | `/api/workspaces/invites` | Mời thành viên (enforce plan limit) |
| POST | `/api/workspaces/invites/accept` | Accept invitation |

### Workflows

| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/workflows` | List workflows (by workspace) |
| POST | `/api/workflows` | Tạo workflow (enforce plan limit) |
| GET | `/api/workflows/[id]` | Get workflow + nodes |
| PUT | `/api/workflows/[id]` | Update metadata / nodes / edges |
| DELETE | `/api/workflows/[id]` | Xoá workflow |
| POST | `/api/workflows/[id]/run` | Chạy workflow |
| GET | `/api/workflows/[id]/runs` | Lịch sử chạy |
| PUT | `/api/workflows/[id]/schedule` | Bật/tắt schedule (BullMQ) |
| GET | `/api/workflows/runs/[runId]/logs` | Log chi tiết 1 run |

### Integrations

| Method | Route | Mô tả |
|---|---|---|
| GET | `/api/integrations` | List integrations (by workspace) |
| POST | `/api/integrations` | Tạo integration |
| PUT | `/api/integrations/[id]` | Update |
| DELETE | `/api/integrations/[id]` | Xoá |

### Webhook (Public)

| Method | Route | Mô tả |
|---|---|---|
| POST | `/api/webhooks/[token]` | Trigger workflow (không cần auth) |

---

## Execution Engine — chi tiết

```
executeWorkflow({ workflowId, workspaceId, trigger, input?, supabase? })
│
├── 1. Tạo workflow_run (status: "running")
├── 2. Load nodes + edges từ workflow_nodes
├── 3. Load integrations workspace → ctx.data.__integrations
├── 4. BFS từ trigger node:
│   ├── Mỗi node: create run_log → execute runner → update run_log
│   ├── Retry: 3 attempts, backoff 1s→2s→4s (chỉ lỗi mạng)
│   ├── Success: output → ctx.data[nodeId]
│   ├── Failed: stop, mark run failed
│   └── Next: follow edges
└── 5. Update workflow_run (status: "success" | "failed")
```

**Template interpolation**: `{{nodeId.field}}` trong config string → thay bằng output node trước.

**Ctx structure**:
```ts
{
  data: {
    [nodeId]: runnerOutput,     // output từng node
    "trigger": webhookPayload,  // input từ webhook
    "__integrations": {         // workspace-level config
      slack: { webhookUrl, ... },
      email: { apiKey, from, ... },
      notion: { token, pageId, ... }
    }
  }
}
```

---

## Realtime Architecture

```
Browser A (Tab 1)                    Browser B (Tab 2)
     │                                    │
     │── save (PUT /api/workflows/:id) ──→│
     │                                    │
     │         Supabase Realtime          │
     │   (workflow_nodes UPDATE)          │
     │                                    │
     │←── payload (new nodes+edges) ──────│
     │   isSavingRef=true → skip (A)     │
     │                                    │
     │   isSavingRef=false → update      │
     │   setRemoteUpdate(true) → badge   │
```

**Presence**:
```
Tab A: channel.track({ user_id, username, ... })
Tab B: channel.on("presence", { event: "join" }) → shows avatar
Tab A closes: channel.on("presence", { event: "leave" }) → removes avatar
```

---

## Lỗi gặp phải & cách xử lý

| # | Error | Nguyên nhân | Fix |
|---|---|---|---|
| 1 | `row-level security policy` | User chưa có row `profiles` | Function `create_workspace` security definer |
| 2 | `stack depth limit exceeded` | RLS `is_member` gọi `members` → vòng lặp | `is_member` security definer |
| 3 | Login 307 redirect | Server Action intercept | `redirect: "manual"` trong form |
| 4 | Webhook 403 (RLS) | Anon key không bypass RLS | Dùng `SERVICE_ROLE_KEY` |
| 5 | Table `workflow_run_logs` không tồn tại | Sai tên table | Đúng tên: `run_logs` |
| 6 | BullMQ type errors | `upsertJobScheduler` API thay đổi | Dùng đúng signature v6 |
| 7 | Presence TypeScript errors | Supabase type mismatch | Cast qua `unknown` |

---

## Roadmap

- [x] **Phase 1**: Auth + Workspace + Dashboard
- [x] **Phase 2**: Workflow Engine (React Flow + 7 nodes + Execution)
- [x] **Phase 3**: Webhook + Real-time log + Schedule (BullMQ)
- [x] **Phase 4**: Integrations (Slack/Email/Notion) + Retry
- [x] **Phase 5**: Canvas Real-time Collab + Presence + UI Polish
- [ ] **Phase 6**: Production Hardening + Monetization
  - [ ] 6.1: Billing & Upgrade (Stripe, pricing page, plan enforcement)
  - [ ] 6.2: Security (rate limiting, Zod validation, security headers, audit log)
  - [ ] 6.3: Performance & SEO (loading states, error boundaries, PWA, OG tags)
  - [ ] 6.4: Admin & Observability (admin dashboard, health check, Sentry)
  - [ ] 6.5: Deployment (Vercel, CI/CD, load test)

---

## Giấy phép

MIT
# Flowly

Nền tảng tự động hóa quy trình làm việc cho doanh nghiệp.

## Tổng quan

Flowly là SaaS (Software-as-a-Service) giúp đội ngũ quản lý công việc, tự động hóa quy trình lặp lại và cộng tác hiệu quả hơn. Mục tiêu: thị trường SMB Việt Nam với giao diện tiếng Việt, giá VND, hỗ trợ 24/7.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS 4 |
| Backend | Supabase (Auth + PostgreSQL + Realtime + Storage) |
| Workflow Canvas | React Flow (@xyflow/react) |
| Validation | Zod |
| Language | TypeScript |

## Cấu trúc thư mục

```
src/
├── app/
│   ├── page.tsx              # Landing page (marketing)
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Tailwind + theme
│   ├── login/                # Trang đăng nhập
│   ├── register/             # Trang đăng ký
│   ├── onboarding/           # Tạo workspace đầu tiên
│   ├── auth/                 # Layout chung cho auth pages
│   ├── app/
│   │   ├── page.tsx          # Redirect /app → workspace đầu tiên
│   │   └── [id]/             # Routes theo workspace
│   │       ├── page.tsx      # Dashboard tổng quan
│   │       ├── layout.tsx    # App shell (sidebar, header)
│   │       ├── members/      # Quản lý thành viên + mời
│   │       ├── settings/     # Cài đặt workspace
│   │       └── workflows/
│   │           ├── page.tsx  # Danh sách workflow
│   │           └── [workflowId]/
│   │               └── page.tsx  # Canvas editor + run history
│   └── api/
│       ├── auth/
│       │   ├── signin/       # POST đăng nhập
│       │   ├── signup/       # POST đăng ký
│       │   └── signout/      # POST đăng xuất
│       ├── workspaces/
│       │   ├── route.ts      # GET/POST workspace
│       │   └── invites/
│       │       ├── route.ts  # POST mời thành viên
│       │       └── accept/   # POST xác nhận lời mời
│       └── workflows/
│           ├── route.ts      # GET/POST workflow
│           ├── [id]/
│           │   ├── route.ts  # GET/PUT/DELETE workflow
│           │   ├── run/      # POST chạy workflow
│           │   └── runs/     # GET lịch sử chạy
│           └── runs/[runId]/logs/  # GET log chi tiết
├── components/
│   ├── Header.tsx            # Header landing page
│   ├── Hero.tsx              # Hero section
│   ├── Features.tsx          # Tính năng
│   ├── HowItWorks.tsx        # Quy trình
│   ├── Pricing.tsx           # Bảng giá
│   ├── FAQ.tsx               # FAQ
│   ├── Testimonials.tsx      # Khách hàng
│   ├── LogoCloud.tsx         # Logo khách hàng
│   ├── CTA.tsx               # Call-to-action
│   ├── Footer.tsx            # Footer
│   ├── app-shell.tsx         # Sidebar + header app
│   ├── onboarding-form.tsx   # Form tạo workspace
│   ├── login-form.tsx        # Form đăng nhập
│   ├── invite-form.tsx       # Form mời thành viên
│   ├── workflow-list-client.tsx  # Danh sách workflow (client)
│   ├── workflow-canvas.tsx   # Canvas React Flow
│   ├── flow-node.tsx         # Node component
│   ├── node-config-panel.tsx # Form config node
│   └── run-history.tsx       # Lịch sử chạy + log
├── lib/
│   ├── supabase/
│   │   ├── browser.ts        # Supabase client (browser)
│   │   ├── server.ts         # Supabase client (server)
│   │   └── middleware.ts     # Update session (middleware)
│   ├── workspaces.ts         # Helper workspace
│   ├── workflow-types.ts     # Types + zod schemas
│   ├── workflow-db.ts        # CRUD workflow/nodes/runs
│   └── workflow-engine.ts    # Execution engine
└── middleware.ts             # Bảo vệ routes app
supabase/
└── schema.sql                # Database schema + RLS + triggers
```

## Database Schema (Supabase)

8 bảng chính:

| Table | Mô tả |
|---|---|
| `profiles` | Thông tin user (link với `auth.users`) |
| `workspaces` | Công ty/đội làm việc |
| `members` | Thành viên + vai trò (owner/admin/member) |
| `workflows` | Quy trình tự động |
| `workflow_nodes` | Node + edge trên canvas (jsonb) |
| `workflow_runs` | Mỗi lần chạy workflow |
| `run_logs` | Log từng bước trong 1 run |
| `integrations` | Cấu hình tích hợp (Slack, Email, Notion...) |

**Security**: Row Level Security (RLS) trên mọi bảng — user chỉ truy cập dữ liệu workspace mình là thành viên.

## Các Phase đã triển khai

### Phase 1: Auth + Workspace + Dashboard ✅

**Mục tiêu**: Nền tảng xác thực + quản lý workspace.

**Kết quả**:

1. **Authentication**
   - Đăng ký / đăng nhập / đăng xuất (email + mật khẩu qua Supabase Auth)
   - Middleware bảo vệ routes: đã login vào `/app`, chưa login về `/login`
   - Tạo profile tự động khi đăng ký

2. **Multi-tenant Workspace**
   - Onboarding: tạo workspace đầu tiên sau đăng ký
   - Switch workspace trong sidebar
   - Mời thành viên bằng email (chỉ owner/admin)
   - Phân quyền: owner / admin / member

3. **Dashboard**
   - Tổng quan: số workflow, lượt chạy, thành viên, lỗi
   - Danh sách workflow gần đây
   - Lịch sử chạy gần đây

4. **Infra**
   - Supabase clients (browser, server, middleware)
   - Database schema 8 bảng + RLS + triggers
   - Landing page marketing (giữ nguyên từ template)

**Routes**:
- `/` — Landing page
- `/login`, `/register` — Auth
- `/onboarding` — Tạo workspace
- `/app` — Redirect → workspace đầu tiên
- `/app/[id]` — Dashboard
- `/app/[id]/members` — Thành viên
- `/app/[id]/settings` — Cài đặt

---

### Phase 2: Workflow Engine ✅

**Mục tiêu**: Lõi sản phẩm — canvas kéo-thả + execution engine.

**Kết quả**:

1. **Canvas Editor (React Flow)**
   - Kéo-thả node, nối bằng edge
   - Palette 7 loại node
   - Panel config bên phải (form cho từng loại)
   - Minimap, controls, fit-view
   - Lưu / Chạy workflow

2. **7 loại Node**
   | Node | Mô tả |
   |---|---|
   | Trigger | Manual / Webhook / Schedule (cron) |
   | Webhook/HTTP | Gọi API bất kỳ (GET/POST/PUT/PATCH/DELETE) |
   | Slack | Gửi tin qua incoming webhook |
   | Email | Gửi email (MVP: simulated, log) |
   | Notion | Tạo page (cần token + parent page id) |
   | Condition | Branching true/false |
   | Delay | Chờ N giây |

3. **Execution Engine**
   - Chạy tuần tự theo topological order
   - Template `{{nodeId.field}}` tham chiếu output node trước
   - Ghi `workflow_runs` + `run_logs` cho từng bước
   - Kết quả: success / failed + lỗi cụ thể

4. **UI**
   - `/app/[id]/workflows` — Danh sách + tạo + xoá
   - `/app/[id]/workflows/[workflowId]` — Canvas + run history
   - Run history: chọn run → xem log chi tiết từng node

5. **API**
   - `GET/POST /api/workflows` — list / create
   - `GET/PUT/DELETE /api/workflows/[id]` — get / update / delete
   - `POST /api/workflows/[id]/run` — chạy workflow
   - `GET /api/workflows/[id]/runs` — lịch sử
   - `GET /api/workflows/runs/[runId]/logs` — log chi tiết

**Routes mới**:
- `/app/[id]/workflows` — Danh sách workflow
- `/app/[id]/workflows/[workflowId]` — Canvas editor

---

### Phase 3: Cộng tác + Realtime (chưa triển khai)

**Kế hoạch**:
- Real-time collab (Supabase Realtime / WebSocket)
- Comment, mention trên workflow
- Schedule tự chạy (BullMQ + Redis)
- Dashboard báo cáo hiệu suất

### Phase 4: Tích hợp mở rộng (chưa triển khai)

**Kế hoạch**:
- 50+ tích hợp (Google Workspace, Trello, Asana...)
- SMTP provider thật cho Email (Resend / SendGrid)
- API key management

### Phase 5: Thanh toán (chưa triển khai)

**Kế hoạch**:
- Subscription: Free / Pro (299k/tháng) / Enterprise
- Stripe + VNPay / MoMo
- Limit theo gói (số workflow, thành viên, storage)

### Phase 6: Bảo mật & Launch (chưa triển khai)

**Kế hoạch**:
- Mã hóa, audit log, rate limiting
- Trang pháp lý, chính sách bảo mật
- Load test, monitoring

## Chạy dự án

### Yêu cầu
- Node.js 18+
- Supabase project (miễn phí)

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

# 4. Chạy schema database
# Mở Supabase Dashboard → SQL Editor → dán nội dung supabase/schema.sql → Run

# 5. Chạy dev server
npm run dev
```

### Biến môi trường

| Biến | Mô tả | Nguồn |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase | Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (công khai) | Dashboard → Settings → API |

### Lint & Build

```bash
npm run lint    # ESLint
npm run build   # Production build
npm run dev     # Dev server
```

## Lỗi gặp phải & cách xử lý

### 1. `new row violates row-level security policy for table "workspaces"`

**Nguyên nhân**: User chưa có row trong `profiles` (trigger không chạy vì đăng ký trước khi có schema). RLS policy `workspaces: insert own` kiểm tra `created_by = auth.uid()` nhưng FK fail.

**Fix**: Tạo function `create_workspace` với `security definer` — tự tạo profile + workspace + member, bypass RLS.

### 2. `stack depth limit exceeded` (vòng lặp vô hạn)

**Nguyên nhân**: Function `is_member(ws)` query bảng `members`. RLS on `members` cũng gọi `is_member` → vòng lặp: `is_member` → query `members` → RLS → `is_member` → ...

**Fix**: Thêm `security definer` cho `is_member` — chạy với quyền owner, bypass RLS khi query `members`.

## Roadmap

- [x] Phase 1: Auth + Workspace + Dashboard
- [x] Phase 2: Workflow Engine (React Flow + Execution)
- [ ] Phase 3: Real-time Collab + Schedule (BullMQ)
- [ ] Phase 4: Mở rộng tích hợp + Email thật
- [ ] Phase 5: Thanh toán (Stripe + VNPay)
- [ ] Phase 6: Bảo mật + Monitoring + Launch

## Giấy phép

MIT
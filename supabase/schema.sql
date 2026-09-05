-- =============================================================
-- Flowly - Database Schema (Supabase / PostgreSQL)
-- Chạy file này trong Supabase SQL Editor.
-- =============================================================

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- WORKSPACES ----------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  plan text not null default 'free',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- MEMBERS ----------
-- user_id NULL khi là lời mời (chưa có tài khoản)
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  invited_email text,
  status text not null default 'active' check (status in ('active', 'invited')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists members_workspace_idx on public.members (workspace_id);
create index if not exists members_user_idx on public.members (user_id);

-- ---------- WORKFLOWS ----------
create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null default 'manual',
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workflows_workspace_idx on public.workflows (workspace_id);

-- ---------- WORKFLOW NODES ----------
create table if not exists public.workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  nodes jsonb not null default '[]',
  edges jsonb not null default '[]',
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

-- ---------- WORKFLOW RUNS ----------
create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  status text not null default 'running' check (status in ('running', 'success', 'failed', 'cancelled')),
  trigger text not null default 'manual',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text
);

create index if not exists runs_workflow_idx on public.workflow_runs (workflow_id);
create index if not exists runs_workspace_idx on public.workflow_runs (workspace_id);

-- ---------- RUN LOGS ----------
create table if not exists public.run_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.workflow_runs (id) on delete cascade,
  node_id text,
  node_label text,
  status text not null default 'pending' check (status in ('pending', 'running', 'success', 'failed', 'skipped')),
  input jsonb,
  output jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists run_logs_run_idx on public.run_logs (run_id);

-- ---------- INTEGRATIONS ----------
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type text not null check (type in ('webhook', 'slack', 'email', 'notion', 'google')),
  name text not null,
  config jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists integrations_workspace_idx on public.integrations (workspace_id);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.members enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_nodes enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.run_logs enable row level security;
alter table public.integrations enable row level security;

-- ---------- Profiles: user đọc/sửa chính mình ----------
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- ---------- Helper: is_member(workspace_id) ----------
-- Dùng security definer để tránh RLS recursion (members RLS gọi is_member)
create or replace function public.is_member(ws uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.members
    where workspace_id = ws and user_id = auth.uid() and status = 'active'
  );
$$;

-- ---------- Workspaces: thấy workspace mình là thành viên ----------
create policy "workspaces: select member" on public.workspaces
  for select using (public.is_member(id));
create policy "workspaces: insert own" on public.workspaces
  for insert with check (
    created_by = auth.uid()
  );
create policy "workspaces: update member" on public.workspaces
  for update using (public.is_member(id));
create policy "workspaces: delete owner" on public.workspaces
  for delete using (
    exists (
      select 1 from public.members
      where workspace_id = id and user_id = auth.uid() and role = 'owner'
    )
  );

-- ---------- Members: đọc theo workspace, tạo invite (admin/owner) ----------
create policy "members: select" on public.members
  for select using (public.is_member(workspace_id));
create policy "members: insert invite" on public.members
  for insert with check (
    exists (
      select 1 from public.members
      where workspace_id = (select workspace_id from public.members where user_id = auth.uid() and status='active' limit 1)
        and user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
create policy "members: update role" on public.members
  for update using (
    exists (
      select 1 from public.members
      where workspace_id = (select workspace_id from public.members where user_id = auth.uid() and status='active' limit 1)
        and user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
create policy "members: delete" on public.members
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.members
      where workspace_id = (select workspace_id from public.members where user_id = auth.uid() and status='active' limit 1)
        and user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ---------- Workflows: theo workspace ----------
create policy "workflows: select" on public.workflows
  for select using (public.is_member(workspace_id));
create policy "workflows: insert" on public.workflows
  for insert with check (public.is_member(workspace_id));
create policy "workflows: update" on public.workflows
  for update using (public.is_member(workspace_id));
create policy "workflows: delete" on public.workflows
  for delete using (public.is_member(workspace_id));

-- ---------- Workflow nodes: theo workflow -> workspace ----------
create policy "workflow_nodes: select" on public.workflow_nodes
  for select using (
    exists (select 1 from public.workflows w where w.id = workflow_id and public.is_member(w.workspace_id))
  );
create policy "workflow_nodes: insert" on public.workflow_nodes
  for insert with check (
    exists (select 1 from public.workflows w where w.id = workflow_id and public.is_member(w.workspace_id))
  );
create policy "workflow_nodes: update" on public.workflow_nodes
  for update using (
    exists (select 1 from public.workflows w where w.id = workflow_id and public.is_member(w.workspace_id))
  );
create policy "workflow_nodes: delete" on public.workflow_nodes
  for delete using (
    exists (select 1 from public.workflows w where w.id = workflow_id and public.is_member(w.workspace_id))
  );

-- ---------- Workflow runs: theo workspace ----------
create policy "workflow_runs: select" on public.workflow_runs
  for select using (public.is_member(workspace_id));
create policy "workflow_runs: insert" on public.workflow_runs
  for insert with check (public.is_member(workspace_id));
create policy "workflow_runs: update" on public.workflow_runs
  for update using (public.is_member(workspace_id));

-- ---------- Run logs: theo run -> workspace ----------
create policy "run_logs: select" on public.run_logs
  for select using (
    exists (select 1 from public.workflow_runs r where r.id = run_id and public.is_member(r.workspace_id))
  );
create policy "run_logs: insert" on public.run_logs
  for insert with check (
    exists (select 1 from public.workflow_runs r where r.id = run_id and public.is_member(r.workspace_id))
  );
create policy "run_logs: update" on public.run_logs
  for update using (
    exists (select 1 from public.workflow_runs r where r.id = run_id and public.is_member(r.workspace_id))
  );

-- ---------- Integrations: theo workspace ----------
create policy "integrations: select" on public.integrations
  for select using (public.is_member(workspace_id));
create policy "integrations: insert" on public.integrations
  for insert with check (public.is_member(workspace_id));
create policy "integrations: update" on public.integrations
  for update using (public.is_member(workspace_id));
create policy "integrations: delete" on public.integrations
  for delete using (public.is_member(workspace_id));

-- =============================================================
-- TRIGGERS
-- =============================================================

-- Tự tạo profile khi user đăng ký (service role insert, fallback)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at tự động
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_workspaces_updated on public.workspaces;
create trigger trg_workspaces_updated before update on public.workspaces
  for each row execute function public.set_updated_at();

drop trigger if exists trg_workflows_updated on public.workflows;
create trigger trg_workflows_updated before update on public.workflows
  for each row execute function public.set_updated_at();

-- =============================================================
-- RPC: create_workspace (security definer để bypass RLS)
-- =============================================================
create or replace function public.create_workspace(p_name text, p_user uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_ws_id uuid;
  v_profile_exists boolean;
begin
  -- 1) Đảm bảo profile tồn tại
  select exists (select 1 from public.profiles where id = p_user) into v_profile_exists;
  if not v_profile_exists then
    insert into public.profiles (id, email, full_name)
    select p_user, coalesce(
      (select email from auth.users where id = p_user),
      p_user::text
    ),
    coalesce(
      (select raw_user_meta_data ->> 'full_name' from auth.users where id = p_user),
      (select split_part(coalesce(email, ''), '@', 1) from auth.users where id = p_user)
    )
    on conflict (id) do nothing;
  end if;

  -- 2) Tạo workspace
  insert into public.workspaces (name, created_by)
  values (p_name, p_user)
  returning id into v_ws_id;

  -- 3) Thêm user làm owner
  insert into public.members (workspace_id, user_id, role, status)
  values (v_ws_id, p_user, 'owner', 'active')
  on conflict (workspace_id, user_id) do nothing;

  return v_ws_id;
end;
$$;

grant execute on function public.create_workspace(text, uuid) to authenticated;

-- =============================================================
-- REALTIME (tùy chọn, bật cho cộng tác thời gian thực Phase 3)
-- =============================================================
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  alter publication supabase_realtime add table public.workflows;
  alter publication supabase_realtime add table public.workflow_nodes;
  alter publication supabase_realtime add table public.workflow_runs;
exception when duplicate_object then null;
end $$;
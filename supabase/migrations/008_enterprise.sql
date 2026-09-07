-- Phase 7.8: Enterprise Features
-- Run in Supabase SQL Editor

-- ---------- UPGRADE workflow_permissions to 5 roles ----------
alter table public.workflow_permissions
  alter column role type text
  using case role
    when 'view' then 'viewer'
    when 'run' then 'runner'
    when 'edit' then 'editor'
    else role
  end;

alter table public.workflow_permissions
  drop constraint if exists workflow_permissions_role_check;

alter table public.workflow_permissions
  add constraint workflow_permissions_role_check
  check (role in ('viewer', 'commenter', 'runner', 'editor', 'admin'));

-- ---------- WORKSPACE SECURITY (SSO, 2FA, IP allowlist, HMAC) ----------
create table if not exists public.workspace_security (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  -- SSO
  sso_enabled boolean not null default false,
  sso_provider text check (sso_provider in ('google', 'microsoft', 'okta', 'custom')),
  sso_client_id text default '',
  sso_client_secret text default '',
  sso_redirect_uri text default '',
  -- 2FA
  enforce_2fa boolean not null default false,
  -- IP allowlist (comma-separated CIDRs)
  ip_allowlist text default '',
  -- HMAC signing secret for webhooks
  hmac_secret text default '',
  -- Data retention
  retention_days int not null default 90,
  archive_inactive_days int not null default 180,
  -- Usage alerts
  usage_alert_80 boolean not null default true,
  usage_alert_95 boolean not null default true,
  -- Quota override (null = use plan limit)
  quota_workflows int,
  quota_members int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ws_security_workspace_idx on public.workspace_security (workspace_id);

alter table public.workspace_security enable row level security;

create policy "ws_security: select" on public.workspace_security
  for select using (
    workspace_id in (select workspace_id from public.members where user_id = auth.uid())
  );

create policy "ws_security: insert" on public.workspace_security
  for insert with check (
    workspace_id in (
      select workspace_id from public.members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "ws_security: update" on public.workspace_security
  for update using (
    workspace_id in (
      select workspace_id from public.members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "ws_security: delete" on public.workspace_security
  for delete using (
    workspace_id in (
      select workspace_id from public.members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ---------- AUDIT LOG EXPORT RETENTION ----------
-- (uses existing audit_logs table, just add index if missing)
create index if not exists audit_logs_workspace_time_idx
  on public.audit_logs (workspace_id, created_at desc);

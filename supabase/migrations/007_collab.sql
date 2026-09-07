-- Phase 7.7: Team Collaboration Advanced
-- Run in Supabase SQL Editor

-- ---------- WORKFLOW TEMPLATES ----------
create table if not exists public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  description text default '',
  nodes jsonb not null default '[]',
  edges jsonb not null default '[]',
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists templates_workspace_idx on public.workflow_templates (workspace_id);

alter table public.workflow_templates enable row level security;

create policy "templates: select" on public.workflow_templates
  for select using (
    workspace_id in (select workspace_id from public.members where user_id = auth.uid())
  );

create policy "templates: insert" on public.workflow_templates
  for insert with check (
    workspace_id in (select workspace_id from public.members where user_id = auth.uid())
  );

create policy "templates: update" on public.workflow_templates
  for update using (
    workspace_id in (select workspace_id from public.members where user_id = auth.uid())
  );

create policy "templates: delete" on public.workflow_templates
  for delete using (
    workspace_id in (select workspace_id from public.members where user_id = auth.uid())
  );

-- ---------- NODE COMMENTS ----------
create table if not exists public.node_comments (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  node_id text not null,
  user_id uuid,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_workflow_idx on public.node_comments (workflow_id, node_id);

alter table public.node_comments enable row level security;

create policy "comments: select" on public.node_comments
  for select using (
    workflow_id in (
      select w.id from public.workflows w
      join public.members wm on wm.workspace_id = w.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "comments: insert" on public.node_comments
  for insert with check (
    user_id = auth.uid()
    and workflow_id in (
      select w.id from public.workflows w
      join public.members wm on wm.workspace_id = w.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "comments: delete" on public.node_comments
  for delete using (
    user_id = auth.uid()
  );

-- ---------- WORKFLOW PERMISSIONS ----------
create table if not exists public.workflow_permissions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  user_id uuid not null,
  role text not null default 'view' check (role in ('view', 'edit', 'run')),
  created_at timestamptz not null default now(),
  unique (workflow_id, user_id)
);

create index if not exists perms_workflow_idx on public.workflow_permissions (workflow_id);
create index if not exists perms_user_idx on public.workflow_permissions (user_id);

alter table public.workflow_permissions enable row level security;

create policy "perms: select" on public.workflow_permissions
  for select using (
    workflow_id in (
      select w.id from public.workflows w
      join public.members wm on wm.workspace_id = w.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "perms: insert" on public.workflow_permissions
  for insert with check (
    workflow_id in (
      select w.id from public.workflows w
      where w.workspace_id in (
        select workspace_id from public.members
        where user_id = auth.uid() and role in ('owner', 'admin')
      )
    )
  );

create policy "perms: update" on public.workflow_permissions
  for update using (
    workflow_id in (
      select w.id from public.workflows w
      where w.workspace_id in (
        select workspace_id from public.members
        where user_id = auth.uid() and role in ('owner', 'admin')
      )
    )
  );

create policy "perms: delete" on public.workflow_permissions
  for delete using (
    workflow_id in (
      select w.id from public.workflows w
      where w.workspace_id in (
        select workspace_id from public.members
        where user_id = auth.uid() and role in ('owner', 'admin')
      )
    )
  );
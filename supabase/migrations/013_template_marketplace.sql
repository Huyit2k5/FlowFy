-- Phase 14: Template Marketplace
-- Adds public template support: publish to marketplace, category, install count, author profile.
-- Idempotent — safe to re-run.

alter table public.workflow_templates
  add column if not exists is_public boolean not null default false,
  add column if not exists category text not null default 'general',
  add column if not exists install_count integer not null default 0,
  add column if not exists published_at timestamptz,
  add column if not exists author_name text,
  add column if not exists author_avatar text;

-- Index for marketplace listing (public templates only)
create index if not exists templates_public_idx
  on public.workflow_templates (is_public, category, install_count desc)
  where is_public = true;

-- RLS: allow any authenticated user to read public templates
drop policy if exists "templates: select public" on public.workflow_templates;
create policy "templates: select public" on public.workflow_templates
  for select using (is_public = true or workspace_id in (select workspace_id from public.members where user_id = auth.uid()));

-- RLS: allow the owner (creator) to update publish status, category, install_count
-- The existing "templates: update" policy already covers workspace members, which is fine.

-- Helper view for marketplace queries (avoids leaking non-public templates)
drop view if exists public.template_marketplace;
create view public.template_marketplace as
  select
    wt.id,
    wt.name,
    wt.description,
    wt.category,
    wt.install_count,
    wt.author_name,
    wt.author_avatar,
    wt.published_at,
    wt.workspace_id,
    wt.nodes,
    wt.edges,
    w.name as workspace_name
  from public.workflow_templates wt
  join public.workspaces w on w.id = wt.workspace_id
  where wt.is_public = true;

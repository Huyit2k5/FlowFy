-- 012_scim_token.sql
-- Dedicated SCIM provisioning token (separate from HMAC webhook secret).
-- Prevents leaking the HMAC signing secret from also acting as a provisioning credential.

alter table public.workspace_security
  add column if not exists scim_token text default '';

create index if not exists ws_security_scim_token_idx
  on public.workspace_security (scim_token)
  where scim_token is not null and btrim(scim_token) != '';

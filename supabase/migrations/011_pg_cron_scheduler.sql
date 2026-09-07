-- 011_pg_cron_scheduler.sql
-- Schedule workflows using Supabase pg_cron + pg_net
-- Run in Supabase SQL Editor (as superuser)

-- 1. Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Next cron occurrence (simplified)
create or replace function public.next_cron_occurrence(cron_expr text, from_ts timestamptz)
returns timestamptz
language plpgsql
as $$
declare
  parts text[];
  min_val int;
  hr_val int;
  dow text;
  result timestamptz;
begin
  parts := regexp_split_to_array(trim(cron_expr), '\s+');
  if array_length(parts, 1) != 5 then
    return from_ts + interval '1 hour';
  end if;

  min_val := case when parts[1] = '*' then 0 else parts[1]::int end;
  hr_val  := case when parts[2] = '*' then 0 else parts[2]::int end;
  dow     := parts[5];

  result := date_trunc('day', from_ts)
    + make_interval(hours => hr_val, minutes => min_val);

  if result <= from_ts then
    result := result + interval '1 day';
  end if;

  return result;
end;
$$;

-- 3. Function: find due workflows and trigger Edge Function via pg_net
create or replace function public.trigger_due_workflows()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wf record;
  edge_url text;
  service_key text;
begin
  edge_url := 'https://' || current_setting('supabase.project_ref') || '.functions.co/run-scheduled-workflow';
  service_key := current_setting('supabase.service_role_key');

  for wf in
    select id, workspace_id, schedule, next_run_at
    from workflows
    where schedule_enabled = true
      and schedule is not null
      and btrim(schedule) != ''
      and next_run_at is not null
      and next_run_at <= now()
    limit 20
  loop
    -- Fire HTTP request to Edge Function (async)
    perform net.http_post(
      url := edge_url,
      body := jsonb_build_object(
        'workflow_id', wf.id::text,
        'workspace_id', wf.workspace_id::text
      ),
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || service_key,
        'apikey', service_key,
        'Content-Type', 'application/json'
      )
    );

    -- Update next_run_at
    update workflows
    set next_run_at = public.next_cron_occurrence(wf.schedule, now())
    where id = wf.id;
  end loop;
end;
$$;

-- 4. Schedule: run every minute
select cron.schedule(
  'flowly-scheduler',
  '* * * * *',
  $cron$select public.trigger_due_workflows()$cron$
);

-- 5. Grant execute to service_role
grant execute on function public.trigger_due_workflows() to service_role;
grant execute on function public.next_cron_occurrence(text, timestamptz) to service_role;

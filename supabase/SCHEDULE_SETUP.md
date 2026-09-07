# Schedule Workflows — Setup Guide (Supabase PG Cron + Edge Function)

## Architecture

```
PG Cron (every 1 min)
  → trigger_due_workflows() [Postgres function]
    → finds workflows where next_run_at <= now()
    → calls Edge Function via pg_net (HTTP POST)
      → run-scheduled-workflow [Edge Function]
        → loads nodes + edges
        → creates workflow_runs record
        → executes nodes (BFS)
        → logs to run_logs
        → updates next_run_at
```

## Setup Steps

### 1. Run SQL in Supabase

Copy and run `011_pg_cron_scheduler.sql` in Supabase SQL Editor.

> **Note:** If `pg_cron` or `pg_net` extensions are not available on your plan,
> see "Alternative" below.

### 2. Deploy Edge Function

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Link your project (one time)
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy run-scheduled-workflow
```

### 3. Verify

```bash
# Test the function manually
curl -X POST \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/run-scheduled-workflow" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"workflow_id":"<uuid>","workspace_id":"<uuid>"}'
```

### 4. Enable a schedule on a workflow

In the app: set cron on a workflow → `next_run_at` gets set →
PG Cron picks it up on the next minute tick.

## Alternative (if pg_cron/pg_net not available)

If your Supabase plan doesn't support `pg_cron` or `pg_net`:

**Option A: Use the Vercel route as fallback**
- Keep `/api/cron/scheduler` route
- Use an external cron service (cron-job.org, GitHub Actions schedule)
- Point it at your Vercel URL with CRON_SECRET

**Option B: Supabase Dashboard → Schedules (if available)**
- Some Supabase plans have a built-in scheduler UI
- Check: Dashboard → Database → Schedules

**Option C: GitHub Actions scheduled workflow (free)**

```yaml
# .github/workflows/scheduler.yml
name: Workflow Scheduler
on:
  schedule:
    - cron: "* * * * *"  # every minute (max on free tier: every 5 min)
  workflow_dispatch: {}

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -s -X POST \
            "${{ secrets.SUPABASE_URL }}/functions/v1/run-scheduled-workflow" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "apikey: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"scan":true}'
```

> Note: GitHub free tier limits cron to every 5 minutes minimum.

-- 010_cron_schedule.sql
-- Add next_run_at for Vercel Cron scheduler

ALTER TABLE workflows ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_workflows_due
  ON workflows (next_run_at)
  WHERE schedule_enabled = true AND next_run_at IS NOT NULL;

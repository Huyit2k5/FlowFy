-- Thêm webhook_token cho workflow (Phase 3)
-- Chạy trong SQL Editor

ALTER TABLE workflows ADD COLUMN IF NOT EXISTS webhook_token TEXT;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS schedule TEXT;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN NOT NULL DEFAULT false;

-- Index để nhanh khi tìm webhook
CREATE INDEX IF NOT EXISTS idx_workflows_webhook_token ON workflows(webhook_token);
CREATE INDEX IF NOT EXISTS idx_workflows_schedule ON workflows(schedule_enabled) WHERE schedule_enabled = true;
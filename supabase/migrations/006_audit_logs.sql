-- Audit log table (Phase 6.2)
-- Chạy trong SQL Editor

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- RLS: only workspace members can view their workspace's logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs: read own workspace"
  ON audit_logs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Service role can insert (bypasses RLS)
-- No insert policy for regular users (logs written by server only)
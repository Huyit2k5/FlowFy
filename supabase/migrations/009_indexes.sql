-- 009_indexes.sql
-- Performance indexes for query patterns

-- Workflow runs: "executions for workflow X, newest first"
CREATE INDEX IF NOT EXISTS idx_runs_workflow_started
  ON workflow_runs (workflow_id, started_at DESC);

-- Workflow runs: "recent runs across all, newest first"
CREATE INDEX IF NOT EXISTS idx_runs_started
  ON workflow_runs (started_at DESC);

-- Workflow runs: "runs for workspace X"
CREATE INDEX IF NOT EXISTS idx_runs_workspace
  ON workflow_runs (workspace_id, started_at DESC);

-- Run logs: "logs for run X"
CREATE INDEX IF NOT EXISTS idx_run_logs_run_created
  ON run_logs (run_id, created_at);

-- Workflow nodes: "all nodes for workflow X"
CREATE INDEX IF NOT EXISTS idx_nodes_workflow
  ON workflow_nodes (workflow_id);

-- Integrations: "all integrations for workspace X"
CREATE INDEX IF NOT EXISTS idx_integrations_workspace_active
  ON integrations (workspace_id, is_active);

-- Audit logs: "audit trail for workspace X, newest first"
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_time
  ON audit_logs (workspace_id, created_at DESC);

-- Members: "all members for workspace X"
CREATE INDEX IF NOT EXISTS idx_members_workspace_status
  ON members (workspace_id, status);

-- Workflows: "workflows for workspace X, newest first"
CREATE INDEX IF NOT EXISTS idx_workflows_workspace_created
  ON workflows (workspace_id, created_at DESC);

-- Đảm bảo workflow_nodes trong Realtime publication (Phase 5)
-- Chạy trong SQL Editor

DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'workflow_nodes'
   ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE workflow_nodes;
   END IF;
END
$$;
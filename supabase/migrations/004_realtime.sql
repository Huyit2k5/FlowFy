-- Bật Realtime cho workflow_runs và run_logs (Phase 3)
-- Chạy trong SQL Editor

-- Kiểm tra và tạo publication nếu chưa có
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
   END IF;
END
$$;

-- Thêm tables vào publication (bỏ qua nếu đã có)
DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'workflow_runs'
   ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE workflow_runs;
   END IF;
   
   IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'run_logs'
   ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE run_logs;
   END IF;
END
$$;
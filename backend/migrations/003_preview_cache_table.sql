-- Migration 003: Move preview cache from in-memory Map to persistent Supabase table
-- This prevents data loss on deploy/restart (users lose draft quizzes)

CREATE TABLE IF NOT EXISTS preview_cache (
  token       TEXT PRIMARY KEY,
  cache_type  TEXT NOT NULL CHECK (cache_type IN ('quiz', 'session')),
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Index for cleanup queries
CREATE INDEX idx_preview_cache_expires_at ON preview_cache (expires_at);

-- Auto-cleanup: delete expired entries every hour via pg_cron
-- (Requires pg_cron extension enabled in Supabase dashboard)
-- SELECT cron.schedule(
--   'cleanup-preview-cache',
--   '0 * * * *',
--   $$DELETE FROM preview_cache WHERE expires_at < now()$$
-- );

-- ============================================================================
-- Migration 017: Database cleanup - soft deletes, retention policies, and cleanup function
-- Adds data retention and cleanup capabilities for GDPR compliance and performance
-- ============================================================================

-- Add archived_at column to leads table for soft-delete functionality
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add archived_at column to quizzes table for soft-delete functionality
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add data_retention_days column to quizzes for per-quiz retention policy
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS data_retention_days INT DEFAULT 365;

-- Partial index on leads for active (non-archived) leads
CREATE INDEX IF NOT EXISTS idx_leads_archived_at_active
  ON leads(archived_at) WHERE archived_at IS NULL;

-- Partial index on quizzes for active (non-archived) quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_archived_at_active
  ON quizzes(archived_at) WHERE archived_at IS NULL;

-- Function to clean up old data based on retention policies
-- Deletes: raw analytics events (>90 days), archived leads (>30 days), webhook deliveries (>30 days), email queue entries (>7 days)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS TABLE(
  analytics_deleted INT,
  archived_leads_deleted INT,
  webhook_deliveries_deleted INT,
  email_queue_deleted INT,
  cleanup_timestamp TIMESTAMPTZ
) AS $$
DECLARE
  v_analytics_deleted INT;
  v_archived_leads_deleted INT;
  v_webhook_deleted INT;
  v_email_queue_deleted INT;
BEGIN
  -- Delete analytics_events older than 90 days
  DELETE FROM analytics_events
  WHERE created_at < NOW() - INTERVAL '90 days';
  v_analytics_deleted := FOUND::INT;

  -- Delete leads marked as archived more than 30 days ago (hard delete archived leads)
  DELETE FROM leads
  WHERE archived_at IS NOT NULL
    AND archived_at < NOW() - INTERVAL '30 days';
  v_archived_leads_deleted := FOUND::INT;

  -- Delete webhook_deliveries older than 30 days
  DELETE FROM webhook_deliveries
  WHERE created_at < NOW() - INTERVAL '30 days';
  v_webhook_deleted := FOUND::INT;

  -- Delete processed email_sequence_queue entries older than 7 days
  DELETE FROM email_sequence_queue
  WHERE status != 'pending'
    AND updated_at < NOW() - INTERVAL '7 days';
  v_email_queue_deleted := FOUND::INT;

  -- Return summary of deleted counts
  RETURN QUERY SELECT
    v_analytics_deleted,
    v_archived_leads_deleted,
    v_webhook_deleted,
    v_email_queue_deleted,
    NOW()::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql;

-- Note: pg_cron job can be scheduled to run the cleanup function weekly
-- Example (commented out): SELECT cron.schedule('cleanup-old-data', '0 3 * * 0', 'SELECT cleanup_old_data()');
-- This would run every Sunday at 3 AM UTC

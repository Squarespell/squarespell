-- ============================================================================
-- Migration 024: Security Hardening
-- Addresses: C3 (GDPR verification), C4 (atomic lead limits),
--            H3 (integration error logging), H4 (composite indexes),
--            H5 (email queue retry), M4 (updated_at columns)
-- ============================================================================

-- 1. GDPR deletion request tracking table (C3)
CREATE TABLE IF NOT EXISTS gdpr_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  quiz_slug TEXT,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gdpr_deletion_token ON gdpr_deletion_requests(token);
CREATE INDEX IF NOT EXISTS idx_gdpr_deletion_email ON gdpr_deletion_requests(email);

-- Auto-clean expired tokens (older than 24 hours)
-- Will be called by cron

-- 2. Integration error log table (H3)
CREATE TABLE IF NOT EXISTS integration_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL,
  integration_type TEXT NOT NULL,
  user_id UUID NOT NULL,
  quiz_id UUID NOT NULL,
  error_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_integration_errors_user ON integration_errors(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_errors_integration ON integration_errors(integration_id, created_at DESC);

-- 3. Composite indexes for performance (H4)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_user_created
  ON leads(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_quiz_created
  ON leads(quiz_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_user_quiz
  ON leads(user_id, quiz_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_quiz_created
  ON analytics_events(quiz_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_user_created
  ON analytics_events(user_id, created_at DESC);

-- 4. Email queue retry columns (H5)
ALTER TABLE email_sequence_queue
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

-- 5. updated_at audit columns (M4)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE email_logs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_leads_updated_at') THEN
    CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_analytics_updated_at') THEN
    CREATE TRIGGER trg_analytics_updated_at BEFORE UPDATE ON analytics_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- 6. Atomic lead insert with limit check (C4)
-- This function atomically checks the lead count and inserts if under limit.
-- Uses advisory lock to prevent race conditions.
CREATE OR REPLACE FUNCTION insert_lead_with_limit_check(
  p_quiz_id UUID,
  p_user_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_answers JSONB,
  p_outcome_id TEXT,
  p_metadata JSONB,
  p_consent BOOLEAN,
  p_consent_text TEXT,
  p_lead_limit INTEGER
) RETURNS TABLE(lead_id UUID, lead_metadata JSONB, lead_score INTEGER) AS $$
DECLARE
  v_count INTEGER;
  v_lead_id UUID;
  v_lead_metadata JSONB;
  v_lead_score INTEGER;
BEGIN
  -- Acquire advisory lock keyed on user_id to serialize lead inserts per user
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::TEXT));

  -- Count current leads for this user
  SELECT COUNT(*) INTO v_count FROM leads WHERE user_id = p_user_id;

  IF v_count >= p_lead_limit THEN
    RAISE EXCEPTION 'LEAD_LIMIT_REACHED';
  END IF;

  -- Insert the lead
  INSERT INTO leads (quiz_id, user_id, name, email, answers, outcome_id, metadata, consent, consent_text)
  VALUES (p_quiz_id, p_user_id, p_name, p_email, p_answers, p_outcome_id, p_metadata, p_consent, p_consent_text)
  RETURNING id, leads.metadata, leads.score
  INTO v_lead_id, v_lead_metadata, v_lead_score;

  RETURN QUERY SELECT v_lead_id, v_lead_metadata, v_lead_score;
END;
$$ LANGUAGE plpgsql;

-- 7. Cleanup function for expired GDPR tokens (called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_gdpr_tokens() RETURNS void AS $$
BEGIN
  DELETE FROM gdpr_deletion_requests
  WHERE expires_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

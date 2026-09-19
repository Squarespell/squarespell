-- ============================================================================
-- Migration 031: Schema reconciliation (idempotent, additive only)
--
-- Phase 1 stabilisation. The application code reads and writes tables and
-- columns that no earlier migration in this repository creates, so a database
-- built from SUPABASE_SCHEMA.sql + migrations 002-030 cannot serve the core
-- lead-capture, billing and funnel flows. Production was evidently evolved by
-- hand; this file makes the repository the source of truth for the objects the
-- core flows need.
--
-- SAFETY: every statement is IF NOT EXISTS / additive, except that the
-- insert_lead_with_limit_check function and one CHECK constraint are
-- replaced (see below). No table, column or row is dropped, renamed,
-- retyped or backfilled. Running it against a database that already
-- has these objects is a no-op. It has NOT been applied to any live database
-- by Phase 1; the owner must review and apply it deliberately (see
-- docs/relaunch/SQUARESPELL_PHASE_1_RESULTS.md, "Remaining production actions").
-- ============================================================================

-- users: columns read by auth, billing, brand-kit, white-label and email code
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_kit JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lead_addon JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_addon JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true;

-- leads: written by insert_lead_with_limit_check (024) and read by the dashboard
ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualified BOOLEAN;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS path_taken TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS calculated_price NUMERIC;

-- Email-engagement columns read by lead scoring / segmentation
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_sends_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_opens_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_clicks_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_email_opened_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_email_clicked_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS engagement_score INTEGER;

-- Public funnel: /api/preview-generate, /preview-build-quiz, /claim-quiz persist drafts here
CREATE TABLE IF NOT EXISTS preview_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_token TEXT NOT NULL UNIQUE,
  quiz JSONB NOT NULL,
  brand JSONB NOT NULL DEFAULT '{}'::jsonb,
  url TEXT NOT NULL,
  claimed_at TIMESTAMPTZ,
  claimed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_preview_drafts_created ON preview_drafts (created_at) WHERE claimed_at IS NULL;

-- email_sequence_queue: the queue worker writes 'retry' and 'skipped' (emailSequence.ts) but the
-- original CHECK (014) only allows pending/sent/failed, so every retry/skip UPDATE was rejected and
-- the row stayed 'pending' forever (re-sent or re-skipped on every run).
ALTER TABLE email_sequence_queue DROP CONSTRAINT IF EXISTS email_sequence_queue_status_check;
ALTER TABLE email_sequence_queue ADD CONSTRAINT email_sequence_queue_status_check
  CHECK (status IN ('pending', 'sent', 'failed', 'retry', 'skipped'));

-- Stripe webhook idempotency: one row per processed Stripe event id.
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Lead limit is a MONTHLY allowance ("1,000 leads/mo"); insert_lead_with_limit_check counted lifetime rows.
-- Also: a repeated submission of the same (quiz, email) is idempotent (returns the existing lead) instead of
-- raising a unique-violation, and the lead score is stored in leads.score.
DROP FUNCTION IF EXISTS insert_lead_with_limit_check(UUID, UUID, TEXT, TEXT, JSONB, TEXT, JSONB, BOOLEAN, TEXT, INTEGER);
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
  p_lead_limit INTEGER,
  p_score INTEGER DEFAULT NULL
) RETURNS TABLE(lead_id UUID, lead_metadata JSONB, lead_score INTEGER, is_duplicate BOOLEAN) AS $$
DECLARE
  v_count INTEGER;
  v_lead_id UUID;
  v_lead_metadata JSONB;
  v_lead_score INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::TEXT));

  -- Idempotent: same visitor, same quiz -> return the lead that already exists.
  SELECT l.id, l.metadata, l.score INTO v_lead_id, v_lead_metadata, v_lead_score
  FROM leads l WHERE l.quiz_id = p_quiz_id AND l.email = p_email LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    RETURN QUERY SELECT v_lead_id, v_lead_metadata, v_lead_score, TRUE;
    RETURN;
  END IF;

  -- Monthly allowance (calendar month, UTC).
  IF p_lead_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM leads
    WHERE user_id = p_user_id AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
    IF v_count >= p_lead_limit THEN
      RAISE EXCEPTION 'LEAD_LIMIT_REACHED';
    END IF;
  END IF;

  INSERT INTO leads (quiz_id, user_id, name, email, answers, outcome_id, metadata, consent, consent_text, score)
  VALUES (p_quiz_id, p_user_id, p_name, p_email, p_answers, p_outcome_id, p_metadata, p_consent, p_consent_text, p_score)
  RETURNING id, leads.metadata, leads.score INTO v_lead_id, v_lead_metadata, v_lead_score;

  RETURN QUERY SELECT v_lead_id, v_lead_metadata, v_lead_score, FALSE;
END;
$$ LANGUAGE plpgsql;

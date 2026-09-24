-- ============================================================================
-- Migration 036: atomic helpers for email-code verification (035 follow-up)
--
-- Two small SQL functions so a code's attempt counter can never be
-- double-counted (or dropped) under concurrent verification attempts, and a
-- code can never be consumed twice: both do their read-modify-write as a
-- single UPDATE statement, which Postgres serializes at the row level.
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_auth_code_attempt(p_id UUID)
RETURNS TABLE(attempt_count INTEGER, max_attempts INTEGER, code_hash TEXT, expires_at TIMESTAMPTZ, consumed_at TIMESTAMPTZ) AS $$
  UPDATE auth_codes
  SET attempt_count = auth_codes.attempt_count + 1
  WHERE auth_codes.id = p_id
  RETURNING auth_codes.attempt_count, auth_codes.max_attempts, auth_codes.code_hash, auth_codes.expires_at, auth_codes.consumed_at;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION consume_auth_code(p_id UUID)
RETURNS TABLE(id UUID) AS $$
  UPDATE auth_codes
  SET consumed_at = now()
  WHERE auth_codes.id = p_id AND auth_codes.consumed_at IS NULL
  RETURNING auth_codes.id;
$$ LANGUAGE sql;


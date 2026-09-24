-- ============================================================================
-- Migration 035: First-party passwordless email-code authentication
--
-- Additive, idempotent, forward-only. Does not touch migration 034 or any
-- Clerk-era objects. users.clerk_user_id is left in place for rollback
-- during testing; a later forward migration removes anything proven unused
-- once the replacement has passed on staging.
-- ============================================================================

-- One outstanding 6-digit code per normalized email at a time. The partial
-- unique index (consumed_at IS NULL) is what makes "new code invalidates the
-- old one" enforceable: application code consumes/expires the previous row
-- before inserting a new one, so at most one unconsumed row can exist.
CREATE TABLE IF NOT EXISTS auth_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_normalized  TEXT NOT NULL,
  code_hash         TEXT NOT NULL,
  attempt_count     INTEGER NOT NULL DEFAULT 0,
  max_attempts      INTEGER NOT NULL DEFAULT 5,
  expires_at        TIMESTAMPTZ NOT NULL,
  consumed_at       TIMESTAMPTZ,
  created_ip        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_codes_email ON auth_codes (email_normalized);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_codes_one_active_per_email
  ON auth_codes (email_normalized) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_codes_expires ON auth_codes (expires_at);

-- Server-side sessions. Only the SHA-256 hash of the 256-bit session token is
-- ever stored; the plaintext token exists only in the HttpOnly cookie.
CREATE TABLE IF NOT EXISTS auth_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  user_agent  TEXT,
  created_ip  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions (expires_at);

-- Audit trail for the new auth flow. Never stores a plaintext code or
-- session token -- only the normalized email, an action, an outcome and
-- non-sensitive metadata.
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id                BIGSERIAL PRIMARY KEY,
  email_normalized  TEXT,
  action            TEXT NOT NULL,
  outcome           TEXT NOT NULL,
  ip                TEXT,
  user_agent        TEXT,
  detail            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_email ON auth_audit_log (email_normalized);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created ON auth_audit_log (created_at);

-- users: verified-email marker for the new flow, and a uniqueness guarantee
-- on normalized email so verify-code matching can never attach a session to
-- more than one user, or create a duplicate. If this index creation fails,
-- the database already has two or more existing users whose emails only
-- differ by case/whitespace; that must be resolved by hand before this
-- migration can apply -- it deliberately does not merge or delete rows.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_normalized_unique
  ON users (lower(trim(email))) WHERE email IS NOT NULL AND trim(email) <> '';


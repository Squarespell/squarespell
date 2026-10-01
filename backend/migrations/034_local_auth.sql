-- 034: our own sign-in, replacing Clerk.
--
-- Accounts keep their existing row and id. users.clerk_user_id stays the account's sign-in identity (the value in
-- session tokens and in team_members.user_id), so nothing that references it has to change: accounts created before
-- this keep their Clerk id, new accounts get a generated "usr_..." id.
--
-- Accounts that came from Clerk have no password here. Signing in sends them an email link to set one, which also
-- confirms they own the address.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;

-- Sign-in looks accounts up by email regardless of case. Not unique: older Clerk-era data may hold duplicates, and a
-- failed migration would block the deploy. The sign-up code refuses a second account for the same address.
CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_key ON users (google_sub) WHERE google_sub IS NOT NULL;

-- A signed-in browser. Only a SHA-256 of the cookie value is stored, so a database read does not hand out sessions.
CREATE TABLE IF NOT EXISTS auth_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  user_agent    TEXT,
  ip            TEXT
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions (user_id);

-- One-time links sent by email (confirm address, set or reset password). Stored hashed, single use, short-lived.
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  token_hash  TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS auth_tokens_user_idx ON auth_tokens (user_id, purpose);

-- Only the backend (service role) may touch these; the REST layer's anon/authenticated roles get nothing.
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON auth_sessions FROM anon, authenticated;
REVOKE ALL ON auth_tokens FROM anon, authenticated;

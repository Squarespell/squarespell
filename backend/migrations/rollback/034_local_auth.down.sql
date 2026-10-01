-- Rollback for 034_local_auth.sql. Removes our own sign-in data (sessions, email links, password hashes).
-- Only run this when going back to a build that signs in through Clerk.
DROP TABLE IF EXISTS auth_tokens;
DROP TABLE IF EXISTS auth_sessions;
DROP INDEX IF EXISTS users_google_sub_key;
DROP INDEX IF EXISTS users_email_lower_idx;
ALTER TABLE users DROP COLUMN IF EXISTS google_sub;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

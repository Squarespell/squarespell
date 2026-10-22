-- 037_trial_protection.sql
-- Free-trial abuse protection (backend/src/services/trialGuard.ts).
--
-- * site_trials: one free trial per website. The first account whose quiz collects a lead on a website records that
--   website with the account's trial end. A later account's quiz on the same website gets no new trial there.
--   The row outlives the account (ON DELETE SET NULL), so deleting an account and signing up again does not reset it.
-- * account_devices: a salted hash of a random first-party security cookie, per account, so the owner can see accounts
--   created from the same browser. Only the hash is stored. Rows are deleted 12 months after last use.
-- * users.email_canonical: the mailbox an address delivers to (Gmail ignores dots; "+tags" are dropped), so one mailbox
--   cannot open several accounts. Backfilled here and kept current by a trigger, with the same rules as canonicalEmail()
--   in trialGuard.ts.
-- * users.signup_ip_hash: a salted hash of the network address used at sign-up (never the address itself), cleared after
--   90 days by purge_old_signup_signals().
-- * Idempotent and additive. No user or site identity is embedded.
-- * Tenant model as in 033/036: RLS enabled with no policy, privileges revoked from anon and authenticated.
-- Reversal: backend/migrations/rollback/037_trial_protection.down.sql.

CREATE TABLE IF NOT EXISTS public.site_trials (
  hostname       text PRIMARY KEY CHECK (hostname = lower(hostname) AND length(hostname) BETWEEN 3 AND 253),
  user_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  trial_ends_at  timestamptz NOT NULL,
  first_seen_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_trials_user_idx ON public.site_trials (user_id);

CREATE TABLE IF NOT EXISTS public.account_devices (
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_hash    text NOT NULL CHECK (length(device_hash) = 64),
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_hash)
);
CREATE INDEX IF NOT EXISTS account_devices_hash_idx ON public.account_devices (device_hash);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_canonical text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS signup_ip_hash text;
CREATE INDEX IF NOT EXISTS users_email_canonical_idx ON public.users (email_canonical);

-- Same rules as canonicalEmail() in trialGuard.ts: lower case; "+tag" removed; for Gmail (gmail.com, googlemail.com)
-- dots removed and the domain written as gmail.com.
CREATE OR REPLACE FUNCTION public.canonical_email(p_email text)
RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  WITH e AS (SELECT lower(trim(coalesce(p_email, ''))) AS v),
  parts AS (
    SELECT split_part(split_part(v, '@', 1), '+', 1) AS local, split_part(v, '@', 2) AS domain, v FROM e
  )
  SELECT CASE
    WHEN position('@' in v) = 0 OR local = '' OR domain = '' THEN nullif(v, '')
    WHEN domain IN ('gmail.com', 'googlemail.com') THEN replace(local, '.', '') || '@gmail.com'
    ELSE local || '@' || domain
  END
  FROM parts
$fn$;

UPDATE public.users SET email_canonical = public.canonical_email(email)
 WHERE email_canonical IS NULL AND email IS NOT NULL AND email <> '';

-- Kept in step on every insert and email change, whatever code path creates the account.
CREATE OR REPLACE FUNCTION public.users_set_email_canonical()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.email_canonical := public.canonical_email(NEW.email);
  RETURN NEW;
END
$fn$;
DROP TRIGGER IF EXISTS users_email_canonical ON public.users;
CREATE TRIGGER users_email_canonical BEFORE INSERT OR UPDATE OF email ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.users_set_email_canonical();

-- Retention for the duplicate signals (hourly job): device hashes 12 months after last use, sign-up network hash after 90 days.
CREATE OR REPLACE FUNCTION public.purge_old_signup_signals()
RETURNS integer LANGUAGE plpgsql AS $fn$
DECLARE a integer; b integer;
BEGIN
  DELETE FROM public.account_devices WHERE last_seen_at < now() - interval '12 months';
  GET DIAGNOSTICS a = ROW_COUNT;
  UPDATE public.users SET signup_ip_hash = NULL WHERE signup_ip_hash IS NOT NULL AND created_at < now() - interval '90 days';
  GET DIAGNOSTICS b = ROW_COUNT;
  RETURN a + b;
END
$fn$;

ALTER TABLE public.site_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_trials FROM anon, authenticated;
REVOKE ALL ON public.account_devices FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_old_signup_signals() FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.site_trials TO service_role;
GRANT ALL ON public.account_devices TO service_role;
GRANT EXECUTE ON FUNCTION public.canonical_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_old_signup_signals() TO service_role;

-- Rollback for 037_trial_protection.sql. Removes the trial-protection tables, functions and columns; nothing else changes.
-- The previous release does not read them (no per-website trial, no duplicate flags, plain email matching again).
DROP TRIGGER IF EXISTS users_email_canonical ON public.users;
DROP FUNCTION IF EXISTS public.users_set_email_canonical();
DROP FUNCTION IF EXISTS public.purge_old_signup_signals();
DROP FUNCTION IF EXISTS public.canonical_email(text);
DROP INDEX IF EXISTS public.users_email_canonical_idx;
ALTER TABLE public.users DROP COLUMN IF EXISTS signup_ip_hash;
ALTER TABLE public.users DROP COLUMN IF EXISTS email_canonical;
DROP TABLE IF EXISTS public.account_devices;
DROP TABLE IF EXISTS public.site_trials;

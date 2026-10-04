-- Rollback for 036_held_leads.sql. Held leads that were not released are deleted with the table; leads already released
-- into leads stay. The lead endpoint of the previous release refuses leads for expired trials again (403 trial_expired).
DROP FUNCTION IF EXISTS public.purge_expired_held_leads();
DROP FUNCTION IF EXISTS public.release_held_leads(uuid);
DROP FUNCTION IF EXISTS public.hold_lead(uuid, uuid, text, text, jsonb, text, jsonb, boolean, text, integer, integer);
DROP TABLE IF EXISTS public.held_leads;

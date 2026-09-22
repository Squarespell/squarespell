-- Reversal for 033_connected_sites.sql. Drops only the objects that migration created (nothing else is touched).
-- This deletes every connected site, installation, manifest version, event and verification check. Run it only after
-- taking a backup, and only when the connect feature flag (CONNECT_ENABLED) is off. It is safe to run more than once.
DROP FUNCTION IF EXISTS public.connect_rollback_manifest(uuid, uuid);
DROP FUNCTION IF EXISTS public.connect_publish_manifest(uuid, uuid, jsonb, text);
DROP TABLE IF EXISTS public.verification_checks;
DROP TABLE IF EXISTS public.installation_events;
DROP TABLE IF EXISTS public.manifest_versions;
DROP TABLE IF EXISTS public.quiz_installations;
DROP TABLE IF EXISTS public.site_authorizations;
DROP TABLE IF EXISTS public.connected_sites;

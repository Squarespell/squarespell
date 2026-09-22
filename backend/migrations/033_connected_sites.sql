-- 033_connected_sites.sql
-- One-button connect (M0/M1/M2): connected websites, quiz installations, manifest versions, events and verification checks.
--
-- * Idempotent: every statement is safe to run any number of times (CREATE ... IF NOT EXISTS, CREATE OR REPLACE).
-- * No user, domain or quiz identity is embedded. Nothing is copied from or written to existing tables.
-- * Purely additive: it does not alter users, quizzes, leads or any legacy table.
-- * Tenant model: every private row carries user_id (the authenticated owner). RLS is ENABLED and no policy is created,
--   and privileges are revoked from anon and authenticated, so PostgREST clients other than the backend cannot read or write these tables.
--   ACCEPTED SERVICE-ROLE BYPASS: the backend connects as service_role, which bypasses RLS by design (Supabase / the self-hosted
--   PostgREST layer). Tenant isolation for these tables is therefore enforced in the API (every query filters on user_id) and is
--   proven by backend/src/__tests__/connect/*.test.ts. This matches migrations 016 and 024.
-- * The public manifest and heartbeat endpoints read these tables server-side only and expose display configuration, never rows.
-- Reversal: backend/migrations/rollback/033_connected_sites.down.sql (drops only the objects created here).

CREATE TABLE IF NOT EXISTS public.connected_sites (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform            text NOT NULL CHECK (platform IN ('squarespace', 'html')),
  display_name        text,
  hostname            text NOT NULL CHECK (hostname = lower(hostname) AND length(hostname) BETWEEN 3 AND 253),
  site_key            text NOT NULL UNIQUE CHECK (length(site_key) >= 24),
  state               text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'verifying', 'verified', 'needs_attention', 'paused', 'disconnected')),
  attention_reason    text,
  loader_version_seen text,
  slots_seen          jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_heartbeat_at   timestamptz,
  last_verified_at    timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  disconnected_at     timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS connected_sites_user_host_active ON public.connected_sites (user_id, hostname) WHERE state <> 'disconnected';
CREATE INDEX IF NOT EXISTS connected_sites_user_idx ON public.connected_sites (user_id);

CREATE TABLE IF NOT EXISTS public.site_authorizations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id           uuid NOT NULL REFERENCES public.connected_sites(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  method            text NOT NULL CHECK (method IN ('none', 'oauth', 'app_password', 'plugin_pairing')),
  access_token_enc  text,
  refresh_token_enc text,
  approved_scopes   text[] NOT NULL DEFAULT '{}',
  expires_at        timestamptz,
  revoked_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_authorizations_site_idx ON public.site_authorizations (site_id);

CREATE TABLE IF NOT EXISTS public.quiz_installations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id           uuid NOT NULL REFERENCES public.connected_sites(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id           uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  mode              text NOT NULL CHECK (mode IN ('inline', 'popup', 'floating_tab')),
  placement_ref     text,
  path_include      text[] NOT NULL DEFAULT '{}',
  path_exclude      text[] NOT NULL DEFAULT '{}',
  options           jsonb NOT NULL DEFAULT '{}'::jsonb,
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'publishing', 'live', 'updating', 'paused', 'moving', 'removing', 'removed', 'failed')),
  published_version integer,
  failure_reason    text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  paused_at         timestamptz,
  removed_at        timestamptz,
  CONSTRAINT quiz_installations_inline_needs_slot CHECK (mode <> 'inline' OR (placement_ref IS NOT NULL AND placement_ref ~ '^[a-z0-9][a-z0-9-]{0,39}$'))
);
-- A repeated publish of the same quiz, mode and slot on a site is one installation (duplicate-publish protection).
CREATE UNIQUE INDEX IF NOT EXISTS quiz_installations_unique_placement
  ON public.quiz_installations (site_id, quiz_id, mode, COALESCE(placement_ref, '')) WHERE status <> 'removed';
CREATE INDEX IF NOT EXISTS quiz_installations_site_idx ON public.quiz_installations (site_id);
CREATE INDEX IF NOT EXISTS quiz_installations_user_idx ON public.quiz_installations (user_id);

CREATE TABLE IF NOT EXISTS public.manifest_versions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id    uuid NOT NULL REFERENCES public.connected_sites(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  version    integer NOT NULL CHECK (version > 0),
  body       jsonb NOT NULL,
  created_by text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT false,
  UNIQUE (site_id, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS manifest_versions_one_current ON public.manifest_versions (site_id) WHERE is_current;

CREATE TABLE IF NOT EXISTS public.installation_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         uuid REFERENCES public.connected_sites(id) ON DELETE CASCADE,
  installation_id uuid REFERENCES public.quiz_installations(id) ON DELETE SET NULL,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor           text NOT NULL DEFAULT 'user' CHECK (actor IN ('user', 'system', 'loader')),
  action          text NOT NULL,
  before_state    jsonb,
  after_state     jsonb,
  error_code      text,
  request_id      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS installation_events_site_idx ON public.installation_events (site_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.verification_checks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         uuid NOT NULL REFERENCES public.connected_sites(id) ON DELETE CASCADE,
  installation_id uuid REFERENCES public.quiz_installations(id) ON DELETE SET NULL,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  method          text NOT NULL CHECK (method IN ('page_fetch', 'heartbeat')),
  url_checked     text,
  result          text NOT NULL CHECK (result IN ('ok', 'failed')),
  reason_code     text,
  checked_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_checks_site_idx ON public.verification_checks (site_id, checked_at DESC);

-- Atomic publish: locks the site row, allocates the next version and flips the current pointer in one transaction.
CREATE OR REPLACE FUNCTION public.connect_publish_manifest(p_site uuid, p_user uuid, p_body jsonb, p_actor text DEFAULT 'user')
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE next_version integer;
BEGIN
  PERFORM 1 FROM public.connected_sites WHERE id = p_site AND user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'site_not_found' USING ERRCODE = 'P0002'; END IF;
  SELECT COALESCE(MAX(version), 0) + 1 INTO next_version FROM public.manifest_versions WHERE site_id = p_site;
  UPDATE public.manifest_versions SET is_current = false WHERE site_id = p_site AND is_current;
  INSERT INTO public.manifest_versions (site_id, user_id, version, body, created_by, is_current)
  VALUES (p_site, p_user, next_version, jsonb_set(p_body, '{version}', to_jsonb(next_version)), p_actor, true);
  RETURN next_version;
END $$;

-- Rollback: make the newest older version current again. Returns the restored version, or NULL when there is none.
CREATE OR REPLACE FUNCTION public.connect_rollback_manifest(p_site uuid, p_user uuid)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE cur integer; prev integer;
BEGIN
  PERFORM 1 FROM public.connected_sites WHERE id = p_site AND user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'site_not_found' USING ERRCODE = 'P0002'; END IF;
  SELECT version INTO cur FROM public.manifest_versions WHERE site_id = p_site AND is_current;
  IF cur IS NULL THEN RETURN NULL; END IF;
  SELECT MAX(version) INTO prev FROM public.manifest_versions WHERE site_id = p_site AND version < cur;
  IF prev IS NULL THEN RETURN NULL; END IF;
  UPDATE public.manifest_versions SET is_current = false WHERE site_id = p_site AND is_current;
  UPDATE public.manifest_versions SET is_current = true WHERE site_id = p_site AND version = prev;
  RETURN prev;
END $$;

DO $$ BEGIN
  ALTER TABLE public.connected_sites ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.site_authorizations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.quiz_installations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.manifest_versions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.installation_events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.verification_checks ENABLE ROW LEVEL SECURITY;
END $$;

REVOKE ALL ON public.connected_sites, public.site_authorizations, public.quiz_installations, public.manifest_versions,
  public.installation_events, public.verification_checks FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.connect_publish_manifest(uuid, uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.connect_rollback_manifest(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.connected_sites, public.site_authorizations, public.quiz_installations, public.manifest_versions,
  public.installation_events, public.verification_checks TO service_role;
GRANT EXECUTE ON FUNCTION public.connect_publish_manifest(uuid, uuid, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.connect_rollback_manifest(uuid, uuid) TO service_role;

-- 036: leads that arrive after the quiz owner's trial has ended are held for 30 days instead of being refused.
--
-- Before: POST /api/quiz/:slug/lead answered 403 trial_expired. The visitor saw "Something went wrong" after three
-- retries and the lead was lost. Now the visitor gets their result, the answer is kept in held_leads, the owner sees how
-- many are waiting, and choosing a plan moves them into leads (release_held_leads, called by the Stripe webhook).
--
-- held_leads is deliberately a separate table: nothing that reads leads (dashboard, CSV export, digests, integrations,
-- result and notification emails) can see a held lead before the owner pays. Rows older than 30 days are deleted by
-- purge_expired_held_leads() (hourly cron) and skipped by release_held_leads().
--
-- Tenant model as in 033: RLS enabled with no policy, privileges revoked from anon and authenticated; only the backend
-- (service_role) reads or writes these rows. Additive and idempotent.

CREATE TABLE IF NOT EXISTS public.held_leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id       uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          text,
  email         text NOT NULL,
  answers       jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome_id    text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent       boolean NOT NULL DEFAULT false,
  consent_text  text,
  score         integer,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE (quiz_id, email)
);
CREATE INDEX IF NOT EXISTS held_leads_user_idx ON public.held_leads (user_id);
CREATE INDEX IF NOT EXISTS held_leads_expires_idx ON public.held_leads (expires_at);

-- Hold one lead. Returns 'held', 'duplicate' (same visitor and quiz already held or already a lead) or 'cap_reached'.
CREATE OR REPLACE FUNCTION public.hold_lead(
  p_quiz_id uuid,
  p_user_id uuid,
  p_name text,
  p_email text,
  p_answers jsonb,
  p_outcome_id text,
  p_metadata jsonb,
  p_consent boolean,
  p_consent_text text,
  p_score integer,
  p_cap integer
) RETURNS text AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));
  IF EXISTS (SELECT 1 FROM public.held_leads h WHERE h.quiz_id = p_quiz_id AND h.email = p_email)
     OR EXISTS (SELECT 1 FROM public.leads l WHERE l.quiz_id = p_quiz_id AND l.email = p_email) THEN
    RETURN 'duplicate';
  END IF;
  SELECT count(*) INTO v_count FROM public.held_leads h WHERE h.user_id = p_user_id AND h.expires_at > now();
  IF p_cap IS NOT NULL AND v_count >= p_cap THEN
    RETURN 'cap_reached';
  END IF;
  INSERT INTO public.held_leads (quiz_id, user_id, name, email, answers, outcome_id, metadata, consent, consent_text, score)
  VALUES (p_quiz_id, p_user_id, p_name, p_email, COALESCE(p_answers, '{}'::jsonb), p_outcome_id, COALESCE(p_metadata, '{}'::jsonb),
          COALESCE(p_consent, false), p_consent_text, p_score);
  RETURN 'held';
END;
$$ LANGUAGE plpgsql;

-- Move an owner's held leads into leads (keeping their original time) after they choose a plan. Expired rows are dropped,
-- a visitor who is already a lead of that quiz is not duplicated, and each quiz's lead_count goes up by what it received.
-- Returns how many leads were released. Takes the same per-owner lock as insert_lead_with_limit_check.
CREATE OR REPLACE FUNCTION public.release_held_leads(p_user_id uuid) RETURNS integer AS $$
DECLARE
  v_released integer := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));
  DELETE FROM public.held_leads WHERE user_id = p_user_id AND expires_at <= now();
  WITH moved AS (
    INSERT INTO public.leads (quiz_id, user_id, name, email, answers, outcome_id, metadata, consent, consent_text, score, created_at)
    SELECT h.quiz_id, h.user_id, h.name, h.email, h.answers, h.outcome_id, h.metadata || jsonb_build_object('held_until_plan', true),
           h.consent, h.consent_text, h.score, h.created_at
    FROM public.held_leads h
    WHERE h.user_id = p_user_id
      AND NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.quiz_id = h.quiz_id AND l.email = h.email)
    RETURNING quiz_id
  ), per_quiz AS (
    SELECT quiz_id, count(*)::integer AS n FROM moved GROUP BY quiz_id
  ), bumped AS (
    UPDATE public.quizzes q SET lead_count = COALESCE(q.lead_count, 0) + p.n FROM per_quiz p WHERE q.id = p.quiz_id RETURNING q.id
  )
  SELECT COALESCE(sum(n), 0)::integer INTO v_released FROM per_quiz;
  DELETE FROM public.held_leads WHERE user_id = p_user_id;
  RETURN v_released;
END;
$$ LANGUAGE plpgsql;

-- Hourly: delete held leads older than 30 days. Returns how many rows were deleted.
CREATE OR REPLACE FUNCTION public.purge_expired_held_leads() RETURNS integer AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.held_leads WHERE expires_at <= now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  ALTER TABLE public.held_leads ENABLE ROW LEVEL SECURITY;
END $$;

REVOKE ALL ON public.held_leads FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.hold_lead(uuid, uuid, text, text, jsonb, text, jsonb, boolean, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_held_leads(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_expired_held_leads() FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.held_leads TO service_role;
GRANT EXECUTE ON FUNCTION public.hold_lead(uuid, uuid, text, text, jsonb, text, jsonb, boolean, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_held_leads(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_expired_held_leads() TO service_role;

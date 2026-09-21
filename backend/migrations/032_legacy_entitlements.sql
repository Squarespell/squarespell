-- 032_legacy_entitlements.sql
-- Preserves paid access for legacy accounts that hold a paid plan WITHOUT any Stripe reference (manual / migrated grants).
-- * Idempotent: safe to run any number of times. A revoked entitlement is never re-granted.
-- * No user identity is embedded here: qualifying rows are selected purely by data condition.
-- * No Stripe customer, subscription or charge is created by this migration.
-- * Only the legacy 'agency' plan qualifies: it is the one legacy paid plan that is Business-level
--   (see canonicalPlanName in backend/src/middleware/planGuard.ts).
-- * While an entitlement is ACTIVE the account is always entitled to its effective_plan (Business):
--   the application resolves it (entitledPlan) and the database refuses any change that would take the stored plan below
--   Business. Only public.revoke_legacy_entitlement() removes that protection.
-- Reversal: docs/relaunch/LEGACY_ENTITLEMENTS.md.

CREATE TABLE IF NOT EXISTS public.legacy_entitlements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  original_plan  text NOT NULL,
  effective_plan text NOT NULL DEFAULT 'business',
  reason_code    text NOT NULL DEFAULT 'legacy_paid_no_stripe',
  active         boolean NOT NULL DEFAULT true,
  granted_at     timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz,
  revoked_reason text,
  CONSTRAINT legacy_entitlements_effective_business CHECK (effective_plan = 'business'),
  CONSTRAINT legacy_entitlements_revocation_consistent CHECK (active OR revoked_at IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS legacy_entitlements_one_active_per_user ON public.legacy_entitlements (user_id) WHERE active;

CREATE TABLE IF NOT EXISTS public.legacy_entitlement_audit (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL,
  event      text NOT NULL,
  detail     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legacy_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_entitlement_audit ENABLE ROW LEVEL SECURITY;

-- Plan level: 3 = Business-level (business, and the legacy alias agency); everything else is below it.
CREATE OR REPLACE FUNCTION public.legacy_plan_rank(p text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE lower(coalesce(p, 'free'))
    WHEN 'business' THEN 3 WHEN 'agency' THEN 3
    WHEN 'pro' THEN 2
    WHEN 'core' THEN 1 WHEN 'starter' THEN 1 WHEN 'growth' THEN 1
    ELSE 0
  END
$fn$;

-- Grant: paid legacy plan, no Stripe customer reference, no Stripe subscription reference, not already recorded.
WITH granted AS (
  INSERT INTO public.legacy_entitlements (user_id, original_plan)
  SELECT u.id, u.plan
  FROM public.users u
  WHERE lower(u.plan) = 'agency'
    AND coalesce(u.stripe_customer_id, '') = ''
    AND coalesce(u.stripe_subscription_id, '') = ''
    AND NOT EXISTS (SELECT 1 FROM public.legacy_entitlements le WHERE le.user_id = u.id)
  RETURNING user_id
)
INSERT INTO public.legacy_entitlement_audit (user_id, event, detail)
SELECT user_id, 'granted', 'migration 032: legacy paid plan without Stripe references' FROM granted;

-- Administrative revocation (service role only). Returns true when an active entitlement was revoked.
CREATE OR REPLACE FUNCTION public.revoke_legacy_entitlement(p_user_id uuid, p_reason text)
RETURNS boolean LANGUAGE plpgsql AS $fn$
DECLARE n integer;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'a revocation reason is required';
  END IF;
  UPDATE public.legacy_entitlements
     SET active = false, revoked_at = now(), revoked_reason = p_reason
   WHERE user_id = p_user_id AND active;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN
    INSERT INTO public.legacy_entitlement_audit (user_id, event, detail) VALUES (p_user_id, 'revoked', p_reason);
  END IF;
  RETURN n > 0;
END
$fn$;
REVOKE ALL ON FUNCTION public.revoke_legacy_entitlement(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_legacy_entitlement(uuid, text) TO service_role;

-- Guard 1 (on users). Fires only when users.plan changes AND the new plan is below Business AND the user has an ACTIVE
-- legacy entitlement. Changes to Business (or agency) pass. Every other update, for every other user, is untouched.
-- Each intervention is written to legacy_entitlement_audit and raised as a NOTICE.
CREATE OR REPLACE FUNCTION public.protect_legacy_entitlement()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE le public.legacy_entitlements%ROWTYPE;
BEGIN
  IF public.legacy_plan_rank(NEW.plan) < 3 THEN
    SELECT * INTO le FROM public.legacy_entitlements WHERE user_id = OLD.id AND active;
    IF FOUND THEN
      INSERT INTO public.legacy_entitlement_audit (user_id, event, detail)
      VALUES (OLD.id, 'downgrade_blocked', 'attempted plan change to ' || coalesce(NEW.plan, 'null') || ' (below ' || le.effective_plan || ')');
      RAISE NOTICE 'legacy entitlement active: plan change to % ignored (entitled to %)', coalesce(NEW.plan, 'null'), le.effective_plan;
      NEW.plan := CASE WHEN public.legacy_plan_rank(OLD.plan) >= 3 THEN OLD.plan ELSE le.effective_plan END;
    END IF;
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS protect_legacy_entitlement ON public.users;
CREATE TRIGGER protect_legacy_entitlement
  BEFORE UPDATE OF plan ON public.users
  FOR EACH ROW WHEN (OLD.plan IS DISTINCT FROM NEW.plan)
  EXECUTE FUNCTION public.protect_legacy_entitlement();

-- Guard 2 (on legacy_entitlements). Activating an entitlement raises a stored plan that is below Business up to
-- effective_plan, so every reader of users.plan sees the entitled plan. A Business-level plan (agency/business) is left as is.
CREATE OR REPLACE FUNCTION public.apply_legacy_entitlement()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE n integer;
BEGIN
  IF NEW.active THEN
    UPDATE public.users SET plan = NEW.effective_plan WHERE id = NEW.user_id AND public.legacy_plan_rank(plan) < 3;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
      INSERT INTO public.legacy_entitlement_audit (user_id, event, detail)
      VALUES (NEW.user_id, 'plan_normalized', 'stored plan raised to ' || NEW.effective_plan);
    END IF;
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS apply_legacy_entitlement ON public.legacy_entitlements;
CREATE TRIGGER apply_legacy_entitlement
  AFTER INSERT OR UPDATE OF active ON public.legacy_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.apply_legacy_entitlement();

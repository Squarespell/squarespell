# Legacy entitlements (migration 032)

One historical paid Squarespell Quiz account has a paid legacy plan (`agency`) with **no Stripe customer and no Stripe subscription**. Because there is
nothing in Stripe to sync from, an automated billing job could otherwise treat it as unpaid. Migration
`backend/migrations/032_legacy_entitlements.sql` records the grant explicitly so the access is preserved, visible and revocable.

The migration selects rows **by data condition only** (paid legacy plan, no Stripe customer reference, no Stripe subscription reference). It embeds no name,
email, Clerk id or database id. It creates no Stripe object and issues no charge.

## Rule

While an entitlement is **active**, the account is entitled to its `effective_plan` (**Business**), whatever the stored plan says
(agency, business, pro, core, starter, growth, trial, free or empty). Nothing automated can reduce it. Only an explicit, audited revocation removes it.

| Object | Purpose |
| --- | --- |
| `public.legacy_entitlements` | internal user reference, `original_plan`, `effective_plan` (always `business`), `reason_code`, `active`, `granted_at`, `revoked_at`, `revoked_reason` |
| `public.legacy_entitlement_audit` | one row per grant, plan normalisation, blocked change and revocation |
| `public.revoke_legacy_entitlement(user_id, reason)` | the explicit administrative revocation (service role only; a reason is mandatory) |
| `public.legacy_plan_rank(plan)` | pure helper: 3 = business/agency, 2 = pro, 1 = core/starter/growth, 0 = anything else |
| trigger `protect_legacy_entitlement` on `users` | guard 1, see below |
| trigger `apply_legacy_entitlement` on `legacy_entitlements` | guard 2, see below |

## Resolution in the application

`entitledPlan()` (`backend/src/middleware/planGuard.ts`) returns the entitlement's `effective_plan` for any user with an active entitlement, regardless of the stored plan.
`/api/user/plan`, the quiz-creation guards (`guardQuizCreation`, `checkQuizAllowance`) and the feature gates (`requireFeature`) all use it, so the plan response, feature access and quiz limits agree.
A lookup error falls back to the stored plan; it never grants or removes access by itself.

## Guards in the database (narrow, audited)

1. **`protect_legacy_entitlement`** fires only for `UPDATE OF plan` where the plan actually changes, **the new plan is below Business** (pro, core, starter, growth, trial, free, NULL, unknown)
   and the user has an **active** entitlement. It keeps the account at Business (or Agency if that is what is stored), writes a `downgrade_blocked` audit row and raises a NOTICE. A change **to** Business or Agency passes.
   Every other update, for every other user, is untouched.
2. **`apply_legacy_entitlement`** fires when an entitlement row is inserted or its `active` flag changes. Activating one raises a stored plan that is below Business up to Business
   (audited as `plan_normalized`) so that every reader of `users.plan` sees the entitled plan. A Business-level plan is left as it is. Revoking does not change the plan.

Stripe webhooks look users up by Stripe subscription id, so this account is never reached by them; the guards are the backstop for any other automated writer.

## Administrative revocation

Run as the database owner or service role, with a reason:

```sql
SELECT public.revoke_legacy_entitlement('<user uuid>', 'reason for revocation');
```

It sets `active = false`, stamps `revoked_at`, records the reason and writes a `revoked` audit row. After that every plan change applies normally, and re-running the migration
does **not** re-grant it. Verify counts without identities:

```sql
SELECT count(*) FILTER (WHERE active) AS active, count(*) AS total FROM public.legacy_entitlements;
SELECT event, count(*) FROM public.legacy_entitlement_audit GROUP BY event;
```

## Reversal of the migration itself

```sql
BEGIN;
DROP TRIGGER IF EXISTS apply_legacy_entitlement ON public.legacy_entitlements;
DROP TRIGGER IF EXISTS protect_legacy_entitlement ON public.users;
DROP FUNCTION IF EXISTS public.apply_legacy_entitlement();
DROP FUNCTION IF EXISTS public.protect_legacy_entitlement();
DROP FUNCTION IF EXISTS public.revoke_legacy_entitlement(uuid, text);
DROP FUNCTION IF EXISTS public.legacy_plan_rank(text);
-- Optional: keep the two tables as a record. To remove them as well:
-- DROP TABLE public.legacy_entitlement_audit; DROP TABLE public.legacy_entitlements;
DELETE FROM ops.applied_migrations WHERE filename = '032_legacy_entitlements.sql';
COMMIT;
```

Reversal does not change any `users.plan` value; the account keeps its stored plan. Rehearse it (and the whole migration) with
`infra/hostinger-production/scripts/migration-rehearsal.sh`, which works on a disposable clone and prints aggregate counts only.

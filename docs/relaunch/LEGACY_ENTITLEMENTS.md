# Legacy entitlements (migration 032)

One historical paid Squarespell Quiz account has a paid legacy plan (`agency`) with **no Stripe customer and no Stripe subscription**. Because there is
nothing in Stripe to sync from, an automated billing job could otherwise treat it as unpaid. Migration
`backend/migrations/032_legacy_entitlements.sql` records the grant explicitly so the access is preserved, visible and revocable.

The migration selects rows **by data condition only** (paid legacy plan, no Stripe customer reference, no Stripe subscription reference). It embeds no name,
email, Clerk id or database id. It creates no Stripe object and issues no charge.

## What it adds

| Object | Purpose |
| --- | --- |
| `public.legacy_entitlements` | internal user reference, `original_plan`, `effective_plan` (always `business`), `reason_code`, `active`, `granted_at`, `revoked_at`, `revoked_reason` |
| `public.legacy_entitlement_audit` | one row per grant, blocked downgrade and revocation |
| `public.revoke_legacy_entitlement(user_id, reason)` | the explicit administrative revocation (service role only; a reason is mandatory) |
| trigger `protect_legacy_entitlement` on `users` | narrow guard, see below |

## Entitlement resolution

`entitledPlan()` in `backend/src/middleware/planGuard.ts` resolves an active legacy entitlement whose stored plan reads free/trial to **Business**. The stored
`agency` plan already resolves to Business-level limits through `canonicalPlanName`/`PLAN_LIMITS`. `/api/user/plan`, the quiz-creation guards and the feature gates use it.
A lookup error falls back to the stored plan; it never grants or removes access by itself.

## Downgrade protection (the one trigger)

The trigger fires only for `UPDATE OF plan` where the plan actually changes, and acts only when **the new plan is free, trial or NULL and the user has an active
legacy entitlement**. In that case it keeps the original plan, writes a `downgrade_blocked` audit row and raises a NOTICE. Every other update, for every other user, and
every upgrade, is untouched. Stripe webhooks look users up by Stripe subscription id, so this account is never reached by them; the trigger is a backstop for any other automated writer.

## Administrative revocation

Run as the database owner or service role, with a reason:

```sql
SELECT public.revoke_legacy_entitlement('<user uuid>', 'reason for revocation');
```

It sets `active = false`, stamps `revoked_at`, records the reason and writes a `revoked` audit row. After that a plan change to free/trial is applied normally, and re-running the migration
does **not** re-grant it. Verify counts without identities:

```sql
SELECT count(*) FILTER (WHERE active) AS active, count(*) AS total FROM public.legacy_entitlements;
SELECT event, count(*) FROM public.legacy_entitlement_audit GROUP BY event;
```

## Reversal of the migration itself

```sql
BEGIN;
DROP TRIGGER IF EXISTS protect_legacy_entitlement ON public.users;
DROP FUNCTION IF EXISTS public.protect_legacy_entitlement();
DROP FUNCTION IF EXISTS public.revoke_legacy_entitlement(uuid, text);
-- Optional: keep the two tables as a record. To remove them as well:
-- DROP TABLE public.legacy_entitlement_audit; DROP TABLE public.legacy_entitlements;
DELETE FROM ops.applied_migrations WHERE filename = '032_legacy_entitlements.sql';
COMMIT;
```

Reversal does not change any `users.plan` value; the account keeps its stored `agency` plan.

#!/usr/bin/env bash
# Rehearse migration 032 on a DISPOSABLE CLONE of the private production database, or verify the live result afterwards.
# Prints PASS/FAIL lines and aggregate counts only - never rows, names, emails or ids.
#   migration-rehearsal.sh clone [path/to/032_legacy_entitlements.sql]   clone -> apply -> checks -> drop the clone
#   migration-rehearsal.sh live                                           checks on production; downgrade and revocation tests run inside
#                                                                         transactions that are ROLLED BACK
# Environment: EXPECT_USERS (default 9), EXPECT_QUIZZES (default 31).
set -euo pipefail
ROOT=/opt/squarespell-quiz/production
REPO="$ROOT/repo"
MODE="${1:-clone}"
FILE="${2:-$REPO/backend/migrations/032_legacy_entitlements.sql}"
EXPECT_USERS="${EXPECT_USERS:-9}"
EXPECT_QUIZZES="${EXPECT_QUIZZES:-31}"
DC=(docker compose --env-file "$ROOT/.env" -f "$REPO/infra/hostinger-production/docker-compose.production.yml")
CLONE=quiz_rehearsal
fail=0

psqlc() { "${DC[@]}" exec -T db psql -q -v ON_ERROR_STOP=1 -U postgres "$@"; }
val() { psqlc -d "$DB" -At -c "$1"; }
check() { if [ "$2" = "$3" ]; then echo "PASS $1 ($3)"; else echo "FAIL $1 (expected $2, got $3)"; fail=1; fi; }
snap() { val "select md5(coalesce(string_agg(concat_ws('|', id, coalesce(plan,''), coalesce(stripe_customer_id,''), coalesce(stripe_subscription_id,'')), ';' order by id), '')) from public.users"; }
LEGACY_USER="(select user_id from public.legacy_entitlements order by granted_at limit 1)"

state_checks() { # label
  check "$1: users" "$EXPECT_USERS" "$(val 'select count(*) from public.users')"
  check "$1: quizzes" "$EXPECT_QUIZZES" "$(val 'select count(*) from public.quizzes')"
  check "$1: active legacy entitlements" 1 "$(val 'select count(*) from public.legacy_entitlements where active')"
  check "$1: entitlement resolves to business" business "$(val 'select effective_plan from public.legacy_entitlements where active')"
  check "$1: entitled account has no Stripe customer or subscription" 0 "$(val "select count(*) from public.legacy_entitlements le join public.users u on u.id = le.user_id where coalesce(u.stripe_customer_id,'') <> '' or coalesce(u.stripe_subscription_id,'') <> ''")"
}

rolled_back_tests() {
  for p in pro core starter growth free trial; do
    r=$(psqlc -d "$DB" -At <<SQL
begin;
update public.users set plan = '$p' where id = $LEGACY_USER;
select plan from public.users where id = $LEGACY_USER;
rollback;
SQL
)
    check "attempted change to $p is refused (rolled back)" agency "$r"
  done
  r=$(psqlc -d "$DB" -At <<SQL
begin;
update public.users set plan = 'business' where id = $LEGACY_USER;
select plan from public.users where id = $LEGACY_USER;
rollback;
SQL
)
  check "a change to business is allowed (rolled back)" business "$r"
  r=$(psqlc -d "$DB" -At <<SQL | paste -sd, -
begin;
select public.revoke_legacy_entitlement($LEGACY_USER, 'rehearsal (rolled back)');
update public.users set plan = 'free' where id = $LEGACY_USER;
select plan from public.users where id = $LEGACY_USER;
select count(*) from public.legacy_entitlements where active;
rollback;
SQL
)
  check "explicit revocation then plan change works (rolled back): revoke result, plan, active count" "t,free,0" "$r"
  check "after the rollback the entitlement is still active" 1 "$(val 'select count(*) from public.legacy_entitlements where active')"
}

reversal_test() {
  r=$(psqlc -d "$DB" -At <<'SQL' | paste -sd, -
begin;
drop trigger if exists apply_legacy_entitlement on public.legacy_entitlements;
drop trigger if exists protect_legacy_entitlement on public.users;
drop function if exists public.apply_legacy_entitlement();
drop function if exists public.protect_legacy_entitlement();
drop function if exists public.revoke_legacy_entitlement(uuid, text);
drop function if exists public.legacy_plan_rank(text);
delete from ops.applied_migrations where filename = '032_legacy_entitlements.sql';
select to_regprocedure('public.revoke_legacy_entitlement(uuid,text)') is null;
select count(*) from pg_trigger where tgname in ('apply_legacy_entitlement','protect_legacy_entitlement');
rollback;
SQL
)
  check "reversal removes the functions and triggers inside a transaction" "t,0" "$r"
  check "after the rolled-back reversal the guards are back" 2 "$(val "select count(*) from pg_trigger where tgname in ('apply_legacy_entitlement','protect_legacy_entitlement')")"
}

if [ "$MODE" = live ]; then
  DB=quiz_production
  state_checks "live"
  rolled_back_tests
  reversal_test
  check "live: audit granted rows" 1 "$(val "select count(*) from public.legacy_entitlement_audit where event = 'granted'")"
  check "live: audit has no blocked or revoked rows (rolled-back tests left no trace)" 0 "$(val "select count(*) from public.legacy_entitlement_audit where event in ('downgrade_blocked','revoked')")"
else
  DB=$CLONE
  trap 'psqlc -d postgres -c "drop database if exists $CLONE" > /dev/null 2>&1 || true' EXIT
  psqlc -d postgres -c "drop database if exists $CLONE"
  psqlc -d postgres -c "create database $CLONE"
  "${DC[@]}" exec -T db sh -c "pg_dump -U postgres --no-owner quiz_production | psql -q -v ON_ERROR_STOP=1 -U postgres -d $CLONE" > /dev/null
  echo "cloned production into the disposable database $CLONE"
  check "clone: users" "$EXPECT_USERS" "$(val 'select count(*) from public.users')"
  check "clone: quizzes" "$EXPECT_QUIZZES" "$(val 'select count(*) from public.quizzes')"
  check "required roles exist (anon, authenticated, service_role)" 3 "$(val "select count(*) from pg_roles where rolname in ('anon','authenticated','service_role')")"
  check "REST login role exists (authenticator)" 1 "$(val "select count(*) from pg_roles where rolname = 'authenticator'")"
  check "users that qualify (paid legacy plan, no Stripe customer, no Stripe subscription)" 1 "$(val "select count(*) from public.users where lower(plan) = 'agency' and coalesce(stripe_customer_id,'') = '' and coalesce(stripe_subscription_id,'') = ''")"
  before=$(snap); stripe_before=$(val "select count(*) from public.users where coalesce(stripe_customer_id,'') <> '' or coalesce(stripe_subscription_id,'') <> ''")
  psqlc -d "$CLONE" < "$FILE" > /dev/null 2>&1
  echo "applied $(basename "$FILE") to the clone"
  # The official process (migrate.sh) re-grants after every run; emulate that step so privileges are checked as in production.
  psqlc -d "$CLONE" -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;" > /dev/null
  state_checks "after migration"
  check "no user plan, Stripe reference or customer record changed" "$before" "$(snap)"
  check "Stripe-linked users unchanged" "$stripe_before" "$(val "select count(*) from public.users where coalesce(stripe_customer_id,'') <> '' or coalesce(stripe_subscription_id,'') <> ''")"
  check "service_role can use the entitlement tables" t "$(val "select has_table_privilege('service_role','public.legacy_entitlements','select,insert,update') and has_table_privilege('service_role','public.legacy_entitlement_audit','select,insert')")"
  check "service_role may revoke; anon may not" "t,f" "$(val "select has_function_privilege('service_role','public.revoke_legacy_entitlement(uuid,text)','execute') || ',' || has_function_privilege('anon','public.revoke_legacy_entitlement(uuid,text)','execute')" | sed 's/true/t/;s/false/f/')"
  psqlc -d "$CLONE" < "$FILE" > /dev/null 2>&1
  echo "applied it a second time (idempotency)"
  state_checks "after second run"
  check "second run: audit granted rows" 1 "$(val "select count(*) from public.legacy_entitlement_audit where event = 'granted'")"
  check "second run: nothing changed" "$before" "$(snap)"
  rolled_back_tests
  reversal_test
fi

if [ "$fail" = 0 ]; then echo "ALL CHECKS PASSED ($MODE)"; else echo "SOME CHECKS FAILED ($MODE)"; exit 1; fi

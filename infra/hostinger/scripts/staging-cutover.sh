#!/usr/bin/env bash
# Consolidated staging cutover for Clerk verification-code self-delivery (PR #77).
# Wraps the existing set-secret.sh / backup.sh / deploy.sh / migrate.sh -- does not duplicate
# their logic. Run as the deployment user (squarespell) on the Hostinger STAGING VPS only.
#
# Usage:
#   staging-cutover.sh prepare   Deploy the pinned commit dark (CLERK_SELF_DELIVERY_ENABLED=false),
#                                 verify health, migrations, baseline counts and webhook rejection.
#   staging-cutover.sh enable    After prepare succeeded and the Clerk webhook test has been
#                                 confirmed separately: flip the flag on, restart the backend only.
#   staging-cutover.sh rollback  Flip the flag back off and restart the backend only.
set -euo pipefail

DEPLOY_COMMIT=a05e229e192ad91cc3f48e7e046408f5021be2f9

ROOT=/srv/squarespell-quiz/staging
REPO="$ROOT/repo"
ENV_FILE="$ROOT/.env"
SCRIPTS="$REPO/infra/hostinger/scripts"
DC=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/hostinger/docker-compose.staging.yml")

die() { echo "ERROR: $*" >&2; exit 1; }

[ "$(id -un)" = squarespell ] || die "run this as the squarespell user: sudo -iu squarespell bash $0 <mode>"

MODE="${1:-}"
case "$MODE" in
  prepare|enable|rollback) ;;
  *) die "usage: $0 prepare|enable|rollback" ;;
esac

set_config() {
  # $1=NAME $2=value. Non-secret only -- never call this with anything sensitive.
  grep -q "^$1=" "$ENV_FILE" && sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE" || echo "$1=$2" >> "$ENV_FILE"
}

check_secret_presence() {
  # $1=NAME $2=expected-prefix-regex. Prints presence/prefix/length only, never the value.
  local name="$1" prefix="$2" line value
  line="$(grep "^$name=" "$ENV_FILE" || true)"
  [ -n "$line" ] || die "$name is not set in $ENV_FILE"
  value="${line#*=}"
  echo "$value" | grep -Eq "^$prefix" || die "$name does not start with the expected prefix"
  echo "$name: present, correct prefix, length=${#value}"
}

confirm_env_perms() {
  [ -f "$ENV_FILE" ] || die "$ENV_FILE missing"
  local owner perms
  owner="$(stat -c %U:%G "$ENV_FILE")"
  perms="$(stat -c %a "$ENV_FILE")"
  [ "$perms" = 600 ] || die "$ENV_FILE must be mode 600, found $perms"
  echo "$ENV_FILE: owner=$owner mode=$perms"
}

backend_env() {
  # $1=NAME. Reads one env var from the running backend container only.
  "${DC[@]}" exec -T backend printenv "$1" 2>/dev/null || echo ""
}

wait_healthy() {
  local _
  for _ in $(seq 1 60); do
    if curl -fsS https://api-staging.squarespellquiz.com/api/health >/dev/null 2>&1 \
      && curl -fsS https://api-staging.squarespellquiz.com/api/health/ready >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  die "staging did not become healthy in time"
}

# ---------------------------------------------------------------------------
if [ "$MODE" = prepare ]; then
  echo "== CLERK_WEBHOOK_SECRET (hidden prompt via the existing set-secret.sh) =="
  bash "$SCRIPTS/set-secret.sh" CLERK_WEBHOOK_SECRET

  echo "== secret presence checks (values never printed) =="
  check_secret_presence RESEND_API_KEY 're_'
  check_secret_presence CLERK_WEBHOOK_SECRET 'whsec_'
  confirm_env_perms

  echo "== non-secret staging config =="
  set_config CLERK_EMAIL_FROM "Squarespell Quiz <hello@mail.squarespellquiz.com>"
  set_config CLERK_SELF_DELIVERY_ENABLED false
  chmod 600 "$ENV_FILE"
  confirm_env_perms

  echo "== backup =="
  bash "$SCRIPTS/backup.sh"

  echo "== deploy $DEPLOY_COMMIT =="
  bash "$SCRIPTS/deploy.sh" "$DEPLOY_COMMIT"

  echo "== migrate again: must be all-skip, idempotent =="
  bash "$SCRIPTS/migrate.sh" | tee /tmp/migrate-rerun.log
  if grep -q '^apply' /tmp/migrate-rerun.log; then die "migration re-run was not idempotent (re-applied a file)"; fi
  rm -f /tmp/migrate-rerun.log

  echo "== health =="
  wait_healthy
  curl -sS https://api-staging.squarespellquiz.com/api/health; echo
  curl -sS https://api-staging.squarespellquiz.com/api/health/ready; echo
  curl -sS -o /dev/null -w "frontend: %{http_code}\n" https://staging.squarespellquiz.com/
  if ss -ltnp | grep -qE ':(5432|3000|3001|3100)\b'; then die "a database/internal port is published"; fi
  echo "no published internal ports"

  echo "== self-delivery flag on the running backend (expect empty/false) =="
  flag="$(backend_env CLERK_SELF_DELIVERY_ENABLED)"
  [ "$flag" != "true" ] || die "CLERK_SELF_DELIVERY_ENABLED is already true -- expected false after prepare"
  echo "CLERK_SELF_DELIVERY_ENABLED on backend: '${flag:-unset}' (disabled, as expected)"

  echo "== webhook signature tests (no real secret needed) =="
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST https://api-staging.squarespellquiz.com/api/clerk/webhook -H 'content-type: application/json' -d '{"type":"email.created"}')"
  [ "$code" = 400 ] || die "unsigned request expected 400, got $code"
  echo "unsigned request: $code (rejected, correct)"
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST https://api-staging.squarespellquiz.com/api/clerk/webhook -H 'content-type: application/json' -H 'svix-id: msg_test' -H 'svix-timestamp: 1700000000' -H 'svix-signature: v1,bad' -d '{"type":"email.created","data":{}}')"
  [ "$code" = 400 ] || die "bad signature expected 400, got $code"
  echo "invalid signature: $code (rejected, correct)"

  echo "== baseline counts (row counts only) =="
  "${DC[@]}" exec -T db psql -U postgres -d quiz_staging -At -c \
    "select 'users=' || (select count(*) from users) || ' quizzes=' || (select count(*) from quizzes) || ' leads=' || (select count(*) from leads) || ' clerk_email_deliveries=' || (select count(*) from clerk_email_deliveries);"

  echo "== prepare complete =="
  echo "Next: confirm the Clerk webhook test event succeeds against this deployment, then run:"
  echo "  sudo -iu squarespell bash $0 enable"
fi

# ---------------------------------------------------------------------------
if [ "$MODE" = enable ]; then
  [ -f "$ROOT/.deploy-history" ] || die "prepare has not run yet (no deploy history) -- run prepare first"
  deployed="$(tail -n 1 "$ROOT/.deploy-history" | awk '{print $2}')"
  [ "$deployed" = "$DEPLOY_COMMIT" ] || die "deployed commit ($deployed) does not match the expected cutover commit ($DEPLOY_COMMIT) -- re-run prepare"

  set_config CLERK_SELF_DELIVERY_ENABLED true
  chmod 600 "$ENV_FILE"
  confirm_env_perms

  echo "== restarting only the backend =="
  "${DC[@]}" restart backend
  wait_healthy

  flag="$(backend_env CLERK_SELF_DELIVERY_ENABLED)"
  [ "$flag" = "true" ] || die "backend did not pick up CLERK_SELF_DELIVERY_ENABLED=true (got '${flag:-unset}')"
  echo "CLERK_SELF_DELIVERY_ENABLED on backend: $flag (enabled)"
  curl -sS https://api-staging.squarespellquiz.com/api/health; echo

  echo "== enable complete =="
  echo "Rollback if needed:  sudo -iu squarespell bash $0 rollback"
fi

# ---------------------------------------------------------------------------
if [ "$MODE" = rollback ]; then
  set_config CLERK_SELF_DELIVERY_ENABLED false
  chmod 600 "$ENV_FILE"
  confirm_env_perms

  echo "== restarting only the backend =="
  "${DC[@]}" restart backend
  wait_healthy

  flag="$(backend_env CLERK_SELF_DELIVERY_ENABLED)"
  [ "$flag" != "true" ] || die "backend still reports self-delivery enabled after rollback"
  echo "CLERK_SELF_DELIVERY_ENABLED on backend: '${flag:-unset}' (disabled)"
  curl -sS https://api-staging.squarespellquiz.com/api/health; echo

  echo "== rollback complete: no database rows deleted by this script =="
fi

#!/usr/bin/env bash
# Deploy an EXACT commit of Squarespell/squarespell to Hostinger STAGING (never production).
# Usage: deploy.sh <full-40-char-commit-sha>   |   deploy.sh rollback
# Run as the deployment user (squarespell). Needs /srv/squarespell-quiz/staging/.env (see gen-env.sh).
# Builds on the VPS, starts the database, runs the migration chain, starts every service, checks health.
set -euo pipefail
ROOT=/srv/squarespell-quiz/staging
REPO="$ROOT/repo"
ENV_FILE="$ROOT/.env"
HIST="$ROOT/.deploy-history"
REPO_URL=https://github.com/Squarespell/squarespell.git
die() { echo "ERROR: $*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "missing $ENV_FILE (run scripts/gen-env.sh)"
[ "$(stat -c %a "$ENV_FILE")" = 600 ] || die "$ENV_FILE must have mode 600"
if grep -Eq '^STRIPE_SECRET_KEY=(sk|rk)_live_' "$ENV_FILE"; then die "a live Stripe key is set: staging must use test mode only"; fi
DC=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/hostinger/docker-compose.staging.yml")

TARGET="${1:-}"
[ -n "$TARGET" ] || die "usage: deploy.sh <full-commit-sha> | rollback"
if [ "$TARGET" = rollback ]; then
  [ -f "$HIST" ] && [ "$(wc -l < "$HIST")" -ge 2 ] || die "no previous deployment recorded"
  TARGET="$(tail -n 2 "$HIST" | head -n 1 | awk '{print $2}')"
  echo "rolling back the code to $TARGET (database migrations are forward-only and are NOT reverted)"
fi
echo "$TARGET" | grep -Eq '^[0-9a-f]{40}$' || die "give the full 40-character commit SHA"

mkdir -p "$ROOT"
if [ ! -d "$REPO/.git" ]; then git clone --quiet --no-checkout "$REPO_URL" "$REPO"; fi
git -C "$REPO" fetch --quiet origin '+refs/heads/*:refs/remotes/origin/*'
git -C "$REPO" cat-file -e "$TARGET^{commit}" 2>/dev/null || die "commit $TARGET not found on origin"
git -C "$REPO" checkout --quiet --detach "$TARGET"
[ "$(git -C "$REPO" rev-parse HEAD)" = "$TARGET" ] || die "checkout mismatch"

echo "== build $TARGET =="
"${DC[@]}" build

echo "== database =="
"${DC[@]}" up -d db
for i in $(seq 1 60); do
  [ "$("${DC[@]}" ps --format '{{.Health}}' db)" = healthy ] && break
  sleep 2
done
[ "$("${DC[@]}" ps --format '{{.Health}}' db)" = healthy ] || die "database did not become healthy"
"$REPO/infra/hostinger/scripts/migrate.sh"

echo "== services =="
"${DC[@]}" up -d --remove-orphans
for i in $(seq 1 60); do
  st="$("${DC[@]}" ps --format '{{.Service}}={{.Health}}' backend frontend 2>/dev/null | tr '\n' ' ')"
  case "$st" in *backend=healthy*frontend=healthy*|*frontend=healthy*backend=healthy*) break;; esac
  sleep 5
done
"${DC[@]}" exec -T backend node -e "fetch('http://127.0.0.1:3001/api/health/ready').then(r=>{console.log('ready',r.status);process.exit(r.ok?0:1)}).catch(()=>process.exit(1))" || die "API readiness check failed"

echo "$(date -u +%FT%TZ) $TARGET" >> "$HIST"
"${DC[@]}" ps
echo "deployed $TARGET"

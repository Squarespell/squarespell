#!/usr/bin/env bash
# Deploy an EXACT commit of Squarespell/squarespell to the Hostinger PRODUCTION stack (private loopback edge; never public).
# Usage: deploy.sh <full-40-char-commit-sha>
# Run as the deployment user (squarespell). Needs /opt/squarespell-quiz/production/.env (mode 600).
# Builds on the VPS, starts the database, runs the migration chain, starts every service, checks health.
set -euo pipefail
ROOT=/opt/squarespell-quiz/production
REPO="$ROOT/repo"
ENV_FILE="$ROOT/.env"
HIST="$ROOT/.deploy-history"
REPO_URL=https://github.com/Squarespell/squarespell.git
COMPOSE="$REPO/infra/hostinger-production/docker-compose.production.yml"
die() { echo "ERROR: $*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "missing $ENV_FILE"
[ "$(stat -c %a "$ENV_FILE")" = 600 ] || die "$ENV_FILE must have mode 600"
# Deliberate live-Stripe safety control: a live key needs an explicit owner-set STRIPE_LIVE_AUTHORISED=yes.
if grep -Eq '^STRIPE_SECRET_KEY=(sk|rk)_live_' "$ENV_FILE" && ! grep -Eq '^STRIPE_LIVE_AUTHORISED=yes$' "$ENV_FILE"; then
  die "a live Stripe key is set but STRIPE_LIVE_AUTHORISED=yes is not: live Stripe operation is not authorised"
fi

# Settings added after the first install. Created once, never overwritten:
# AUTH_SECRET signs sign-in tokens (generated here); the SMTP_* names are filled in with set-secret.sh.
ensure_setting() { grep -q "^$1=" "$ENV_FILE" || printf '%s=%s\n' "$1" "$2" >> "$ENV_FILE"; }
grep -Eq '^AUTH_SECRET=.{32,}$' "$ENV_FILE" || { sed -i '/^AUTH_SECRET=/d' "$ENV_FILE"; ensure_setting AUTH_SECRET "$(openssl rand -hex 32)"; }
ensure_setting SMTP_HOST smtp.hostinger.com
ensure_setting SMTP_PORT 465
for n in SMTP_USER SMTP_PASS SMTP_FROM; do ensure_setting "$n" ""; done
chmod 600 "$ENV_FILE"

TARGET="${1:-}"
[ -n "$TARGET" ] || die "usage: deploy.sh <full-commit-sha>"
echo "$TARGET" | grep -Eq '^[0-9a-f]{40}$' || die "give the full 40-character commit SHA"

mkdir -p "$ROOT"
if [ ! -d "$REPO/.git" ]; then git clone --quiet --no-checkout "$REPO_URL" "$REPO"; fi
git -C "$REPO" fetch --quiet origin '+refs/heads/*:refs/remotes/origin/*'
git -C "$REPO" cat-file -e "$TARGET^{commit}" 2>/dev/null || die "commit $TARGET not found on origin"
git -C "$REPO" checkout --quiet --detach "$TARGET"
[ "$(git -C "$REPO" rev-parse HEAD)" = "$TARGET" ] || die "checkout mismatch"

DC=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE")

echo "== build $TARGET =="
"${DC[@]}" build

echo "== database =="
"${DC[@]}" up -d db
for _ in $(seq 1 60); do
  [ "$("${DC[@]}" ps --format '{{.Health}}' db)" = healthy ] && break
  sleep 2
done
[ "$("${DC[@]}" ps --format '{{.Health}}' db)" = healthy ] || die "database did not become healthy"
bash "$REPO/infra/hostinger-production/scripts/migrate.sh"

echo "== services =="
"${DC[@]}" up -d --remove-orphans
for _ in $(seq 1 60); do
  st="$("${DC[@]}" ps --format '{{.Service}}={{.Health}}' backend frontend 2>/dev/null | tr '\n' ' ')"
  case "$st" in *backend=healthy*frontend=healthy*|*frontend=healthy*backend=healthy*) break;; esac
  sleep 5
done
"${DC[@]}" exec -T backend node -e "fetch('http://127.0.0.1:3001/api/health/ready').then(r=>{console.log('ready',r.status);process.exit(r.ok?0:1)}).catch(()=>process.exit(1))" || die "API readiness check failed"

# The proxy reads its Caddyfile from a bind mount (admin API off), so a changed file needs a restart to take effect.
CADDY_SUM="$(sha256sum "$REPO/infra/hostinger-production/Caddyfile.production" | cut -d' ' -f1)"
if [ "$CADDY_SUM" != "$(cat "$ROOT/.proxy-caddyfile.sha256" 2>/dev/null || true)" ]; then
  "${DC[@]}" restart proxy
  echo "$CADDY_SUM" > "$ROOT/.proxy-caddyfile.sha256"
fi

echo "$(date -u +%FT%TZ) $TARGET" >> "$HIST"
"${DC[@]}" ps
echo "deployed $TARGET"

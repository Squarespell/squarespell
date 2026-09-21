#!/usr/bin/env bash
# Prepare the public edge WITHOUT taking ports 80/443: write the edge environment file and validate the merged Caddyfile.
# The allowlist comes from /opt/squarespell-quiz/edge.allow (owner-only, never committed, never printed).
set -euo pipefail
ROOT=/opt/squarespell-quiz; PROD=$ROOT/production; STG=/srv/squarespell-quiz/staging
g() { grep -m1 "^$2=" "$1" | cut -d= -f2-; }
[ -s $ROOT/edge.allow ] || { echo "FAIL: $ROOT/edge.allow is missing"; exit 1; }
ALLOW="$(cat $ROOT/edge.allow)"
umask 077
cat > $ROOT/edge.env <<EOF
ACME_EMAIL=$(g $STG/.env ACME_EMAIL)
PROD_APP_HOST=$(g $PROD/.env PROD_APP_HOST)
PROD_API_HOST=$(g $PROD/.env PROD_API_HOST)
STAGING_APP_HOST=$(g $STG/.env STAGING_APP_HOST)
STAGING_API_HOST=$(g $STG/.env STAGING_API_HOST)
GATE_ENABLED=true
GATE_ALLOW_IPS="$ALLOW"
PROD_INDEXING=off
EOF
chmod 600 $ROOT/edge.env
echo "edge.env written: mode $(stat -c %a $ROOT/edge.env), owner $(stat -c %U $ROOT/edge.env)"
for k in ACME_EMAIL PROD_APP_HOST PROD_API_HOST STAGING_APP_HOST STAGING_API_HOST; do v=$(g $ROOT/edge.env $k); [ -n "$v" ] && echo "  $k set" || { echo "  $k EMPTY"; exit 1; }; done
echo "  prod hosts: $(g $ROOT/edge.env PROD_APP_HOST) $(g $ROOT/edge.env PROD_API_HOST)"
echo "  gate: $(g $ROOT/edge.env GATE_ENABLED), indexing: $(g $ROOT/edge.env PROD_INDEXING), allowlist entries: $(echo $ALLOW | wc -w)"
E="--env-file $ROOT/edge.env -f $PROD/repo/infra/hostinger-edge/docker-compose.edge.yml"
echo "== validate the merged Caddyfile with the real environment =="
docker compose $E run --rm --no-deps -T edge caddy validate --config /etc/caddy/Caddyfile 2>&1 | grep -E 'Valid|rror|nvalid' | cut -c1-140
echo "== who owns 80/443 now (must still be the staging proxy) =="
docker ps --format '{{.Names}} {{.Ports}}' | grep -E ':(80|443)->' | cut -c1-110
echo "== staging is up and noindex before the change =="
for h in $(g $ROOT/edge.env STAGING_APP_HOST) $(g $ROOT/edge.env STAGING_API_HOST); do echo "  $h -> $(curl -s -o /dev/null -w '%{http_code}' https://$h/) noindex=$(curl -sI https://$h/ | grep -ci 'x-robots-tag: noindex')"; done

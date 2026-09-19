#!/usr/bin/env bash
# Restore-validate the newest STAGING backup into a SEPARATE temporary database, check it, then drop it.
# Never touches the live staging database contents. Run as the deployment user (squarespell).
set -euo pipefail
ROOT=/srv/squarespell-quiz
BK="$ROOT/backups"
KEY="$BK/.backup.key"
ENV_FILE="$ROOT/staging/.env"
REPO="$ROOT/staging/repo"
DC=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/hostinger/docker-compose.staging.yml")
TMPDB=quiz_restore_test
psql_pg() { "${DC[@]}" exec -T db psql -q -v ON_ERROR_STOP=1 -U postgres "$@"; }

latest="$(ls -1t "$BK"/quiz_staging_*.dump.enc 2>/dev/null | head -n 1)"
[ -n "$latest" ] || { echo "no backup found in $BK (run backup.sh first)"; exit 1; }
( cd "$BK" && sha256sum -c "$(basename "$latest").sha256" )

cleanup() { psql_pg -d postgres -c "DROP DATABASE IF EXISTS $TMPDB" >/dev/null 2>&1 || true; }
trap cleanup EXIT
psql_pg -d postgres -c "DROP DATABASE IF EXISTS $TMPDB" -c "CREATE DATABASE $TMPDB"

echo "restoring $(basename "$latest") into $TMPDB ..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$KEY" -in "$latest" \
  | "${DC[@]}" exec -T db pg_restore -U postgres -d "$TMPDB" --no-owner --exit-on-error

tables_live="$(psql_pg -d quiz_staging -At -c "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")"
tables_rest="$(psql_pg -d "$TMPDB" -At -c "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")"
mig_rest="$(psql_pg -d "$TMPDB" -At -c "select count(*) from ops.applied_migrations where filename like '031\_%'")"
[ "$tables_live" = "$tables_rest" ] && [ "$tables_rest" -gt 0 ] || { echo "FAIL: table count live=$tables_live restored=$tables_rest"; exit 1; }
[ "$mig_rest" = 1 ] || { echo "FAIL: migration 031 record missing in the restored copy"; exit 1; }
echo "PASS: restored copy has $tables_rest public tables (same as live) and the 031 migration record"

cleanup
left="$(psql_pg -d postgres -At -c "select count(*) from pg_database where datname='$TMPDB'")"
[ "$left" = 0 ] || { echo "FAIL: temporary database was not removed"; exit 1; }
trap - EXIT
echo "temporary database $TMPDB removed"

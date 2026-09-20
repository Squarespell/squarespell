#!/usr/bin/env bash
# Restore the newest production dump into a THROWAWAY container (no published ports, no network access to production)
# and reconcile the row count of every public table against the live production database.
set -euo pipefail
P=/opt/squarespell-quiz/production
f=$(ls -1t "$P"/backups/daily/quiz_production-*.dump | head -1)
(cd "$P/backups/daily" && sha256sum -c "$(basename "$f").sha256")
DC=(docker compose --env-file "$P/.env" -f "$P/repo/infra/hostinger-production/docker-compose.production.yml")
C=quiz-prod-restore-test
docker rm -f "$C" >/dev/null 2>&1 || true
docker run -d --name "$C" --network none -e POSTGRES_PASSWORD=restore_test_only --tmpfs /var/lib/postgresql/data postgres:16 >/dev/null
for _ in $(seq 1 30); do docker exec "$C" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 2; done
docker exec "$C" psql -q -U postgres -c "create database restore_check" -c "create role anon nologin" -c "create role authenticated nologin" -c "create role service_role nologin bypassrls" -c "create role authenticator login" >/dev/null
docker cp "$f" "$C":/tmp/r.dump
docker exec "$C" pg_restore -U postgres -d restore_check --no-owner --no-privileges /tmp/r.dump 2>/tmp/restore_err.txt || echo "pg_restore warnings: $(wc -l < /tmp/restore_err.txt) lines"
SQL_COUNTS="select table_name||'='||(xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1"
docker exec "$C" psql -U postgres -At -d restore_check -c "$SQL_COUNTS" > /tmp/rt_restored.txt
"${DC[@]}" exec -T db psql -U postgres -At -d quiz_production -c "$SQL_COUNTS" > /tmp/rt_live.txt
if diff -q /tmp/rt_live.txt /tmp/rt_restored.txt >/dev/null; then
  echo "RESTORE TEST PASSED: $(wc -l < /tmp/rt_live.txt) public tables, row counts identical ($(basename "$f"))"
  rc=0
else
  echo "RESTORE TEST FAILED: count differences"
  diff /tmp/rt_live.txt /tmp/rt_restored.txt | head
  rc=1
fi
docker rm -f "$C" >/dev/null
exit "$rc"

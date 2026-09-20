#!/usr/bin/env bash
# Apply the repository's verified migration chain to the PRODUCTION database (quiz_production) on the private db container.
# Order matches the Phase 1 CI proof: SUPABASE_SCHEMA.sql, backend/migrations/*.sql (002..031, incl. the forward-only
# 031 reconciliation), then backend/src/db/migrations/20260415_email_automation.sql.
# Re-runnable: applied files are recorded in ops.applied_migrations and skipped. It only talks to the local db
# container - never to Supabase.
set -euo pipefail
ROOT=/opt/squarespell-quiz/production
REPO="$ROOT/repo"
ENV_FILE="$ROOT/.env"
AUTHENTICATOR_PASSWORD="$(grep -m1 '^AUTHENTICATOR_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
export AUTHENTICATOR_PASSWORD
[ -n "$AUTHENTICATOR_PASSWORD" ] || { echo "AUTHENTICATOR_PASSWORD is empty in the env file"; exit 1; }
DC=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/hostinger-production/docker-compose.production.yml")
q() { "${DC[@]}" exec -T db psql -q -v ON_ERROR_STOP=1 -U postgres -d quiz_production "$@"; }

echo "== roles, auth stubs, bookkeeping =="
"${DC[@]}" exec -T -e AUTHENTICATOR_PASSWORD db sh -c 'psql -q -v ON_ERROR_STOP=1 -U postgres -d quiz_production -v pw="$AUTHENTICATOR_PASSWORD"' <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'service_role'::text $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
SELECT format('CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD %L', :'pw') WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator')
\gexec
SELECT format('ALTER ROLE authenticator PASSWORD %L', :'pw')
\gexec
GRANT anon, authenticated, service_role TO authenticator;
CREATE SCHEMA IF NOT EXISTS ops;
CREATE TABLE IF NOT EXISTS ops.applied_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
SQL

applied() { q -At -c "select 1 from ops.applied_migrations where filename = '$1'"; }
apply() {
  local name="$1" file="$2"
  [ -f "$file" ] || { echo "missing $file"; exit 1; }
  if [ "$(applied "$name")" = 1 ]; then echo "skip   $name"; return 0; fi
  echo "apply  $name"
  q < "$file" > /dev/null
  q -c "insert into ops.applied_migrations(filename) values ('$name')"
}

apply 000_SUPABASE_SCHEMA.sql "$REPO/SUPABASE_SCHEMA.sql"
for f in $(ls "$REPO"/backend/migrations/*.sql | LC_ALL=C sort); do apply "$(basename "$f")" "$f"; done
apply 20260415_email_automation.sql "$REPO/backend/src/db/migrations/20260415_email_automation.sql"

echo "== grants for the REST layer =="
q <<'SQL'
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
NOTIFY pgrst, 'reload schema';
SQL

[ "$(q -At -c "select count(*) from ops.applied_migrations where filename like '031\_%'")" = 1 ] || { echo "migration 031 is NOT applied"; exit 1; }
echo "migrations recorded: $(q -At -c 'select count(*) from ops.applied_migrations') (031 present)"
echo "public tables: $(q -At -c "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")"

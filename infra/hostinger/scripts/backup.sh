#!/usr/bin/env bash
# Encrypted STAGING database backup (temporary, on-server). Run as the deployment user (squarespell).
# Dumps go to /srv/squarespell-quiz/backups (a host directory, OUTSIDE the live database volume) as
# AES-256 encrypted files. The key is generated once into backups/.backup.key (mode 600) and is never printed.
# IMPORTANT: this is NOT an independent backup. An off-server destination is still required before production.
# Retention: newest 7 dumps. Schedule (as squarespell):  17 3 * * *  /srv/squarespell-quiz/staging/repo/infra/hostinger/scripts/backup.sh
set -euo pipefail
umask 077
ROOT=/srv/squarespell-quiz
BK="$ROOT/backups"
KEY="$BK/.backup.key"
ENV_FILE="$ROOT/staging/.env"
REPO="$ROOT/staging/repo"
DC=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/hostinger/docker-compose.staging.yml")

mkdir -p "$BK"
if [ ! -f "$KEY" ]; then
  openssl rand -base64 48 > "$KEY"; chmod 600 "$KEY"
  echo "created the backup key at $KEY. Keep a copy OFF this server in a password manager (never in git, chat or logs)."
fi

ts="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BK/quiz_staging_$ts.dump.enc"
"${DC[@]}" exec -T db pg_dump -U postgres -Fc quiz_staging \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass "file:$KEY" -out "$out.tmp"
mv "$out.tmp" "$out"
( cd "$BK" && sha256sum "$(basename "$out")" > "$(basename "$out").sha256" )
ls -1t "$BK"/quiz_staging_*.dump.enc 2>/dev/null | tail -n +8 | while read -r f; do rm -f "$f" "$f.sha256"; done
echo "backup written: $out ($(stat -c %s "$out") bytes, mode $(stat -c %a "$out"))"

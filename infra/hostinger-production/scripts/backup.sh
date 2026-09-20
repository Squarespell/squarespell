#!/usr/bin/env bash
# Daily logical backup of the PRODUCTION Quiz database (quiz_production). Owner-only files, 14-day retention.
# Scheduled by /etc/cron.d/squarespell-quiz-production-backup (02:15 UTC). Hostinger's weekly VPS backup is an extra layer.
set -euo pipefail
umask 077
P=/opt/squarespell-quiz/production
D=$P/backups/daily
ts=$(date -u +%Y%m%dT%H%M%SZ)
f=$D/quiz_production-$ts.dump
DC=(docker compose --env-file "$P/.env" -f "$P/repo/infra/hostinger-production/docker-compose.production.yml")
mkdir -p "$D" "$P/logs"
"${DC[@]}" exec -T db pg_dump -U postgres -d quiz_production -Fc > "$f.tmp"
if [ ! -s "$f.tmp" ]; then
  echo "$ts FAILED empty dump" >> "$P/logs/backup.log"
  rm -f "$f.tmp"
  exit 1
fi
mv "$f.tmp" "$f"
(cd "$D" && sha256sum "$(basename "$f")" > "$(basename "$f").sha256")
find "$D" -name 'quiz_production-*.dump*' -mtime +14 -delete
echo "$ts ok $(stat -c %s "$f") bytes" >> "$P/logs/backup.log"
echo "backup $f"

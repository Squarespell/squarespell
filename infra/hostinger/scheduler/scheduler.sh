#!/bin/sh
# Squarespell Quiz STAGING scheduler / worker. Calls the API's existing cron endpoints (all POST, guarded by
# requireCronSecret) with the x-cron-secret header, mirroring render.yaml. All times are UTC.
# Usage: scheduler.sh worker | scheduler | health
# Jobs that can send email run only when ENABLE_EMAIL_JOBS=true (staging default: false; use Resend sandbox).
set -u
MODE="${1:-scheduler}"
API="${API_URL:-http://backend:3001}"

if [ "$MODE" = health ]; then
  for f in /tmp/alive-*; do
    [ -f "$f" ] || exit 1
    age=$(( $(date +%s) - $(cat "$f") ))
    [ "$age" -lt 180 ] && exit 0
  done
  exit 1
fi

call() {
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 90 -X POST \
    -H 'Content-Type: application/json' -H "x-cron-secret: ${CRON_SECRET}" -d '{}' "$API$1") || code=000
  echo "$(date -u +%FT%TZ) $MODE POST $1 -> $code"
}

email_ok() { [ "${ENABLE_EMAIL_JOBS:-false}" = true ]; }
ALIVE="/tmp/alive-$MODE"

while true; do
  date +%s > "$ALIVE"
  m=$(date -u +%M); h=$(date -u +%H); dow=$(date -u +%u); dom=$(date -u +%d)
  m=${m#0}; h=${h#0}; dom=${dom#0}
  m=${m:-0}; h=${h:-0}
  if [ "$MODE" = worker ]; then
    # Email-queue drain (the in-process timer is disabled on the API for staging).
    if email_ok && [ $((m % 5)) -eq 0 ]; then call /api/cron/process-email-queue; fi
  else
    if email_ok && [ $((m % 5)) -eq 0 ]; then call /api/cron/process-scheduled-sends; fi
    if [ "$m" -eq 30 ]; then call /api/cron/cleanup-preview-cache; fi
    if email_ok && [ "$m" -eq 0 ] && [ "$h" -eq 9 ]; then call /api/cron/trial-reminders; call /api/cron/lead-milestones; fi
    if email_ok && [ "$m" -eq 0 ] && [ "$h" -eq 10 ] && [ "$dow" -eq 1 ]; then call /api/cron/weekly-digest; fi
    if email_ok && [ "$m" -eq 0 ] && [ "$h" -eq 10 ] && [ "$dom" -eq 1 ]; then call /api/cron/monthly-report; fi
  fi
  s=$(date -u +%S); s=${s#0}; s=${s:-0}
  sleep $((61 - s))
done

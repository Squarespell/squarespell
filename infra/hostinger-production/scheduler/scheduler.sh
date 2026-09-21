#!/bin/sh
# Squarespell Quiz PRODUCTION scheduler / worker. Calls the API's cron endpoints (all POST, guarded by requireCronSecret) over the
# private compose network only, mirroring render.yaml. The proxy blocks /api/cron/* publicly, so nothing here is reachable from the internet.
# All times are UTC.
#   scheduler.sh worker | scheduler | health | once </api/cron/path>
# Safety controls (environment):
#   ENABLE_EMAIL_JOBS=true   jobs that can email customers run only when this is true (default false)
#   DRY_RUN=true             log what would run and call nothing (for rehearsing a config change)
# Visibility: every call logs one line ("ERROR" on any non-2xx). Consecutive failures per job are counted, and the container
# reports unhealthy after 3 in a row, so 'docker compose ps' shows a failing job. Runs are stamped per minute so one container never
# fires the same minute twice.
set -u
MODE="${1:-scheduler}"
API="${API_URL:-http://backend:3001}"
STATE=/tmp/sched
mkdir -p "$STATE"

if [ "$MODE" = health ]; then
  fresh=1
  for f in "$STATE"/alive-*; do
    [ -f "$f" ] || continue
    age=$(( $(date +%s) - $(cat "$f") ))
    [ "$age" -lt 180 ] && fresh=0
  done
  [ "$fresh" -eq 0 ] || exit 1
  for f in "$STATE"/fail-*; do
    [ -f "$f" ] || continue
    [ "$(cat "$f")" -ge 3 ] && exit 1
  done
  exit 0
fi

call() {
  if [ "${DRY_RUN:-false}" = true ]; then echo "$(date -u +%FT%TZ) $MODE DRY-RUN would POST $1"; return 0; fi
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 90 -X POST \
    -H 'Content-Type: application/json' -H "x-cron-secret: ${CRON_SECRET}" -d '{}' "$API$1") || code=000
  key="$STATE/fail-$(echo "$1" | tr '/' '_')"
  case "$code" in
    2??) rm -f "$key"; echo "$(date -u +%FT%TZ) $MODE POST $1 -> $code"; return 0 ;;
    *) n=$(( $(cat "$key" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$key"
       echo "$(date -u +%FT%TZ) $MODE ERROR POST $1 -> $code (consecutive failures: $n)"; return 1 ;;
  esac
}

if [ "$MODE" = once ]; then
  case "${2:-}" in
    /api/cron/*) call "$2"; exit $? ;;
    *) echo "usage: scheduler.sh once /api/cron/<job>"; exit 2 ;;
  esac
fi

email_ok() { [ "${ENABLE_EMAIL_JOBS:-false}" = true ]; }
ALIVE="$STATE/alive-$MODE"
LAST=""

while true; do
  date +%s > "$ALIVE"
  stamp=$(date -u +%Y%m%d%H%M)
  if [ "$stamp" = "$LAST" ]; then sleep 5; continue; fi
  LAST="$stamp"
  m=$(date -u +%M); h=$(date -u +%H); dow=$(date -u +%u); dom=$(date -u +%d)
  m=${m#0}; h=${h#0}; dom=${dom#0}
  m=${m:-0}; h=${h:-0}
  if [ "$MODE" = worker ]; then
    # Email-queue drain every 5 minutes (the API's in-process timer is disabled: DISABLE_INPROCESS_EMAIL_QUEUE=true).
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

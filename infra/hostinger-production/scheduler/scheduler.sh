#!/bin/sh
# Squarespell Quiz PRODUCTION scheduler / worker. Calls the API's cron endpoints (all POST, guarded by requireCronSecret) over the
# private compose network only, mirroring render.yaml. The proxy blocks /api/cron/* publicly, so nothing here is reachable from the internet.
# All times are UTC.
#   scheduler.sh worker | scheduler | health | once </api/cron/path>
# Safety controls (environment):
#   ENABLE_EMAIL_JOBS=true   jobs that can email customers run only when this is true (default false)
#   DRY_RUN=true             log what would run and call nothing (for rehearsing a config change)
#   STATE_DIR                persistent state (a Docker volume, one per container); default /home/curl_user/state
# Exactly-once per minute: before a job is called, a marker <STATE_DIR>/ran/<job>.<YYYYMMDDHHMM> is created. A restart, a second
# tick or a manual 'docker compose restart' inside the same minute finds the marker and skips the job. The marker is written BEFORE the
# request, so a crash mid-request never repeats a customer email; the price is that a failed job is not retried inside its minute.
# Deliberate retry of a failed job:  docker compose exec scheduler sh /opt/scheduler.sh once /api/cron/<job>   (bypasses the marker).
# Visibility: every call logs one line ("ERROR" on any non-2xx). Consecutive failures per job are counted, and the container
# reports unhealthy after 3 in a row, so 'docker compose ps' shows a failing job (counters reset when the container starts).
set -u
MODE="${1:-scheduler}"
API="${API_URL:-http://backend:3001}"
STATE="${STATE_DIR:-/home/curl_user/state}"

# NOW_EPOCH is a test hook only (fixed clock); in production the real time is used.
now() { if [ -n "${NOW_EPOCH:-}" ]; then date -u -d "@$NOW_EPOCH" "$@"; else date -u "$@"; fi; }

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

mkdir -p "$STATE/ran" || { echo "$(now +%FT%TZ) $MODE ERROR cannot create state directory $STATE" >&2; exit 1; }

call() {
  path="$1"
  key="$(echo "$path" | tr '/' '_')"
  stamp="$(now +%Y%m%d%H%M)"
  if [ "${DRY_RUN:-false}" = true ]; then echo "$(now +%FT%TZ) $MODE DRY-RUN would POST $path"; return 0; fi
  if [ "${2:-}" != manual ]; then
    marker="$STATE/ran/$key.$stamp"
    if [ -e "$marker" ]; then echo "$(now +%FT%TZ) $MODE SKIP $path (already ran in minute $stamp)"; return 0; fi
    : > "$marker"
  fi
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 90 -X POST \
    -H 'Content-Type: application/json' -H "x-cron-secret: ${CRON_SECRET}" -d '{}' "$API$path") || code=000
  case "$code" in
    2??) rm -f "$STATE/fail-$key"; echo "$(now +%FT%TZ) $MODE POST $path -> $code"; return 0 ;;
    *) n=$(( $(cat "$STATE/fail-$key" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$STATE/fail-$key"
       echo "$(now +%FT%TZ) $MODE ERROR POST $path -> $code (consecutive failures: $n)"; return 1 ;;
  esac
}

if [ "$MODE" = once ]; then
  case "${2:-}" in
    /api/cron/*) call "$2" manual; exit $? ;;
    *) echo "usage: scheduler.sh once /api/cron/<job>"; exit 2 ;;
  esac
fi

email_ok() { [ "${ENABLE_EMAIL_JOBS:-false}" = true ]; }
ALIVE="$STATE/alive-$MODE"

tick() {
  m=$(now +%M); h=$(now +%H); dow=$(now +%u); dom=$(now +%d)
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
}

# Test hook: run one tick for the (fixed) clock and exit, as a restarted container would.
if [ "${SCHEDULER_ONE_TICK:-}" = 1 ]; then tick; exit 0; fi

rm -f "$STATE"/fail-*
while true; do
  date +%s > "$ALIVE"
  tick
  # Markers older than two days are no longer needed.
  if [ "$(now +%M)" = 07 ]; then find "$STATE/ran" -type f -mtime +2 -exec rm -f {} + 2>/dev/null || true; fi
  s=$(date -u +%S); s=${s#0}; s=${s:-0}
  sleep $((61 - s))
done

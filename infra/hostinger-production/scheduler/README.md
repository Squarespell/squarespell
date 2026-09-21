# Production scheduler

`scheduler.sh` runs in two containers of the production stack: **scheduler** (scheduled sends, cache cleanup, lifecycle, weekly and monthly emails) and **worker** (email-queue drain). Both call the API over the private network only; the public proxy answers 404 for `/api/cron/*`.

## State and exactly-once

Each container has its **own persistent Docker volume**, mounted at `/home/curl_user` and used as `STATE_DIR=/home/curl_user/state`:

| Container | Volume (compose project `squarespell-quiz-production`) |
| --- | --- |
| scheduler | `scheduler_state` |
| worker | `worker_state` |

Staging is a different compose project with its own scheduler and no such volumes, so staging and production state never mix.

Before a job is called, a marker `ran/<job>.<YYYYMMDDHHMM>` is written. A restart in the same minute finds it and logs `SKIP ... (already ran in minute ...)`. The marker is written **before** the request, so a crash mid-request cannot send a customer email twice. Markers older than two days are pruned.
Proven by `backend/src/__tests__/phase1/schedulerRestart.test.ts` (real script, fixed clock, fake curl, a fresh process per tick).

## Email jobs

Off unless `SCHEDULER_ENABLE_EMAIL_JOBS=true` is set in the server env file (default false). With them off only `cleanup-preview-cache` runs. `SCHEDULER_DRY_RUN=true` logs what would run and calls nothing.

## Deliberately retrying a failed job

A failed job is logged as `ERROR`, counted, and the container reports **unhealthy** after 3 consecutive failures (`docker compose ps`). It is not retried inside its minute, on purpose. To retry it once, deliberately:

```bash
docker compose --env-file /opt/squarespell-quiz/production/.env -f infra/hostinger-production/docker-compose.production.yml exec scheduler sh /opt/scheduler.sh once /api/cron/<job>
```

`once` bypasses the marker and accepts only `/api/cron/*` paths. Use `exec worker` for `process-email-queue`. Do not retry email jobs until the cause is understood.

# Hostinger STAGING - deployment and rollback runbook (Squarespell Quiz)

Scope: STAGING only (staging.squarespellquiz.com, api-staging.squarespellquiz.com) on the Hostinger KVM 2 VPS
squarespell-quiz-us-1 (Ubuntu 24.04 LTS, United States - Boston). Nothing here touches production, Supabase,
Vercel, Render, the root domain, the marketplace, or live Stripe.

## Architecture (matches the repository; no second application)

- proxy (obsolete, off by default): a standalone Caddy kept behind the compose profile standalone-proxy. It publishes no host ports. The public edge (infra/hostinger-edge) owns ports 80 and 443 and routes the two staging hosts to the frontend and backend containers; /api/cron/* is blocked there. The staging stack publishes no host ports at all, and CI proves it.
- frontend: Next.js 14 (frontend/), Clerk. NEXT_PUBLIC_* values are baked in at image build.
- backend: Express API (backend/), port 3001 internal. Health: /api/health and /api/health/ready.
- db + rest + gateway: the API talks to Supabase through supabase-js (PostgREST). Staging reproduces that on a
  private PostgreSQL 16 container with PostgREST and a small internal gateway that strips /rest/v1.
  db, rest, gateway, worker and scheduler are on an internal-only Docker network. No database port is published.
- worker: drains the email queue over HTTP (POST /api/cron/process-email-queue). The repository has no separate
  queue process; the in-process timer is disabled on the API (DISABLE_INPROCESS_EMAIL_QUEUE=true) so it runs once.
- scheduler: runs the render.yaml crons over HTTP (scheduled sends, lifecycle, weekly digest, monthly report,
  preview-cache cleanup) using CRON_SECRET. Email-sending jobs stay off unless SCHEDULER_ENABLE_EMAIL_JOBS=true.

## One-time server setup (as root in the Hostinger web console)

    curl -fsSL -o /root/host-baseline.sh https://raw.githubusercontent.com/Squarespell/squarespell/<COMMIT>/infra/hostinger/scripts/host-baseline.sh
    sha256sum /root/host-baseline.sh    # must equal the SHA-256 recorded by the passing CI run for <COMMIT>
    bash -n /root/host-baseline.sh
    bash /root/host-baseline.sh

Never pipe a downloaded script into a shell. Download it, verify the checksum, syntax-check it, then run it.
Scripts are invoked with bash explicitly (files created through the GitHub web editor are not marked executable).

Applies hostname, UTC, security updates, unattended upgrades, UFW (22/80/443 only), fail2ban, Docker Engine and
Compose, the squarespell user and /srv/squarespell-quiz/{staging,backups}. Root and password SSH are NOT changed.
Add a PUBLIC key for squarespell (SQUARESPELL_PUBKEY), test key login from a second session, and only then consider
restricting root/password SSH. Members of the docker group are root-equivalent; keep that group to squarespell.

## Secrets (never in git, chat or logs)

    sudo -iu squarespell
    git clone https://github.com/Squarespell/squarespell.git /srv/squarespell-quiz/staging/repo   # first time only
    bash /srv/squarespell-quiz/staging/repo/infra/hostinger/scripts/gen-env.sh
    bash /srv/squarespell-quiz/staging/repo/infra/hostinger/scripts/set-secret.sh CLERK_SECRET_KEY    # prompts silently

gen-env.sh generates the database, JWT, encryption and cron secrets straight into the owner-only .env.
set-secret.sh accepts one value at a time with no echo and refuses live Stripe keys.

## DNS (staging only)

Two A records, TTL 300: staging.squarespellquiz.com and api-staging.squarespellquiz.com -> the VPS IPv4.
Do not change the root, www, nameservers, email records or squarespell.com.

## Deploy an exact commit

    bash /srv/squarespell-quiz/staging/repo/infra/hostinger/scripts/deploy.sh <full-40-char-sha>

Builds on the VPS, starts db, applies the full migration chain (SUPABASE_SCHEMA.sql, migrations 002-031, the
20260415 email automation file) to the EMPTY staging database, starts all services, waits for health and readiness.
Re-running skips migrations already recorded in ops.applied_migrations.

## Verify

    docker compose ps            # from the compose directory, or use deploy.sh output
    curl -sS https://api-staging.squarespellquiz.com/api/health
    curl -sS https://api-staging.squarespellquiz.com/api/health/ready
    node scripts/smoke/smoke.mjs --base-url https://api-staging.squarespellquiz.com --frontend-url https://staging.squarespellquiz.com --allow-live

The smoke script needs --allow-live because the host contains squarespellquiz.com; it uses the P1-SMOKE tag and a
Clerk TEST session token read from the environment. Confirm no published database ports:

    ss -ltnp | grep -E ':(5432|3000|3001|3100)\b' || echo "no published internal ports"

## Rollback

    bash /srv/squarespell-quiz/staging/repo/infra/hostinger/scripts/deploy.sh rollback

Redeploys the previous commit recorded in .deploy-history. Migrations are forward-only and are not reverted;
migration 031 is additive. To reset staging completely: stop the stack, remove the pgdata volume, redeploy.

## Clerk verification-code self-delivery cutover (PR #77)

One script, three modes, wrapping set-secret.sh / backup.sh / deploy.sh / migrate.sh above -- it does not
duplicate their logic. Run as the deployment user (squarespell). Never pass a secret as an argument; the
script prompts silently for CLERK_WEBHOOK_SECRET the same way set-secret.sh always has.

    sudo -iu squarespell bash /srv/squarespell-quiz/staging/repo/infra/hostinger/scripts/staging-cutover.sh prepare

Prompts once for CLERK_WEBHOOK_SECRET (the signing secret of the email.created webhook endpoint on the
Development Clerk instance), sets CLERK_EMAIL_FROM and CLERK_SELF_DELIVERY_ENABLED=false, backs up, deploys
the exact commit the script is pinned to, re-runs migrations to prove idempotency, checks health, confirms
the running backend still has self-delivery disabled, tests unsigned/invalid-signature webhook rejection,
and prints safe baseline row counts. Exits nonzero on any failure; prints no secret or PII.

Between prepare and enable: send a signed test event from the Clerk endpoint's Testing tab and confirm it is
accepted with self-delivery still disabled.

    sudo -iu squarespell bash /srv/squarespell-quiz/staging/repo/infra/hostinger/scripts/staging-cutover.sh enable

Refuses to run unless prepare deployed this exact commit. Sets CLERK_SELF_DELIVERY_ENABLED=true, restarts
only the backend, confirms the running container sees the flag, confirms health. Makes no Clerk-dashboard
change itself -- disable "Delivered by Clerk" on the verification-code template separately, after this
succeeds.

    sudo -iu squarespell bash /srv/squarespell-quiz/staging/repo/infra/hostinger/scripts/staging-cutover.sh rollback

Sets CLERK_SELF_DELIVERY_ENABLED=false, restarts only the backend, confirms health. Deletes no database rows.

## Backups and restore test (temporary, on-server)

    bash scripts/backup.sh         # encrypted dump in /srv/squarespell-quiz/backups, outside the database volume
    bash scripts/restore-validate.sh # restores the newest dump into quiz_restore_test, checks it, drops it

An INDEPENDENT off-server encrypted backup destination is still required before production. Do not treat the
on-server dumps or Hostinger weekly backups as sufficient.

## Known differences from production

- Database is PostgreSQL + PostgREST, not Supabase (no Supabase Auth; the app uses Clerk). RLS is present; the API
  uses a service_role JWT signed with the staging PGRST_JWT_SECRET.
- Rate limiting uses Upstash when configured; leave it empty for staging unless a staging database is created.
- Staging is served with X-Robots-Tag noindex.

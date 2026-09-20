# Hostinger PRODUCTION stack

Production configuration for the Squarespell Quiz VPS. It sits beside `infra/hostinger` (staging) and reuses its Dockerfiles, REST gateway configuration and scheduler. Nothing here publishes a service to the internet: the only port is the loopback edge proxy `127.0.0.1:18080`. Public exposure, DNS and removal of noindex happen only at the approved cutover (see `docs/relaunch/SQUARESPELL_PRODUCTION_READINESS.md`).

## Layout on the VPS

`/opt/squarespell-quiz/production` holds `.env` (mode 600, never committed), `repo/` (checked out at the deployed commit), `backups/`, `logs/` and `storage/`. Docker Compose project: `squarespell-quiz-production` (own network, database volume, containers). Staging in `/srv/squarespell-quiz/staging` is separate and untouched.

## Files

| File | Purpose |
| --- | --- |
| `docker-compose.production.yml` | The stack. Passes the plan price IDs and the six add-on price IDs (`STRIPE_LEAD_500/1500/3000_PRICE_ID`, `STRIPE_EMAIL_1000/5000/10000_PRICE_ID`) to the API. |
| `Caddyfile.production` | Private HTTP edge, Host-header routing, noindex header, embed headers, public block on `/api/cron/*`. |
| `.env.production.example` | Variable names only. |
| `scripts/deploy.sh <sha>` | Builds and starts an exact 40-character commit, runs migrations, checks readiness. |
| `scripts/migrate.sh` | Applies the verified migration chain to `quiz_production` (re-runnable). |
| `scripts/backup.sh`, `scripts/restore-test.sh` | Daily backup with 14-day retention; restore into a throwaway container and reconcile counts. |
| `scripts/set-secret.sh NAME` | Hidden prompt for one secret; `--check NAME` prints only set/empty, length and a known public prefix. |

## Live-Stripe safety control

A live Stripe key (`sk_live_` or `rk_live_`) is refused by both `scripts/deploy.sh` and `scripts/set-secret.sh` unless the owner has set `STRIPE_LIVE_AUTHORISED=yes` in the server env file. The variable is a deployment guard only and is not passed to any container. Set it only when live Stripe operation has been approved. Clerk, Anthropic, Resend and Stripe webhook values are also prefix-checked when entered.

## Secrets

Enter provider secrets on the server with `sudo -u squarespell bash /opt/squarespell-quiz/production/repo/infra/hostinger-production/scripts/set-secret.sh NAME`. Never paste secrets into chat, tickets or GitHub. `ENCRYPTION_KEY` must equal the existing Quiz production key so stored encrypted integration credentials stay readable.

## Deploy

```
sudo -u squarespell bash /opt/squarespell-quiz/production/repo/infra/hostinger-production/scripts/deploy.sh <full-40-char-sha>
```

The Clerk publishable key is compiled into the frontend, so every change to it needs a redeploy.

## Deployment freezes

Vercel Production is pinned to the `vercel-production-hold` branch and Render auto-deploy is Off, so merges to `main` do not deploy the old hosts.

# Public TLS edge

One Caddy container (`squarespell-quiz-edge`) owns ports 80/443 and routes by hostname to the existing stacks. It replaces the staging proxy as the public listener; the staging Caddyfile blocks are reproduced unchanged and the staging certificate volumes are reused.

| Host | Goes to |
| --- | --- |
| `squarespellquiz.com` | private production proxy (frontend) |
| `www.squarespellquiz.com` | 301 to the apex |
| `api.squarespellquiz.com` | private production proxy (backend; `/api/cron/*` is 404 there) |
| staging hosts | staging frontend / backend, always `noindex` |

## Launch gate

`GATE_ENABLED=true` (default): production answers **503 "being prepared"** to everyone except the IPs in `GATE_ALLOW_IPS`. On the API host the exact paths
`/api/stripe/webhook`, `/api/clerk/webhook` and `/api/webhooks/resend` stay reachable so provider webhooks can be tested. No password or secret is involved.
While the gate is on, production always sends `X-Robots-Tag: noindex, nofollow`.

## Cutover

```bash
cd /opt/squarespell-quiz/production/repo
E="--env-file /opt/squarespell-quiz/edge.env -f infra/hostinger-edge/docker-compose.edge.yml"
# 1. validate the Caddyfile with the real environment
docker compose $E run --rm --no-deps -T edge caddy validate --config /etc/caddy/Caddyfile
# 2. hand ports 80/443 from the staging proxy to the edge (staging proxy is stopped, not removed)
docker compose --env-file /srv/squarespell-quiz/staging/.env -f /srv/squarespell-quiz/staging/repo/infra/hostinger/docker-compose.staging.yml -p squarespell-quiz-staging stop proxy
docker compose $E up -d
```

## Launch (only at the approved release)

Set `GATE_ENABLED=false` and `PROD_INDEXING=on` in `/opt/squarespell-quiz/edge.env`, then `docker compose $E up -d` (recreates the edge; about one second).

## Rollback

```bash
docker compose $E down          # removes the edge, releases 80/443
docker compose --env-file /srv/squarespell-quiz/staging/.env -f /srv/squarespell-quiz/staging/repo/infra/hostinger/docker-compose.staging.yml -p squarespell-quiz-staging start proxy
```

Then, for a full return to the previous public state, reverse DNS (`@` A back to its previous value, remove the `api` A record) - see docs/relaunch.

# Squarespell Quiz - Hostinger production-readiness record

Status: **private production stack built and verified; NOT public.** No DNS, Vercel, Render, staging or squarespell.com change was made by this work. This record contains no secret values (variable names and status only).

## Update, 21 September 2026: final preparation results (supersedes the older sections below where they differ)

Aggregate counts and status only. No secret, connection string, customer name or email address appears here.

**Deployment state.** `main` is `e23497e` (PRs #63, #65 and #67 merged). Render auto-deploy is **Off** and the `squarespell-api` service is unchanged (still deployment `ba31ab6`, healthy). Vercel Production is pinned to `vercel-production-hold` and its deployment is unchanged. The Hostinger production stack was rebuilt from `e23497e` with every credential in place and remains private (`127.0.0.1:18080` only). Staging is unchanged.

**Credentials configured on the server (names and status only).** Clerk production publishable and secret keys (live prefixes); `ENCRYPTION_KEY` set to the existing Quiz production value (64 characters); Anthropic key from a dedicated "Squarespell Quiz Production" workspace with a $50 monthly spend limit (workspace-scoped, no expiry, rotate manually); Resend sending-only key restricted to `mail.squarespellquiz.com`; Stripe restricted live key with only Checkout Sessions, Customer Portal and Subscriptions (write), Invoices, Prices, Products, Customers and PaymentIntents (read) and Charges and Refunds (write). `STRIPE_LIVE_AUTHORISED=yes` is set (authorises using the live key; it does not authorise a payment). The Stripe webhook is **not** created and email scheduling jobs remain off. Verified sender: `hello@mail.squarespellquiz.com`.

**DNS records added (verification only).** Resend: one TXT (DKIM) and two CNAME records under `mail`. Clerk: five CNAME records (`clerk`, `accounts`, `clkmail`, `clk._domainkey`, `clk2._domainkey`). The root, `www`, `staging` and `api-staging` records are unchanged and there is no `api` record. Resend domain: Verified. Clerk: Frontend API and Account portal Verified, Email 3 of 3 verified.

**Clerk user migration (option A).** Source (development instance) 12 users: 12 with a verified primary email, 8 with a linked social login, 0 banned. Production instance: 12 users created with verified emails, no invitations or emails sent, no passwords migrated (customers sign in with email verification, password reset or their social login). Old-to-new ID mapping: 12 rows (stored in the production database and an owner-only file). Database references remapped in one transaction: 9 database users migrated, 0 orphans, 0 old references remaining. The old Clerk instance was not changed.

**Supabase to Hostinger (project omwtmvzdqmxewdswapgq).** A temporary read-only role was used for the export and then dropped (0 remaining). 51 source tables inventoried and restored with identical row counts on all 51; production has 52 tables (the extra one is `stripe_webhook_events`, added by migration 031). 51 foreign keys, 0 unvalidated, 0 orphaned child rows. Migration 031 applied; earlier migrations recorded as applied. Aggregates: 9 database users, 31 quizzes, 0 leads, 0 stored integrations, 0 Stripe customer references, 0 Stripe subscription references (1 user is on a paid plan without Stripe references). Supabase was only read and remains the rollback source.

**Private test results (from the VPS).** PASS: frontend 200 with noindex; API readiness (database up); embed script 200; `/api/cron/*` 404; protected route 401; no secret-shaped strings in any production container log or in the served pages; Anthropic request 200; one internal test email delivered to the account owner only; all 12 Stripe prices match the specification (amounts, intervals, live mode); live Checkout Session created and expired immediately (no payment); Clerk production sign-in token to session token to backend acceptance (a disposable test user, deleted afterwards); authenticated AI quiz generation and quiz creation and listing (test data removed, counts back to baseline); encryption round-trip with the production key; container restart with data persistence; daily backup created and restore test passed (52 tables, identical counts) as the deployment user.

**Not tested.** Billing-portal session creation: there is no safe test customer and the restricted key can only read customers. The legacy ciphertext check: the migrated data contains no stored integrations. Stripe and Clerk webhooks: not created by design. A real payment: not attempted.

**Remaining blockers before public launch.** (1) Stripe webhook endpoint and secret, and the Clerk webhook endpoint and secret, created only after the domain is live. (2) DNS for the root, `www` and `api` hostnames and the public TLS edge. (3) Removal of noindex. (4) The Stripe restricted key value briefly appeared in an automation screenshot during creation; roll it (Stripe: API keys, Roll key) before launch to be safe. (5) A safe test customer if a billing-portal test is wanted. (6) Owner approval for each of these.

- Deployed commit: `a42bcbfd5845bd8158bb304dad5a3358e3badc6c` (`main`, merge of PR #65).
- Location on the VPS: `/opt/squarespell-quiz/production` (staging is untouched at `/srv/squarespell-quiz/staging`).
- Public domain after final approval: `squarespellquiz.com` (app) and `api.squarespellquiz.com` (API), mirroring staging's `staging.` and `api-staging.` layout.

## 1. Isolation summary

| Item | Production | Staging (unchanged) |
| --- | --- | --- |
| Docker Compose project | `squarespell-quiz-production` | `squarespell-quiz-staging` |
| Networks | `squarespell-quiz-production_edge`, `..._internal` (internal only) | staging's own |
| Database | PostgreSQL 16, database `quiz_production`, own volume, own passwords | `quiz_staging`, own volume |
| REST layer | own PostgREST + gateway on the internal network | own |
| Env file | `/opt/squarespell-quiz/production/.env`, mode 600, owner squarespell, never committed | `/srv/.../staging/.env` |
| Ports | only `127.0.0.1:18080` (private edge proxy, HTTP, loopback) | 80/443 public proxy |
| Logs | Docker json-file (10 MB x 5 per service) and `logs/` with weekly logrotate | own |
| Backups | `backups/daily`, owner-only, 14-day retention | own |

Nothing listens publicly for PostgreSQL (5432), the frontend (3000), the API (3001) or Redis. The host firewall allows only 22, 80 and 443; fail2ban and unattended security upgrades were already active from the Phase 3 baseline. SSH password login is still enabled because the Hostinger web console may depend on it; switching to key-only login needs the owner to confirm a working key first.

**Redis:** the code uses Redis only for optional rate limiting through the Upstash REST client (`UPSTASH_REDIS_REST_URL`, unset means a per-process limiter). A self-hosted Redis cannot be used by that client without an extra Upstash-compatible proxy, so none was deployed. Production runs with the per-process limiter. This is a documented decision, not a gap in the stack.

## 2. Environment variables (names and status only)

| Variable | Supplied by | Status | Mode |
| --- | --- | --- | --- |
| PROD_APP_HOST, PROD_API_HOST | this stack | configured | production |
| POSTGRES_PASSWORD, AUTHENTICATOR_PASSWORD, PGRST_JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY (self-issued JWT for the internal REST layer) | generated on the server | configured | production-only |
| ENCRYPTION_KEY, REPORT_SECRET, CRON_SECRET | generated on the server | configured | production-only |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY | Clerk | **placeholder** (real keys not yet on the server) | production instance created |
| CLERK_WEBHOOK_SECRET | Clerk | **missing** (endpoint is created after the domain is live) | production |
| STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | Stripe | **missing** | live |
| STRIPE_CORE/PRO/BUSINESS_PRICE_ID and _YEARLY_PRICE_ID (6) | Stripe | configured | live-mode products |
| STRIPE_LEAD_500/1500/3000_PRICE_ID, STRIPE_EMAIL_1000/5000/10000_PRICE_ID (6) | Stripe | configured (passed through by the production compose file only) | live-mode products |
| ANTHROPIC_API_KEY | Anthropic | **missing** (no production key; the staging key was not copied) | - |
| RESEND_API_KEY | Resend | **placeholder** (the API refuses to start without a value) | - |
| RESEND_WEBHOOK_SECRET, EMAIL_FROM, PLATFORM_EMAIL_FROM | Resend / DNS | **missing** | - |
| ADMIN_EMAILS | owner | empty | - |
| SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN, UPSTASH_*, PEXELS_ACCESS_KEY, UNSPLASH_ACCESS_KEY | optional services | not configured | - |
| CORS | compose | `https://squarespellquiz.com` only (embed assets are `*` by design) | production |

Secrets are entered on the server with `scripts/set-secret.sh NAME` (hidden prompt, never echoed, never on a command line). The production copy of that helper refuses test-mode Stripe keys.

**Repository drift found:** the repository's Hostinger compose file does not pass the six add-on price variables to the API, so add-ons would not work on it. The production compose file (generated on the server from the repository's staging file) adds them. The repository file should be corrected in a follow-up PR.

## 3. Clerk

- The live Vercel app uses a Clerk **development** instance (application "Squarespell", 12 users). The Hostinger staging stack uses a second development instance (application "Squarespell Quiz").
- A production instance was created in the application "Squarespell Quiz" for `squarespellquiz.com` (settings cloned from its development instance, no users copied). The production keys exist but are **not on the server yet**: they must be entered by the owner with `set-secret.sh`.
- DNS records for Clerk (the `clerk.` CNAME and related records) are not added; that is a cutover step.
- **Decision required (user migration).** Clerk user IDs are not portable between instances and passwords cannot be exported. Existing Quiz rows reference the old IDs. Options: (A) create the production users by import or invitation, then remap `clerk_user_id` in the Quiz database with a recorded old-to-new mapping table, keeping the old ID in the mapping; customers reset passwords or use email or social sign-in; (B) keep the current instance for existing customers (not recommended: it is a development instance with a low limit and an insecure key type). Nothing was deleted or changed in either existing instance. Recommended: option A, done during a maintenance window after the database restore.

## 4. Stripe (Squarespell Limited account, live mode; no marketplace object touched)

Metadata on every product: `product=squarespell_quiz`, `plan_key`. Legacy Starter/Pro/Agency products are untouched.

| Product | Product ID | Prices |
| --- | --- | --- |
| Squarespell Quiz - Core | prod_VIQOqplXFtRcLl | $12/month price_1UHpYBGDtnLgPS7lMVb2ktld; $108/year price_1UHpYBGDtnLgPS7lS4vfh8bV |
| Squarespell Quiz - Pro | prod_VIQS3X0AaFbWJf | $19/month price_1UHpbxGDtnLgPS7lRRDkyUAW; $192/year price_1UHpbxGDtnLgPS7lCj2DaKe8 |
| Squarespell Quiz - Business | prod_VIQWDsIutHbGcy | $35/month price_1UHpf8GDtnLgPS7lsVJLOlMH; $348/year price_1UHpf8GDtnLgPS7ljIcKNJ9P |
| Squarespell Quiz - Lead add-on | prod_VIQbEu4d0n6340 | +500 $3 price_1UHpkWGDtnLgPS7luznk2yFL; +1,500 $7 price_1UHpkWGDtnLgPS7lB6LbBEKq; +3,000 $12 price_1UHpkWGDtnLgPS7lLG7glJEJ |
| Squarespell Quiz - Email add-on | prod_VIQgbmpunfD2Ul | +1,000 $3 price_1UHppFGDtnLgPS7l4hBeOuZD; +5,000 $7 price_1UHppFGDtnLgPS7loSTYyqbJ; +10,000 $12 price_1UHppFGDtnLgPS7lHWY6bXmK |

Not yet done: the dedicated Quiz webhook endpoint and its signing secret (created only after the domain is live and verified, then enabled), the live API key for the backend (a restricted key is recommended), and a checkout test. No charge was made.

## 5. Email, AI and integrations

- Authentication email is sent by Clerk. Application email uses Resend (`RESEND_API_KEY`, verified sending domain, webhook). No Resend production key or verified sending domain exists yet: **email is not configured**, and scheduled email jobs stay off (`SCHEDULER_ENABLE_EMAIL_JOBS=false`).
- AI quiz generation uses Anthropic: **no production key configured**.
- Integrations are shown honestly on `/integrations` (none is "Available" until verified end to end). No integration credential was configured.

## 6. Existing Quiz data (Supabase)

- Live project identified from the running Render service configuration: **omwtmvzdqmxewdswapgq** (matches `backend/.env.example`). A second project (`ibipglxzqowuipepmlnp`, "squarespell-us") belongs to `site-auditor` and is not the Quiz database.
- Supabase requires a sign-in that the owner must perform, and a read-only inventory needs its Postgres connection URI. Not done yet.
- Prepared on the server (untested against real data): `scripts/supabase-export.sh` (hidden prompt for the URI; refuses any URI without the expected project ref; read-only inventory plus a `pg_dump` of the public schema) and `scripts/supabase-restore.sh` (restores only into `quiz_production`, marks migrations 000-030 as applied, applies only the repository's remaining migrations 031 and email automation, then diffs row counts). Supabase stays active and unchanged as the rollback source.
- Note on encryption: any integration secrets already stored encrypted in the Supabase data were encrypted with the live `ENCRYPTION_KEY` (held in Render). Production uses a new key, so those values cannot be decrypted after the restore. Either carry over the existing key into the production env (decision needed) or require customers to reconnect integrations.

## 7. Backups and restore test

- `scripts/backup.sh`: daily at 02:15 UTC by `/etc/cron.d/squarespell-quiz-production-backup`, custom-format dump plus SHA-256, owner-only, 14-day retention, log in `logs/backup.log`.
- `scripts/restore-test.sh`: restores the newest dump into a throwaway container without network or published ports and compares every public table's row count. **Result: passed** (49 public tables, counts identical). To be repeated after the real data is restored.
- Hostinger's weekly VPS backup remains an additional recovery layer. The paid daily-backup add-on was not purchased.

## 8. Private smoke tests (from the VPS, loopback with the intended Host header)

- Frontend `/`: 200 with `X-Robots-Tag: noindex, nofollow`.
- API `/api/health`: 200; `/api/health/ready`: `{"ok":true,"checks":{"database":"up"}}`.
- Database: 49 public tables, 32 recorded migrations (schema, 002-031, email automation).
- `/embed.js`: 200 with `Access-Control-Allow-Origin: *`. `/api/cron/*`: 404 (never public). Protected API route: 401. CORS allows only `https://squarespellquiz.com`.
- Restart recovery: whole project restarted; backend, frontend and database healthy again; the data written before the restart was still there.
- Restart policy `unless-stopped` on every container. No public listener on 5432, 3000, 3001 or 6379.
- **Not testable yet:** sign-in and authenticated quiz creation (need the real Clerk keys), AI generation (Anthropic key), email (Resend), Stripe checkout and webhooks (keys and webhook).

## 9. Incident (resolved: Render auto-deploy is now Off)

The live API on Render (`squarespell-api`, auto-deploy from `main`) **automatically deployed the merge of PR #63** (`ba31ab6`). The Vercel freeze covered only Vercel and this was not checked at the time. The live API was healthy afterward (`/api/health/ready` reported the database up). Any further merge to `main` will redeploy the Render production backend, including this docs PR, so merge nothing to `main` until Render auto-deploy is turned off or the owner accepts the deploy. Disabling it is a production-account change that needs approval.

## 10. Blockers before public launch

1. Owner action: enter the Clerk production keys on the server (`set-secret.sh`), decide the user-migration option, then rebuild the frontend (the publishable key is baked in at build time).
2. Anthropic production key and Resend production key, verified sending domain and webhook secret; `EMAIL_FROM` values.
3. Stripe live secret key (restricted) for the backend and, after cutover, the dedicated Quiz webhook endpoint and secret.
4. Supabase sign-in, export, restore and reconciliation; decision on `ENCRYPTION_KEY` continuity.
5. Render auto-deploy decision (section 9).
6. Repository follow-ups: pass the add-on price variables in the repository compose file; correct the misnamed Upstash variable in `.env.staging.example` (already noted in Phase 1).
7. Owner approval for DNS, public TLS edge, removing noindex and any Clerk, Stripe or Vercel changes.

## 11. Cutover procedure for squarespellquiz.com (needs final owner approval; nothing below has been done)

1. Freeze: announce a maintenance window. Keep Vercel on `vercel-production-hold`; turn off or accept Render auto-deploy first.
2. Complete section 10 items 1-4, then re-run the export, restore and reconciliation on the day, and re-run `restore-test.sh`.
3. Enter the final secrets, run `scripts/deploy.sh a42bcbfd5845bd8158bb304dad5a3358e3badc6c` again so the frontend picks up the Clerk publishable key, and repeat the private smoke tests including an authenticated flow, one AI generation, one test email and a Stripe test-flow in test mode.
4. Add DNS records at the domain registrar: A records for `squarespellquiz.com` and `api.squarespellquiz.com` to the VPS, the Clerk CNAME records shown in the Clerk dashboard, and the Resend SPF and DKIM records. Lower TTLs beforehand.
5. Add the two production hostnames to the public edge proxy (the existing Caddy on ports 80/443) as reverse proxies to `127.0.0.1:18080` with the intended Host header; Caddy obtains the TLS certificates. Keep staging's site blocks unchanged.
6. Verify over HTTPS: pages, sign-in, quiz creation, embed script, checkout in a controlled live test with a refundable minimal charge (only with explicit approval), webhooks.
7. Create and enable the dedicated Quiz Stripe webhook endpoint and the Clerk webhook endpoint; store the signing secrets with `set-secret.sh`; restart the API.
8. Remove noindex only after the launch checklist passes: change `X-Robots-Tag` in the production Caddyfile and the page metadata, then redeploy.
9. Keep Supabase, Render and Vercel running and unchanged for at least the agreed rollback period. Rollback = point DNS back to the previous host; the Supabase data is untouched.

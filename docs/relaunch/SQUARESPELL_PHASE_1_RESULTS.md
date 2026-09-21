# Squarespell Quiz - Phase 1 Results (Stabilize current production)

Prepared 19 September 2026 against Relaunch Master Plan Revision 3.0, on branch `p1/stabilize-production` (draft PR, not merged, nothing deployed). Scope: the Squarespell Quiz SaaS repository only (`squarespellquiz.com` product; Next.js on Vercel, Express on Render, Supabase Postgres, Clerk, Stripe, Resend, Anthropic). Nothing on `squarespell.com`, WordPress/WooCommerce, DNS, Stripe objects, Clerk settings, production environment variables or any live database was changed by this work. Read-only exceptions, all documented: environment-variable names and service settings shown in the Vercel and Render dashboards (values masked and never read), and one catalog-only query on the production database (policy names, column types, function signatures; no row data) used for the migration review in section 18.

**Update 4 (19 Sep 2026):** adds cloud verification in GitHub Actions (section 17), the migration 016/031 review (section 18) and the Render job classification (section 19). Owner infrastructure decision: no additional Render service or cron is created; verification runs in GitHub Actions now and the permanent staging API is built on Hostinger in Phase 3.

**Evidence labels.** *Verified* = reproduced by a hermetic test in this PR or read directly in the code at the cited `file:line` on `main` (67dd18d). *Inference* = follows from verified code but depends on production state that was not inspected. *Unavailable* = needs a live dashboard/database not inspected here (the Vercel and Render variable presence has since been filled in by the coordinator's read-only pass, section 3.1) and is listed under "Remaining production configuration actions".

**How everything here can be re-run** (no network access to any live service is needed):

```bash
cd backend && npm ci && npx vitest run          # 254 tests: PGlite (real PostgreSQL engine) + local Clerk/Stripe/Resend/Anthropic fakes
cd backend && npx tsc --noEmit && npm run build # type-check and production build
cd frontend && npm ci && npx vitest run && npx tsc --noEmit && npm run build
node scripts/config-inventory.mjs               # names-only configuration inventory (section 3)
SMOKE_CLERK_TOKEN=... node scripts/smoke/smoke.mjs --base-url <staging api>   # section 9, refuses live hosts
```

---

## 1. Summary and Phase 1 exit status

* **32 defects were reproduced and are fixed in this PR** (3 P0, 24 P1, 5 P2), each with a failing test written first (section 6). A further **24 findings are recorded, not fixed** (section 8, all P2 or owner decisions).
* The application code that could be exercised without production access now passes **254** backend tests (baseline on unmodified `main`: 57), frontend 9 tests (baseline 7), `tsc --noEmit` clean in both projects, and both production builds succeed. Pre-existing tests were kept and still pass.
* **Phase 1 exit ("current system is safe enough to pilot and migrate"): NOT YET MET - conditional.** The code-level blockers found are fixed and covered by permanent tests, but the exit also depends on facts only the owner can establish and on actions that must not be taken by a code PR: the production database schema has to be compared with migration `031` and the missing objects applied deliberately, environment variables and webhooks have to be checked against section 3, and the smoke test has to pass against a preview/staging deployment. Until then the honest status is "code ready for review; production readiness unverified" (section 16).
* **Production code equals `main`'s backend.** The live Render deployment is `c67fb6d`; no file under `backend/` differs from `main`, so the defects below exist in production today and the fixes take effect only when the owner deploys them (section 3.1).
* The most important discovery: **a free-plan owner's quiz could never have captured a lead.** Inside the 14-day trial the lead route treats the account (stored as plan `free`) as "0 leads allowed" (D01); after day 14 it refuses with `trial_expired`; and on a database built from this repository the lead function cannot even run (D02). Phase 0 found 8 of 9 users on `free` and 0 leads on 9 live quizzes. That is an inference about production (the schema and the owners' trial dates were not inspected), but it is exactly what the code does.

---

## 2. Repository orientation

| Area | What was read | Notes |
|---|---|---|
| Docs | `README.md`, `TASKS.md`, `LAUNCH_CHECKLIST.md`, `EDIT-SYSTEM-ARCHITECTURE.md`, `docs/relaunch/SQUARESPELL_PHASE_0_RESULTS.md` (sections 4, 6, 10, 11), `docs/specs/new-quiz-from-url.md` | `README.md` still says the API deploys to **Railway**; it runs on **Render** (`render.yaml`). |
| Backend scripts | `dev`, `build` (`tsc`), `start`, `test` (`vitest run`), `seed:templates` | No lint script or ESLint config exists in either project. |
| Frontend scripts | `dev`, `build` (`next build`), `start`, `test` (`vitest run`) | No `typecheck` script; run as `npx tsc --noEmit`. |
| Pre-existing tests | 4 backend files (57 tests), 1 frontend file (7 tests) | `backend/src/__tests__/leads.test.ts` re-implements a miniature lead route inside the test and never touches the real code, so it could not detect any defect below. |
| Deploy config | `render.yaml` (1 web service + 5 cron services running 6 scheduled jobs), `backend/vercel.json` (1 cron), `frontend/vercel.json` (rewrite + embed headers), `.github/workflows/keepalive.yml` | See section 4. |

**The "five creation modes".** The repository defines exactly one set of five: the quiz **types** (`mode`) - `lead_quiz`, `price_calculator`, `service_recommender`, `client_qualifier`, `segmentation_quiz` (`backend/migrations/007_quiz_modes.sql:4-5`, validated at `backend/src/routes/quiz.ts:37` on create and `:86` on update; 4 seeded templates per mode in `backend/src/data/seedTemplates.ts`). It does **not** define five *creation modes*. The creation paths reachable in the product, all exercised by tests, are: (1) manual/blank `POST /api/quizzes` (`quiz.ts:36`); (2) template - the dashboard modal converts a catalog template to blocks and posts it to `POST /api/quizzes` (`frontend/app/dashboard/quizzes/_components/NewQuizModal.tsx:230-270`; backend archetypes `backend/src/config/quizTemplates.ts` steer (3)); (3) URL analysis `POST /api/quizzes/from-url` (`quizzesFromUrl.ts:114`); (4) AI generation `POST /api/generate` (`allRoutes.ts:206`) and the signed-out funnel `preview-analyze` / `preview-build-quiz` / `preview-generate`; (5) funnel claim `POST /api/claim-quiz` (`allRoutes.ts:492`) and `POST /api/save-preview` (`:216`); plus duplicate (`quiz.ts:253`). If the owner meant a different set of five, tell me and the matrix can be re-cut - the tests already cover every route above.

## 3. Configuration ownership map (names only - no values)

Generated by `node scripts/config-inventory.mjs` (re-runnable; `--check` fails when code references a variable that has no ownership entry, and a permanent test runs it). It scans `backend/src`, the frontend, `render.yaml` and the workflows. **`presence in live dashboards` was `TO_BE_FILLED` in the first version of this document; it is now filled from the coordinator's read-only inspection of the Vercel and Render dashboards (19 September 2026 - names and settings only, values masked and never read; GitHub Actions secrets and the Stripe/Clerk/Supabase dashboards were not re-inspected here)** - see section 3.1. All rows belong to the Quiz SaaS; no marketplace variable is listed. "Purpose" states the environment the variable is meant for; nothing about production values was inspected.

**65 variables** in total. Per owning service:

| Owning service | Variables |
|---|---|
| Stripe | 19 |
| Render (application configuration and secrets) | 15 |
| other third parties (Upstash, Sentry, Turnstile, Pexels, Unsplash, CAN-SPAM address) | 10 |
| Clerk | 9 |
| Resend | 4 |
| Supabase | 4 |
| Anthropic | 3 |
| Vercel | 1 |

**Ownership that is unclear or inconsistent (30 variables)** - the coordinator should resolve these first: (a) the six Stripe plan/yearly price ids: `render.yaml` and `.env.example` name `STRIPE_STARTER_*` / `STRIPE_AGENCY_*` but the code reads `STRIPE_CORE_*` / `STRIPE_BUSINESS_*` (the two `STARTER`/`AGENCY` families are orphans, the `CORE`/`BUSINESS` ones are undeclared in `render.yaml`), and the live catalog is Starter/Pro/Agency (section 12); (b) six add-on pack price ids with no catalog counterpart seen in Phase 0; (c) Upstash, Sentry, Turnstile, Pexels and Unsplash: optional integrations whose account owner is not documented anywhere; (d) `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: declared in `frontend/.env.example` but not referenced by any scanned frontend code; (e) `API_URL`, `API_BASE_URL`: undocumented aliases of `BACKEND_URL`; (f) `CORS_ORIGIN`, `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`: names used only in `backend/.env.staging.example` that the code does not read.

**Hard-coded, not environment-driven** (cannot be changed in a dashboard): `frontend/lib/urls.ts` (`APP_URL=https://app.squarespell.com`, `MARKETING_URL=https://squarespell.com`), `frontend/middleware.ts` (`APP_HOST`, the `quiz.` and `admin.` redirects), `backend/src/app.ts` (`DEFAULT_ALLOWED_ORIGINS`), the `https://squarespell-api.onrender.com` default in ~57 places across ~35 frontend/backend files, `frontend/public/embed/quiz-embed.js` (`BASE_URL`), the `From:` fallbacks (`hello@`, `results@`, `digest@squarespell.com`) and a Delaware postal address in the CAN-SPAM footer (`backend/src/services/unsubscribe.ts`). All need a code change for `squarespellquiz.com` (section 13.2).

### 3.1 Live dashboard facts (coordinator, read-only) and what they mean

**Vercel** (project `squarespell`, the Quiz frontend): 10 variables, all assigned to *All Environments* (Production, Preview and Development share the same values): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_QUIZ_URL`, `NEXT_PUBLIC_MARKETING_URL`, `NEXT_PUBLIC_APP_URL`, `CLERK_SECRET_KEY` (flagged "Needs Attention" by Vercel), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`. **Consequence:** preview deployments call the production API and use the same (development-instance) Clerk keys. `NEXT_PUBLIC_QUIZ_URL/APP_URL/MARKETING_URL` are set but ignored by the code.

**Render** - one service only: web service `squarespell-api` (Node, Oregon, **Free instance**, branch `main`, root directory `backend`, build `npm install && npm run build`, start `npm start`, health check `/health`, auto-deploy events present). 27 variables: `ADMIN_EMAILS`, `ANTHROPIC_API_KEY`, `APP_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `CORS_ORIGINS`, `CRON_SECRET`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `MARKETING_URL`, `NODE_ENV`, `PEXELS_ACCESS_KEY`, `PORT`, `REPORT_SECRET`, `RESEND_API_KEY`, `STRIPE_AGENCY_PRICE_ID`, `STRIPE_AGENCY_YEARLY_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_PRO_YEARLY_PRICE_ID`, `STRIPE_SECRET_KEY`, `STRIPE_STARTER_PRICE_ID`, `STRIPE_STARTER_YEARLY_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_URL`. **No cron jobs, no environment groups, no Render webhooks** (a paid-plan feature). Event log: suspended "Free Tier Usage Exceeded" on 22 Jul 2026, resumed 1 Aug 2026; the free instance spins down when idle (delays of 50 s or more).

**Production code vs `main`.** The live deployment is commit `c67fb6d` (13 Jul 2026). A GitHub compare shows **no file under `backend/` changed between `c67fb6d` and `main`**, so production runs exactly the backend code this document audits at `main` (67dd18d); the ~50 commits since only touched the frontend, docs, `site-auditor`, `render.yaml` and `.github`. Every backend defect in section 6 therefore applies to production today, and production `GET /api/health` returns 200 while `GET /api/health/ready` returns 404 (that fix is only in this PR, not deployed).

**Absences, classified** (not present on Render or Vercel):
* **Functional gaps:** `STRIPE_CORE_PRICE_ID`, `STRIPE_CORE_YEARLY_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID`, `STRIPE_BUSINESS_YEARLY_PRICE_ID` - Render has the `STARTER`/`AGENCY` names (which match the live Stripe catalog) but the code reads `CORE`/`BUSINESS`, so **with today's production code checkout for Core and Business cannot resolve a price** (with this PR it answers 503 `plan_not_configured`, by design; mapping is a Phase 2 decision, do not add the variables before then). `RESEND_WEBHOOK_SECRET` - required by the Phase 1 code; today's production code accepts unsigned Resend events. No Sentry variable exists, so there is **no error tracking** in production.
* **Optional:** the six add-on price ids, `STRIPE_QUIZ_PAYMENT_WEBHOOK_SECRET`, `CLERK_JWT_KEY`, `CLERK_API_URL`, `ANTHROPIC_TIMEOUT_MS`, `ANTHROPIC_MAX_RETRIES`, `TURNSTILE_SECRET_KEY`, `UNSPLASH_ACCESS_KEY`, all Sentry variables, `EMAIL_FROM`, `PLATFORM_EMAIL_FROM`, `BUSINESS_ADDRESS`, `BACKEND_URL`, `LOG_LEVEL` (each has a code default).
* **Verify:** `RENDER_EXTERNAL_URL` is not in the list but Render normally injects it; the in-process timers depend on it.
* Present on Render but never read by the code: `STRIPE_STARTER_*`, `STRIPE_AGENCY_*`. Upstash is configured, so the Redis limiter (not the new in-process fallback) is active in production.


| Variable | Owning service | Purpose / environment | Referenced in | Product | Ownership clear? | New value for squarespellquiz.com? | Presence in live dashboards |
|---|---|---|---|---|---|---|---|
| `ADMIN_EMAILS` | Render (app config) | prod: admin dashboard allow-list | backend/.env.example, backend/src/routes/allRoutes.ts, render.yaml | Quiz SaaS | yes | review | Render: present |
| `ANTHROPIC_API_KEY` | Anthropic | prod (Render) | backend/.env.example, backend/.env.staging.example, backend/src/services/aiEmailEngine.ts (+3) | Quiz SaaS | yes | YES - dedicated Quiz key (Phase 0 target) | Render: present |
| `ANTHROPIC_MAX_RETRIES` | Anthropic | optional (Phase 1) retry budget - default 1 | backend/.env.example, backend/src/lib/anthropicClient.ts | Quiz SaaS | yes | no | Absent - optional (defaults apply) |
| `ANTHROPIC_TIMEOUT_MS` | Anthropic | optional (Phase 1) per-call timeout - default 40000 | backend/.env.example, backend/src/lib/anthropicClient.ts | Quiz SaaS | yes | no | Absent - optional (defaults apply) |
| `API_BASE_URL` | Render (app config) | legacy alias for keep-alive self ping | backend/src/index.ts | Quiz SaaS | unclear (alias) | as BACKEND_URL | Absent - optional legacy alias |
| `API_URL` | Render (app config) | legacy alias of BACKEND_URL | backend/src/routes/allRoutes.ts, backend/src/routes/unsubscribe.ts, backend/src/services/resultEmail.ts (+1) | Quiz SaaS | unclear (alias) | as BACKEND_URL | Absent - optional legacy alias |
| `APP_URL` | Render (app config) | prod: links in emails - default https://app.squarespell.com | backend/.env.example, backend/src/routes/allRoutes.ts, backend/src/services/automationEngine.ts (+3) | Quiz SaaS | yes | YES | Render: present |
| `BACKEND_URL` | Render (app config) | prod: unsubscribe/report links, cron | backend/src/routes/allRoutes.ts, backend/src/routes/unsubscribe.ts, backend/src/services/resultEmail.ts (+3) | Quiz SaaS | yes | YES if API host changes | Absent on Render and Vercel - optional: unsubscribe/report links fall back to the hard-coded onrender.com host |
| `BUSINESS_ADDRESS` | other (CAN-SPAM footer) | prod (Render) - default is a hard-coded Delaware address | backend/src/services/unsubscribe.ts | Quiz SaaS | yes | review | Absent - optional: default postal address used |
| `CLERK_API_URL` | Clerk | optional (Phase 1): API base override - new in Phase 1; tests use a closed local port | backend/.env.example, backend/src/middleware/auth.ts | Quiz SaaS | yes | no | Absent - optional (new in Phase 1) |
| `CLERK_JWT_KEY` | Clerk | optional (Phase 1): networkless verification - new in Phase 1; unset = JWKS via Clerk API | backend/.env.example, backend/src/middleware/auth.ts | Quiz SaaS | yes | YES if used (new instance key) | Absent - optional (new in Phase 1) |
| `CLERK_SECRET_KEY` | Clerk | prod (Render + Vercel) - currently a DEVELOPMENT instance - sk_test/sk_live pair | backend/.env.example, backend/.env.staging.example, backend/src/middleware/auth.ts (+3) | Quiz SaaS | yes | YES - new production Clerk app | Vercel: present (All Environments; flagged "Needs Attention" by Vercel) and Render: present |
| `CLERK_WEBHOOK_SECRET` | Clerk | prod (Render) - webhook may not be registered | backend/.env.example, backend/src/routes/clerkWebhook.ts, render.yaml | Quiz SaaS | yes | YES - new endpoint signing secret | Render: present |
| `CORS_ORIGIN` | Render (app config) | staging example only - code reads CORS_ORIGINS - wrong name in .env.staging.example | backend/.env.staging.example | Quiz SaaS | NO: doc drift | n/a | Absent - expected (staging-example name the code never reads) |
| `CORS_ORIGINS` | Render (app config) | prod: allowlist - defaults are app./quiz./www. squarespell.com | backend/.env.example, backend/src/app.ts, render.yaml | Quiz SaaS | yes | YES | Render: present |
| `CRON_SECRET` | Render + Vercel + GitHub (shared secret) | prod: authenticates cron calls - unset now fails closed (503) | backend/.env.example, backend/src/index.ts, backend/src/middleware/cronAuth.ts (+3) | Quiz SaaS | yes (3 places must match) | rotate at cutover | Render: present. Vercel: absent (the frontend keepalive route now fails closed; nothing schedules it). GitHub: not inspected |
| `DISABLE_INPROCESS_EMAIL_QUEUE` | Render (app config) | optional (Phase 1) kill switch for the in-process queue drain | backend/.env.example, backend/src/index.ts | Quiz SaaS | yes | no | Absent - optional kill switch |
| `EMAIL_FROM` | Resend | prod (Render) - default hello@squarespell.com hard-coded fallback | backend/src/routes/allRoutes.ts, backend/src/services/automationEngine.ts, render.yaml | Quiz SaaS | yes | YES - sender on squarespellquiz.com | Absent on Render - optional: default `hello@squarespell.com` used |
| `ENCRYPTION_KEY` | Render (app secret) | prod: AES-256-GCM for integration configs | backend/src/utils/encryption.ts, render.yaml | Quiz SaaS | yes | DO NOT rotate without re-encrypting stored configs | Render: present |
| `FRONTEND_URL` | Render (app config) | prod: checkout redirects, CORS | backend/.env.example, backend/.env.staging.example, backend/src/app.ts (+6) | Quiz SaaS | yes | YES - squarespellquiz.com app host | Render: present |
| `LOG_LEVEL` | Render (app config) | prod | backend/src/lib/logger.ts | Quiz SaaS | yes | no | Absent - optional (default `info`) |
| `MARKETING_URL` | Render (app config) | prod - default https://squarespell.com | backend/.env.example, backend/src/routes/allRoutes.ts, backend/src/services/platformEmails.ts (+1) | Quiz SaaS | yes | YES | Render: present |
| `NEXT_PUBLIC_API_URL` | Vercel | prod/preview: frontend -> API base - default https://squarespell-api.onrender.com hard-coded in ~30 files | frontend/.env.example, frontend/.env.staging.example, frontend/app/admin/page.tsx (+48) | Quiz SaaS | yes | YES (API host) | Vercel: present (All Environments) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Clerk | prod (Vercel) | frontend/.env.example | Quiz SaaS | yes | review | Vercel: present (All Environments) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Clerk | prod (Vercel) | frontend/.env.example | Quiz SaaS | yes | review | Vercel: present (All Environments) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | prod (Vercel) | frontend/.env.example, frontend/.env.staging.example | Quiz SaaS | yes | YES - new production publishable key | Vercel: present (All Environments) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Clerk | prod (Vercel) | frontend/.env.example | Quiz SaaS | yes | review (redirect paths) | Vercel: present (All Environments) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Clerk | prod (Vercel) | frontend/.env.example | Quiz SaaS | yes | review (redirect paths) | Vercel: present (All Environments) |
| `NEXT_PUBLIC_SENTRY_DSN` | other (Sentry) | prod (Vercel) - optional | frontend/.env.staging.example, frontend/sentry.client.config.ts | Quiz SaaS | unclear | YES | Absent on Vercel - optional (no frontend error tracking) |
| `NEXT_PUBLIC_SITE_URL` | Squarespell (build argument) | production frontend build - canonical origin | frontend/lib/site.ts, frontend/lib/urls.ts | Quiz SaaS | yes | YES - https://squarespellquiz.com | Not applicable (build argument, defaults to the production domain) |
| `NEXT_PUBLIC_ALLOW_INDEXING` | Squarespell (build argument) | production frontend build - search indexing switch | frontend/lib/site.ts | Quiz SaaS | yes | YES - true only in the approved launch build | Not applicable (build argument, default off) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | prod (Vercel) - same | frontend/.env.example, frontend/.env.staging.example | Quiz SaaS | unclear: declared in frontend/.env.example, no code reference found | no | Absent on Vercel - consistent with the code not reading it |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | prod (Vercel) - frontend does not query Supabase directly in the scanned code | frontend/.env.example, frontend/.env.staging.example | Quiz SaaS | unclear: declared in frontend/.env.example, no code reference found | no | Absent on Vercel - consistent with the code not reading it |
| `PEXELS_ACCESS_KEY` | other (Pexels) | prod - optional stock-photo search | backend/src/routes/allRoutes.ts, backend/src/routes/emails.ts, render.yaml | Quiz SaaS | unclear | YES | Render: present |
| `PLATFORM_EMAIL_FROM` | Resend | prod (Render) | backend/src/services/platformEmails.ts, render.yaml | Quiz SaaS | yes | YES | Absent on Render - optional: default sender used |
| `RENDER_EXTERNAL_URL` | Render | set in render.yaml (value in file); enables in-process timers | backend/src/index.ts, render.yaml | Quiz SaaS | yes | YES if API host changes | Not in the 27 variables read from the Render dashboard; Render normally injects this automatically on web services (verify). The in-process timers, including the new queue drain, start only when it (or `API_BASE_URL`) is set |
| `REPORT_SECRET` | Render (app secret) | prod: HMAC for PDF report links - default in code if unset - verify | backend/.env.example, backend/src/services/reportToken.ts, render.yaml | Quiz SaaS | yes | rotate at cutover | Render: present |
| `RESEND_API_KEY` | Resend | prod (Render) | backend/.env.example, backend/.env.staging.example, backend/src/routes/allRoutes.ts (+6) | Quiz SaaS | yes (provider/sender domain unverified in Phase 0) | YES - new sender domain/key for squarespellquiz.com | Render: present |
| `RESEND_WEBHOOK_SECRET` | Resend | optional->required (Phase 1): Svix signing secret for /api/webhooks/resend - unset = the Resend webhook endpoint answers 503 | backend/.env.example, backend/src/routes/resendWebhook.ts | Quiz SaaS | yes | YES if the endpoint URL changes | **Absent on Render and Vercel - FUNCTIONAL GAP:** with the Phase 1 code `/api/webhooks/resend` answers 503 until set (today's production code accepts unsigned events) |
| `SENTRY_DSN` | other (Sentry) | prod (Render) - optional | backend/.env.example, backend/.env.staging.example, backend/src/index.ts (+2) | Quiz SaaS | unclear: Sentry org/project not documented | YES - dedicated Quiz project | Absent on Render - optional, but there is **no error tracking** in production |
| `STRIPE_AGENCY_PRICE_ID` | Stripe | declared only - orphan - code reads STRIPE_BUSINESS_PRICE_ID | backend/.env.example, render.yaml | Quiz SaaS | NO | Phase 2 decision | Render: present - orphan, no code reads it |
| `STRIPE_AGENCY_YEARLY_PRICE_ID` | Stripe | declared only - orphan | backend/.env.example, render.yaml | Quiz SaaS | NO | Phase 2 decision | Render: present - orphan |
| `STRIPE_BUSINESS_PRICE_ID` | Stripe | prod (Render) | backend/.env.example | Quiz SaaS | NO: render.yaml/.env.example named AGENCY | Phase 2 decision | **Absent on Render and Vercel - FUNCTIONAL GAP:** Business checkout cannot resolve a price (503 `plan_not_configured` with the Phase 1 code); add only after Phase 2 approves names |
| `STRIPE_BUSINESS_YEARLY_PRICE_ID` | Stripe | prod (Render) | backend/.env.example | Quiz SaaS | NO (see BUSINESS monthly) | Phase 2 decision | **Absent on Render and Vercel - FUNCTIONAL GAP:** as BUSINESS monthly |
| `STRIPE_CORE_PRICE_ID` | Stripe | prod (Render) - no default; missing = 503 | backend/.env.example | Quiz SaaS | NO: render.yaml/.env.example named STARTER; Stripe catalog is Starter/Pro/Agency | Phase 2 decision | **Absent on Render and Vercel - FUNCTIONAL GAP:** with today's code, Core checkout cannot resolve a price (Phase 1 code: 503 `plan_not_configured`, by design) |
| `STRIPE_CORE_YEARLY_PRICE_ID` | Stripe | prod (Render) | backend/.env.example | Quiz SaaS | NO (see CORE monthly) | Phase 2 decision | **Absent on Render and Vercel - FUNCTIONAL GAP:** as CORE monthly |
| `STRIPE_EMAIL_10000_PRICE_ID` | Stripe | add-on pack | backend/.env.example, backend/src/routes/allRoutes.ts | Quiz SaaS | unclear | Phase 2 decision | Absent on Render and Vercel - optional (add-on packs unavailable: add-on checkout answers 400) |
| `STRIPE_EMAIL_1000_PRICE_ID` | Stripe | add-on pack | backend/.env.example, backend/src/routes/allRoutes.ts | Quiz SaaS | unclear | Phase 2 decision | Absent on Render and Vercel - optional (add-on packs unavailable: add-on checkout answers 400) |
| `STRIPE_EMAIL_5000_PRICE_ID` | Stripe | add-on pack | backend/.env.example, backend/src/routes/allRoutes.ts | Quiz SaaS | unclear | Phase 2 decision | Absent on Render and Vercel - optional (add-on packs unavailable: add-on checkout answers 400) |
| `STRIPE_LEAD_1500_PRICE_ID` | Stripe | add-on pack | backend/.env.example, backend/src/routes/allRoutes.ts | Quiz SaaS | unclear | Phase 2 decision | Absent on Render and Vercel - optional (add-on packs unavailable: add-on checkout answers 400) |
| `STRIPE_LEAD_3000_PRICE_ID` | Stripe | add-on pack | backend/.env.example, backend/src/routes/allRoutes.ts | Quiz SaaS | unclear | Phase 2 decision | Absent on Render and Vercel - optional (add-on packs unavailable: add-on checkout answers 400) |
| `STRIPE_LEAD_500_PRICE_ID` | Stripe | prod (Render) add-on packs - no matching catalog product seen in Phase 0 | backend/.env.example, backend/src/routes/allRoutes.ts | Quiz SaaS | unclear | Phase 2 decision | Absent on Render and Vercel - optional (add-on packs unavailable: add-on checkout answers 400) |
| `STRIPE_PRO_PRICE_ID` | Stripe | prod (Render) | backend/.env.example, render.yaml | Quiz SaaS | partly: name matches, prices differ ($39 Stripe vs $19 app) | Phase 2 decision | Render: present |
| `STRIPE_PRO_YEARLY_PRICE_ID` | Stripe | prod (Render) | backend/.env.example, render.yaml | Quiz SaaS | partly (see PRO monthly) | Phase 2 decision | Render: present |
| `STRIPE_QUIZ_PAYMENT_WEBHOOK_SECRET` | Stripe | optional (Phase 1): quiz-payment endpoint secret - falls back to STRIPE_WEBHOOK_SECRET | backend/.env.example, backend/src/routes/allRoutes.ts | Quiz SaaS | yes | YES if that endpoint is registered | Absent - optional (falls back to `STRIPE_WEBHOOK_SECRET`; the quiz-payment endpoint is not registered) |
| `STRIPE_SECRET_KEY` | Stripe | prod (Render) - LIVE key of the account shared with the marketplace | backend/.env.example, backend/.env.staging.example, backend/src/routes/allRoutes.ts (+2) | Quiz SaaS | yes (account shared; restrict key scope) | no (same Squarespell Limited account) - consider a restricted key | Render: present |
| `STRIPE_STARTER_PRICE_ID` | Stripe | declared in render.yaml / .env.example only - no code reads it - code reads STRIPE_CORE_PRICE_ID | backend/.env.example, render.yaml | Quiz SaaS | NO: orphan declaration | Phase 2 decision | Render: present - orphan, no code reads it |
| `STRIPE_STARTER_YEARLY_PRICE_ID` | Stripe | declared only - orphan | backend/.env.example, render.yaml | Quiz SaaS | NO | Phase 2 decision | Render: present - orphan |
| `STRIPE_WEBHOOK_SECRET` | Stripe | prod (Render) - endpoint currently DISABLED - endpoint /api/stripe/webhook | backend/.env.example, backend/src/routes/allRoutes.ts, render.yaml | Quiz SaaS | yes | YES if the endpoint URL changes | Render: present |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | prod (Render) - server-only secret | backend/.env.example, backend/.env.staging.example, backend/src/db/supabaseClient.ts (+12) | Quiz SaaS | yes | rotate at cutover | Render: present |
| `SUPABASE_URL` | Supabase | prod (Render); dev via local .env - project ref is public; URL only | backend/.env.example, backend/.env.staging.example, backend/src/db/supabaseClient.ts (+12) | Quiz SaaS | yes | no (until DB migration in Phase 3) | Render: present |
| `TURNSTILE_SECRET_KEY` | other (Cloudflare Turnstile) | prod - optional - unset = bot check is a no-op | backend/src/services/turnstile.ts | Quiz SaaS | unclear | YES | Absent - optional (the bot check is a no-op) |
| `UNSPLASH_ACCESS_KEY` | other (Unsplash) | prod - optional stock-photo search | backend/src/routes/emails.ts, render.yaml | Quiz SaaS | unclear | YES | Absent on Render - optional (stock-photo search unavailable) |
| `UPSTASH_REDIS_REST_TOKEN` | other (Upstash Redis) | prod (Render) - optional | backend/.env.example, backend/src/services/rateLimiter.ts, render.yaml | Quiz SaaS | unclear | YES | Render: present |
| `UPSTASH_REDIS_REST_URL` | other (Upstash Redis) | prod (Render) - optional - unset = per-process limiter (Phase 1) | backend/.env.example, backend/src/services/rateLimiter.ts, render.yaml | Quiz SaaS | unclear: account owner not documented | YES if Upstash is kept (dedicated DB) | Render: present |
| `UPSTASH_REDIS_TOKEN` | other (Upstash Redis) | staging example only - code reads UPSTASH_REDIS_REST_TOKEN - wrong name in .env.staging.example | backend/.env.staging.example | Quiz SaaS | NO: doc drift | n/a | Absent - expected (staging-example name the code never reads) |
| `UPSTASH_REDIS_URL` | other (Upstash Redis) | staging example only - code reads UPSTASH_REDIS_REST_URL - wrong name in .env.staging.example | backend/.env.staging.example | Quiz SaaS | NO: doc drift | n/a | Absent - expected (staging-example name the code never reads) |


## 4. Webhooks, scheduled jobs, monitoring and storage

**Render Blueprint vs the live account (confirmed 19 Sep 2026 from the Render dashboard, read-only).** `render.yaml` declares one web service (`squarespell-backend`, plan `starter`) and five cron services that run six scheduled jobs: `squarespell-scheduled-sends` (every 5 minutes), `squarespell-lifecycle-emails` (daily 09:00 UTC; trial reminders and lead milestones), `squarespell-weekly-digest` (Mondays 10:00 UTC), `squarespell-monthly-report` (1st of the month, 10:00 UTC) and `squarespell-keep-alive` (every 10 minutes). **None of these six jobs exists in the live Render account**, which holds a single web service named `squarespell-api` on the Free plan, with no cron jobs, no environment groups and no webhooks. The live service therefore does not match the Blueprint, so `render.yaml` is not what is running, and the scheduled features below never run in production. No Render setting was changed.

### 4.1 Webhooks (inbound)
| Provider | Endpoint (code) | Secret variable | Verification (after Phase 1) | Registered / enabled in the live dashboard |
|---|---|---|---|---|
| Stripe | `POST /api/stripe/webhook` (`allRoutes.ts`, raw body mounted in `app.ts`) | `STRIPE_WEBHOOK_SECRET` | signature (5-minute tolerance), `503 webhook_not_configured` when the secret is unset, idempotency table `stripe_webhook_events`, unknown/non-Quiz events acknowledged and ignored, unmapped plan = explicit 500 `plan_mapping_missing` | Phase 0: "SQUARESPELL QUIZ" endpoint exists and is **Disabled** (unchanged; Stripe dashboard not re-inspected in this pass) |
| Stripe | `POST /api/webhooks/stripe-quiz-payment` ("pay to see results") | `STRIPE_QUIZ_PAYMENT_WEBHOOK_SECRET`, falls back to `STRIPE_WEBHOOK_SECRET` | signature; separate secret now possible (Stripe issues one per endpoint) | not seen in Phase 0 - not inspected in this pass (Render has no webhooks; the provider dashboards were not re-read) |
| Clerk | `POST /api/clerk/webhook` (Svix) | `CLERK_WEBHOOK_SECRET` | Svix signature (tested: valid, replay, wrong secret, missing headers); user upsert is idempotent | not inspected in this pass (Render has no webhooks; the provider dashboards were not re-read) |
| Resend | `POST /api/webhooks/resend` (bounces, complaints, opens, clicks) | `RESEND_WEBHOOK_SECRET` (new) | **was unauthenticated**; now Svix signature, `503` when unset | not inspected in this pass (Render has no webhooks; the provider dashboards were not re-read) |
| Zapier / API keys | `routes/zapier.ts`, `routes/apiKeys.ts` | - | **not mounted** in `app.ts` (Phase 0 risk R5 confirmed); left unmounted on purpose (finding F13) | n/a |
Outbound: lead webhooks to customer-configured URLs (`lead.captured`), SSRF-checked by `utils/urlValidator.ts`; Mailchimp/Klaviyo/ConvertKit/Google Sheets pushes; failures go to `integration_errors`.

### 4.2 Scheduled jobs
| Job | Where defined | Schedule | Calls | State found |
|---|---|---|---|---|
| Keep-alive (GitHub) | `.github/workflows/keepalive.yml` | every 10 min | `GET https://squarespell-api.onrender.com/api/keepalive` | **no such route on the API** (it exists only in the Next.js app), so the `curl -f` fails and the `|| echo` hides it; the job does nothing (F12) |
| Vercel cron | `backend/vercel.json` | `*/5 * * * *` | `/api/cron/process-email-queue` | the API is not deployed on Vercel, so **this never runs**; `frontend/vercel.json` has no `crons` although `frontend/app/api/keepalive/route.ts` says it is a Vercel cron |
| Render cron `squarespell-scheduled-sends` | `render.yaml` | `*/5 * * * *` | `POST /api/cron/process-scheduled-sends` | **defined in `render.yaml` but does not exist in the live Render account (no cron jobs) - never runs** |
| Render cron `squarespell-lifecycle-emails` | `render.yaml` | daily 09:00 UTC | `trial-reminders`, `lead-milestones` | **not present in the live account - never runs** (trial reminders and lead milestones are not sent) |
| Render cron `squarespell-weekly-digest` | `render.yaml` | Mon 10:00 UTC | `weekly-digest` | **not present in the live account - never runs** |
| Render cron `squarespell-monthly-report` | `render.yaml` | 1st, 10:00 UTC | `monthly-report` | **not present in the live account - never runs** |
| Render cron `squarespell-keep-alive` | `render.yaml` | `*/10 * * * *` | `GET /health` | **not present in the live account**; the free instance therefore spins down when idle |
| In-process timers | `backend/src/index.ts` (only when `RENDER_EXTERNAL_URL`/`API_BASE_URL` is set) | 5 min self-ping; 30 min weekly-digest trigger (**no-op**: path `/cron/weekly-digest` lacks `/api`; because no Render cron exists the weekly digest is currently sent by nothing - see F11); 30 min preview-cache cleanup (path **fixed** in this PR, it was a 404); 4-day Supabase ping; **new: 5-min email-sequence queue drain** | - | see D16; `DISABLE_INPROCESS_EMAIL_QUEUE=true` switches the new drain off |
| Browser keep-alive | `frontend/lib/keepAlive.ts` | 10 min per open browser | `GET /api/health` | works while a tab is open |
**Live state (coordinator, read-only):** Render has no cron jobs, so the only scheduled work in production is the GitHub Actions keep-alive (which hits a non-existent route) and the in-process timers - and those exist only while the Free instance is awake and `RENDER_EXTERNAL_URL` is set; while it is spun down nothing runs, **including the email-queue drain added by this PR**, so follow-up emails are delivered late or not at all until the service is on an always-on instance or an external scheduler calls `POST /api/cron/process-email-queue` (with `x-cron-secret`).

Before this PR **nothing ever drained `email_sequence_queue`** (finding D16): follow-up sequences could never have been sent.

### 4.3 Monitoring and logging hooks
* Errors: Sentry is initialised only when `SENTRY_DSN` (API, `index.ts`) / `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` (frontend, `sentry.*.config.ts`) is set; account ownership undocumented. The new JSON error handler reports 5xx to Sentry when it is initialised.
* Logs: NDJSON via `backend/src/lib/logger.ts` and `requestLogger`; Render and Vercel log streams. Since this PR credentials and e-mail addresses are redacted before they are written.
* Health: `GET /health` and `GET /api/health` (liveness, Render `healthCheckPath`), **new** `GET /api/health/ready` and `/health/ready` (database round-trip, 503 without details).
* No uptime monitor, alert rule or status page exists in the repository - a remaining action.
* Feature-level logs in tables: `integration_errors`, `platform_email_logs`, `email_events`.

### 4.4 File storage
* Supabase Storage bucket `quiz-media` via `POST /api/media/upload` (`allRoutes.ts:3151`): base64 upload, public URLs, no content-type or size validation (F07).
* Static assets: `frontend/public/embed/*.js` (embed loader), `frontend/public/email-templates`.
* No S3/R2. PDF reports are generated on demand (`pdfkit`), not stored. Drafts and caches are database rows (`preview_drafts`, `preview_cache`).

## 5. Test matrix (hermetic; nothing touches a live service)

**Harness** (`backend/src/__tests__/helpers/`): the repository's own SQL migrations are applied to **PGlite** (a WebAssembly build of the real PostgreSQL engine); a small PostgREST-shaped query builder stands in for `@supabase/supabase-js` (same result shapes and error codes: `PGRST116`, SQLSTATE); Clerk sessions are RSA-signed locally and verified by the **real** `@clerk/backend` `verifyToken` using its documented networkless `jwtKey` mode (`CLERK_JWT_KEY`, new optional variable); Stripe signatures are produced with the official `stripe` library and a locally generated secret; Resend is a recording stub that can fail exactly like Resend v3 (returns `{error}`); the real Anthropic SDK talks to a local HTTP stub via `ANTHROPIC_BASE_URL` (answers, 500s, 429s, or never answers); the URL-analysis flow scrapes a local Squarespace-looking fixture site. Every environment value in `helpers/setup.ts` is a local fixture whose only job is to isolate an external service; none was used to hide a product failure, and where a failure needed a remote secret it is listed in section 10 instead.
**Limitation of the stand-in:** it is not PostgREST. Row-level security, the REST URL grammar and PostgREST-specific behaviour are not exercised.

"Before" = the same test run against the unmodified application code (harness enablers only; raw output in `docs/relaunch/evidence/`). "After" = this branch.

| # | Flow / requirement | Test file(s) | Before fixes | After |
|---|---|---|---|---|
| 1 | Sign-up (first request creates one user; parallel first requests), sign-in (valid / expired / forged / garbage / missing JWT), sign-out (no token), session expiry, Clerk outage, DB outage during sign-in, Clerk webhook (valid, replay, bad signature, missing headers) | `auth.test.ts` | 9 of 15 failed | PASS |
| 2 | Protected routes: every parameterless GET route that requires auth answers 401 without a token (route-introspection sweep) | `auth.test.ts` | pass | PASS |
| 3 | Creation mode 1 manual (all five quiz modes, quota +1), mode 2 template payload round-trip, mode 3 URL analysis (success, non-Squarespace 422, invalid URL, template-id steering), mode 4 `/api/generate`, mode 5 funnel analyze -> build -> edit -> claim once, preview-generate, save-preview, duplicate | `creationModes.test.ts` | 9 failed (funnel needs `preview_drafts`; from-url/claim/save-preview unguarded; generate consumes quota) | PASS |
| 4 | Usage / plan limits on every creation path: expired trial blocked, core blocked at 5, exactly 5 then refused, concurrent creates cannot exceed, trial/pro/business unlimited; limit table (free 0, core 5, trial/pro unlimited, leads 0/1,000/3,000/unlimited, add-ons) | `creationModes.test.ts`, `planEnforcement.test.ts` | from-url, claim, save-preview, duplicate count failed | PASS |
| 5 | Save / reopen / edit, optimistic-lock 409, ownership/slug/status immutable through the body, archive / restore | `publicRuntime.test.ts` | non-owner PATCH answered 500 | PASS |
| 6 | Preview (draft owner-only, never public) and publish (validation, go live, pause, expired-trial refusal) | `publicRuntime.test.ts` | expired-trial publish allowed | PASS |
| 7 | Hosted-link runtime: live only, no owner id, scheduling windows, 404 JSON | `publicRuntime.test.ts` | pass | PASS |
| 8 | Embed runtime: cross-origin CORS on the public endpoints, no credentialed CORS for arbitrary origins, `vercel.json` framing headers, loader asset | `publicRuntime.test.ts` | pass | PASS |
| 9 | Lead submission: validation, honeypot, junk name, disposable e-mail, unknown quiz, GDPR gate, in-trial and expired-trial owners, cap error shape, monthly limit | `leadsAndScoring.test.ts` | every submission answered 403 "Lead limit reached" or 500 | PASS |
| 10 | Result / outcome calculation: inclusive boundaries, forged outcome id ignored, empty answers, hostile values, ties (first match), multi-select, client_qualifier, browser/server parity | `leadsAndScoring.test.ts` | could not run (lead insert failed) | PASS |
| 11 | Lead visible in the owner dashboard API: list, detail with score label, per-quiz list, export | `leadsAndScoring.test.ts` | 500 | PASS |
| 12 | Analytics events (views / starts / completions once per session, bots not counted, allow-list, per-question drop-off, funnel) | `publicRuntime.test.ts` | 3 of 5 failed | PASS |
| 13 | E-mail lifecycle with a stub: lead confirmation, owner notification, provider error, unsubscribe (link, one-click, resubscribe), sequences (enqueue, send once, CAN-SPAM footer, unsubscribed skip, retry/backoff, max retries), GDPR deletion e-mail, Resend delivery webhook | `emailLifecycle.test.ts`, `resendWebhook.test.ts` | 11 of 11 and 4 of 5 failed | PASS |
| 14 | Quiz ownership and tenant isolation: B attacks every authenticated route that takes an id (>80 routes) with A's ids - response leaks and row snapshots of 27 tables; explicit quiz / lead / analytics / integrations / brand-kit / campaign / template checks; slug guessing; unauthenticated access; hostile ids; owner can actually use the features | `tenantIsolation.test.ts`, `identityKeys.test.ts` | 4 of 9 and 8 of 8 failed | PASS |
| 15 | AI failure, timeout, recovery: hang, 5xx, 429, garbage; bounded time and attempts; fallback flagged; call-count cost bound; anonymous throttle | `aiResilience.test.ts` | 8 of 9 failed | PASS |
| 16 | Repeated submission: retry, double click, 4 concurrent, per-IP throttle without Redis | `leadsAndScoring.test.ts` | failed | PASS |
| 17 | Stripe webhook: missing / wrong / tampered / stale signature, unset secret, idempotent duplicate, replay cannot roll a plan back, unknown types, non-Quiz events, plan sync, **missing plan mapping fails clearly**, unknown plan metadata, cancellation, DB failure -> 5xx and retry applies | `billing.test.ts` | 9 failed | PASS |
| 18 | Billing configuration: price per plan/period, unset price -> 503, unknown plan -> 400 (incl. `__proto__`), switch-plan, Stripe outage -> 502, documented env names | `billing.test.ts` | 4 failed | PASS |
| 19 | Server-side gating: A/B testing, integrations, sequences, team seats (regression guard for custom domain, white-label, branding) | `planEnforcement.test.ts` | 4 failed | PASS |
| 20 | Trial-length consistency (14 vs 7 days) across frontend copy and backend e-mails | `planEnforcement.test.ts` | failed ("7 days free") | PASS |
| 21 | Health (liveness survives a DB outage; readiness 200 / 503 without detail), cron auth (9 endpoints x 2, unset secret, correct secret), async-error safety, migrations, table/column coverage, required functions | `foundation.test.ts` | 9 of 28 failed | PASS |
| 22 | Logging redaction | `logging.test.ts` | 4 of 4 failed | PASS |
| 23 | Smoke script: passes end to end, exit 1 on a bad token, exit 3 for live hosts, needs the env token | `smoke.test.ts` | new | PASS |
| 24 | Configuration inventory drift guard | `configInventory.test.ts` | new | PASS |
| 25 | Pre-existing suites (validators, preview cache, mini lead app) | 4 files, 57 tests | pass | PASS |

**Per file (tests now / before fixes pass-fail):** aiResilience 9 / 1-8; auth 15 / 6-9; billing 21 / 8-13; configInventory 2 / new; creationModes 32 / 22-9 (31 tests at that point); emailLifecycle 12 / 0-11 (11 then; the GDPR-link test was added later); foundation 28 / 19-9; identityKeys 8 / 0-8; leadsAndScoring 18 / 2-16; logging 4 / 0-4; planEnforcement 10 / 3-7; publicRuntime 20 / 15-5; resendWebhook 5 / 1-4; smoke 4 / new; tenantIsolation 9 / 5-4; pre-existing 57 / 57-0. **Total now: 254 pass, 0 fail.** The first whole-suite run on unmodified application code (233 tests then) was 139 pass / 94 fail. `identityKeys`, `tenantIsolation` (final version) and `resendWebhook` "before" figures come from targeted runs against earlier commits, documented in the evidence files.

Raw evidence: `docs/relaunch/evidence/phase1-tests-before-fixes.txt` (whole suite before any fix), `phase1-tenant-isolation-before-fix.txt`, `phase1-identity-keys-before-fix.txt`, `phase1-resend-webhook-before-fix.txt`.

## 6. Confirmed defects (each reproduced by a failing test or a concrete trace, then fixed)

Severity: **P0** = another customer's personal data exposed, or the core revenue flow (lead capture) unable to work; **P1** = serious break in an area the plan lists (authorization, lead capture, outcomes, analytics, timeouts/cost, webhooks, e-mail, entitlements, published-quiz failures, health); **P2** = real but contained. `file:line` refer to `main` (67dd18d). "Repro" names the test that failed first. All 32 are fixed in this PR.

| ID | Sev | Defect (file:line on main) | Repro | Impact |
|---|---|---|---|---|
| D01 | P0 | In-trial accounts cannot capture a single lead. New sign-ups are stored as plan `free` (`middleware/auth.ts:96-104`); the lead route takes limits from `getPlanLimits('free')` = **0 leads** (`allRoutes.ts:681`, `planGuard.ts:15`) and the atomic function rejects with `LEAD_LIMIT_REACHED` -> "403 Lead limit reached". | `leadsAndScoring` "trial: an owner inside the 14-day trial collects leads" | Every trial owner's published quiz shows an error to every visitor. Phase 0: 0 leads on 9 live quizzes. |
| D02 | P0 | The lead path depends on schema that no repository migration creates, and a failed owner lookup is silently treated as a free plan. `users.brand_kit`, `users.lead_addon`, `leads.metadata` (written by `insert_lead_with_limit_check`), `preview_drafts`, ... are missing (`allRoutes.ts:670`, `:765`; test `foundation` "every column"); migration 024, which defines the function, **aborts on a fresh database** (`024_security_hardening.sql:46`, index on a non-existent column). Error path: `allRoutes.ts:670-681`. | `foundation` migrations / columns / functions; `leadsAndScoring` (all 403 at first) | A database built from the repo cannot store leads; on a drifted database the owner lookup fails and every lead is answered "limit reached". |
| D03 | P0 | Cross-tenant disclosure of personal data. GDPR consent history and export return consents and partial completions for an e-mail address across **all** businesses (`services/gdprCompliance.ts:40,55`); any user can read the tags of any lead id (`routes/segmentation.ts:88`) and any quiz's translations (`routes/translations.ts:38`). | `tenantIsolation` "no response discloses A's data" | Business B reads A's leads' consent text, partial answers, tags, translations. |
| D04 | P1 | Cross-tenant writes: result-page blocks can be edited, deleted and re-ordered by anyone who knows a quiz/block id (`richResults.ts:52,69,78`); connecting/syncing/disconnecting a Squarespace store and mapping products to outcomes have no ownership check, and disconnect deletes **another tenant's synced products** before the (failing) owner-scoped delete (`commerce.ts:32,51,71-100`, `services/squarespaceCommerce.ts:103`). | `tenantIsolation` "mutating attempts leave every A-owned row untouched" | Data loss / tampering across tenants. |
| D05 | P1 | Identity-key bug: nine route files compare `req.userId` (the Clerk id `user_...`) with **uuid** columns (`segmentation.ts:26`, `translations.ts:26`, `automation.ts:18`, `commerce.ts:23`, `richResults.ts:22`, `questionAnalytics.ts:95`, `extendedFeatures.ts:30`, `gdpr.ts:30`, `partialCompletion.ts:59`). PostgreSQL answers `invalid input syntax for type uuid: "user_..."`. | `identityKeys` (8 of 8 fail on main) | Tags, segments, automations, translations, rich results, custom CSS, GDPR export, partial completions and question analytics fail for every real user (and looked "isolated" only because nothing worked). *Caveat:* if production has these columns as text, only the isolation half applies. |
| D06 | P1 | Repeated submission is not idempotent. The unique index `(quiz_id, email)` (`005_idempotent_leads.sql:6`) makes a second insert raise; the route answers **500 with the raw constraint message** (`allRoutes.ts:765-787`) and the browser retries 3 times (`app/quiz/[slug]/page.tsx:~553`). Counters and notifications are not guarded either. | `leadsAndScoring` "repeated submission", "concurrent identical submissions" | Visitors who double-click, retry after a timeout or retake the quiz see an error although the lead exists. |
| D07 | P1 | "1,000 leads / month" is enforced as 1,000 leads **ever**: `SELECT COUNT(*) FROM leads WHERE user_id` has no month window (`024_security_hardening.sql:110`). | `leadsAndScoring` "core plan limit is monthly" | Paying customers get blocked after cumulative volume. |
| D08 | P1 | The lead score is never stored (`leads.score` is not in the insert), so the dashboard shows `Unknown`, and score-conditioned sequences and automations receive `null` (`024_security_hardening.sql:117-120`, `allRoutes.ts:765`). | `leadsAndScoring` "stores the lead ... score" | Wrong/absent lead scoring and segmentation. |
| D09 | P1 | Server and browser disagree on outcomes when only some outcomes carry score ranges: the server treats a missing bound as infinity (`allRoutes.ts:168-172`), the browser does not (`app/quiz/[slug]/page.tsx:168-186`). | `leadsAndScoring` "server and browser use the same rule" | The visitor sees one result, the stored lead and the e-mail carry another. |
| D10 | P1 | Plan limits are not enforced on every creation path: `from-url` has no guard (`quizzesFromUrl.ts:114`), `claim-quiz` and `save-preview` neither check nor count (`allRoutes.ts:492`, `:216`), publish is allowed for expired trials (`quiz.ts:164`), `/api/generate` consumes quota without creating anything (`allRoutes.ts:206`), duplicate counts twice (`quiz.ts:284`). | `creationModes` (10 tests), `publicRuntime` publish | Expired/core accounts create unlimited quizzes; quota is wrong for the accounts that do pay. |
| D11 | P1 | Gated features are enforced only in the UI: A/B testing (`quiz.ts:683`), integrations (`allRoutes.ts:1214`), follow-up sequences (`quiz.ts:341`) and team seats (`quiz.ts:862`, `teams.ts`) accept any plan (`abTesting`, `integrations`, `emailSequences`, `teamSeats` are only read by `/api/user/plan`). | `planEnforcement` gating tests | Entitlement bypass by direct API call. |
| D12 | P1 | Analytics: any string is stored as `event_type`; `view`/`start`/`complete` are recounted on every reload or retry; bots are *flagged* but still increment `view_count` (`allRoutes.ts:596-609`). | `publicRuntime` analytics tests | Inflated, unfilterable numbers; unbounded garbage rows from anonymous callers. |
| D13 | P1 | Resend v3 returns `{ error }` instead of throwing; five call sites ignore it (`resultEmail.ts:69`, `emailSequence.ts:339`, owner notification `allRoutes.ts:~826`, `automationEngine.ts:173`, `weeklyDigest.ts:125`). | `emailLifecycle` "reports failure honestly", "provider errors ... retried" | A rejected e-mail (for example an unverified sender domain - exactly what a domain move causes) is recorded as *sent*; no retry, no alert. |
| D14 | P1 | The queue writes `status='retry'` and `'skipped'` (`emailSequence.ts:372`) but the table CHECK allows only `pending/sent/failed` (`014_email_sequences.sql:25`); the update is rejected, the row stays `pending`. | `emailLifecycle` sequence tests | A failing send is retried on every run with no backoff; unsubscribed recipients are re-examined forever. |
| D15 | P1 | Sequences cannot be created: the route inserts `outcome_id: null` (`quiz.ts:390`) into a `NOT NULL` column. | `planEnforcement` "sequences: pro allowed" | The follow-up sequence feature returns 500. |
| D16 | P1 | Nothing drains `email_sequence_queue` (the only schedule is `backend/vercel.json:4`, not deployed) and the endpoint that would do so is **unauthenticated** (`allRoutes.ts:2495`, all others check `x-cron-secret`). | `foundation` cron tests | Follow-ups never send; anyone can trigger sends. |
| D17 | P1 | Unsubscribe is broken: the route upserts columns that do not exist (`quiz_id`, `source`) and conflicts on a constraint that does not exist (`unsubscribe.ts:110`) so **every** unsubscribe, including RFC 8058 one-click, returns 500; `isUnsubscribed` uses `maybeSingle()` and reports "not unsubscribed" when two tenants hold the address (`services/unsubscribe.ts:36`). | `emailLifecycle` unsubscribe tests | CAN-SPAM/GDPR failure. |
| D18 | P1 | The Resend webhook is unauthenticated and writes suppressions with the same wrong column shape; it also treats a message id as an address (`resendWebhook.ts:10,130,143`). | `resendWebhook` (4 of 5 fail on main) | Anyone can forge delivery events; real bounces/complaints never suppress. |
| D19 | P1 | The GDPR-deletion e-mail links to `APP_URL/api/gdpr/confirm-delete`, a path on the Next.js host that has no such route (`allRoutes.ts:1143`). | `emailLifecycle` "GDPR deletion e-mail" | Deletion requests can never be confirmed. |
| D20 | P1 | Cron/keep-alive authentication fails open: `if (header !== process.env.CRON_SECRET)` passes when both are `undefined` (nine endpoints, `allRoutes.ts:2508...`); the frontend route compares to `Bearer undefined` (`app/api/keepalive/route.ts:18`). | `foundation` "when CRON_SECRET is not configured" | An unset secret silently opens every cron endpoint. |
| D21 | P1 | Express 4 does not catch rejected async handlers and there is no error middleware (`index.ts`): a failing Stripe call in `create-checkout` (`allRoutes.ts:2157`) hangs the request and, on Node >= 15, terminates the process. | `foundation` "one failing request must not hang or crash" (timed out at 30 s) | One bad request can restart the API for everyone. |
| D22 | P1 | Auth: a database error in `attachUser` "fails open" and continues with `req.dbUserId` undefined (`auth.ts:67,107`); the dashboard's parallel first-login calls race on the unique `clerk_user_id` insert; every verification failure is a generic 401 - including a Clerk outage, which also takes 7.6 s of SDK retries (`auth.ts:40,47`). | `auth` sign-up / outage tests | Users silently logged out during an outage; possibly the source of the 12 vs 9 user gap (section 14). |
| D23 | P1 | No readiness check: `/health` returns `{ok:true}` without touching the database (`index.ts:178`). | `foundation` health tests | Render/uptime tools cannot tell "up" from "up but broken". |
| D24 | P1 | AI cost and latency are unbounded: `@anthropic-ai/sdk` 0.20.9 hard-codes `timeout: 600000` inside `messages.create` (client-level `timeout` is ignored) and retries twice, so a hung call can hold a user ~30 minutes (`claudeService.ts:5`); provider messages are echoed to the client; on failure `generateTailoredQuiz` silently returns a hard-coded **wellness** quiz for any business (`claudeService.ts:719`); URL analysis makes an unused third model call (`quizzesFromUrl.ts:170`). | `aiResilience` (8 of 9 fail on main) | Endless spinners, wasted spend, wrong content presented as tailored. |
| D25 | P1 | Rate limiting is silently off without Upstash: the limiters are built with `redis: undefined`, every `.limit()` throws and `safeLimit` fails open (`rateLimiter.ts:15`). | `leadsAndScoring` throttle, `aiResilience` anonymous throttle | Unmetered anonymous AI calls (`/api/preview-*`) and lead-form spam. |
| D26 | P1 | Stripe: price ids are frozen at import from names that differ from `render.yaml`; an unmapped plan answers a misleading `400 Invalid plan`; the webhook has no idempotency (a replay can undo an upgrade), swallows database errors and answers 200, accepts any `metadata.plan`, silently ignores a subscription on an unmapped price, and would verify against an undefined secret (`allRoutes.ts:2083,2157,2243-2356`). | `billing` (13 of 21 fail on main) | See section 12. The webhook is disabled today; these are the reasons it must not be re-enabled as it was. |
| D27 | P1 | Migrations 016 and 024 do not apply, and eleven core objects exist only by hand in production (`031` reconciles them). | `foundation` schema tests | A new environment (staging, the Phase 3 VPS database) cannot be built from the repository. |
| D28 | P2 | Logs carry credentials/PII (for example lead e-mail addresses in `[GDPR]` and `[Unsubscribe]` lines, error text with tokens). | `logging` | PII in third-party log stores. |
| D29 | P2 | Sign-up page says "7 days free"; the trial is 14 days everywhere else (`app/sign-up/page.tsx:172`, `planGuard.ts:11`, terms, pricing, e-mails). | `planEnforcement` trial consistency | Misleading trial length. Changed to "14 days free" (aligns the copy with enforced behaviour; no claim or price was altered). |
| D30 | P2 | Non-owner `PATCH /api/quizzes/:id` answers 500 and non-owner `DELETE` answers 200 (`quiz.ts:156,218`). | `publicRuntime`, `tenantIsolation` | Wrong status codes; no data changed. |
| D31 | P2 | The daily AI-generation allowance knows only legacy names, so `business` and `core` get the free allowance (`quizzesFromUrl.ts:78`). | `aiResilience` allowance | Paying customers throttled. |
| D32 | P2 | The quiz-payment webhook verifies with the same secret as the subscription webhook although Stripe issues one per endpoint (`allRoutes.ts:3099`). | code trace; `billing` | One of the two endpoints can never verify. |

## 7. Fixes included in this PR

Commits (`git log 67dd18d..HEAD`): (1) test harness (PGlite + local fakes), `app.ts` split, optional `CLERK_JWT_KEY`; (2) the Phase 1 tests, written before any fix; (3) migrations repaired + `031_schema_reconciliation.sql`; (4) tenant isolation, identity keys, auth error codes, health checks, cron auth, async-error safety; (5) plan enforcement, lead capture, analytics, e-mail lifecycle, AI bounds, Stripe safety, log redaction, frontend copy; (6) smoke test, configuration inventory, in-process queue drain, GDPR link; (7) Resend webhook verification, config drift guard, evidence, this document.

Protection added (deliverable 6): (a) `/api/health/ready`; (b) redacting structured logger; (c) explicit failure states: `auth_provider_unavailable`, `db_unavailable`, `ai_timeout|ai_unavailable|ai_rate_limited|ai_bad_response`, `billing_provider_unavailable`, `plan_not_configured`, `plan_mapping_missing`, `webhook_not_configured`, `cron_not_configured`, `token_expired|token_invalid|auth_required`; (d) `scripts/smoke/`; (e) permanent test files listed in section 5.

**Database migration to review before anything is applied (`backend/migrations/031_schema_reconciliation.sql`).** Additive and idempotent except two replacements: the `insert_lead_with_limit_check` function (monthly limit, duplicate handling, stored score) and the `email_sequence_queue` status CHECK. It creates `preview_drafts` and `stripe_webhook_events`, adds `users.first_name/brand_kit/custom_domain/domain_verified/lead_addon/email_addon/email_notifications`, `leads.metadata/qualified/path_taken/calculated_price` and the engagement counters, and relaxes `email_sequences.outcome_id`. Because production was evolved by hand, **first diff its objects against the live schema** (read-only `information_schema` query), then apply to a copy/staging database, then production - it was not applied anywhere by this work.

## 8. Findings recorded, not fixed (P2 or owner decisions)

| ID | Finding | Where |
|---|---|---|
| F01 | The pre-existing `leads.test.ts` tests a re-implemented mini app, not the product. | `backend/src/__tests__/leads.test.ts` |
| F02 | Documentation drift: README says Railway; `.env.staging.example` uses names the code never reads; `render.yaml` declares `STRIPE_STARTER_*`/`AGENCY_*` and omits the `CORE`/`BUSINESS`/add-on price ids the code reads (left untouched: editing it would change the blueprint). | `README.md`, `backend/.env.staging.example`, `render.yaml` |
| F03 | Remaining schema drift with unknown production shape (not invented here): tables `campaigns`, `email_ab_variants`, `email_engagement_log`, `referral_codes`, `referrals`; columns `quizzes.brand`, `quizzes.category`. Consequences: AI e-mail generation (`quiz.ts:653`), e-mail source-quiz (`emails.ts:882`), extended funnel stats (`allRoutes.ts:1553`), referrals, e-mail A/B and engagement scoring cannot work. Pinned in `foundation.test.ts` so new drift fails. | see left |
| F04 | SSRF surface: `scrapeBrand` fetches a caller-supplied URL and follows redirects with no private-range check, reachable unauthenticated through `/api/preview-analyze` (`brandScraper.ts:30`). Exposure is limited (only parsed text fields come back and the page must look like Squarespace), but it should be closed. | `services/brandScraper.ts:30` |
| F05 | CORS: the public-prefix list `'/api/quiz'` also matches `/api/quizzes` (wildcard origin, no credentials, Bearer auth - low risk), while `/api/public/*` (quiz-events, quiz-progress, embed-perf, consent, checkout) get the restrictive allow-list, so those calls fail if made directly from a customer's origin (the iframe embed runs on the app origin and is unaffected). | `app.ts` (`PUBLIC_PATH_PREFIXES`) |
| F06 | `GET /api/embed/loader/:slug` splices `slug` and `mode` into JavaScript unescaped and loads `https://cdn.squarespell.com/embed/v2/loader.min.js`, a host not shown to exist. | `services/embedPerformance.ts:128-137` |
| F07 | Media upload accepts any content type/extension and any size up to the 25 MB body limit into a public bucket. | `allRoutes.ts:3151` |
| F08 | Unsubscribe tokens are base64 of the address, unauthenticated: anyone can unsubscribe anyone (common pattern, but forgeable). | `routes/unsubscribe.ts:30` |
| F09 | Public `POST /api/gdpr/delete-request` e-mails arbitrary addresses (only the per-IP limiter protects it). | `allRoutes.ts:1118` |
| F10 | Public quiz pages are still served for expired-trial owners while the lead form answers 403; e-mails promise "your quizzes are now offline". Decide whether public GET should 404/410. | `allRoutes.ts:557` |
| F11 | The in-process weekly-digest trigger calls a path that does not exist (no-op). No Render cron exists in the live account, so the digest is currently not sent by anything; the code comment at that line ("do not fix") assumed the Render cron and is now out of date. Decide the scheduling approach (paid Render crons or an external scheduler) before changing it, so the digest is not sent twice. | `index.ts:256` |
| F12 | Keep-alive plumbing: the GitHub Action hits a non-existent API route; `frontend/vercel.json` lacks the cron its route documents; `backend/vercel.json` cron is dead. | `.github/workflows/keepalive.yml`, `vercel.json` files |
| F13 | Zapier, API-key auth and `templatesRouter`/`cleanupRouter` are exported but never mounted (Phase 0 risk R5 confirmed). Mounting would enable an unreviewed public surface, so it was not done; decide whether to ship or remove the advertised feature. | `routes/zapier.ts`, `routes/apiKeys.ts`, `middleware/apiKeyAuth.ts` |
| F14 | Plan tables disagree: `PLAN_LIMITS.trial.removeBranding` is true but the PATCH branding rule excludes free/trial. | `planGuard.ts`, `quiz.ts:78` |
| F15 | `GET /api/leads/:id` answers 403 for another tenant's lead (confirms existence); 404 would be better. | `allRoutes.ts:1101` |
| F16 | Team tables are keyed by **Clerk id** text (`teams.owner_id`, `team_members.user_id`), unlike everything else: they must be remapped at the Clerk cut-over (section 13.2). | `services/teamService.ts` |
| F17 | Funnel drafts can be read/edited by anyone holding the 128-bit claim token (acceptable) but contain scraped third-party content. | `allRoutes.ts` preview routes |
| F18 | `GET /api/analytics/:quizId` returns `quiz.view_count` unfiltered but event counts when a filter is given, so totals differ by filter. | `allRoutes.ts:1473-1500` |
| F19 | The per-user daily AI limit for `from-url` is an in-memory map: resets on restart and is per instance. | `quizzesFromUrl.ts:50-90` |
| F20 | Repo hygiene: `NewQuizModal.tsx.b64`, `_cherry-pick-to-main/*.sh`, ~30 root-level audit documents. | repository root |
| F21 | `X-Frame-Options: ALLOWALL` is not a valid value; framing works only through the CSP `frame-ancestors *` rule. | `frontend/vercel.json` |
| F22 | Result/sequence e-mail HTML interpolates quiz/outcome text unescaped (owner-authored content only). | `resultEmail.ts`, `emailSequence.ts` |
| F23 | Dashboard page auth is client-side by design (middleware protects only `/api/*` under `/dashboard`); safe because the API enforces auth, but page shells load unauthenticated. | `frontend/middleware.ts` |
| F24 | The frontend was verified only by its existing tests, `tsc`, the production build and static consistency checks; no browser-level or visual testing was done. | - |

**Committed-secret scan.** No secret was found. Pattern scan (Stripe/Clerk live and test keys, webhook secrets, Resend and Anthropic keys, JWT-shaped Supabase keys, private keys, AWS/GitHub/Slack tokens) over the current tree and all 892 commits: only two placeholder-shaped matches - `backend/.env.staging.example` (an Anthropic-key-shaped placeholder) and `site-auditor/src/lib/pdf/fonts.ts` (font data). `backend/.env.example` contains the Supabase **project reference** in a URL (an identifier, not a credential). The scan is pattern-based, not an entropy or provider-side audit.

## 9. Verification results (baseline `main` vs this branch)

All commands run from a fresh clone in a temporary directory outside any project folder; dummy values were used only to isolate the frontend build from Clerk (`NEXT_PUBLIC_API_URL=http://localhost:3001 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<dummy> CLERK_SECRET_KEY=<dummy>`), identically on both sides. No lint tool is configured in either project (nothing to run, nothing skipped).

| Command | `main` (67dd18d), unmodified | this branch |
|---|---|---|
| `cd backend && npm ci` | exit 0 | exit 0 (+1 dev dependency, `@electric-sql/pglite`) |
| `cd backend && npx vitest run` | 4 files, **57 passed**, 0 failed | 19 files, **254 passed**, 0 failed |
| `cd backend && npx tsc --noEmit` | exit 0 | exit 0 |
| `cd backend && npm run build` (`tsc`; tests are excluded from compilation) | exit 0 | exit 0 |
| `cd frontend && npm ci` | exit 0 | exit 0 |
| `cd frontend && npx vitest run` | 1 file, **7 passed** | 2 files, **9 passed** |
| `cd frontend && npx tsc --noEmit` | exit 0 | exit 0 |
| `cd frontend && npm run build` (`next build`, env above) | exit 0 | exit 0 |
| Lint | not configured (no script, no ESLint config) | not configured |

One honest caveat: a run that executed the backend suite and the frontend suite **concurrently** made the *pre-existing* frontend test `TryFlowInner.test.tsx > reaches Stage 3` exceed its default 5 s timeout once (6.8 s under CPU load); three sequential re-runs and the recorded sequential run all pass. The backend suite was run several times; the final 254/254 result was stable across runs.

Pre-existing failures on `main`: none (every baseline command passed), so there are no regressions to separate from pre-existing failures; all 57 baseline backend tests and 7 baseline frontend tests still pass unchanged.

**Smoke test.** `scripts/smoke/smoke.mjs` (documented in `scripts/smoke/README.md`) exercises health, readiness, auth, create, save, publish, hosted link, embed, lead submit, lead visible, analytics and cleanup, tags everything `P1-SMOKE`, and refuses hosts containing `squarespell.com`, `squarespellquiz.com` or `onrender.com` unless `--allow-live` is given. Its hermetic self-test passes 13/13 steps against the in-process API. **It now also passes 13/13 steps against a temporary API on a real PostgreSQL database inside GitHub Actions (section 17). It has not been run against any deployed environment (staging or production).**

### 9.1 Preview smoke test (coordinator, read-only, Vercel Preview of this branch)

Run by the coordinator while signed in to Vercel; no sign-up, no data written, no production setting changed. `/sign-up` renders and shows "14 days free" (no "7 days"); `/sign-in`, `/pricing`, `/templates`, `/tools`, `/tools/quiz-funnel/build`, `/terms`, `/privacy` and `/dashboard` all respond 200. The console shows the production API blocking the preview origin by CORS (`CORS_ORIGINS` allows only `app.squarespell.com`) - expected and deliberately not changed - so **authenticated end-to-end flows cannot run from a preview**. This confirms the frontend copy fix (D29) and that the pages build and serve; it does not verify any backend fix.

## 10. Items that could not be tested hermetically (and why)

* Clerk hosted sign-in/sign-up UI, Google/Apple OAuth, real JWKS retrieval, session refresh in the browser, and the 12-vs-9 user question - need the live Clerk dashboard. (Signature/expiry/claim handling *is* tested with the real verifier and a local key.)
* PostgREST behaviour, row-level security, Supabase Auth/Storage, the real production schema and data - the stand-in is PostgreSQL but not PostgREST.
* Upstash Redis distributed rate limiting (the in-process fallback is tested; the Redis path is not).
* Real Resend delivery, DKIM/SPF/DMARC and sender-domain verification; the effect of `example.com` recipients on a real account.
* The real Stripe API, dashboard webhook delivery/retry behaviour, Checkout pages, proration previews (the code paths are tested against a stub; signatures are real).
* Anthropic output quality (only failure handling is tested).
* Render cron execution, cold starts, deploy hooks; Vercel build/runtime, edge middleware, `vercel.json` header application, the preview deployment.
* Frontend behaviour in a browser (editor, quiz runner, embed script on a customer page), accessibility and visual regressions.
* Custom-domain DNS, Turnstile, Sentry, Google Sheets/Mailchimp/Klaviyo/ConvertKit integrations (external calls).

## 11. Remaining production configuration actions (owner)

1. **Schema:** run a read-only comparison of the live database with `031` (and confirm that `insert_lead_with_limit_check`, `users.brand_kit`, `users.lead_addon`, `leads.metadata`, `preview_drafts` exist). Apply `031` to staging/copy first. This is the most likely single cause of "0 leads".
2. **Pilot accounts:** every existing owner older than 14 days on plan `free` is **trial-expired** and cannot capture leads or publish. Decide which accounts get a plan (the 1 manually assigned `agency` account works) before any pilot.
3. **Cron secret:** `CRON_SECRET` is set on Render (absent on Vercel; GitHub not inspected). No Render crons exist, so whichever scheduler is chosen must send the same value; unset now fails closed (503) instead of open.
4. **Resend:** register the delivery webhook and set `RESEND_WEBHOOK_SECRET`; verify the sender domain (a rejected sender is now surfaced/retried, no longer silent).
5. **Stripe:** nothing was changed. Keep the Quiz webhook disabled until Phase 2; then set the `CORE`/`BUSINESS` price-id variables to the approved mapping and register the endpoint with its own secret (section 12).
6. **Upstash:** decide whether to keep it (dedicated database) - the in-process limiter is now the fallback and is per instance.
7. **Monitoring:** add an uptime check on `GET /api/health/ready` (not `/health`) with alerting; confirm who owns Sentry.
8. **Clerk:** register the `user.created` webhook (a missing registration plus D22 would explain the 12-vs-9 gap) - and follow section 13/14.
9. **Housekeeping:** remove or repair the GitHub keep-alive Action; decide on Zapier/API keys (F13), the public-quiz behaviour for expired accounts (F10), and the P2 list.
10. **Free instance:** decide whether to move `squarespell-api` off the Render Free instance (it was suspended for "Free Tier Usage Exceeded" 22 Jul - 1 Aug 2026 and spins down when idle with 50 s+ delays). No action taken.
11. **Staging / CORS:** production `CORS_ORIGINS` allows only `app.squarespell.com`, so preview deployments cannot call the API. Not changed; the owner sets a staging API and its CORS plan later.
12. **Resend webhook:** set `RESEND_WEBHOOK_SECRET` when the endpoint is registered (functional gap, item 4).
13. **Stripe names:** add the `CORE`/`BUSINESS` price-id variables only after Phase 2 approves plan names and prices (until then those plans answer 503 by design).
14. **Vercel Preview shares production Clerk keys** (all variables are assigned to All Environments): plan separate Preview/Development values later; do not create them before the Clerk production path (section 13).
15. **Review the "Needs Attention" flag** Vercel shows on `CLERK_SECRET_KEY`.
16. **Deploy:** the reviewed backend must be deployed by the owner (production is still `c67fb6d`, identical to `main`'s backend); nothing here deploys itself. Review and merge this PR only after the gates in section 16 are understood.

## 12. Stripe: Starter/Pro/Agency (Stripe) vs Core/Pro/Business (app) - note for Phase 2

**Nothing was created, edited or guessed in Stripe.** The webhook and the products/prices remain exactly as Phase 0 found them.

| | Stripe live catalog (Phase 0, verified) | Application (code, verified) |
|---|---|---|
| Names | Starter, Pro, Agency | Core, Pro, Business (legacy aliases `starter`, `growth`, `agency` still map to Core/Business) |
| Monthly | $19 / $39 / $79 | $12 / $19 / $35 (`$9 / $16 / $29` billed annually) |
| Yearly | $180 / $372 / $756 | annual prices in the same tiers |
| Environment variables | `render.yaml` / `.env.example`: `STRIPE_STARTER_*`, `STRIPE_PRO_*`, `STRIPE_AGENCY_*` | code reads `STRIPE_CORE_*`, `STRIPE_PRO_*`, `STRIPE_BUSINESS_*` (`services/billingPlans.ts`) |

Consequences today: even with a correct webhook, a purchase of an existing Stripe product could not be mapped to an app plan; and before this PR an unset name produced "Invalid plan" with no hint. **Phase 2 decisions needed:** approve plan names and prices, create the Quiz catalog (with a product identifier in metadata on every product, price, customer and subscription so Quiz and marketplace objects can be told apart in the shared account), then set the `CORE`/`BUSINESS`/`PRO` price-id variables and register a dedicated endpoint.

**Billing code behaviour now (tested):** the price for a plan/period is read at request time from its variable and **never defaulted**; unknown plan -> `400 invalid_plan`; unset price -> `503 plan_not_configured` and Stripe is never called (also for switch-plan); Stripe outage -> `502 billing_provider_unavailable`; the webhook refuses (`503`) when unconfigured, rejects missing/wrong/tampered/stale signatures (`400 invalid_signature`), stores every event id (`stripe_webhook_events`) so duplicates and replays are acknowledged without side effects, ignores unknown event types and events for objects that are not Quiz customers (the account is shared with the marketplace), treats a Quiz subscription on an unmapped price or a checkout with an unknown plan as an explicit `500 plan_mapping_missing` (plan unchanged, Stripe retries), and returns 5xx - releasing the idempotency claim - when a database write fails so the retry applies the change. **This makes the currently disabled Quiz webhook safe to re-enable later**, but it must stay disabled until Phase 2: with the current names an unmapped subscription would (correctly) fail loudly.

## 13. Clerk plan (documentation only - no code switching, nothing created)

Claims about Clerk's product below are from vendor documentation as understood at the time of writing; **re-verify each on the Clerk dashboard/docs when executing** (Phase 0 already recorded the current state: one "Squarespell" application in a personal Hobby workspace, development instance only, domain `flying-midge-60.clerk.accounts.dev`, email + Google + Apple enabled, 12 users).

### 13.1 Path to a dedicated production Squarespell Quiz Clerk application
1. In the Squarespell-owned Clerk workspace (move the app to an organization workspace first if the Hobby personal workspace should not own production), create a **new application "Squarespell Quiz"**; do not convert or reuse the development instance.
2. Use the same owner login; create the **Production instance** for that application (a production instance requires a domain you own).
3. **Domain:** enter `squarespellquiz.com` (or the chosen app host's registrable domain). Clerk then lists the DNS records to add at the DNS host - typically CNAMEs for the Frontend API (`clerk.`), the Account Portal (`accounts.`), Clerk's mail (`clkmail.`) and two DKIM records - and issues certificates after verification. **Phase 3** performs the DNS work; Phase 1 does not touch DNS.
4. **Social sign-in:** production instances cannot use Clerk's shared development OAuth credentials. Create **Squarespell-owned** OAuth clients: Google Cloud OAuth client (consent screen, authorised redirect URI shown by Clerk) and Apple (Apple Developer account: Services ID, Team ID, Key ID and private key). Keep "Email code/link"; leave Microsoft off unless wanted.
5. **Keys:** copy the production `pk_live_...` / `sk_live_...` pair into Vercel and Render *only at cut-over* (never into the repository).
6. **Allowed origins / redirects:** app origin(s), sign-in/sign-up/after-auth paths (`/sign-in`, `/sign-up`, `/dashboard`, `/sso-callback`, `/sso-popup-done`, `/oauth-popup` exist in `frontend/app`).
7. **Webhook:** add an endpoint `https://<api host>/api/clerk/webhook` subscribed to `user.created` (the handler upserts by `clerk_user_id` and sends the welcome e-mail); store its signing secret as `CLERK_WEBHOOK_SECRET`.
8. **Session / JWT:** the API verifies the default Clerk session token (`Authorization: Bearer <session JWT>`) and reads only `sub`; no custom JWT template is needed. Optional: set `CLERK_JWT_KEY` (the instance's PEM public key) to verify without calling Clerk (new in Phase 1); if `azp` checking is wanted later, add the app origin as an authorised party.
9. Restrict sign-ups as the pilot requires (allow-list / invitation only) while data is migrated.

### 13.2 Every code/configuration change needed to swap keys and domains (names only)
* **Environment (Vercel):** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`, `NEXT_PUBLIC_API_URL`.
* **Environment (Render):** `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, optional `CLERK_JWT_KEY`, optional `CLERK_API_URL`, `FRONTEND_URL`, `APP_URL`, `MARKETING_URL`, `CORS_ORIGINS`, `BACKEND_URL`, `RENDER_EXTERNAL_URL`.
* **Hard-coded hosts to change in code (no env switch exists):** `frontend/lib/urls.ts` (`APP_URL`, `MARKETING_URL`); `frontend/middleware.ts` (`APP_HOST`, the `quiz.`/`admin.` redirects and their comment block); `backend/src/app.ts` (`DEFAULT_ALLOWED_ORIGINS`); `APP_URL`/`MARKETING_URL` defaults in `allRoutes.ts` and the `squarespell.com` sender/footers (`EMAIL_FROM`, `results@`, `digest@`, `hello@`, postal address in `services/unsubscribe.ts`, `platformEmails.ts`, `mergeTags.ts`); the `https://squarespell-api.onrender.com` default that appears in ~57 places (frontend fetches, `unsubscribe`, `resultEmail`); `frontend/public/embed/quiz-embed.js` (`BASE_URL`, and every embed snippet already given to customers); `isAllowedRedirectUrl` in `allRoutes.ts` (post-checkout redirects only allow `squarespell.com` hosts); the `robots`/`sitemap`/canonical constants.
* **Cookie domains:** the code sets none itself; Clerk's session cookies live on the app host, so the app host must sit under the registrable domain configured in Clerk (for example `app.squarespellquiz.com`). Do not keep `app.squarespell.com` as the app host if Clerk is configured for `squarespellquiz.com`.
* **CSP:** no application-wide CSP exists; only `/embed/:slug` sets `frame-ancestors *` in `frontend/vercel.json`. If a CSP is added later it must allow Clerk's Frontend API host and `clerk.<domain>`.
* **Middleware matcher:** `frontend/middleware.ts` `config.matcher` and `isProtectedRoute` (`/dashboard`, `/admin`) need no change; verify the redirect rules do not send `squarespellquiz.com` traffic to `app.squarespell.com`.
* **Identity keys to remap** (they store Clerk ids and will not match a new instance): `users.clerk_user_id` (unique), `teams.owner_id`, `team_members.user_id`, `team_members.invited_by` (finding F16), and any text `user_id` written from `req.userId` (`quiz_translations.last_edited_by`).

## 14. User reconciliation plan - 12 Clerk development users vs 9 database users

**Rules:** never delete a Clerk user or a database user; only add or link. Match on `clerk_user_id`, not on e-mail. Reports carry **aggregate counts only** (no names, e-mails or ids).

**Why the gap exists (hypotheses to test, in order):** (1) rows are created lazily by the API on a user's first authenticated request, so someone who signed up but never reached the dashboard has no row; (2) the Clerk `user.created` webhook may not be registered, so nothing else creates rows; (3) code defect D22 - a database error or the parallel first-login race made `attachUser` continue without a row (fixed in this PR); (4) test/abandoned sign-ups.

**Detection (read-only, dry run):**
1. Export the Clerk user list (dashboard export or `GET /v1/users` with the development secret key, run by the owner) to a local file: `clerk_user_id`, created date, primary-address *domain only*, sign-in method.
2. Read `SELECT id, clerk_user_id, plan, created_at FROM users` (no e-mail column).
3. Compute, in a local script: **Clerk-only** = in Clerk, no database row (expected 3); **DB-only** = database row whose `clerk_user_id` is not in Clerk (expected 0; would indicate a deleted Clerk user or a manual row); **matched**; **DB rows with an empty e-mail** (created while Clerk lookup failed); **duplicate e-mails across Clerk ids**.
4. Dry-run report (JSON, counts only):
```json
{"clerk_total":12,"db_total":9,"matched":9,"clerk_only":3,"db_only":0,"db_missing_email":0,"clerk_duplicate_email":0,
 "by_plan":{"free":8,"agency":1},"clerk_only_by_signin_method":{"google":0,"apple":0,"email":0},"clerk_only_created_before_webhook_fix":0}
```
**Clerk-only users:** they own no data (no row, hence no quizzes). Either (a) do nothing - the row is created on their first request in the new instance, or (b) if the pilot wants them to exist first, insert a row with `clerk_user_id` = the *new* production id (never the development id) and plan `free`, or (c) send a re-onboarding invitation from the production Clerk instance. **DB-only users:** keep the row and its data; mark for manual review (they cannot sign in until re-linked).

**Legitimate users are preserved by mapping data through the database user id** (`users.id`, a uuid that every quiz, lead and payment row references), never through the Clerk id. At cut-over only the *link* changes:
* Production Clerk users cannot be imported with their development ids or passwords, and OAuth identities do not transfer. Create each legitimate user in the production instance (dashboard invitation or Backend API `createUser` with a verified e-mail and `external_id` = the existing `users.id`), or let them sign in again with the same verified e-mail; then `UPDATE users SET clerk_user_id = '<new production id>' WHERE id = '<uuid>'` inside a reviewed, reversible script (store the old id in a temporary mapping table; do not overwrite blindly).
* Remap the Clerk-id-keyed text columns listed in 13.2 in the same transaction.
* Matching for the update must be one-to-one on a **verified** e-mail; ambiguous cases (shared address, missing e-mail) are reported and skipped, never guessed.

**Cut-over sequencing:** (1) Phase 1 code deployed and `031` applied; (2) create the production Clerk app on a **staging host** (Phase 3 staging DNS) with the owner-only sign-up rule; (3) run the dry-run and review the counts; (4) rehearse the mapping script against a copy of the database; (5) freeze sign-ups on the development instance (or announce a short window); (6) create/invite users in production Clerk; (7) run the mapping in a transaction, verify counts (`matched` = number of legitimate users, `orphaned rows` = 0); (8) switch keys and hosts (13.2) in one deploy; (9) smoke-test with `scripts/smoke` using a production test account; (10) keep the development instance untouched for rollback until the pilot has run for an agreed period.

## 15. Remaining blockers

1. Production schema state unknown (D02/D27, section 11.1) - blocks any claim that lead capture works in production.
2. Pilot accounts need plans (section 11.2) - all trial-expired owners are locked out by design.
3. Quiz billing cannot be enabled until Phase 2 approves names and prices.
4. Authenticated browser testing remains blocked until a proper staging API exists on Hostinger (Phase 3): the Vercel Preview of this branch calls the production API, which blocks the preview origin by CORS (section 9.1), and the production API still runs the pre-fix backend. API, migration and smoke verification now run in GitHub Actions (section 17); nothing was changed in production CORS or environment variables.
5. Clerk remains a development instance until Phases 2-3 (section 13).
6. Owner decisions listed in sections 8 and 11 (F10, F13, Upstash, Sentry, plan for expired accounts).

## 16. Phase 1 exit status against the master plan ("current system is safe enough to pilot and migrate")

| Exit condition | Status |
|---|---|
| Known P0/P1 defects fixed with tests | **Met in code**: 3 P0 + 24 P1 reproduced and fixed (P2: 5 fixed, 24 recorded). |
| Tenant isolation proven | **Met in hermetic tests** (>80 authenticated routes attacked, 27 tables snapshotted); not verified against production data or RLS. |
| Lead -> result -> dashboard -> analytics loop works | **Met in hermetic tests**; **not verified in production** (schema/plan state unknown). |
| Billing safe to re-enable later | **Met in code**; deliberately not re-enabled. |
| Health checks, structured/safe logging, explicit failure states, repeatable smoke test | **Met** (the smoke test passes in GitHub Actions against a temporary API; it has not yet run against a deployed staging or production environment). |
| Configuration ownership mapped | **Partly met**: names, owners and gaps mapped; `presence in live dashboards` is now filled from the coordinator's read-only inspection of Vercel and Render (section 3.1); GitHub secrets, Stripe, Clerk and Supabase dashboards were not re-inspected. |
| Clerk production path and user reconciliation planned | **Met** (documentation only, by design). |
| Production verified | **Not met** - requires the owner actions in section 11. |

**Overall: NOT YET MET (conditional).** Gates that remain, exactly:
1. **Migration `031` applied through a controlled step** (read-only diff against the live schema, rehearsal on a copy, then the owner applies it) - production lead capture cannot be trusted before this.
2. **Deploy of the reviewed backend by the owner** - production still runs `c67fb6d`, whose backend equals `main`'s and therefore contains every defect in section 6.
3. **Hostinger staging for browser-to-API verification** - the API, migration and smoke checks now pass in GitHub Actions (section 17), but authenticated browser testing and a smoke run against a deployed environment need the Phase 3 staging API; the Vercel Preview cannot reach a permissive API (CORS, production Clerk keys). No Render service is added for this.
4. **Monitoring/uptime** - an uptime check on `/api/health/ready`, error tracking (no Sentry variable exists) and an always-on instance or external scheduler (no Render crons exist; the Free instance sleeps).
5. **Clerk production path** - a dedicated production Clerk application and the user reconciliation (sections 13-14); Preview currently shares the development-instance keys.
Also required before a pilot: plans for trial-expired owners (section 11.2) and `RESEND_WEBHOOK_SECRET`. Do not pilot or migrate until these gates are closed.


## 17. Cloud verification in GitHub Actions (no Mac, no sub-agents, nothing deployed)

Workflow: `.github/workflows/p1-verify.yml` (triggers: pull request to `main` and manual dispatch; `permissions: contents: read`; fake credentials generated at run time; no repository secrets, no scheduled jobs, no calls to production services, no deployment). Runs on GitHub-hosted Ubuntu runners.

- **Run analysed:** https://github.com/Squarespell/squarespell/actions/runs/35461291007 - **tested commit `66093ff39f8d8aa48055932fa487f7a762423d09`** - all four jobs succeeded. Later commits on this branch change only this Markdown file and re-run the same workflow.
- **First run (35460957468, commit `f105f9c`):** the database/migration/API job passed; the backend and frontend jobs failed for CI-environment reasons, not product defects: (a) the repository's configuration-drift guard flagged `RUNNER_TEMP` read by an inline Node script in the workflow (fixed by passing the path as an argument, guard untouched); (b) frontend tests could not start workers on Node 20 (`webidl.util.markAsUncloneable is not a function`, jsdom's bundled undici), fixed by running the frontend job on Node 22. No test was skipped, weakened or changed.

| Check (GitHub Actions) | Result |
|---|---|
| Backend tests (vitest) | **19 files, 254 tests passed** |
| Backend type-check (`tsc --noEmit`) and production build (`npm run build`) | **passed** |
| Frontend tests (vitest, Node 22) | **2 files, 9 tests passed** |
| Frontend type-check and production build (`next build`) | **passed** (compiled successfully, 50 static pages) |
| Temporary PostgreSQL 16 service: complete chain from an empty database (`SUPABASE_SCHEMA.sql`, migrations 002-031, `20260415_email_automation.sql`, applied with `ON_ERROR_STOP`) | **passed** - 49 tables, 33 policy lines; `stripe_webhook_events` exists; lead function has 11 arguments |
| Migration 031 forward-only guard (no DELETE, UPDATE, TRUNCATE, DROP TABLE, DROP COLUMN, RENAME or type change; only three allow-listed DROPs) | **passed** |
| Migration 031 upgrade path (chain to 030, then 031) | **passed** - removes or changes exactly three allow-listed objects, adds 41 inventory lines, second run is a no-op, table row counts and a seeded row unchanged, final inventory **identical** to the fresh chain |
| Original migration 016 on an empty database | **fails as required for the proof:** `ERROR: operator does not exist: text = uuid` (line 251 of the original file); migrations 017-031 are never reached |
| API start (production mode, fake credentials) on the temporary database via PostgREST v12.2.3 behind a Supabase-style path proxy | **passed** - `GET /api/health` returns `{"ok":true}`, `GET /api/health/ready` returns `{"ok":true,"checks":{"database":"up"}}` |
| API smoke test (`scripts/smoke/smoke.mjs` against that temporary API) | **13/13 steps passed:** health, readiness, auth (plan pro), create, save/reopen, publish, hosted link, embed runtime (CORS preflight), analytics events, lead submit, lead visible to owner, analytics reflect the run, cleanup |
| Informational (not a gate): database built with the original 016 (errors tolerated) then completed | differs from the fresh chain only by the five repository A/B policies that the original 016 cannot create |

**Limits of this evidence.** PostgREST stands in for Supabase (no Supabase Auth, Storage or RLS exercised with real roles); Clerk tokens are verified by the real verifier with a local key; Resend, Anthropic and Stripe endpoints point at closed local ports, so email delivery, AI generation and Stripe checkout are not exercised; the browser UI is not exercised; production data was not touched.

**Checks that still require Hostinger staging (Phase 3):** authenticated browser flows (Clerk sign-up, sign-in, sign-out, session expiry, dashboard, editor, publish, hosted link and embed on a real page) against a staging frontend and API with a staging Clerk application; Stripe test-mode checkout and webhook delivery to a real endpoint; real email delivery and bounce webhook; real AI generation, timeouts and cost caps; CORS, cookie and CSP behaviour on the final domains; the worker/scheduler jobs in section 19; backups, restore and uptime monitoring; a migration rehearsal on a copy of production data; Supabase-specific behaviour if Supabase stays until cutover.

**Ready for owner review:** yes - draft PR #63 has passing cloud CI and complete documentation. It is **not** ready to merge or deploy: the gates in section 16 remain open.

## 18. Migration 016 and 031 review

1. **Why 016 was modified.** In the original `016_enable_rls.sql` the A/B-test policies compare `ab_tests.user_id`, which migration 015 defines as TEXT, with `auth.uid()`, which is uuid. PostgreSQL rejects that comparison. The Phase 1 change adds `::text` to those five policy expressions (four on `ab_tests`, one sub-query in `ab_test_assignments`) and a comment; nothing else changed.
2. **Does an untouched 016 stop a fresh database?** Yes, proven in CI: with the original file the chain stops at 016 with `operator does not exist: text = uuid` and 017-031 are never applied. A runner that ignored errors would silently omit those five policies (the informational CI step shows exactly that).
3. **Is 031 the complete forward-only change for production?** A read-only catalog query on production (policy names, column types, function signatures, no row data) shows: `ab_tests.user_id` is already text, and production already has all six A/B policies with the same `(auth.uid())::text` expressions under different, hand-made names (for example "Users can view their AB tests"), so **no policy change is needed in production**. Production lacks exactly what 031 adds: table `stripe_webhook_events`, `users.first_name`, `leads.qualified`, `leads.path_taken`, `leads.calculated_price`, the 11-argument `insert_lead_with_limit_check` (production has the 10-argument version), the widened queue status check (production allows only pending, sent, failed) and a nullable `email_sequences.outcome_id` (production is NOT NULL). `preview_drafts` already exists. Statements are no-ops where an object exists. 031 does not, and should not, touch the A/B policies. Only the objects 031 touches and the A/B policies were compared, so other drift cannot be excluded: rehearse on a copy first.
4. **Same schema and policies on fresh and existing installations?** For every object the application uses, yes: CI shows chain-to-030 plus 031 equals the fresh full chain. Policy **names** differ: fresh databases get the repository-named A/B policies from the corrected 016; production has equivalent hand-made ones (same expressions). The difference is naming only. **Never re-run the corrected 016 on production** (it would add duplicate policies); apply only 031.
5. **Could 031 remove or change production data?** No, by analysis and by test. There is no DELETE, UPDATE, TRUNCATE, DROP TABLE, DROP COLUMN, RENAME or type change (CI guard). The three DROPs are: the queue status check, replaced by a wider one (existing rows already satisfy it because the old allowed set is a subset); the old lead function, replaced (no data); and a NOT NULL constraint, loosened. New columns receive constant defaults on new columns only. CI proved unchanged row counts and an unchanged seeded row. **Behaviour changes (not data changes):** the lead limit becomes a monthly allowance instead of lifetime, and a repeated submission for the same quiz and email returns the existing lead. Apply in a quiet window (brief locks on the queue table and the function).

**Decision on 016:** keep the correction. Immutable history was preferred, but the original provably prevents a fresh database (staging, the Phase 3 Hostinger PostgreSQL) from completing, and production already matches the corrected expressions. The correction is proven by the full chain in CI. **Migration 031 was not applied to Supabase or any database.**

## 19. Render cron findings (nothing created or activated)

`render.yaml` declares one web service and **five cron services that run six scheduled jobs**; **none exists in the live Render account**. The application also has four cron endpoints that no scheduler triggers at all. All required jobs will later run on the Hostinger worker/scheduler; no Render cron, service or setting was created or changed.

| Job | Schedule | Endpoint | What it does | Classification |
|---|---|---|---|---|
| `squarespell-scheduled-sends` | every 5 min | `/api/cron/process-scheduled-sends` | sends scheduled email campaigns | **Required before a paid pilot** |
| `squarespell-lifecycle-emails` (1 of 2) | daily 09:00 UTC | `/api/cron/trial-reminders` | trial-ending reminders | **Required before a paid pilot** (conversion path) |
| `squarespell-lifecycle-emails` (2 of 2) | daily 09:00 UTC | `/api/cron/lead-milestones` | owner milestone notifications | Useful but deferrable |
| `squarespell-weekly-digest` | Mondays 10:00 UTC | `/api/cron/weekly-digest` | weekly owner digest (the in-process trigger never matched a route) | Useful but deferrable |
| `squarespell-monthly-report` | 1st of month 10:00 UTC | `/api/cron/monthly-report` | monthly owner report | Useful but deferrable |
| `squarespell-keep-alive` | every 10 min | `/health` ping | stops the Free instance sleeping | **Obsolete or replaced** (GitHub Actions keep-alive and the in-process ping exist; always-on Hostinger removes the need) |
| no scheduler | - | `/api/cron/process-email-queue` | drains follow-up email sequences | **Required before a paid pilot** (PR #63 adds an in-process drain that only runs while the instance is awake; the worker must own it) |
| no scheduler | - | `/api/cron/cleanup-gdpr-tokens`, `cleanup-integration-errors`, `cleanup-preview-cache` | prune expired rows | Useful but deferrable (retention hygiene) |

**Do the missing jobs cause harm today?** *Data loss:* no - the jobs only send email or prune expired rows; queues persist. *Billing errors:* no - plan limits and the 14-day trial are enforced in code at request time, and no billing job exists among them. *Security:* no direct exposure from their absence; expired GDPR tokens and old integration errors simply stay longer than intended. Separately, in today's production backend `POST /api/cron/process-email-queue` has no secret check (fixed in PR #63). *Customer-facing:* today production has 0 leads and no paying customers, so nothing visibly fails yet; scheduled campaigns, trial reminders and follow-up sequences would silently not send once real customers exist. **They are not activated.**

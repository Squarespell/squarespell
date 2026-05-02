---
name: squarespell
description: "Squarespell/QuizFlow project context — AI quiz funnel SaaS for Squarespace users. Use this skill whenever working on any part of the Squarespell codebase: frontend (Next.js), backend (Express.js), database (Supabase), auth (Clerk), payments (Stripe), emails (Resend), AI generation (Claude API), quiz embed, marketing site, analytics, integrations, or any bug fix, feature, deployment, or config change. Also trigger when the user mentions squarespell, quizflow, quiz funnel, squarespace quiz, or any of the service accounts (Vercel, Render, Supabase, Clerk, Stripe, Resend). This skill contains the complete project architecture, file map, API endpoints, database schema, design system, and deployment info — always read it first before making any changes."
---

# Squarespell / QuizFlow — Complete Project Context

## What It Is
A SaaS app that builds AI-powered quiz funnels for Squarespace users. Users paste their Squarespace URL, AI generates a branded quiz in 30 seconds, they embed it on their site and capture leads.

## URLs
- App: https://app.squarespell.com
- Backend API: https://squarespell-backend.onrender.com
- Marketing site: https://squarespell.com
- Clerk dev instance: `flying-midge-60.clerk.accounts.dev`

## Tech Stack
| Layer | Tech | Deployed On |
|-------|------|-------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript | Vercel |
| Backend | Express.js, TypeScript | Render |
| Database | PostgreSQL via Supabase | Supabase |
| Auth | Clerk (dev keys, `pk_test_`) | Clerk |
| Payments | Stripe (3 tiers, monthly + yearly) | Stripe |
| Email | Resend (`onboarding@resend.dev`) | Resend |
| AI | Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) | Anthropic API |

## Service Accounts (all info@squarespell.com)
Vercel, Render, Supabase, Clerk, Stripe, Resend, Anthropic, GitHub (Squarespell org), Google Cloud (project: loyal-curve-489603-a8)

## Design System
- Font: DM Sans (weights 300-800)
- Mono: DM Mono
- Background: `#07090c`
- Background 2: `#0d1018`
- Background 3: `#131720`
- Accent: `#D2FF1D`
- Text primary: `#f0f2f5`
- Text secondary: `rgba(240,242,245,0.68)`
- Text muted: `rgba(240,242,245,0.42)`
- Text dim: `rgba(240,242,245,0.22)`
- Border: `rgba(255,255,255,0.09)`
- Glass bg: `rgba(255,255,255,0.055)`
- Green: `#4ade80`, Red: `#f87171`, Yellow: `#fbbf24`, Blue: `#60a5fa`
- Sidebar: 210px, Topbar: 56px, Content max-width: 900px

## File Structure

```
squarespell2/
├── frontend/                           # Next.js app (Vercel)
│   ├── app/
│   │   ├── page.tsx                    # Marketing landing page (redirects signed-in users to /dashboard)
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css                 # Global styles
│   │   ├── dashboard/page.tsx          # Dashboard wrapper (iframe + trial wall)
│   │   ├── sign-in/page.tsx            # Custom Clerk sign-in (email + Google + Apple)
│   │   ├── sign-up/page.tsx            # Custom Clerk sign-up (email + Google + Apple)
│   │   ├── pricing/page.tsx            # Standalone pricing page
│   │   ├── try/page.tsx                # /try landing — quiz preview without signup
│   │   ├── quiz/[slug]/page.tsx        # Quiz runner (public, embeddable)
│   │   ├── oauth-popup/page.tsx        # Google OAuth popup
│   │   ├── sso-callback/page.tsx       # Clerk SSO callback (with 10s timeout fallback)
│   │   └── sso-popup-done/page.tsx     # Closes OAuth popup
│   ├── public/
│   │   ├── squarespell-app.html        # MAIN DASHBOARD SPA (~1800 lines, all dashboard pages)
│   │   └── embed/
│   │       └── quiz-embed.js           # Embed script for Squarespace sites (28 lines)
│   ├── lib/api.ts                      # API helper methods
│   ├── middleware.ts                   # Clerk auth middleware (protects /dashboard)
│   └── tsconfig.json                   # strict:false, noImplicitAny:false
│
├── backend/
│   ├── src/
│   │   ├── index.ts                    # Express server entry point
│   │   ├── routes/
│   │   │   ├── allRoutes.ts            # ALL main routes (generate, leads, analytics, stripe, user, cron, integrations)
│   │   │   ├── quiz.ts                 # Quiz CRUD (authenticated)
│   │   │   ├── clerkWebhook.ts         # Clerk webhook (auto-creates DB user on signup)
│   │   │   └── squarespace.ts          # Squarespace OAuth flow
│   │   ├── middleware/
│   │   │   ├── auth.ts                 # Clerk token verification + attachUser
│   │   │   └── planGuard.ts            # Plan limit enforcement
│   │   ├── services/
│   │   │   ├── claudeService.ts        # AI quiz generation via Claude Haiku
│   │   │   └── brandScraper.ts         # Website brand detection (colors, fonts)
│   │   └── db/
│   │       └── supabaseClient.ts       # Supabase client init
│   └── migrations/
│       └── 002_integrations_and_indices.sql  # Integrations table + indices
│
└── DESIGN_SYSTEM.md
```

## Database Schema (Supabase PostgreSQL)

### users
`id` UUID PK, `clerk_user_id` TEXT unique, `email`, `plan` (free|trial|core|pro|business + legacy: starter|growth|agency), `stripe_customer_id`, `stripe_subscription_id`, `plan_expires_at`, `quiz_count`, `squarespace_token`, `squarespace_site_url`, `onboarding_completed` BOOL, `notification_digest` BOOL, `trial_extended` BOOL, `created_at`

### quizzes
`id` UUID PK, `user_id` FK→users, `title`, `status` (draft|live|archived), `slug` unique, `questions` JSONB, `outcomes` JSONB, `branding` JSONB, `settings` JSONB, `lead_count`, `view_count`, `embed_format`, `email_gate_position`, `badge_hidden` BOOL, `created_at`, `updated_at`

### leads
`id` UUID PK, `quiz_id` FK→quizzes, `user_id` FK→users, `name`, `email`, `answers` JSONB, `outcome_id`, `score` INT, `source_url`, `created_at`

### analytics_events
`id` UUID PK, `quiz_id` FK→quizzes, `event_type` (view|complete|start|question_N_view|question_N_answer), `session_id`, `metadata` JSONB, `created_at`

### integrations
`id` UUID PK, `user_id` FK→users, `type` (webhook|mailchimp|klaviyo|google_sheets), `config` JSONB, `active` BOOL, `created_at`

### email_logs
`id` UUID PK, `user_id` FK→users, `type` (weekly_digest|trial_day1|trial_day5|trial_day7|lead_notification), `metadata` JSONB, `sent_at`

### RPC Functions
`increment_quiz_count(uid)`, `increment_view_count(qid)`, `increment_lead_count(qid)`

## API Endpoints

### Quiz Management (authenticated, /api/quizzes)
- `GET /` — List user's quizzes
- `POST /` — Create quiz (guarded by planGuard)
- `GET /:id` — Get quiz details
- `PATCH /:id` — Update quiz (title, questions, outcomes, branding, settings)
- `POST /:id/publish` — Publish quiz (status → live)
- `DELETE /:id` — Archive quiz
- `GET /:id/leads` — Get quiz leads (limit 500)
- `GET /:id/leads/export` — CSV export

### AI Generation (authenticated)
- `POST /api/generate` — Generate quiz from URL + business_type + goal

### Public Quiz (no auth, /api/quiz)
- `GET /:slug` — Fetch published quiz data
- `POST /:slug/event` — Track analytics event (view, complete, start)
- `POST /:slug/lead` — Submit lead (also fires webhook integrations + email notification)
- `POST /:slug/process-other` — AI process free-text answer

### Analytics (authenticated, /api/analytics)
- `GET /:quizId` — Basic stats (views, completions, leads, rates)
- `GET /:quizId/timeseries?period=7d|30d|90d|all` — Time-series data
- `GET /:quizId/funnel` — Funnel (viewed → started → completed → lead)
- `GET /:quizId/dropoff` — Drop-off by question
- `GET /:quizId/results` — Outcome distribution

### Integrations (authenticated, /api/integrations)
- `GET /` — List integrations
- `POST /` — Add integration (type + config)
- `PATCH /:id` — Update integration
- `DELETE /:id` — Remove integration
- `POST /test/:id` — Test webhook

### User & Plan (/api/user)
- `GET /plan` — Current plan, limits, trial info, email
- `POST /notifications` — Toggle email notifications

### Stripe (/api/stripe)
- `POST /create-checkout` — Create Stripe checkout session
- `POST /webhook` — Stripe webhook (checkout.completed, subscription.deleted)
- `GET /portal` — Redirect to Stripe billing portal

### Cron (/api/cron, requires x-cron-secret header)
- `POST /weekly-digest` — Send weekly performance digest emails
- `POST /trial-reminders` — Send trial day 1/5/7 reminder emails

### Other
- `POST /api/scrape-brand` — Extract brand colors/fonts from URL
- `POST /api/clerk/webhook` — Clerk user creation webhook
- `GET/POST /auth/squarespace/*` — Squarespace OAuth flow

## Pricing Plans
| Plan | Monthly | Annual | Quizzes | Leads | Emails |
|------|---------|--------|---------|-------|--------|
| Trial | Free (14 days) | — | Unlimited | 3,000 | 3,000 |
| Core | $12/mo | $9/mo | 5 | 1,000 | 1,000 |
| Pro | $19/mo | $16/mo | Unlimited | 3,000 | 3,000 |
| Business | $35/mo | $29/mo | Unlimited | Unlimited | Unlimited |

## Dashboard Pages (inside squarespell-app.html)
The dashboard is a single HTML file loaded via iframe. Navigation via `gD('pagename')` function.

| Page ID | Purpose |
|---------|---------|
| `dashboard` | Home — stats, recent leads, quickstart |
| `editor` | Quiz builder — URL input, AI generate, edit questions/outcomes |
| `leads` | Lead management table — search, filter, CSV export |
| `analytics` | Performance metrics — views, completions, conversion |
| `pricing` | Upgrade CTA with plan comparison |
| `account` | User settings, notifications, plan info, Squarespace connection |
| `templates` | Quiz templates (placeholder, not fully built) |
| `embed` | Embed code display |

## Quiz Runner Flow (quiz/[slug]/page.tsx)
1. Load quiz data from `GET /api/quiz/:slug`
2. Track view event via `POST /api/quiz/:slug/event`
3. Show questions with A-D keyboard shortcuts + progress bar
4. After all questions → lead gate (name + email form)
5. Submit lead to `POST /api/quiz/:slug/lead`
6. Track completion event + notify parent iframe via postMessage
7. Show result with AI recommendation, lead score, CTA button

## Embed Script (quiz-embed.js)
- Detects host site brand colors/fonts automatically
- Creates responsive iframe embed (max-width 640px)
- Handles postMessage resizing
- Fires `squarespell:complete` custom event + GA dataLayer push
- Fallback link if iframe fails

## Known Issues / Incomplete
- Google OAuth may spin on new devices (SSO callback now has 10s fallback)
- Clerk still on dev keys (`pk_test_`)
- Templates page is placeholder (no backend data)
- Lead scoring shows random 78-98 (not calculated from answers)
- Squarespace OAuth token saved but not used for anything
- No A/B testing (listed in Pro pricing)
- No white-label mode (listed in Business pricing)
- No team seats (listed in Business pricing)
- RLS disabled in Supabase
- No rate limiting on public endpoints

## Environment Variables

### Frontend (Vercel)
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_URL`

### Backend (Render)
`CLERK_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_AGENCY_PRICE_ID`, `STRIPE_STARTER_YEARLY_PRICE_ID`, `STRIPE_PRO_YEARLY_PRICE_ID`, `STRIPE_AGENCY_YEARLY_PRICE_ID`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `FRONTEND_URL`, `CRON_SECRET`

## Key Patterns to Follow
- All styles are inline (no CSS libraries), matching the design system above
- TypeScript is lenient (strict:false, noImplicitAny:false)
- Backend uses Supabase client directly (no ORM)
- Auth flow: Clerk token → backend verifies via `requireAuth` middleware → `attachUser` sets `req.dbUserId`
- Plan enforcement: `planGuard.ts` middleware checks quiz/lead limits
- The dashboard HTML communicates with the iframe parent for trial wall display
- Quiz generation uses Claude Haiku for speed
- All emails sent via Resend from `Squarespell <onboarding@resend.dev>`

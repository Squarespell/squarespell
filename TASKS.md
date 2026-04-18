# Squarespell task backlog

Durable task list. Edit freely. Order within a priority band is rough.

## In flight

(none)

## Recently completed

- [x] End-to-end smoke test after deploy (login, paste URL, pick goal, generate, land in builder)
- [x] Verify POST /api/quizzes/from-url works from app.squarespell.com

## P0 (do next)

- [x] Unsubscribe link + public endpoint + branded preference page
- [x] CAN-SPAM footer with business address
- [x] Onboarding checklist widget with % complete
- [x] Merge tags: {{outcome_name}}, {{answer:slug}}, {{quiz_name}}
- [x] Persistent top banner slot (trial, billing, announcements)

## P1

- [x] Resend webhook handler (delivered/opened/clicked/bounced/complained)
- [x] email_events table + indexes
- [x] Scrape Squarespace fonts + palette for BrandKit autofill
- [x] PLG guest-session to draft-claim E2E
- [x] GDPR consent gating on quiz + email
- [x] Send test email to self
- [x] Schedule picker UI
- [x] Render cron dispatcher for scheduled sends

## P2

- [x] WCAG 2.1 AA audit on dashboard and public quiz flow
- [x] Deliverability dashboard (bounce rate, spam complaint rate)
- [x] Bounce classification pipeline (hard/soft)
- [x] Suppression list (global)
- [x] Resend batch send integration (up to 100 emails per API call)
- [ ] DKIM/SPF on Resend shared domain
- [x] Brand kit shared across quiz + email + popup
- [x] Brand-import-from-URL scraper (logo, palette, fonts, tone)
- [x] AI body generator (personalize around respondent answers)
- [x] AI subject generator (quiz outcome + answers context)
- [x] Post-quiz automation (one-node MVP, keyed to outcome)

## P3

- [x] Visual editor canvas (drag-drop blocks)
- [x] Inspector panel (right sidebar, edit block props)
- [x] Live preview iframe that updates on edit
- [x] Mobile / desktop preview toggle
- [x] Dark-mode email-client preview
- [x] Global search (cmd+k) across quizzes, campaigns, contacts
- [x] Outcomes routing visualization in builder
- [x] Trash + restore for campaigns and quizzes
- [x] Bot filtering toggle
- [x] Segments = quiz answers audience builder
- [x] Add Templates sidebar nav entry under Emails
- [x] Wire template gallery into New Campaign wizard
- [x] Template gallery for 7 Squarespace site types

## P4

- [x] Per-quiz funnel chart (views -> completes -> outcomes -> email CTR)
- [x] Per-campaign report tied to originating quiz
- [x] Conversion funnel report (quiz view -> complete -> email CTR)
- [x] Date-range + comparison picker
- [x] Analytics v2 (funnel drop-off, question heatmap)
- [x] A/B testing framework for quizzes
- [x] Attribution pipeline (quiz -> outcome -> email -> order)
- [x] Attribution dashboard ($ per quiz / outcome / campaign)
- [x] ROI attribution reporting

## P5 (Squarespace Commerce)

- [ ] Pull product catalog from Squarespace Commerce
- [ ] Squarespace Commerce order webhook intake
- [ ] Generate discount codes for Squarespace Commerce
- [ ] Sync quiz subscribers into Squarespace Newsletter Block
- [x] Use Squarespace Scheduling link as booking-outcome CTA
- [ ] Detect Squarespace template family (7.0 vs 7.1)
- [x] Light / dark BrandKit variants

## P6 (Observability)

- [x] Sentry error alerting
- [x] Structured logging across API + workers

## Done log (recent)

- [x] Standardize empty states across dashboard pages
- [x] Global toast notification system (useToast hook + ToastProvider)
- [x] UTM auto-tagging on all outbound CTA links
- [x] Em-dash sweep repo-wide
- [x] OG / Twitter meta tags for public quiz pages
- [x] Deep embed-install guide (Code Block vs Code Injection)
- [x] Auto-detect Squarespace site on URL paste
- [x] Embed mode picker (inline/popup/tab)
- [x] One-click copy embed snippet with site ID pre-filled
- [x] Style packs v1 (preset brand themes for generated quizzes)
- [x] Auto-suggest quiz ideas in the modal based on scraped site
- [x] Duplicate / remix quiz from dashboard grid
- [x] Two-stage flow: URL paste, real scrape, editable brand fields, goal picker, generate
- [x] Embed iframe loading skeleton
- [x] Remove-branding toggle (paid plan gate)
- [x] Zapier integration + API keys management page
- [x] Settings page with email notification toggle
- [x] Claim flow fix (preserve preview on failed claim, retry banner)
- [x] Clean up dirty working tree
- [x] Skeleton loaders on every async surface
- [x] Premium duotone goal-card icons
- [x] Vercel build hotfix (PR #21)
- [x] Wire + New quiz buttons to modal (merged)
- [x] Redesign NewQuizModal with SVG icons + goal picker
- [x] Fix API fallback URL squarespell-backend to squarespell-api
- [x] Codify no-emoji / no-em-dash rules in CLAUDE.md

## Project rules (non-negotiable, also in CLAUDE.md)

- No emoji icons. Ever. All icons must be inline SVG.
- No em-dashes. Use colon, period, comma, or " - " (ASCII hyphen).
- Apply both rules to new code and any file you modify.

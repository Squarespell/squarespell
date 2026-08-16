# Squarespell Site Auditor

A free, automated audit for Squarespace websites. A visitor enters a URL; the
system crawls the site, runs ~100 deterministic checks, scores it, explains the
findings in plain English, and offers a natural route to talk to Squarespell.

Nothing is pasted into Squarespace. Nothing is gated behind a form.

---

## How it works

```
URL → validate & SSRF-guard → fetch homepage → detect Squarespace (+ version)
    → robots.txt & sitemap.xml → crawl (≤12 pages, concurrency 4)
    → extract structured facts per page → asset & AI-crawler probes
    → ~100 deterministic checks → weighted score
    → AI narrative over the measured findings → persist → report
```

**The deterministic engine is the source of truth.** Every number, count and
piece of evidence in a report comes from bytes we actually received. The AI
layer is given only those structured findings — it never sees the website — so
it cannot invent an issue. If the AI is unavailable for any reason, the report
still renders in full with explanations generated directly from the findings.

---

## Layout

```
src/lib/audit/
  safeFetch.ts      SSRF-hardened HTTP client (DNS pinning, redirect re-validation, byte caps)
  url.ts            URL normalisation and crawl eligibility
  robots.ts         robots.txt parsing + per-user-agent evaluation
  sitemap.ts        sitemap discovery, index recursion
  squarespace.ts    platform detection, 7.0 vs 7.1, editor mix, feature detection
  crawler.ts        bounded BFS crawl + site-level probes
  extract.ts        one page → a structured fact sheet
  scoring.ts        weighted, gated, prevalence-aware scoring
  pipeline.ts       orchestration and budgets
  checks/           tech, onpage, aeo, perf, conv, sqs, misc (schema/social/a11y/mobile/sec)
src/lib/ai/         evidence-grounded narrative generation
src/lib/db.ts       Supabase persistence, rate limiting, lead capture
src/app/            Next.js App Router — UI and API routes
supabase/           schema migration
```

### Adding a check

Write a function returning `CheckResult[]` in the relevant `checks/*.ts`, using
`pass()`, `fail(finding({...}), applicable)` or `na()`. Register it in the
`results` array in `pipeline.ts`. The scorer picks it up automatically.

Three rules that keep the scores honest:

- If a check does not apply to a site, return `na()`. Never award a free pass —
  that is how brochure sites end up scoring 96.
- If the owner cannot fix it on Squarespace, set `platformLocked: true` and
  `unscored: true`. Marking a Squarespace site down for a missing CSP header
  destroys credibility.
- Every finding must carry `evidence` extracted from the response. No evidence,
  no finding.

---

## Scoring

- Severity weights: critical 10, high 6, medium 3, low 1, info 0 (never scored).
- Per-check pass fraction `1 − prevalence^0.5`. The sub-linear exponent means a
  handful of defects still costs a visible slice, instead of vanishing into a
  percentage the way Ahrefs-style health scores do.
- Non-applicable checks are removed from numerator **and** denominator.
- One critical failure caps its category at 55; two cap it at 40.
- Overall is a weighted **harmonic** mean, so one collapsed category cannot be
  averaged away. Any critical failure anywhere caps the overall score at 65.
- Fully deterministic: two runs an hour apart produce the same score.

---

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only. The `auditor` schema denies `anon` entirely. |
| `HASH_SALT` | yes | Salt for hashing requester IPs. Any long random string. |
| `ANTHROPIC_API_KEY` | no | Enables AI narrative. Without it, deterministic explanations are used. |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-sonnet-4-5`. |
| `RATE_LIMIT_BURST` | no | Audits per 2 minutes per requester. Default 3. |
| `RATE_LIMIT_DAILY` | no | Audits per day per requester. Default 15. |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical URL, used in metadata. |
| `NEXT_PUBLIC_BRAND_URL` | no | Links back to squarespell.com. |
| `NEXT_PUBLIC_CALENDLY_URL` | no | Booking link in the report CTA. |
| `NEXT_PUBLIC_SERVICES_URL` | no | Services link in the report CTA. |

The database migration lives in `supabase/migrations/` and has already been
applied to the `squarespell-us` project.

### Running the engine without the web app

```bash
npm run engine -- https://yoursite.com
npm run engine -- https://yoursite.com --json
```

Useful for testing checks and for batch-auditing a prospect list.

---

## Deployment

Vercel, Node runtime, `iad1`. `maxDuration` is set to 60s in both
`vercel.json` and the route, which is the Hobby-plan ceiling; the pipeline
budget is 48s so it finishes comfortably inside that. On Pro you can raise both
to 300 and increase `DEFAULT_CONFIG.maxPages` for deeper crawls.

---

## Security

- **SSRF.** Scheme, port and credential allow-listing; a custom DNS `lookup`
  installed on the socket so every resolved address is validated at connect
  time (this closes the rebinding window a resolve-then-fetch client leaves
  open); every redirect hop re-validated from scratch; RFC1918, loopback,
  link-local, CGNAT, multicast and IPv6 unique-local blocked, which covers the
  AWS/GCP/Azure metadata endpoint at 169.254.169.254 and the Alibaba one at
  100.100.100.200.
- **Resource exhaustion.** Per-response byte cap applied after decompression
  (so a zip bomb cannot exhaust memory), request watchdog, redirect cap, page
  cap, wall-clock deadline, fixed concurrency.
- **Prompt injection.** Crawled page content reaches the model only as short,
  sanitised evidence strings inside `<untrusted_site_content>` tags, with a
  system prompt that treats them as data. Output is validated against the
  finding IDs we sent; anything else is discarded.
- **Data exposure.** Audit and lead tables live in an `auditor` schema with RLS
  on and all privileges revoked from `anon` and `authenticated`. All access goes
  through the service role, server-side only.
- **Abuse.** Two-tier rate limit (burst + daily) keyed on a salted hash of the
  requester. Honeypot field on the lead form. The limiter fails open, since the
  crawler is already tightly bounded.
- **XSS.** Report values are untrusted strings from audited sites. React escapes
  them, and the CSP in `next.config.mjs` means a bypass still could not execute
  script or exfiltrate data.

---

## Data and privacy

Three separate concerns, three separate tables:

- `auditor.audits` — technical record. No personal data; the requester appears
  only as a salted hash.
- `auditor.leads` — personal data, and only what a visitor volunteered. Can be
  exported or deleted without touching audit history.
- `auditor.events` — first-party product analytics. No cross-site identifiers.

`/privacy` documents this in plain English, including how to request deletion.

---

## Built to extend

The foundation for paid features is in place; none of it is built yet, by
design.

- **Deeper audits** — `AuditConfig` already parameterises page count,
  concurrency, timeouts and probe budgets. A paid tier is a different config.
- **Historical tracking and monitoring** — every audit is already a row with a
  score, category scores and a full report. Trend queries need no schema change.
- **Competitor audits** — the pipeline takes a URL and returns a report. Run it
  N times and diff.
- **PDF and white-label reports** — the report is a pure function of the stored
  JSON, so server-side rendering to PDF is additive.
- **Client dashboards and agency accounts** — audits already carry a requester
  hash; adding a nullable `user_id` and RLS policies is the whole migration.
- **Paid plans** — rate limits are already centralised in `checkRateLimit`,
  which is where a plan lookup belongs.

## What the audit produces

Every finding carries five parts, all generated deterministically from the
crawl: the problem, the evidence extracted from the site, why it matters, what
to change, and what changes when you do. The AI layer rewrites the last three
when a key is present; without one the report reads identically well, which is
the point of keeping the deterministic engine as the source of truth.

Three analyses sit on top of the checks:

- **The verdict.** A sentence about the site as a whole, assembled from the
  scored result rather than from the top finding, plus the three highest-value
  moves in order.
- **Question coverage.** The questions a customer would ask, built from the
  services the site itself names, matched against every page with BM25 and an
  answer-signal test. A cost question needs a price on the page, a timing
  question needs a duration. "You have a page about this that never gives the
  answer" is reported separately from "nothing addresses this", because the
  first is the reason an AI assistant cites a competitor instead.
- **Real speed.** Core Web Vitals from the Chrome UX Report and a Lighthouse
  run, fetched from Google after the report renders. Needs `PAGESPEED_API_KEY`
  to be reliable; without one the shared anonymous quota is usually exhausted
  and the section says so rather than inventing numbers.

## Competitor benchmarking

`/api/compare` runs the same engine against up to three named competitors and
lines the scores up. Three rules keep it honest: Squarespace-specific checks are
excluded so a competitor on another platform is judged only on what compares
fairly, the score is rebuilt from the comparable categories on both sides rather
than reusing the headline number, and a site we could not read is reported as
unread rather than as a zero. Competitor crawls are six pages against your
twelve, which is enough for a fair score and not enough to be a report about
them.

## Tests

```
npm run test        # offline: check behaviour and PSI parsing
npm run typecheck
npx tsx scripts/calibrate-pdf.ts /tmp/a.json /tmp/b.json   # PDF pagination
```

`scripts/selftest.ts` exists for one reason: twice, a change that looked correct
produced a confident false positive on a real business site. Every case in it is
a page of HTML run through the real extractor and the real checks, so that class
of bug fails there rather than in front of a customer.

## The PDF

`/api/report-pdf?token=…` renders the report as a designed A4 document with
@react-pdf/renderer, no headless browser involved. Pagination is done by hand
(see the note in `src/lib/pdf/document.tsx`): the layout engine miscalculates
offsets on tall documents and dies with a nonsense coordinate, so the document
decides its own page breaks and marks every block as non-splitting. If you
change any type size or spacing in that file, re-run the calibration script.

With `RESEND_API_KEY` and `EMAIL_FROM` set, asking for the report by email
attaches the same PDF. Without them the lead is still captured and the UI offers
the download instead of claiming an email was sent.

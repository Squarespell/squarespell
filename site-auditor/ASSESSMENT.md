# Squarespace Website Auditor — assessment and rebuild

Prepared for Squarespell · 9 August 2026

---

## 1. What currently exists

The "Squarespace Website Auditor" was not an application. It was three
disconnected pieces:

| Piece | Where it lives | What it does |
|---|---|---|
| Front end | A single ~1,900-line HTML/CSS/JS block pasted into a Squarespace page via Code Injection | Renders the whole UI: entry screen, fake progress bar, dashboard, 12 nav panels, upgrade modals |
| "Backend" | Cloudflare Worker at `squarespell-auditor.proud-breeze-e91f.workers.dev` | A thin proxy that forwards an arbitrary prompt to the Anthropic API |
| Lead capture | A Google Apps Script endpoint | Appends emails to a sheet, fired with `mode: 'no-cors'` |

There is no crawler, no database, no server, no repository. Nothing in the
`squarespell` monorepo (Next.js on Vercel + Express on Render + Supabase +
Clerk + Stripe) is connected to it. `~/squarespace-tool` and
`~/squarespace-extension` are unrelated forum-scraping utilities.

## 2. What is broken

**The audit never looked at the website.** This is the whole problem. The
worker was sent the *URL as a string* and asked to produce findings. The model
never fetched the page. Every issue, every score, every "Location: Pages →
Homepage → Hero Section" was invented from the domain name.

**The Anthropic key has no credit.** I called the worker directly:

```
{"error":"API error: 400","detail":"... Your credit balance is too low
 to access the Anthropic API ..."}
```

So even the invented findings were not being produced. Every audit was falling
through to `getFallbackResult()` — a hard-coded object with ten fixed issues,
a fixed score of 47, "$1,800" of lost revenue and a fixed conversion rate of
0.8%. **Every visitor since that key ran dry has been shown the same ten
fabricated problems about their own website.**

**Fabricated revenue figures.** `revenueImpact: "~$600/mo"` and
`monthlyRevenueLost: "$1,800"` are stated as measurements. There is no traffic
data, no conversion data and no order-value data anywhere in the system. These
numbers cannot be derived from anything.

**The Worker is an open API-key relay.** It accepts any `messages` array from
any origin and forwards it to your Anthropic account. Anyone who found the URL
could spend your credit on anything. The `Access-Control-Allow-Origin` header
does not prevent this — CORS restricts browsers, not `curl`.

**JSON recovery by brace-counting.** When the model's response was truncated,
the code appended `}` and `]` until it parsed, then presented whatever came out
as an audit.

**Duplicate initialisation.** Two IIFEs run at the bottom of the script, and
`reaudit()` is declared twice — the second silently overwrites the first.

**Fake progress.** The loading bar advances on `Math.random()` and the six
"analysis steps" are `setTimeout` calls. Nothing was happening behind them.

**Client-side limits.** `localStorage.getItem('sq3_...')` gates the daily
audit count. Clearing site data resets it; so does a private window.

**The paid features do not exist.** The pricing modal offers four tiers; every
"Buy" button opens `squarespell.com/upgrade`. Unlocking is
`isUnlocked = true` in the browser, so the "$19 report" is bypassed by typing
any email — or by editing one variable in the console.

**Panels with no data behind them.** Local SEO is a static 12-item checklist
identical for every site. Social, Content, Trust and the category health checks
derive their tick marks from the *score itself* (`ok: score > 55`), so they are
circular: they report what the score already said, dressed as measurements.

## 3. What can be reused

Honestly: the visual direction and nothing else.

The dark UI with the lime accent, the score dial, the severity chips and the
category tiles are a good look for this product, and I have carried that
language across. The information architecture is also broadly right — score,
categories, prioritised findings, quick wins, CTA.

Two pieces of *product thinking* were worth keeping and I kept both: the
per-issue Squarespace fix path (this is the tool's real differentiator), and
tying findings to a next step with Squarespell.

The Supabase project, Vercel account and Anthropic account are all reused.

## 4. What should be removed

- The Cloudflare Worker — delete it. It is an unauthenticated relay on your API
  key and nothing in the new system calls it.
- `getFallbackResult()` and every hard-coded finding.
- All revenue and conversion-rate estimates.
- The four-tier pricing modal, the `isUnlocked` gate, the "$19 report" and the
  five-issue paywall.
- The static Local SEO checklist and the score-derived "health check" ticks.
- `localStorage` rate limiting.
- The competitor panel (it asked the model to score sites it had never seen).
- The plugin cross-sell blocks embedded in findings.
- The Google Apps Script lead path.

## 5. What should be rebuilt

Everything else, which is what I have done. The core change is that the
system now actually fetches and analyses the website, and the AI is demoted
from *source of findings* to *writer of explanations*.

## 6. The architecture

```
Next.js 15 (App Router, TypeScript) on Vercel — UI + API in one deployable
  └── Node runtime  — needed for raw DNS/TLS control in the SSRF guard
Supabase Postgres  — `auditor` schema: audits / leads / events / rate_limits
Anthropic API      — narrative only, over structured findings, optional
```

**The pipeline**

```
URL → validate & SSRF-guard → fetch homepage → detect Squarespace + version
    → robots.txt & sitemap.xml → prioritised crawl (≤12 pages, concurrency 4)
    → extract structured facts → probe images, assets and AI crawlers
    → ~100 deterministic checks → weighted score → AI narrative → persist
```

Results stream to the browser as NDJSON, so the progress bar reflects work
actually happening.

## 7. Why this architecture

**One Next.js app on Vercel, not a separate service.** The whole pipeline
finishes in 3–12 seconds against real sites. A queue, a worker service and a
job table would add three failure modes and buy nothing at this scale. The
budget is capped at 48 seconds so it fits inside the 60-second Hobby function
limit; on Pro you raise two numbers and crawl deeper.

**Node runtime, not Edge.** SSRF protection needs a custom DNS `lookup`
installed on the socket. Edge cannot do this, and a "resolve, then fetch"
approach leaves a DNS-rebinding window open. This is not theoretical — the URL
is entirely attacker-controlled.

**Streaming rather than polling.** One connection carries live progress and
the finished report; the report is persisted before the stream closes, so the
share link works immediately.

**Deterministic engine as the source of truth.** Every number in a report
comes from bytes we received. The model is given only the structured findings —
it never sees the website, so it cannot invent an issue. Two runs an hour
apart produce the same score.

**AI is optional by design.** With no key, reports render in full with
explanations composed from the findings. That is why the tool is publishable
today, before you top up the account.

**Separate `auditor` schema.** Audit data, personal data and analytics are
three tables with different retention needs. Leads can be deleted without
touching audit history.

## 8. What was built

**Squarespace detection** combines header, HTML, asset-path and robots.txt
evidence with a confidence score, so a site behind Cloudflare (which strips
`server` and `x-contextid`) still resolves. It distinguishes 7.0 from 7.1 on
five independent signals, identifies the 7.0 template family, measures the
Fluid Engine / Classic Editor mix per page, and detects Commerce, Scheduling,
customer accounts, pop-ups and Developer Mode. Password-protected and expired
Squarespace sites are recognised and explained rather than failing.

**~100 checks across 11 categories** — Technical SEO, On-Page, Performance, AI
Search Readiness, Conversion, Squarespace Setup, Structured Data,
Accessibility, Security & Privacy, Mobile, Social.

The Squarespace-specific ones are the ones no generic tool produces: the
`/home` duplicate that Squarespace advertises in its own sitemap, pages
stranded in "Not Linked", auto-generated gibberish slugs, category and tag
archive bloat, default title fall-back, the default favicon, sites still on a
`*.squarespace.com` address, Developer Mode, and built-in features you are
paying for and not using.

The AI-readiness checks are the commercially interesting ones. They separate AI
*search* crawlers from AI *training* crawlers — blocking OAI-SearchBot removes
you from ChatGPT's citations, blocking GPTBot costs you nothing — and they
re-request your homepage using real AI-crawler user agents, which catches
firewalls that refuse those bots regardless of what robots.txt says.

**Scoring** uses severity weights, sub-linear prevalence, applicability
exclusion, per-category critical gates and a harmonic mean across categories.
Checks you cannot fix on Squarespace are reported and excluded from the score —
marking a Squarespace site down for a missing security header would be
indefensible.

**Security**: SSRF hardening with connect-time DNS validation and per-hop
redirect re-validation; decompressed byte caps; request watchdogs; page and
time budgets; server-side two-tier rate limiting on a salted requester hash;
prompt-injection containment for crawled content; RLS with all privileges
revoked from `anon`; CSP.

**Lead generation** happens after the full report, never in front of it. The
audit itself classifies the opportunity — tier plus the service areas the
findings point to — from technical evidence alone.

---

## Verification

Sixteen real Squarespace sites audited end to end, spanning 7.0 and 7.1, blogs,
stores, coaches and studios. Every one completed in 3–12 seconds. Plus
non-Squarespace sites, invalid input, unreachable domains, an expired
Squarespace site, a password-protected one, private-network and cloud-metadata
addresses, IPv6 literals, credential-bearing URLs, non-HTTP schemes, repeat
runs (identical scores), an invalid AI key, and desktop and mobile rendering.

Three real false positives were found and fixed during testing, the most
important being that Squarespace's current Form Block is built by JavaScript —
a static crawl sees no `<form>` at all, so a naive check would have told sites
with a perfectly good contact form that they had no way to be contacted.

## What is deliberately not built

Deeper audits, unlimited audits, PDF export, white-label, monitoring,
historical trends, competitor audits, client dashboards and paid plans. The
foundations are in place for each — the README documents where each one hooks
in — but building them now would have meant shipping more unfinished features,
which is what went wrong the first time.

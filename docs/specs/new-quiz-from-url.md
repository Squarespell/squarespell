# PRD: "+ New quiz → From URL" (in-app quiz generator)

**Owner:** Squarespell
**Author:** Claude (drafted 2026-04-14)
**Status:** Draft for review
**Target ship:** 1 sprint (5 working days)

---

## 1. Problem Statement

Today, an authenticated user who clicks "+ New quiz" inside the dashboard is bounced out to the **public** marketing funnel at `/tools/quiz-funnel/build`. They then have to paste a URL, wait for generation, and are finally claimed back into the dashboard — the same flow we designed for first-time signups. This is confusing, slow, and off-brand. It also means a user who wants a *second* or *third* quiz has to roundtrip through a funnel that is obviously sign-up-themed.

The public PLG flow works well for first-time visitors (ad → URL paste → magic → signup). But for an already-signed-in user, the "+ New quiz" button should feel like Linear's "New issue" or Notion's "New page": a fast, inline modal that captures the source URL, kicks off generation, and drops them straight into the editor.

**Evidence:** Founder feedback — "if a user wants to create a new quiz in the backend, instead of manually creating a second quiz it should be automated by pasting a URL again." Today's "+ New quiz" button at `frontend/app/dashboard/quizzes/page.tsx:162` is a bare href to the public funnel.

**Cost of not solving:** Existing customers who want multiple quizzes (agencies, multi-brand operators, power users testing variants) hit friction on every new quiz. This blocks our expansion motion (more quizzes per account → higher plan tiers → higher LTV).

---

## 2. Goals

1. **Reduce time-to-second-quiz from ~3 minutes (through public funnel) to under 45 seconds** (paste URL → sit in editor).
2. **Authenticated users create new quizzes without leaving the dashboard domain** — no round-trip through `/tools/quiz-funnel/build`.
3. **Reuse the existing `scrapeBrand` + `claudeService` generation pipeline** — one backend pipeline, two frontends. No quality drift between public and authed flows.
4. **Lift quizzes-per-account from today's baseline to ≥ 2.0 median within 60 days of ship.**
5. **Zero regression to the public PLG flow** — the marketing funnel stays byte-identical.

## 3. Non-Goals

1. **Not rebuilding the AI generation pipeline.** Reuse `/api/preview-analyze` + `/api/preview-build-quiz` (or introduce a thin authed-only wrapper — see design options in §7).
2. **Not supporting bulk URL import in v1.** Paste one URL, get one quiz. Batch comes later.
3. **Not supporting "generate from description" (no URL).** URL is the primary input; a blank-canvas "start from scratch" option stays as a secondary CTA in the modal but the AI path is URL-only.
4. **Not touching the "+ New quiz" button on the `/dashboard` overview page** in v1 — only the button on `/dashboard/quizzes`. (Overview-page button gets the same treatment in a fast-follow.)
5. **Not adding template-library entry points.** Templates are a separate surface and a separate spec.

## 4. User Stories

**Primary persona: Authenticated quiz creator (agency owner, solo operator, marketer).**

- **US-1.** *As a signed-in user, I want to click "+ New quiz" and see an inline modal that asks for a URL, so that I never have to leave the dashboard to start a new quiz.*
- **US-2.** *As a signed-in user, I want to paste a URL and click "Generate," then watch a single-line progress indicator (scraping → analyzing → building), so that I know the system is working and roughly when it will finish.*
- **US-3.** *As a signed-in user, I want a "Start blank" secondary option in the modal, so that I can create a quiz without a URL when I am prototyping or testing.*
- **US-4.** *As a signed-in user, when generation finishes, I want to be dropped directly into `/dashboard/quizzes/:id/builder` with all the generated content preloaded, so that I can immediately edit.*
- **US-5.** *As a signed-in user, if the URL is invalid or the scraper fails, I want a clear error in the modal with "Try another URL" and "Start blank instead" options, so that I am never stuck.*
- **US-6.** *As a signed-in user, if I close the modal mid-generation, I want the quiz to keep generating in the background and appear in my dashboard when done, so that a slow connection doesn't force me to wait.*

**Secondary persona: New user finishing onboarding** (already served by existing PLG flow — this spec does not change their experience).

## 5. Requirements

### Must-Have (P0)

| # | Requirement | Acceptance Criteria |
|---|---|---|
| P0-1 | **Modal replaces href on "+ New quiz" button** on `/dashboard/quizzes`. | Clicking "+ New quiz" opens an in-dashboard modal (using `Sheet` primitive from `_components/Modals.tsx`). No navigation. |
| P0-2 | **URL input with real-time normalization** (auto-https, strip trailing slash, reject obvious garbage). | Typing `squarespell.com` normalizes to `https://squarespell.com` on blur. Invalid input (no dot, javascript: scheme, localhost, etc.) shows inline error before submit. |
| P0-3 | **"Generate" button calls existing `/api/preview-analyze` + `/api/preview-build-quiz`** with an authenticated bearer token and a new `authed: true` flag. Backend skips the preview cache for authed calls and writes directly to `quizzes` table with `user_id`, `status: 'draft'`, and `settings.website_url`. | `quizzes` row exists in Supabase with correct `user_id` within 30s of submit. No `previewQuizCache` entry created for authed flow. |
| P0-4 | **Three-step progress indicator** ("Scraping your site" → "Analyzing your brand" → "Building your quiz") with each step tied to the actual backend milestone. | At each transition, UI updates within 200ms of backend event. |
| P0-5 | **Redirect to `/dashboard/quizzes/:id/builder` on success.** | `router.push()` triggered within 500ms of final API response. Editor loads the generated questions, outcomes, branding. |
| P0-6 | **Error states**: invalid URL, scrape failure, Claude failure, network timeout. Each has a specific human-readable message + actionable CTA. | All four error paths reproducible and visually verified. No "Something went wrong" fallbacks. |
| P0-7 | **"Start blank" secondary CTA** in modal. Creates a draft quiz via POST `/api/quizzes` with default branding and routes to editor. | Clicking "Start blank" creates a row, redirects to editor in < 1s. |
| P0-8 | **Keyboard accessibility**: Esc closes modal, Enter submits when URL is valid, Tab order works. | Verified via keyboard-only test. |
| P0-9 | **Loading state on "Generate" button** — button disabled + spinner, URL input locked during generation. | Cannot double-submit. |
| P0-10 | **Zero regression to `/tools/quiz-funnel/build`** — public marketing flow continues to work unchanged. | Smoke test passes pre- and post-deploy. |

### Nice-to-Have (P1)

| # | Requirement | Acceptance Criteria |
|---|---|---|
| P1-1 | **Background generation** — user can close the modal and the quiz continues generating, appearing as a "Generating…" card in the dashboard grid that swaps to the real quiz when ready. | Closing modal mid-gen produces a placeholder card; placeholder is replaced without full-page refresh. |
| P1-2 | **URL history dropdown** — recent URLs the user has generated from auto-suggest in the input. | Last 5 URLs surfaced; click fills field. |
| P1-3 | **Preview thumbnail** — once the scraper returns the brand colors/favicon, show a tiny preview swatch inside the modal so the user knows the scrape worked before the full quiz is ready. | Visual swatch appears within 5s of submit. |
| P1-4 | **Goal selector parity** — the public flow asks for `{ goal, business_type, audience, tone, key_offer }`. The authed modal should collect these too, but as a collapsed "Advanced" section that defaults to sensible values (`goal: 'lead_gen'`, etc.) so most users never expand it. | Collapsed by default; all fields optional. |

### Future Considerations (P2) — design with these in mind but do not build

| # | Consideration |
|---|---|
| P2-1 | Bulk URL import (paste a CSV of URLs, generate N quizzes). The API should already be per-URL, so this is purely a frontend concern + a queueing layer. |
| P2-2 | "Duplicate existing quiz and re-target to new URL" — power-user shortcut for agencies managing multiple similar sites. |
| P2-3 | Regenerate from URL — let users re-run the scraper on an existing quiz to refresh copy/branding. Needs a new endpoint `POST /api/quizzes/:id/regenerate-from-url`. |
| P2-4 | Template + URL combined: "use the 'Lead magnet' template but brand it from this URL." |

---

## 6. Architecture & API Changes

### 6.1 New backend route (small, additive)

**Option A (recommended):** Add `authed: true` flag to `/api/preview-build-quiz`. When present + valid bearer token:
- Skip `previewQuizCache` entirely
- Call `supabase.from('quizzes').insert(...)` directly with `user_id` from JWT, `status: 'draft'`, `settings.website_url`
- Return `{ quiz: { id, slug }, redirect_to: '/dashboard/quizzes/{id}/builder' }`

**Option B:** Introduce a new `POST /api/quizzes/from-url` endpoint that wraps `scrapeBrand` + `claudeService.generateTailoredQuiz` + direct DB insert in one handler. Cleaner separation but duplicates flow logic.

**Recommendation:** Option A. Less code, less drift, existing endpoint already normalizes URL and handles the Claude call.

### 6.2 New frontend component

- `frontend/app/dashboard/quizzes/_components/NewQuizModal.tsx` — the modal itself, built on the existing `Sheet` primitive from `_components/Modals.tsx` (already written but not yet landed; see cherry-pick PR).
- Wire into `frontend/app/dashboard/quizzes/page.tsx` — replace line 162's `<PrimaryButton href=...>` with `<PrimaryButton onClick={() => setNewQuizOpen(true)}>`.

### 6.3 Analytics events to fire

- `new_quiz_modal_opened` (source: `dashboard_quizzes`)
- `new_quiz_url_submitted` (url_host, from_history: bool)
- `new_quiz_generation_succeeded` (duration_ms, quiz_id)
- `new_quiz_generation_failed` (stage: scrape | analyze | build, error_code)
- `new_quiz_start_blank_clicked`

---

## 7. Success Metrics

### Leading indicators (measure at 14 days post-launch)

| Metric | Baseline today | Target | Measurement |
|---|---|---|---|
| Time from "+ New quiz" click → editor loaded | ~180s (public funnel) | < 45s (p50), < 90s (p90) | Analytics event timing |
| `+ New quiz` → modal open rate | N/A | ≥ 98% (click maps to open) | `new_quiz_modal_opened` / click |
| Modal submit → generation success rate | N/A | ≥ 92% | `generation_succeeded` / `url_submitted` |
| Modal abandonment (opened but no submit or blank) | N/A | ≤ 15% | 1 - (submits + blanks) / opens |

### Lagging indicators (measure at 60 days post-launch)

| Metric | Target | Measurement |
|---|---|---|
| Median quizzes per paid account | ≥ 2.0 (from today's baseline) | `SELECT user_id, count(*) FROM quizzes ... MEDIAN ...` |
| 7-day retention of users who create 2nd quiz | ≥ 75% | Cohort query |
| Paid-plan upgrade rate for accounts creating ≥ 3 quizzes | ≥ 1.5x the 1-quiz baseline | Billing + quiz count join |

Success threshold: hit 3 of 4 leading indicators. Stretch: hit all 4 + median quizzes/account ≥ 2.5.

---

## 8. Open Questions

| # | Question | Owner | Blocking? |
|---|---|---|---|
| OQ-1 | Should Option A skip Claude re-generation if the user has already generated a quiz for this exact URL in the last 24h? (caching) | Engineering | Non-blocking |
| OQ-2 | Is the `previewSessionCache` TTL of 24h still correct for the authed flow, or should we drop it entirely for authed? | Engineering | Non-blocking (Option A drops it) |
| OQ-3 | Do we need rate-limiting on `/api/preview-build-quiz` per `user_id` to prevent Claude-cost abuse? If yes, what limit (e.g. 10/day on free tier)? | Engineering + Founder | **Blocking for launch** |
| OQ-4 | Does "Generating…" placeholder state (P1-1) need RLS consideration in Supabase — is the row inserted at submit or only on success? | Engineering | Non-blocking (affects P1-1, not P0) |
| OQ-5 | Should the modal surface a "You have X AI generations left this month" indicator on free/starter plans? | Founder | Non-blocking (can fast-follow) |

---

## 9. Timeline & Phasing

**Week 1 (this sprint):**
- Day 1: Backend — add `authed: true` flag to `/api/preview-build-quiz`, add direct DB insert path, rate-limit (OQ-3).
- Day 1: Frontend — scaffold `NewQuizModal.tsx` using `Sheet` primitive.
- Day 2: Wire modal into `/dashboard/quizzes` page; implement URL input + validation + "Start blank" CTA.
- Day 3: Hook up API calls, implement three-step progress indicator, error states.
- Day 4: QA — all P0 acceptance criteria, keyboard accessibility, zero-regression smoke test on public funnel.
- Day 5: Ship to production. Monitor analytics + Sentry for 48h.

**Week 2 (fast-follow):**
- Same modal added to `/dashboard` overview page.
- Background generation (P1-1).
- URL history dropdown (P1-2).

**Dependencies:**
- Cherry-pick PR landing `Modals.tsx` onto main (see `_cherry-pick-to-main/ship-to-main.sh`). This is a **hard blocker** — the modal uses the `Sheet` primitive from that file.
- Clerk session auto-logout fix (separate P0). If a user's session expires mid-generation, the experience breaks. Either ship the session fix first, or ensure the modal gracefully retries auth.

---

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Claude cost spike from unrestricted authed generations | Medium | High | Rate limit per user (OQ-3). Monitor cost in week 1. |
| Users expect the authed modal to also capture leads the way the public funnel does — feature drift | Low | Medium | Explicit non-goal. Modal stops at generation; lead capture is configured inside the editor. |
| Brand scraper fails on URLs behind auth walls or Cloudflare challenges | Medium | Medium | Clear error state with "Start blank" escape hatch (P0-7). |
| Session expires mid-generation → 401 on claim response | Medium | High | Depends on Clerk session fix. Temporary mitigation: catch 401 and prompt re-auth without losing generation state. |

---

## 11. Out-of-scope clarifications (for stakeholders)

- This does **not** replace the public `/tools/quiz-funnel/build` flow. That flow is the PLG onramp for new visitors and stays untouched.
- This does **not** add bulk creation, templates, or duplication in v1.
- This does **not** change the claim-quiz mechanism for guest → authed transitions.

---

## Appendix: References to main-branch code

| Touchpoint | Path | Key lines |
|---|---|---|
| Current "+ New quiz" button | `frontend/app/dashboard/quizzes/page.tsx` | 162 |
| Public funnel page | `frontend/app/tools/quiz-funnel/build/page.tsx` | — |
| Public funnel logic | `frontend/app/tools/quiz-funnel/build/TryFlowInner.tsx` | 320-380 (analyze + build), 906-925 (form) |
| `/api/preview-analyze` | `backend/src/routes/allRoutes.ts` | 195-260 |
| `/api/preview-build-quiz` | `backend/src/routes/allRoutes.ts` | 262-310 |
| `/api/claim-quiz` | `backend/src/routes/allRoutes.ts` | 334-396 |
| `/api/quizzes` (direct create) | `backend/src/routes/quiz.ts` | 34-41 |
| Dashboard claim handling | `frontend/app/dashboard/page.tsx` | 450-530 |
| Editor route after create | `frontend/app/dashboard/quizzes/[id]/builder/page.tsx` | — |
| `Sheet` / `ConfirmDialog` primitives (needs cherry-pick to main first) | `frontend/app/dashboard/_components/Modals.tsx` | — |

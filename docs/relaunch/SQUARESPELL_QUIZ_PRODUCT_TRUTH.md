# Squarespell Quiz — Product Truth

Investigated 22 September 2026 against current `main` (commit reviewed: see PR). Sources: current backend/frontend code, staging (`staging.squarespellquiz.com`, public routes and one prior authenticated walkthrough of the Sites/Connect dashboard in this same engagement), production (`squarespellquiz.com`, read-only, gated), `docs/relaunch/*` (evidence, cross-checked against code, never taken on its own), and `squarespell.com`'s existing quiz-related content inventory. Where a document and the code disagreed, code wins and the disagreement is recorded. Live UI states that were not personally clicked through this pass are labelled **code verified, live behaviour unverified**, consistent with the strong first-party evidence in `docs/relaunch/SQUARESPELL_PHASE_1_RESULTS.md` and this pass's own code reads.

Sign-up on staging is protected by a Cloudflare Turnstile challenge, which was not bypassed (per standing instruction). A prior stage of this same engagement did complete a full authenticated walkthrough of the Sites/Connect area of the dashboard (empty state, wizard, publish flow, installation controls, leads/activity feed) — that first-hand evidence is reused here and marked accordingly. Public, unauthenticated staging pages (homepage, pricing, and others) were read live this pass.

---

## 1. Exact product definition

Squarespell Quiz is a SaaS quiz-funnel builder: paste a website URL, the product reads the site and drafts an editable interactive quiz (questions, branching logic, weighted scoring, outcomes and a lead form) in the business's own words; the owner edits and approves it; it publishes to the owner's own site (universal embed everywhere, plus a guided one-button Connect flow for Squarespace); every view, answer, completion, outcome and lead is recorded and reported back to the owner. It is a distinct product from `squarespell.com`'s WordPress marketplace and its one-time "lifetime" Squarespace quiz plugin — separate codebase, separate domain (`squarespellquiz.com`), separate database, and (per `docs/relaunch/SQUARESPELL_PHASE_0_RESULTS.md` §1) separate account and billing model, sharing only the parent Stripe account.

## 2. Customer segments

Owner-approved (Phase 2 spec §2.2, not yet re-validated by paying customers): **primary — consultants and boutique agencies** (1–20 people) with an existing website who lose sales time to unqualified enquiries; **secondary — coaches and course creators** running program-fit or readiness experiences. Explicitly **not** targeted yet: ecommerce catalogues (need product-attribute sync the product doesn't have), regulated professional services, and large multi-site agency operations (client workspaces are not built — see §20). The live template catalogue (16 templates) is mostly consumer/lifestyle; only two templates ("Coaching Readiness", "Video Brand Personality") fit the primary segment today, which the product's own planning work already flags as a gap (Phase 2 §2.2).

## 3. Problems solved

Too many unqualified enquiries; unclear which package or service a visitor needs; no record of who visited, what they answered, or why they didn't convert; and, for the installation side specifically, the standing friction of pasting embed code by hand every time a quiz changes (the product's own stated top-level requirement, Phase 2 §0.4: *"Connect your website once. Publish, update or remove every quiz with one button."*).

## 4. Complete owner journey

Sign up (email/Google/Apple via Clerk; 14-day Pro-level trial, no card, confirmed live on the pricing and home pages) → dashboard → **New quiz**: paste a URL and pick a goal (capture leads / recommend a product / score and segment / grow email list), or start blank (`frontend/app/dashboard/quizzes/_components/NewQuizModal.tsx`) → AI drafts a business profile and a tailored quiz (`POST /api/quizzes/from-url`, `backend/src/services/claudeService.ts`) → block editor: reorder and edit questions, logic, outcomes, branding, lead form (`QuizBlockEditor.tsx`, 8 block types) → preview desktop/mobile → publish (universal link/iframe/script now; guided Connect for Squarespace) → leads and analytics accrue → export or send leads on to Mailchimp/Klaviyo/ConvertKit/HubSpot/Google Sheets/webhook (Pro and above) → manage plan/usage in billing.

## 5. Complete visitor journey

Visitor reaches the quiz (public link, iframe, inline slot, popup or floating tab) → optional cover/intro content → answers questions (single/multi select, slider, rating, open text with email/url/phone/number validation, date, file upload) with branching (`show_conditions`, evaluated per question) and scoring accumulating → reaches an outcome → optional lead form (name/email and configurable fields with consent) gates or follows the result → result screen with a call to action, optionally an image/product/booking link → session and every question event (view/answer/skip/back, with device type and time spent) is recorded (`backend/src/services/questionAnalytics.ts`) for the owner's drop-off funnel.

## 6. Five quiz-creation modes — corrected

**The product does not have five quiz-*creation* modes.** This exact question was already investigated and answered in `docs/relaunch/SQUARESPELL_PHASE_1_RESULTS.md` §2, and this pass's own code read confirms it is still true on current `main`: the set of five is the quiz **type** enum (`mode`), not five ways of starting a quiz.

**The five quiz types** (`backend/migrations/007_quiz_modes.sql`; enforced in `backend/src/routes/quiz.ts` on create and update): `lead_quiz`, `price_calculator`, `service_recommender`, `client_qualifier`, `segmentation_quiz`. The live homepage independently confirms the same count and names under "Five different jobs, one builder": Lead quiz, Price calculator, Service recommender, Client qualifier, Segmentation quiz — described as "5 AI quiz modes in the product". Each changes the questions, scoring and result the AI drafts, not the mechanics of the builder itself.

**The actual quiz-creation paths** (all reachable in the product, all covered by tests per Phase 1 §2):
1. **Blank** — `POST /api/quizzes` with empty questions/outcomes, "Start blank" in the New Quiz modal, lands directly in the editor.
2. **From a template** — the New Quiz modal's template picker (`frontend/app/dashboard/quizzes/_components/quizTemplates.ts`, `backend/src/config/quizTemplates.ts`) converts a catalogue template into starting blocks.
3. **From URL, in-dashboard (AI)** — paste a URL, pick a goal, optional template/topic; `POST /api/quizzes/from-url` scrapes the site, builds a business profile and generates a tailored quiz (`quizzesFromUrl.ts`; requires sign-in; rate-limited 10/25/50 generations per day by plan).
4. **Public "try it" funnel (AI, signed out)** — `preview-analyze` / `preview-build-quiz` / `preview-generate`, and the authenticated mirror `POST /api/generate`; produces a draft that must be **claimed** (`POST /api/claim-quiz`, `POST /api/save-preview`) into a real account after sign-up.
5. **Duplicate** — `quiz.ts:253` copies an existing quiz into a new one (a management action that also creates a quiz).

**Per-mode journey (from-URL path, the flagship flow):** entry via New Quiz modal → required input is a URL (goal, template and topic optional) → generation: scrape the site (`brandScraper.ts`) → AI business-profile analysis and tailored quiz generation (`claudeService.ts`, Anthropic) → questions/outcomes/branding pre-filled, nothing published yet → customer edits everything before publish → failure states surfaced to the user: daily-limit 429, `NOT_SQUARESPACE` 422 (brand scraper currently expects a Squarespace-hosted source site — a real, current limitation, not documented on the pricing/marketing pages), 404 (route misconfigured), and a generic failure message; no automatic retry is coded (the user re-submits); no explicit timeout constant was found in `quizzesFromUrl.ts` itself, though the content inventory records the dashboard generator's own timeout as 150s and the public funnel's as 75s (`TryFlowInner.tsx`). **Status: working, code and (for the from-URL path) previously exercised live in this engagement's earlier connector-review stage (a quiz was created and edited through this exact flow on staging).**

## 7. Question-type inventory

Defined and validated in `backend/src/services/questionTypes.ts` plus the block editor's own block types (`QuizBlockEditor.tsx`):

| Type | Fields / settings | Scoring | Notes |
|---|---|---|---|
| `single_select` | options list; styles: buttons, cards, dropdown, image-choice | yes (per-option score) | the image-choice *style* is how "image answers" are implemented — not a separate type |
| `multi_select` | options list; styles: buttons, cards | yes | |
| `slider` | min/max/step/default, labels, show value | yes (value × weight) | |
| `rating` | max stars, icon (star/heart/thumb), labels, half-star | yes (value × weight) | |
| `open_text` | placeholder, validation (`email`\|`url`\|`phone`\|`number`\|none), max length, multiline/rows | no | this single type covers plain text, email, phone and number inputs via its `validation` setting — there is no separate "email question" or "number question" type |
| `date` | min/max date, include time, format | no | |
| `file_upload` | accepted extensions, max size MB, multiple, max files | no | |

Non-question blocks in the editor (`QuizBlockEditor.tsx`'s 8 block kinds, matching the homepage's "8 blocks in the visual editor"): **Question**, **Heading**, **Text**, **Image**, **Divider**, **Lead gate**, **Logic**, **Outcome**. A Question block can carry a `mediaType` of `image` or `video` (confirmed at `QuizBlockEditor.tsx:370` and surrounding lines) — "video questions" in marketing copy means a video can be attached to a question, not that a distinct video-question type exists. There is no dedicated welcome/cover-screen block type or a distinct "informational screen" type beyond Heading/Text/Image/Divider used before the first Question block; a Lead gate block is how the lead form is placed in the flow (before or after results, at the editor's discretion) and a Result/Outcome block carries the personalised result. **Status: code verified; the block inventory itself (8 kinds) is also independently confirmed by the marketing homepage's own stated count, which the site says is "taken from the current Squarespell Quiz repository, not marketing estimates."**

Validation is real and type-specific (`validateQuestionAnswer`): slider/rating range checks, open-text max length and format regexes for email/url/phone, required-field checks, date range checks. Mobile behaviour, keyboard navigation, and accessibility of each renderer were not independently exercised in the visitor-facing renderer this pass — **code verified, live behaviour unverified.**

## 8. Logic and branching engine

Implemented as **`show_conditions`** per question (`backend/src/services/skipLogic.ts`), a declarative "show this question only if…" system, not goto-style question jumps. Rules:
- Conditions: `eq`, `neq`, `any_of`, `none_of`, `gt`, `lt`, `answered`, `not_answered`, evaluated against an earlier question's answer.
- Combination: **all conditions in a question's list must match (AND only)**; there is no OR combinator between conditions on one question (an `any_of` condition achieves an OR *within* one earlier answer's possible values, which is not the same as an OR across two different questions).
- **Structural cycle prevention**: a condition may only reference a question with a *lower* index than the one it gates (`validateShowConditions`), which makes circular references and forward references impossible by construction, not by a separate validation pass.
- Rule priority, deleted-question renumbering, and reordering behaviour were not exercised live this pass.
- **Exposed in the UI**: a "Skip Logic" modal exists in the block editor (`SkipLogicModal` in `QuizBlockEditor.tsx`), and a dedicated validation endpoint exists (`POST /api/quizzes/:id/validate-conditions`, `backend/src/routes/extendedFeatures.ts`) that calls the same `validateShowConditions` function the backend uses. **Status: code implemented and UI-exposed; live click-through of the modal was not performed this pass — code verified, live behaviour unverified.** (Earlier code-search confirmed `show_conditions` appears nowhere else in the repository besides this service and its one modal/route, so there is exactly one implementation of branching, not several competing ones.)

Branch validation before publishing, previewing a specific branch, and "unreachable question" detection beyond the earlier-index rule were not found as separate, named features in the code read this pass.

## 9. Scoring and outcome engine

Per-option scores on `single_select`/`multi_select`; value-times-weight scores on `slider`/`rating` (`calculateQuestionScore`); `open_text`, `date` and `file_upload` do not score. Outcomes are a quiz-level array (`quizzes.outcomes` JSONB) mapped by score range/threshold; the homepage's own live product demo shows a running "Lead score" with a "Lead tier" (High/etc.) computed from per-answer point values, and a separate branching+scoring demo shows routing "by answer or score range" to different outcomes ("Book a call" vs "Send guide"). Outcome-specific descriptions, images, and calls to action are supported per the block editor's Outcome block and the homepage's "Result pages" section (images, CTAs, products, booking links, share text, tips, coupons, testimonials, before/after). Outcome-specific redirects, outcome-specific emails, and outcome-specific tags used for lead segmentation are referenced in the Phase 2 specification as requirements but were not independently traced to a specific code path this pass; segmentation itself has a dedicated service and route (`services/segmentation.ts`, `routes/segmentation.ts`) and a dashboard page (`/dashboard/segmentation`), so tag/segment-based lead grouping is real. Score display vs hiding to the visitor, tie handling between equally-scoring outcomes, and a documented "default outcome" fallback were not confirmed in code this pass. **Status: core scoring and outcome mechanics code-verified and demonstrated live on the marketing site's own product preview; the finer rules (ties, default outcome, per-outcome redirects/emails) are code verified, live behaviour unverified or not located.**

## 10. Editor capabilities

Single block-based editor (`QuizBlockEditor.tsx`) covering: quiz title, question creation/duplication/deletion/reordering (drag), the 8 block types above, and — per the homepage — "undo and redo up to 50 steps". Desktop and mobile preview are both present (confirmed live in the earlier connector-review stage of this engagement for the Publish-flow's own preview, and referenced generally by the editor's "Live preview" panel on the homepage). Autosave vs manual save, unsaved-change warnings, draft status, duplicate-quiz and archive/delete actions, SEO fields and social-sharing fields were referenced in the wider file tree (`frontend/app/dashboard/trash/`, a Trash section, exists as its own dashboard page, implying archive/restore is a real, separate feature) but individual field-level behaviour was not clicked through this pass — **code verified, live behaviour unverified**, except where noted otherwise.

## 11. Appearance and branding

Referenced live on the homepage and pricing page: brand kit, light/dark palettes, custom CSS (Pro+), white-label / branding removal (Core+ removes the "Made with Squarespell Quiz" badge; Business adds full white-label), custom domains for quizzes (Business). A dedicated `frontend/app/dashboard/brand-kit/` section exists in the app tree. Progress bar, question numbering, animation/transitions, full-screen vs inline layout, and granular accessibility controls were not individually verified this pass — **code verified where a matching backend file exists (`customCss.ts`, migration `025_white_label.sql`), otherwise unverified.**

## 12. AI capabilities

What the AI actually does: given a URL, `brandScraper.ts` fetches and reads the site (current known limitation: the scraper's error path is specifically `NOT_SQUARESPACE`, implying today's brand-scraping is tuned to Squarespace-hosted sources — a real constraint not stated on the marketing pages); `claudeService.ts` (`analyzeBusinessProfile`, `generateTailoredQuiz`) turns that into a business profile and then a full draft quiz — questions, options, scoring and outcomes for the chosen goal/mode, optionally steered by a picked template archetype and an optional free-text topic. What it does **not** do, per the product's own Phase 2 positioning rules (§3.3): claim a fixed generation time, claim the draft needs no edits before publish, or claim it works for "every" site — the customer must review and approve before anything goes live (no auto-publish path exists in the creation flow). Rate limits are real and plan-based (10/day free-tier equivalent, 25/day core-tier, 50/day pro/business-tier — read directly from `quizzesFromUrl.ts`'s `getDailyAllowance`). AI edit suggestions, individual question rewriting, tone control, and brand-voice controls referenced in planning docs were not located as shipped endpoints this pass. **Status: the from-URL generation path is code verified and was personally exercised in an earlier stage of this engagement (a real quiz was generated from a URL on staging); finer AI controls (regeneration, rewriting, tone) are unverified.**

## 13. Lead-generation system

Lead capture is a **Lead gate** block placed anywhere in the question flow (before or after results, at the editor's discretion) — not a fixed single position. Fields, consent, and validation are configurable per the editor; a lead record ties to the quiz, its outcome, its score, and (per the questionAnalytics session model) the visitor's session. **Status: block exists and is wired to a real backend table (`leads`, referenced throughout `backend/src/routes/quiz.ts` and `leadScoring.ts`); field-by-field lead-form behaviour (which fields are required, spam prevention, duplicate handling) was not individually exercised this pass — code verified, live behaviour unverified**, except the plan-gated leads/month allowance, which is definitively confirmed in code (§21).

## 14. Lead management

A dedicated `/dashboard/leads` page and `LiveLeadFeed.tsx` component exist. CSV export is advertised on both the homepage and pricing page for every paid plan. Lead scoring has its own service (`leadScoring.ts`) and lead insight generation its own service (`leadInsights.ts`). Search/filter/sort by quiz, outcome, or date; bulk actions; and delete were not individually clicked through this pass. **Status: code verified for the underlying services and the page's existence; field-level UI behaviour unverified.**

## 15. Analytics

Two layers, both real, both distinct from the *planned* event dictionary in `docs/relaunch/SQUARESPELL_PHASE_2_PILOT_SPEC.md` §9.2 (which is a **future** design, not yet the implemented model):
- **Question-level**: `backend/src/services/questionAnalytics.ts` records `view` / `answer` / `skip` / `back` per question, with device type, language and time-on-question, and computes a per-question drop-off funnel and overall completion rate. This is the real engine behind the pricing page's "per-question drop-off analysis" (Pro+) and the homepage's "See where people leave" demo (Completion 68%, Lead rate 41% in the example).
- **Rollup/account-wide**: `backend/src/services/questionAnalytics.ts`'s funnel plus a separate `analytics_rollup` migration (`012_analytics_rollup.sql`) and A/B-testing service (`abTesting.ts`) for split-test reporting (Pro+ only per `PLAN_LIMITS.abTesting`).
CSV export of analytics, real-time reporting, and empty-state behaviour were not individually verified this pass. **Status: the tracked-event set is code verified and directly evidenced by the live marketing site's own numbers; dashboard-level display was not personally clicked through this pass for a real quiz — code verified, live behaviour unverified.**

## 16. Publishing

**Guaranteed universal baseline** (every platform, no authorization needed): hosted public link, iframe embed, and script/loader embed with three placement modes — **inline, popup, floating tab** (matches the homepage's own count: "3 embed modes"). A manual embed page exists in the dashboard (`/dashboard/embed`). Draft vs live status, unpublish/republish, and preview/share links exist per the editor and publish-flow tests referenced in earlier work but were not re-clicked this pass beyond what §17 covers.

## 17. One-button Connect

**This is a genuinely new, currently-implemented system** — it did not exist when `docs/relaunch/SQUARESPELL_PHASE_2_PILOT_SPEC.md` §0.4 was written ("nothing is built"); it was designed, implemented, code-reviewed, staging-tested and merged to `main` as PR #73 in this same engagement, then production-deployed (PR #74/#75 fixed a production wiring gap for the feature flag). **Current main code takes priority over the "nothing is built" note in that older document.**

- **Model**: one Site Loader per connected site, a versioned installation manifest, connected-site states (Not connected / Awaiting installation / Verified / Needs attention / Disconnected), page-fetch and heartbeat verification, audit history (`installation_events`), and rollback on a failed publish (verified live in this engagement: a simulated failure left the previous manifest version untouched).
- **Squarespace, guided**: one manual loader paste into Code Block or Code Injection (never claimed automatic — the platform's documented public APIs do not support silent page insertion), then **one-button** publish/update/move/pause/resume/remove for popup, floating tab and any inline slot the customer placed once. This was personally exercised in this engagement: publish (all three placement types), update, move, pause, resume, remove, disconnect, verification failure/recovery, and rollback all worked on the real staging UI.
- **Other platforms (WordPress, Shopify, Wix, Webflow, Framer)**: **not built** — see §18. The universal embed already covers any of them today; Connect specifically for them does not exist yet.
- **Status: verified in staging and code (personally exercised this engagement); also now deployed to production behind `CONNECT_ENABLED`, gated/private, not yet publicly launched.**

## 18. Platform matrix

| Platform | Status | Connection method | Initial customer action | What becomes automatic after | Notes |
|---|---|---|---|---|---|
| Universal / custom HTML | **Working** | Paste snippet (hosted link, iframe, or script loader) | Paste and publish | The loader itself; new quizzes on the same site still need a new placement choice, not a new paste, once a slot exists | Guaranteed baseline for every platform |
| Squarespace | **Working with a manual first-time installation** | One guided Code Block / Code Injection paste, then Connect | Paste the loader once | Publish, update, move, pause, resume, remove — no more pasting | Squarespace's documented public APIs do not permit automatic page insertion; this is a structural platform limit, not a Squarespell gap |
| WordPress | **Planned** | Application-password pairing, dedicated plugin (not yet built) | n/a | n/a | Universal embed works today; the dedicated plugin is a roadmap item (Phase 2 §6.0/§6.3) |
| Shopify | **Planned** | OAuth, theme app extension (not yet built) | n/a | n/a | Apps cannot add theme blocks automatically even once built — a permanent platform limit, not a future bug |
| Wix | **Planned** | OAuth, embedded script or widget (not yet built) | n/a | n/a | |
| Webflow | **Planned** | OAuth, Data-Client script registration (not yet built) | n/a | n/a | |
| Framer | **Planned** | Editor plugin (not yet built) | n/a | n/a | |

## 19. Integrations

Backend integration services exist for **ActiveCampaign, Acuity, Calendly, ConvertKit, Google Sheets, HubSpot, Klaviyo, Mailchimp** (`backend/src/services/integrations/`), plus outbound lead webhooks (SSRF-checked, `utils/urlValidator.ts`) and a lead-webhook delivery service with a failure log (`integration_errors` table). All are referenced on the dashboard's Integrations page and on the pricing/homepage marketing copy (Pro+ gated). **Zapier and the API-key system exist as route files but are not mounted in the running server** (`backend/src/app.ts` does not import `zapier.ts` or `apiKeys.ts` — confirmed on current `main`, matching Phase 1's finding F13 that this was left unmounted on purpose) — **status: code implemented but not exposed**, and this matches the Phase 2 specification's own instruction not to promise Zapier or API-key access until verified. Stripe is an integration in the billing sense only (§21), not a lead-delivery integration.

## 20. Quiz management

A Trash/archive section exists as its own dashboard page (`/dashboard/trash`); duplicate is a real backend action (`quiz.ts:253`); Team access has its own migration (`018_team_access.sql`) and dashboard page (`/dashboard/team`), gated to Business plan only (`PLAN_LIMITS.teamSeats`) — Business includes 3 seats with paid add-on seats beyond that. **Multi-client/agency workspace management (managing separate client accounts from one login) is not built** — the Phase 2 specification explicitly excludes it from the pilot and calls it a later Agency-plan capability; "Team seats" today means additional users on one account's own quizzes, not a client-management layer.

## 21. Pricing and entitlements

**Three tiers are live in the product and match the code exactly**, confirmed by directly reading both `backend/src/middleware/planGuard.ts` (`PLAN_LIMITS`) and the live staging pricing page:

| | Core | Pro | Business |
|---|---|---|---|
| Monthly | $12 | $19 | $35 |
| Annual (per month) | $9 | $16 | $29 |
| Quizzes | 5 | Unlimited | Unlimited |
| Leads/month | 1,000 | 3,000 | Unlimited |
| Emails/month | 1,000 | 3,000 | Unlimited |
| Branding removal | Yes | Yes | Yes |
| Branching logic | Yes | Yes | Yes |
| A/B testing | No | Yes | Yes |
| Integrations (Mailchimp etc.) | No | Yes | Yes |
| Email sequences | No | Yes | Yes |
| Advanced analytics | No | Yes | Yes |
| White-label | No | No | Yes |
| Custom domain | No | No | Yes |
| Team seats | No | No | Yes (3 included) |
| Zapier flag | No | Yes | Yes *(the flag is on, but the route is unmounted — see §19)* |

A **free tier** exists in code (`PLAN_LIMITS.free`: 0 quizzes, 0 leads) but is not sold as a self-serve plan on the pricing page today (every plan starts with a 14-day **Pro**-level trial, no card, confirmed live). Add-on packs are **already live**, not a future hypothesis: +500/+1,500/+3,000 leads for $3/$7/$12 per month, and +1,000/+5,000/+10,000 emails for $3/$7/$12 per month, available on Core and Pro (confirmed on the live pricing page). **One active legacy entitlement** exists (`legacy_entitlements` table, migration 032): a single grandfathered account gets Business-level access without any Stripe reference, for a paid legacy plan with no live subscription behind it — a real, current, protected edge case, not a bug.

**Confirmed contradictions:**
1. **Stripe catalogue vs application.** Stripe (live mode, Squarespell Limited account) holds products named **Starter/Pro/Agency at $19/$39/$79 monthly** ($180/$372/$756 yearly); the application and every public page use **Core/Pro/Business at $12/$19/$35 monthly** ($9/$16/$29 annual). The two have never been reconciled (`docs/relaunch/SQUARESPELL_PHASE_0_RESULTS.md` §6.2, independently reconfirmed by this pass's direct code read of `billingPlans.ts`). The Squarespell Quiz Stripe webhook is **disabled**, so even if a checkout succeeded against the live catalogue, the app would never learn about it.
2. **Planning-document pricing vs live pricing.** `docs/relaunch/SQUARESPELL_PHASE_2_PILOT_SPEC.md` §7 proposes a **future** rename to Build/Launch/Growth/Agency at $0/$29/$79/$199 — this is a **hypothesis awaiting validation**, not what is live today. Do not present it as current pricing.
3. **Trial wording.** The Phase 2 document assumes a future "14-day Growth trial"; the product that is actually live today already runs a 14-day **Pro**-level trial, confirmed on both the homepage and pricing page.

## 22. Human services and support

Separate from software: email support (all paid plans), **priority** email support (Pro+), a **dedicated onboarding call** (Business, and — per the approved but not-yet-launched Founding Partner offer — personal onboarding plus two feedback interviews for early paid partners). The Founding Partner offer itself (Growth-level access at $49/month, first 10 partners, 6-month price lock, 14-day refund, cancel anytime) is **approved wording, not yet sent to anyone** (`docs/relaunch/SQUARESPELL_PHASE_2_PILOT_SPEC.md` §11.3) — it is a real, ready human-service offer, not a live feature to build.

## 23. Template catalogue

**16 templates**, confirmed identically by the homepage ("16 real templates ready to edit" / "16 editable industry templates") and the Phase 2 specification's own count. Mostly consumer/lifestyle verticals (photography, interior design, product finder, fitness, beauty, coaching, real estate, food, travel and more per the homepage's own list); only two fit the approved primary segment (consultants/agencies) without adaptation. A curated pack of six consultant/agency-specific templates is a planned, not-yet-built Phase 4 item (Phase 2 §4.3).

## 24. Existing Squarespell content

29 quiz-related URLs on `squarespell.com` are already catalogued in `docs/relaunch/SQUARESPELL_QUIZ_CONTENT_INVENTORY.csv` (the Phase 0 content inventory), each with a per-page recommendation (keep/update/migrate/merge/retire) and a proposed future destination. Confirmed findings that still hold on this pass's independent pricing check: several pages publish outdated or since-superseded pricing and unsupported generation-time/installation-time claims (for example "ready in 30 seconds", "2 minutes", "One-click embed") that do not match the code (`75`–`150` second dashboard/funnel timeouts; a manual Squarespace paste, not one-click). The one-time lifetime plugin's own marketplace listing and its supporting roundup posts are explicitly protected and excluded from any migration. **Nothing on `squarespell.com` was changed this pass** — see the CSV for the full page-by-page evidence.

## 25. Lifetime-product separation

Confirmed intact this pass, no changes made or needed: the one-time/lifetime Squarespace quiz plugin listing and its supporting content stay on `squarespell.com`, unedited, unredirected, and are excluded from every migration decision in the content inventory (§24). The SaaS product's database, billing and accounts are entirely separate (Phase 0 §1).

## 26. Strongest subscription drivers

See final response item 14 for the ranked list; drivers are drawn only from capabilities confirmed live or in code this pass (URL-to-draft AI generation, branching + weighted scoring, one-button Connect for Squarespace, per-question drop-off analytics, CSV export and integrations, add-on capacity packs, white-label/custom domain at the top tier) — not from unverified planning-document claims.

## 27. Weaknesses and incomplete features

See final response item 15 for the ranked list. In summary: the Stripe/app pricing mismatch with a disabled webhook (no live plan can actually be purchased and recognised today); Zapier and API-key access shipped but unmounted; scheduled email jobs (trial reminders, lead-milestone emails, weekly digest, monthly report) defined in `render.yaml` but **not present in the live Render account, so none of them currently run** (`docs/relaunch/SQUARESPELL_PHASE_1_RESULTS.md` §4.2 — a still-current, unrepeated finding, cited not re-audited); the brand scraper's `NOT_SQUARESPACE` error path suggests from-URL generation is presently tuned to Squarespace-hosted sources; Connect exists only for Squarespace, not the other five roadmap platforms; and the primary target segment (consultants/agencies) is underserved by the current template catalogue.

## 28. Safe website claims

Directly evidenced and safe to state: "paste your URL, get an editable draft"; "you approve everything before it publishes"; "branching logic and weighted scoring"; "connect Squarespace once, then publish, update or remove with one button" (never "automatic" or "instant" for Squarespace specifically); "per-question drop-off analytics"; "5 quiz types, 16 templates, 8 editor blocks, 3 embed modes" (the product's own stated, code-derived counts); "CSV export on every paid plan"; "add-on lead and email capacity packs"; specific plan prices ($12/$19/$35 monthly, $9/$16/$29 annual) as long as they are sourced from the app/pricing page, never from the Stripe catalogue or the Phase 2 hypothesis figures.

## 29. Claims that must not be published

Per `docs/relaunch/SQUARESPELL_PHASE_2_PILOT_SPEC.md` §3.3, still valid and reconfirmed: no "build in 30 seconds" or fixed generation-time claims (no such guarantee exists in code); no "one click on every platform" (true only for the universal baseline, false for guided Squarespace, false for every other platform which isn't built); no "works everywhere automatically"; no unsupported conversion percentages; no customer/lead/completion counts (the database holds very few real leads); no "all-in-one marketing platform"; no "tested on all templates"; and — newly confirmed by this pass — no claim that scheduled follow-up emails, trial reminders or digests are currently being sent, since the infrastructure that would send them does not exist in the live hosting account.

## 30. Product demonstrations the new website should show

The URL-to-draft generation flow end to end; the branching/scoring demo (as already prototyped on the current homepage); the per-question drop-off funnel; the guided-once/one-button-after Squarespace Connect flow (with an honest "guided" label, never "instant"); the three embed modes on a real page; a lead landing in the dashboard in real time; and the add-on capacity packs as a real, live pricing mechanism.

## 31. Recommended future website information architecture

Home (the URL-to-draft promise) → Product (question types, logic/scoring, editor) → Templates (16, filterable by vertical) → Connect/Platforms (universal baseline first, guided Squarespace, roadmap for the rest, matching the platform-truthfulness rules already approved in Phase 2 §6.0) → Pricing (three live tiers + add-on packs; Founding Partner invitation once authorized) → Resources (migrated content from `squarespell.com` per the existing per-page destinations in the content inventory) → Support.

## 32. Evidence references

`backend/src/routes/quiz.ts`, `quizzesFromUrl.ts`, `extendedFeatures.ts`, `connect.ts`; `backend/src/services/questionTypes.ts`, `skipLogic.ts`, `questionAnalytics.ts`, `billingPlans.ts`, `claudeService.ts`, `brandScraper.ts`, integrations/*; `backend/src/middleware/planGuard.ts`; `backend/migrations/007, 008, 010, 011, 025, 032, 033`; `frontend/app/dashboard/_components/QuizBlockEditor.tsx`; `frontend/app/dashboard/quizzes/_components/NewQuizModal.tsx`, `quizTemplates.ts`; staging pricing and home pages (fetched live, 22 September 2026); `docs/relaunch/SQUARESPELL_PHASE_0_RESULTS.md`, `SQUARESPELL_PHASE_1_RESULTS.md`, `SQUARESPELL_PHASE_2_PILOT_SPEC.md`, `SQUARESPELL_ONE_BUTTON_CONNECT_SPEC.md`, `LEGACY_ENTITLEMENTS.md`, `SQUARESPELL_QUIZ_CONTENT_INVENTORY.csv`; this engagement's own earlier, first-hand staging walkthrough of the Sites/Connect dashboard (publish, update, move, pause, resume, remove, rollback, all personally exercised).

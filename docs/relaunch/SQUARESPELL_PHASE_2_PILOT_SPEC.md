# Squarespell Quiz - Phase 2 Pilot Specification (draft for owner approval)

Status: **FINAL SPECIFICATION - owner-approved 20 September 2026, with the final wording applied in this revision. Phase 2 itself is NOT complete.** Prepared 19 September 2026; **updated 20 September 2026 with the owner's decisions, corrections and approved terms (section 0)** on branch `p2/paid-pilot-spec` (documentation only). Sources: Relaunch Master Plan Revision 3.0 (sections 4-13), Phase 0 results (merged in PR #62) and the Phase 1 results in draft PR #63, which stays open, draft, unmerged and undeployed; its Hostinger-staging checks remain open for the staging phase.

Nothing here is implemented, published, sent, purchased or deployed. No outreach has been made and no prospect data is used. **Evidence labels:** *Verified* (observed in earlier phases), *Master plan* (Revision 3.0), *Recommendation* (this document's judgment), *Hypothesis* (to be tested in the pilot).

## 0. Owner decisions and corrections (20 September 2026)

### 0.1 Approved by the owner
- Squarespell Quiz is a **Squarespell Limited** product, and **`squarespellquiz.com`** is its domain.
- **Primary market:** consultants and boutique agencies. **Secondary market:** coaches and course creators.
- Positioning around **qualified enquiries and service matching**.
- **Pilot types:** Lead qualifier, Service finder, Assessment/scorecard.
- The **Connect website** wording, with truthful platform-specific steps; **universal publishing is the guaranteed baseline**.
- Plan-name system: **Build, Launch, Growth, Agency**.
- **Fourteen-day Growth trial without a card.**
- The event model and the **tenant-scoped privacy boundary**.
- Brand and landing-page direction **as a working specification**.
- Protection of the existing marketplace and the one-time/lifetime plugin.

### 0.2 Corrections applied in this revision
1. **Narrower pilot customer** - a consultant or boutique agency using Squarespell Quiz **on its own lead-generation website**; no client workspaces, white-label client management or large multi-site operations in the pilot (section 2.3).
2. **One Founding Partner offer** - Growth-level access at **$49 USD per month**, **limited to the first 10 accepted Founding Partners**; price fixed for six months from each partner's start date; paid monthly from the beginning; cancel anytime, no long-term contract; fourteen-day refund period on the first payment; personal onboarding; two feedback interviews; up to three of the customer's own websites; then the then-current Growth price with at least 30 days' notice. **No Agency plan in the pilot** (section 11.3). The $29 / $79 / $199 prices are **post-pilot hypotheses that still require validation** (section 7.2).
3. **Collected leads are never locked** - the lead-safety policy replaces every earlier "locked leads" statement. Approved grace allowances and the **anonymous, no-personal-information behaviour while collection is paused** are in section 7.4.
4. **Launch SEO reduced to 20 pages**; the 93-page map stays as a long-term, evidence-driven roadmap (section 10).
5. **Connector order** fixed: universal hosted link, iframe and script; guided Squarespace; WordPress; Shopify; Wix; Webflow; Framer (section 6.0).

### 0.3 Still open before any outreach
The specification is approved. Still open: **final terms/legal review of the refund, tax and cancellation wording before public publication** (no legal research has been done); a **public-information prospect list prepared for owner review** (the next Phase 2 task); authorization to contact anyone; five paying commitments; final acceptance tests; the Hostinger-staging checks carried from Phase 1. Details in sections 12 and 13. **Nothing has been sent, implemented, purchased or deployed.**

## 1. Identity and guardrails (confirmed by the owner)

- **Squarespell Limited** is the company and parent brand; **Squarespell Quiz** is a Squarespell product at **`squarespellquiz.com`** (approved domain; no further name or domain research).
- Squarespell Quiz is **platform-independent**. Squarespace is an acquisition channel and a supported platform, not the entire market.
- The long-term product can cover quizzes, assessments, lead qualification, recommendations, service matching and calculators. **The paid pilot stays narrow so it can launch quickly.**
- Product applications, databases, credentials, webhooks and analytics stay separate from the marketplace (Phase 0 section 1, as corrected). The existing one-time quiz plugin and everything on `squarespell.com` are untouched by this specification.

## 2. Lock the initial market

### 2.1 Evaluation (Recommendation, from the master plan's segments and Phase 0/1 evidence)

Ratings are qualitative judgments, not measurements. **There is no first-party demand data yet** (the database holds 9 users and 0 leads), so the ranking rests on the master plan's reasoning and on what a small team can reach quickly.

| Criterion | Consultants and boutique agencies | Coaches and course creators | Beauty, wellness, local | Professional services |
|---|---|---|---|---|
| Value of one lead | **High** (retainers, projects) | High (programs, cohorts) | Low to medium (appointments) | High, but regulated |
| Existing website | Yes, any platform | Yes, often Squarespace/WordPress | Yes, often with a booking tool | Yes |
| Understandable offer | **Yes** - packages and scopes are public | Yes | Yes | Mixed - eligibility rules are complex |
| Clear qualification or recommendation problem | **Yes** - "is this enquiry a fit?" and "which package?" | Yes - program fit, readiness | Yes - treatment finder, but the outcome is a booking in another tool | Yes, but wording limits apply to legal, health and finance topics |
| Needs catalog synchronization | **No** | No | Often (booking or product data) | No |
| Realistic path to five paying partners | **Strongest**: Squarespell's readers, designers, consultants and agencies (master plan section 11) | Good: existing coaching-focused articles and templates | Weaker: fragmented, low willingness to pay | Weaker: compliance review slows onboarding |
| Later opportunity | Boutique agencies may eventually bring client sites - a later Agency-plan capability, not part of the pilot | Simple funnels, fast learning | - | - |

### 2.2 Recommendation

- **Primary segment: consultants and boutique agencies** - independent consultants, fractional specialists and boutique studios of roughly 1-20 people (brand, web, marketing, operations, technology) that sell high-value services from an existing website and are overwhelmed by unqualified or unclear enquiries.
- **Secondary segment (one only): coaches and course creators** - program-fit, readiness and stage-finder experiences that end in a booking or a list join.
- **Not the initial target:** ecommerce catalogs (product finders need catalog sync), beauty, wellness and local services (booking integrations, lower lead value), professional services in regulated fields (stricter copy and review), enterprises, and "every small business".
- **Finding:** the current template catalog (16 templates) is mostly consumer and lifestyle (photography, restaurant, wedding, travel, skincare and similar). Only "Coaching Readiness" and "Video Brand Personality" fit the pilot segment, so the pilot needs a **curated vertical pack** for consultants and agencies (section 4.3). This is a build item, not research.

### 2.3 Initial customer definition (owner-approved correction)

The initial paid-pilot customer is **a consultant or boutique agency using Squarespell Quiz on its own lead-generation website.** The pilot does **not** promise full client workspaces, white-label client management or large multi-site operations; those remain **later Agency-plan capabilities**. The Founding Partner offer's "up to three sites" covers the customer's own properties (for example a main site, a landing-page site or a second brand), not client sites.

## 3. Lock the paid-pilot promise

### 3.1 Positioning statement (one statement for approval)

> **For consultants and boutique agencies who lose time to unqualified enquiries, Squarespell Quiz reads your existing website, drafts a lead-qualification or service-matching experience in your own words for you to review and edit, connects it to your site with the best method your platform supports, records every answer, outcome and consent, and shows which questions and outcomes lead to enquiries worth answering.**

### 3.2 The promise, broken down

| Part | What we promise |
|---|---|
| Who | Consultants and boutique agencies with an existing website; coaches and course creators second |
| Commercial problem | Too many unsuitable enquiries and unclear package choices, so sales time is wasted |
| How Squarespell learns | The customer enters their URL; Squarespell reads selected public pages and builds an **editable business profile with sources and confidence**; the customer corrects it. Nothing is invented and nothing is used without review. |
| What it generates | Questions, scoring or routing logic, outcomes and a call to action for a chosen goal, from an approved plan and a vertical playbook; every draft is editable and must be approved before publish |
| How it connects | **Connect website** - universal embed for every site, plus platform-specific steps described honestly in section 6, with automatic verification that the experience is live |
| How it captures and qualifies | Contact fields with consent, stored answers, outcome and qualification tags, tenant-private lead list, CSV export, webhook and one email/CRM path |
| Measurable result | The customer's **own** funnel: verified install, views, starts, completions, qualified leads, calls to action taken, and where visitors drop off - with recommendations tied to observed behaviour. **We promise measurement, not a percentage.** |

### 3.3 Claims we will not make

Do not use: "build in 30 seconds"; "one click on every platform"; "works everywhere automatically"; unsupported conversion percentages (the "40% / 73% / 4.1x" style figures); unsupported customer, lead or completion numbers; "all-in-one marketing platform"; "tested on all templates"; "median time to first quiz" statistics; time promises of any kind until the pilot measures them.

### 3.4 Claims we may make, and the evidence required first

| Claim | Evidence required |
|---|---|
| "Reads your website and drafts an editable profile" | Verified against the pilot (analysis-to-draft rate) |
| "You approve everything before it goes live" | Product rule (publish requires explicit approval) |
| "We tell you whether your embed is live" | Live verification implemented and tested per platform |
| "Your leads stay yours" | Tenant-isolation tests (already in PR #63) plus export and delete |
| A named result ("more qualified enquiries") | Only with a pilot customer's permission and their own data |

## 4. Lock the pilot experience types

### 4.1 Recommendation

| Type | Pilot decision | Why | Existing engine type (Verified) |
|---|---|---|---|
| **Lead qualifier** | **Ship - primary** | Directly reduces unsuitable calls; rules, disqualifiers, priority and routing | `client_qualifier` |
| **Service finder** | **Ship** | Helps visitors pick a package; shows commercial value beyond generic questions | `service_recommender` |
| **Assessment or scorecard** | **Ship** | Exchanges insight for details; strong lead magnet; scores by category with guidance | `lead_quiz` with scoring |
| Outcome quiz | Available as a template style inside the three above (stage finder, personality-style result); not marketed as a separate pilot product | Familiar to coaches; avoids a "generic quiz" positioning | `lead_quiz` |
| Product finder | **Defer** | Needs catalog attributes and commerce actions (deep synchronization) | not in pilot |
| Calculator | **Defer** | Formula design and quote routing need their own builder and testing; the current `price_calculator` type stays out of the pilot UI | `price_calculator` |
| Personalized survey | **Defer** | Research and aggregate insight are a later job | `segmentation_quiz` |

The pilot demonstrates commercial value through **qualification tags, disqualifiers, routing to a call to action, consent, and a funnel view** - not through question generation alone.

### 4.2 Minimum set of behaviours per shipped type

- **Lead qualifier:** required fields, disqualifying answers, priority score, three outcomes (ready, maybe, not a fit) with different calls to action, tags passed to the lead record and webhook.
- **Service finder:** preference and constraint questions, one recommended offer with the reason, a runner-up, and a primary call to action per offer.
- **Assessment or scorecard:** categories with score ranges, an overall result, category guidance and one next step; report delivered on screen and by email.

### 4.3 Curated pilot pack for the primary segment (to be built, Phase 4)

Client-fit qualifier; Service package finder; Website or marketing audit scorecard; Readiness assessment; Budget-and-timeline qualifier; Coaching program fit (secondary segment). Each has a vertical playbook (goal, question patterns, scoring, outcomes, call to action) and passes the generated-experience quality gates in the master plan (every path reaches a valid result; results explain why; one primary action).

## 5. Core customer journey (target flow)

Common rules for every stage: no endless loaders (each wait has a visible progress state, a cancel action and a timeout with a recovery path); no silent controls; every failure names what happened and offers a next step; every state works at 320px, at 200% zoom and by keyboard; nothing is published without the customer's explicit approval. Event names are defined in section 9.

**Stage 1 - Enter the website URL**
- *Inputs:* a URL (`https://` added if missing); optional extra pages (up to a small number chosen by the customer).
- *Output:* an accepted, normalised URL and a consent note that public pages will be read.
- *States:* **loading** - "Checking your site"; **success** - moves to analysis; **empty** - example URLs and a "start from a template instead" path; **failure** - unreachable, blocked by robots or login, redirects to a different domain, or not a website: plain explanation plus "enter a different URL" and "start from a template".
- *Validation:* syntactically valid; public host only (no private, localhost or internal addresses); rate-limited per account and per IP; refuse URLs the customer does not control only if abuse signals appear.
- *Recovery:* edit the URL, choose a template, or paste business details manually.
- *Events:* `site_analysis_started`, `site_analysis_failed` (with a reason code).
- *Acceptance:* invalid, private and unreachable URLs each show a specific message; a valid URL reaches Stage 2 or a clear failure within the timeout; no request is made to internal addresses.

**Stage 2 - Build the editable business profile**
- *Inputs:* pages read from the site (title, headings, offers, testimonials, calls to action, brand colours, fonts, logo).
- *Output:* a **business profile** - name, offer list, audience, tone, proof points, primary call to action, brand tokens - **each field with its source page and a confidence label**; unknown fields stay empty (never invented).
- *States:* **loading** - stepwise progress ("Reading pages", "Finding your offers"), cancel available; **success** - profile shown for review; **empty** - "We could not find enough on your site" with manual entry; **failure** - partial profile plus "continue manually".
- *Validation:* required minimum (business name, at least one offer, one call to action) before continuing; customer confirms the profile.
- *Recovery:* retry analysis, edit any field, add a page, or enter details manually.
- *Events:* `site_analysis_succeeded` (fields found, confidence bands), `profile_edited`, `profile_confirmed`.
- *Acceptance:* every field shows its source or "added by you"; nothing unavailable is fabricated; a customer can complete the profile with no site access at all.

**Stage 3 - Choose the commercial goal**
- *Inputs:* one goal from: qualify enquiries, recommend a package, assess readiness (plus a free-text refinement).
- *Output:* the chosen goal and the primary call to action (book a call, request a proposal, join a list).
- *States:* **loading** none; **success** - selected goal summary; **empty** - default suggestion from the profile; **failure** - not applicable (fallback to the default).
- *Validation:* exactly one primary goal; a call to action is required.
- *Recovery:* change the goal at any time before publish.
- *Events:* `goal_selected`.
- *Acceptance:* the goal drives the recommended type; the call to action appears on every outcome.

**Stage 4 - Recommend an experience type**
- *Inputs:* profile, goal, audience.
- *Output:* a recommended type (lead qualifier, service finder or assessment), a length, a one-line reason, and an override.
- *States:* **loading** brief; **success** recommendation with "why"; **empty** not applicable; **failure** - fall back to the goal-to-type default table.
- *Validation:* only shipped pilot types are offered.
- *Recovery:* override; the reason is shown either way.
- *Events:* `type_recommended`, `type_overridden`.
- *Acceptance:* the recommendation always includes an explanation and can be overridden in one action.

**Stage 5 - Generate questions, logic, outcomes and calls to action**
- *Inputs:* approved plan (profile, goal, type) plus the vertical playbook.
- *Output:* a draft with questions, choices, scoring or routing, outcomes with "why" text, calls to action, lead fields and consent text; **website-derived claims retain their sources for review**.
- *States:* **loading** - progress steps, elapsed time, cancel; **success** - draft opens in the editor; **empty** not applicable; **failure** - timeout, provider outage or invalid output.
- *Validation:* the draft is checked against a schema and the quality gates - every question advances an outcome; every reachable path returns a valid result; scores and recommendations agree; sensitive-topic copy stays within stricter limits.
- *Recovery:* retry once automatically with a bounded budget, then offer "use a curated template", "try again" and "start from blank"; **no unbounded retries and no repeat charge** for a failed or duplicate request.
- *Events:* `draft_generation_started`, `draft_generation_succeeded`, `draft_generation_failed`, `draft_generation_fallback_used` (with duration and cost class, never prompt text with personal data).
- *Acceptance:* generation either succeeds, or fails with a recovery choice, within the configured timeout; repeating the request does not duplicate the draft or the cost; the draft passes the validator before it is shown as ready.

**Stage 6 - Edit and preview**
- *Inputs:* the draft.
- *Output:* an edited, saved draft with a mobile and desktop preview in test mode.
- *States:* **loading** - editor skeleton; **success** - "Saved" indicator; **empty** - blank sections with guidance; **failure** - autosave failed banner with retry and local copy.
- *Validation:* required fields, valid logic (no dead ends, no unreachable outcomes), contrast and length limits; consent text present when leads are collected.
- *Recovery:* autosave with version history and restore; unsaved changes warning; conflict message on concurrent edits (optimistic locking already exists).
- *Events:* `editor_opened`, `draft_edited` (area only), `autosave_succeeded`, `autosave_failed`, `preview_opened` (device), `version_created`.
- *Acceptance:* an edit is saved and reopens unchanged; the preview is clearly labelled "test - responses are not recorded as leads"; validation errors point to the exact field.

**Stage 7 - Connect a website**
- *Inputs:* the site domain and platform (detected or chosen).
- *Output:* a connected site record with a status and the correct installation steps for that platform (section 6).
- *States:* **loading** - "Preparing your installation"; **success** - steps shown; **empty** - "No site connected yet" with the universal option; **failure** - authorization denied, unsupported plan or domain mismatch, each with a fix.
- *Validation:* domain ownership is proven by the live check in Stage 8, not assumed; only the customer's own account and sites are listed.
- *Recovery:* switch to the universal method at any point; disconnect and reconnect.
- *Events:* `site_connect_started`, `install_snippet_copied`.
- *Acceptance:* the steps shown match what the chosen platform actually permits (no wording implies automatic insertion where it is not supported).

**Stage 8 - Verify the live installation**
- *Inputs:* the connected site URL and the placement.
- *Output:* status **Verified**, **Awaiting installation** or **Needs attention**, with the checked URL and time.
- *States:* **loading** - "Checking your live page"; **success** - verified; **empty** - awaiting; **failure** - reasons such as code not found, page behind login, blocked script, wrong domain.
- *Validation:* the check loads the public page and looks for the experience element and loader, and accepts a first runtime ping from the correct domain.
- *Recovery:* re-check on demand and automatically for a period; targeted fix suggestions; a "test page" link.
- *Events:* `install_pending`, `install_verified`, `install_failed` (reason), `install_lost` (a previously verified install disappeared).
- *Acceptance:* Verified appears only after the live page or a runtime ping from the connected domain confirms it; a removed snippet flips the status within the monitoring interval.

**Stage 9 - Visitors complete the experience**
- *Inputs:* a visitor on the customer's page or the hosted link.
- *Output:* the visitor answers questions, sees a result and a call to action, and may give contact details with consent.
- *States:* **loading** - lightweight skeleton; **success** - result with reason and one action; **empty** not applicable; **failure** - offline or provider error: answers preserved locally, retry; a published experience never shows an endless loader.
- *Validation:* required fields, email format, consent checkbox with the stored consent text, bot protection, duplicate-submission protection.
- *Recovery:* resume a partial session; a repeated submission returns the same lead, not a duplicate.
- *Events:* `experience_viewed`, `experience_started`, `question_answered` (question id and position), `experience_completed`, `outcome_reached`, `cta_clicked`.
- *Acceptance:* runs at 320px and by keyboard; a visitor on a slow connection still completes; a repeated form submission never creates two leads.

**Stage 10 - Record leads, answers, outcomes and consent**
- *Inputs:* the visitor's submission.
- *Output:* a tenant-private lead record with answers, outcome, score or qualification tag, source, timestamp and the exact consent text shown.
- *States:* **success** - visible in the owner's Leads list; **empty** - "No leads yet" with the installation status; **failure** - clear error to the visitor and an owner alert if storage fails.
- *Validation:* the lead belongs to the experience's owner only; the monthly completion allowance is checked without breaking a published experience (section 7); **when new lead collection is paused (section 7.4) the lead form is not shown and no personal information is requested or transmitted.**
- *Recovery:* CSV export, deletion on request, webhook retry with backoff.
- *Events:* `lead_submitted`, `consent_recorded`.
- *Acceptance:* the owner sees the lead with answers, outcome and consent within moments; no other tenant can read it (tenant-isolation tests); export and delete work.

**Stage 11 - Useful analytics**
- *Inputs:* the events in section 9.
- *Output:* a funnel (views, starts, completions, leads, calls to action), per-question drop-off, outcome distribution, install status, source breakdown and version comparison.
- *States:* **loading** skeleton; **success** charts and numbers; **empty** - explains what is missing ("not verified yet", "no visits yet"); **failure** - stale-data notice.
- *Validation:* small samples are labelled; no percentage is shown without its count.
- *Recovery:* date-range and experience filters; export.
- *Events:* `analytics_viewed`.
- *Acceptance:* every number is traceable to recorded events; an empty state explains why; nothing looks better than the data supports.

**Stage 12 - Evidence-based improvements**
- *Inputs:* funnel events and version history.
- *Output:* prioritised recommendations ("question 3 loses many visitors - consider shortening it") with an evidence label and sample size; creation of a new draft version in a single action.
- *States:* **success** recommendations; **empty** - "Not enough data yet" with the threshold; **failure** - silently omitted, never invented.
- *Validation:* a recommendation appears only above a minimum sample and shows the numbers behind it.
- *Recovery:* dismiss, snooze or apply; applying creates a version that can be compared and restored.
- *Events:* `recommendation_shown`, `recommendation_applied`, `recommendation_dismissed`, `version_published`, `version_restored`.
- *Acceptance:* no recommendation is shown below the sample threshold; each cites its evidence; applying one never changes a published experience without approval.

## 6. The truthful connection promise

The button says **Connect website** on every platform. What follows must state exactly what that platform permits. Universal publishing is the guaranteed baseline. **Verified** means the live page (or a runtime ping from the connected domain) confirms the experience is present. Platform limitations come from the official documentation reviewed in Phase 0 and are re-checked before each connector ships.

### 6.0 Connector order and advertising rule (owner-approved)

| Order | Connector | Pilot status | Advertising rule |
|---|---|---|---|
| 1 | Universal **hosted link, iframe and script** | **In the pilot - guaranteed baseline** | Advertise |
| 2 | **Guided Squarespace installation and verification** | **In the pilot** - for the existing Squarespace audience | Advertise as *guided*; never imply Squarespace allows automatic page insertion |
| 3 | WordPress plugin and block | After the pilot | **Do not advertise as available** until it works and has completed the necessary review |
| 4 | Shopify app and theme extension | After pilot evidence | **Do not advertise as available** until it works and has completed App Store review |
| 5 | Wix | Later | Not advertised |
| 6 | Webflow | Later | Not advertised |
| 7 | Framer | Later | Not advertised |

Guided Squarespace support can be available in the pilot **without pretending Squarespace permits automatic insertion**: the customer places a supported Code Block or Code Injection snippet, and Squarespell generates it, guides each step and verifies the live result.

### 6.1 Universal HTML and custom websites (pilot - guaranteed baseline)

| Item | Specification |
|---|---|
| Authorization | None |
| Installation method | Share the **hosted link**, use an **iframe**, or copy the **script** (an element plus a loader) into the page or template; placement options: inline, popup, floating button, direct link |
| Customer action | Paste the snippet and publish the site (2 to 4 steps) |
| Automated action | Generate the snippet, check the domain, monitor the page |
| Live verification | Load the page and find the element and loader; accept the first runtime ping from the connected domain |
| Disconnect and recovery | Delete the snippet; the status becomes "Needs attention" then "Disconnected"; warn about content-security-policy and consent-manager blocking |

### 6.2 Squarespace (pilot: guided installation and verification)

| Item | Specification |
|---|---|
| Authorization | Optional connection of the site for identification; **Squarespace's documented public APIs do not permit inserting content into an ordinary page layout**, so there is no silent insertion |
| Installation method | The correct snippet for a **Code Block** (page inline) or **Code Injection** (site-wide); both need a Squarespace plan that allows custom code (Core, Plus, Advanced or a legacy Business plan - re-verify before publishing this copy) |
| Customer action | Copy the snippet, open the page editor, add a Code Block or open Code Injection, paste, save (5 to 8 steps) |
| Automated action | Identify the site, generate the correct snippet for 7.1 or 7.0, guide each step with screenshots, verify installation |
| Live verification | Page check as in 6.1 |
| Disconnect and recovery | The customer removes the snippet; the status flips on the next check; unpublishing the experience shows a graceful "temporarily unavailable" state. Squarespace support does not cover custom code; say so |

### 6.3 WordPress (after the pilot; not advertised until it works and passes review)

| Item | Specification |
|---|---|
| Authorization | Application password pairing over HTTPS (WordPress 5.6+) |
| Installation method | A dedicated Squarespell Quiz plugin with a block and a shortcode; wordpress.org review adds about two weeks; self-distribution is possible |
| Customer action | Install and activate the plugin, connect the account, pick an experience, place the block (4 to 6 steps) |
| Automated action | Pairing, experience picker, settings sync, live check |
| Live verification | Front-end page check as in 6.1 |
| Disconnect and recovery | Deactivate or uninstall the plugin (uninstall hook); revoke the pairing; the status updates on the next check |

### 6.4 Shopify (after pilot evidence; not advertised until it works and passes review)

| Item | Specification |
|---|---|
| Authorization | OAuth for an approved app |
| Installation method | Theme app extension: an app block for inline placement and an app embed for popup or floating button; public listing needs App Store review |
| Customer action | Install the app, open the theme editor through a deep link, add the block or enable the embed, save (4 to 7 steps). **Apps cannot add blocks automatically.** |
| Automated action | OAuth, deep link, block code, uninstall webhook, live check |
| Live verification | Storefront page check; not available on checkout pages |
| Disconnect and recovery | Uninstall the app; blocks left in the theme stop working and the status shows "Needs attention" |

### 6.5 Wix, Webflow and Framer (later; each after its own review)

| Platform | Authorization | Installation method | Customer action | Automated action | Verification | Disconnect and recovery |
|---|---|---|---|---|---|---|
| Wix | OAuth | Wix app: embedded script (site-wide, automatic) or site widget (draggable, cannot be pinned); manual HTML embed or Custom Code otherwise; App Market review | Install, place or confirm placement, publish (3 to 7 steps) | Register the script, dynamic parameters | Page source check | Uninstall; manual snippets are deleted if the domain changes |
| Webflow | OAuth (custom code needs an app token) | Data-client app registers a script for a site or page; manual Code Embed otherwise; Marketplace review for public use | Authorize, choose scope, publish the site (4 to 6 steps) | Register and apply scripts, read them back | Published page check | Remove scripts with write scope, republish |
| Framer | Editor plugin (no separate authorization) | Plugin custom code or an Embed component; plugin listing rules unconfirmed | Run the plugin in the editor, position, publish (4 to 6 steps) | Set custom code, insert component | Read custom code, page check | Clear the code; a user-disabled snippet cannot be re-enabled by the plugin |

### 6.6 Connected Sites states and copy rules

States: **Not connected**, **Awaiting installation**, **Verified**, **Needs attention** (with the reason), **Disconnected**. Copy rules: never say "automatically", "instantly" or "one click" unless that exact platform path is proven; always show the number of remaining steps; always offer the universal method; state plan requirements and support boundaries. **Every platform page states its real availability (Available, Planned or Later).** The WordPress page may explain the planned plugin and offer the current universal installation method, but must never imply the plugin already exists.

## 7. Pilot pricing, limits and plan naming (Recommendation - Stripe is not changed)

### 7.1 One naming system

Three names exist today: Stripe holds **Starter, Pro, Agency** (created 6 April 2026); the application uses **Core, Pro, Business** (plus legacy aliases); the master plan proposes **Free/Build, Launch, Growth, Agency**.

**Recommendation: use the master plan's names - Build, Launch, Growth, Agency - everywhere.** Reasons: they describe progression (build it, launch it, grow it); "Core" and "Business" collide with Squarespace's own plan names (Core, Plus, Advanced, Business), which would confuse the acquisition channel and the plan-requirement copy in section 6.2; "Starter/Pro" are generic; one system removes the three-way mismatch.

| Marketing name | Internal plan key | Legacy application key | Stripe today (do not change now) |
|---|---|---|---|
| **Build** | `build` | `free` | none |
| **Launch** | `launch` | `starter`, `core` | Starter ($19 monthly, $180 yearly) - not reused |
| **Growth** | `growth` | `pro` | Pro ($39, $372) - not reused |
| **Agency** | `agency` | `agency`, `business` | Agency ($79, $756) - not reused |

Existing accounts (Verified): 8 on `free` map to Build; 1 manually assigned `agency` account stays as it is until the owner decides. Entitlements are derived from the internal plan key held in the application, never from a Stripe amount; a missing key-to-price mapping fails clearly (already implemented in draft PR #63).

### 7.2 Post-pilot price hypotheses (USD; still require validation)

| Plan | Monthly | Annual (per month, billed yearly) | Annual total | Annual saving |
|---|---|---|---|---|
| Build | $0 | $0 | $0 | - |
| Launch | **$29** | **$23** | $276 | about 20% |
| Growth | **$79** | **$63** | $756 | about 20% |
| Agency | **$199** | **$159** | $1,908 | about 20% |
| Enterprise | custom | custom | custom | later, on demand |

These are the master plan's hypotheses. They are **post-pilot pricing hypotheses that still require validation**: they stay unconfirmed until the pilot shows willingness to pay, AI cost and support cost per activated customer (master plan economics dashboard). **During the pilot the only paid offer is the Founding Partner offer (section 11.3); the Agency plan is not offered because client workspaces and multi-site management are not ready.**

### 7.3 Trial structure

- **Self-serve:** Build is free permanently. Every new account also gets a **14-day Growth trial, no card required**, matching the trial already built and quoted on the public pages (the sign-up page's "7 days" wording was corrected in PR #63). When the trial ends the account moves to **Build and is never locked out**; live experiences above Build's limit become **paused for new visitors** (kept and editable by the owner; results and leads stay visible and exportable), not deleted. *This replaces the current behaviour in which an expired free account cannot publish or capture leads; it is a later implementation item.*
- **Design partners:** paid monthly from the beginning (no trial) under the owner-approved Founding Partner offer, with a fourteen-day refund period on the first payment (section 11.3).

### 7.4 Limits and entitlements (Recommendation; proposals marked *)

| | Build | Launch | Growth | Agency |
|---|---|---|---|---|
| Live experiences | 1 | 3 | 10 | 50 |
| Completions per month (one account-wide meter) | 25 | 300 | 2,000 | 10,000 |
| Connected sites | 1 | 1 | 3* | 25* client sites (a later Agency capability, not offered in the pilot) |
| Seats | 1 | 1 | 2* | 5* |
| Full AI drafts per month* | 3 | 15 | 40 | 150 (pooled) |
| AI edit suggestions | fair use | fair use | fair use | fair use |
| Branding | "Made with Squarespell Quiz" shown | shown (small) | removable | removable; client-facing white label later |
| Connectors | Universal HTML, Squarespace guided; WordPress and Shopify as released - all plans | same | same | same |
| Verified-install monitoring | yes | yes | yes | yes |
| Analytics | essential funnel | essential funnel + per-question drop-off | advanced: outcomes, sources, versions, recommendations | advanced + roll-up across client sites |
| Lead export | CSV | CSV | CSV | CSV |
| Webhook | no | yes | yes | yes |
| Email or CRM integration | no | no | one path (the single highest-demand path) | all shipped paths |
| Support | help centre | email | email, faster | priority |

**The completion meter.** A completion is a visitor who reaches the result screen. Views and starts are not metered (fair use only). Usage is visible before checkout and in the dashboard.

**AI rules.** A full draft (or full regeneration) uses one AI draft; small edit suggestions are fair use. Each plan has a monthly AI budget with spend alerts; failed or duplicate requests are not charged to the customer; cost per published experience is tracked (master plan section 7).

**Lead-safety policy when limits are reached (owner-approved principle: customer data is never held hostage for an upgrade).**
1. **Previously collected leads, answers, results and quizzes always remain visible and exportable** (CSV), on every plan, after any downgrade, and after collection is paused. **Nothing is deleted** because a limit is reached. Leads are never hidden, masked or held back.
2. **Approved grace allowances** (completions per month, after the included allowance):

| Plan | Included | Grace | Total before collection pauses | 80% of included | 80% of grace |
|---|---|---|---|---|---|
| Build | 25 | **5** | 30 | 20 | 4 |
| Launch | 300 | **30** | 330 | 240 | 24 |
| Growth | 2,000 | **200** | 2,200 | 1,600 | 160 |
| Agency | 10,000 | **1,000** | 11,000 | 8,000 | 800 |

3. **Warnings, in the app and by email,** each stating how many completions remain and exactly what happens next: at **80% of the included allowance**; at **100% of the included allowance** (grace begins); at **80% of the grace allowance**; and **before collection pauses** (when the last grace completion is about to be used), plus a confirmation when it pauses.
4. **Paused-collection behaviour - no personal information is ever collected and discarded.** After the grace allowance is exhausted, new lead collection pauses until the customer upgrades or the monthly allowance resets. While it is paused: the interactive experience **may continue operating anonymously**; visitors can complete it and **view their result** (and the result's call to action); **the lead form is not displayed**; **no personal information is requested or transmitted**; only anonymous, non-personal funnel counts continue; **previously collected leads remain visible and exportable**; the account owner sees a **clear warning that new lead collection is paused**; **collection resumes after upgrading or when the monthly allowance resets**; **nothing is deleted or held hostage.**
5. Live-experience and site limits are enforced at publish time with an upgrade prompt; experiences already published are not switched off mid-month.
6. Optional overage packs may be added after cost data exists (not priced here).

**Not promised until verified:** Zapier and API-key access (the code exists but appeared unmounted in Phase 1); A/B testing (a later feature).

### 7.5 Owner-approval notes

Stripe is changed only after approval, in a controlled step: new products named "Squarespell Quiz - Launch/Growth/Agency" with monthly and annual prices, metadata (`product=squarespell_quiz`, `plan_key`, `interval`), a separate webhook endpoint, and internal entitlement mappings. The six existing Stripe products stay untouched until an owner-approved archive. The marketplace payment setup and its WooCommerce webhook are never touched.

## 8. Product and design structure

### 8.1 Pilot release scope (Recommendation, from the master plan's "pilot release" list)

**In the paid pilot:** website analysis with an editable, source-aware profile; goal selection and recommended type; AI draft plus the curated pilot pack; a reliable editor (content, logic, outcomes, style, lead fields) with autosave, validation, recovery and desktop and mobile preview; direct link, inline, popup and floating-button installs; the universal runtime with live-domain verification; the Squarespace guided install; lead capture with consent, CSV, webhook and **one** email/CRM path; core funnel and drop-off analytics; the Stripe subscription lifecycle and usage visibility; retry, cancel, timeout and template fallback.
**After pilot evidence:** WordPress plugin, Shopify extension, branded reports, deeper integrations, agency workspaces, A/B testing and AI optimization, other native connectors, team roles and localization. **Client workspaces, white-label client management and large multi-site operations are later Agency-plan capabilities and are not promised in the pilot.**
**Deferred:** replacing Clerk; building an email platform or CRM; dozens of formats; browser automation on customer sites; enterprise procurement; a large generic template library.

### 8.2 Navigation and page specifications

**Public site navigation:** Product, Solutions, Platforms, Industries, Resources, Pricing, Sign in, **Start free**. Footer: company (Squarespell Limited), a "Squarespell product" line, security, privacy, terms, contact, support, status.
**Application navigation:** Home, Experiences, Leads, Analytics, Connected Sites, Integrations, Billing and usage, Settings. The Editor opens full-screen from an experience.

| Area | Purpose | Primary action | Required states | Mobile behaviour | Accessibility |
|---|---|---|---|---|---|
| Public landing page | Explain the value and start an analysis | **Analyse my website** | default, URL error, loading, offline; honest platform table | single column, sticky primary button, table becomes stacked cards | headings in order, focus ring, 4.5:1 contrast, no motion-only meaning |
| Dashboard (Home) | Activation checklist, performance, attention items | **Create an experience** (or the next checklist step) | new account, in progress, healthy, needs attention, limit warning | cards stack; checklist first | landmark regions, readable status text (not colour alone) |
| Experiences list | Drafts and published items with type, site, status, completions | **New experience** | empty, loading, filtered-empty, error, paused | card list with the status badge and one overflow menu | list semantics, labelled menus, keyboard row actions |
| Editor | Edit content, logic, outcomes, design, lead fields; preview; publish | **Publish** (disabled with the reason until valid) | loading, saved, saving, autosave failed, validation errors, conflict, preview test mode | bottom tab bar for sections; preview as a full-screen sheet | keyboard-complete, logic map with a text alternative, error summary linked to fields |
| Connected Sites | Domains, platform, placements, verification, disconnect | **Connect website** | none, awaiting, verified, needs attention, disconnected | steps as an accordion | step list with progress text; status not by colour alone |
| Leads | Responses, qualification, consent, export, deletion | **Export CSV** | empty (with install status), loading, error, collection paused (existing leads stay visible and exportable) | list with a detail sheet | table headers, accessible export and delete confirmation |
| Analytics | Funnel, drop-off, outcomes, actions, sources, versions | change the date range or experience | empty (explains why), loading, low-sample, stale | charts collapse to ranked lists | every chart has a data table alternative |
| Integrations | Webhook, email/CRM, analytics hooks | **Add a webhook** | not connected, connected, failing (with retries), disabled | single column | secrets never displayed after saving; test button with a result message |
| Billing and usage | Plan, usage meters, invoices, upgrade | **Upgrade** (when near a limit) | trial, active, past due, limit reached, cancelled | meters stack | meters expose value and limit as text |
| Settings | Brand profiles, team, domains, security, privacy, data export and deletion | save changes | unsaved changes, saved, error | sections as a list | labels, autocomplete attributes, destructive actions confirmed |

### 8.3 Visual direction (Recommendation for owner approval; not final brand artwork)

Calm, credible and editorial - a tool a consultant would trust with client work. Neutral ink-on-paper base, one confident accent colour, generous spacing, restrained motion, real content in every demo (no lorem ipsum, no invented testimonials). The parent brand appears as "A Squarespell product". Light and dark themes with the same tokens. Typography: one humane sans for interface and body, one optional serif for headline accents; sizes from a fixed scale; line length limited for readability. Sample-data screenshots must be labelled as examples.

### 8.4 Reusable design components (to be specified visually in the design phase)

Button set; form field with helper and error text; step tracker; status badge (install and publish states); profile field with a source chip and confidence label; experience card; logic map viewer; question and choice editor; outcome card with a "why" field; device preview frame with a test-mode banner; usage meter; empty state; error banner with a recovery action; toast; data table with export; funnel chart; drop-off list; evidence label; platform step list; snippet copy box with a verify button; pricing table; consent block.

### 8.5 Accessibility and performance bar (master plan, section 9)

320px reflow and 200% zoom; keyboard-complete; WCAG 2.2 AA contrast and visible focus; minimum target size; reduced-motion respected; no silent controls or endless loaders; performance budgets for the marketing pages and the embed runtime; clear draft, preview, published and test-response states.

### 8.6 Landing page copy (draft, for approval)

**Header:** Product - Solutions - Platforms - Industries - Resources - Pricing - Sign in - **Start free**

**Hero:** *Turn your website into a lead-qualifying experience.*
Squarespell Quiz reads your existing website, drafts a quiz, assessment or service finder in your own words, and shows you which answers lead to enquiries worth answering. You review every draft before it goes live.
**[Analyse my website]** **[See an example]** - Free to start. No card needed.

**How it works**
1. *Enter your website.* We read your public pages and build a business profile you can correct - every detail shows where it came from.
2. *Choose your goal.* Qualify enquiries, recommend a package, or assess readiness.
3. *Review and edit.* We draft the questions, logic, results and next step. Change anything, preview on desktop and phone.
4. *Connect and measure.* Add it to your site and see when it is live, who completes it, and where people drop off.

**What you can build**
- *Lead qualifier* - separate serious enquiries from the rest and send each to the right next step.
- *Service finder* - help visitors choose the package that fits, with the reason.
- *Assessment* - give visitors a useful score and a clear next step in exchange for their details.

**Made for people who sell services.** Consultants, freelancers and boutique agencies - and coaches and course creators - who already have a website and want better conversations, not more form fills.

**Connect it honestly.** *Any website:* copy one snippet or share a link. *Squarespace:* we generate the right code, guide you through placing it, and check that it is live - Squarespace does not let apps add it for you. *WordPress and Shopify:* use the snippet today; dedicated tools are planned and are not yet available. We tell you exactly what each step involves before you start.

**Your leads stay yours.** Answers, outcomes and consent are recorded for you only. Export or delete them whenever you like. We do not reuse your private content.

**Measure what works.** See views, completions, leads and calls to action, the question where people leave, and suggestions based on what your visitors actually do.

**Pricing.** Start free with Build, or ask about the **Founding Partner invitation - $49 a month** (limited to the first 10 accepted partners). Regular Launch, Growth and Agency plans are coming after the paid pilot. Prices are shown in USD. Any applicable taxes will be displayed at checkout. [See pricing]

**FAQ**
- *Do I need to code?* No. Websites that allow custom code can use the snippet we generate.
- *Will it work on my platform?* Every website can use the snippet or link. Some platforms need a paid plan that allows custom code - we tell you which before you start.
- *Do you write things I did not approve?* No. You review and approve everything, and we show where website details came from.
- *What happens if I reach my limit?* Your existing quizzes, results and leads always stay visible and exportable, and nothing is deleted. We warn you well before your limit and allow a small grace allowance. Only then does new lead collection pause: visitors can still complete the experience and see their result, but no lead form is shown and no personal information is requested. Collection resumes when you upgrade or your monthly allowance resets.
- *Who owns the leads?* You do.
- *Is Squarespell Quiz part of Squarespell?* Yes. Squarespell Limited builds and runs it.

**Final call to action:** *See what your website could ask.* **[Analyse my website]**
**Footer:** Squarespell Quiz - a Squarespell product. Security - Privacy - Terms - Contact - Support - Status

## 9. Analytics and event model

### 9.1 Principles

Events describe **what happened**, not who someone is. They carry identifiers and classes, never free-text answers, contact details or private content. Preview and test-mode events are flagged (`environment=test`) and excluded from every metric. Raw leads, answers and private content stay tenant-scoped.

**Common properties on every event:** `event_id`, `occurred_at`, `tenant_id`, `experience_id`, `version_id` (when applicable), `site_id` (when known), `visitor_session_id` (random, per experience, not linked across sites; visitor events only), `source` (hosted link, embed, preview), `device_class`, `plan_key`, `environment` (live or test).

### 9.2 Event dictionary (minimum for the pilot)

| Area | Event | Fired when | Extra properties |
|---|---|---|---|
| Website analysis | `site_analysis_started` | a URL is submitted | domain class, pages requested |
| | `site_analysis_succeeded` | a profile is produced | fields found, confidence bands, duration |
| | `site_analysis_failed` | analysis ends without a profile | reason code, duration |
| Draft generation | `profile_confirmed` | the customer confirms the profile | fields edited count |
| | `goal_selected`, `type_recommended`, `type_overridden` | choices are made | goal, type |
| | `draft_generation_started` | generation is requested | request id (idempotency), type |
| | `draft_generation_succeeded` | a valid draft is produced | duration, cost class, question count |
| | `draft_generation_failed` | generation fails or times out | reason code, duration |
| | `draft_generation_fallback_used` | a template fallback is used | template id |
| Editing | `editor_opened`, `draft_edited` | the editor opens; an edit is made | area (content, logic, outcome, style, lead fields) |
| | `autosave_succeeded`, `autosave_failed` | autosave result | reason code |
| Preview | `preview_opened` | preview opens | device |
| Publish | `experience_published`, `experience_paused` | publish state changes | placement types |
| Installation | `site_connect_started`, `install_snippet_copied` | the connect flow starts; the snippet is copied | platform |
| | `install_pending`, `install_verified`, `install_failed`, `install_lost` | verification outcomes | platform, method, reason code, time since publish |
| Visitor funnel | `experience_viewed` | the experience is displayed | referrer class, page host |
| | `experience_started` | the first question is answered | - |
| | `question_answered` | a question is answered | question id, position, time on question |
| | `experience_completed` | the result screen is reached | duration, question count |
| | `outcome_reached` | an outcome is shown | outcome id, qualification tag |
| | `lead_submitted` | contact details are submitted | fields present (flags only), qualified flag |
| | `consent_recorded` | consent is given | consent text version |
| | `cta_clicked` | the call to action is clicked | cta id, outcome id |
| Drop-off | `experience_abandoned` | derived: a session with no activity for the timeout | last question id and position |
| Versions | `version_created`, `version_published`, `version_restored` | version changes | version id, change summary class |
| Optimization | `recommendation_shown`, `recommendation_applied`, `recommendation_dismissed` | recommendations | recommendation id, sample size |
| Usage | `usage_warning_shown`, `limit_reached`, `lead_collection_paused`, `lead_collection_resumed` | meters cross thresholds (80% included, 100% included, 80% grace, before pause); collection pauses or resumes | meter, percent, plan key |

### 9.3 Minimum dashboard metrics

*Owner-facing:* verified-install status and time to verification; views, starts, completions and leads with counts and rates; qualified-lead share; call-to-action clicks; median time to complete; **per-question drop-off**; outcome distribution; source or referrer breakdown; **version comparison**; usage against limits. Every percentage shows its count; small samples are labelled.
*Internal (Squarespell) pilot scorecard:* analysis to editable draft; draft to publish; publish to verified install; time to first real completion; qualified lead or call-to-action rate; 30-day active retention; AI cost per published experience; infrastructure cost per 1,000 completions; support minutes by platform.

### 9.4 Privacy boundary

Lead records, answers, consent text and private content are tenant-scoped and never mixed across tenants; analytics events hold ids and classes only. Visitor session ids are random and per experience (no cross-site tracking); IP addresses are not stored in raw form (truncate or hash - proposal). Owners can export and delete their data. Only **aggregate, de-identified structural patterns** (for example which question shapes perform) may improve the product, and only where the terms and consent allow; private copy is never reused. Retention periods are a proposal to be set with the privacy policy.

## 10. SEO architecture for `squarespellquiz.com` (a plan only - nothing is published, moved, canonicalised or redirected)

The new domain gets its own sitemap, robots configuration, canonicals, structured data, Search Console and Bing properties and GA4 property, created later after DNS verification is authorized. It builds its own platform-neutral authority around quizzes, assessments, product finders, calculators, recommendations and lead qualification. Platform pages state exact steps and limits (section 6). Deferred experience types (product finder, calculator, survey) get pages only when the capability exists, so the site never claims what the product cannot do.

### 10.1 Launch wave - 20 excellent pages (owner-approved reduction to 15-20 pages)

**Launch discipline.** No thin, repetitive or AI-generated pages are published merely to reach a page count. Every launch page has a single job, real content, a real screenshot or sample, an owner and a review before publish. Pages are combined where a separate page would be thin. Later pages are added only when evidence (search demand, customer questions, connector availability, pilot results) supports them, and a connector page is published as "available" only when that connector works and has completed any required review. Every platform page states its real availability.

| # | Path | Launch page | How it is kept lean |
|---|---|---|---|
| 1 | `/` | Homepage | one page, one job |
| 2 | `/product/how-it-works` | How it works (covers website analysis, editing and publishing in one page) | one page, one job |
| 3 | `/product/ai-creation` | AI creation | one page, one job |
| 4 | `/solutions/lead-qualification` | Lead qualification | one page, one job |
| 5 | `/solutions/service-finder` | Service finder | one page, one job |
| 6 | `/solutions/assessments-and-scorecards` | Assessments and scorecards | one page, one job |
| 7 | `/platforms` | Connect your website (hub; also covers the universal hosted link, iframe and script) | combines "Connect website" and "Universal HTML/custom websites" |
| 8 | `/platforms/squarespace` | Squarespace (guided installation and verification) | one page, one job |
| 9 | `/platforms/wordpress` | WordPress (states its real availability: the planned plugin is explained, the current universal installation method is offered, and the plugin is never implied to exist) | one page, one job |
| 10 | `/industries/consultants-and-boutique-agencies` | Consultants and boutique agencies | combines "Consultants" and "Agencies" |
| 11 | `/industries/coaches-and-course-creators` | Coaches and course creators | one page, one job |
| 12 | `/templates` | Templates (one hub showing the pilot pack; no separate template pages at launch) | one page, one job |
| 13 | `/examples` | Examples (labelled samples until real, permission-based examples exist) | one page, one job |
| 14 | `/integrations` | Integrations overview (webhook, CSV, the one email/CRM path) | one page, one job |
| 15 | `/pricing` | Pricing (pilot launch: the Build plan and the $49/month Founding Partner invitation; regular Launch, Growth and Agency plans are announced only as coming after the paid pilot; no unfinished Agency features advertised) | one page, one job |
| 16 | `/resources` | Blog and resources hub | one page, one job |
| 17 | `/security` | Security and privacy overview | one page, one job |
| 18 | `/privacy` | Privacy policy | one page, one job |
| 19 | `/terms` | Terms | one page, one job |
| 20 | `/contact` | Contact and support | combines "Contact" and "Support" (a dedicated /support help centre follows in Wave 2) |

### 10.2 Long-term roadmap - 93 pages (Wave 1: 20; Wave 2: 30; Wave 3: 43)

The full map is kept as a **long-term roadmap, not a launch commitment**. Wave 2 follows the pilot evidence; Wave 3 is later and evidence-driven.

| Section | Wave 1 (launch) | Wave 2 (after pilot evidence) | Wave 3 (later, evidence-driven) | Total |
|---|---|---|---|---|
| Homepage | 1 | 0 | 0 | 1 |
| Product | 2 | 5 | 1 | 8 |
| Experience types | 3 | 1 | 3 | 7 |
| Platforms | 3 | 2 | 3 | 8 |
| Industries | 2 | 1 | 3 | 6 |
| Templates | 1 | 6 | 16 | 23 |
| Examples | 1 | 1 | 2 | 4 |
| Integrations | 1 | 3 | 1 | 5 |
| Pricing | 1 | 0 | 0 | 1 |
| Resources | 1 | 3 | 2 | 6 |
| Documentation | 0 | 5 | 7 | 12 |
| Comparisons | 0 | 0 | 4 | 4 |
| Company | 4 | 3 | 1 | 8 |
| **Total** | **20** | **30** | **43** | **93** |

#### Every roadmap page

| Path | Page | Wave |
|---|---|---|
| `/` | Homepage | 1 |
| `/product/how-it-works` | How it works (covers website analysis, editing and publishing in one page) | 1 |
| `/product/ai-creation` | AI creation | 1 |
| `/product/website-analysis` | Website analysis (detail page) | 2 |
| `/product/editor-and-logic` | Editor and logic | 2 |
| `/product/publishing-and-verification` | Publishing and verification | 2 |
| `/product/lead-capture-and-consent` | Lead capture and consent | 2 |
| `/product/analytics-and-optimization` | Analytics and optimization | 2 |
| `/product/outcomes-and-scoring` | Outcomes and scoring | 3 |
| `/solutions/lead-qualification` | Lead qualification | 1 |
| `/solutions/service-finder` | Service finder | 1 |
| `/solutions/assessments-and-scorecards` | Assessments and scorecards | 1 |
| `/solutions/outcome-quizzes` | Outcome quizzes | 2 |
| `/solutions/product-finder` | Product finder | 3 |
| `/solutions/calculators` | Calculators | 3 |
| `/solutions/surveys` | Personalized surveys | 3 |
| `/platforms` | Connect your website (hub; also covers the universal hosted link, iframe and script) | 1 |
| `/platforms/squarespace` | Squarespace (guided installation and verification) | 1 |
| `/platforms/wordpress` | WordPress (states its real availability: the planned plugin is explained, the current universal installation method is offered, and the plugin is never implied to exist) | 1 |
| `/platforms/html` | Any website (HTML) - dedicated detail page | 2 |
| `/platforms/shopify` | Shopify (published only when the connector works and is reviewed) | 2 |
| `/platforms/wix` | Wix | 3 |
| `/platforms/webflow` | Webflow | 3 |
| `/platforms/framer` | Framer | 3 |
| `/industries` | Industries hub | 2 |
| `/industries/consultants-and-boutique-agencies` | Consultants and boutique agencies | 1 |
| `/industries/coaches-and-course-creators` | Coaches and course creators | 1 |
| `/industries/beauty-wellness-local` | Beauty, wellness and local services | 3 |
| `/industries/professional-services` | Professional services | 3 |
| `/industries/ecommerce` | Ecommerce | 3 |
| `/templates` | Templates (one hub showing the pilot pack; no separate template pages at launch) | 1 |
| `/templates/client-fit-qualifier` | Pilot template: client fit qualifier | 2 |
| `/templates/service-package-finder` | Pilot template: service package finder | 2 |
| `/templates/website-audit-scorecard` | Pilot template: website audit scorecard | 2 |
| `/templates/readiness-assessment` | Pilot template: readiness assessment | 2 |
| `/templates/budget-and-timeline-qualifier` | Pilot template: budget and timeline qualifier | 2 |
| `/templates/coaching-program-fit` | Pilot template: coaching program fit | 2 |
| `/templates/photography-style` | Existing catalog template: photography style | 3 |
| `/templates/restaurant-menu` | Existing catalog template: restaurant menu | 3 |
| `/templates/fitness-goal` | Existing catalog template: fitness goal | 3 |
| `/templates/product-finder` | Existing catalog template: product finder | 3 |
| `/templates/wedding-style` | Existing catalog template: wedding style | 3 |
| `/templates/coaching-readiness` | Existing catalog template: coaching readiness | 3 |
| `/templates/home-style` | Existing catalog template: home style | 3 |
| `/templates/skincare-routine` | Existing catalog template: skincare routine | 3 |
| `/templates/creative-archetype` | Existing catalog template: creative archetype | 3 |
| `/templates/creator-personality` | Existing catalog template: creator personality | 3 |
| `/templates/home-buyer` | Existing catalog template: home buyer | 3 |
| `/templates/travel-style` | Existing catalog template: travel style | 3 |
| `/templates/impact-path` | Existing catalog template: impact path | 3 |
| `/templates/video-fitness-challenge` | Existing catalog template: video fitness challenge | 3 |
| `/templates/video-cooking-style` | Existing catalog template: video cooking style | 3 |
| `/templates/video-brand-personality` | Existing catalog template: video brand personality | 3 |
| `/examples` | Examples (labelled samples until real, permission-based examples exist) | 1 |
| `/examples/example-1` | Example 1 (after a design partner approves) | 2 |
| `/examples/example-2` | Example 2 (after a design partner approves) | 3 |
| `/examples/example-3` | Example 3 (after a design partner approves) | 3 |
| `/integrations` | Integrations overview (webhook, CSV, the one email/CRM path) | 1 |
| `/integrations/webhooks` | Webhooks | 2 |
| `/integrations/csv-export` | CSV export | 2 |
| `/integrations/email-crm` | The shipped email/CRM path | 2 |
| `/integrations/zapier` | Zapier (only if verified) | 3 |
| `/pricing` | Pricing (pilot launch: the Build plan and the $49/month Founding Partner invitation; regular Launch, Growth and Agency plans are announced only as coming after the paid pilot; no unfinished Agency features advertised) | 1 |
| `/resources` | Blog and resources hub | 1 |
| `/resources/qualify-leads-with-a-quiz` | Guide: qualifying enquiries with an interactive experience | 2 |
| `/resources/service-finder-guide` | Guide: helping visitors choose a package | 2 |
| `/resources/assessment-scorecard-guide` | Guide: building a useful assessment | 2 |
| `/resources/measuring-your-funnel` | Guide: measuring an interactive funnel | 3 |
| `/resources/consent-and-lead-data` | Guide: consent and lead data | 3 |
| `/docs` | Documentation hub | 2 |
| `/docs/getting-started` | Getting started | 2 |
| `/docs/install/html` | Install on any website | 2 |
| `/docs/install/squarespace` | Install on Squarespace | 2 |
| `/docs/leads-and-consent` | Leads and consent | 2 |
| `/docs/analytics-events` | Analytics and events | 3 |
| `/docs/webhooks` | Webhooks | 3 |
| `/docs/install/wordpress` | Install on WordPress | 3 |
| `/docs/install/shopify` | Install on Shopify | 3 |
| `/docs/install/wix` | Install on Wix | 3 |
| `/docs/install/webflow` | Install on Webflow | 3 |
| `/docs/install/framer` | Install on Framer | 3 |
| `/compare` | Comparisons hub | 3 |
| `/compare/typeform` | Squarespell Quiz vs Typeform | 3 |
| `/compare/outgrow` | Squarespell Quiz vs Outgrow | 3 |
| `/compare/interact` | Squarespell Quiz vs Interact | 3 |
| `/security` | Security and privacy overview | 1 |
| `/privacy` | Privacy policy | 1 |
| `/terms` | Terms | 1 |
| `/contact` | Contact and support | 1 |
| `/support` | Support / help centre | 2 |
| `/status` | Status | 2 |
| `/changelog` | Changelog | 3 |
| `/about` | About Squarespell | 2 |

### 10.3 Existing quiz-related content - decisions (documentation only; destinations may sit in later waves and are used only after those pages exist)

Rule (Phase 0): quiz content with traffic or backlinks must not simply disappear from `squarespell.com`. Before any article moves, decide keep, update, migrate, merge or retire for that URL; a moved page needs an equivalent destination on the new domain, a tested 301 redirect, updated internal links, updated sitemap and canonicals, and Search Console monitoring. **Nothing is moved, re-linked or redirected now.** Marketplace and lifetime-plugin pages stay on `squarespell.com`.

| Existing URL (squarespell.com) | Decision | Notes and proposed destination |
|---|---|---|
| `/quiz/` | **Update on squarespell.com now, later migrate** | Fix the noindex, the missing sitemap entry and the unsupported claims when authorized; later replaced by the new homepage and product pages with a 301 |
| `/squarespace-blog/quiz-funnel-squarespace-lead-generation/` | **Later migrate** | Rewrite without unsupported statistics; destination `/resources/qualify-leads-with-a-quiz` |
| `/squarespace-blog/how-to-add-a-quiz-to-squarespace-website-2026-guide/` | **Update on squarespell.com**, later migrate | Remove the "2 minutes" claim; destination `/docs/install/squarespace` and `/platforms/squarespace` |
| `/squarespace-blog/squarespace-quiz-templates-16-proven-designs-by-industry/` | **Later migrate** | Substantially adapted; destination `/templates` |
| `/squarespace-blog/squarespace-quiz-builder-vs-typeform-outgrow/` | **Later merge** | Merge into `/compare/typeform` and `/compare/outgrow` after re-sourcing competitor facts |
| `/squarespace-blog/the-complete-guide-to-adding-an-interactive-quiz-plugin-...-with-lifetime-access/` | **Keep on squarespell.com** | Belongs to the protected one-time plugin |
| `/premium-plugins/p/interactive-quiz-plugin-squarespace-7-1-email-capture/` and its licence and URL variants | **Keep on squarespell.com** | Protected; not edited, redirected or unpublished |
| Roundup posts that link the one-time plugin (26 best plugins, plugins for coaches, ecommerce review, extensions vs plugins, enhance without coding, product filter plugin) | **Keep on squarespell.com** | May link to the new product later, only when the new site is ready and the change is authorized |
| `/tools/quiz-builder-for-squarespace` (404 with impressions) | **Retire** (decide the redirect question later) | No action now |
| `/tag/quiz/` and the category form | **Keep on squarespell.com** | Record only |
| Common Ninja quiz and calculator listings; Typeform and Jotform extension listings | **Keep on squarespell.com** | Third-party marketplace listings |


## 11. Paid design-partner package (PREPARED, NOT SENT - no outreach is authorized)

Nothing in this section has been sent, posted or scheduled. No private WordPress or WooCommerce customer data is used, and one-time plugin buyers are not assumed to have agreed to Squarespell Quiz marketing. Before any message is sent, the owner authorizes it and a compliance check confirms the channel and consent basis (for example UK rules treat sole traders as individuals).

### 11.1 Ideal prospect

An owner or lead of a consultancy, studio or boutique agency (about 1-20 people) - or a coach or course creator - with **a live website, real visitor traffic, a service offer that is public and understandable, a clear qualification or recommendation problem, the ability to install or test, willingness to give feedback, and willingness to pay from the start.** Not a fit: catalog-driven ecommerce, regulated-advice firms needing legal review, prospects with no site or no traffic, prospects who want it free. The pilot customer is a consultant or boutique agency using Squarespell Quiz on **its own lead-generation website**; anyone wanting client workspaces, white-label client management or large multi-site operations is told these are later Agency-plan capabilities.

### 11.2 Qualification questions (asked in a short screening conversation or form)

1. What do you sell, and to whom? What is a typical engagement worth?
2. How do enquiries reach you today (form, email, calls)? Roughly how many per month?
3. What share of enquiries are a poor fit, and what does that cost you (time, calls)?
4. What platform is your website on, and who can edit it (you, a developer, an agency)?
5. Do you use a call-booking tool, email platform or CRM we should send leads to?
6. Roughly how much traffic does the site receive, and where does it come from (an estimate is fine)?
7. Which one action do you most want a visitor to take?
8. Can you place a snippet or block on a page within two weeks?
9. Are you willing to pay a discounted founding price from the first day, and to give two short feedback interviews?
10. May we use aggregated, anonymous results, and - only with your later permission - your story?

### 11.3 Founding Partner offer (owner-approved terms, 20 September 2026; outreach is NOT yet authorized)

| Term | Approved wording |
|---|---|
| Access | **Growth-level access** (the Growth entitlements in section 7.4: 10 live experiences, 2,000 completions a month, up to three sites, no branding, one email/CRM path, advanced analytics) |
| Price | **$49 USD per month** |
| Availability | **Limited to the first 10 accepted Founding Partners** |
| Price protection | **Fixed for six months from each partner's start date** |
| Billing | **Paid monthly from the beginning** (no trial) |
| Cancellation | **Cancel anytime**; **no long-term contract** |
| Refund | **Fourteen-day refund period applying to the first payment** |
| Onboarding and feedback | **Personal onboarding; two feedback interviews** |
| Sites | **Up to three of the customer's own websites** |
| After six months | **The account moves to the then-current Growth price.** Squarespell gives **at least 30 days' notice before the price changes**, and **the customer may cancel before the new price begins** |
| Taxes | "Prices are shown in USD. Any applicable taxes will be displayed at checkout." |

**Requires final terms/legal review before public publication:** the refund, tax and cancellation wording above. **No legal research has been done in this revision.**

**Not offered in the pilot:** the Agency plan, client workspaces, white-label client management and large multi-site operations - these are later Agency-plan capabilities and are not ready, and unfinished Agency features are never advertised.
**In return:** installation within 14 days and permission to use **aggregated, anonymous** results (private content is never reused); a named case study is optional and separately approved.
**Public presentation:** the pricing page shows the Build plan and the $49/month Founding Partner invitation, and says only that regular Launch, Growth and Agency plans are coming after the paid pilot. The $29 / $79 / $199 prices stay in this internal specification as **post-pilot hypotheses that still require validation**.

### 11.4 Onboarding structure

| Day | Step | Success signal |
|---|---|---|
| 0 | Screening call and kick-off (goal, segment, platform) | Goal and call to action agreed |
| 1 | Analyse the website together; confirm the profile | Editable draft produced |
| 2-3 | Edit, preview and approve; publish | Experience published |
| 3-5 | Install (universal or guided platform steps); verify | Verified installation |
| 7 | Check-in: traffic and first responses | Completions arriving, or a promotion plan agreed |
| 14 | First interview: setup experience | Friction list recorded |
| 30 | Second interview: results, value, price | Retention decision recorded |

Every friction point, support minute and platform-specific problem is logged against the scorecard.

### 11.5 Interview questions

*After setup:* What did you expect it to do? Where did you hesitate? Which step took longest? Did the profile match your business, and what was wrong? What would you have changed in the draft? Did installation feel clear on your platform? What almost made you stop?
*After real traffic:* Which leads were useful, and which were not? Did the outcomes send people to the right next step? Which numbers did you check, and what did you do about them? What is missing before you would recommend it? What would you pay for it without the discount, and why? What would make you cancel?

### 11.6 Success scorecard (master plan targets)

| Metric | Target | If missed, suspect |
|---|---|---|
| Paid design partners | 5 or more | The message or segment |
| Analysis to editable draft | 70% or more | Generation or onboarding |
| Draft to publish | 60% or more | Editor or outcome confidence |
| Publish to verified install | 70% or more | Publishing and platform steps |
| First real completion within 14 days | 50% or more | Promotion, use case or value |
| 30-day active retention | 60% or more | Recurring optimization value |
| Also tracked | time to draft, time to install, support minutes per platform, qualified-lead share, price feedback | - |

### 11.7 Short outreach email (DRAFT - not sent)

> **Subject:** A new way to qualify enquiries from your website - would you test it?
>
> Hi [first name],
>
> I run Squarespell. We are building Squarespell Quiz: it reads your existing website and drafts a short qualifier or service finder in your own words, helps you add it to your site, and shows which questions lead to enquiries worth answering. You approve everything before it goes live.
>
> I am working with a small group of consultants and boutique agencies as founding partners. It is paid from the start at a reduced price, and in return I ask for two short feedback conversations. If you would like to see it on [their site], I can show you in 20 minutes.
>
> Worth a look? If not, no problem - just let me know and I will not follow up.
>
> [Name], Squarespell

### 11.8 Short direct message (DRAFT - not sent)

> Hi [first name] - I run Squarespell. We are testing a tool that turns a consultancy's website into a short "is this a fit?" qualifier, with the install checked for you. Looking for a few founding partners (paid, reduced price, feedback in return). Open to a 20-minute look at [their site]?

### 11.9 List-building method for 15-20 qualified prospects

1. **Sources (public or opted-in only):** professional directories and public agency and consultant listings; public conference and podcast speaker lists; public professional profiles reviewed by hand; referrals from designers and existing partners; people who voluntarily sign up or ask for a demo; existing public Squarespell readers who opted in to hear from us.
2. **Screen against 11.1:** live site, a clear offer, and a qualification problem visible on the site. Traffic is asked, not guessed.
3. **Record per prospect:** name, business, site, segment, platform, offer, contact channel and its consent basis, source, fit score (0-2 per criterion), status, notes. Keep the list in a controlled workspace.
4. **Funnel:** 15-20 qualified prospects, 5-10 conversations, 5 or more paying commitments.
5. **Never:** use private WooCommerce customer data, buy contact lists, or message anyone before the owner authorizes it.

## 12. Owner decisions

### 12.1 Approved (recorded 20 September 2026)
The corrected Phase 2 specification, subject to the final wording applied here: Squarespell Quiz as a Squarespell Limited product at `squarespellquiz.com`; primary market consultants and boutique agencies, secondary coaches and course creators; positioning around qualified enquiries and service matching; pilot types Lead qualifier, Service finder and Assessment/scorecard; the "Connect website" wording with truthful platform steps and universal publishing as the baseline; plan names Build, Launch, Growth, Agency; the 14-day Growth trial without a card; the event model and tenant-scoped privacy boundary; brand and landing-page direction as a working specification; protection of the marketplace and the lifetime plugin; the connector order; the **approved Founding Partner terms and tax wording (section 11.3)**; the **approved grace allowances and paused-collection behaviour (section 7.4)**; the **pilot-launch pricing presentation**; the **20-page launch map and 93-page roadmap (section 10)**, with every platform page stating its real availability.

### 12.2 Remaining before any outreach
| # | Item | Status |
|---|---|---|
| 1 | Final terms/legal review of the refund, tax and cancellation wording before public publication | Required; not started; no legal research done |
| 2 | A public-information prospect list prepared for owner review | **Next Phase 2 task** |
| 3 | Authorization before outreach (channel, message text, sender, compliance check) | Not requested; no one may be contacted |
| 4 | Final acceptance tests | Test plan to be approved |

## 13. Phase 2 status - STILL OPEN

| Exit-gate item | Status |
|---|---|
| Owner approval of the corrected specification | **Approved 20 September 2026, with the final wording applied in this revision** |
| Final terms/legal review of refund, tax and cancellation wording | **Pending** |
| A reviewed prospect list | **Not started** - the next task is to prepare a public-information prospect list for owner review; none exists |
| Authorization before outreach | **Not granted** |
| Five paying commitments | **0** - no outreach authorized; none secured (the offer is limited to the first 10 accepted partners) |
| Final acceptance tests | Acceptance criteria drafted per journey stage (section 5); the final approved test plan is pending |
| Hostinger staging checks carried from Phase 1 | **Open and not started** (authenticated browser flows, Stripe test-mode checkout and webhooks, real email, real AI generation and timeouts, CORS and cookie behaviour, scheduler jobs, backups and monitoring, migration rehearsal on a copy of production data) - tracked in draft PR #63 |

**Merging this specification does not complete Phase 2.** Draft PR #63 stays open, draft, unmerged and undeployed. This document changes no code, Stripe object, Clerk setting, DNS record or production system.

## 14. Sources and evidence notes

- Relaunch Master Plan Revision 3.0: sections 4 (wedge and positioning), 5 (customers and pilot verticals), 6 (product definition and release scope), 7 (AI quality and privacy boundary), 8 (connected website), 9 (website and application experience), 10 (pricing hypotheses), 11 (go-to-market and pilot scorecard), 13 (SEO and authority migration).
- Phase 0 results (PR #62, merged): separation architecture; connector matrix from official documentation; content inventory; legacy plugin protection; design-partner framework.
- Phase 1 results (draft PR #63): tenant isolation, lead and event lifecycle, plan enforcement, billing safeguards, cron findings, cloud CI evidence.
- **Verified vs proposed:** the plan limits and prices in section 7 are recommendations built on the master plan's hypotheses; connector limits are from official documentation reviewed earlier and are re-checked before each connector ships; nothing in this document is measured customer evidence.

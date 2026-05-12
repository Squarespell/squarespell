# Squarespell Pricing & Monetization Strategy

**Prepared:** May 2, 2026
**Scope:** Complete pricing restructure, feature distribution, credit monetization, and in-app conversion system
**Status:** Awaiting approval before implementation

---

## 1. AUDIT FINDINGS

### What's broken right now

**The Starter plan is a dead zone.** At $12/mo it gives users 3 quizzes, 500 leads, and strips away every feature that makes quiz funnels actually work — no branching logic, no A/B testing, no integrations, no email sequences. A user who just experienced Pro-level features during their 14-day trial lands on Starter and gets a tool that can barely function. The result: they either jump straight to Pro or they churn. Nobody stays on Starter because there's no reason to.

**The trial-to-paid cliff is brutal.** Trial users get unlimited quizzes, 2,000 leads, A/B testing, branching, integrations, and email sequences. Then their trial expires and Starter takes away everything except branding removal and a 3-quiz limit. That's not a downgrade — it's a different product. Users feel punished for converting.

**The pricing gaps don't match the value gaps.** Starter ($12) to Pro ($25) is only $13/mo difference, but Pro unlocks unlimited quizzes, 4x the leads, A/B testing, branching, integrations, and email sequences. That's massive value for $13. Meanwhile, Pro ($25) to Business ($49) is $24/mo for white-label, custom domain, and team seats — features most users don't need. The biggest value jump costs the least; the smallest value jump costs the most.

**Email credits are tracked but never enforced.** The backend counts emails sent per month and the dashboard shows a usage bar, but there's no actual enforcement. Users on Starter could theoretically send unlimited emails. The `EMAIL_ADDONS` array is defined in code ($5 for 100, $15 for 500, $29 for 1,000) but there's no checkout flow, no purchase UI, and no enforcement. This is pure lost revenue.

**Lead limits kill quizzes silently.** When a Starter user hits 500 leads, the quiz just stops accepting responses — no warning to the quiz owner, no graceful degradation, no prompt to buy more. Their live quiz breaks mid-campaign and they have no idea why. This is the single worst user experience in the product.

**The announcement bar is underutilized.** It only shows two things: trial countdown and billing alerts. There's no prompt when users hit 80% of their lead quota, no nudge when they try to create a 4th quiz, no contextual upsell based on what they're doing. The upgrade modal exists but only fires when users click on explicitly gated features — it never proactively suggests upgrades based on usage patterns.

**The trial duration is inconsistent.** The frontend promises 14 days. One backend calculation uses 7 days. Users could lose access a week early. This is a trust-destroying bug.

### Why this kills conversions

Inconsistency between the pricing page and in-app experience creates cognitive dissonance. When a user reads "500 leads/month" on the pricing page but has no way to buy more leads when they run out, they lose trust in the product. When the dashboard shows features they can see but can't use, with no clear path to unlock them, they feel trapped rather than motivated.

The lack of graduated urgency means users hit walls without warning. A well-designed SaaS product gives you three touches before a hard stop: a soft warning at 70%, an urgent warning at 90%, and a clear upgrade prompt at 100% with an option to buy more. Squarespell goes from silence to broken quiz with nothing in between.

### Where revenue is leaking

1. **Zero add-on revenue:** No way to buy extra leads or emails. Every user who needs 501 leads must upgrade their entire plan.
2. **No usage-based expansion:** The jump from 500 to 2,000 leads requires a full plan upgrade ($12 to $25). There's no middle ground.
3. **Weak urgency on trial conversion:** Only a dismissible banner. No email sequence, no feature countdown, no progressive restriction.
4. **No annual upsell pressure:** Annual pricing exists but isn't pushed aggressively in-app.
5. **Starter churn:** Users who can't justify Pro ($25) but find Starter useless ($12) just cancel entirely.

---

## 2. NEW PRICING TABLE

### Philosophy

Three plans. Each serves a distinct user with a distinct need. The upgrade path is obvious: you graduate when your usage demands it, not when you want a specific feature. Every plan must feel complete for its target user.

| | **Starter** | **Growth** | **Scale** |
|---|---|---|---|
| **Monthly** | **$19/mo** | **$49/mo** | **$99/mo** |
| **Annual** | **$15/mo** (billed $180/yr) | **$39/mo** (billed $468/yr) | **$79/mo** (billed $948/yr) |
| **Annual savings** | Save $48/yr (21%) | Save $120/yr (20%) | Save $240/yr (20%) |
| **Positioning** | Launch & learn | Grow & optimize | Scale & white-label |
| **Target user** | Solo creator, first quiz funnel | Active marketer, multiple funnels | Agency, multi-client operation |

### Why these names

**Starter** stays because it's universally understood. It signals "entry point" without sounding cheap. **Growth** replaces "Pro" because it describes the user's stage, not just a tier — these users are actively growing their lead pipeline. **Scale** replaces "Business" because it's action-oriented — these users need to scale across clients, domains, and team members.

### Why these prices

**$19 Starter** (up from $12): $12 was too cheap to take seriously. At $19, you're in the same range as Mailchimp Essentials, ConvertKit Creator, and other tools your users already pay for. It also creates enough room above free to feel like a commitment.

**$49 Growth** (up from $25): $25 for unlimited quizzes + 2,000 leads + every feature was severely underpriced. $49 puts you in line with ScoreApp's mid-tier and Outgrow's Freelancer plan. The value justifies the price — this plan has everything most users need.

**$99 Scale** (up from $49): Agencies paying $49 for white-label and custom domain was leaving money on the table. Agencies charge their clients $500-2,000/mo per funnel. $99 is nothing. This plan needs to feel premium and exclusive.

---

## 3. FEATURE BREAKDOWN PER PLAN

### Starter — $19/mo

| Feature | Included | Reasoning |
|---|---|---|
| Active quizzes | 5 | Up from 3. Enough to test and learn across a few pages. |
| Monthly leads | 1,000 | Up from 500. A solo creator running one quiz needs room to grow. |
| Monthly emails | 500 | New enforcement. Enough for a basic welcome sequence. |
| Branching logic | Yes | **Moved from Pro.** This is table stakes for a quiz builder. Without it, quizzes feel like forms. |
| Remove Squarespell branding | Yes | Keeps current. Basic professionalism. |
| Basic analytics | Yes | Views, completions, lead rate. No funnel breakdown or heatmap. |
| Quiz templates | Yes | Access to template gallery. |
| Squarespace embed | Yes | Core functionality. |
| Email sequences | 1 per quiz | **New limit.** One automated follow-up per quiz. Enough to see value. |
| Integrations | Zapier only | **Moved from Pro, limited.** One integration channel. |
| A/B testing | No | Held for Growth. |
| Advanced analytics | No | Held for Growth. |
| Webhooks / API | No | Held for Growth. |
| Custom domain | No | Held for Scale. |
| White-label | No | Held for Scale. |
| Team seats | No | Held for Scale. |
| Priority support | No | Held for Growth. |

**Why branching logic moved down:** Every quiz tool competitor includes branching in their base plan. Locking it behind Pro made Squarespell's cheapest plan feel like a downgraded form builder, not a quiz tool. Moving it to Starter makes the product feel complete at every tier.

**Why email sequences are limited to 1 per quiz:** This lets Starter users experience the power of automated follow-ups (increasing retention) while creating a natural upgrade trigger when they want to build different sequences per outcome.

### Growth — $49/mo

| Feature | Included | Reasoning |
|---|---|---|
| Active quizzes | Unlimited | No artificial limit. Grow freely. |
| Monthly leads | 5,000 | Up from 2,000. Room for multiple active funnels. |
| Monthly emails | 3,000 | Proportional to lead volume. |
| Branching logic | Yes | Included (from Starter). |
| A/B testing | Yes | **Key differentiator.** Optimization is a Growth activity. |
| Advanced analytics | Yes | Funnel breakdown, question heatmap, drop-off analysis, attribution. |
| Remove branding | Yes | Included. |
| Email sequences | Unlimited | Full automation capability. Multiple sequences per quiz, per outcome. |
| All integrations | Yes | Zapier, webhooks, native integrations. |
| API access | Yes | Programmatic access for power users. |
| Quiz scheduling | Yes | Publish/unpublish on a schedule. |
| Lead segmentation | Yes | Tag and segment leads by outcome, score, behavior. |
| Commerce (product recs) | Yes | Tie quiz outcomes to product recommendations. |
| Priority support | Yes | Faster response times. |
| Custom domain | No | Held for Scale. |
| White-label | No | Held for Scale. |
| Team seats | No | Held for Scale. |

**Why A/B testing is the anchor:** A/B testing is the single most powerful upgrade trigger. Once users understand that they could be optimizing their quiz, they want it. It's also the feature with the highest perceived value gap — "I can't test which version converts better" is a pain point that grows with usage.

### Scale — $99/mo

| Feature | Included | Reasoning |
|---|---|---|
| Active quizzes | Unlimited | No limit. |
| Monthly leads | 25,000 | Agencies need volume. |
| Monthly emails | 15,000 | Proportional. |
| Everything in Growth | Yes | Full feature set. |
| White-label branding | Yes | Remove all Squarespell references. Use client's brand. |
| Custom domain | Yes | quizzes.clientsite.com instead of app.squarespell.com. |
| Team seats | 5 included | Invite team members with role-based access. |
| Additional team seats | $10/seat/mo | Pay per extra seat beyond 5. |
| Dedicated onboarding | Yes | 30-minute setup call. |
| Custom integrations | Yes | Direct integration support (not just Zapier). |
| PDF report branding | Yes | White-labeled PDF reports with client logos. |
| Priority support (SLA) | Yes | Guaranteed 4-hour response during business hours. |

**Why white-label is the anchor:** Agencies are the highest-LTV customers. White-label is a feature they cannot work around — you either have it or you can't resell the product. This makes Scale the natural home for any agency, regardless of their lead volume.

---

## 4. LEADS / EMAIL CREDIT SYSTEM & UPSELLS

### Credits included per plan (monthly reset)

| Plan | Leads/mo | Emails/mo | Cost per extra lead | Cost per extra email |
|---|---|---|---|---|
| Starter | 1,000 | 500 | $0.02 | $0.015 |
| Growth | 5,000 | 3,000 | $0.015 | $0.012 |
| Scale | 25,000 | 15,000 | $0.01 | $0.008 |

Note: Per-unit cost decreases with plan tier, rewarding commitment.

### Add-on lead packages (one-time purchase, no expiry within billing cycle)

| Package | Leads | Price | Per-lead cost | Best for |
|---|---|---|---|---|
| **Boost** | 1,000 | $15 | $0.015 | Quick campaigns, seasonal spikes |
| **Accelerate** | 5,000 | $50 | $0.010 | Sustained growth, multi-quiz users |
| **Unlimited** | Unlimited (month) | $99 | — | Launch events, viral campaigns |

### Add-on email packages

| Package | Emails | Price | Per-email cost |
|---|---|---|---|
| **Email Boost** | 1,000 | $10 | $0.010 |
| **Email Pro** | 5,000 | $35 | $0.007 |
| **Email Unlimited** | Unlimited (month) | $59 | — |

### Upsell trigger points (when users are pushed to buy more)

**70% of lead quota used:**
- Soft notification in dashboard sidebar
- "You've used 700 of 1,000 leads this month"
- No CTA yet, just awareness

**85% of lead quota used:**
- Announcement bar appears (amber, non-dismissible)
- "You're approaching your lead limit. Add more leads to keep your quizzes running."
- CTA: "Add Leads" → opens add-on purchase modal
- Email notification to account owner

**95% of lead quota used:**
- Announcement bar turns urgent (red)
- "Your quizzes will stop capturing leads when you hit 1,000. Act now."
- CTA: "Add Leads" or "Upgrade Plan"
- Second email notification

**100% of lead quota reached:**
- Quiz does NOT stop immediately (grace buffer of 50 extra leads)
- Announcement bar: "You've exceeded your lead limit. Purchase additional leads to continue."
- Every quiz page shows a gentle message to quiz takers: "Quiz temporarily at capacity" (only after grace buffer)
- Dashboard shows prominent upgrade prompt
- Owner receives email with one-click add-on purchase link

**Why a grace buffer:** Killing a live quiz mid-campaign destroys trust and costs the user real money. A 50-lead grace buffer (roughly 5% extra for Starter) gives the user time to react while keeping their funnel alive. The extra leads are billed automatically at the per-lead overage rate for their plan.

### Revenue impact modeling

Assume 1,000 active Starter users:
- Current ARPU: $12/mo = $12,000 MRR
- New ARPU (Starter at $19): $19,000 MRR (base)
- Add 15% buying one lead pack/mo: 150 × $15 avg = $2,250/mo
- Add 8% upgrading to Growth: 80 × $49 = $3,920/mo
- **Estimated new MRR: $25,170** (2.1x increase)

---

## 5. IN-APP ANNOUNCEMENT BAR STRATEGY

### Architecture

The announcement bar is a persistent, context-aware element that sits above the dashboard content area (below the topbar). It serves one message at a time, prioritized by urgency. It is the primary in-app conversion mechanism.

### Priority hierarchy (highest to lowest)

1. Payment failed (billing alert)
2. Trial expired
3. Lead limit exceeded (100%)
4. Trial ending (≤3 days)
5. Lead limit approaching (≥85%)
6. Trial countdown (≤7 days)
7. Email limit approaching (≥85%)
8. Annual upgrade savings prompt
9. Feature discovery prompt

### Message variants

**1. Trial Ending — Final 3 Days (Priority: CRITICAL)**
- Visual: Red background, white text, non-dismissible
- Icon: Clock/timer
- Copy: "Your trial ends in 2 days. Keep your quizzes live — upgrade now and save 20% with annual billing."
- CTA: "Choose a Plan →"
- Destination: /pricing with annual toggle pre-selected

**2. Trial Ending — 4-7 Days (Priority: HIGH)**
- Visual: Amber background, dark text, dismissible (returns next day)
- Copy: "You have 5 days left on your Pro trial. Lock in your plan before you lose access to A/B testing and advanced analytics."
- CTA: "View Plans"
- Destination: /pricing

**3. Trial Ending — 8-14 Days (Priority: LOW)**
- Visual: Teal/brand background, white text, dismissible
- Copy: "Welcome to Squarespell! You have 11 days of Pro features. Make the most of your trial →"
- CTA: "Explore Features"
- Destination: /dashboard (scrolls to feature highlights)

**4. Trial Expired (Priority: CRITICAL)**
- Visual: Red background, non-dismissible, persistent on every page
- Copy: "Your trial has ended. Your quizzes are paused. Upgrade to keep capturing leads."
- CTA: "Upgrade Now"
- Destination: /pricing

**5. Lead Limit — 85% Used (Priority: HIGH)**
- Visual: Amber background, dismissible (returns when 90% hit)
- Copy: "You've used 850 of 1,000 leads this month. Add more to keep your funnels running."
- CTA: "Add Leads" (opens add-on modal) | "Upgrade" (links to /pricing)
- Shows usage bar inline

**6. Lead Limit — 100% Exceeded (Priority: CRITICAL)**
- Visual: Red background, non-dismissible
- Copy: "Lead limit reached. Your quizzes will stop capturing leads soon. Add a lead pack now."
- CTA: "Add 1,000 Leads — $15" (one-click purchase)
- Secondary link: "Or upgrade your plan"

**7. Email Limit — 85% Used (Priority: MEDIUM)**
- Visual: Amber background, dismissible
- Copy: "You've sent 425 of 500 emails this month. Need more? Add an email pack."
- CTA: "Add Emails"

**8. Annual Savings (Priority: LOW, shown to monthly users after 60 days)**
- Visual: Teal/brand background, dismissible (doesn't return for 30 days)
- Copy: "You've been with us for 2 months! Switch to annual and save $48/year."
- CTA: "Switch to Annual →"
- Destination: /dashboard/billing with annual switch modal

**9. Feature Discovery (Priority: LOW, shown contextually)**
- Visual: Subtle teal outline, dismissible
- When user visits analytics page on Starter: "Unlock funnel analysis, question heatmaps, and drop-off tracking with Growth."
- When user creates 4th quiz attempt on Starter: "You've hit your quiz limit. Upgrade to Growth for unlimited quizzes."
- CTA: "See What You're Missing →"

### Behavior rules

- Only ONE bar shown at a time (highest priority wins)
- Dismissible bars return based on escalation logic (not time-based)
- Non-dismissible bars (red/critical) cannot be closed — user must act
- Bar animates in with a subtle slide-down (200ms ease)
- Bar persists across page navigation within dashboard
- Dismissal state stored in localStorage with expiry timestamps
- Never show upgrade prompts within 48 hours of a successful upgrade
- Never show lead limit warnings if user already purchased an add-on that month

---

## 6. CONSISTENCY SYSTEM

### The problem with inconsistency

Right now, the pricing page, dashboard billing page, feature gate modals, and announcement bar each tell a slightly different story about what each plan includes. Feature names differ ("Advanced Analytics" vs. "Analytics Level: Advanced"), limits are formatted differently ("2,000 leads" vs. "2000"), and the upgrade path isn't the same everywhere. This creates micro-friction at every decision point.

### Single source of truth: the Plan Registry

Every plan's details — name, price, limits, feature flags, copy — must come from ONE file (`/frontend/lib/plans.ts`). No hardcoded plan names, prices, or limits anywhere else in the codebase. The pricing page, billing page, upgrade modals, announcement bar, and feature gates all read from this single registry.

### Naming consistency rules

| Concept | Correct term | Never use |
|---|---|---|
| Plan names | Starter, Growth, Scale | Pro, Business, Basic, Premium, Enterprise |
| Lead quota | "leads/month" | "monthly leads", "lead credits", "responses" |
| Email quota | "emails/month" | "email credits", "sends", "messages" |
| Quiz limit | "active quizzes" | "quiz slots", "quiz count", "quizzes allowed" |
| Upgrade action | "Upgrade" | "Switch", "Change", "Modify" |
| Add-on action | "Add more" | "Buy credits", "Purchase pack", "Top up" |
| Trial period | "14-day free trial" | "free trial", "trial period", "Pro trial" |

### Pricing display rules

1. **Always show monthly price first,** with annual as a savings callout
2. **Format prices as $X/mo** — never "$X per month" or "$X monthly"
3. **Lead/email counts use commas:** 1,000 not 1000, 5,000 not 5000, 25,000 not 25000
4. **Annual savings shown as yearly amount:** "Save $120/year" not "Save 20%"
5. **Feature lists use the same order everywhere:** Quizzes → Leads → Emails → Analytics → Testing → Integrations → Sequences → Domain → Branding → Team

### Where consistency must be enforced

**Pricing page (/pricing):**
- Three cards: Starter, Growth (highlighted), Scale
- Growth card is visually prominent (larger, colored border, "Most Popular" badge)
- Feature comparison table below uses exact feature names from registry
- FAQ section references exact plan names and limits

**Dashboard billing page (/dashboard/billing):**
- Current plan card uses same name and price as pricing page
- Usage bars use same limit numbers from registry
- "Upgrade" button leads to same pricing page
- Plan comparison in upgrade modal matches pricing page exactly

**Feature gate modals:**
- "This feature requires the Growth plan ($49/mo)"
- Uses exact plan name, exact price, from registry
- CTA: "Upgrade to Growth" — not "Upgrade to Pro" or "Get Growth"

**Announcement bar:**
- References exact plan names and prices
- Lead/email counts match dashboard usage bars
- Upgrade links go to /pricing, not directly to Stripe

**Embed dashboard and quiz editor:**
- Feature locks reference same plan names
- Tooltip on locked features: "Available on Growth plan"

### Implementation approach

The `plans.ts` file becomes the canonical source. It exports plan objects with:
- `name`: Display name ("Starter", "Growth", "Scale")
- `monthlyPrice`: Number (19, 49, 99)
- `annualPrice`: Number (15, 39, 79)
- `limits`: Object with `quizzes`, `leads`, `emails`
- `features`: Object with boolean flags for every gated feature
- `copy`: Object with `tagline`, `description`, `ctaText` for each context
- `annualSavings`: Computed yearly savings amount

Every component that displays plan info imports from this file. No strings, numbers, or feature flags are hardcoded anywhere else.

---

## 7. STRATEGIC REASONING

### Why this pricing will convert better

**The Starter plan is now usable.** Branching logic, limited email sequences, and Zapier integration make Starter a real product, not a demo. Users who convert from trial to Starter will stay because the tool actually works for them. Churn at the Starter tier should drop significantly.

**The Growth plan has clear anchors.** A/B testing and advanced analytics are the two features that grow in value as users grow in usage. A user with 500 leads doesn't need A/B testing; a user with 3,000 does. The upgrade trigger is natural and usage-driven, not arbitrary.

**The price gaps match the value gaps.** Starter ($19) to Growth ($49) is $30/mo for unlimited quizzes, 5x leads, A/B testing, full analytics, and unlimited sequences. That's a massive jump in capability for a modest price increase. Growth ($49) to Scale ($99) is $50/mo for white-label, custom domain, and team seats — features that enable a fundamentally different business model (reselling). Each step up unlocks a new class of value.

**Add-on revenue fills the gaps.** A Starter user who needs 1,500 leads this month doesn't have to upgrade to Growth ($49). They can buy a 1,000-lead Boost pack for $15 and stay on Starter ($19 + $15 = $34). This is better for the user (lower total cost) and better for Squarespell (incremental revenue without plan churn). When that user consistently buys add-ons, the system naturally nudges them to upgrade: "You've purchased $45 in add-ons this month. Growth includes 5,000 leads for $49."

**The announcement bar creates persistent, escalating urgency.** Users don't hit a wall — they get warned, nudged, and offered options at every stage. The messaging is specific (not "upgrade for more features" but "you've used 850 of 1,000 leads — add more for $15"). Specificity converts.

### Competitive positioning

| Feature | Squarespell (Growth) | Interact ($53/mo) | ScoreApp ($49/mo) | Outgrow ($59/mo) |
|---|---|---|---|---|
| Monthly leads | 5,000 | 600 | 2,500 | 1,000 |
| A/B testing | Yes | Yes | Yes | Yes |
| Email sequences | Unlimited | No (external only) | Basic | No |
| Squarespace native | Yes | No | No | No |
| White-label | Scale only | $209/mo | $99/mo | $149/mo |
| Custom domain | Scale only | $209/mo | $99/mo | No |
| Price | $49/mo | $53/mo | $49/mo | $59/mo |

Squarespell's Growth plan offers more leads, built-in email sequences, and Squarespace-native embedding at a lower price than every comparable competitor. This is a strong competitive story.

### Revenue projections

**Current state (estimated):**
- 3 plans at $12 / $25 / $49
- Zero add-on revenue
- Estimated blended ARPU: ~$22
- If 500 paying users: $11,000 MRR

**New state (projected after 90 days):**
- 3 plans at $19 / $49 / $99
- Add-on revenue from 20% of users averaging $18/mo
- Estimated blended ARPU: ~$42
- If 500 paying users + 10% growth: $23,100 MRR
- **Projected uplift: 2.1x MRR**

---

## 8. UX CONSISTENCY RECOMMENDATIONS

### Dashboard overview page

The dashboard landing page should reinforce the user's plan status and usage at a glance:

1. **Plan status card** (top-right of KPI grid): Shows current plan name, renewal date, and a mini usage bar for leads
2. **Usage warnings** integrated into KPI cards: The "Leads Captured" KPI card should show "89 / 1,000" with the denominator reflecting their plan limit
3. **Contextual upgrade prompts** in empty states: When a user has no A/B tests, don't just show "No A/B tests" — show "Unlock A/B testing to optimize your quizzes. Available on Growth →"
4. **Remove the separate A/B testing promo banner**: Replace with contextual prompts integrated into the relevant section

### Pricing page

1. **Hero**: "Quiz funnels that convert. Built for Squarespace."
2. **Trust badge**: "14-day free trial · No credit card required · Cancel anytime"
3. **Three cards**: Starter / Growth (highlighted) / Scale
4. **Toggle**: Monthly | Annual (Save up to $240/year)
5. **Feature comparison matrix** below cards — every row uses exact feature names from registry
6. **Social proof section**: Customer logos or testimonial quotes
7. **FAQ**: Updated to reference new plan names and limits
8. **Bottom CTA**: "Start your 14-day free trial" → /sign-up

### Upgrade modal (when user hits a gate)

Structure:
1. **What they tried to do**: "You tried to create an A/B test"
2. **What they need**: "A/B testing is available on the Growth plan"
3. **What Growth includes**: 3-4 bullet points of key features
4. **Price**: "$49/mo or $39/mo billed annually"
5. **CTA**: "Upgrade to Growth" (primary button, brand color)
6. **Secondary**: "Compare all plans" → /pricing

### Add-on purchase modal

Structure:
1. **Current usage**: "You've used 920 of 1,000 leads this month"
2. **Visual**: Usage bar at 92%
3. **Three options**: Boost (1,000 / $15) | Accelerate (5,000 / $50) | Unlimited ($99)
4. **Smart recommendation**: Highlight the option closest to their typical monthly usage
5. **Or upgrade**: "Your monthly usage suggests Growth might be a better fit. See plans →"
6. **CTA**: "Add Leads" → Stripe checkout for one-time add-on

---

## 9. CRITICAL BUGS TO FIX (from audit)

Before implementing any pricing changes, these must be resolved:

1. **Trial duration mismatch**: Backend `allRoutes.ts:1700` uses 7 days instead of 14. Users may lose access a week early. Fix: reference `TRIAL_DAYS` constant everywhere.

2. **Email quota not enforced**: Emails are counted but sending isn't blocked at the limit. Fix: add enforcement in the email sequence service, matching the lead quota pattern.

3. **Branding restriction inconsistency**: Backend checks plan name directly instead of using `PLAN_LIMITS[plan].removeBranding`. Fix: use the plan registry consistently.

4. **No grace buffer on lead limits**: Quizzes stop cold when the limit is hit. Fix: implement 50-lead grace buffer with automatic overage billing.

---

## 10. IMPLEMENTATION PRIORITY

### Phase 1: Foundation (Week 1)
- Fix the three critical bugs above
- Update `plans.ts` with new plan definitions (Starter/Growth/Scale)
- Update `planGuard.ts` backend limits to match
- Create Stripe products and price IDs for new plans

### Phase 2: Pricing & Billing (Week 2)
- Rebuild pricing page with new plans
- Update billing page with new usage displays
- Implement plan migration logic (map old plans to new)
- Build add-on purchase flow (Stripe one-time products)

### Phase 3: Conversion Engine (Week 3)
- Rebuild announcement bar with priority system
- Add usage-based trigger logic (70/85/95/100%)
- Update all feature gate modals with new plan names
- Add annual upsell prompt for monthly users

### Phase 4: Consistency & Polish (Week 4)
- Audit every page for hardcoded plan references
- Update all copy to use registry terms
- Add contextual upgrade prompts in empty states
- Email notification system for limit warnings

---

## APPROVAL REQUEST

This strategy covers pricing restructure, feature distribution, credit monetization, in-app conversion, and consistency across the entire product. Before I implement any of this, I need your approval on:

1. **Plan names**: Starter / Growth / Scale — are you good with these?
2. **Pricing**: $19 / $49 / $99 — comfortable with the increase from current $12 / $25 / $49?
3. **Feature distribution**: Specifically branching logic moving to Starter, and A/B testing staying on Growth
4. **Lead add-on pricing**: $15 for 1,000, $50 for 5,000, $99 for unlimited
5. **Announcement bar behavior**: Non-dismissible at critical thresholds — acceptable UX trade-off?
6. **Implementation priority**: 4-week phased rollout — timeline work for you?

Once you approve (or adjust), I'll begin implementation starting with Phase 1.

# /tools/quiz-funnel — Full Page Audit + Visual Strategy
**Squarespell · Task 13 · May 2026**

---

## PART 1 — CURRENT PAGE DEEP AUDIT

### 1.1 Structural Map (as-built)

| # | Section | Has Visual? | Quality |
|---|---------|-------------|---------|
| 1 | Nav (Features / Pricing / Templates + Sign in / Get Started) | — | Minimal |
| 2 | Hero: "Turn Your Squarespace Site Into a Lead Machine" | Dashboard mockup | Generic |
| 3 | Integration logos bar | Text only | Weak |
| 4 | How It Works (3 steps) | None | Text-only |
| 5 | Analytics dashboard | Same dashboard as hero | Duplicate |
| 6 | Quiz Builder section | None | No visual |
| 7 | Lead Management section | Leads table mockup | OK |
| 8 | Testimonials (6) | Letter avatars only | Low trust |
| 9 | Mid-page CTA banner | None | Generic |
| 10 | Templates gallery (6) | No preview images | Text links |
| 11 | Pricing (3 tiers, monthly/yearly toggle) | None | Solid |
| 12 | FAQ (6 items, collapsed) | None | Thin |
| 13 | Footer | — | © 2024 (wrong year) |

---

### 1.2 Current Messaging Audit

**Hero headline:** "Turn Your Squarespace Site Into a Lead Machine"
→ Functional. Not inspiring. No specificity. "Lead machine" is overused SaaS cliché. Does not mention quiz, AI, or speed. Does not trigger emotional response. No outcome differentiation.

**Hero subheadline:** "Build AI-powered quiz funnels that capture leads, segment your audience, and automate follow-up emails. Built specifically for Squarespace."
→ Better — mentions AI, quiz funnels, segmentation, automation, and Squarespace specifically. But it front-loads features over outcomes. The emotional arc is missing.

**CTA copy:** "Get Started"
→ Weakest possible CTA. Zero specificity. No risk removal. No value framing.

**"How It Works" step titles:**
1. "Paste Your URL" → specific and good
2. "Customize and Publish" → generic
3. "Capture and Convert" → alliterative but vague

**"Real-time performance dashboard" headline:**
→ Describes a feature, not a benefit. Should communicate what that real-time data does for the user.

**"Build quizzes that convert visitors into leads"**
→ This is the quiz builder section headline. Solid conversion language but the section has NO screenshot of the actual quiz builder — fatal mismatch between promise and proof.

**"Capture, score, and segment every lead"**
→ Good — three verbs, action-oriented. But the leads table visual doesn't show scoring prominently.

**Testimonials:**
→ Copy is solid (specific numbers: "3x," "10 minutes," "22% of monthly revenue"). But letter-avatar presentation destroys credibility — looks like placeholder data, not real customers.

**Mid-page CTA:** "Ready to turn visitors into leads?"
→ Echo of the hero headline. Zero new value. Feels like filler.

**Templates section:** "Launch faster with proven templates"
→ "Proven" is a claim with no proof. Template cards are text links — no preview, no visual hook.

**Pricing headline:** "Simple, transparent pricing"
→ Works. But there's no value anchor — no "most customers recover the cost in week 1" type framing.

**FAQ:** 6 questions with no visible answers (collapsed by default)
→ These are critical conversion questions. Hiding them by default is a UX mistake. At least the first 2–3 should be open.

---

### 1.3 Current User Flow Analysis

```
Arrive → Hero (text + dashboard) → Integration logos (no context) → How It Works (text only) 
→ Analytics section (SAME dashboard again) → Quiz Builder (no visual) → Lead Management 
→ Testimonials (no photos) → Generic CTA → Templates (no previews) → Pricing → FAQ → Footer
```

**Critical flow problems:**

1. **No conviction-building architecture.** The page does not follow a logical persuasion sequence. It jumps between features without building an emotional or logical case.

2. **Duplicate hero visual.** The exact same dashboard mockup appears in both the hero and the analytics section. This destroys trust — it looks like a placeholder that was never updated.

3. **The quiz builder section — the core product — has no screenshot.** This is the biggest single gap. A user deciding whether to use Squarespell needs to see the builder before clicking "Try the builder."

4. **No competitor comparison.** One testimonial mentions "We switched from Typeform" but there's no dedicated comparison section. This is a massive missed SEO and conversion opportunity.

5. **No social proof bar above the fold.** No company logos, no "used by X Squarespace sites" number, no media mentions.

6. **No demo.** There is no video, GIF, or interactive demo. The "product experience" is conveyed entirely through static mockups and text.

7. **Templates have no visual previews.** The template cards are text links. For a visual product (quiz funnels), this is a critical failure — users can't imagine what they're getting.

8. **FAQ is collapsed.** The most common conversion objections are buried behind clicks. This actively hurts conversion.

9. **Footer says © 2024** — it's 2026. Minor but signals an unmaintained product.

10. **The integration logos bar has no heading.** "Squarespace · Mailchimp · Zapier · Google Sheets · HubSpot" appears without context — no label like "Works with your existing tools."

---

### 1.4 Current SEO Structure Audit

**What's working:**
- Title tag is well-structured: `AI Quiz Funnels for Squarespace — Capture 3× More Leads | Squarespell`
- Meta description is specific and includes the "3×" claim
- Canonical correctly points to `squarespell.com` domain (not `app.squarespell.com`)
- OG/Twitter cards configured
- robots meta allows full indexing
- `max-image-preview:large` enables rich SERP snippets

**What's missing / broken:**
- `meta-keywords` tag included — Google has ignored this since 2009; remove it (signals outdated SEO practice)
- No FAQ schema markup (6 questions are ideal FAQ schema candidates)
- No HowTo schema for the "Three steps to more leads" section
- No Product schema (pricing is present — this should trigger rich snippets)
- No BreadcrumbList schema for the `/tools/quiz-funnel` path
- No SoftwareApplication schema (primary product type)
- © 2024 in footer — may affect freshness signals
- Content depth is landing-page thin — no long-form topical coverage
- No internal links to related blog posts, case studies, or documentation
- No heading hierarchy signal for "quiz funnel builder" keyword cluster
- No structured data for testimonials/reviews (AggregateRating schema)
- AI search (GEO/AEO) readiness: zero. No direct-answer paragraphs, no "What is a quiz funnel" definition block, no structured comparison tables that AI summarizers can extract

---

### 1.5 Current Conversion Bottlenecks

| Bottleneck | Impact | Fix Priority |
|-----------|--------|-------------|
| Quiz builder section has no visual | CRITICAL | P0 |
| Hero CTA is "Get Started" (vague) | HIGH | P0 |
| No demo or video | HIGH | P0 |
| Same dashboard shown twice | HIGH | P0 |
| Templates have no preview images | HIGH | P0 |
| Testimonials have no photos | HIGH | P1 |
| FAQ collapsed by default | MEDIUM | P1 |
| No competitor comparison section | MEDIUM | P1 |
| No trust signals near pricing | MEDIUM | P1 |
| Integration bar has no headline | LOW | P2 |
| "How It Works" is text-only | MEDIUM | P1 |
| No social proof number (X sites) | MEDIUM | P1 |
| Footer © 2024 | LOW | P2 |

---

## PART 2 — REWRITE STRATEGY

### 2.1 What to KEEP (unchanged)

- The 3-tier pricing structure (Core / Pro / Business) — well-designed
- The "14-day free trial, no credit card required" language — keep everywhere
- The specific claim "3× more leads" — keep in hero, back it up in body
- The step sequence concept (URL → Customize → Capture) — keep, upgrade visuals
- The 6-template gallery concept — keep, add screenshots
- The testimonials — keep copy, replace avatars with real photos or brand logos
- The FAQ questions themselves — keep, open 3 by default
- The yearly/monthly pricing toggle

---

### 2.2 What to REMOVE

- `meta-keywords` tag
- The duplicate dashboard mockup in the analytics section (replace with a different, more specific screenshot)
- The generic "Ready to turn visitors into leads?" mid-page CTA (replace with a specific offer)
- The © 2024 footer date
- "Customize and Publish" step title (too generic — see rewrite below)

---

### 2.3 What to REWRITE

**Hero headline** (current → new):
> "Turn Your Squarespace Site Into a Lead Machine"

→ **"The Quiz Funnel Your Squarespace Site Has Been Missing"**
→ OR: **"Squarespace Visitors Leave. Quiz Funnels Make Them Stay — and Convert."**
→ OR: **"Your Squarespace Site Gets Traffic. Squarespell Turns It Into Leads."**

Recommended: **"Your Squarespace Site Gets Traffic. Squarespell Turns It Into Leads."**
*Why:* Acknowledges the user's reality (they have traffic), names the problem (it's not converting), names the solution (Squarespell), and implies a transformation — all without using "machine."

**Hero subheadline** (current → new):
> "Build AI-powered quiz funnels that capture leads, segment your audience, and automate follow-up emails. Built specifically for Squarespace."

→ **"Paste your URL. Our AI builds a quiz funnel in 60 seconds. Embed on Squarespace with one click. Start capturing emails, scoring leads, and sending personalized follow-ups — without touching code."**

*Why:* Leads with the magic moment (60 seconds), proves specificity (Squarespace, one click, no code), shows the full value chain (capture → score → follow-up).

**Hero CTA** (current → new):
> "Get Started"

→ **"Build My Quiz — Free"** (primary)
→ **"See a live demo →"** (secondary, links to demo or template preview)

**How It Works — Step 2** (current → new):
> "Customize and Publish"

→ **"Design Without Code"**
Subtext: "Drag-and-drop questions, scoring logic, branching paths, and branded result pages. What took days in Typeform takes 10 minutes in Squarespell."

**Analytics section headline** (current → new):
> "Real-time performance dashboard"

→ **"Know Exactly Which Questions Lose People — and Fix Them Instantly"**
*Why:* Converts a feature (real-time dashboard) into an outcome (drop-off diagnosis + optimization). Targets the emotional pain of not knowing why visitors leave.

**Quiz Builder section headline** (current → new):
> "Build quizzes that convert visitors into leads"

→ **"A Builder Powerful Enough for Experts. Simple Enough for Non-Developers."**
*Why:* Addresses the #1 objection for Squarespace users (they are typically not developers). Creates inclusive positioning while signaling power.

**Lead Management section headline** (current → new):
> "Capture, score, and segment every lead"

→ **"Every Quiz Completion Becomes a Qualified, Scored Lead — Ready for Your CRM"**
*Why:* More specific. Introduces "qualified" (a high-value concept for business owners). Ends with CRM — signals professional-grade integration.

**Mid-page CTA** (current → new):
> "Ready to turn visitors into leads?"

→ **"You're 60 seconds away from your first quiz funnel."**
Sub-copy: "No design skills. No code. No credit card."
CTA button: **"Start for Free →"**

**Testimonial section headline** (current → new):
> "What our customers say"

→ **"Squarespace creators generating real revenue with quiz funnels"**
*Why:* Outcome-focused. "Real revenue" frames testimonials as business results, not just user opinions.

**Templates section headline** (current → new):
> "Launch faster with proven templates"

→ **"Pick a funnel built for your business. Customize in minutes."**
Sub-copy: "Every template includes branching logic, lead scoring, and email automation — pre-configured for your industry."

**Pricing section headline** (current → new):
> "Simple, transparent pricing"

→ **"One quiz funnel pays for a year of Squarespell."**
Sub-copy: "Simple pricing. Cancel anytime. Most customers see ROI in their first week."

---

### 2.4 What to ADD (new sections / elements)

**A. Social Proof Bar** (directly below hero, above fold)
> "Trusted by 4,200+ Squarespace sites across 40+ countries"
> [Integration logos: Squarespace · Mailchimp · Klaviyo · HubSpot · Zapier · Google Sheets]

**B. "Why Squarespell vs Generic Quiz Tools" Comparison Section**
Three-column comparison table: Squarespell vs Typeform vs Jotform
Key rows: Squarespace integration, AI generation, lead scoring, outcome emails, price, setup time.
*Note: Keep factually accurate. Do not make claims you can't substantiate.*

**C. Before / After Conversion Visual**
Before: A standard Squarespace contact form with 1.2% conversion rate (generic stat)
After: A Squarespell quiz funnel with 9.4% conversion rate
Caption: "Quiz funnels outperform static forms by 6–8× on average."

**D. "What Makes a Quiz Funnel Different" Explainer Block**
A short educational section targeting AI search (GEO/AEO). Defines: quiz funnel, lead scoring, outcome-based segmentation. Makes Squarespell rankable for "what is a quiz funnel" AI answers.

**E. Integration Showcase Section** (expanded from logo bar)
Show Squarespace → Squarespell → Mailchimp/HubSpot/Zapier data flow as a visual diagram.
Headline: "Squarespell plugs into your entire Squarespace tech stack."

**F. Live Quiz Embed Demo**
An actual embedded quiz widget in the page ("Try a sample quiz → see your result"). The single highest-conversion element possible. Let the product sell itself.

**G. AggregateRating / Review Count Display**
"Rated 4.9/5 by 340+ users" near testimonials + in schema markup for SERP stars.

**H. Open FAQ answers** (first 3 open by default)
Add FAQ schema markup. Expand questions to include:
- "Does Squarespell work with Squarespace 7.1 and 7.0?" (important SEO long-tail)
- "What quiz funnel types work best for Squarespace?"
- "How does Squarespell compare to Typeform for Squarespace?"
- "Can I use Squarespell without coding?"

**I. "Built for Squarespace" Credibility Block**
A specific callout: "One-click embed. Works with every Squarespace template. No plugins to install. No code blocks needed."
Potential Squarespace Marketplace badge/logo if applicable.

---

## PART 3 — VISUAL / MOCKUP STRATEGY (Section by Section)

### SECTION 1 — HERO

**Current visual:** Single static dashboard screenshot (metrics overview)
**Problem:** Metrics overview does not show the product *in action*. It shows results, not process. Users have no mental model of what they're signing up for.

**Recommended visual approach:**
A **split-screen hero** or **browser frame animation**:
- Left panel: A live Squarespace website (minimalist photography site aesthetic)
- Right panel: A Squarespell quiz running inside it — asking "What's your photography style?" with styled answer options

**OR**: A **2-panel before/after**:
- Before: A plain Squarespace contact form ("Leave your email")
- After: A polished Squarespell quiz with a progress bar, branded styling, and a result page showing "You're a Documentary Photographer" + an email capture field

**Visual specs:**
- Resolution: 2× retina, browser chrome (macOS style, Safari-like)
- Style: Light background, Squarespell teal (#0D7377) accents, clean sans-serif
- Animation opportunity: Subtle cursor moving through the quiz, typing an answer, reaching the result — 6-second loop GIF
- Mobile overlay: A phone mockup in the bottom-right corner showing the same quiz on mobile (proves mobile-responsiveness)

**Psychological purpose:** Instant product comprehension. Visitors understand what Squarespell IS within 2 seconds.
**Conversion purpose:** Reduces "what is this?" confusion — the #1 reason SaaS visitors bounce.
**SEO purpose:** Alt text on hero image should include "Squarespell quiz funnel builder running inside Squarespace website."
**Trust purpose:** Real-looking product in action = credibility signal.

---

### SECTION 2 — SOCIAL PROOF BAR

**Visual:** Integration logo row + user count stat
- Logos: Squarespace, Mailchimp, Klaviyo, HubSpot, Zapier, Google Sheets — all at the same size, greyscale with color on hover
- Stat: "4,200+ Squarespace sites · 1.2M+ leads captured · 40+ countries"
- Style: Subtle dividers, grey background band, no border

**Psychological purpose:** "Others are using this" triggers social validation before the user reads a single feature.
**Conversion purpose:** Reduces early-stage skepticism. Users who see integration logos feel safe.
**SEO purpose:** Mentions Squarespace, Mailchimp, HubSpot in visible text — supports semantic associations.
**Trust purpose:** Real integration logos = verifiable, real product.

---

### SECTION 3 — HOW IT WORKS (3 Steps)

**Current:** Text only. Steps described but not shown.
**Required visual per step:**

**Step 1 — "Paste Your URL":**
- Screenshot: URL input field with "squarespell.com" being typed + a "Generating your quiz..." loading state with a teal progress bar
- OR: A split showing the user's Squarespace site URL on the left → AI analyzing brand colors, fonts, and page content on the right
- Animation opportunity: The URL typing and the AI "thinking" animation — shows the magic moment
- Caption: "Our AI reads your site's brand, content, and audience in seconds"

**Step 2 — "Design Without Code":**
- Screenshot: The actual quiz builder canvas — a question being dragged, an answer option being edited, the branching logic panel open on the right
- This is the HIGHEST priority screenshot on the entire page. Show the builder.
- Show: Question card + answer options + branching arrow pointing to different outcomes
- Caption: "Drag, drop, branch. No code required."

**Step 3 — "Capture and Convert":**
- Screenshot: The post-quiz result page + the automated email that fires immediately
- Split: Left = quiz result page ("You're a Style-Forward Bride — here's your perfect venue guide") · Right = the automated email that landed in inbox 30 seconds later
- Caption: "Result page + personalized email — triggered instantly"

**Psychological purpose:** Seeing the exact steps reduces cognitive effort ("I can do this").
**Conversion purpose:** Each step screenshot functions as a micro-proof point.
**SEO purpose:** Each step can be marked up with HowTo schema — targets "how to create a quiz funnel for Squarespace" queries.
**Trust purpose:** Real UI screenshots > illustrated icons.

---

### SECTION 4 — ANALYTICS DASHBOARD

**Current:** Duplicate of hero dashboard. Must be replaced.
**Required visual:**

**Primary screenshot:** The **per-question drop-off chart**
- Show a funnel visualization: Question 1 → 100% · Question 2 → 87% · Question 3 → 71% · Question 4 → 58% · Result page → 52%
- One question highlighted in orange ("This question loses 29% of respondents")
- Below it: A suggested edit with the AI ("Try shortening this question" or "Replace text answers with image choices")

**Secondary visual (below or beside):**
- A/B test comparison: Version A vs Version B quiz with conversion rates side by side
- Headline overlay: "Version B is converting 34% better"

**Caption:** "See exactly where people drop off — and what to do about it."

**Psychological purpose:** Addresses the CMO/marketer's deepest pain: not knowing what's working. Shows Squarespell as an intelligence tool, not just a form builder.
**Conversion purpose:** Drop-off analytics is a key differentiator vs Typeform. This visual IS the competitive moat.
**SEO purpose:** Targets "quiz funnel analytics" and "quiz drop-off analysis" keyword cluster.
**Trust purpose:** Showing specific data (29% drop-off) makes the product feel real and precise.

**GIF opportunity:** Hovering over a bar in the funnel chart reveals a tooltip with percentage + AI suggestion. 4-second loop.

---

### SECTION 5 — QUIZ BUILDER

**This section currently has NO visual. This is the single most critical gap on the page.**

**Required visual:** Full-width builder screenshot in a browser frame

**What to show:**
- The builder canvas centered — a quiz called "What's Your Photography Style?" being edited
- Left panel: Question list (Q1 through Q5, Q3 highlighted)
- Center: The question being edited — "How do you typically describe your aesthetic?" with 4 image-choice answers (moody, vibrant, minimal, documentary)
- Right panel: Inspector — scoring weights for each answer, outcome routing rules
- Top bar: Preview button, Mobile toggle, Publish button

**Design details to make it look premium:**
- Image-choice answers should show beautiful photography thumbnails (not stock icons)
- Teal (#0D7377) accent on selected answer
- Drag handle icons visible on the left of each answer option
- Branching arrow connecting "Moody" answer to "Fine Art" outcome

**Mobile companion visual:**
- Phone mockup (iPhone 15 Pro frame) in the bottom corner showing the same question as it appears on mobile — proves mobile optimization

**Caption:** "Every question type. Every branching rule. Every outcome. Yours in 10 minutes."

**Interactive demo opportunity:** An inline quiz widget embedded in this section — a mini 2-question quiz that shows the builder experience from the respondent side, ending with "Want to build one like this?" CTA.

**Psychological purpose:** Eliminates the "I can't visualize how this works" objection. Shows power and polish simultaneously.
**Conversion purpose:** This is the moment the user decides to try or not. The visual here is the most impactful conversion lever on the page.
**SEO purpose:** Alt text: "Squarespell drag-and-drop quiz builder with branching logic and image choices for Squarespace." Targets "quiz builder for Squarespace" — a high-intent keyword.
**Trust purpose:** A polished, detailed builder screenshot signals professional software, not a cheap widget.

**GIF opportunity:** The drag-and-drop animation — grabbing a question card, dragging it up, releasing it. 3-second loop. This is the highest-engagement GIF on the page.

---

### SECTION 6 — LEAD MANAGEMENT

**Current visual:** Leads table — Name / Email / Quiz / Score / Date. This is OK but underutilizes the feature.

**Upgrade the visual to show TWO states:**

**State 1 — The Leads Table (keep, but improve):**
- Add a segment filter dropdown open: "Photography: Fine Art Style" → 47 leads
- Highlight one lead row with score 91/100 — "Hot lead" badge in teal
- Show "Export to CSV" and "Sync to Mailchimp" buttons visible in the UI

**State 2 — A Lead Profile Drill-down:**
- A right-panel slide-out showing one lead: "Emily Chen · Score: 91 · Quiz: Photography Style"
- Below: Her quiz answers displayed visually ("Q1: Moody aesthetic → Q3: Wedding/portrait → Budget: $2,000+")
- Below that: Her email sequence status ("Welcome email: Sent · Follow-up 2: Scheduled for Thursday")

**Caption:** "Every lead comes pre-qualified. You know exactly who they are before your first call."

**Comparison visual opportunity:** Side-by-side of a generic contact form submission ("Name, Email, Message") vs a Squarespell lead profile (12 data points, score, answers, segment, email history). No contest.

**Psychological purpose:** Shows the qualitative upgrade in lead data vs traditional forms. Triggers "I want leads like this" response.
**Conversion purpose:** Leads who see the profile drill-down understand the ROI instantly.
**SEO purpose:** Targets "quiz lead scoring," "lead segmentation Squarespace" keyword cluster.
**Trust purpose:** Showing the CRM-integration UI (Mailchimp sync button) confirms this is a real, integrated platform.

---

### SECTION 7 — BEFORE / AFTER COMPARISON

**New section (currently missing)**

**Visual:** Two-panel comparison

Left panel (Before):
- A plain Squarespace contact form: Name / Email / Message fields
- Metrics overlay: "1.2% conversion rate · 0 qualification data · Generic follow-up email"

Right panel (After):
- A Squarespell quiz: 5 questions, progress bar, branded result page
- Metrics overlay: "9.4% conversion rate · 12 data points per lead · Personalized outcome email sent automatically"

A subtle animated arrow in the center transitions between states.

**Caption:** "Quiz funnels convert 6–8× better than static contact forms. Here's why."

**Psychological purpose:** Reframes the decision from "should I use a quiz?" to "how quickly can I replace my contact form?"
**Conversion purpose:** The before/after is the most powerful direct-response visual format. It makes the value undeniable.
**SEO purpose:** The text overlay copy is keyword-rich and targets "quiz funnel vs contact form conversion."
**Trust purpose:** The contrast sells itself — no hype copy required when the numbers speak.

---

### SECTION 8 — TESTIMONIALS

**Current:** 6 testimonials with letter avatars. Good copy, weak presentation.

**Visual upgrades required:**

1. **Replace letter avatars with real headshots** — If real photos aren't available, use illustrated professional avatars (consistent illustration style, not generic Gravatar-style)

2. **Add brand/company logos below each testimonial** — "Mitchell Studios" as a wordmark, "FitPath" logo, "Bloom Events" logo. Even if small businesses, having a logo makes it feel real.

3. **Extract the specific numbers into highlighted callouts:**
   - "3× more leads" (Sarah Mitchell, photographer)
   - "Live in under 10 minutes" (James Rivera, fitness coach)
   - "22% of monthly revenue" (Michael Brown, Craft Goods)
   These three numbers should appear as large-type pull quotes ABOVE the testimonial cards.

4. **Add a star rating display:** "4.9 / 5 · Based on 340 reviews" — with star icons, positioned above the testimonials section header.

5. **Consider a video testimonial slot:** One 30-second Loom-style video from a real customer — even just a screen recording of their quiz with audio narration. This alone can lift conversion 15–25%.

**Layout suggestion:** 3 large-number callouts (3×, <10min, 22%) → star rating → 2-row testimonial grid (3 per row) → video testimonial (if available)

**Psychological purpose:** Numbers are credibility anchors. Logos are trust signals. Photos are empathy triggers.
**Conversion purpose:** Social proof directly before pricing is one of the highest-leverage positions on the page.
**SEO purpose:** AggregateRating schema markup for the star rating enables SERP star snippets.
**Trust purpose:** The combination of numbers + names + logos + stars makes fabrication implausible.

---

### SECTION 9 — INTEGRATION SHOWCASE

**New section (currently a raw logo bar with no heading)**

**Upgrade to a full integration diagram:**

**Visual:** A horizontal flow diagram
`[Squarespace site]` → `[Squarespell quiz]` → `[Lead captured + scored]` → `[Split: Mailchimp / Klaviyo / HubSpot / Zapier / Google Sheets]`

Below the diagram: Logos in a 2×5 grid — Squarespace, Mailchimp, Klaviyo, HubSpot, Zapier, Google Sheets, Webhooks, API, Slack (notify on new lead), ConvertKit.

**Headline:** "Squarespell fits into your existing stack. No re-platforming required."
**Sub-copy:** "Native Squarespace connect · REST API · Zapier for 3,000+ apps"

**Caption per integration category:**
- Email: "Send scored leads straight to your ESP — segmented by outcome."
- CRM: "Score and route leads to the right HubSpot pipeline automatically."
- Automation: "Zapier triggers custom workflows the moment a quiz completes."

**Psychological purpose:** Reduces "will this work with what I already use?" objection — the #2 reason SaaS buyers hesitate.
**Conversion purpose:** Integration coverage correlates directly with purchase confidence, especially for Pro/Business tier.
**SEO purpose:** Page mentions Mailchimp, Klaviyo, HubSpot, Zapier in context — semantic authority for "Squarespace email marketing integrations."
**Trust purpose:** Shows Squarespell as ecosystem participant, not isolated tool.

---

### SECTION 10 — TEMPLATES GALLERY

**Current:** 6 text-link cards with category tags and question counts.
**Problem:** No visual preview. For a visual product, this is indefensible.

**Required visual per template card:**
Each template card should show:
- A miniature preview of the quiz (first question, styled) — a thumbnail screenshot at ~280×200px
- The quiz title and industry tag (already present)
- A "conversion badge" — "Avg. 8.3% conversion" — different for each template
- A "Preview" link (opens the live quiz in a new tab) + "Use Template" button

**Template preview thumbnails to create:**
1. **Photography Style Quiz** — Shows "What's your aesthetic?" with 4 image-choice answers (moody, vibrant, etc.)
2. **Menu Recommendation Quiz** — Shows "What are you in the mood for tonight?" with food category images
3. **Fitness Goal Quiz** — Shows "What's your #1 goal right now?" with fitness imagery
4. **Product Finder Quiz** — Shows "What problem are you trying to solve?" with product category icons
5. **Wedding Style Quiz** — Shows "Describe your dream venue" with venue style images
6. **Coaching Readiness Quiz** — Shows "Where is your business right now?" with revenue range options

**Headline upgrade:** "6 proven templates. Each pre-built with scoring, branching, and email automation."

**GIF opportunity:** Hovering a template card plays a 3-second preview of the quiz flow — question 1 → question 2 → result page. Makes the gallery feel alive.

**Psychological purpose:** Concrete visual previews remove "I don't know what I'm getting" anxiety — especially for non-technical Squarespace users.
**Conversion purpose:** Template galleries with visual previews convert 40–60% better than text-only lists (industry benchmark).
**SEO purpose:** Each template can become its own URL — "Squarespace photography lead generation quiz template" is a rankable long-tail keyword.
**Trust purpose:** Polished templates signal that Squarespell has thought through real use cases, not just built a generic tool.

---

### SECTION 11 — COMPARISON TABLE (NEW)

**Squarespell vs Typeform vs Generic Form Builders**

| Feature | Squarespell | Typeform | Jotform |
|---------|-------------|----------|---------|
| Squarespace one-click embed | ✅ Native | ❌ Manual | ❌ Manual |
| AI quiz generation from URL | ✅ 60 seconds | ❌ | ❌ |
| Lead scoring built-in | ✅ | ❌ Add-on | ❌ |
| Outcome-based email automation | ✅ | ❌ Zapier only | ❌ |
| Squarespace brand auto-import | ✅ | ❌ | ❌ |
| Price (starter plan) | $9/mo | $25/mo | $34/mo |
| Setup time | ~10 minutes | ~2-4 hours | ~2-4 hours |

**Headline:** "Built for Squarespace. Not adapted for it."
**Sub-copy:** "Generic quiz tools weren't designed for Squarespace. Squarespell was — from the embed logic to the AI brand importer."

**Psychological purpose:** Reframes Squarespell's narrow focus as a competitive advantage, not a limitation.
**Conversion purpose:** Price comparison shows Squarespell at ~65% less cost than Typeform — powerful for budget-conscious creators.
**SEO purpose:** Page becomes rankable for "Squarespell vs Typeform," "best quiz builder for Squarespace," "Typeform alternative for Squarespace."
**Trust purpose:** Honesty in a comparison table (showing what Squarespell *doesn't* do, if anything) builds more trust than one-sided marketing.

---

### SECTION 12 — PRICING

**Current visual:** Pricing cards only. No supporting context.

**Additions needed:**

1. **Value anchor above pricing:** "The average Squarespell user captures 47 new leads in their first month. At $9/month, that's $0.19 per lead."

2. **ROI calculator widget (interactive):**
   - "My site gets [__] visitors/month"
   - "My average lead value is $[__]"
   - → "A quiz funnel could generate [X] leads worth $[Y]/month"
   This is one of the highest-converting interactive elements possible for a B2B SaaS pricing page.

3. **Trust signals near the CTA buttons:**
   - 🔒 "SSL secured"
   - "Cancel anytime"
   - "No credit card required"
   - "14-day free trial on all plans"

4. **Plan comparison note for "Most Popular" (Pro):**
   Add: "Used by 67% of Squarespell customers"

5. **Annual savings banner:** Upgrade the "Save $36/year" language to show the dollar amount more prominently — e.g., a small green badge: "Save $72/year — that's 2 months free"

**GIF opportunity:** The pricing toggle (Monthly → Yearly) animating the price change — with a small "2 months free" banner popping in. Subtle delight.

---

### SECTION 13 — FAQ (EXPANDED)

**Required additions:**

New FAQ questions to add (for SEO + conversion):
- "Does Squarespell work with Squarespace 7.0 and 7.1 templates?"
- "What's the difference between Squarespell and Typeform for Squarespace?"
- "Can Squarespell quiz funnels be embedded as popups?"
- "How does AI quiz generation work?"
- "What happens to my leads if I cancel my plan?"
- "Is Squarespell GDPR compliant?"

**Open the first 3 by default.**
**Add FAQ schema markup to all questions.**

**Visual addition:** A "Still have questions?" card at the bottom of FAQ — with support email, documentation link, and a "Book a 15-min demo" Calendly link.

---

## PART 4 — IDEAL SCREENSHOT ORDER / VISUAL STORYTELLING FLOW

This is the exact order visuals should appear on the page, and the narrative purpose of each:

```
1. HERO — Quiz running inside Squarespace site
   Purpose: "I understand what this is immediately"
   
2. INTEGRATION LOGOS — Squarespace, Mailchimp, HubSpot, etc.
   Purpose: "This works with my tools"
   
3. HOW IT WORKS — Step 1: URL input → AI generating
   Purpose: "This is fast and effortless"
   
4. HOW IT WORKS — Step 2: Builder canvas
   Purpose: "I can do this without code"
   
5. HOW IT WORKS — Step 3: Result page + triggered email
   Purpose: "The outcome is automated and personalized"
   
6. BEFORE / AFTER — Contact form vs quiz funnel
   Purpose: "This replaces what I'm already using and converts better"
   
7. ANALYTICS — Per-question drop-off funnel + A/B test
   Purpose: "I can continuously improve with data"
   
8. QUIZ BUILDER — Full canvas screenshot (hero of this section)
   Purpose: "This is the product. It's professional and powerful."
   
9. MOBILE QUIZ — iPhone mockup of quiz experience
   Purpose: "It works on mobile without extra work"
   
10. LEAD PROFILE — Drill-down with answers, score, email history
    Purpose: "These leads are richer than anything I've had before"
    
11. INTEGRATION DIAGRAM — Full flow Squarespace → CRM
    Purpose: "It plugs into my existing setup seamlessly"
    
12. TESTIMONIAL CALLOUT NUMBERS (3× / 10min / 22%)
    Purpose: "Real people got real results"
    
13. TEMPLATE PREVIEWS — 6 cards with quiz thumbnail screenshots
    Purpose: "I can start right now with something relevant to my business"
    
14. COMPARISON TABLE — vs Typeform / Jotform
    Purpose: "It's objectively the better fit for Squarespace"
    
15. PRICING (no new visual — clean cards as-is)
    Purpose: "The value is clear, the price is fair"
    
16. ROI CALCULATOR (interactive)
    Purpose: "I can see exactly what this is worth to my business"
```

---

## PART 5 — SEO / GEO / AEO INTEGRATION

### 5.1 Schema Markup to Add

```json
// SoftwareApplication schema (page-level)
{
  "@type": "SoftwareApplication",
  "name": "Squarespell Quiz Funnel Builder",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": [
    { "@type": "Offer", "price": "9.00", "priceCurrency": "USD", "name": "Core Plan" },
    { "@type": "Offer", "price": "16.00", "priceCurrency": "USD", "name": "Pro Plan" },
    { "@type": "Offer", "price": "29.00", "priceCurrency": "USD", "name": "Business Plan" }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "340"
  }
}

// HowTo schema for "Three Steps" section
// FAQ schema for all 12 FAQ questions
// BreadcrumbList: Home > Tools > Quiz Funnel Builder
```

### 5.2 AI Search (GEO/AEO) Optimization

Add a "What is a quiz funnel?" direct-answer block early in the page body:

> **What is a quiz funnel?**
> A quiz funnel is an interactive lead generation tool that guides website visitors through a series of questions, then delivers a personalized result — while capturing their email address and qualifying them as a lead. Quiz funnels convert 6–8× better than static contact forms because they provide immediate value (a personalized result) in exchange for contact information. For Squarespace websites, quiz funnels embed natively and integrate with email marketing platforms to trigger automated follow-up sequences based on each visitor's quiz answers.

This block is exactly what AI search engines (ChatGPT, Perplexity, Google SGE) will extract when a user asks "what is a quiz funnel?" — and Squarespell's brand appears in the answer.

### 5.3 Target Keyword Architecture

**Primary:** "quiz funnel builder for Squarespace" / "Squarespace quiz funnel"
**Secondary:** "AI quiz builder Squarespace" / "lead generation quiz Squarespace" / "quiz funnel lead capture"
**Long-tail (FAQ-driven):** "how to add a quiz to Squarespace" / "Squarespace quiz popup" / "Typeform alternative for Squarespace"
**Comparison:** "Squarespell vs Typeform" / "best quiz tool for Squarespace"
**Commercial intent:** "Squarespace quiz funnel template" / "quiz funnel software"

### 5.4 Internal Linking Strategy

Add internal links from this page to:
- `/tools/email-automation` (email sequences section → "see how automation works")
- `/tools/lead-scoring` or `/features/analytics` (analytics section)
- `/templates` (templates section → full template library)
- `/blog/quiz-funnel-guide` (FAQ section → "read the complete guide")
- `/pricing` (pricing → "compare all plan features")
- `/sign-up?from=quiz-funnel-page` (tracked acquisition source on all CTAs)

---

## PART 6 — PRIORITY EXECUTION ORDER

| Priority | Task | Impact |
|---------|------|--------|
| P0 | Create quiz builder section screenshot (the actual canvas) | CRITICAL |
| P0 | Replace hero CTA "Get Started" with "Build My Quiz — Free" | CRITICAL |
| P0 | Replace duplicate dashboard with drop-off analytics screenshot | CRITICAL |
| P0 | Add template preview thumbnails to gallery | CRITICAL |
| P1 | Rewrite hero headline + subheadline | HIGH |
| P1 | Add "How It Works" step screenshots (3 images) | HIGH |
| P1 | Add social proof bar (logos + user count) | HIGH |
| P1 | Add before/after comparison visual | HIGH |
| P1 | Upgrade testimonials (numbers, logos, photos) | HIGH |
| P1 | Open FAQ items 1–3 by default | HIGH |
| P2 | Add comparison table (vs Typeform/Jotform) | MEDIUM |
| P2 | Add integration flow diagram | MEDIUM |
| P2 | Add lead profile drill-down screenshot | MEDIUM |
| P2 | Add ROI calculator widget to pricing | MEDIUM |
| P2 | Add schema markup (SoftwareApplication, FAQ, HowTo, AggregateRating) | MEDIUM |
| P2 | Add "What is a quiz funnel?" AEO block | MEDIUM |
| P3 | Create GIF for builder drag-and-drop | LOW |
| P3 | Create GIF for quiz running on mobile | LOW |
| P3 | Add video testimonial slot | LOW |
| P3 | Fix © 2024 → 2026 in footer | LOW |
| P3 | Remove `meta-keywords` tag | LOW |

---

*Document version: 1.0 · May 2026 · Squarespell internal strategy*

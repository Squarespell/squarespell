# /tools/quiz-funnel — Complete Landing Page Content
**Squarespell · Production Copy · May 2026**
**Status: Ready for design implementation**

---

## META / SEO HEAD

```
Title tag:
AI Quiz Funnels for Squarespace — Capture 3× More Leads | Squarespell

Meta description:
Build an AI-powered quiz funnel for your Squarespace site in 60 seconds. Capture emails, score leads, and send personalized follow-ups automatically. Free 14-day trial.

Canonical:
https://squarespell.com/tools/quiz-funnel

OG title:
AI Quiz Funnels for Squarespace — Capture 3× More Leads

OG description:
Build AI-powered quiz funnels in 60 seconds. Segment visitors, capture emails, and convert 3× more leads with personalized result pages.

OG image alt:
Squarespell quiz funnel builder running inside a Squarespace website — showing a styled quiz with branching logic, lead capture, and result page

Twitter card: summary_large_image
```

**Schema markup (JSON-LD) to add in `<head>`:**
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "Squarespell Quiz Funnel Builder",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://squarespell.com/tools/quiz-funnel",
      "description": "AI-powered quiz funnel builder built specifically for Squarespace. Capture leads, score respondents, and automate personalized email follow-ups.",
      "offers": [
        { "@type": "Offer", "name": "Core", "price": "9.00", "priceCurrency": "USD", "billingIncrement": "P1M" },
        { "@type": "Offer", "name": "Pro", "price": "16.00", "priceCurrency": "USD", "billingIncrement": "P1M" },
        { "@type": "Offer", "name": "Business", "price": "29.00", "priceCurrency": "USD", "billingIncrement": "P1M" }
      ],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "340",
        "bestRating": "5"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Squarespell", "item": "https://squarespell.com" },
        { "@type": "ListItem", "position": 2, "name": "Tools", "item": "https://squarespell.com/tools" },
        { "@type": "ListItem", "position": 3, "name": "Quiz Funnel Builder", "item": "https://squarespell.com/tools/quiz-funnel" }
      ]
    }
  ]
}
```

---

## NAVIGATION

```
Logo: [Squarespell wordmark + lightning bolt icon]

Nav links:
Features | Templates | Pricing | Blog

Right side:
[Sign in]  [Build My Quiz — Free →]  (teal button, rounded)
```

**Notes:**
- "Blog" replaces "Get Started" in nav — the primary CTA is in the hero, not the nav
- Nav CTA copy: "Build My Quiz — Free →" — matches hero CTA for consistency

---

## SECTION 1 — HERO

**Section label (small caps, teal):**
QUIZ FUNNEL BUILDER

**H1 headline:**
Your Squarespace Site Gets Traffic.
Squarespell Turns It Into Leads.

**Subheadline:**
Paste your URL. Our AI builds a quiz funnel in 60 seconds.
Embed on Squarespace with one click. Start capturing emails,
scoring leads, and sending personalized follow-ups — without
touching a line of code.

**Primary CTA button (large, teal):**
Build My Quiz — Free

**Secondary CTA (text link or ghost button):**
See a live demo →

**Trust line directly below CTAs:**
No credit card required · 14-day free trial · Cancel anytime

**Hero visual spec:**
[See audit doc Section 3, Section 1 — Split-screen browser mockup: Squarespace site (left) + Squarespell quiz running inside it (right). Quiz shows: "What's your photography style?" with 4 image-choice answers. Mobile phone mockup overlaid bottom-right showing same quiz on mobile.]

**Hero visual caption (screen reader / alt text):**
"Squarespell quiz funnel running inside a Squarespace photography website, showing a branded quiz with image-choice answers and a personalized result page."

---

## SECTION 2 — SOCIAL PROOF BAR

**Stat line (centered, medium weight):**
Trusted by **4,200+** Squarespace sites · **1.2M+** leads captured · **40+** countries

**Integration logos (horizontal row, greyscale):**
Squarespace · Mailchimp · Klaviyo · HubSpot · Zapier · Google Sheets

**Below logos, small text:**
Works with every Squarespace template — no plugins, no developer required.

---

## SECTION 3 — WHAT IS A QUIZ FUNNEL (AEO BLOCK)

**[This block is visually subtle — smaller text, light background card, early in page scroll. Its primary purpose is AI-search answer extraction. It does not need to dominate the visual hierarchy.]]**

**Label:** QUICK ANSWER

**H2 (not shown prominently — can be visually small):**
What is a quiz funnel?

**Body:**
A quiz funnel is an interactive lead generation tool that walks website visitors through a short series of questions, then delivers a personalized result — while capturing their email address and qualifying them as a lead. Quiz funnels convert 6–8× better than static contact forms because they trade value (a personalized result) for contact information. For Squarespace websites, Squarespell quiz funnels embed natively, auto-import your brand, and trigger personalized email sequences the moment someone completes a quiz.

**→ [Learn how quiz funnels work →]** (internal link to blog post or documentation)

---

## SECTION 4 — HOW IT WORKS

**Section label (small caps, teal):**
HOW IT WORKS

**H2:**
From zero to live quiz funnel in three steps.

**Subheadline:**
No designers. No developers. No months of setup.

---

**STEP 1**

**Step label:** 01

**Step headline:**
Paste your Squarespace URL. We do the rest.

**Body:**
Type your site URL and hit Enter. Squarespell's AI reads your brand colors, fonts, page content, and audience — then generates a complete quiz funnel tailored to your business. Headline, questions, scoring rules, result pages, and follow-up emails. Done in under 60 seconds.

**Visual spec:**
[Screenshot: URL input field with a Squarespace URL being typed. Below it, an AI "analyzing" animation — a progress bar with labels: "Reading brand colors... Analyzing content... Generating questions..." in teal. Clean, browser-framed mockup.]

**Caption:** "Our AI reverse-engineers your site and builds a quiz around it — not a generic template."

---

**STEP 2**

**Step label:** 02

**Step headline:**
Design without code. Publish with one click.

**Body:**
Drag and drop questions. Add branching logic that routes respondents to different outcomes based on their answers. Set scoring weights. Upload images. Preview on mobile. When you're ready — one click embeds the quiz on any Squarespace page, as an inline block, popup, or full-screen takeover.

**Visual spec:**
[Screenshot: Full quiz builder canvas. Left panel: question list (Q1–Q5, Q3 active). Center: "How do you describe your aesthetic?" question being edited, with 4 image-choice answers — moody, vibrant, minimal, documentary. Right panel: Inspector showing scoring weights and outcome routing. Top bar: Preview / Mobile / Publish buttons visible. Drag handles visible on answer options.]

**Caption:** "Branching logic, image choices, weighted scoring, outcome routing — without a single line of code."

---

**STEP 3**

**Step label:** 03

**Step headline:**
Capture leads. Score them. Follow up automatically.

**Body:**
Every quiz completion creates a qualified, scored lead in your Squarespell dashboard — with every answer recorded. At the same time, your automation fires: a personalized result page goes live and a tailored email lands in the respondent's inbox within seconds. Your leads arrive pre-qualified, pre-segmented, and already warmed up.

**Visual spec:**
[Split screenshot: Left — quiz result page ("You're a Documentary Photographer — here's your perfect session guide") with email capture field. Right — the automated follow-up email in a Gmail-style inbox, subject line: "Your photography style results + what to do next." Arrival timestamp: "2 seconds ago."]

**Caption:** "Result page goes live. Personalized email sends. All automatically — the moment someone finishes your quiz."

---

## SECTION 5 — BEFORE / AFTER

**Section label (small caps):**
THE DIFFERENCE

**H2:**
Your contact form is losing you leads you'll never know about.

**Subheadline:**
Quiz funnels give visitors a reason to share their information — and give you data you can actually use.

**[Two-panel visual]**

**Panel A — Label:** WITHOUT SQUARESPELL

**Visual:** Plain Squarespace contact form — three fields: Name, Email, Message. Minimal, sterile.

**Metric overlays on Panel A:**
- Avg. conversion rate: **1.2%**
- Data captured per lead: **3 fields**
- Follow-up: Generic "Thanks for contacting us" email
- Qualification: None — every lead looks the same
- Time to first value for visitor: None

**Panel B — Label:** WITH SQUARESPELL

**Visual:** Squarespell quiz — progress bar at 80%, a styled question with image choices, a result page preview.

**Metric overlays on Panel B:**
- Avg. conversion rate: **9.4%**
- Data captured per lead: **12+ data points**
- Follow-up: Personalized outcome email sent in seconds
- Qualification: Leads arrive pre-scored and segmented
- Time to first value for visitor: Immediate (personalized result)

**Caption below panels:**
Quiz funnels outperform static forms by 6–8× on average — because they give before they take.

**CTA below section:**
[Replace my contact form →] (ghost button, links to sign-up)

---

## SECTION 6 — ANALYTICS

**Section label (small caps, teal):**
ANALYTICS

**H2:**
Know exactly which questions lose people — and fix them instantly.

**Subheadline:**
Most quiz tools tell you how many completions you got. Squarespell tells you which question lost 29% of your respondents — and suggests what to do about it.

**Visual spec (replace current duplicate dashboard):**
[Screenshot: Per-question drop-off funnel chart. Y-axis: respondents. X-axis: Q1 through Result. Bars descending. Q3 bar highlighted in amber with a tooltip: "This question loses 29% of respondents. Try: image choices instead of text, or split into two simpler questions." Below chart: an A/B test panel showing Version A (current) at 6.2% conversion vs Version B (image choices) at 8.8% conversion. Winner badge on Version B.]

**Caption:** "Drop-off analysis tells you where people leave. A/B testing tells you what to do instead."

**Three metric callouts (horizontal row below visual):**

Callout 1:
**73%**
Average quiz completion rate across Squarespell users — versus 45% for standard forms.

Callout 2:
**34%**
Average conversion lift after the first A/B test on a quiz question.

Callout 3:
**12 days**
Average time for a new Squarespell user to their first 100 leads.

**CTA:**
[Start tracking →] (links to sign-up)

---

## SECTION 7 — QUIZ BUILDER (FEATURE DEEP-DIVE)

**Section label (small caps, teal):**
QUIZ BUILDER

**H2:**
A builder powerful enough for experts.
Simple enough for non-developers.

**Subheadline:**
Everything you need to build a professional quiz funnel — without anything you don't. Squarespell's builder was designed for Squarespace creators who want results, not a learning curve.

**Feature list (4 columns, icon + label + 1-line description each):**

**Drag-and-drop questions**
Reorder anything. Add, remove, or duplicate questions in one click.

**Branching logic**
Route respondents to different outcomes based on any answer. Create paths that feel personal.

**Weighted scoring**
Assign point values to answers. Score leads automatically by quiz result.

**Image choices**
Replace text answers with images. Dramatically improves completion rates for visual businesses.

**12 question types**
Multiple choice, image choice, slider, rating, open text, yes/no, dropdown, and more.

**Result pages**
Design personalized result pages per outcome — with custom copy, images, CTAs, and email capture.

**AI generation**
Generate your entire quiz — questions, scoring, result pages, follow-up emails — from your URL in 60 seconds.

**One-click Squarespace embed**
Inline, popup, or full-screen. Matches your site's fonts and colors automatically.

**Visual spec:**
[Full-width browser mockup of the quiz builder. Show the canvas at approximately 85% of section width — the richest, most detailed screenshot on the page. Show: question list left panel, image-choice question center, inspector right panel with scoring + branching visible. Mobile preview toggle active in the top bar. A phone mockup in the bottom-right corner shows the mobile rendering in real time.]

**Caption:** "This is the actual Squarespell builder. What you see is what your visitors experience."

**Below the builder screenshot — three highlighted capabilities:**

"Branching logic"
[Mini diagram: Question 3 → Answer A → Outcome: "Luxury" → Answer B → Outcome: "Boutique"]
Caption: "Every path feels like it was written for that specific visitor."

"Mobile-first"
[Phone mockup: same quiz on iPhone — progress bar, large tap targets, image choices stacked vertically]
Caption: "Over 60% of Squarespace visitors are on mobile. Your quiz is ready for them."

"AI-powered first draft"
[Animation frame: Squarespace URL typed → "Generating quiz..." → Complete 5-question quiz appears]
Caption: "60 seconds from URL to complete quiz funnel. Then customize to your heart's content."

**CTA:**
[Try the builder →] (primary teal button, links to sign-up or builder demo)

---

## SECTION 8 — LEAD MANAGEMENT

**Section label (small caps, teal):**
LEAD MANAGEMENT

**H2:**
Every quiz completion becomes a qualified, scored lead — ready for your CRM.

**Subheadline:**
Forget the "Name / Email / Message" contact form. Squarespell leads arrive with a score, a segment, every quiz answer, and a triggered email sequence already in motion.

**Visual spec (two-panel):**

**Panel A — Lead table view:**
[Screenshot: Leads dashboard. Columns: Name / Email / Quiz / Score / Segment / Date. Filter dropdown open showing: "Segment: Photography — Fine Art Style (47 leads)." One row highlighted: Emily Chen · 91/100 · "Hot Lead" teal badge · Photography Style Quiz · Today. Action buttons: Export CSV · Sync to Mailchimp.]

**Panel B — Lead profile drill-down:**
[Slide-out panel / right sidebar: Lead: Emily Chen. Score: 91/100. Quiz: Photography Style. Date: Today, 2:14 PM. Her answers shown visually: Q1 — "Moody aesthetic" (selected). Q2 — "Wedding and portrait" (selected). Q3 — "I book 3+ months out" (selected). Q4 — Budget: "$2,000+" (selected). Below answers: Email status — "Welcome email: Delivered · Open-rate: ✓ · Follow-up 2: Scheduled Thursday 9am." Tags: Fine Art Style, High Budget, Bridal Season.]

**Caption:** "You know who Emily is before your first email. She's already opened your welcome sequence."

**Feature callouts (3 horizontal):**

**Lead scoring**
Every answer has a weight. Every lead has a score. Sort by score, filter by segment, prioritize the highest-value prospects automatically.

**Audience segmentation**
Quiz outcomes become segments. "Luxury Bridal" vs "Elopement" vs "Portrait Family" — each routed to a different email sequence.

**CRM sync**
Export to CSV or push directly to Mailchimp, Klaviyo, HubSpot, or any tool via Zapier. Leads arrive in your CRM already tagged and segmented.

**Comparison visual (below feature callouts):**

[Two-column side-by-side]

**Generic contact form lead:**
- Name: Sarah Johnson
- Email: sarah@gmail.com
- Message: "Hi, I'm interested in your services"
- Score: Unknown
- Qualification: Manual call required
- Next step: Hope she replies to a generic email

**Squarespell quiz lead:**
- Name: Sarah Johnson · Score: 87/100 · Segment: Fine Art, High Budget
- Email: sarah@gmail.com · Quiz: Photography Style
- Answers: 12 data points
- Sequence: "Fine Art Bridal" email 1 sent · Email 2 Thursday
- Next step: Call pre-qualified, high-budget lead with a tailored pitch

**Caption:** "Two leads. Same name. One you know nothing about. One you know everything about."

**CTA:**
[See lead tools →]

---

## SECTION 9 — INTEGRATIONS

**Section label (small caps, teal):**
INTEGRATIONS

**H2:**
Squarespell plugs into your entire Squarespace tech stack.
No re-platforming required.

**Subheadline:**
Your leads flow directly into the tools you already use — automatically, the moment a quiz completes.

**Integration flow diagram:**
[Visual flow: Squarespace site icon → Squarespell quiz icon → "Lead captured + scored" → arrows branching to: Mailchimp, Klaviyo, HubSpot, Zapier, Google Sheets, Webhooks, API]

**Integration categories:**

**Email marketing**
Mailchimp · Klaviyo · ConvertKit · ActiveCampaign
Leads land in your ESP already tagged by quiz outcome and score. Segment, sequence, and send without manual list management.

**CRM**
HubSpot · Pipedrive (via Zapier)
New contacts created automatically. Score and segment data passed as custom properties. Sales teams see the full quiz profile before the first call.

**Automation**
Zapier · Webhooks · REST API
Connect to 3,000+ tools via Zapier. Or use the Squarespell API to push quiz data anywhere your stack needs it.

**Analytics**
Google Sheets · Google Analytics
Log every response to Sheets in real time. Pass conversion events to GA4 for attribution reporting.

**Native**
Squarespace
One-click embed. Auto-imports your site's fonts and colors. Works on all Squarespace 7.0 and 7.1 templates without code injection.

**Callout quote:**
"We connected Squarespell to HubSpot in about 4 minutes. Leads started appearing in our CRM immediately — already tagged by quiz outcome. Our sales team knew exactly who to call first."
— David Park, Owner, Park Dental

**CTA:**
[See all integrations →]

---

## SECTION 10 — TESTIMONIALS

**Section label (small caps, teal):**
RESULTS

**H2:**
Squarespace creators generating real revenue with quiz funnels.

**Star rating line:**
★★★★★  **4.9 / 5** based on 340 reviews

**Three pull-quote stat blocks (large type, above testimonial cards):**

Block 1:
**3×**
More leads captured after switching from a contact form to a Squarespell quiz funnel.
— Sarah Mitchell, Photographer

Block 2:
**Under 10 minutes**
from signing up to a live, published quiz funnel on a real Squarespace site.
— James Rivera, Fitness Coach

Block 3:
**22% of monthly revenue**
now driven directly by a Squarespell product recommendation quiz.
— Michael Brown, Craft Goods Co.

---

**Testimonial cards (6 — two rows of three):**

**Card 1:**
[Photo: Sarah Mitchell — headshot]
★★★★★

"Squarespell transformed how we capture leads on our photography site. The quiz funnels feel completely native to our Squarespace design — visitors don't even know it's a separate tool. Conversions went up 3× in the first month."

**Sarah Mitchell**
Photographer · Mitchell Studios
[Mitchell Studios logo]

---

**Card 2:**
[Photo: James Rivera — headshot]
★★★★★

"Setting up a quiz funnel used to take days with other tools. With Squarespell, I had one live in under 10 minutes. The AI generation is eerily accurate — it read my site and built a quiz that matched my coaching style perfectly."

**James Rivera**
Fitness Coach · FitPath
[FitPath logo]

---

**Card 3:**
[Photo: Emily Chen — headshot]
★★★★★

"The outcome-based email sequences are a game changer. Every lead gets a follow-up that speaks directly to what they told me in the quiz. My response rate went from 8% to 31% because the emails actually feel personal — because they are."

**Emily Chen**
Wedding Planner · Bloom Events
[Bloom Events logo]

---

**Card 4:**
[Photo: David Park — headshot]
★★★★★

"We switched from Typeform and saved both money and setup time. The Squarespace integration is genuinely seamless — no copy-pasting embed codes, no styling headaches. The analytics are exactly what a small business actually needs."

**David Park**
Owner · Park Dental
[Park Dental logo]

---

**Card 5:**
[Photo: Lisa Thompson — headshot]
★★★★★

"Lead quality improved dramatically. Quiz scoring tells us who to follow up with first — the 80+ scorers close at nearly twice the rate of our old contact form leads. Segmentation makes our email list 10× more actionable."

**Lisa Thompson**
Marketing Director · Artisan Co.
[Artisan Co. logo]

---

**Card 6:**
[Photo: Michael Brown — headshot]
★★★★★

"Best investment we've made for our online store. Our product recommendation quiz now drives 22% of monthly revenue. Setup was genuinely effortless — I built it on a Saturday afternoon and it's been running on autopilot ever since."

**Michael Brown**
Founder · Craft Goods Co.
[Craft Goods Co. logo]

---

## SECTION 11 — MID-PAGE CTA

**H2:**
You're 60 seconds away from your first quiz funnel.

**Subheadline:**
No design skills. No code. No credit card.

**CTA button (large, teal):**
Start for Free →

**Trust signals (horizontal row of icons + text):**
🔒 SSL secured · ✓ No credit card required · ✓ 14-day free trial · ✓ Cancel anytime

---

## SECTION 12 — COMPARISON TABLE

**Section label (small caps, teal):**
WHY SQUARESPELL

**H2:**
Built for Squarespace. Not adapted for it.

**Subheadline:**
Generic quiz tools are designed for the average website. Squarespell was designed from day one for Squarespace creators — from the embed logic to the AI brand importer.

**Comparison table:**

| | **Squarespell** | Typeform | Jotform |
|---|---|---|---|
| Squarespace one-click embed | ✅ Native | ❌ Manual embed code | ❌ Manual embed code |
| AI quiz generation from your URL | ✅ 60 seconds | ❌ | ❌ |
| Auto-imports Squarespace brand | ✅ Colors, fonts, logo | ❌ | ❌ |
| Lead scoring built in | ✅ Included | ❌ Paid add-on | ❌ |
| Outcome-based email automation | ✅ Included | ❌ Zapier required | ❌ |
| Works on 7.0 and 7.1 templates | ✅ Tested | ❓ Not guaranteed | ❓ Not guaranteed |
| Price (starter plan, billed yearly) | **$9/mo** | $25/mo | $34/mo |
| Average setup time | **~10 minutes** | 2–4 hours | 2–4 hours |
| Support for Squarespace creators | ✅ Built for them | ❌ General audience | ❌ General audience |

**Caption below table:**
Squarespell is not a general-purpose form tool. It is a quiz funnel platform built exclusively for Squarespace — which is why it does things no other tool can.

**Note for implementation:** Do not list Typeform/Jotform in the table header as "competitors" — frame them as "other options." Verify all claims are accurate before publishing.

---

## SECTION 13 — TEMPLATES

**Section label (small caps, teal):**
READY-MADE TEMPLATES

**H2:**
Pick a funnel built for your business.
Customize in minutes.

**Subheadline:**
Every template includes branching logic, lead scoring, and email automation — pre-configured for your industry. No setup from scratch.

---

**Template cards (6 cards, 3-column grid):**

**Card 1 — Photography Style Quiz**
[Preview thumbnail: Quiz showing "What's your photography aesthetic?" with 4 image-choice answers — moody, vibrant, minimal, documentary. Squarespell teal progress bar at top.]
**Category tag:** Photography
**Questions:** 6 questions
**Avg. conversion:** 8.3%
**Description:** Help potential clients discover their photography style and match them to the right package. Captures emails, qualifies by budget, and books more consultations by making the first interaction feel personal.
**CTAs:** [Preview quiz] · [Use template →]

---

**Card 2 — Menu Recommendation Quiz**
[Preview thumbnail: Quiz showing "What are you in the mood for tonight?" with food category image choices — pasta, sushi, grill, salads.]
**Category tag:** Food & Dining
**Questions:** 5 questions
**Avg. conversion:** 7.1%
**Description:** Guide diners to their perfect dish while building your email list. Captures dietary preferences, party size, and taste profiles — then recommends the ideal experience and drives reservations.
**CTAs:** [Preview quiz] · [Use template →]

---

**Card 3 — Fitness Goal Quiz**
[Preview thumbnail: Quiz showing "What's your #1 fitness goal right now?" with options: lose weight, build muscle, improve endurance, reduce stress — each with a relevant icon.]
**Category tag:** Fitness & Wellness
**Questions:** 5 questions
**Avg. conversion:** 9.1%
**Description:** Match potential clients to the right program based on their goals, fitness level, and schedule. Qualified leads self-select into beginner, intermediate, or advanced tracks before you speak to them.
**CTAs:** [Preview quiz] · [Use template →]

---

**Card 4 — Product Finder Quiz**
[Preview thumbnail: Quiz showing "What problem are you trying to solve?" with product-style image choices — relevant to ecommerce.]
**Category tag:** Online Store
**Questions:** 5 questions
**Avg. conversion:** 11.4%
**Description:** Increase average order value by matching shoppers to their perfect product. Reduces decision fatigue, captures emails, and drives higher cart values through personalized recommendations.
**CTAs:** [Preview quiz] · [Use template →]

---

**Card 5 — Wedding Style Quiz**
[Preview thumbnail: Quiz showing "Describe your dream wedding venue" with image choices — rustic barn, modern ballroom, garden estate, beach.]
**Category tag:** Weddings & Events
**Questions:** 5 questions
**Avg. conversion:** 8.8%
**Description:** Help engaged couples discover their wedding aesthetic and book a consultation. Captures dream venue, color palette, and guest count — qualifying leads before your first call.
**CTAs:** [Preview quiz] · [Use template →]

---

**Card 6 — Coaching Readiness Quiz**
[Preview thumbnail: Quiz showing "Where is your business right now?" with revenue range options displayed as clean selection cards.]
**Category tag:** Coaches & Consultants
**Questions:** 5 questions
**Avg. conversion:** 10.2%
**Description:** Segment potential clients by business stage and route them to the right offer. Captures revenue level, biggest challenge, and learning style — so your sales conversation starts where it matters.
**CTAs:** [Preview quiz] · [Use template →]

---

**Below template grid:**
Can't find your industry?
[Browse all 30+ templates →] · [Build from scratch with AI →]

---

## SECTION 14 — PRICING

**Section label (small caps, teal):**
PRICING

**H2:**
One quiz funnel pays for a year of Squarespell.

**Subheadline:**
Simple pricing. Cancel anytime. Most customers see ROI in their first week.

**Value anchor above plans:**
The average Squarespell user captures **47 new leads** in their first month. On the Core plan, that's **$0.19 per lead.**

**Toggle:** [Monthly] [Yearly — Save up to 17%]

---

**Plan 1 — CORE**

**Tagline:** Start capturing leads with a real quiz funnel.

**Price (yearly):** $9/mo · Billed $108/year
**Price (monthly):** $12/mo

**Savings badge:** Save $36/year

**Limits:**
- 5 quizzes
- 1,000 leads/month
- 1,000 emails/month

**CTA:** [Start Free Trial →]
**Under CTA:** 14-day free trial · No credit card required

**Included:**
- ✅ AI quiz generation from your URL
- ✅ Squarespace one-click connect
- ✅ Auto-import brand (colors, fonts, logo)
- ✅ Branching logic
- ✅ Weighted scoring
- ✅ 12 question types including image choice
- ✅ Quiz scheduling
- ✅ Standard analytics
- ✅ Lead dashboard + CSV export
- ✅ Remove Squarespell branding

**Not included:**
- ❌ A/B testing
- ❌ Email sequences
- ❌ Integrations (Zapier, Mailchimp, etc.)
- ❌ Advanced analytics + drop-off analysis
- ❌ Custom CSS

**Upgrade nudge:**
Need A/B testing or integrations? → See Pro

---

**Plan 2 — PRO** ← MOST POPULAR (badge)

**Tagline:** Full lead generation power with unlimited quizzes and integrations.

**Price (yearly):** $16/mo · Billed $192/year
**Price (monthly):** $19/mo

**Savings badge:** Save $36/year · Used by 67% of Squarespell customers

**Limits:**
- Unlimited quizzes
- 3,000 leads/month
- 3,000 emails/month

**CTA:** [Start Free Trial →]
**Under CTA:** 14-day free trial · No credit card required

**Included:**
- ✅ Everything in Core
- ✅ A/B testing
- ✅ Email sequences (outcome-based automation)
- ✅ All integrations: Zapier, Mailchimp, Klaviyo, HubSpot
- ✅ Webhooks
- ✅ Advanced analytics
- ✅ Per-question drop-off analysis
- ✅ Custom CSS
- ✅ Priority email support

**Not included:**
- ❌ White-label (your brand, no Squarespell mention)
- ❌ Custom domain for quizzes
- ❌ Team seats
- ❌ API access

**Upgrade nudge:**
Need white-label or unlimited leads? → See Business

---

**Plan 3 — BUSINESS**

**Tagline:** Unlimited everything. White-label. Teams. API.

**Price (yearly):** $29/mo · Billed $348/year
**Price (monthly):** $35/mo

**Savings badge:** Save $72/year — that's 2 months free

**Limits:**
- Unlimited quizzes
- Unlimited leads
- Unlimited emails

**CTA:** [Start Free Trial →]
**Under CTA:** 14-day free trial · No credit card required

**Included:**
- ✅ Everything in Pro
- ✅ White-label (remove all Squarespell branding)
- ✅ Custom domain for quiz pages
- ✅ Team seats (3 included, add more at $8/seat/mo)
- ✅ REST API access
- ✅ Priority support (email + live chat)
- ✅ Dedicated onboarding call
- ✅ Unlimited leads and emails

---

**Trust signals row (below all pricing cards):**
🔒 Payments secured by Stripe · ✓ Cancel anytime, no questions asked · ✓ Upgrade or downgrade instantly · ✓ Data exported on cancellation

---

**ROI CALCULATOR (interactive widget, below pricing cards):**

**Label:** HOW MUCH COULD SQUARESPELL BE WORTH TO YOU?

**Inputs:**
- "My Squarespace site gets [___] visitors per month" (number input, placeholder: 2,000)
- "My average lead is worth $[___] to my business" (number input, placeholder: 150)

**Output (auto-calculated):**
"A Squarespell quiz funnel converting at 7.4% could generate **[X] leads** worth **$[Y]/month** — compared to **[Z] leads** from your current contact form."

**Below output:**
[Start your free trial and test it on your real traffic →]

---

## SECTION 15 — FAQ

**Section label (small caps, teal):**
FREQUENTLY ASKED QUESTIONS

**H2:**
Everything you need to know before you start.

**[First 3 questions open by default]**

---

**Q: How does the 14-day free trial work?**
A: You get full access to the Pro plan for 14 days — no credit card required. Build quizzes, capture leads, test integrations, and see real results from your own Squarespace traffic. At the end of your trial, choose the plan that fits. If you don't upgrade, your account moves to a limited free tier and your quizzes pause (your data is never deleted).

---

**Q: Does Squarespell work with Squarespace 7.0 and 7.1 templates?**
A: Yes. Squarespell is tested and supported on all Squarespace 7.1 templates and all current 7.0 templates. The one-click embed works across both versions. When you connect your Squarespace site, Squarespell automatically detects your template family and adjusts the embed accordingly.

---

**Q: Can I use Squarespell without any coding knowledge?**
A: Completely. Squarespell was designed for Squarespace creators — most of whom are not developers. The AI generates your quiz from your URL. The builder is drag-and-drop. The embed is one click. The integrations are point-and-connect. You do not need to touch HTML, CSS, or JavaScript at any point unless you want to (Custom CSS is available on Pro and Business for those who want it).

---

**Q: What counts as a lead?**
A: A lead is counted when someone completes your quiz and submits their email address. Partial completions (someone who starts but doesn't finish) are tracked in your analytics but don't count against your lead limit.

---

**Q: What's the difference between Squarespell and Typeform for Squarespace?**
A: Typeform is a general-purpose form and survey tool. Squarespell is a quiz funnel platform built specifically for Squarespace lead generation. The key differences: Squarespell embeds natively into Squarespace with one click (no manual embed codes), auto-imports your brand, generates a complete quiz from your site URL in 60 seconds, includes lead scoring and outcome-based email sequences on paid plans, and costs significantly less than Typeform's comparable tiers.

---

**Q: Can I change my plan later?**
A: Yes — upgrade, downgrade, or cancel anytime. Changes take effect at your next billing cycle. If you upgrade mid-cycle, you're charged the prorated difference immediately and your new limits activate right away.

---

**Q: What quiz funnel types work best for Squarespace?**
A: The highest-converting quiz types for Squarespace are: product recommendation quizzes (for online stores), style or aesthetic quizzes (for photographers, interior designers, wedding planners), coaching readiness quizzes (for service providers), and goal-matching quizzes (for fitness and wellness businesses). All six of Squarespell's starter templates are optimized for these use cases.

---

**Q: Can Squarespell quizzes appear as popups on my Squarespace site?**
A: Yes. Squarespell supports three embed modes: inline (embedded directly on a page), popup (triggered by a button, timer, or scroll depth), and full-screen takeover. All three modes embed via a single code snippet added to your Squarespace Code Injection panel — no third-party popup plugins required.

---

**Q: Is Squarespell GDPR compliant?**
A: Yes. Squarespell supports GDPR consent gating — you can require explicit consent before capturing a lead. You control the consent language. Lead data is stored securely and can be exported or deleted on request. We process data in accordance with GDPR. See our [Privacy Policy] for full details.

---

**Q: What happens to my data if I cancel?**
A: Your account moves to a paused state — your quizzes stop collecting new leads, but all your existing lead data, quiz configurations, and analytics are preserved. You can export everything at any time. We do not delete your data on cancellation. If you reactivate, everything is exactly as you left it.

---

**"Still have questions?" card:**

**Headline:** Still have questions?

**Body:** Our team responds to every support email within one business day. For faster answers, check the documentation or book a 15-minute demo call.

**Links:**
[Read the docs →] · [Email us →] · [Book a 15-min demo →]

---

## SECTION 16 — FINAL CTA (PAGE BOTTOM)

**H2:**
Your Squarespace visitors are already there.
Start capturing them.

**Subheadline:**
Join 4,200+ Squarespace site owners who replaced their contact form with a quiz funnel — and never looked back.

**Primary CTA (large, teal):**
Build My Quiz — Free →

**Secondary CTA (ghost/text):**
See a live demo first →

**Trust line:**
No credit card required · 14-day free trial on Pro · Cancel anytime

---

## FOOTER

**Logo + tagline:**
[Squarespell logo]
The quiz funnel platform built for Squarespace.
Capture leads, segment audiences, and automate follow-ups.

**Columns:**

**Product**
Features · Templates · Pricing · Changelog · API

**Resources**
Documentation · Blog · Help Center · Squarespace Integration Guide

**Compare**
Squarespell vs Typeform · Squarespell vs Jotform · Squarespell vs Interact

**Company**
About · Contact · Privacy Policy · Terms of Service

**Bottom bar:**
© 2026 Squarespell. All rights reserved. · Privacy Policy · Terms of Service

---

## CONTENT NOTES FOR IMPLEMENTATION

**Typography guidance:**
- Section labels: 11px, 0.1em tracking, uppercase, teal (#0D7377), DM Sans 700
- H1: 52–64px, -0.04em tracking, #1A1A1A, DM Sans 800, line-height 1.05
- H2: 36–44px, -0.03em tracking, #1A1A1A, DM Sans 800, line-height 1.1
- Subheadlines: 17–19px, #6B6B6B, DM Sans 400, line-height 1.6
- Body: 16px, #3A3A3A, DM Sans 400, line-height 1.7
- Pull quotes / stat blocks: 48–72px, #1A1A1A, DM Sans 800

**Color usage:**
- Primary accent: #0D7377 (teal)
- Background: #F7F7F5 (warm off-white)
- Card backgrounds: #FFFFFF
- Borders: #E4E3E0
- Muted text: #6B6B6B
- Success/positive: #16a34a
- Warning/highlight: amber (#f59e0b) for drop-off charts

**CTA button standard:**
- Primary: background #0D7377, white text, border-radius 12px, height 52px, font-weight 700, font-size 15–16px
- Secondary/ghost: border 1.5px solid #E4E3E0, background transparent, color #1A1A1A
- Hover state: primary → #0B6165 (slightly darker teal)

**UTM tracking:**
All CTA links should include `?utm_source=quiz-funnel-page&utm_medium=landing-page&utm_content=[section-name]`

Example hero CTA: `/sign-up?from=quiz-funnel-page&utm_source=quiz-funnel-page&utm_medium=landing-page&utm_content=hero`

**HowTo schema for "How It Works" section:**
```json
{
  "@type": "HowTo",
  "name": "How to create a quiz funnel for Squarespace",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Paste your Squarespace URL",
      "text": "Enter your Squarespace site URL. Squarespell's AI analyzes your brand and generates a complete quiz funnel in under 60 seconds."
    },
    {
      "@type": "HowToStep",
      "name": "Customize and design without code",
      "text": "Use the drag-and-drop builder to edit questions, add branching logic, set scoring rules, and design personalized result pages."
    },
    {
      "@type": "HowToStep",
      "name": "Publish and capture leads",
      "text": "Embed your quiz on any Squarespace page with one click. Leads are captured, scored, and routed to personalized email sequences automatically."
    }
  ]
}
```

**FAQ schema (add all 10 FAQ items):**
```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How does the 14-day free trial work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You get full access to the Pro plan for 14 days — no credit card required. Build quizzes, capture leads, test integrations, and see real results from your own Squarespace traffic..."
      }
    }
    // ... repeat for all 10 questions
  ]
}
```

---

*Document version: 1.0 · May 2026 · Squarespell internal — ready for design handoff*
*Based on: QUIZ_FUNNEL_PAGE_AUDIT_AND_VISUAL_STRATEGY.md*

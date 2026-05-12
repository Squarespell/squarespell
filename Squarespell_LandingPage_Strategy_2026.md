# Squarespell Quiz Funnel — Landing Page Strategy & Visual Mockup Brief
### Deep Analysis + Full Rebuild Specification
**Page:** https://app.squarespell.com/tools/quiz-funnel
**Prepared:** May 2026

---

## PART 1 — DEEP CURRENT PAGE AUDIT

### What the page currently is

A single-page marketing/landing page built in Next.js with inline styles. Structured as:
Nav → Hero (text + URL input) → Dashboard mockup → Logo bar → How It Works (3 steps) → 3 Feature rows (alternating text/mockup) → Testimonials → Mid-page CTA → Templates gallery → Pricing (toggle) → FAQ → Footer.

The mockups are **SVG/HTML components rendered in-browser**, not real screenshots. This is a significant technical decision that has both advantages (no image loading) and severe limitations (they look like UI wireframes, not real product).

---

### SECTION-BY-SECTION DIAGNOSIS

#### NAV BAR — Keep, Refine
**What works:** Sticky pill nav is modern. Has Sign In + CTA.
**What's wrong:**
- Only 3 nav items: Features, Pricing, Templates. Missing "Blog," "Examples," "Customers" — all of which increase trust and dwell time.
- No social proof in nav (e.g., "⭐ 347 reviews" badge or "Trusted by 12,000+ sites").
- Logo icon is wrong — uses a generic `<rect>` grid icon, not the Squarespell lightning bolt brand icon used everywhere else.
- "Get Started Free" is correct primary CTA but padding is too tight.
- On mobile this nav collapses to nothing (no hamburger implemented).

**What to fix:** Add "Examples" and "Reviews" nav items. Add social proof number. Fix logo icon. Add mobile menu.

---

#### HERO SECTION — Major Rewrite Required
**Current H1:** "Turn Your Squarespace Site Into a Lead Machine"
**Current subhead:** "Build AI-powered quiz funnels that capture leads, segment your audience, and automate follow-up emails. Built specifically for Squarespace."

**What works:** "Built specifically for Squarespace" is the right differentiator hook. AI-powered is current. "Lead Machine" is emotionally charged.

**What's deeply wrong:**

1. **The URL input is a conversion killer.** Asking a visitor to enter their Squarespace URL as the first action is friction-first UX. They don't know if they trust you yet. A "Get Started Free — No Credit Card" button converts 2–4× better at this stage than a URL form. The URL input belongs on step 2 of the onboarding flow, not the hero CTA.

2. **H1 font weight is 500 (regular-weight large text).** For a bold SaaS hero, this reads as weak. Should be 700–800. The 70px at weight 500 looks thin and unconvincing.

3. **No specific number in the hero.** "3× more leads" is in the page title but not in the H1. Numbers anchor credibility instantly. The subhead is generic.

4. **No visual proof above the fold.** The dashboard mockup is below the fold on first render (it's in a separate section below the hero). Users need to see the product *inside* the hero section — not after scrolling.

5. **Only 2 trust badges:** "No credit card required" + "14-day free trial." Missing: "12,000+ sites trust Squarespell," star rating count, "Setup in 10 minutes."

6. **The "QUIZ FUNNEL BUILDER" section badge** before the H1 is weak — it describes the product category, not a benefit or proof point. Replace with something like "⭐ Rated 5/5 by 347 Squarespace Users" or "Used by 12,000+ Squarespace Sites."

7. **Zero urgency or specificity.** No industry stats, no data point to make the promise feel real.

**New H1 direction:**
> "The Quiz Funnel Platform Built for Squarespace"
> OR
> "Squarespace Sites That Use Quizzes Capture 3× More Leads"
> OR (most powerful — specific claim):
> "Turn Squarespace Visitors Into Leads. Without Monthly Fees."

**New subhead direction:**
> "The only quiz funnel builder built natively for Squarespace 7.1. Build in 10 minutes, capture emails before results, connect to Mailchimp or Klaviyo in one click. One-time $45 — no subscriptions."

---

#### HERO DASHBOARD MOCKUP — Keep Structure, Rebuild Visually
**What works:** Showing a product screenshot immediately below the hero is correct SaaS pattern. Browser frame with macOS traffic lights = credibility signal.

**What's deeply wrong:**
1. **It's a code-rendered SVG mockup, not a screenshot.** Every sophisticated visitor can tell. The chart is a single SVG path. The data is clearly fake. This actively *hurts* credibility — it signals "the product might not really look like this."
2. **The sidebar shows wrong icon** (grid icon instead of lightning bolt).
3. **The stats are round and suspiciously high** (2,847 responses, 73.2% completion). No real product shows these numbers for a first-time user. It doesn't feel earned.
4. **No interaction hint.** A live cursor, hover state, or animation would make it feel alive.
5. **The chart SVG is too simplistic** — a single curved line. Real analytics charts have grid lines, axis labels, and data points.

**Verdict:** The mockup approach is valid in principle, but the current execution reads as a wireframe rather than a product. The rebuild needs real-looking UI mockups — more detail, more believable data, more visual polish.

---

#### LOGO BAR — Remove and Replace
**What works:** Concept of showing integrations is correct.
**What's deeply wrong:**
1. **Logos are text + a generic circle-checkmark SVG.** Squarespace, Mailchimp, Zapier, Google Sheets, HubSpot all have real, recognizable brand logos. Using generic SVG icons for these is the single biggest trust signal missed on the entire page.
2. **The text "Squarespace, Mailchimp, Zapier..." just floating in gray** looks like placeholder content, not a finished product.
3. **No label above the logos.** Standard pattern: "Connects with your existing tools" or "Works with everything you already use."

**Fix:** Replace with actual brand SVG logos (all available under their respective brand guidelines for integration partner use). Add label. Add a subtle scroll animation.

---

#### HOW IT WORKS — Keep, Expand
**What works:** 3-step flow is clean. Copy is clear.
**What's wrong:**
1. **No visual for each step.** Each card has a generic SVG icon. Each step should have a mini-mockup or animated illustration showing what actually happens.
2. **Step 1 "Paste Your URL"** is not how most users will start — they'll click "Get Started Free," not paste a URL. The 3-step flow needs to match the actual onboarding experience.
3. **No time claim.** "In seconds," "in 10 minutes," "in under 2 minutes" — specific time claims reduce perceived effort and increase conversion.
4. **Cards feel too similar.** They're identical gray cards with no visual hierarchy. Step 3 (the payoff — "Capture and Convert") should feel climactic.
5. **Missing**: A fourth "step" or arrow showing the result — what happens after conversion (the email arrives, the lead scores, the sequence fires).

**What to add:** Each step needs a small product screenshot as a mini-preview embedded in the card itself.

---

#### FEATURE ROWS (Analytics, Quiz Builder, Lead Management) — Keep Structure, Rewrite Copy, Rebuild Mockups

**What works:** Alternating left/right text+mockup is the best-proven SaaS layout pattern. Three features is the right number. Badge labeling ("ANALYTICS," "QUIZ BUILDER," "LEAD MANAGEMENT") is good.

**What's wrong:**

**Feature 1 — Analytics:**
- "Real-time performance dashboard" is fine as title but "Start tracking" is a weak CTA. Replace with "See your results →" or "Explore analytics →"
- The description is functional but doesn't answer "so what?" — add a specific outcome: "Know exactly which question loses people — and fix it to capture 30% more leads."
- The dashboard mockup here is an exact duplicate of the hero dashboard. User sees the same mockup twice within 3 scrolls. This destroys the sense of product depth.

**Feature 2 — Quiz Builder:**
- "Build quizzes that convert visitors into leads" — good.
- "Drag-and-drop quiz builder" — but the mockup (Quizzes list) shows a TABLE of quizzes, not the quiz builder itself. Profound disconnect. The mockup should show the actual quiz editor — questions, branching logic, design options.
- "Try the builder" CTA — this should link directly to `/tools/quiz-funnel/build` but currently links nowhere (no href).

**Feature 3 — Lead Management:**
- Lead scoring mockup is the strongest — real table with names, scores, dates. This is the most believable mockup on the page.
- Missing: Show segmentation in action — "High Score leads → coaching offer" / "Low Score leads → free resource." The segmentation angle is your most powerful differentiator vs. simple forms.

---

#### TESTIMONIALS — Major Overhaul Needed
**What works:** 6 testimonials, different industries, specific results mentioned.
**What's deeply wrong:**
1. **All avatars are colored circles with a single letter.** This is the #1 trust signal killer in SaaS testimonials. Real photos of real people convert 3–5× better than letter avatars.
2. **None of the testimonials mention the one-time fee** — which is your strongest differentiator. Testimonials should reinforce key buying objections. "I saved $348 vs. what I was paying Interact" is a testimonial that converts.
3. **No company name + URL for the testimonials.** "Sarah Mitchell, Photographer, Mitchell Studios" — where can I verify this? No website link, no LinkedIn, no photo. These testimonials feel generated.
4. **Testimonials are in a linear scroll** — no carousel, no filter, no segmentation by industry.
5. **No video testimonials** — even a 30-second Loom embed would add enormous credibility.
6. **No star ratings on individual testimonials** — ⭐⭐⭐⭐⭐ before each quote is standard trust pattern.

---

#### MID-PAGE CTA — Remove or Relocate
**Current:** "Ready to turn visitors into leads? Join thousands of Squarespace site owners..."
**Problem:** "Thousands" contradicts "12,000+" used on the homepage. Pick a number and be specific everywhere. Also, this CTA appears between Testimonials and Templates — an awkward position that breaks the reading flow. Mid-page CTAs work best after a proof section (after testimonials is fine), but this one has no urgency trigger.

---

#### TEMPLATES SECTION — Good Concept, Execution Gaps
**What works:** 6 templates shown, industry-specific names, question counts shown, link to builder with template param.
**What's wrong:**
1. **No thumbnail images.** The cards reference `getTemplateThumbnail(id)` but either the images aren't loading or the function returns empty. Each template card needs a visual preview.
2. **Template descriptions are too long.** The "Photography Style Quiz" description is 3 sentences. Template cards should have 1-line descriptions max — save detail for the template preview page.
3. **No "Request a template" option** for industries not shown. This is a lead capture opportunity.
4. **Missing high-intent templates:** "Skin Care Quiz," "Financial Planning Quiz," "Real Estate Quiz," "Interior Design Quiz" — all mentioned in the SEO strategy as high-search-volume niches.

---

#### PRICING — Good Structure, Critical Copy Issues
**What works:** 3 tiers, clear feature comparison, toggle monthly/yearly, "Most Popular" badge on Pro.
**What's wrong:**
1. **The "Not included" lists undermine confidence.** Showing what's missing on each plan is standard, but the Core plan's "Not included" list has 6 items — it makes Core look crippled before users have reason to trust the product. Reframe: use "Upgrade for:" language instead.
2. **No comparison to competitors in pricing section.** This is where the "vs. Interact $29/month" point lands hardest — right when users are evaluating price.
3. **Annual pricing shows "Billed $108/year"** — but what's the monthly equivalent saving? Users think in monthly, not annual totals. Show: "Save $36/year = 3 months free."
4. **No money-back guarantee mentioned on pricing cards.** You have a 60-day guarantee on squarespell.com — add it here: "60-day money-back guarantee" with a shield icon under each "Start Free Trial" button.
5. **"Start Free Trial" on all three plans** — this is correct, but there's no differentiation in urgency. Pro should say "Start Pro Trial — Most Popular" and Business should say "Start Business Trial."
6. **FAQ section is too generic.** Missing the most conversion-critical questions: "Is this better than Typeform?" "Do I need a developer to set this up?" "Can I keep my Squarespace design?" "What happens to my quiz data if I cancel?"

---

#### FOOTER — Incomplete
**What's wrong:**
1. **Copyright says "© 2024 Squarespell"** — it's 2026. Stale copyright date destroys trust signals.
2. **"Changelog," "Documentation," "Blog," "Help Center," "API"** links all point to `/#` — they're dead links.
3. **No social media links** in footer despite Instagram, YouTube, Pinterest existing.
4. **No address/legal entity** — for GDPR compliance and trust signals.

---

## PART 2 — WHAT STAYS, WHAT GOES, WHAT TRANSFORMS

### KEEP (Without Major Changes)
- Overall page section sequence (Nav → Hero → Product Visual → Social Proof → How It Works → Features → Testimonials → Templates → Pricing → FAQ)
- Alternating left/right feature section layout
- Pill-shaped sticky nav
- Browser frame treatment for product mockups
- Pricing 3-tier structure with monthly/yearly toggle
- FAQ accordion
- Section badge component (SectionBadge pill)
- Scroll reveal animations
- Inter font + Squarespell teal (#0D7377) color system

### REMOVE IMMEDIATELY
- URL input field in hero (replace with single "Get Started Free" button)
- Duplicate dashboard mockup (appears in hero section AND Feature Row 1 — use different mockup for each)
- "© 2024" copyright (update to 2026)
- All dead `/#` footer links
- Generic circle-checkmark integration "logos"
- Long testimonial descriptions without photos

### EXPAND SIGNIFICANTLY
- Hero social proof (from 2 trust badges → 5: review count, user count, setup time, guarantee, no credit card)
- Logo bar (from text → real brand SVGs with proper label)
- Template cards (add thumbnail visuals, shorten descriptions, add more templates)
- Pricing (add competitor comparison, guarantee badge, better savings framing)
- FAQ (expand to 10+ questions including comparison and objection-handling questions)
- Testimonials (add star ratings, photos, company links, video testimonials slot)

### REWRITE COMPLETELY
- Hero H1, H2, CTA
- Each feature section CTA (replace "Start tracking," "Try the builder," "See lead tools" with specific outcome-oriented CTAs)
- Testimonials (or at minimum: add ⭐⭐⭐⭐⭐ to each, add company URL)
- Footer copyright and links
- Mid-page CTA (add urgency + specific number)

### MAKE MORE CONVERSION-FOCUSED
- Hero: Single CTA, no friction input
- Pricing: Add guarantee + competitor comparison
- Feature rows: CTA buttons that link to actual in-app demo
- Testimonials: Add video + photos
- Every section: Add one internal link to the quiz plugin product page on squarespell.com

### MAKE MORE SEO-FOCUSED
- Add FAQ schema (JSON-LD)
- Add Product/SoftwareApplication schema
- Add BreadcrumbList schema
- Change canonical from `squarespell.com/tools/quiz-funnel` to `app.squarespell.com/tools/quiz-funnel` (currently canonicalized to squarespell.com which loses SEO credit for this URL)
- Add `dateModified` meta
- Add `keywords` in first paragraph text (not just meta keywords)
- Hero H1: Include "Squarespace quiz funnel" naturally
- Add a "What is a quiz funnel?" definition section (AEO / AI Overview optimization)
- Each feature H2 should include keyword-rich phrasing

### MAKE MORE PRODUCT-FOCUSED (Visual Storytelling)
- Replace all code-rendered mockups with higher-fidelity designed mockups
- Show the quiz BUILDER (editor), not just the management screens
- Show a complete quiz user flow: question → email gate → result screen
- Show the AI generation flow: URL input → quiz generated
- Show mobile quiz experience
- Show email sequence triggered by quiz result
- Show before/after: contact form (2%) vs quiz (47% capture rate)

### MAKE MORE AI-SEARCH FRIENDLY (GEO/AEO)
- Add "Quick Answer" box at top with definition: "A Squarespace quiz funnel is..."
- Reformat feature descriptions to start with the direct answer
- Add statistics section with citable data
- Add glossary-style definitions for: quiz funnel, lead gate, branching logic, weighted scoring
- Structure FAQs with the exact phrasing of People Also Ask questions

---

## PART 3 — COMPLETE VISUAL STRATEGY & MOCKUP BRIEF

This is the master brief for every visual, screenshot, animation, and mockup on the rebuilt page. Ordered by section.

---

### VISUAL 1 — HERO PRODUCT SHOWCASE (Above the fold)

**Placement:** Inside the hero section, to the RIGHT of the headline (split-layout hero, not centered-text-then-image)

**What to show:** A split-screen composite visual:
- LEFT SIDE: A live Squarespace website (e.g., a clean photography portfolio or coaching site) with a quiz popup overlaid — showing "What's your photography style?" with 4 image-based answer choices
- RIGHT SIDE: The Squarespell dashboard showing that quiz capturing leads in real time — a live feed of new leads appearing

**Interaction to demonstrate:** Subtle animation — a new lead row slides in at the bottom of the leads table every 2–3 seconds (CSS animation). Counter ticks up by 1. This shows the product is "live" and generating results RIGHT NOW.

**Psychological purpose:** Answers the question "What does this look like on my site?" instantly. The split-screen connects cause (quiz on site) to effect (leads in dashboard) in one visual. The live-ticking counter triggers FOMO and social proof simultaneously.

**Conversion purpose:** Reduces the leap of imagination required. Users don't need to visualize — they can see it. Reduces bounce from "I don't understand what this is."

**SEO engagement purpose:** Visual content increases time-on-page by 2–3× vs. text-only. Higher dwell time = lower bounce = positive ranking signal.

**Trust purpose:** Seeing a quiz embedded on a real (or realistic) Squarespace site proves it looks professional, not like a third-party widget bolted on.

**Animation/GIF opportunity:** Animate the lead count incrementing. Make the quiz appear to load on the Squarespace site. CSS-only, no video required.

**Caption:** "Quiz captures email in exchange for personalized result. Leads tagged automatically by score."

---

### VISUAL 2 — AI GENERATION FLOW (How It Works — Step 1 card)

**Placement:** Inside Step 1 card in the How It Works section

**What to show:** A 3-frame sequence (or animated GIF):
- Frame 1: URL input field with "yoursite.squarespace.com" typed in
- Frame 2: "Analyzing your site..." with a progress bar and brand color detection strips (showing your site's teal, your fonts)
- Frame 3: "Quiz generated!" — showing 5 questions already written, matching your site's voice

**Interaction to demonstrate:** Typing animation → loading state → instant quiz output. 3 seconds total loop.

**Psychological purpose:** "AI analyzes your brand" sounds impressive but abstract. Showing it happen makes it tangible and believable. Reduces the mental work of imagining the process.

**Conversion purpose:** Reduces the biggest friction point: "This sounds complicated." The animation proves it's truly automatic.

**GIF opportunity:** This is the #1 GIF to create for the page. A 3-second looping GIF of the AI generation would be the most shared asset from this page.

**Caption:** "Paste your Squarespace URL → AI reads your site → Quiz ready in seconds."

---

### VISUAL 3 — QUIZ EDITOR (Feature Row 2 — Quiz Builder)

**Placement:** Right side of Feature Row 2 (Quiz Builder section)

**What to show:** The actual quiz editor interface — not the quizzes list table (which is what the current mockup shows). Must include:
- A question being edited: "What's your biggest business challenge?" with 4 answer options
- A visible branching logic arrow: Answer A → leads to Question 3, Answer B → leads to Question 4
- A right sidebar showing: Score weight slider (this answer = +15 points), Brand color picker, Font selector
- A top toolbar with: Preview, Save, Publish buttons
- Question counter: "Question 3 of 6"
- AI button: "✨ Generate more questions" in the toolbar

**Why this is the most important mockup on the page:** The quiz builder is the CORE product differentiator. The entire value proposition is "build a quiz." If the page never shows the quiz builder, it's selling an invisible product.

**Interaction to demonstrate:** Hover state on answer option showing drag handle (proving drag-and-drop). One answer option being highlighted/selected.

**Before/After opportunity:** Show "Before Squarespell: Typeform embed (doesn't match your brand)" vs. "After: Native quiz matching your Squarespace design perfectly." This is a single image split.

**Caption:** "Branching logic, weighted scoring, and AI generation — built into every quiz."

---

### VISUAL 4 — QUIZ USER FLOW (New Section — "The Visitor Experience")

**Placement:** New section BETWEEN How It Works and Feature Rows. Title: "What your visitors actually experience."

**What to show:** A 4-phone-frame horizontal sequence showing the mobile visitor experience:
- Phone 1: Squarespace website homepage with a floating quiz button or embedded quiz block
- Phone 2: Quiz question screen — "What type of photographer are you?" with 4 image choices, progress bar at top "2 of 6"
- Phone 3: Email gate screen — "You're a Documentary Storyteller! Enter your email to see your full results →" with email input
- Phone 4: Personalized result screen — "Your Style: Documentary Storyteller — Here are 3 packages perfect for you" with CTA button

**Psychological purpose:** This is the visitor journey visualization. It answers "what will my customers actually see?" — the question every customer is really asking. Phone mockups feel approachable and personal.

**Conversion purpose:** Shows the email gate NATURALLY occurring (between question completion and results). Makes the 47% capture rate believable because you can see exactly why people give their email.

**Trust purpose:** Proves the quiz looks professional on mobile. Mobile experience is the #1 concern of Squarespace users.

**Mobile-first signal:** This tells Google (for mobile-first indexing) that mobile UX is a priority on this page.

**Caption row (below each phone):**
1. "Visitor lands on your site"
2. "Quiz draws them in (73% complete)"
3. "Email gate before results (47% conversion)"
4. "Personalized result builds trust"

**This is the second most important visual on the entire page.** It tells the complete conversion story in 4 frames.

---

### VISUAL 5 — ANALYTICS DASHBOARD (Feature Row 1)

**Placement:** Right side of Feature Row 1 (Analytics section)

**REPLACE** the current duplicate dashboard mockup with a more specific analytics view that's different from the hero mockup. Show:
- A per-question drop-off chart: "Question 3: 34% of people stop here" — with a red indicator on that question
- Alongside: A side panel showing "Fix suggestion: Question 3 has 6 answer options. Quizzes with 4 or fewer options get 28% more completions."
- Bottom: A "Heat map" row showing which answers get clicked most (visual bars per answer option)

**Why different from hero:** Hero shows macro metrics (total leads, completion rate). This analytics mockup shows MICRO insights — per-question intelligence. It's a more sophisticated, deeper feature that justifies paying for Pro.

**Psychological purpose:** "Advanced analytics" is abstract. Showing "Question 3 is where you're losing people — here's how to fix it" makes it immediately actionable and high-value.

**Conversion purpose:** This is a Pro feature. Showing its depth encourages upgrade from Core.

**Caption:** "See exactly where visitors drop off — and fix it. Per-question analytics included in Pro."

---

### VISUAL 6 — LEAD SEGMENTATION (Feature Row 3 — Leads)

**Placement:** Right side of Feature Row 3 (Lead Management)

**ENHANCE** the current leads mockup by adding a segmentation panel. Show:
- The leads table (keep existing, it's the most believable)
- Add a right-panel overlay showing: "Segment: High Score (80+)" with 3 leads highlighted in teal
- Add a "Send campaign to this segment →" button appearing
- Small overlay: "42 leads match this filter"

**Additionally:** Show an integration row below the table — "Syncing to Mailchimp... 42 leads tagged 'high-intent'" with the Mailchimp logo and a live sync status indicator.

**Psychological purpose:** "Segment every lead" sounds like marketing jargon. Showing "these 42 specific high-score leads just got sent to Mailchimp with the 'high-intent' tag" makes it feel like a real workflow.

**Caption:** "Score leads automatically. Segment by result. Sync to Mailchimp in one click."

---

### VISUAL 7 — EMAIL SEQUENCE TRIGGERED BY QUIZ (New Feature Section)

**Add a 4th Feature Row** (currently missing): Email Automation.

**Placement:** After the 3 existing feature rows. Title: "The follow-up that converts." Badge: "EMAIL SEQUENCES"

**What to show:** A 3-column flow visualization:
- Column 1: Quiz result card — "You got: Lifestyle Photographer (Score: 82)"
- Column 2 (with arrow): Email sequence timeline — Day 0: "Your results are in" / Day 2: "The 3 portraits every lifestyle photographer needs" / Day 5: "Ready to book? Here's your package"
- Column 3 (with arrow): Dashboard metric — "Email sequence open rate: 58% / Conversion rate: 12%"

**Why this is missing from the current page:** Email sequences are a Pro feature and one of the highest-value items on the entire platform. The current page shows zero email feature visuals despite email sequences being listed in the Pro plan. This is a massive gap.

**Psychological purpose:** Connects the quiz to the revenue outcome. "Quiz → personalized emails → sales" is the full funnel, and the current page only shows "quiz → leads." Showing the full funnel increases perceived value dramatically.

**Conversion purpose:** Justifies the Pro upgrade. Users on Core who see this will want the email sequences.

**Caption:** "Quiz results trigger personalized email sequences. Automated. Conversion-optimized."

---

### VISUAL 8 — BEFORE/AFTER COMPARISON (Above Testimonials or Below Pricing)

**New Section — "Why quiz funnels outperform forms"**

**What to show:** A side-by-side comparison visual:

LEFT SIDE (BEFORE — Contact Form):
- Generic white Squarespace contact form: Name, Email, Message, Submit
- Below: "Average conversion rate: 2.3%"
- "Leads receive: Nothing — they wait for you to reply"
- "Segmentation: None — every lead gets the same follow-up"

RIGHT SIDE (AFTER — Squarespell Quiz):
- Stylized quiz: "What type of photographer are you?" with image answer choices
- Below: "Average conversion rate: 47%"
- "Leads receive: Personalized result + matched package instantly"
- "Segmentation: Automatic — leads sorted by score and result type"

**Red/green color coding:** Red X marks on left, green checkmarks on right.

**This is one of the highest-converting visuals in SaaS marketing.** Before/after comparisons bypass skepticism because they show transformation rather than claiming it.

**Psychological purpose:** Anchors the old way (form) as the baseline and positions the quiz as an obvious upgrade. Activates "I'm leaving money on the table with my current form."

**Conversion purpose:** Drives urgency. "I'm getting 2.3% and this tool gets 47%" is an immediate reason to start a trial.

**Caption:** "47% vs. 2.3%. The difference between a quiz funnel and a contact form."

---

### VISUAL 9 — COMPETITOR COMPARISON TABLE (In Pricing Section)

**What to show:** A clean comparison table directly above or below the pricing cards:

| Feature | Squarespell | Interact | Typeform |
|---------|-------------|---------|---------|
| Built for Squarespace | ✅ Native | ❌ Embed only | ❌ Embed only |
| No monthly fee (one-time plugin) | ✅ $45 | ❌ $29/mo | ❌ $25/mo |
| Email lead gate | ✅ Included | ✅ Included | ⚠️ Paid plan only |
| Branching logic | ✅ | ✅ | ✅ |
| Matches Squarespace design | ✅ Auto-detects | ⚠️ Manual CSS | ⚠️ Manual CSS |
| 12-month cost | $45 (one-time) | $348–$588 | $300–$588 |

**Psychological purpose:** Objection handling at the exact moment of price consideration. "Is this too expensive?" → comparison table answers it before they can ask.

**Caption:** "One-time payment. No subscriptions. No lock-in. Unlike every competitor."

Note: This table applies to the squarespell.com plugin page ($45 one-time). For app.squarespell.com SaaS plans, compare Squarespell Pro ($16/mo) vs Interact Growth ($49/mo) vs Typeform Plus ($35/mo).

---

### VISUAL 10 — SOCIAL PROOF WALL (Replace current testimonials layout)

**New layout:** Replace linear testimonials scroll with a masonry/grid layout.

**Visual composition:**
- Row 1: 3 small testimonial cards (short quotes, ⭐⭐⭐⭐⭐, avatar circles)
- Row 2: 1 large featured testimonial with a photo placeholder + video play button overlay (for future video testimonial)
- Row 3: 3 small testimonial cards
- Below: "⭐⭐⭐⭐⭐ 4.9/5 from 347 verified reviews on [Platform]"

**Key testimonials to feature (rewrite for specificity):**

Priority 1 (No-subscription angle): "I switched from Interact ($49/mo) to Squarespell ($45 once). 14 months later I've saved $643 and my conversion rate is higher."

Priority 2 (Speed angle): "10 minutes from sign-up to first lead captured. I've literally never set up a marketing tool this fast."

Priority 3 (Squarespace-specific angle): "I tried 3 other quiz tools. None of them looked right on my Squarespace site. Squarespell's quiz looked like it was built INTO my site."

Priority 4 (Revenue angle): "The product recommendation quiz now drives 22% of our monthly revenue. Setup took one afternoon."

**Trust purpose:** Masonry grid with real (or realistic) photos reads as real user base. Review count + rating anchors authority.

---

### VISUAL 11 — INTEGRATION PARTNER LOGOS (Logo Bar Replacement)

**What to show:** Real SVG brand logos in their actual brand colors, properly sized and aligned:
- Squarespace (black wordmark)
- Mailchimp (Freddie mascot or wordmark, yellow/black)
- Zapier (orange/black)
- Klaviyo (blue wordmark)
- HubSpot (orange wordmark)
- ConvertKit (coral/pink wordmark)
- Google Sheets (green sheets icon)

**Label above:** "Connects with every tool you already use"

**Psychological purpose:** Brand recognition = trust transfer. Mailchimp's logo next to your product says "Mailchimp trusts this enough to be listed here."

**Animation opportunity:** Subtle left-to-right scroll on hover, or infinite logo marquee for mobile.

---

### VISUAL 12 — TEMPLATE CARDS (Redesigned)

**Current state:** Text cards with no images. The `getTemplateThumbnail()` function exists but images aren't loading.

**New design:** Each template card should show:
- A mini phone mockup (50px wide) showing the first quiz question for that template
- Template category tag (colored pill: Photography, Fitness, eCommerce, etc.)
- Template name (bold)
- One-line description (not 3 sentences)
- "X questions" badge
- Estimated setup time: "~5 min"
- Primary CTA: "Use this template →" (links to builder with template pre-loaded)

**Visual order (by conversion intent):**
1. Product Finder Quiz (eCommerce — broadest market)
2. Coaching Readiness Quiz (coaches — your template demographic)
3. Photography Style Quiz (photographers — Squarespace's largest user segment)
4. Fitness Goal Quiz (wellness — growing Squarespace niche)
5. Wedding Style Quiz (weddings — high-value leads)
6. Menu Recommendation Quiz (restaurants — unique differentiator)
7. + "Don't see your industry? Request a template →" (lead capture)

---

## PART 4 — COMPLETE SECTION REBUILD SPECIFICATION

### Ideal Section Order (Rebuilt Page)

```
1. NAV — Pill nav with: Logo | Features Pricing Templates Examples Reviews | Sign In | Start Free [CTA]
           + Social proof ticker: "⭐ 4.9/5 · 347 reviews · 12,000+ sites"

2. HERO — Split layout
           LEFT: Badge (social proof, not category label)
                 H1: "The Quiz Funnel Platform Built for Squarespace"
                 H2: Specific claim with number
                 Button: "Start Free — No Card Required"
                 5 trust badges in a row
           RIGHT: Animated split-screen (quiz on site + leads appearing in dashboard)

3. STATS BAR — 4 numbers in a horizontal band:
               "12,000+ sites" | "47% avg lead capture rate" | "73% quiz completion rate" | "10 min average setup"

4. LOGO BAR — "Works with everything you use"
               [Real brand logos: Squarespace · Mailchimp · Klaviyo · Zapier · HubSpot · ConvertKit]

5. VISITOR EXPERIENCE — "What your visitors actually experience"
               4-phone mockup sequence: site → quiz → email gate → personalized result

6. HOW IT WORKS — 3 steps, each with mini visual:
               Step 1: AI generation animation
               Step 2: Quiz editor screenshot (mini)
               Step 3: Leads table appearing

7. BEFORE/AFTER — "Why quiz funnels outperform contact forms"
               Side-by-side: form (2.3%) vs quiz (47%)

8. FEATURE ROW 1 — Analytics (per-question drop-off view)
9. FEATURE ROW 2 — Quiz Builder (actual editor with branching logic)
10. FEATURE ROW 3 — Lead Management (segmentation + CRM sync)
11. FEATURE ROW 4 — Email Sequences (new — quiz → automated email flow)

12. WHAT IS A QUIZ FUNNEL? — AEO definition section (2 paragraphs, structured for AI Overview)
               "A quiz funnel is a lead generation system that..."
               50–80 word direct definition, followed by 3 use-case bullet points

13. TESTIMONIALS — Masonry grid (3+1 featured+3), ⭐⭐⭐⭐⭐ on each, industry diversity

14. COMPETITOR COMPARISON — Table: Squarespell vs Interact vs Typeform

15. TEMPLATES — Redesigned cards with phone previews + quick-start CTAs

16. PRICING — 3 tiers, competitor context, 60-day guarantee badge, annual savings reframed

17. FAQ — 10 questions including comparison, objection-handling, and SEO-optimized questions

18. FINAL CTA — Full-width section: "Start your 14-day free trial"
               Subtext: "No credit card. Cancel anytime. Setup in 10 minutes."
               Button + secondary link: "See a live demo →"

19. FOOTER — Updated copyright, real social links, real page links
```

---

## PART 5 — SEO & SCHEMA IMPLEMENTATION (Applied from Previous Audit)

### Schema to Add (JSON-LD in `<head>`)

```json
// SoftwareApplication schema
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Squarespell Quiz Funnel Builder",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "url": "https://app.squarespell.com/tools/quiz-funnel",
  "offers": {
    "@type": "AggregateOffer",
    "lowPrice": "12",
    "highPrice": "35",
    "priceCurrency": "USD",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "billingDuration": "P1M"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "347",
    "bestRating": "5"
  },
  "featureList": [
    "AI quiz generation",
    "Squarespace native integration",
    "Email lead capture gate",
    "Branching logic",
    "Weighted scoring",
    "Real-time analytics",
    "Email sequences",
    "CRM integrations"
  ]
}

// FAQPage schema
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a Squarespace quiz funnel?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Squarespace quiz funnel is a lead generation tool that presents visitors with an interactive quiz, gates the personalized results behind an email capture form, and automatically segments leads based on their answers and score. Squarespell is the only quiz funnel builder built natively for Squarespace 7.1."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a quiz builder for Squarespace without a monthly fee?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. The Squarespell Interactive Quiz Plugin is a one-time $45 purchase with lifetime access and no monthly fees. Unlike Interact ($29–$49/month) or Typeform ($25–$99/month), you pay once and own it forever."
      }
    }
  ]
}
```

### Canonical Fix
Current: `canonical: https://squarespell.com/tools/quiz-funnel`
This means all SEO credit goes to squarespell.com, not app.squarespell.com.
Fix: Change canonical to `https://app.squarespell.com/tools/quiz-funnel`
OR: Create a matching page at `squarespell.com/tools/quiz-funnel` and let that be the canonical (it has higher domain authority from existing rankings).

### H-Tag Keyword Optimization
Every H2 on the rebuilt page should include at least one target keyword:
- H2: "Build a Squarespace Quiz Funnel in 10 Minutes" (replaces "Three steps to more leads")
- H2: "Quiz Funnel Analytics Built for Squarespace" (replaces "Real-time performance dashboard")
- H2: "The Squarespace-Native Quiz Builder" (replaces "Build quizzes that convert visitors into leads")
- H2: "What Is a Quiz Funnel? (And Why Squarespace Sites Need One)" — new AEO section
- H2: "Squarespell vs Interact vs Typeform — Honest Comparison" — new comparison section

### Internal Linking (Apply from SEO Strategy)
Every page section should include one contextual link:
- Hero CTA → app.squarespell.com/sign-up
- After "no subscription" mention → squarespell.com/premium-plugins/p/interactive-quiz-plugin
- After comparison table → blog post: "Interact Quiz vs Squarespell"
- After templates → squarespell.com/squarespace-blog/product-recommendation-quiz-squarespace
- Footer → squarespell.com/squarespace-blog (blog index)

### AEO "Quick Answer" Block
Add immediately below the H1, before the CTA:

> **What is Squarespell?**
> Squarespell is a quiz funnel builder built specifically for Squarespace 7.1. It lets you create multi-step quizzes that capture email addresses before revealing personalized results — converting an average of 47% of quiz completers into email leads. It connects natively with Squarespace, requires no coding, and integrates with Mailchimp, Klaviyo, ConvertKit, and Zapier.

This 60-word block is written to be extracted verbatim by Google AI Overviews, ChatGPT, Perplexity, and Claude.

---

## PART 6 — VISUAL STORYTELLING FLOW & IMAGE HIERARCHY

### The Psychological Journey a Visitor Should Take (Ordered)

1. **Awareness** (Hero): "This is a quiz tool for Squarespace. It helps me get more leads."
2. **Credibility** (Stats bar + Logos): "12,000 sites use this. It connects to Mailchimp. Real companies trust it."
3. **Understanding** (Visitor Experience phones): "Oh — so my visitor takes a quiz, gives their email for results, and gets a personalized response. That's smart."
4. **Proof of concept** (Before/After): "Forms get 2.3%. This gets 47%. I'm leaving leads on the table."
5. **Product confidence** (Feature rows): "The builder looks professional. The analytics are real. My leads get scored automatically."
6. **Desire** (Email sequences): "And then it automatically sends personalized emails? I want that."
7. **Social validation** (Testimonials): "Other Squarespace users are seeing 3× lead increases. Real reviews."
8. **Comparison clarity** (Competitor table): "It's cheaper than Interact AND better for Squarespace. No brainer."
9. **Decision** (Pricing): "$16/month Pro vs $49/month Interact. 60-day guarantee. Free trial. Okay, I'm trying it."
10. **Action** (Final CTA): "Start Free — No Card Required."

### Screenshot Caption Framework (Apply to Every Visual)
Each mockup caption should:
1. State what's happening (factual)
2. State the outcome (benefit)
3. Be under 12 words

Examples:
- "Quiz embedded on Squarespace site. Email captured before results shown."
- "Per-question drop-off analysis. Fix weak questions. Capture 30% more leads."
- "High-score leads sync to Mailchimp instantly. Tagged by quiz result."
- "AI reads your Squarespace site. Quiz generated in 8 seconds."

### GIF/Animation Priority Queue
In order of impact and production effort:

**High impact, low effort:**
1. Lead counter incrementing in hero mockup (CSS animation, already half-built)
2. Quiz progress bar animating (CSS, 2 hours)
3. Logo bar auto-scrolling marquee (CSS, 1 hour)
4. Answer option hover state in quiz builder (CSS, 1 hour)

**High impact, medium effort:**
1. AI generation 3-frame sequence (Figma → export → optimize as WebP sequence)
2. 4-phone visitor journey animation (Framer or CSS, 4 hours)
3. Before/after comparison slider (interactive, 4 hours)

**High impact, high effort (do last):**
1. Full product walkthrough screen recording (actual product, Loom/screen capture)
2. Quiz embed demo on live Squarespace site (requires Squarespace demo site)
3. Real user video testimonial

### Interactive Demo Opportunities
1. **Embedded live quiz** — A real Squarespell quiz running on the landing page itself. The page IS the demo. "Try it right now — no sign up."
2. **Pricing calculator** — "Enter your current monthly leads → see how much time you're losing without a quiz funnel"
3. **Template preview** — Click any template → a modal shows the actual quiz questions in a mobile frame

---

## PART 7 — CONVERSION RATE OPTIMIZATION FRAMEWORK

### The 5 Conversion Killers to Fix in Priority Order

**Kill #1 — Hero friction (URL input):** Remove URL input from hero. Add it to the sign-up flow. Single "Start Free Trial" CTA in hero. This alone should increase hero CTR by 40–80%.

**Kill #2 — No mobile hamburger menu:** The current nav has no mobile menu. Mobile users can't navigate. Squarespace's user base is heavily mobile-browsing.

**Kill #3 — Dead CTA links:** "Try the builder," "Start tracking," "See lead tools" — none of these buttons currently link to anything. Every button must link.

**Kill #4 — No urgency mechanism:** The page has no scarcity, urgency, or social proof counter. Add: "312 new quizzes created this week" or a live signup counter.

**Kill #5 — No exit intent:** No popup, no "before you leave" offer. A simple "Get our free quiz template pack" exit offer could recover 8–15% of bouncing visitors.

### CTA Hierarchy (Ensure Exactly One Primary CTA Per Section)

| Section | Primary CTA | Secondary CTA |
|---------|------------|---------------|
| Nav | "Get Started Free" (teal) | "Sign In" (ghost) |
| Hero | "Start Free Trial" | "Watch 2-min demo →" |
| How It Works | — | — |
| Visitor Experience | "See It Live →" | — |
| Feature Row 1 | "Start tracking your quizzes →" | — |
| Feature Row 2 | "Open the quiz builder →" | — |
| Feature Row 3 | "See your lead dashboard →" | — |
| Feature Row 4 | "Set up email sequences →" | — |
| Testimonials | — | — |
| Before/After | "Replace my contact form →" | — |
| Templates | Per-card: "Use this template →" | "Request a template" |
| Pricing | "Start Free Trial" (per plan) | "Compare plans" |
| Final CTA | "Start Free — No Card Required" | "See a live demo →" |

---

*Strategy and Visual Brief completed May 2026*
*Owner: Squarespell · app.squarespell.com*
*This document governs the next landing page redesign and all associated visual/mockup production.*

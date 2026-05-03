# Squarespell Landing Page Strategy & Rebuild Plan

## Executive Summary

Full rebuild of the Squarespell landing page based on:
- **App audit**: 12 feature categories, 50+ individual capabilities
- **Reference analysis**: Saasta Framer template patterns (progressive disclosure, layered trust, modular sections)
- **Current page audit**: Good structure but weak emotional hook, AI feature buried, emoji icons look unprofessional, no product screenshots

---

## 1. Product → Landing Page Feature Map

### What MUST be visually represented on the landing page:

| Feature | Section | Visual Direction |
|---------|---------|-----------------|
| AI quiz generation from URL | Hero (primary hook) + dedicated deep dive | Show URL input → AI processing → finished quiz animation |
| Brand auto-detection | "How It Works" step 2 | Side-by-side: website → quiz with matching colors |
| Quiz editor (drag & drop, branching, scoring) | "Powerful Editor" section | Product screenshot of the 3-panel editor |
| Analytics dashboard (views, leads, funnels) | "Analytics" section | Real chart mockups: line chart + drop-off bars + funnel |
| Lead management (scoring, CSV, filtering) | "Lead Capture" section | Lead table mockup with intent badges |
| A/B testing | "Analytics" sub-feature | A/B variant comparison visual |
| Email marketing campaigns | "Nurture" section | Email flow diagram |
| Automations (triggers → actions) | "Automations" section | Trigger → Action flow cards |
| 20+ integrations | "Integrations" section | Logo grid with Zapier, Mailchimp, HubSpot, etc. |
| 3 embed modes (inline, popup, tab) | "Embed" section | 3 device mockups showing each mode |
| Template gallery (13+ categories) | "Templates" section | Category tabs + template cards |
| Brand kit (colors, fonts, logo) | "Customization" feature card | Color palette + font selector mockup |
| Segmentation (tags + rules) | "Lead Capture" sub-feature | Segment rule builder mockup |
| Team collaboration | Feature card | Team member avatars + roles |
| Commerce (Shopify, WooCommerce) | Feature card | Product sync visual |

---

## 2. Section-by-Section Wireframe

### Section 1: Announcement Bar
**Goal:** Create urgency, highlight new feature
- Copy: "New: AI generates your quiz from any URL in 60 seconds → Try it free"
- Design: Full-width teal bar, white text, arrow CTA
- Height: 40px, sticky above nav

### Section 2: Navigation
**Goal:** Brand identity, key navigation, conversion CTA
- Logo (teal mark + "Squarespell")
- Links: Features, How It Works, Pricing, FAQ
- Right: "Log in" text + "Start free trial" pill button
- Sticky, glass-morphism blur on scroll

### Section 3: Hero
**Goal:** Instant comprehension + action
- **Headline:** "Turn your website into a lead-capturing quiz funnel"
- **Subheadline:** "Paste your URL. AI builds a branded quiz in 60 seconds. Embed it and capture 4x more leads than a contact form."
- **CTA:** URL input field + "Generate my quiz" button
- **Trust row:** "2,400+ Squarespace owners" · "No credit card" · "Live in 60 seconds"
- **Right side:** Animated quiz card mockup showing AI generation
- Layout: 55/45 split, left text, right visual

### Section 4: Social Proof Bar
**Goal:** Immediate credibility
- "Trusted by 2,400+ Squarespace site owners"
- 4 badges: GDPR Compliant, Squarespace Native, AI-Powered, SOC 2 Ready
- Light teal background

### Section 5: "Contact Forms Are Dead" Problem Section
**Goal:** Agitate the problem, show the gap
- **Headline:** "Contact Forms Are Killing Your Conversions"
- 6-row comparison table: Contact Form vs Quiz Funnel
- Each row shows the before/after with accent highlighting on the quiz column

### Section 6: How It Works (3 Steps)
**Goal:** Make it feel effortless
- Step 1: "Paste Your URL" — AI reads your site's brand, content, and audience
- Step 2: "AI Builds Your Quiz" — Branded questions, scoring, and outcomes in 60 seconds
- Step 3: "Embed & Capture" — One line of code. Leads flow to your dashboard instantly
- Numbered circles with descriptive copy

### Section 7: Feature Grid (6 Cards)
**Goal:** Quick scan of capabilities
- AI Quiz Generation
- Brand Auto-Detection
- Smart Lead Capture
- Real-Time Analytics
- A/B Testing
- One-Line Embed
- Each card: SVG icon (not emoji) + title + 1-line description

### Section 8: AI Generation Deep Dive
**Goal:** Showcase the wow feature
- **Headline:** "AI-Powered Quiz Generation"
- Flow diagram: Input (URL) → Extract (Brand, Product, Audience) → Output (Complete Quiz)
- Each step in a card with colored border

### Section 9: Analytics Showcase
**Goal:** Show data capabilities
- **Headline:** "Measure What Matters"
- 3 cards: Lead Capture Trend (line chart), Question Drop-off (bar chart), A/B Test Winner (comparison bars)
- Real-looking chart mockups

### Section 10: Integrations Hub
**Goal:** Show ecosystem breadth
- **Headline:** "Connect Everything"
- Center "Squarespell" hub with radiating integration logos
- Grid of 10+ integration names + "+X more"

### Section 11: Templates Gallery
**Goal:** Show variety, reduce "blank page" fear
- **Headline:** "Browse Templates"
- Category filter tabs
- 4 template cards with name, description, category, "Use template" CTA

### Section 12: Embed Modes
**Goal:** Show flexibility
- **Headline:** "Choose Your Embed"
- 3 cards: Inline, Popup, Side Tab
- Each with a visual mockup showing placement

### Section 13: Brand Kit / Skins
**Goal:** Show customization depth
- **Headline:** "Match Your Brand"
- 3 skin previews: Light/Editorial, Dark/Modern, Brand/Saturated

### Section 14: Pricing
**Goal:** Transparent pricing, drive Pro plan
- **Headline:** "Simple, Transparent Pricing"
- Monthly/Yearly toggle with "Save 25%" badge
- 3 plan cards: Core ($9-12), Pro ($16-19, highlighted), Business ($29-35)
- Included/excluded feature lists with check/cross
- "All plans include 14-day Pro trial · No credit card · Cancel anytime"

### Section 15: Testimonials
**Goal:** Social proof from real users
- **Headline:** "What Squarespace Owners Are Saying"
- 3 testimonial cards with stars, quote, name, role

### Section 16: FAQ
**Goal:** Remove objections, SEO value
- **Headline:** "Frequently Asked Questions"
- 14 accordion items covering: Squarespace integration, coding skills, brand matching, leads, customization, mobile, other platforms, trial, competitors, lead counting, email tools, free plan, SEO, quiz funnels

### Section 17: Final CTA
**Goal:** Last conversion push
- **Headline:** "Your next lead is one quiz away."
- CTA button: "Start 14-day trial"

### Section 18: Footer
**Goal:** Navigation, trust, legal
- 5 columns: Brand + social, Product, Resources, Company, Legal
- Copyright bar

---

## 3. Design System

### Typography
- **Primary:** System sans-serif stack (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, etc.)
- **Headings:** 700 weight, tight line-height (1.2)
- **Body:** 400-500 weight, comfortable line-height (1.6)
- **Sizes:** H1=56px, H2=42px, H3=24px, Body=16px, Small=14px

### Colors
- **Primary/Accent:** #0F7377 (teal)
- **Background:** #F7F7F5 (warm off-white)
- **Text:** #1a1a1a (near-black)
- **Tint:** color-mix(in srgb, #0F7377 8%, #F7F7F5) — light teal sections
- **Lines:** color-mix(in srgb, #1a1a1a 12%, transparent)
- **Success:** #22c55e (live indicators)
- **Warning:** #f59e0b (flow extract step)

### Spacing
- Section padding: 140px vertical (desktop), 80px (mobile)
- Container: max-width 1280px, 40px horizontal padding
- Card padding: 32-40px
- Grid gaps: 32-40px

### Component Styles
- Cards: white bg, 1px border (#line), 12px radius, hover shadow + border-color change
- Buttons: pill shape (999px radius), teal bg, white text, 10-14px padding
- Inputs: 1px border, 8px radius, focus → teal border
- Badges: inline-block, small text, colored backgrounds

### Animations
- Scroll-triggered fade-in on sections (CSS `@keyframes fadeInUp`)
- Hover: cards lift with shadow, borders turn teal
- FAQ: smooth accordion expand/collapse
- Nav: glass-morphism blur on scroll
- All transitions: 0.2-0.3s ease

---

## 4. Conversion Optimization Notes

### CTA Placement (7 total)
1. Announcement bar → "Try it free"
2. Nav → "Start 14-day trial"
3. Hero → "Generate my quiz" (URL input)
4. After comparison table → implicit
5. Pricing → "Start free trial" per plan
6. After testimonials → implicit
7. Final CTA → "Start 14-day trial"

### Trust Elements
- "2,400+ Squarespace owners" (hero)
- GDPR, SOC 2, Squarespace Native badges
- 3 testimonials with names and roles
- "No credit card required" repeated 3x
- Star ratings on testimonials
- Competitor comparison (we're cheaper + more features)

### Friction Reduction
- URL input in hero = instant demo path
- "No credit card" stated early and often
- "Live in 60 seconds" = speed promise
- FAQ addresses top 14 objections
- Template gallery = no blank page fear

---

## 5. Key Improvements Over Current Page

1. **Professional SVG icons** instead of emoji
2. **Stronger emotional hook** in hero (problem-first, not feature-first)
3. **AI generation showcased prominently** (not buried in feature list)
4. **Real-looking chart mockups** in analytics section
5. **Better visual hierarchy** with proper section alternation
6. **Responsive design** with proper breakpoints (1024px, 640px)
7. **Scroll animations** for modern feel
8. **Structured data** (JSON-LD) for SEO
9. **Semantic HTML** for accessibility
10. **Performance** — all inline CSS, no external dependencies

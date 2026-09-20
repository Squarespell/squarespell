# Squarespell Quiz homepage handoff
Revision 2, 20 September 2026

## Review links
- Interactive preview: https://htmlpreview.github.io/?https://github.com/Squarespell/squarespell/blob/design/squarespell-quiz-homepage/design/squarespell-quiz/index.html
- Source: https://github.com/Squarespell/squarespell/blob/design/squarespell-quiz-homepage/design/squarespell-quiz/index.html
- Branch: design/squarespell-quiz-homepage
- Reviewed source commit: a954105948bd972e9f68d196fee22ba69d93615d

This is a design prototype for Squarespell Quiz. It is not deployed to production. Signup, login, billing, support, URL analysis and account actions are intentionally represented by preview dialogs.

## What changed in revision 2
The first design used the pilot planning document as its main source. That was wrong for the homepage because it removed working product modes, showed the wrong plans, used abstract illustrations and did not represent the depth of the existing application.

Revision 2 was rebuilt from the product code:

- Core, Pro and Business pricing with monthly and yearly billing
- 14-day Pro trial with no card
- Current quiz, lead and email limits
- Lead and email add-on packs
- Five AI generation modes
- Sixteen real templates and their existing Unsplash and Pexels media
- Eight visual editor blocks
- Conditional branching, scoring and outcomes
- Inline, popup and floating-tab embeds
- Global and per-quiz analytics, A/B testing and attribution
- Lead dashboard, segmentation and CSV export
- Email sequences and automation
- Brand kit, custom CSS, white label, custom domains, team seats and API access
- Existing integration services and pricing-catalog integrations

The page contains no em dash character. It does not use invented customer logos, reviews, user counts or conversion claims.

## Repository sources that control the public claims

Use these files before changing public copy:

| Subject | Current source |
|---|---|
| Public plan cards and prices | frontend/lib/planCatalog.ts |
| Entitlements, trial and add-ons | frontend/lib/plans.ts |
| Pricing matrix and existing checkout route | frontend/app/pricing/page.tsx |
| Five AI modes | backend/src/services/claudeService.ts and backend/src/routes/quiz.ts |
| Sixteen template definitions and media | frontend/lib/quiz/templates.ts |
| Editor blocks and outcome fields | frontend/lib/quiz/blocks.ts |
| Extended question types | backend/src/services/questionTypes.ts |
| Embed user flow | frontend/app/dashboard/embed/page.tsx |
| Integration implementations | backend/src/services/integrations/ |
| Current public builder gateway | frontend/app/tools/quiz-funnel/page.tsx |
| Product renderer | frontend/components/quiz-taker/QuizRenderer.tsx |

Do not use older pricing strategy documents, llms.txt, old landing-page documents or the Phase 2 pilot pricing proposal as the price source. Some contain stale plan names, old limits or older Squarespace-only positioning.

## Exact pricing shown in the design

### Monthly
- Core: $12 per month, 5 quizzes, 1,000 leads, 1,000 emails
- Pro: $19 per month, unlimited quizzes, 3,000 leads, 3,000 emails
- Business: $35 per month, unlimited quizzes, leads and emails

### Yearly
- Core: $9 per month equivalent, $108 billed yearly, $36 saving
- Pro: $16 per month equivalent, $192 billed yearly, $36 saving
- Business: $29 per month equivalent, $348 billed yearly, $72 saving

### Trial
- 14 days
- Pro-level features
- No credit card

### Add-ons
- Leads: +500 for $3, +1,500 for $7, +3,000 for $12 per month
- Emails: +1,000 for $3, +5,000 for $7, +10,000 for $12 per month

Recheck these source files immediately before production publication. If the owner changes the business model later, update the source of truth and the homepage together.

## Visual direction

The page uses the application brand teal, #0f7377, with a neutral editorial palette and a sharp acid accent. It uses the branching product mark already represented in the public Quiz gateway instead of the invented overlapping-square mark from revision 1.

The visual language combines:

- large, direct typography
- a real product-editor composition
- real template photography already referenced by the product
- visible product depth rather than generic feature icons
- thin technical borders and compact interface labels
- original UI scenes built from the actual data model
- official-domain platform and integration logo assets
- no fake customer proof

The homepage should feel designed around the product. Do not replace it with a generic component library, purple gradients, stock AI sparkles, floating blob backgrounds or decorative icon cards.

## Motion direction

Motion has a job on this page:

1. The hero cycles through Analyze, Build and Publish.
2. The real template image moves slowly inside the product frame.
3. Brand and lead-score cards float with separate timing.
4. Platform logos move in a continuous track.
5. The five quiz modes replace the live product scene on selection.
6. Real template images zoom slightly on hover.
7. Analytics bars shift subtly.
8. Page sections reveal once as they enter the viewport.

All movement stops under prefers-reduced-motion. Hero cycling also stops while the tab is hidden. No WebGL, scroll hijacking, heavy animation package, autoplay video or cursor replacement is needed.

## Real template content used
The page uses content and media from frontend/lib/quiz/templates.ts:

- Photography Style Quiz
- Product Finder Quiz
- Home Style Quiz
- the Photography Style question, “Which editing style are you drawn to?”
- the actual Photography Style answer options and image URLs
- The Storyteller Collection result name

The other thirteen templates are represented by their real categories. The page links to the real template library only after Claude connects the route.

## Platform wording
The current product includes a Squarespace connection flow and three embed modes. Universal embedding can support other platforms when custom code is available. Do not imply a native marketplace connector or automatic page insertion for WordPress, Shopify, Wix, Webflow or Framer unless that connector has actually shipped and been verified.

The platform logo row labels Squarespace as “connect” and other platforms as “embed.” Keep that distinction.

## Integration wording
The pricing catalog includes Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets, Zapier and webhooks on Pro. The backend also contains ActiveCampaign, Calendly and Acuity services.

Before publishing the dedicated integrations page, test each connection and determine whether it is customer-ready. The homepage includes a small note that these additional backend connectors must be checked before they are described as generally available.

## Company and data boundaries
Squarespell Limited owns Squarespell Quiz. The dedicated product is squarespellquiz.com.

Do not modify:

- squarespell.com
- the Squarespell marketplace
- WordPress or WooCommerce
- the one-time/lifetime quiz plugin
- existing marketplace customers or entitlements
- marketplace Stripe objects and webhook behavior

Squarespell Quiz has separate application data and configuration while remaining under the same company accounts.

## Claude implementation task
1. Read this handoff, the design source and the repository source files listed above before editing.
2. Work only in the approved cloud or Hostinger environment. Do not clone, install packages, build, cache files or store screenshots on Hussnain’s Mac. Do not start sub-agents.
3. Confirm whether a newer public-site branch exists. Port this homepage into that branch without overwriting unrelated Phase 1 work.
4. Implement the page in the existing Next.js frontend as scoped reusable components. Preserve the product application, dashboard and quiz runner styles.
5. Use the source HTML as the visual target. Convert the interface to React and scoped CSS. Do not publish the raw prototype as the production architecture.
6. Replace preview dialogs with the verified Quiz routes:
   - public URL form to the current builder path
   - login to the dedicated Quiz sign-in
   - trial CTAs to the existing 14-day trial signup flow
   - templates to the real template library
   - integrations and support to real dedicated pages
7. Keep pricing imported from the canonical plan catalog. Do not duplicate prices in another component if a shared import can be used.
8. Keep all five modes and the actual plan names.
9. Keep real template images and official platform/integration logos. Download and self-host only where licenses and brand terms permit. Record the attribution/license decision.
10. Keep the staging site noindex. Add accurate title, description, canonical, Open Graph asset, sitemap entry and robots behavior only for the final public domain.
11. Verify desktop, tablet and phone layouts, keyboard navigation, reduced motion, image loading, link destinations, responsive overflow and production performance.
12. Show Hussnain the Hostinger staging URL for approval. Do not merge, switch DNS or publish to production until the reviewed staging result is approved.

## Verification completed on the prototype
- Desktop at 1440 by 1000
- Tablet at 768 by 1024
- Mobile at 390 by 844
- No horizontal overflow at those sizes
- All 29 external images and logo assets loaded after correction
- Five-mode selector tested with the price calculator state
- Monthly to yearly pricing switch tested: 12/19/35 becomes 9/16/29
- Mobile menu and template action dialog tested
- JavaScript parsed successfully
- No external JavaScript, analytics, fetch request, form submission or persistent browser storage
- No em dash character in the source
- Reduced-motion behavior reviewed in code

This verification covers the design prototype. It is not a production application, payment, authentication, API or deployment test.

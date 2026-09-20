# Homepage port notes

Ported from `design/squarespell-quiz/index.html` (reviewed source a954105948bd972e9f68d196fee22ba69d93615d) into `frontend/components/marketing/home/`.

## Structure
- `home.css` is the design stylesheet with every rule scoped under `.sqhome`; keyframes are prefixed `sqh-`. Nothing reaches the dashboard or quiz runner.
- Static sections are components generated from the approved markup. Interactive parts are client components: `Header` (mobile menu), `HeroSection` (Analyze, Build, Publish cycle and URL form), `ModesSection` (five modes), `PricingSection` (billing switch).
- `PricingSection` reads every price, limit and feature from `lib/planCatalog.ts`, and add-on packs and trial length from `lib/plans.ts`.

## Deliberate differences from the prototype
- Preview dialogs are replaced by real routes: builder (`QUIZ_BUILDER_PATH`), `/sign-in`, `/sign-up`, `/templates`, `/integrations`, `/support`.
- `/integrations` and `/support` are new dedicated pages. Support is an email address, the one already published in the app's terms and privacy pages. There is no help center or live chat.
- Fonts (Manrope, DM Sans) load through `next/font` instead of a render-blocking Google Fonts link.
- Catalog copy "Squarespace one-click connect" is displayed as "Squarespace connect" and em dashes are shown as colons.
- Two CSS fixes to defects found while testing on staging: the website URL field now shows a focus ring on the whole form (the prototype set `outline: 0` on the input), and plan tags no longer stretch across the card and run under the "Most popular" badge.
- The staging homepage is `noindex`. Canonical URL, Open Graph image, sitemap entry and the indexing rule are for the final domain only.

## Asset decisions
- Template photography is hotlinked from Unsplash, the same media the product's templates already reference in `lib/quiz/templates.ts`. Unsplash photos are free to use and are not re-hosted.
- Platform and integration logos are hotlinked from Simple Icons (`cdn.simpleicons.org`, CC0 artwork) and, where Simple Icons has no entry, from the Google favicon service. Logos are trademarks of their owners and are used only to identify the service. Self-hosting is a launch task once brand-usage terms are confirmed for each vendor.

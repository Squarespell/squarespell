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

## Correction pass: wording, integrations, example data, assets

### Wording decisions
- Squarespace, WordPress, Shopify, Wix, Webflow and Framer are all "embed". No platform is described as one-click install. `planCatalog.ts` and `app/pricing/page.tsx` now say "Embed on Squarespace and custom-code websites".
- Account connections (Mailchimp, Google Sheets and so on) are integrations that send lead data out. The integrations page states that they do not place a quiz on a page.
- Business plan says "Priority email support". Support is email only (`mailto:info@squarespell.com`); no chat is offered or built.

### Integration status (homepage and /integrations)
- Homepage shows only Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets, Zapier, Webhooks.
- `/integrations` labels each entry Available, Requires customer configuration or Planned. "Available" is reserved for flows that are implemented and verified end to end. None has been verified yet, so none is labelled Available.
- Native connector types in the backend: zapier, mailchimp, google_sheets, klaviyo, convertkit, webhook. HubSpot is reached through Zapier. ActiveCampaign, Calendly and Acuity are Planned and removed from the homepage.

### Example data labels
- Analytics card (68% completion, 41% lead rate): "Example dashboard data".
- Hero lead score card: "Example lead score", note says example only.
- Mode demos (scores, prices, percentages): "Example preview data".

### Asset inventory and hosting decision
| Asset | Where used | Source | Licence / rule | Decision |
| --- | --- | --- | --- | --- |
| Squarespace, WordPress, Shopify, Wix, Webflow, Framer, Mailchimp, HubSpot, Google Sheets, Zapier, Kit (ConvertKit) marks | Homepage strip and integrations, /integrations | Simple Icons, commit b86d5c9a0bdd4f3f5c30898a63654dd32f39fd76 | Artwork CC0 1.0. Trademarks stay with owners; nominative identification only | Self-hosted as data URIs in `logoAssets.ts` |
| Klaviyo | Homepage, /integrations | Not in Simple Icons | Brand logo not copied | Original neutral "K" monogram tile |
| Webhooks | Homepage, /integrations | Drawn for this project | Original | Self-hosted in `logoAssets.ts` |
| ActiveCampaign, Calendly, Acuity | /integrations only | None | Brand logos not copied | Initial-letter tile, status Planned |
| Google favicon service images | Previously used | Third-party service serving brand icons | Not a licence to copy | Removed |
| Unsplash template photography | Hero preview, templates section | images.unsplash.com URLs already used by the canonical `templates.ts` product assets | Unsplash licence | Kept remote on purpose: they are the product's canonical template assets, and copying them would need per-photo licence and attribution review. Revisit before production |

No third-party image CDN other than images.unsplash.com is requested by the homepage or /integrations.

### Launch copy fixes and post-launch tasks
- Pro integrations wording is now "Integrations with Zapier, Mailchimp, Klaviyo, ConvertKit, HubSpot and Google Sheets" everywhere the plan catalog feature appears, and `/pricing` no longer says "all integrations" or "zero setup friction".
- The homepage Business card now shows "Priority email support", matching `/pricing`.
- Unsplash template photography is approved for the initial launch as the canonical product images.
- **Post-launch reliability task:** self-host the template photography (after a per-photo licence and attribution check) so the homepage and templates page no longer depend on images.unsplash.com.

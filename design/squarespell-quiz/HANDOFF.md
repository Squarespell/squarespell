# Squarespell Quiz — homepage design and Claude handoff
Version 1 · 20 September 2026

## Open the design
- [Interactive preview](https://htmlpreview.github.io/?https://github.com/Squarespell/squarespell/blob/564b90853fa7a990a90b829a03ce60da97ab4a0e/design/squarespell-quiz/index.html)
- [Editable HTML source](https://github.com/Squarespell/squarespell/blob/design/squarespell-quiz-homepage/design/squarespell-quiz/index.html)
- Branch: design/squarespell-quiz-homepage
- Approved product context: docs/relaunch/SQUARESPELL_PHASE_2_PILOT_SPEC.md

The preview uses a third-party HTML viewer to render the public source. It is a design demonstration, not a Squarespell production deployment. The source remains usable if that viewer is unavailable: serve index.html from the authorised Hostinger staging environment. Do not put project files or run builds on Hussnain’s Mac.

## What is delivered
One complete responsive homepage, with finished visual styling and copy, an animated product illustration, an interactive three-question demo, three selectable workflow illustrations, sample experience cards, a platform selector, pricing, expandable FAQs, mobile navigation and modal interactions.

It is intentionally self-contained HTML/CSS/JavaScript with no package installation, JavaScript framework, build step, image dependency, tracking script or backend request. Typography loads from Google Fonts with system fallbacks. Signup, login, payments and support are represented by explanatory preview dialogs. They are not live integrations.

This homepage is the visual reference for implementation in the existing Next.js application. It does not implement the application, 20-page launch map, checkout, accounts, CRM, AI generation or real installations. There are no invented customer logos, testimonials, conversion statistics, or live customer examples.

## The design direction
A confident, editorial identity: warm ivory, deep forest green and a precise lime accent. A large serif headline pairs with a clean sans-serif interface. Generous spacing creates hierarchy; fine borders and small labels give the product scenes a crafted feel.

The page tells one story: a visitor arrives with a question, receives a useful answer, and finds a relevant next step. The homepage demonstrates that exchange before asking for signup.

Original elements: the overlapping square brand symbol, North / Studio sample website, three-card conversation scene, leaf/sun/arch illustrations, and oversized footer wordmark. North / Studio is a fictional sample, not a customer. The symbol is a design proposal, not a replacement of the parent company’s legal identity or marketplace branding.

### Tokens
| Role | Value |
|---|---|
| Page | #f5f4ed |
| Surface | #fffefa |
| Ink | #172b23 |
| Secondary text | #5d6b60 |
| Divider | #d5d9ce |
| Accent | #d8f277 |
| Secondary green | #254f3d |
| Warm illustration accent | #e99163 |
| Body/interface font | DM Sans, Arial, sans-serif |
| Editorial accent | Instrument Serif, Georgia, serif |
| Main maximum width | 1280px |
| Desktop outer gutter | 48px minimum |
| Phone outer gutter | 20px |
| Section spacing | 112px desktop / 65px phone |
| Main easing | cubic-bezier(.2,.7,.2,1) |
| Border radii | 6–7px controls; 13–22px large surfaces |

Keep the typography, spacing, colours, layouts, bespoke illustrations and interaction states when porting. Do not substitute a generic component-library theme. Do not copy competitor assets.

## Competitor research
Primary homepages reviewed on 20 September 2026. Eight relevant competitors were selected; this is not an exhaustive list of every quiz tool.

Desktop visuals were inspected for Interact, involve.me, ScoreApp, Octane AI, Outgrow, Riddle and Opinion Stage. Typeform’s narrow-layout hero and page structure were inspected. Cookie panels obscured parts of Typeform and Riddle. Motion statements below distinguish observed state changes from visible media controls. No authenticated product audit or performance benchmark was performed.

| Competitor and primary source | Observed presentation | Design lesson and our response |
|---|---|---|
| [Typeform](https://www.typeform.com/) | Dark editorial hero with large serif typography. The page exposes a named homepage animation/video and a three-part product carousel. Playback quality was not benchmarked. | Use strong typography and a product narrative. Squarespell’s preview uses lightweight native UI motion and a playable example. |
| [Interact](https://www.tryinteract.com/) | Oversized outcome-led headline, restrained white layout, purple CTA and a large editor visual. The rest of the homepage uses customer stories and integrations. | State the outcome early and show the product. Use original green/ivory art direction and sample-labelled proof until real customer evidence exists. |
| [involve.me](https://www.involve.me/) | Centred AI/funnel headline, blue CTA, social proof and a large colourful product demonstration. Broad platform/automation navigation. | Explain the journey, but keep this launch homepage focused on the three approved experience types. |
| [ScoreApp](https://www.scoreapp.com/) | Qualification-led messaging, light blue scenes, readiness cards, prominent demo and proof sections. | Demonstrate a useful next step. Do not borrow its metrics or imply Squarespell has comparable customer evidence. |
| [Octane AI](https://www.octaneai.com/) | Split hero with serif typography and an animated quiz/profile/result composition. Successive screenshots showed the scene moving from questions to an email/result state. Strong Shopify positioning. | Motion can explain cause and effect. Our own illustration explains website → question → result, and our actual demo requires no email. |
| [Outgrow](https://outgrow.co/) | Split layout, prominent product canvas, colour controls and trial email form, followed by enterprise logos. | Make the product concrete. Let visitors experience an example before requesting contact details. |
| [Riddle](https://www.riddle.com/) | Large centred headline, layered publisher/game examples and prominent privacy/accessibility signals. Cookie dialog partially obscured the scene. | Include accessibility and honest capability explanations. Do not claim certifications the product has not earned. |
| [Opinion Stage](https://www.opinionstage.com/) | Simple split hero, quiz-creation demonstration, blue CTA and proof/logo rows. | Keep the entry point understandable. Pair clear navigation with a more distinctive visual identity. |

These are design observations, not verified claims about vendors’ implementation frameworks, pricing or conversion performance. The preview includes none of the competitors’ protected visual assets or testimonials.

## Page sequence
1. Sticky navigation and original product wordmark.
2. Outcome-led hero and two CTAs.
3. Animated website → quiz → result illustration.
4. Platform names with actual installation limitations explained lower on the page.
5. Why the experience is useful.
6. Three selectable creation/publishing steps.
7. Functional three-question recommendation demo.
8. Lead qualifier, service finder and assessment sample cards.
9. Platform selector with distinct installation guidance.
10. Build and approved Founding Partner pricing.
11. FAQ covering platforms, limits and the protected lifetime plugin.
12. Final CTA and branded footer.

## Motion specification
| Element | Behaviour | Guardrail |
|---|---|---|
| Initial hero | Short opacity/vertical entrance on desktop | No blocking loader or delayed text |
| Conversation illustration | Three stages, 3.5 seconds per stage; restrained card transforms and a travelling dot | Pause/play control; manual stage selection pauses autoplay |
| Hidden/offscreen hero | Autoplay pauses | Visibility and intersection listeners |
| Workflow | Buttons change illustrated content; 450ms entrance | All text remains available through controls |
| Quiz | Progress bar animates; final result enters over 500ms | Focus moves to the new question/result |
| Lower sections | Once-only 24px reveal, 800ms | Content remains visible without JS and under reduced motion |
| Sample cards | Small hover lift and illustration change | No cursor replacement, drag requirement or scroll hijacking |
| Links/buttons | 200–300ms colour/arrow movement | Visible keyboard focus |
| Reduced motion | Removes CSS animations/transitions and automatic stage changes | Retain every function and all content |

Do not add WebGL, continuous full-page parallax, background video, custom scroll engines or large animation packages merely to make it look expensive. Motion should communicate product behaviour and stay smooth on phones.

## Interaction contracts
- Hero/nav/free-plan CTAs: replace preview dialogs with the dedicated Quiz signup/builder route after verifying its real route and readiness. Preserve intent across signup if supported.
- Login: dedicated Squarespell Quiz authentication. No WordPress/WooCommerce login.
- Founding Partner: connect to the reviewed application/acceptance flow. Do not silently create a checkout or subscribe a visitor.
- Support: connect to the real dedicated Quiz contact route, not a guessed email address.
- Demo: retain the public, anonymous three-question experience. It scores the three choices by frequency; a tie favours the first answer. Label it as an example. The prototype keeps answers only in page memory and makes no network requests for them.
- Sample cards: show the corresponding sample recommendation and move to the demo section.
- Workflow: preserve three clickable steps and their distinct visuals.
- Platform controls: preserve guidance per platform; a logo is not evidence that a native connector exists.
- FAQs/pricing disclosure: native details/summary interaction.
- Mobile menu: close after anchor selection or Escape.
- Modal: support keyboard focus, Escape and close button; production should replace the preview dialogs with genuine journeys.

## Product and company boundaries
Squarespell Limited owns Squarespell Quiz. The parent marketplace remains squarespell.com. This is a new product site at squarespellquiz.com, not a new legal entity.

Protect squarespell.com, WordPress, WooCommerce, all existing Stripe marketplace mappings, the lifetime quiz product and its customer entitlements. Use separate Quiz application data and configuration within company accounts. This design requires no access to marketplace administration or private customer data.

The website advertises the three approved pilot experience types. Do not present the planned WordPress/Shopify connectors, Agency workspaces, white-label client management, calculators or ecommerce recommendation engine as working features.

Squarespace does not have documented public support for automatic insertion into an ordinary page. Keep its guided installation wording. Confirm each actual supported embed path against current official documentation and the implementation before marking it available.

## Pricing and publication notes
The design follows the merged pilot specification:
- Build: $0, 1 live experience, 25 monthly completions, 1 site, product branding.
- Founding Partner: $49 USD monthly, fixed for six months from each start date, first 10 accepted partners; Growth-level access, up to 3 own sites, personal onboarding and two feedback interviews.
- First-payment fourteen-day refund; cancel anytime; no long-term contract; then-current Growth price after six months with at least 30 days’ notice.
- Use the approved tax wording.
- Launch/Growth/Agency remain coming after the pilot, without displaying unapproved future prices.

The specification requires final review of refund, tax and cancellation terms before public publication. This file records that gate; the design is not legal approval. Do not change Stripe products/prices or activate billing just to demonstrate the design.

The Build and Growth grace allowances and anonymous continuation must be implemented and tested before publishing the corresponding FAQ as live functionality.

## Porting into the existing app
1. Read this handoff and the approved product specification. Treat this new homepage design as the visual proposal for Hussnain’s review; do not reopen completed infrastructure work.
2. Use the authorised Hostinger/cloud development environment and an isolated branch. Verify execution location before project commands. No local clones, installs, builds, screenshots, caches or project files on Hussnain’s Mac; no sub-agents.
3. Inspect the existing frontend structure once. Port the homepage into reusable components: Header, HeroConversation, BenefitIntro, Workflow, InteractiveDemo, ExampleCards, PlatformPicker, PilotPricing, FAQ, FinalCTA and Footer.
4. Namespace CSS under a dedicated marketing root, use CSS Modules or equivalent. The prototype’s global CSS must not change authenticated dashboard, quiz runner or marketplace layouts.
5. Preserve the self-contained demo state and motion cleanup. In React, clear timers/observers/event listeners on unmount and avoid duplicate listeners under strict mode. Use stable state updates and semantic buttons. Replace the prototype’s innerHTML rendering with JSX.
6. Serve properly licensed font files from the Quiz origin in production or use existing authorised font hosting. Keep fallbacks and font-display:swap. No image assets are required for this homepage.
7. Connect genuine auth/contact routes and the approved partner flow. Do not publish preview dialogs as functioning signup or billing.
8. Keep a staging preview noindex. Production must get its own accurate title, description, canonical, metadata, legal/contact routes and sitemap entry. Remove noindex only for the approved public deployment. Never canonicalise the new homepage to the marketplace or redirect marketplace URLs as part of this task.
9. Use realistic performance budgets: no heavy JS animation library, no layout-shifting font/content reveal, no hero video. Measure production build performance on staging; do not claim a Lighthouse score without a run.
10. Run the existing required checks and real browser checks on Hostinger staging. Confirm working CTA destinations and honest feature claims, then give Hussnain the staging URL. Production publication should follow his approval of that concrete staging result.

Do not merge a design-only branch into main simply to use this HTML. Do not change hosting/DNS, purchase services, migrate data, alter existing application PRs or initiate outreach as part of this design handoff.

## Verification performed on this prototype
Source commit for the reviewed preview: 564b90853fa7a990a90b829a03ce60da97ab4a0e.

- Opened the actual rendered HTML through the public preview viewer.
- Visually inspected desktop hero, workflow, interactive demo, sample cards, pricing and tablet/mobile views.
- Checked document width at 390px and 768px. A 4px overflow found at 320px was fixed by simplifying the narrow header, and a second check returned 320px content width in a 320px viewport.
- Completed all three recommendation types through the quiz or corresponding example; all-three-identical-answer journeys were tested for lead qualifier, service finder and assessment.
- Tested back navigation and reset.
- Tested the desktop CTA preview dialog and close control.
- Tested mobile menu opening and anchor navigation.
- Tested workflow switching and WordPress platform guidance.
- Expanded the pricing terms.
- Parsed the embedded JavaScript successfully.
- Confirmed source contains no external script tag, form-submission request, analytics call, persistent browser storage or empty # placeholder link.
- Reduced-motion and hidden/offscreen pause handling inspected in code. OS-level reduced-motion emulation and assistive-technology testing were not performed.
- No claim is made of production functionality, complete accessibility certification, a performance score or cross-browser test coverage.

Code and handoff were written directly to the isolated GitHub branch through the connector. No repository was cloned and no packages, build outputs or design project files were written to the Mac. A single browser tab was reused for competitor review and visual checks.

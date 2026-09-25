# Squarespace automatic installation: platform capability investigation

Date: 2026-09-25. Status: **true zero-code installation is not officially possible on Squarespace today.** Findings come only from official pages; no undocumented endpoint, cookie, password or editor automation was used.

## 1. Verdict

Squarespace's public developer platform gives apps commerce and contact data, webhooks and OAuth. It gives apps **no** way to create or edit a page, section, block, Embed Block, Code Block, or Code Injection. Commerce data access is not permission to edit site content. Squarespell therefore cannot add a quiz to a Squarespace page, or install its own loader, without the site owner doing it in the Squarespace editor.

## 2. Evidence (official sources)

| Question | Finding | Source |
|---|---|---|
| Is there any page, block or code endpoint? | The official Commerce API OpenAPI schema (version 2) has 53 operations. They cover analytics, discounts, contacts, fulfillment options, products, inventory, orders, store pages (read only), transactions, profiles, authorization info and webhook subscriptions. None create or edit pages, sections, blocks or Code Injection. | https://developers.squarespace.com/commerce-apis/latest/schema-processor-version-version-latest.json |
| API areas listed | Analytics, Contacts, Discounts, Inventory, Orders, Products, Profiles, Transactions, Webhook Subscriptions. | https://developers.squarespace.com/commerce-apis/overview |
| OAuth scopes | website.orders, website.orders.read, website.transactions.read, website.inventory, website.inventory.read, website.products, website.products.read, website.contacts, website.contacts.read, website.discounts, website.discounts.read. No content, page, block, code or design scope exists. The confirmation page shows website selection for website.* scopes. | https://developers.squarespace.com/commerce-apis/oauth |
| Permission levels per API | Read Only / Read and Write per commerce API; Forms API read only for Zapier; Webhook Subscriptions OAuth only. | https://developers.squarespace.com/commerce-apis/authentication-and-permissions |
| Is code injection an API? | The Custom Code Specification only lists stable HTML attributes for code that a person adds. It is a DOM contract, not an installer. Custom Code docs contain only About and HTML Attributes. | https://developers.squarespace.com/custom-code/about |
| Any content webhook? | Topics are extension.uninstall, order create/update, contact and address events. No page, block or publish events. | https://developers.squarespace.com/webhooks/overview |
| Recent changes | Changelog through Aug 28, 2026 (Discounts API, payment plans, etc.) adds no content or page capability. | https://developers.squarespace.com/commerce-apis/changelog |
| OAuth registration | As of Jul 27, 2026 developers self-serve OAuth apps in the Account Dashboard Developer Apps tab. New apps start in Demo Mode; production needs a review requested from the app page. Partner (Extension) apps supply an Initiate URL that Squarespace links to. | https://developers.squarespace.com/changes/self-service-oauth-credential-management and the OAuth page above |
| Installable visual blocks like Shopify App Blocks / Wix widgets / WordPress blocks? | Not documented. Squarespace Extensions are OAuth-connected data integrations listed at squarespace.com/extensions. The listed "Google Reviews by Common Ninja" Extension (marketed "No code required") tells customers to copy its widget HTML and paste it into a Code Block. | https://www.squarespace.com/extensions/details/google-reviews and https://help.commoninja.com/hc/en-us/articles/13902927570845-How-To-Add-Common-Ninja-Widgets-To-Squarespace |
| Account status | The Squarespell account shows Squarespace Circle "Silver Partner since 2025" and prompts acceptance of the Developer Terms before Developer Apps. Not accepted (a legal action for the account owner). | https://account.squarespace.com/developer-apps |

## 3. Exact missing permission

There is no scope, API or extension type that permits any of: create/edit page, section or block; create/edit Embed or Code Block; write site Header/Footer Code Injection; register an app-owned script; or publish an app block. What would be needed is a new capability, for example (names are ours, not Squarespace's): `website.content.write` (add, move, remove an app-owned embed block in a named page section) or `website.code.write` (register one app-owned script for a website), plus a page/section read scope for the page selector. These do not exist today.

## 4. What Squarespell can do now, and what needs Squarespace

Immediately (no approval): keep the loader flow, labelled as a **manual setup**; run all management from Squarespell after the manual steps; add the platform capability layer (done: `PLATFORM_CAPABILITY`, only 'automatic' may use automatic wording); build genuine automatic paths on platforms that support them.

Requires Squarespace approval: any content-editing capability. Route: request through the Squarespace Circle partner channel and Developer Support, and propose an Extension type (embed/app block or app-owned script) and the scopes above. Not something the developer dashboard can grant by itself.

## 5. What the current loader flow provides

Manual setup. The customer pastes one loader into Code Injection (Footer, at the very top of the field) once and saves. Squarespell verifies it, then popup and floating quizzes are published, updated, moved, paused and removed from Squarespell (visible on the site within about 60 seconds). Inline quizzes additionally need a Code Block slot per location, added once by the customer. It is **not** automatic, not one-click and not zero-code. Live-tested on a paid Squarespace site (see PR #78). A private site cannot be verified.

## 6. Platforms with an official automatic path

| Platform | Mechanism | Source | Caveat |
|---|---|---|---|
| Webflow | Custom Code API: register a script version and apply it to a site or page via the Data API; the docs tell apps to prefer the API over manual pasting; publish still needed | https://developers.webflow.com/data/docs/working-with-custom-code | App review; user must publish |
| Wix | Embedded Script API injects a script tag into a site head; Wix app model | https://dev.wix.com/docs/api-reference/app-management/embedded-scripts/introduction | Must be a Wix app |
| Shopify | Theme app extensions: app blocks and app embeds appear in the theme editor without theme code | https://shopify.dev/docs/apps/build/online-store/theme-app-extensions | Merchant adds the block in the theme editor (no code) |
| WordPress | Plugin (PHP, JS) with a block or shortcode; standard mechanism | https://developer.wordpress.org/plugins/intro/what-is-a-plugin/ | Customer installs the plugin |

Framer: not evaluated here (unverified).

## 7. Safest product plan

1. Label Squarespace and generic HTML as manual setup everywhere; never say automatic, one-click or no-code for them (done in copy; PLATFORM_CAPABILITY gate).
2. Prioritise Webflow (Custom Code API), then Wix (Embedded Script) and WordPress plugin for real automatic installs; Shopify app block as a no-code editor step.
3. Send the Squarespace partner application below through the Circle partner channel. Do not submit without owner approval.
4. Keep the manual loader as the Squarespace fallback until Squarespace ships a content capability, then add a real automatic installer behind PLATFORM_CAPABILITY.

## 8. Squarespace partner / Extension application package (draft, not submitted)

**Product.** Squarespell Quiz builds branded lead quizzes and shows them on a customer's website as a floating tab, popup or inline section. Customers manage every quiz from Squarespell.

**Request.** A supported way for an approved Extension to (a) list the site's pages and sections, and (b) add, move, pause and remove one app-owned embed block or one app-owned script on a site the customer authorises, with the owner's consent screen naming the change. Read-only page structure plus a single-purpose write capability, no design or content access beyond our block.

**Requested permissions (proposed).** Existing scope: none needed for commerce. Proposed new: page and section read; app-owned embed block write; app-owned script register. No orders, products, contacts or payments.

**Customer journey.** Connect with Squarespace -> Squarespace consent screen naming the website and the exact permission -> customer picks page and placement in Squarespell -> Squarespell adds the block -> customer can pause, move or remove from Squarespell -> revoke in Squarespace or Squarespell removes the block and token.

**OAuth details (to confirm before submission).** Redirect URL: https://squarespellquiz.com/api/connect/squarespace/callback (production) and https://api-staging.squarespellquiz.com/api/connect/squarespace/callback (staging demo). Initiate URL: https://squarespellquiz.com/api/connect/squarespace/initiate. Terms and privacy links: squarespellquiz.com legal pages. Icon: 1:1 PNG or SVG under 200 KB.

**Webhooks needed.** extension.uninstall (exists) to remove our block and delete tokens; plus events for page deleted or renamed and site publish (do not exist today).

**Privacy.** We store the OAuth refresh token encrypted, the site id and hostname, and the list of placed blocks. No customer passwords are ever requested or stored. Quiz respondents' leads belong to the customer. Data is deleted on uninstall or on request. Tokens are never sent to the browser.

**Architecture.** Next.js dashboard, Express API, Postgres. Server-side OAuth code exchange with client secret, encrypted token store, per-site manifest, idempotent publish and rollback (already built for the loader flow), audit log, signed webhook verification. Loader flow remains a labelled manual fallback.

**Screenshots to attach.** Connect screen, consent screen, page and placement picker, live preview, manage panel with pause/move/remove, revoke screen.

**Open items for the owner.** Accept the Developer Terms in the Account Dashboard; confirm production redirect domain; choose the submission channel (Circle partner contact or Developer Support); approve the final text.

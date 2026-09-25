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

## 8. Squarespace partner / Extension application package (complete draft, NOT submitted)

Status: ready for owner review. Not submitted. The Developer Terms have not been accepted. Both are owner-only steps.

### 8.1 Applicant
Squarespell (Square Spell), Squarespace Circle Silver Partner since 2025. Product: Squarespell Quiz, a lead-quiz builder for Squarespace sites. Contact: info@squarespell.com.

### 8.2 Product explanation
Squarespell Quiz creates branded multiple-choice quizzes with branching, weighted scoring, outcomes and a lead gate, and delivers them on a customer's Squarespace website as an inline section, a popup or a floating tab. Customers manage every quiz (publish, update, move, pause, resume, remove) from Squarespell. Today this needs a manual one-time loader paste and a Code Block slot per inline location, because the public Squarespace platform has no content-editing API. This application asks Squarespace for the missing capability.

### 8.3 Requested capability (does not exist today; proposed names)
1. `website.pages.read`: list pages and their sections, read only, so the customer can choose a page and placement in Squarespell.
2. `website.embed.write`: add, move and remove **one Squarespell-owned embed block** in a named section of a named page. The block only points at a Squarespell-hosted URL. No other content may be read or changed.
3. Alternative to 2 if blocks are not possible: `website.script.write`, register and remove **one app-owned script** for a single website (equivalent to a Footer Code Injection entry owned by the app, visible to and removable by the site owner in Code Injection settings).
4. Consent screen wording that names the website, the page and the exact change.
Not requested: orders, products, contacts, payments, design, domains, member data.

### 8.4 Customer journey
1. Customer clicks **Connect with Squarespace** in Squarespell.
2. Squarespace shows its OAuth confirmation page; the customer picks the website and approves the two scopes above.
3. Squarespell shows the site's pages; the customer chooses a page, section and mode (inline, popup, floating tab).
4. Squarespell adds the embed block or script through the API. No pasting, no Code Block, no Code Injection edit.
5. Later publish, update, move, pause, resume and remove run through the same API from Squarespell.
6. Customer can revoke in Squarespace or disconnect in Squarespell.

### 8.5 OAuth details (owner to confirm before submission)
| Item | Value |
|---|---|
| Client name | Squarespell Quiz |
| Redirect URIs | https://squarespellquiz.com/api/connect/squarespace/callback (production); https://api-staging.squarespellquiz.com/api/connect/squarespace/callback (staging, Demo Mode) |
| Initiate URL (partner apps) | https://squarespellquiz.com/api/connect/squarespace/initiate (accepts website_id and passes it to /authorize) |
| Scopes | as in 8.3 (proposed) |
| Access type | offline (refresh token) |
| Terms | https://squarespellquiz.com/terms |
| Privacy | https://squarespellquiz.com/privacy |
| Icon | 1:1 PNG or SVG under 200 KB |
| Registration route | Account Dashboard, Developer Apps (self-service since Jul 27, 2026); starts in Demo Mode; production review requested from the app page |

### 8.6 Webhook requirements
Existing and used: `extension.uninstall`. Requested (not available today): page deleted or renamed, section removed, site published. Notifications verified with the Squarespace-Signature header; the secret is stored encrypted; delivery is idempotent by notification id.

### 8.7 Privacy and data handling
Stored: encrypted OAuth refresh token, website id and hostname, the list of Squarespell-owned blocks (id, page, section, mode). Not stored: Squarespace passwords (never requested), page content, member or order data. Tokens are used server-side only and never sent to the browser. Quiz respondents' leads belong to the customer and are handled under the Squarespell privacy policy and GDPR delete-request flow. Retention: token and block records are deleted on uninstall or within 30 days of a disconnect; audit events are kept 12 months without personal data.

### 8.8 Security architecture
Server-side authorization-code exchange with client secret; state parameter verified against a per-session value; short access tokens (30 minutes) refreshed server-side; tokens and secrets encrypted at rest and never logged; least-privilege scopes; per-site manifest signed by the API and validated by the loader (unexpected fields ignored, previous good manifest kept); write operations are idempotent, rate-limited and audited; publish uses a rollback on failure; SSRF-protected fetches; CSRF-protected dashboard; HTTPS only with security headers. The existing loader flow is retained only as a labelled manual fallback.

### 8.9 Uninstall and revocation behaviour
On `extension.uninstall` or token revocation Squarespell removes its embed block or script where the API still allows it, marks the site disconnected, stops serving its manifest, deletes tokens, and shows the customer what was removed. If removal fails, the customer sees exactly which block remains and how to delete it in the editor. Removing a quiz never deletes the customer's leads.

### 8.10 Screenshots to attach at submission
Captured from staging (https://staging.squarespellquiz.com/dashboard/sites) with a disposable account: (1) platform choice showing Squarespace as manual today; (2) the future Connect with Squarespace button and consent step (mock, marked as mock); (3) page and placement picker; (4) live preview desktop and mobile; (5) manage panel: update, move, pause, resume, remove; (6) disconnect and revoke confirmation; (7) failure explanation (for example Private site or missing slot). Captures are taken by the owner or on request; none contain customer data.

### 8.11 Testing plan
Demo Mode app on two independent Squarespace test sites. Cases: authorize, deny, wrong website, expired access token refresh, revoked token, uninstall webhook, install each mode, update text, move page, pause and resume, remove and republish, two quizzes on one page, page renamed or deleted, site private or unpublished, concurrent edits by the site owner, rate limiting, token and secret leakage scans, and full regression of the hosted and embed quiz. Pass criteria: no code pasted by the customer, every action reversible from Squarespell, uninstall leaves the site clean.

### 8.12 Open items for the owner
Accept the Developer Terms in the Account Dashboard; confirm the production redirect domain; choose the submission channel (Circle partner contact or Developer Support); review and approve the final text.

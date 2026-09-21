# Squarespell Quiz - One-Button Connect Specification

Status: **DRAFT for owner and design review. Documentation only - nothing here is implemented, submitted, published or deployed.** Prepared 21 September 2026. Linked from the Phase 2 Pilot Specification, section 0.4 (the canonical in-repository plan; the "Relaunch Master Plan Revision 3.0" cited by Phases 0-2 is not stored in the repository).

**Evidence labels:** *Verified in code* (read in this repository on 21 September 2026), *Verified in docs today* (official page fetched on 21 September 2026), *Phase 0* (official documentation reviewed in Phase 0, 19 September 2026 - re-verify before each connector is built), *Design* (this document's proposal), *Not confirmed* (an official source did not state it; must not be promised).

## 1. Top-level product requirement

> **Connect your website once. Publish, update or remove every quiz with one button.**

Customers must not paste embed code every time they publish a quiz. Target flow: (1) Connect website; (2) choose the platform; (3) use that platform's approved authorization or installation process; (4) choose the website; (5) where the platform permits, choose the page and placement; (6) choose inline, popup or floating tab; (7) Publish; (8) Squarespell installs or activates the quiz; (9) Squarespell verifies the live installation; (10) later quiz updates publish without another paste; (11) the customer can pause, update, move or remove the installation from Squarespell.

**Truthfulness rule.** Every platform is placed in exactly one delivery class, and the interface and marketing copy may only use the words that class allows:

| Class | Name | What it means | Allowed wording |
|---|---|---|---|
| **A** | Native one-button installation | An official plugin, app or extension installs and manages the quiz | "Install", "one click" only if this exact path is proven |
| **B** | Connect once, then one-button publishing | A connector or site loader is installed **once**; every later quiz is published, updated or removed without copying code again | "Connect once", "publish with one button" |
| **C** | Guided fallback | The platform provides no approved installation API; setup is guided, verified and as short as possible | "Guided setup", "we verify it for you" - **never "automatic"** |

A platform can be in more than one class for different placements (for example Squarespace: guided one-time install of the loader, then Class B publishing for popup and floating tab). Current manual embeds (hosted link, iframe, script snippet) stay available on every platform as the **fallback and rollback path**.

## 2. What exists today (verified in code on 21 September 2026)

### 2.1 Already works (production code)
- **Publishing state.** A quiz is public when `quizzes.status = 'live'` (public read routes filter on it), plus an optional schedule window (`settings.schedule_enabled / publish_at / unpublish_at`) checked in `GET /api/quiz/:slug`. Draft quizzes return 404 publicly.
- **Public links.** `/quiz/<slug>` (hosted page) and `/embed/<slug>` (framed page). Base URL comes from `frontend/lib/urls.ts` (`APP_URL`, default `https://squarespellquiz.com`).
- **Script embed.** `frontend/public/embed/quiz-embed.js` v2.3.1, served as `/embed.js` (alias in `frontend/vercel.json` and in the Hostinger Caddyfiles). Markup: `<div data-squarespell-quiz="SLUG"></div>` plus the script; the legacy `data-quiz` attribute also works. Attributes read: `data-mode` (**inline** default, **popup**, **slidein** = the floating tab), `data-height`, `data-button-text`, `data-accent-color`. It detects host brand colours and fonts, resizes through `postMessage`, re-scans for Squarespace 7.1 AJAX navigation, injects styles once, and compares itself with `/embed/version.json` (logs a console warning when a newer version exists).
- **Iframe embed.** Snippet built in the dashboard (`frontend/app/dashboard/quiz/[id]/embed/page.tsx`, `frontend/app/dashboard/embed/page.tsx`).
- **Verification today:** none. Nothing checks that a customer's page actually contains the snippet.

### 2.2 Exists only in backend code or is partial
- **Squarespace Commerce connection** (`backend/src/services/squarespaceCommerce.ts`, `backend/src/routes/commerce.ts`, table `squarespace_connections`): the customer pastes a **Commerce API key**; it is stored with AES-256-GCM (`encryptConfig`, format `iv:authTag:ciphertext`, key from `ENCRYPTION_KEY`, 64 hex characters) and used to sync products and build add-to-cart links. This connects a **store catalogue**, not a page. It does not use OAuth and does not install or place anything. It is **not** the site connector and must not be presented as one.
- **Lead integrations** (`backend/src/services/integrations/`, table `integrations` with a JSON `config`): Mailchimp, Klaviyo, ConvertKit, ActiveCampaign, HubSpot, Acuity, Calendly, Google Sheets, generic webhook/Zapier. They push leads out; they do not publish quizzes.
- **API keys** (`routes/apiKeys.ts`, `middleware/apiKeyAuth.ts`, table `api_keys`): SHA-256 hashed, shown once, revocable (`revoked_at`), header `x-api-key`. Currently aimed at the Zapier use case; no per-key scopes observed.
- **Outbound webhooks** (`services/webhookDelivery.ts`, table `webhook_deliveries`): 10 s timeout, 3 attempts, back-off of 1, 5 and 30 minutes. Signing was not confirmed in this review.
- **Embed performance logging** (`services/embedPerformance.ts`, table `embed_performance_logs`): service exists; whether the live loader calls it was not confirmed.
- **Custom domain** endpoints (`PATCH /api/user/custom-domain` and `/verify`): domain ownership exists as a concept for hosted quizzes, separate from connected sites.

### 2.3 Must be built
Everything in section 3 onward: connected-site model, site key and loader, installation manifest, connection wizard, verification and heartbeat, platform connectors, audit history, and the twelve screens in section 7.

### 2.4 Prerequisites found while reading (fix before the connector ships)
1. `quiz-embed.js` falls back to the legacy host `https://quiz.squarespell.com` when the script is not served from a `squarespellquiz.com` origin, and its message listener accepts `https://app.squarespell.com`. The connector must serve only final-domain URLs.
2. `frontend/public/embed/squarespell-hook.js` and the platform email templates still reference `app.squarespell.com` (logos, builder redirect).
3. The dashboard snippet builders emit the inline snippet only; the popup and floating-tab modes exist in the loader but are not selectable in the two embed pages read.
4. `ENCRYPTION_KEY` has no key-version prefix; rotation needs a versioned format before OAuth tokens are stored (section 4.3).

## 3. Delivery architecture (Design)

### 3.1 The Site Loader
One small script per **connected site**, installed once:

```html
<script src="https://squarespellquiz.com/connect/loader.js" data-site="SITE_KEY" async></script>
```

- **SITE_KEY** is a public identifier (not a secret). It names the connected site; it grants no account access.
- On load the loader requests the site's **installation manifest** (`GET /api/connect/manifest?site=SITE_KEY`, cacheable, short TTL, only public quiz slugs and display settings), then renders each installation that matches the current URL path using the existing embed engine (inline slot, popup, floating tab).
- **Publish, update, pause, move, remove** are changes to the manifest (a versioned, atomic pointer flip). They take effect on the live site within the cache TTL, with **no new paste**.
- **Inline placement** needs somewhere to render. Options, in order of reliability: (a) a one-time **slot** - `<div data-squarespell-slot="services"></div>` placed once per location; later quizzes are swapped into that slot with one button; (b) a **path rule** - the loader inserts the quiz at a named position on a URL path using only hooks the platform documents as stable (Squarespace: the Custom Code Specification); treated as *experimental* until prototyped on real sites.
- **Popup and floating tab** need no slot: they are pure manifest rules (path include and exclude patterns, trigger, button text) and are fully automatic once the loader is present.
- **Heartbeat.** The loader may report `{site key, page path, loader version, slots seen}` (sampled, rate-limited, no visitor personal data, no cookies) to `POST /api/connect/heartbeat`. This is the runtime proof used by verification.
- **Failure behaviour.** If the manifest cannot be fetched the loader renders nothing and shows a "Take the quiz" link only where a slot exists; it never blocks page rendering. The loader is versioned (`/connect/loader.v1.js` immutable, `/connect/loader.js` a channel alias) so a bad release can be rolled back.
- **Coexistence.** The existing `/embed.js` manual snippet keeps working unchanged. Installing the loader never removes a manual embed; the dashboard warns when both would render the same quiz twice.

### 3.2 Why this satisfies "connect once" honestly
The paste happens **once per site** (Class C on Squarespace, Class B/A elsewhere). No platform editor is manipulated, no password is collected, and nothing runs in the customer's editor. The loader is ordinary custom code executing on the public page, which every platform in section 5 allows the site owner to add.

## 4. Shared connection model (Design)

### 4.1 Entities
| Entity | Purpose | Key fields |
|---|---|---|
| **connected_site** | One website owned by one Squarespell account | id, user_id (tenant), platform, external_site_id, primary_domain, additional_domains[], site_key (public), display_name, state, loader_version_seen, last_heartbeat_at, last_verified_at, created_at, disconnected_at |
| **site_authorization** | Optional platform authorization | id, connected_site_id, method (oauth, app_password, plugin_pairing, none), access_token_enc, refresh_token_enc, key_version, approved_scopes[], expires_at, revoked_at, last_refresh_at, last_refresh_error |
| **quiz_installation** | One quiz placed on one site | id, connected_site_id, quiz_id, mode (inline, popup, floating_tab), placement_type (slot, path_rule, site_wide), placement_ref (slot name, path pattern or remote block id), path_include[], path_exclude[], options (button text, accent, height), status, published_version, remote_installation_id, paused_at, created_at |
| **manifest_version** | Immutable snapshot the loader serves | id, connected_site_id, version, body (public data only), created_by, created_at, is_current |
| **installation_event** | Audit history | id, connected_site_id, quiz_installation_id, actor (user, system, platform_webhook), action (connect, publish, update, pause, resume, move, uninstall, verify_ok, verify_failed, token_refreshed, token_revoked, rollback, retry), before, after, error_code, request_id, created_at |
| **verification_check** | Result of each live check | id, connected_site_id, quiz_installation_id, method (page_fetch, heartbeat, platform_api), url_checked, result, reason_code, checked_at |

All rows are tenant-scoped by `user_id` with the same isolation tests already used for quizzes and leads. Tokens never appear in logs, API responses, manifests or events.

### 4.2 States
- **Site connection:** Not connected, Authorizing, Awaiting installation, Verified, Needs attention (with reason code), Paused, Disconnected. (Extends Phase 2 section 6.6.)
- **Installation:** Draft, Publishing, Live, Updating, Paused, Moving, Removing, Removed, Failed. Only **Live** appears in the manifest.
- **Reason codes** (each has a plain-language fix): loader_not_found, wrong_domain, page_requires_login, blocked_by_csp_or_consent_manager, plan_does_not_allow_custom_code, slot_missing, token_expired, token_revoked, platform_rate_limited, platform_api_error, timeout.

### 4.3 Secrets and tokens
- Store tokens with the existing AES-256-GCM helper, extended with a **key-version prefix** (`v1:iv:tag:ciphertext`) so `ENCRYPTION_KEY` can be rotated without a flag day. Existing un-prefixed values remain readable.
- Request the **minimum scopes**; record approved scopes; show them to the customer before authorization and again in the connection details.
- **Refresh:** refresh before expiry with a lock per site; a failed refresh sets Needs attention (token_expired) and never deletes data.
- **Revocation and disconnect:** Disconnect first empties the site's manifest (quizzes disappear from the live site immediately even though the loader remains), then revokes the token at the platform where an API exists, then deletes stored tokens, then records the events. Where the platform offers no revocation call, say so and tell the customer where to revoke it in their account.
- **Platform-initiated uninstall** (Shopify uninstall webhook, WordPress plugin uninstall, Wix app removal) triggers the same sequence.

### 4.4 Publish pipeline, retry and rollback
1. Customer clicks Publish: `quiz_installation.status = Publishing`; validate the quiz is `live` and the plan allows another installation.
2. Build a new manifest version; write it; flip `is_current` (atomic).
3. If the platform needs a write (Wix embedded script, Webflow custom code, WordPress plugin settings), perform it with an **idempotency key** and back-off (reuse the 1, 5, 30 minute schedule, 3 attempts); record each attempt.
4. Verify (section 4.5). Success: Live. Failure: **automatic rollback** to the previous manifest version and Failed with a reason code; the previous live state is untouched.
5. Every step writes an `installation_event`. A repeated click never creates a duplicate installation (unique on site, quiz, placement).

### 4.5 Verification
- **Page fetch:** server-side fetch of the public URL (SSRF-safe: public hosts only, no redirects to private addresses, size and time limits, login pages reported honestly) looking for the loader tag with the site key, and for the slot where one is required.
- **Heartbeat:** the first heartbeat from a page on the connected domain confirms runtime execution and catches CSP or consent-manager blocking that a page fetch cannot see.
- **Platform API check** where one exists (Webflow list custom code, Framer `getCustomCode()`, Wix script list): confirms the write, never proves the page renders.
- **Verified** is shown only after a page fetch **or** a heartbeat from the connected domain. Re-check on demand, automatically for 24 hours after publish, then on a schedule; a previously verified site that stops reporting flips to Needs attention (`install_lost`).

## 5. Platform capability matrix

Sources: Phase 0 section 5 (official documentation, 19 September 2026), plus **Squarespace re-fetched from the official developer site on 21 September 2026**. All other rows must be re-verified against current official documentation before their connector is built. "Not confirmed" means it must not be promised.

| Capability | Squarespace | WordPress | Shopify | Wix | Webflow | Framer | Universal HTML |
|---|---|---|---|---|---|---|---|
| **Delivery class** | **C** for the one-time loader install; **B** afterwards for popup, floating tab and slot swaps | **A** (plugin), after pilot | **A/B** (app), after pilot evidence | **B** (script can be registered by the app); inline widget is A/C | **B** (script registered by the app); inline is C | **B** via plugin run in the editor | **C** once, then **B** |
| **Official authorization** | OAuth for Commerce APIs only (Phase 0); API key exists for Commerce. **Neither is needed for the loader** | Application Passwords (WP 5.6+, HTTPS), or plugin pairing code | OAuth (authorization code / token exchange) | OAuth | OAuth (custom-code endpoints accept OAuth-app tokens only) | Editor plugin; server API key for some features | None |
| **Installable mechanism** | None for embeds found. Customer adds the loader in **Code Injection** (site-wide) or a **Code Block** (a location) | Squarespell plugin: block, shortcode, site-wide loader | Theme app extension: **app block** (inline), **app embed** (popup, floating tab) | Wix app: embedded script (site-wide) or site widget (draggable) | Data Client app registers a script (site or page) | Plugin using `setCustomCode` or an Embed component | Paste the loader in the site header or template |
| **Select the site** | Yes, via Websites API `GET /1.0/authorization/website` (returns site id, URL, title) **if** OAuth is used; otherwise the customer types the domain and ownership is proven by verification | Yes (pairing identifies the site) | Yes (shop domain from OAuth) | Yes (site instance from install) | Yes (list sites the token can access) | Yes (the open project) | Customer enters the domain |
| **Select a page** | **No official page API.** The public `sitemap.xml` can populate a path picker (read of public data, not an API promise) | Yes through the WP REST API page list | Theme templates only, not arbitrary pages | Not confirmed | Yes (pages via Data API) | Not confirmed | Public sitemap, if present |
| **Insert an inline block automatically** | **No** (no page, layout or block API - verified in docs today) | Not confirmed as an official placement path; REST content edits are technically possible but would alter customer content - opt-in only, with revision backup, decision pending | **No** - apps cannot add blocks automatically; a deep link opens the theme editor with the block pre-selected for the customer to save | Widget: no (cannot be pinned). Script: site-wide only | Scripts yes; inserting a Code Embed element: not confirmed | Custom code yes; layout placement: not confirmed | No (slot must be pasted once) |
| **Popup and floating tab automatic** | **Yes after the loader is installed** (manifest rule) | Yes (plugin) | Yes once the customer enables the app embed (off by default) | **Yes** (embedded script) | **Yes** after the customer publishes the site | **Yes** after the plugin runs and the site is published | Yes after the loader is installed |
| **Customer actions still required** | Paste the loader once (Code Injection); paste one slot per inline location once; save and publish. Needs a plan with custom code | Install and activate the plugin, pair, place the block for inline | Install, open the theme editor via deep link, enable the embed or confirm the block, save | Approve install; for a widget, place it in the editor; publish | Authorize, publish the site (API publish endpoint to be verified) | Run the plugin in the editor, publish | Paste the loader (and slots) once; publish the site |
| **Permissions and review** | No Squarespace review for a pasted loader. OAuth (if ever used) needs a registered, reviewed client. No embed marketplace found | Optional wordpress.org review (about 14 days); self-distribution allowed | App Store review for a public app; none for a custom app | App Market automated review (minutes); install-link apps need none | Marketplace review for public use; unpublished apps limited to the developer's Workspace | Marketplace rules not confirmed | None |
| **Uninstall and token revocation** | Customer removes the Code Injection line; Squarespell first empties the manifest. OAuth revoked in the Squarespace account UI; a server-side revoke call is not confirmed | Plugin `uninstall.php`; revoke the application password; deactivation keeps data | Uninstall webhook; blocks left in the theme stop working; script tags are deprecated (create/update ends 1 Oct 2026, execution 1 Mar 2027) - **do not use script tags** | Removal of embedded scripts on app removal: not confirmed - verify; empty the manifest regardless | Remove scripts with write scope, republish | Set custom code to null; cannot re-enable code the user disabled | Customer deletes the snippet; manifest emptied first |
| **Live verification** | Page fetch and heartbeat (no API for it) | Page fetch and heartbeat; plugin reports version | Storefront page fetch and heartbeat; not on checkout | Script list check plus page fetch | Custom-code list endpoint plus page fetch | `getCustomCode()` plus page fetch | Page fetch and heartbeat |
| **Honest limitations** | No silent insertion. Custom code needs a paid plan and is not covered by Squarespace support; code injection is unavailable on checkout pages; the editor preview does not run injected scripts | wordpress.org review delay; WordPress.com plan limits were not researched | App embeds are off by default; no checkout blocks; script-tag deprecation | Widgets cannot be pinned; embedded scripts are not re-applied on new app versions; manual snippets are deleted on a domain change; Vibe/headless sites limited | Changes go live only after publish; paid plan needed for custom code | Cannot re-enable a disabled snippet; marketplace rules unconfirmed | Content-security-policy and consent managers may block third-party scripts |

## 6. Platform notes

### 6.1 Squarespace (priority)
**Verified in docs today (21 September 2026):** the Commerce APIs are Analytics, Contacts, Discounts, Inventory, Orders, Products, Profiles (maintenance mode), Transactions and Webhook Subscriptions; the Websites endpoint returns basic details of the member and of the website that owns the token; Reseller APIs are listed as "coming soon"; the **Custom Code Specification** is a list of persistent HTML and CSS hooks that code the *customer adds* can rely on. **No documented API creates a page, block, section or code-injection entry.** The Phase 0 conclusion stands: Squarespace can support a connected and guided experience but does not officially allow Squarespell to insert a quiz into an ordinary page layout.

**The solution (Design) - "Connect once, then one-button publishing, with one guided step":**
1. **Connect website.** The customer enters the site URL. Optional: OAuth to read the site id and title. It is **not required**, and the wizard says so; skipping it removes any Squarespace review dependency.
2. **One-time loader install (Class C, guided, about 4 steps):** Settings, Advanced, Code Injection, Header, paste the single loader line, Save. Screens show the exact Squarespace menu names, the plan requirement, and a "Copy loader" button. The wizard states plainly: *Squarespace does not let us add this for you.*
3. **Automatic verification.** Squarespell fetches the site and waits for the first heartbeat; the screen updates itself to Verified.
4. **Popup and floating tab:** from now on **fully automatic** - choose the quiz, the trigger and the pages (path picker from the public sitemap), Publish. Update, pause, move and remove are one button each.
5. **Inline:** choose an existing slot or "create a new slot". A new slot needs **one** Code Block containing a one-line slot element, placed once by the customer (guided, verified). Afterwards, swapping, updating or removing the quiz in that slot is one button. The path-rule alternative (the loader inserts after a documented hook) is offered only after it is proven on real 7.0 and 7.1 sites.
6. **Remove.** Remove quiz: instant (manifest). Disconnect: manifest emptied, with optional instructions for removing the header line.

**Remaining manual steps, stated on screen:** the loader paste (once per site) and one Code Block per new inline location (once per location). **Not offered:** browser automation of the Squarespace editor, collecting Squarespace passwords, scripted manipulation of editor DOM, or any unsupported layout write. Squarespace 7.0 and 7.1 differ (Fluid Engine, AJAX navigation); the loader re-scans on navigation as the current embed already does.

### 6.2 Universal HTML and custom websites
Same loader and slot model as Squarespace, without the platform-specific screens. It is the guaranteed baseline and the first thing built; every other connector reuses its manifest, verification and audit code.

### 6.3 WordPress (Class A, after the pilot)
Plugin (block, shortcode, settings page, site-wide loader option). Pairing by application password over HTTPS or a one-time pairing code. Inline placement remains the customer placing the block unless the owner later approves the opt-in "insert into page" action (revision backup, explicit confirmation). Not advertised until it works and has completed the review path.

### 6.4 Shopify (Class A/B, after pilot evidence)
OAuth app with a theme app extension. Popup and floating tab: app embed, enabled through a theme-editor deep link (the customer saves). Inline: app block; the deep link pre-selects the block, the customer saves. Do not use script tags. Not advertised until approved.

### 6.5 Wix (Class B, later - see the MVP order)
The only researched platform where an approved app can register a site-wide script through an API, which makes the loader install **truly automatic**. Inline widget placement remains the customer's.

### 6.6 Webflow (Class B, later)
An OAuth Data Client registers the loader as site or page custom code and reads it back; the customer publishes the site.

### 6.7 Framer (Class B, later)
A plugin sets custom code from inside the editor; the customer publishes. A snippet the user disabled cannot be re-enabled by the plugin.

## 7. Required product screens

Each screen needs loading, empty, success, failure and recovery states; no endless loaders; keyboard and 320 px support; copy that follows the delivery class of the chosen platform (section 1) and Phase 2 section 6.6.

1. **Sites and Connections dashboard** - connected sites with platform, domain, state, last heartbeat and installed quizzes; actions Connect website, Re-check, Pause all, Disconnect. The empty state offers the universal method.
2. **Connect Website wizard** - stepper (Platform, Authorize, Site, Placement, Type, Preview, Publish, Done), visible remaining-step count, cancel at every step, saved progress.
3. **Platform selection** - Squarespace, WordPress, Shopify, Wix, Webflow, Framer, Other/HTML; each with an availability label (Available, Planned, Later) and its delivery class in plain words.
4. **Authorization and permissions** - the exact scopes and what each is for, what Squarespell will **not** do, how to revoke; "skip authorization" where the platform allows it (Squarespace).
5. **Website selection** - sites returned by the platform, or a domain field with ownership proven by verification; only the customer's own sites.
6. **Page and placement selection** - path picker (public sitemap or platform API), slot list, "create a new slot" with its one-time instructions; states clearly when the platform cannot choose the page for the customer.
7. **Inline, popup or floating-tab choice** - three cards describing what visitors see, with trigger, button text and page rules.
8. **Live preview** - the real quiz in the chosen mode on a mock of the chosen page, labelled "test - responses are not recorded", mobile and desktop.
9. **Publish progress** - step list (Prepare, Publish manifest, Platform write if any, Verify) with per-step status, elapsed time, cancel, and a timeout with recovery.
10. **Installation success** - the live URL, a Verified badge with the time checked, and links: View live page, Copy hosted link, Pause, Move.
11. **Verification failure and recovery** - reason code in plain language, targeted fix steps, Re-check now, "use the manual embed instead", and confirmation that the previous live version is unchanged.
12. **Update, pause, move and uninstall controls** - per installation and per site; each shows what will change on the live site and requires confirmation for removal; an audit-history tab with the events from section 4.1.

## 8. Recommended MVP delivery order

The owner-approved order in Phase 2 section 6.0 is kept. This document adds the shared engine and one recommendation for the owner to decide.

| Step | Deliverable | Class | Approval by others needed? |
|---|---|---|---|
| **M0** | Prerequisite fixes (section 2.4), key-versioned encryption, connect data model, audit events | - | No |
| **M1** | **Site Loader, manifest, heartbeat, verification, Sites and Connections screens - Universal HTML** | C then B | No |
| **M2** | **Guided Squarespace connection** on the same engine: one-time loader install wizard, sitemap path picker, popup and floating-tab publishing, slot workflow | C then B | No (OAuth not required) |
| **M3** | WordPress plugin | A | Optional wordpress.org review, about 14 days |
| **M4** | Shopify app and theme extension | A/B | App Store review (public app) |
| **M5-M7** | Wix, Webflow, Framer | B | Wix automated review (minutes); Webflow Marketplace; Framer unconfirmed |

**Recommendation for owner decision:** consider moving **Wix ahead of Shopify**. Wix is the one platform found where the app can install the site-wide loader with no customer paste, its review is automated, and the M1 engine is reused. Shopify remains the larger commercial audience but always needs the customer to save in the theme editor and has a longer review. This is a recommendation only; the approved order stands until the owner changes it.

## 9. Major dependencies and risks
- **Squarespace:** the customer needs a plan that allows custom code; Squarespace does not support custom code; there is no page API; 7.0 and 7.1 differ; the loader must survive AJAX navigation.
- **Third-party script blocking:** content-security-policy, consent managers and ad blockers can stop the loader; verification distinguishes "not found" from "blocked".
- **Marketplace approvals:** wordpress.org (about 14 days), Shopify App Store, Webflow Marketplace, Wix App Market (automated); each needs branding, a privacy policy, a support contact and a data-handling statement. Framer rules are unconfirmed.
- **Security:** SSRF-safe page fetching; a public-only manifest; token encryption with rotation; tenant-isolation tests for every new table; rate limits on heartbeat and manifest endpoints; no visitor personal data in the heartbeat.
- **Plans and pricing:** how many connected sites and installations each plan allows is an open owner decision (Phase 2 section 7.4).
- **Privacy and cookies:** the loader sets no cookies; confirm the framed quiz behaves the same under consent managers before advertising.
- **Domain hygiene:** all connector URLs must use `squarespellquiz.com` (section 2.4).

## 10. What cannot be promised
- Automatic insertion of a quiz into an ordinary Squarespace page.
- Automatic inline placement on Shopify, Wix, Webflow or Framer (not confirmed by official documentation).
- "One click" wording on any platform path that has not been proven end to end.
- Wix, Webflow, Framer, WordPress or Shopify availability before each connector exists and has passed its review.
- Squarespace support for custom code.
- That a script will run where a consent manager or content-security-policy blocks it.

## 11. Changes to existing behaviour
None. Public links, iframe embeds and the `/embed.js` script keep working unchanged and remain the fallback and rollback path. The connector adds a second, easier way to publish.

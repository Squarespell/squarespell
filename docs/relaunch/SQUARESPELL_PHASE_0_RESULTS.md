# Squarespell Quiz - Phase 0 Results (Revision 3.0)

Prepared 19 September 2026 against Relaunch Master Plan Revision 3.0. Scope: P0.3-P0.8. P0.1/P0.2 (PR #61 merged as `091f1cd9d7e3f7f1483fbd499f58f6085f664575`, deployed, smoke-tested) were not re-checked.

**Evidence labels:** Verified (observed directly this pass) - Vendor/official documentation (cited) - Recommendation - Hypothesis - Unavailable (could not be accessed; never means zero).

This file is documentation only. Nothing on `squarespell.com`, in DNS, in production code, in any database, in Stripe or in any customer access was changed by this work. The only reads of production systems were public web pages, the public sitemaps, Google Search Console (read-only), Hostinger's own read-only pages, and aggregate-only `SELECT count` queries against the SaaS database, plus read-only views of the Stripe and Clerk dashboards after Hussnain signed in manually (no credentials were entered by Claude). Nothing was created, edited, archived or deleted in any account.

**Update 2 (19 Sep 2026):** adds the Stripe and Clerk findings, brand/social conclusions, the service-separation matrix and the Phase 0 exit decision. The WordPress/WooCommerce administration of `squarespell.com` was deliberately not accessed.

**Update 3 (19 Sep 2026) - correction:** Squarespell (Squarespell Limited) is the parent company and owns both products; Squarespell Quiz is a product owned and operated by Squarespell. The earlier recommendation of a separate Stripe account, and the decisions about a separate legal entity or Stripe administrator, were wrong and are withdrawn. Required separation is between product applications, data and configuration, not between companies.

---

## 1. Marketplace and SaaS Separation Architecture

**Company and product structure.** Squarespell (Squarespell Limited) is the parent company and brand and owns both products:
- **`squarespell.com`** - Squarespell's existing marketplace (WordPress/WooCommerce).
- **Squarespell Quiz** - a product owned and operated by Squarespell, at **`squarespellquiz.com`**, the dedicated website and application domain of the new subscription SaaS (purchased manually by Hussnain, for one year).

Squarespell Limited owns both products and both are operated from Squarespell's existing business accounts. No separate legal entity, company identity or owner account is needed.

**Binding requirement.** The required separation is between **product applications, data and configuration** - not between companies. A shared top-level company or provider account is not in itself a risk. The real risks are: mixing application data; reusing production credentials unnecessarily; unclear webhook ownership; inconsistent billing products; missing product identifiers; and changes to one product breaking the other.

### Product separation
- **Marketplace - `squarespell.com`:** WordPress/WooCommerce on the existing Hostinger shared-hosting plan, with its own database, customers, orders, products, plugins, downloads, media, lifetime licences, analytics, Search Console property, sitemap, content, URLs, email, DNS and backups. It keeps operating unchanged and independently.
- **Squarespell Quiz - `squarespellquiz.com`:** operates under the SQUARESPELL brand. It gets its own website, application, VPS, PostgreSQL database and credentials, production authentication application, Quiz billing catalog and webhooks, email sender configuration, analytics property, Search Console and Bing properties, Tag Manager container where needed, sitemap, robots configuration, structured data, canonicals, file storage, environment variables, logs, monitoring, backups, privacy/legal pages and support process.

### Data and application separation (binding)
1. The WordPress/WooCommerce database remains dedicated to `squarespell.com`.
2. Marketplace customers, orders, licences, downloads and media remain in the marketplace database.
3. Squarespell Quiz uses a dedicated PostgreSQL production database.
4. Existing quiz SaaS data may later move from its Supabase project into the dedicated Hostinger PostgreSQL database.
5. SaaS data is never imported into the WordPress database.
6. Marketplace data is never imported into the SaaS database without a later explicit owner decision, privacy review and documented migration.
7. Each product has its own database credentials and access controls.
8. Each product has its own backups and restore procedures.
9. Each product stays operational if the other is unavailable.
10. A security incident in one product must not automatically expose the other.
11. SaaS deployments must not require WordPress changes.
12. Any future integration uses a documented API, referral link or explicitly approved import.
13. No cross-database queries.
14. Production credentials are not reused between products; each product uses its own keys and secrets.
15. No shared customer session or authentication database between the products.
16. Marketplace orders never create Squarespell Quiz subscription entitlements in the application database.

### Account and service model
The same Squarespell owner account, workspace or organization is acceptable at the top level (Hostinger, Stripe, Clerk workspace, GitHub organization, email provider). Inside those accounts, Squarespell Quiz gets dedicated applications, projects, resources and configuration as set out in the matrix in section 10. Nothing needs a separate company, entity or account.

### SEO separation
1. `squarespell.com` keeps its SEO property, sitemap, content, URLs and authority; its Search Console history and backlink authority must not be disturbed.
2. `squarespellquiz.com` gets its own SEO strategy and technical setup: a dedicated Google Search Console domain property (after DNS verification is separately authorized), a Bing Webmaster Tools property, a GA4 property and data stream, a Tag Manager container if required, and its own sitemap, robots.txt, canonicals and structured data.
3. Nothing is copied, duplicated, canonicalised, redirected or removed during Phase 0. A later content-migration phase decides each URL individually: keep, update, copy with substantial adaptation, migrate, merge or retire. Any future redirect needs explicit approval and testing. Existing articles may link to the new product only after the new site is ready and the link change is separately authorized.
4. The new domain builds its own platform-neutral authority around quizzes, assessments, product finders, calculators, recommendations and lead qualification.

### Lifetime-plugin protection
The one-time quiz plugin sold through `squarespell.com` is a marketplace product, not Squarespell Quiz. Its listing, URL, price, files, licence, download access, update and support promises and wording must not be deleted, unpublished, edited, redirected, converted to a subscription or imported into the SaaS. Its buyers are not SaaS customers, are not contacted, and their private WooCommerce data is not used. Only its public product page is used to document the public promise (section 8). Existing marketplace payment processing and the WooCommerce Stripe webhook must not be changed, disabled or replaced.

### Future migration boundaries
- Content: quiz-related pages with traffic or backlinks must not simply disappear from `squarespell.com` (rule in section 4).
- Data: SaaS data may move from Supabase to the new dedicated PostgreSQL; marketplace data never moves into the SaaS database without a separate decision.
- Identity: a dedicated production Clerk application for Squarespell Quiz will be needed (section 6.3); the same owner workspace is acceptable.
- Billing: Squarespell Quiz keeps a separated catalog inside the existing Squarespell Limited Stripe account (section 6.2); marketplace customers and payments stay as they are.
- Any future marketplace-SaaS link is a public referral link, a documented API or an approved import.

### Explicitly prohibited (Phase 0 and until separately authorized)
Accessing WordPress/WooCommerce administration or private data; changing `squarespell.com`, its DNS or nameservers; changing or redirecting the lifetime plugin or any URL; changing canonicals; copying marketplace content, customers or orders; connecting `squarespellquiz.com` to hosting or changing its DNS; purchasing a VPS, domain, trademark, hosting, email service or subscription; creating analytics or Search Console properties, Stripe accounts/products/prices/webhooks, Clerk applications, email accounts or social accounts; changing, disabling or replacing the WooCommerce Stripe webhook; changing the disabled Squarespell Quiz Render webhook; migrating content; deploying code; starting the redesign; starting Phase 1; merging PR #62.

---

## 2. Domain and Hosting (P0.3, P0.4 - already completed, not repeated)

- **`squarespellquiz.com` is selected as the SaaS product domain and was purchased manually by Hussnain.** Hussnain states it was purchased for one year. Note for verification: the checkout Claude prepared defaulted to a 3-year term (Rs. 9,464.00 including Rs. 167.00 tax; renewal Rs. 4,399.00/year on 2029-09-20). Claude confirmed only that the domain appears in the Hostinger domain portfolio; the actual term, expiry and auto-renewal were **not** inspected and are unverified.
- **Hostinger plan (verified, signed-in account):** Unlimited Web Hosting (shared hosting) for `squarespell.com`; renewal Rs. 27,588.00, auto-renews 2027-08-18 (site page shows 2027-08-31 expiry - unreconciled). Also Reach 100 email marketing (Rs. 4,788.00/yr) and the `.COM` domain subscription for `squarespell.com` (Rs. 4,399.00/yr). Exactly 3 subscriptions; **no VPS exists**.
- **Conclusion (verified + Hostinger documentation):** shared hosting cannot host the SaaS target architecture (PostgreSQL, Docker, worker, root/SSH are VPS features). It must stay untouched for the marketplace.
- **Recommendation for Phase 3 only, not purchased:** KVM 2 (2 vCPU / 8 GB / 100 GB NVMe). Observed 24-month checkout Rs. 64,776.00 (Rs. 2,699.00/mo), renewal Rs. 4,099.00/mo; 12-month Rs. 3,199.00/mo; 1-month Rs. 4,399.00. Daily backups are a paid add-on (price not captured) and must be complemented by independent offsite backups.
- The SaaS VPS must be a **separate** service from the marketplace shared hosting (section 1, rules 3, 4, 10, 12). No DNS, nameserver, auto-renewal, privacy, lock or hosting connection was changed for either domain.

- No trademark, domain, hosting plan, VPS, email service or subscription was purchased in this pass; the planned KVM 2 VPS remains unpurchased.

---

## 3. Brand, trademark and social-handle conclusions

Preliminary screening, not legal advice.

- **Owner-confirmed (Hussnain; not independently verified by Claude):** SQUARESPELL is registered by Hussnain as a UK trademark, and `SQUARESPELL QUIZ` will be used as a product name under the SQUARESPELL brand. No further UK trademark search is required for Phase 0, so none was run (the UK IPO search sits behind a Cloudflare check).
- **USPTO:** wordmark search `squarespell` returned **no results**.
- **WIPO Global Brand Database:** brand-name search "contains squarespell" returned **no results**.
- **Conclusion:** USPTO and WIPO searches found **no exact SQUARESPELL conflict**.
- Word searches for `square spell` (4,921 results) and `squarespell quiz` (323 results) matched only the common words SPELL, SQUARE and QUIZ and are not meaningful conflict evidence; they were not reviewed one by one.
- **SPELLQUIZ:** the USPTO shows two live, registered marks (class 41, online English-language training services) owned by SpellQuiz Inc. (Canada). **SPELLQUIZ is owned by another company and must not be used as the product name.**
- **Search-result screening (earlier pass):** no third-party "Squarespell Quiz" business found; a separate spelling-test product named SpellQuiz exists. Possible confusion with the SQUARESPACE mark was flagged earlier; manual legal review is recommended for that point, especially outside the UK.
- The name is **not legally cleared** by this screening.

### Social handles - `squarespellquiz` (public, logged-out or read-only page checks)

| Platform | Result | Evidence |
|---|---|---|
| X | Probably available (no profile found) | "Unable to show this account" page (also shown for suspended/private accounts) |
| Instagram | Probably available (no profile found) | "Profile isn't available" |
| LinkedIn (company URL) | Probably available (no profile found) | "Page not found"; company-name uniqueness not checked |
| YouTube | Probably available (no channel found) | 404 |
| TikTok | Probably available (no account found) | "Couldn't find this account" |
| Facebook | **Inconclusive** | Ambiguous "content isn't available" message |

Public checks found no active `squarespellquiz` profile on X, Instagram, LinkedIn, YouTube or TikTok, but this does not guarantee availability (reserved names, platform rules and private/suspended accounts are not visible). **No social account has been created or reserved.**

---

## 4. Content and authority inventory (P0.5)

Full inventory: `docs/relaunch/SQUARESPELL_QUIZ_CONTENT_INVENTORY.csv` (29 rows, 22 columns, zero blank cells; inaccessible data is labelled `Unavailable`).

### Sources checked
| # | Source | Status |
|---|---|---|
| 1 | XML sitemap index + all 10 child sitemaps (post, page, product 1-4, category, vendor, test, solution) | Checked. **710 unique URLs.** |
| 2 | WordPress posts (48) | Fetched and scanned for all 15 search terms |
| 3 | WordPress pages (34) | Fetched and scanned |
| 4 | WordPress products (584 marketplace products in 4 product sitemaps) | Sitemap-listed by URL; the 10 quiz, calculator, form and extension listings matching the search terms were fetched and scanned; other products were matched by URL keyword only |
| 5 | Media and downloadable files | **Unavailable** - not enumerated (no authenticated media library access; the WordPress REST API was not used) |
| 6 | Draft/unpublished quiz content | **Unavailable - intentionally excluded to preserve marketplace/SaaS separation** (requires WordPress administration, which is out of bounds) |
| 7 | Google Search Console pages and queries (90 days, 17 Jun-16 Sep 2026) | **Checked**: site total 847 clicks / 44.6K impressions (reconfirmed); URL-contains-"quiz" filter = 16 URLs, 41 clicks, 2.65K impressions |
| 8 | Analytics landing-page reports | **Unavailable** - not accessed |
| 9 | Internal links from `/quiz`, articles, products | Partly checked: inbound links to the legacy product and articles mapped from 106 fetched pages; **no page links to `/quiz/`**; outbound crawl not run |
| 10 | Backlinks/referrers | **Unavailable** - no backlink tool; Search Console Links report not opened |
| 11 | `site:squarespell.com` search | Checked once (returns `/quiz`, the legacy plugin at $45, unrelated plugins) |
| 12 | Menus, categories, tags, related-post sections | Partly checked: category/tag archives inspected; menu structure not audited |

**Final count:** 710 URLs in sitemaps scanned by URL keyword; 106 pages, posts and listings fetched and body-scanned (all HTTP 200, self-canonical, indexable) plus `/quiz/` and `/tag/quiz/` fetched separately; and **29 inventory rows covering 36 distinct URL forms** (includes redirect, duplicate, http and double-slash variants that Google reports). Sixteen of them are quiz URLs Google reports.

### Confirmed findings (preserved and extended)
1. `/quiz` returns 301 to `/quiz/` (200) and is **missing from the XML sitemap**. New: the page carries `noindex, nofollow`, has no canonical tag and **no internal page links to it**. (A search index still shows it; the live tag may be recent.)
2. Legacy product slug contains `-7-1-email-capture` (confirmed).
3. "Add a Quiz to Squarespace in 2 Minutes" - the title and body state "approximately 2 minutes"; unsupported (below).
4. The 30-second claim conflicts with application timeouts (below).
5. **"16 proven templates" is verified true**: `QUIZ_TEMPLATE_CATALOG` at `frontend/lib/quiz/templates.ts:1690-1919` (repo `main@091f1cd`) has exactly 16 unique, non-hidden templates (13 image-and-text, 3 video-led), matching the article's 13/3 split. A stale code comment says "13 templates" (the category count), and a separate 20-entry backend seed set exists but is not the public catalog.
6. Search Console: 847 clicks and 44.6K impressions site-wide - confirmed again.

### Claims that lack evidence (recorded only, not fixed)
| Claim (location) | Reality |
|---|---|
| "Ready in 30 seconds" (funnel article), "60 seconds" (`/quiz/`), "approximately 2 minutes" (install guide), "~2 minutes" (comparison table) | Frontend request timeouts are 75 s (marketing funnel, `TryFlowInner.tsx:20`) and 150 s (dashboard generator); the Anthropic client sets no explicit timeout; in-app copy variously says 10-20 s, 30 s, 60 s, 2 min. No measured timing data exists. Cold start is documented in-app as up to 30-60 s. |
| "One-click embed", "live in under 10 minutes", "median 11 minutes to first published quiz" (`/quiz/`) | The product implements a manual Code Block paste; no Squarespace OAuth/API insertion exists (migration 004 removed it). The "Connect Squarespace" button only scrapes brand styling. The 11-minute median has no evidence (9 users). |
| "40% average opt-in rate, 73% completion, 4.1x vs forms" (funnel article) | App database holds **0 leads**; no first-party basis. |
| "Tested on all current Squarespace 7.1 and 7.0 templates" (`/quiz/`) | No evidence provided. |
| "Code Block requires a Business plan or higher" (`/quiz/`) | Official Squarespace docs list Core/Plus/Advanced (and legacy "Business") for JavaScript code blocks; wording needs re-verification before reuse. |
| Zapier "3,000+ apps", REST API and webhooks (`/quiz/`, pricing) | Code exists but `zapier.ts` and `apiKeys.ts` appear not to be mounted by the app router - confirm before advertising. |
| Free trial length | Pricing pages say 14 days; `frontend/app/sign-up/page.tsx:172` says "7 days free". |
| Legacy plugin price | Product selector shows Single $45 / Multi-Use $95; its FAQ says "$49". |
| SaaS prices published on marketplace blog (Core $9, Pro $16, Business $29/mo annual) | Match the app's annual prices; monthly prices ($12/$19/$35) not shown; live Stripe prices not verified. |

### Five highest-value pages (by search evidence and role)
1. `/quiz/` - SaaS landing page (13 clicks / 311 impressions; currently noindex).
2. `/squarespace-blog/the-complete-guide-to-adding-an-interactive-quiz-plugin-...-with-lifetime-access/` (10 / 989) - belongs to the protected legacy product.
3. `/squarespace-blog/how-to-add-a-quiz-to-squarespace-website-2026-guide/` (5 / 345) - highest install intent; carries the "2 Minutes" claim.
4. `/premium-plugins/p/interactive-quiz-plugin-squarespace-7-1-email-capture/` - the legacy product page (about 6 clicks / 321 impressions across URL forms).
5. `/squarespace-blog/squarespace-quiz-builder-vs-typeform-outgrow/` (1 / 337) - the only comparison asset.

### Five most urgent content / SEO problems
1. `/quiz/` is `noindex, nofollow`, absent from the sitemap and has no internal links - the SaaS landing page is effectively invisible to search.
2. Unsupported installation and speed claims ("2 Minutes", "one-click", "30/60 seconds", "median 11 minutes") contradict the manual Code Block flow and the 75-150 s timeouts.
3. Unsupported performance statistics (40% / 73% / 4.1x) presented as Squarespell Quiz results with zero leads on record.
4. Legacy plugin pricing/licence inconsistency ($45 selector vs $49 FAQ; "Unlimited Websites" multi-use vs "one licence per site" wording).
5. Inconsistent plan/trial/feature statements (14-day vs 7-day trial; "Business plan" Code Block requirement; advertised Zapier/REST API possibly not live), plus one 404 still indexed (`/tools/quiz-builder-for-squarespace`) and malformed double-slash/http URL variants indexed.

### Future rule for quiz content and SEO (documentation only)
- Quiz-related content with existing traffic or backlinks must not simply disappear from `squarespell.com`.
- Before any article is moved, decide for each URL whether to keep, update, migrate, merge or retire it.
- A moved page requires a content-equivalent destination on `squarespellquiz.com`, a tested 301 redirect, updated internal links, an updated sitemap and canonical tags, and post-migration Search Console monitoring.
- Marketplace and lifetime-plugin pages stay on `squarespell.com`.
- **Nothing was migrated, re-linked, redirected or re-canonicalised in Phase 0.** "Copy later / migrate later" entries in the inventory CSV are recommendations only; the marketplace content list and the SaaS destination proposals remain separate columns and must not trigger any action without a separate instruction.

---

## 5. Connector capability matrix (P0.6) - official documentation, September 2026

Delivery order (Revision 3): **1 Universal HTML, 2 WordPress, 3 Shopify, 4 Squarespace, 5 Wix, 6 Webflow, 7 Framer.** Nothing was built or submitted. "Not confirmed" means the official docs fetched did not state it.

**Preserved Squarespace conclusion:** *Squarespace can support a connected and guided installation experience, but its documented public APIs do not establish permission to insert a quiz automatically into an ordinary page layout. The customer may still need to place a supported Code Block or Custom Code snippet.* Official docs reviewed found no contradicting API.

| Platform | Authorization | Official install mechanism | Review requirement | Automate | Customer must | Placement modes | Auto-insertion officially supported? | Verification | Disconnect / uninstall | Steps |
|---|---|---|---|---|---|---|---|---|---|---|
| **1 Universal HTML** | None | Paste snippet + container (no platform docs; engineering design) | None | Generate snippet and quiz | Paste and publish | Inline, popup, floating, direct link (by snippet design) | N/A | Fetch public page for the snippet; runtime ping (inference) | Delete snippet | 2-4 |
| **2 WordPress** | Application Passwords (WP 5.6+), HTTPS | Plugin providing block/shortcode | Required only for wordpress.org listing (~14 days); self-distribution allowed | Pairing, quiz picker; REST content actions if permitted | Install/activate plugin, place block/shortcode | Inline (block/shortcode); popup/floating/site-wide via plugin code | Not confirmed (editors place blocks) | Front-end fetch (inference) | `uninstall.php` on delete; deactivation keeps data | 4-6 |
| **3 Shopify** | OAuth (token exchange / auth code) | Theme app extension: app block (inline), app embed block (popup/floating) | App Store approval for public apps; none for custom | OAuth, deep link, block code, uninstall webhook | Add block or enable embed in theme editor, save | App block, app embed; not checkout | **No** - apps cannot add blocks automatically | Not confirmed in fetched docs | Blocks remain but stop working; script tags removed | 4-7 |
| **4 Squarespace** | OAuth for Commerce/Reseller APIs only; commerce scopes | Manual Code Block or Code Injection | OAuth client reviewed; no embed marketplace found | Site ID, snippet generation, guidance | Paste in Code Block or Code Injection, save | Code Block (page inline); Code Injection (site-wide header/footer/lock/order confirmation) | **Not established** (no page/layout API) | Front-end fetch (no documented API) | Manual removal; OAuth revoked in UI | 5-8 |
| **5 Wix** | OAuth | Wix app: embedded script (auto, site-wide) or site widget (draggable); manual HTML embed / Custom Code | App Market: automated AI review (minutes); install-link apps no review | Embedded script via API; dynamic parameters | Widget: drag/place; manual route: paste | Site-wide script, popups, widget, embed | Script: **yes**, site-wide; widget: no | Check script in page source | Not confirmed for embedded scripts | 3-7 |
| **6 Webflow** | OAuth (custom-code endpoints accept OAuth-app tokens only) | Data Client app registers script site/page-wide; manual Code Embed | Marketplace review for public use | Register inline (10,000 chars) or hosted scripts, apply, read back | Publish the site | Site or page; header/footer | Scripts **yes**; inserting a Code Embed element into layout: not confirmed | List-custom-code endpoint; front-end fetch | Remove scripts with write scope, republish | 4-6 |
| **7 Framer** | Plugin (in-editor); server API key | Plugin using `setCustomCode` or Embed component | Marketplace rules not confirmed | Custom code injection; component insertion via plugin | Run plugin in editor, publish | Site-wide/per-page code; embed component | Custom code **yes** via plugin run by user; layout placement not confirmed | `getCustomCode()`; front-end fetch | Set code to null; cannot re-enable user-disabled code | 4-6 |

### Major platform limitations
- **Squarespace:** JavaScript Code Blocks and Code Injection need paid plans (Core/Plus/Advanced; "Business" is a legacy name - re-verify); custom code is unsupported by Squarespace support and may block secure editing; code injection is unavailable on checkout pages. This is the one platform where a manual paste is unavoidable.
- **Shopify:** apps cannot place blocks automatically; app embeds are off by default; script tags are deprecated (create/update stops 1 Oct 2026, execution stops 1 Mar 2027); no checkout-step blocks.
- **Wix:** widgets cannot be pinned to a location; embedded scripts are not re-applied on new app versions; manual snippets are deleted on a domain change; Vibe/headless sites support only apps with dashboard extensions.
- **Webflow:** changes go live only after publish; unpublished apps limited to the developer's Workspace; paid plan needed for custom code.
- **Framer:** cannot re-enable a snippet the user disabled; Marketplace plugin rules and plan requirements unconfirmed.
- **WordPress:** wordpress.org listing review adds about 14 days; WordPress.com plan restrictions were not researched.
- **Universal:** CSP and consent managers may block third-party scripts (inference, not documented).

---

## 6. SaaS accounts, subscriptions and data (P0.7, SaaS side only)

Kept separate from the marketplace (section 7). Sources: read-only aggregate queries on the SaaS Supabase project (`omwtmvzdqmxewdswapgq`), and read-only views of the Stripe and Clerk dashboards after Hussnain signed in manually. No names, emails, payment details, keys, secrets or IDs are recorded.

### 6.1 Application database (Supabase) - verified
9 users (all with a Clerk id; 8 free, 1 agency plan that looks manually assigned because it has no Stripe link); 0 Stripe customer ids; 0 Stripe subscription ids; 0 plan expiries; 31 quizzes (9 live, 6 draft, 16 archived) owned by 6 users; 0 leads; 0 quiz payments; 1 preview draft; 2 platform email-log rows.

### 6.2 Stripe (read-only; live mode)
| # | Question | Finding |
|---|---|---|
| 1 | Workspace and mode | **Squarespell Limited** (GBP). **Live mode** (no test or sandbox indicator; the webhooks page offers a switch to a sandbox). |
| 2 | Marketplace, SaaS or both | **Both** - which is expected: one Squarespell Limited account serves both products. Marketplace evidence: an active WooCommerce Stripe-gateway webhook and payment descriptions such as "Squarespell - Order N". SaaS evidence: a "SQUARESPELL QUIZ" webhook and six plan products. |
| 3 | Aggregate customers | **278** customers in the account. No customer could be identified as a Squarespell Quiz customer; the sampled records follow marketplace/guest-checkout patterns. Attribution beyond that would need customer-level inspection, which was not done to avoid personal data. |
| 4 | Subscriptions | **0 in every status** (active 0, trialling 0, cancelled 0, past due 0); the subscriptions list shows the empty "Create your first subscription" state with all statuses selected. |
| 5 | Quiz-related products and prices | Six active recurring products created 6 April 2026: **Starter** $19, **Pro** $39, **Agency** $79 (USD, monthly) and **Starter Yearly** $180, **Pro Yearly** $372, **Agency Yearly** $756. The dashboard labels every one "per month", so the yearly interval labelling needs checking. Names are generic. |
| 6 | Lifetime or one-time quiz products | **None** in the Stripe product catalog. The one-time marketplace plugin is sold through WooCommerce, whose Stripe charges appear as order payments rather than catalog products (inference). |
| 7 | Webhook endpoints | (a) `forum.squarespell.com/?wc-api=wc_stripe` - **Active** - the WooCommerce gateway (marketplace). (b) "SQUARESPELL QUIZ" - `squarespell-api.onrender.com/api/stripe/webhook` - **Disabled**. |
| 8 | Live SaaS products, prices, webhooks | Live products and prices exist (the six above); the Squarespell Quiz webhook exists but is **disabled**, so billing events would not reach the app. |
| 9 | Reconciliation with the app database | **Agrees at zero:** the database has 0 Stripe customer ids and 0 subscription ids, and Stripe has 0 subscriptions. Caveat: the 278 Stripe customers are not linked in the app, and 0 quiz payments exist in the app database. |
| 10 | Shared configuration | One Squarespell Limited account serves both products - expected and acceptable. What is not yet clear: Squarespell Quiz and marketplace objects cannot be told apart by product naming or metadata; webhook ownership is only implied by endpoint names; and the SaaS plan names differ from the app. |

**Existing inconsistency for Phase 2 (verified):** Stripe contains Starter, Pro and Agency products ($19/$39/$79 monthly; $180/$372/$756 yearly), while the application refers to Core, Pro and Business ($12/$19/$35 monthly; $9/$16/$29 billed annually). The public `/quiz` page and blog articles quote the Core/Pro/Business prices. **Pricing and plan names must be approved in Phase 2 before the Stripe catalog is changed.** The disabled Squarespell Quiz Render webhook **must remain unchanged** until the new billing architecture has been tested.

**Corrected target Stripe architecture (recommendation):**
- Keep the existing **Squarespell Limited Stripe account**. Do not create another Stripe account.
- Keep the WooCommerce marketplace payment setup and its active webhook working, unchanged; preserve existing marketplace customers and payments.
- Maintain a clearly separated **Squarespell Quiz product catalog inside the same account**, with dedicated products, prices and webhook endpoints, and internal billing mappings in the application.
- Use clear product names, metadata and reporting identifiers (for example a product identifier on every Quiz product, price, customer and subscription) so marketplace and SaaS transactions can be told apart in reports.
- Do not mix marketplace orders with Squarespell Quiz subscription entitlements inside the application database: entitlements derive only from Quiz subscription objects.
- Nothing is created or edited in Stripe as part of this correction; the catalog change follows Phase 2 approval of plan names and prices.

### 6.3 Clerk (read-only)
- One Clerk application named **"Squarespell"** in a **personal Hobby workspace**.
- **Development instance only; no production environment exists.** The only domain is the development domain `flying-midge-60.clerk.accounts.dev`.
- Because there is no production instance, the live app must be authenticating against the development instance (inference; environment variables were not viewed). Clerk itself notes that development instances are for internal and test users.
- Sign-in methods: **email (code and link), Google and Apple enabled; Microsoft disabled.** Password, passkey and phone settings were not confirmed.
- **12 Clerk users versus 9 application-database users.** Join dates suggest at least three Clerk users have no database row (possible unmatched sign-ins); every database user holds a Clerk id, and no database user appears missing from Clerk, but IDs were not compared. Active-user count was not shown.
- The application looks dedicated to the quiz SaaS (the marketplace does not use it as far as could be seen).
- **Conclusion:** a new dedicated production Clerk application for `squarespellquiz.com` will eventually be required (custom domain with DNS records, its own Google and Apple credentials, production keys, allowed origins and webhook, and a plan for moving or re-onboarding the 9-12 development users). **It was not created in Phase 0.**
- The same Squarespell owner login or Clerk workspace is acceptable; what matters is that Squarespell Quiz gets its own dedicated production application.

### 6.4 Trials, mismatches and gaps
Trials are time-based in code (14 days) with no trial rows; the 1 agency plan is an unexplained manual assignment; the three possible unmatched Clerk users need investigation in Phase 1; any published conversion statistic has no first-party basis (0 leads).

---

## 7. Marketplace customer and product summary (P0.7, marketplace side only)

Kept separate from section 6. To preserve marketplace/SaaS separation, WordPress and WooCommerce administration and private data were **not accessed**, and no WordPress or WooCommerce login was requested.

| Item | Result |
|---|---|
| WooCommerce customers | **Unavailable - intentionally excluded to preserve marketplace/SaaS separation.** |
| Orders for the one-time quiz plugin | **Unavailable - intentionally excluded to preserve marketplace/SaaS separation.** |
| Active downloads | **Unavailable - intentionally excluded to preserve marketplace/SaaS separation.** |
| Licence records | **Unavailable - intentionally excluded to preserve marketplace/SaaS separation.** |
| Refunds | **Unavailable - intentionally excluded to preserve marketplace/SaaS separation.** |
| Marketplace accounts | **Unavailable - intentionally excluded to preserve marketplace/SaaS separation.** |
| Product-support commitments | Documented from the public product page only (section 8). |

The shared Stripe account shows combined totals (278 customers, 299 payments) that cannot be attributed to a product without customer-level inspection; those totals are noted as a separation risk, not as a marketplace inventory.

---

## 8. Legacy lifetime quiz plugin - entitlement evidence (protected, documentation only)

| Field | Evidence (public product page, verified 19 Sep 2026) |
|---|---|
| Exact product name | Interactive Quiz Plugin for Squarespace 7.1 |
| Existing product URL | `https://squarespell.com/premium-plugins/p/interactive-quiz-plugin-squarespace-7-1-email-capture/` (add-to-cart product id 389 in page links) |
| Original / listed price | **Inconsistent:** licence selector shows **Single License $45** (one website) and **Multi-Use License $95** (labelled "Unlimited Websites"); the FAQ text says **"One-time purchase $49 for a single site licence."** Search results show $45. Original launch price: Unavailable. |
| Exact entitlement wording | "That includes lifetime updates and ongoing support. No monthly fees, no hidden charges." and "Each licence covers one Squarespace site... you'll need a licence per site." |
| Download / delivery | "Delivery: Instant download." Fulfilment mechanism (file host, licence keys) - Unavailable. |
| Update promise | "Lifetime updates"; page shows "Creator last updated Aug 2026". |
| Support promise | "Ongoing support"; free installation assistance ("we'll walk you through it step by step or do it for you"); priority email support "within 48 hours". |
| Known purchasers | **Unavailable - intentionally excluded to preserve marketplace/SaaS separation.** |
| Does customer access still work? | **Unverified.** The product page loads (200) and offers add-to-cart; download and licence delivery were not tested because that would require a purchase or admin access. |
| Technically independent of the SaaS? | **Yes (verified by design):** it is a WooCommerce product, a paste-in-Code-Injection plugin, sold from `squarespell.com`; the SaaS is a separate Next.js/Express/Supabase system with no shared code path. |
| Other quiz-type listings | Two Common Ninja quiz products and calculator/form listings are third-party vendor products with affiliate links and are outside this entitlement. |

**Recorded policy (per Hussnain):**
- Preserve the original lifetime purchase and keep the marketplace product separate from the SaaS.
- Do not automatically replace it with a subscription, remove access, or redirect its product page to the SaaS.
- Existing customers may later receive an *optional* SaaS offer, credit or discount, which must not cancel or replace their original rights.
- **The exact optional migration offer is Hussnain's decision.** Marketplace buyers have not been assumed to consent to SaaS marketing.

**Open decision for Hussnain:** which price and licence terms are correct (the $45/$49 discrepancy and the "Unlimited Websites" versus "one licence per site" wording) - to be reviewed before any future copy is reused. No change has been made.

**Legacy entitlement policy (recorded):**
- The one-time quiz plugin remains a `squarespell.com` marketplace product; existing access and promises remain unchanged.
- It is excluded from the new SaaS subscription database. Buyers are not automatically SaaS customers and will not be contacted without separate authorization.
- Any later SaaS offer is optional and does not replace the original purchase.
- The price and licence inconsistency visible on the public page ($45 selector vs $49 FAQ; "Unlimited Websites" vs one licence per site) remains an **unresolved marketplace issue and was not edited**.

---

## 9. Paid design-partner plan (P0.8) - preparation only, nobody contacted

**Target:** 15-20 qualified SaaS prospects, five paying commitments.

| Segment | Target prospects | Where to source (no contact until authorized) |
|---|---|---|
| Consultants and agencies | 4-5 | Public directories, Squarespell readers who opt in, agency partners |
| Coaches and course creators | 4-5 | Same, plus catalogue verticals already in templates (coaching, creator, fitness) |
| Beauty, wellness and local services | 3-4 | Local-service verticals present in the template catalog (skincare, wellness, fitness) |
| Professional-service businesses | 3-4 | Real estate, nonprofit, consulting verticals in the catalog |
| Squarespell readers | 2-3 | Only where consent to marketing exists |
| Existing SaaS users | 1-2 | The 9 database users are candidates only after separate authorization |

**Marketplace plugin buyers are excluded** until Hussnain separately authorizes an offer; consent to SaaS marketing is not assumed.

**Qualification criteria:** live website; real visitor traffic; a clear qualification, recommendation or assessment use case; can install or test; agrees to give feedback; willing to pay from the start.

**Candidate record (fields):** name, business, site URL, segment, platform, traffic signal, use case, consent status, source, fit score (0-2 per criterion), status, notes. No records exist yet.

**Pilot scorecard:**

| Stage | Metric | Suggested target |
|---|---|---|
| Website analysis to editable draft | % reaching an editable draft | 70%+ |
| Draft to publish | % publishing | 60%+ |
| Publish to verified installation | % with a verified live embed | 70%+ |
| Time to first real completion | Median days | 50%+ within 14 days |
| Qualified lead / CTA action | Count and rate per quiz | Recorded per pilot |
| 30-day activity and retention | % still active | 60%+ |
| Support time by platform | Minutes per activation | Recorded by platform |

Targets are proposals carried from Revision 3 and must be approved. **No outreach without a separate instruction from Hussnain.**

---

## 10. Service separation matrix (current state and target state)

"Verified" = observed in this project; "Unverified" = not inspected. Squarespell Limited owns both products, so a shared top-level account is acceptable; the target column shows what Squarespell Quiz needs of its own. Nothing below was created in Phase 0. "Before Phase 1" = an action needed before Phase 1 can start.

| Service | Current state | Used by | Correct target | Data / configuration separation requirement | Migration phase | Action before Phase 1? |
|---|---|---|---|---|---|---|
| Company and ownership | Squarespell Limited (Stripe account owner); other accounts held under Hussnain's business logins | Both products | Squarespell Limited owns both products; no separate legal entity, company identity or owner account | Separation is between applications, data and configuration, not companies | Not applicable | No |
| Domains | `squarespell.com` marketplace (Hostinger DNS); `squarespellquiz.com` purchased, unconnected, DNS untouched; the SaaS currently runs at `app.squarespell.com` (verified) | Marketplace; SaaS via subdomain | `squarespell.com` remains the marketplace; `squarespellquiz.com` becomes the Quiz product domain | No DNS or redirect change now; marketplace records untouched | Phase 3 staging DNS; later cutover | No |
| Hostinger | Shared Unlimited Web Hosting for the marketplace (verified); no VPS | Marketplace | Same Squarespell owner account; a dedicated KVM 2 VPS and services for Squarespell Quiz (not purchased) | The shared plan stays untouched; the VPS is independent of it | Phase 3 | No |
| GitHub / source repository | `Squarespell/squarespell` holds the SaaS code (verified); marketplace WordPress code repository unverified | SaaS (marketplace unknown) | Same Squarespell organization is acceptable; repository structure decided by technical need | No WordPress code or marketplace data in the SaaS repository | Ongoing | No |
| Production hosting (application) | SaaS: Vercel (frontend) and Render (API) (verified) | SaaS | Docker Compose on the dedicated KVM 2 VPS | Application changes for one product must not break the other | Phase 3 staging, then migration | No |
| Database | SaaS: Supabase project (9 users, 31 quizzes); marketplace: WordPress/WooCommerce database on shared hosting | Each product | Dedicated Squarespell Quiz PostgreSQL production database | Own credentials and access; no cross-database queries; no imports either way without an approved migration | Phase 3 staging; migration rehearsals | No |
| Authentication (Clerk) | One Clerk application "Squarespell", personal Hobby workspace, development instance only | SaaS | Same owner/workspace is acceptable; a dedicated production Squarespell Quiz application with a custom domain and its own Google/Apple credentials | No shared sessions or authentication database with the marketplace | Phase 3 staging; before real users | Decision only: timing and how to handle the development users |
| Stripe billing | One Squarespell Limited account (live): WooCommerce payments and active gateway webhook; six SaaS plan products; disabled Quiz webhook | Both | Same Squarespell Limited account; a separated Quiz catalog with dedicated products, prices, webhook endpoints, metadata and entitlement mapping; WooCommerce setup and webhook untouched | Marketplace orders never become Quiz entitlements; every Quiz object carries a product identifier | Phase 1 verifies the current setup; Phase 2 approves plan names and prices before any catalog change | No decision needed |
| Transactional email | SaaS sender (provider and sender domain unverified); marketplace: Hostinger email (Reach 100 subscription) | Unverified | Same business/provider account is acceptable; dedicated Squarespell Quiz sender domain (SPF/DKIM/DMARC) and configuration | Separate sender identity and API keys | Phase 3 | Inventory in Phase 1 |
| File and media storage | Marketplace: WordPress media and WooCommerce download files on shared hosting; SaaS storage unverified | Each product | Dedicated Squarespell Quiz buckets and access rules | No shared buckets or credentials | Phase 3-4 | No |
| Analytics | Marketplace analytics on `squarespell.com` (property not inspected); SaaS analytics unverified | Marketplace; SaaS unknown | Dedicated Squarespell Quiz GA4 property and data stream; Tag Manager container if needed | Separate properties and consent settings | When the new site is built | No |
| Google Search Console | Domain property `sc-domain:squarespell.com` (also covers `app.squarespell.com`); none for `squarespellquiz.com` | Marketplace (and SaaS via subdomain) | Dedicated domain property for `squarespellquiz.com` (plus Bing Webmaster Tools) after DNS verification is authorized | Separate properties and history | Phase 3 staging or launch | No |
| Error monitoring and logs | Vercel and Render logs; marketplace host logs; error and uptime tools unverified | Each product | Dedicated Squarespell Quiz project/service views, uptime checks and alerts | Separate log stores and alerts | Phase 1 adds monitoring; Phase 3 dedicated | No |
| Backups | Supabase backups (plan-level, unverified); Hostinger shared-hosting backups (unverified) | Each product | Dedicated Squarespell Quiz database and configuration backups with an independent offsite copy | Separate backups and restore procedures | Phase 3 | No |
| Secrets and environment variables | Vercel and Render environment variables; WordPress and WooCommerce keys (values not viewed) | Each product | Separate by product and environment | No unnecessary reuse of production credentials | Phase 3; rotate at cutover | Map configuration ownership in Phase 1 (no secrets exposed) |
| Customer records | SaaS: 9 app users, 12 Clerk users; marketplace: WooCommerce customers (excluded); Stripe holds records for both | Each product | Marketplace and SaaS application records stay logically separated | No import without an approved, privacy-reviewed migration | Ongoing | No |
| SEO content | `squarespell.com` hosts the marketplace content and also the SaaS `/quiz/` page and five quiz articles | Both | Squarespell Quiz content lives on `squarespellquiz.com`; marketplace and lifetime-plugin pages stay on `squarespell.com` | Nothing moved, copied, re-canonicalised or redirected in Phase 0 (rule in section 4) | Phase 2 SEO map without redirects; later authorized content phase | No |
| Existing lifetime plugin customers | WooCommerce on `squarespell.com` (excluded) | Marketplace only | Stay on `squarespell.com` | Never imported or converted; optional offers only with separate authorization | None | No |
| AI provider (Anthropic) | Existing API key in the SaaS environment (unverified) | SaaS | Dedicated Squarespell Quiz key and usage limits | No reuse of production keys across products | Phase 1 (cost controls) | No |
| Support email and social accounts | Marketplace support mailbox and existing @squarespell profiles; no `squarespellquiz` accounts | Marketplace | Dedicated Squarespell Quiz support address and profiles | Separate inboxes and logins where the provider supports it | Before launch | No (none created) |

---

## 11. Unresolved blockers, risks and owner decisions

**Not blockers (closed by design):** private marketplace counts (`Unavailable - intentionally excluded to preserve marketplace/SaaS separation`), UK trademark search (owner confirms the registration; not needed), further trademark searches, WordPress administration data.

**Known risks carried into Phase 1 and Phase 2**
| # | Risk | Where handled |
|---|---|---|
| R1 | Stripe: Quiz and marketplace objects share one account without product metadata or clear naming; Stripe has Starter/Pro/Agency while the app uses Core/Pro/Business | Phase 1 verifies billing and webhooks; Phase 2 approves plan names and prices before any catalog change |
| R2 | The Squarespell Quiz Stripe webhook is disabled | Phase 1 verifies the billing lifecycle; the webhook stays unchanged until the new billing architecture is tested |
| R3 | Clerk runs only as a development instance; 12 Clerk users vs 9 database users (possible unmatched sign-ins) | Phase 1 investigation; dedicated production Clerk application later |
| R4 | Public claims without evidence (install and speed claims, conversion statistics, `noindex` on `/quiz/`) | Phase 1 fixes critical public-claim defects; content phase for the rest |
| R5 | Zapier and REST API routes appear not mounted although advertised | Phase 1 code check |
| R6 | Analytics, backlinks and media Unavailable | Accepted for now |
| R7 | Possible confusion with the SQUARESPACE mark; Facebook inconclusive; handles unreserved | Legal review is optional; reservation is an owner choice |
| R8 | Domain term and expiry not inspected (checkout defaulted to 3 years; owner says one year); Hostinger renewal dates unreconciled | Optional read-only check |
| R9 | Legacy plugin price and licence wording inconsistent | Marketplace owner decision; not edited |

**Decisions Hussnain must make before Phase 1**
1. Approve creating a dedicated production Squarespell Quiz Clerk application later (the same owner workspace is acceptable), and how the development users are handled (import or re-onboard).
2. Accept the data deliberately excluded from Phase 0 (private marketplace data) and the Unavailable analytics and backlink data as known risks.
3. Decide whether to reserve the social handles later (no purchase needed).
4. Optionally, decide whether legal review of the SQUARESPACE-confusion point is wanted.

No Stripe account, legal-entity or administrator decision is required: Squarespell Limited remains the legal entity and account owner.

**Decisions that can wait:** approval of plan names and prices (Phase 2, before the Stripe catalog changes); the optional SaaS offer to lifetime-plugin buyers and the plugin price wording (marketplace decisions); the pilot cohort and scorecard approval (needed before Phase 2's "five paying commitments").

---

## 12. Phase 0 exit decision

Owner-set exit tests, checked against the evidence:

| Test | Status |
|---|---|
| Stripe inspected sufficiently to understand the current setup | **Met** (section 6.2) |
| Service-separation matrix complete | **Met** (section 10) |
| Clerk findings documented | **Met** (section 6.3) |
| Brand and social findings documented | **Met** (section 3) |
| Content inventory remains complete | **Met** (29 rows; unavailable items labelled) |
| Blockers and owner decisions listed | **Met** (section 11) |

Master plan Phase 0 exit ("no unknown infrastructure, domain, connector or legacy entitlement blocks the pilot"): infrastructure (Hostinger shared plan, no VPS, KVM 2 planned), domain (`squarespellquiz.com` purchased), connectors (matrix in section 5) and legacy entitlement (protected, documented, excluded from the SaaS) are all known.

**Decision: Phase 0 can close**, with the risks R1-R9 and the decisions above carried forward. Approving the pilot cohort and scorecard remains an owner action ahead of Phase 2. **Phase 1 has not been started.**

---

## 13. Status board update

| ID | Task | Status |
|---|---|---|
| P0.1 | Adopt Revision 3 | Done |
| P0.2 | Merge/deploy repair | Done (not rechecked) |
| P0.3 | Hostinger account/VPS/domain entitlement | Done |
| P0.4 | Brand/domain evidence | Done (domain purchased; trademark owner-confirmed; USPTO/WIPO no exact conflict; social screening recorded) |
| P0.5 | Content/authority inventory | Done (unavailable items labelled) |
| P0.6 | Connector matrix | Done |
| P0.7 | Customer/subscription/lifetime inventory | Done for the SaaS side (Stripe, Clerk, database); marketplace side intentionally excluded |
| P0.8 | Paid design partners | Preparation done; nobody contacted |
| P1 | Stabilize production | **Next task; not started** |

**Exact next task (master plan status board): P1 - Stabilize production.**

# Squarespell Quiz - Phase 0 Results (Revision 3.0)

Prepared 19 September 2026 against Relaunch Master Plan Revision 3.0. Scope: P0.3-P0.8. P0.1/P0.2 (PR #61 merged as `091f1cd9d7e3f7f1483fbd499f58f6085f664575`, deployed, smoke-tested) were not re-checked.

**Evidence labels:** Verified (observed directly this pass) - Vendor/official documentation (cited) - Recommendation - Hypothesis - Unavailable (could not be accessed; never means zero).

This file is documentation only. Nothing on `squarespell.com`, in DNS, in production code, in any database, in Stripe or in any customer access was changed by this work. The only reads of production systems were public web pages, the public sitemaps, Google Search Console (read-only), Hostinger's own read-only pages, and aggregate-only `SELECT count` queries against the SaaS database.

---

## 1. Separation rule and data-separation requirement (architectural requirement)

`squarespell.com` and `squarespellquiz.com` are separate products within the Squarespell brand.

- **`squarespell.com`** is the existing marketplace and WordPress/WooCommerce site. It stays live and unchanged.
- **`squarespellquiz.com`** is the new subscription SaaS. It gets its own application, infrastructure and data store.

**Data-separation requirements (binding on all later phases):**
1. The `squarespell.com` WordPress/WooCommerce database remains dedicated to the marketplace.
2. Marketplace customers, orders, plugin licences, downloads and media stay in marketplace systems.
3. `squarespellquiz.com` uses a separate SaaS PostgreSQL database.
4. The SaaS database has separate credentials, database users, backups and access controls.
5. Existing SaaS data may later move from Supabase into the dedicated `squarespellquiz.com` database.
6. SaaS data is never imported into the `squarespell.com` WordPress database.
7. Marketplace order/customer data is not copied into the SaaS database without a later explicit migration decision and privacy review.
8. Any future marketplace-SaaS communication uses an explicit, documented API, referral link or approved import process.
9. A compromise or failure of the SaaS database must not expose the marketplace database.
10. Backups and restore procedures stay separate.
11. Deploying the SaaS must not require modifying the marketplace WordPress codebase.
12. Each site stays operational when the other is offline.

**Protected legacy product:** the one-time quiz plugin sold on `squarespell.com` is separate from the SaaS. Its listing, URL, price, licence, download, buyer access, promised updates and support, and wording must not be changed, redirected, unpublished or converted (details in section 8).

**Warning recorded, not acted on:** the SaaS marketing page `/quiz/` and several blog posts are currently hosted inside the marketplace WordPress site. Moving or copying that content to `squarespellquiz.com` is a future decision; this pass changed nothing.

---

## 2. Domain and Hosting (P0.3, P0.4 - already completed, not repeated)

- **`squarespellquiz.com` is selected as the SaaS product domain and was purchased manually by Hussnain.** Hussnain states it was purchased for one year. Note for verification: the checkout Claude prepared defaulted to a 3-year term (Rs. 9,464.00 including Rs. 167.00 tax; renewal Rs. 4,399.00/year on 2029-09-20). Claude confirmed only that the domain appears in the Hostinger domain portfolio; the actual term, expiry and auto-renewal were **not** inspected and are unverified.
- **Hostinger plan (verified, signed-in account):** Unlimited Web Hosting (shared hosting) for `squarespell.com`; renewal Rs. 27,588.00, auto-renews 2027-08-18 (site page shows 2027-08-31 expiry - unreconciled). Also Reach 100 email marketing (Rs. 4,788.00/yr) and the `.COM` domain subscription for `squarespell.com` (Rs. 4,399.00/yr). Exactly 3 subscriptions; **no VPS exists**.
- **Conclusion (verified + Hostinger documentation):** shared hosting cannot host the SaaS target architecture (PostgreSQL, Docker, worker, root/SSH are VPS features). It must stay untouched for the marketplace.
- **Recommendation for Phase 3 only, not purchased:** KVM 2 (2 vCPU / 8 GB / 100 GB NVMe). Observed 24-month checkout Rs. 64,776.00 (Rs. 2,699.00/mo), renewal Rs. 4,099.00/mo; 12-month Rs. 3,199.00/mo; 1-month Rs. 4,399.00. Daily backups are a paid add-on (price not captured) and must be complemented by independent offsite backups.
- The SaaS VPS must be a **separate** service from the marketplace shared hosting (section 1, rules 3, 4, 10, 12). No DNS, nameserver, auto-renewal, privacy, lock or hosting connection was changed for either domain.

---

## 3. Brand and domain clearance (P0.4) - preliminary screening, not legal advice

Brand: `Squarespell Quiz`. Domain: `squarespellquiz.com`. Method: public web search and logged-out public pages only. Nothing was registered, reserved or purchased.

| Check | Result | Evidence |
|---|---|---|
| Search-result conflicts, "Squarespell Quiz" | **Clear** | Only Squarespell's own `/quiz` page, repo and listing. |
| "Squarespell" alone | **Possible conflict** | Looks like the owner's own brand (site, Instagram @squarespell "H&Q Studio", LinkedIn page); mark ownership unconfirmed. |
| "Square Spell" quiz (variant) | **Clear** | No exact-match product found. |
| SpellQuiz / Spell Quiz | **Possible conflict** | Existing K-12 spelling-test product (spellquiz.com) plus an Android app; different audience but shared "spell quiz" words. |
| Confusion with Squarespace (Squarespace, Inc.) | **Possible conflict - the main risk** | "Squarespell" differs from SQUARESPACE by one letter and is used for Squarespace add-ons. No disclaimer found on the homepage. Risk rises if a mark is filed in software classes 9/42. |
| USPTO trademark search | **Inconclusive** | JS app; not queryable without a browser session. Manual strings: `SQUARESPELL`, `SQUARESPELL QUIZ`, `SPELLQUIZ`, wildcard `SQUARESP*`, classes 9, 35, 41, 42. |
| UK IPO trademark search | **Inconclusive** | Bot-blocked (HTTP 403) to automated fetch. Same strings, phonetic search on. |
| WIPO Global Brand Database | **Inconclusive** | JS app. Same strings, phonetic/fuzzy on. |
| `squarespellquiz.com` domain | **Verified owned** | Appears in the Hostinger portfolio (term unverified, section 2). |

**Conclusion:** no third-party "Squarespell" or "Squarespell Quiz" business was found, but the three trademark registers were **not actually searched**, so the name is **not cleared**. The one substantive risk is confusion with the SQUARESPACE mark. Recommend a manual register search and a trademark attorney review before investing further in the brand or filing.

### Social handles (logged-out checks; 404 is weak evidence of availability)

| Platform | `@squarespellquiz` | `@squarespell` |
|---|---|---|
| X | **Inconclusive** (404) | Inconclusive (404) |
| Instagram | **Inconclusive** (generic login shell) | Unavailable (exists: "SQUARESPELL, H&Q Studio") |
| Facebook | **Inconclusive** (generic shell) | Inconclusive |
| LinkedIn company | **Inconclusive** (404) | Unavailable (page exists) |
| YouTube | **Inconclusive** (404) | Possible conflict (channel "Muhammad Hussnain" - unconfirmed as the owner's) |
| TikTok | **Inconclusive** (no readable content) | Inconclusive |

No handle can be declared Clear from logged-out checks. Confirmation requires a logged-in check on each platform.

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
| 6 | Draft/unpublished quiz content | **Unavailable** - requires WordPress admin (access blocked; see section 7) |
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

## 6. SaaS customer, subscription and data summary (P0.7 - SaaS side only)

Read-only aggregate `count` queries against the SaaS Supabase project (`omwtmvzdqmxewdswapgq`, previously verified `ACTIVE_HEALTHY`). No names, emails or payment data were retrieved.

| Item | Result | Source |
|---|---|---|
| Application database users | **9** | Verified |
| Users with a Clerk id | **9 of 9** | Verified |
| Clerk users (dashboard count) | **Unavailable** - Clerk sign-in required; no credentials entered | - |
| Users with a Stripe customer id | **0** | Verified |
| Users with a Stripe subscription id | **0** | Verified |
| Stripe customers / subscriptions (Stripe dashboard) | **Unavailable** - Stripe sign-in required; no credentials entered | - |
| Plans held | 8 free, **1 agency** | Verified |
| Manual plan assignment | **1** (the agency user has no Stripe link) | Verified (inference from no Stripe ids) |
| Users with a plan expiry date | 0; none expired | Verified |
| Active / cancelled / failed / past-due subscriptions | **0 in app DB**; Stripe side Unavailable | Partly verified |
| Trials | **Unavailable** - trial is time-based in code (14 days, `planGuard.ts:11`); no trial rows in data | - |
| Quizzes | **31** (9 live, 6 draft, 16 archived), owned by 6 distinct users | Verified |
| Leads / responses | **0** leads; `quiz_payments` 0; `analytics_events` 0 | Verified |
| Other tables | 1 preview draft; 2 platform email log rows; the rest empty | Verified |

**Unresolved mismatches / gaps:** (a) Clerk user count cannot be reconciled with the 9 database users until dashboard access; (b) Stripe customers cannot be reconciled with the 0 Stripe ids in the database (any Stripe customer without a database link would be a mismatch); (c) the one agency plan is an unexplained manual assignment; (d) the app shows 0 leads, so any published conversion statistic has no first-party basis.

---

## 7. Marketplace customer and product summary (P0.7 - marketplace side only)

Kept separate from section 6. **Aggregate counts from WordPress/WooCommerce are Unavailable.** The automated permission layer blocked opening `squarespell.com/wp-admin`, and no marketplace admin credentials were provided or entered; Claude did not work around this. To close this, Hussnain (or a designated admin) can export aggregate-only WooCommerce reports (see blockers).

| Item | Result |
|---|---|
| WooCommerce customers | **Unavailable** |
| Orders for the one-time quiz plugin (single / multi-use) | **Unavailable** |
| Active downloads | **Unavailable** |
| Licence records | **Unavailable** (whether a licence-key system exists is unknown) |
| Refunds | **Unavailable** |
| Marketplace accounts | **Unavailable** |
| Product-support commitments | **Verified from public page** - see section 8 |

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
| Known purchasers | **Unavailable** (marketplace access blocked) |
| Does customer access still work? | **Unverified.** The product page loads (200) and offers add-to-cart; download and licence delivery were not tested because that would require a purchase or admin access. |
| Technically independent of the SaaS? | **Yes (verified by design):** it is a WooCommerce product, a paste-in-Code-Injection plugin, sold from `squarespell.com`; the SaaS is a separate Next.js/Express/Supabase system with no shared code path. |
| Other quiz-type listings | Two Common Ninja quiz products and calculator/form listings are third-party vendor products with affiliate links and are outside this entitlement. |

**Recorded policy (per Hussnain):**
- Preserve the original lifetime purchase and keep the marketplace product separate from the SaaS.
- Do not automatically replace it with a subscription, remove access, or redirect its product page to the SaaS.
- Existing customers may later receive an *optional* SaaS offer, credit or discount, which must not cancel or replace their original rights.
- **The exact optional migration offer is Hussnain's decision.** Marketplace buyers have not been assumed to consent to SaaS marketing.

**Open decision for Hussnain:** which price and licence terms are correct (the $45/$49 discrepancy and the "Unlimited Websites" versus "one licence per site" wording) - to be reviewed before any future copy is reused. No change has been made.

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

## 10. Unresolved blockers

| # | Blocker | What closes it |
|---|---|---|
| B1 | Trademark registers (USPTO, UK IPO, WIPO) not searchable by automation | Manual searches with strings in section 3, or attorney review |
| B2 | Social handles Inconclusive on all six platforms | Logged-in checks; possible reservation is a separate purchase-free decision |
| B3 | Marketplace WooCommerce aggregates Unavailable (access blocked) | Aggregate-only WooCommerce exports (customers, orders for product id 389, downloads, licences, refunds) - or explicit authorization to view the read-only reports |
| B4 | Clerk and Stripe dashboards require sign-in | Hussnain signs in, or supplies aggregate exports; then reconcile with the 9 users |
| B5 | Analytics landing pages, backlinks/referrers, media library, draft quiz content Unavailable | Analytics and Search Console Links access; WordPress read access |
| B6 | Legacy plugin price/licence inconsistency and unknown purchaser count | Owner review of live listing; order count |
| B7 | Domain term/expiry/auto-renewal not inspected | Read-only look at the domain in hPanel |
| B8 | Hostinger renewal dates unreconciled (2027-08-18 vs 2027-08-31) | Read-only check |
| B9 | Owner decisions: brand approval, legacy optional offer, pilot targets/scorecard | Hussnain |
| B10 | Public claims that need evidence or correction (section 4) | Later authorized content phase; nothing changed now |
| B11 | Zapier/REST API routes may be unmounted | Code check in Phase 1 |

## 11. Can Phase 0 be closed?

**Not yet.** Revision 3 requires that no unknown infrastructure, domain, connector or legacy-entitlement item blocks the pilot. Infrastructure, connector and content evidence are essentially complete, but B1, B3, B4 and B6 leave brand, marketplace and subscription unknowns open. Phase 0 can close once B1-B4 and B6 are resolved, or once Hussnain explicitly accepts them as known risks.

## 12. Status board update

| ID | Task | Status |
|---|---|---|
| P0.1 | Adopt Revision 3 | Done |
| P0.2 | Merge/deploy repair | Done (not rechecked) |
| P0.3 | Hostinger account/VPS/domain entitlement | Done |
| P0.4 | Brand/domain evidence | Domain purchased; screening done; register/social checks open (B1, B2) |
| P0.5 | Content/authority inventory | Done except B5 |
| P0.6 | Connector matrix | Done |
| P0.7 | Customer/subscription/lifetime inventory | SaaS DB counts done; Clerk, Stripe and marketplace Unavailable (B3, B4, B6) |
| P0.8 | Paid design partners | Preparation done; no contact made |
| P1 | Stabilize production | Not started; follows Phase 0 closure |

**Next task:** close blockers B1-B4 and B6, then start **P1 - Stabilize production** (Revision 3 status board). P1 was not started in this work.

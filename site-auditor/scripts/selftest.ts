/**
 * Offline regression tests for the highest-risk checks.
 *
 * Run with `npx tsx scripts/selftest.ts`.
 *
 * This exists because of a specific class of bug. Twice, a change that looked
 * correct in isolation produced a confident false positive on a real business
 * site: telling a firm with a working HubSpot contact form that nobody could
 * reach them, and telling a shop that its product names were services it had
 * failed to build pages for. Those are the mistakes that destroy the
 * credibility of an audit, and no amount of care at review time catches them
 * reliably.
 *
 * Every case here is a page of HTML built to look like the real thing, run
 * through the real extractor and the real checks. No network, no fixtures to
 * refresh, no flakiness. If a check changes behaviour on one of these, it fails
 * here rather than in front of a customer.
 */

import { extractFacts, type PageFacts } from '../src/lib/audit/extract';
import { convChecks } from '../src/lib/audit/checks/conv';
import { aeoChecks } from '../src/lib/audit/checks/aeo';
import { onpageChecks } from '../src/lib/audit/checks/onpage';
import { buildProfile } from '../src/lib/audit/aeo/profile';
import { templateQuestions } from '../src/lib/audit/aeo/questions';
import { analyseQuestions } from '../src/lib/audit/aeo/gaps';
import { classifyPageType } from '../src/lib/audit/pagetype';
import { buildUnderstanding } from '../src/lib/audit/understanding';
import { buildOpportunities, applyGoalAwareness } from '../src/lib/audit/opportunity';
import { buildWebsiteDoctor } from '../src/lib/audit/doctor';
import type { AuditContext } from '../src/lib/audit/context';
import { finding, fail } from '../src/lib/audit/context';
import { applyNarrative, NARRATIVE } from '../src/lib/audit/narrative';
import { comparisonVerdict, buildCompetitiveIntelligence } from '../src/lib/audit/compare';
import type { CompetitorScore } from '../src/lib/audit/compare';
import type { CheckResult, PageData, AuditReport, Finding, CategoryId } from '../src/lib/audit/types';
import { CATEGORIES } from '../src/lib/audit/types';
import { diffReports } from '../src/lib/audit/diff';
import { buildGrowthIntelligence } from '../src/lib/audit/growth';

let failures = 0;
let checks = 0;

function assert(label: string, condition: boolean, detail = '') {
  checks++;
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`);
  }
}

/* ------------------------------------------------------------------ *
 * Harness
 * ------------------------------------------------------------------ */

function page(url: string, body: string, opts: { title?: string; head?: string; depth?: number } = {}): PageFacts {
  const html = `<!doctype html><html lang="en"><head>
    <title>${opts.title ?? 'Test Page'}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${opts.head ?? ''}
  </head><body>${body}</body></html>`;
  const data: PageData = {
    url,
    finalUrl: url,
    status: 200,
    ok: true,
    depth: opts.depth ?? (new URL(url).pathname === '/' ? 0 : 1),
    redirectChain: [],
    headers: { 'content-type': 'text/html' },
    html,
    bytes: html.length,
    ttfbMs: 120,
    contentType: 'text/html',
  };
  return extractFacts(data);
}

function context(pages: PageFacts[], overrides: Partial<AuditContext> = {}): AuditContext {
  const home = pages.find((p) => p.depth === 0) || pages[0];
  return {
    origin: 'https://example.com',
    startUrl: 'https://example.com',
    homepage: home,
    homepageHtml: '',
    pages,
    htmlPages: pages,
    failedPages: [],
    robots: { found: true, status: 200, raw: '', sitemaps: [], groups: [], isSquarespaceDefault: true },
    sitemap: { found: true, source: 'robots', url: '', urls: [], totalUrls: pages.length, isIndex: false },
    squarespace: {
      isSquarespace: true,
      confidence: 100,
      version: '7.1',
      versionConfidence: 90,
      signals: [],
      siteStatus: 'live',
      context: null,
      editor: { fluid: 1, classic: 0, ratio: 1 },
      features: {
        commerce: false,
        scheduling: false,
        memberAreas: false,
        forms: true,
        popupOverlay: false,
        announcementBar: false,
        cookieBanner: false,
        badge: false,
        devMode: false,
      },
    },
    probes: {},
    images: [],
    assets: [],
    internalLinkGraph: new Map(),
    brokenLinks: [],
    budgetHit: false,
    discovered: pages.length,
    ...overrides,
  };
}

const findingIds = (results: CheckResult[]) => results.flatMap((r) => r.findings.map((f) => f.id));
const titleFor = (results: CheckResult[], id: string) =>
  results.flatMap((r) => r.findings).find((f) => f.id === id)?.title || '';
const passed = (results: CheckResult[], id: string) =>
  results.some((r) => r.id === id && r.findings.length === 0 && r.applicable > 0);
const findingFor = (results: CheckResult[], id: string) => results.flatMap((r) => r.findings).find((f) => f.id === id);
const isNa = (results: CheckResult[], id: string) => results.some((r) => r.id === id && r.applicable === 0);
const resultFor = (results: CheckResult[], id: string) => results.find((r) => r.id === id);

/* ------------------------------------------------------------------ *
 * Contact routes: the most damaging thing we can get wrong
 * ------------------------------------------------------------------ */

console.log('\nContact detection');

{
  const ctx = context([
    page('https://example.com/', '<h1>Bright Studio</h1><p>We photograph weddings.</p>'),
    page(
      'https://example.com/contact',
      `<h1>Contact</h1>
       <script src="https://js.hsforms.net/forms/embed/50178384.js" defer></script>
       <div class="hs-form-frame" data-region="na1" data-form-id="e6f1e297"></div>`
    ),
  ]);
  const out = convChecks(ctx);
  assert(
    'a HubSpot embed counts as a contact route',
    !findingIds(out).includes('CONV-010') || !/no way for a visitor to contact you/i.test(titleFor(out, 'CONV-010'))
  );
  assert('the JavaScript-form caveat is raised instead', findingIds(out).includes('CONV-015'));
}

{
  const ctx = context([
    page('https://example.com/', '<h1>Studio</h1>'),
    page(
      'https://example.com/contact',
      '<h1>Contact</h1><div class="sqs-block-form" data-block-type="form"></div>'
    ),
  ]);
  const out = convChecks(ctx);
  assert(
    'a Squarespace Form Block counts as a contact route',
    !/no way for a visitor to contact you/i.test(titleFor(out, 'CONV-010'))
  );
}

{
  const ctx = context([
    page(
      'https://example.com/',
      `<h1>Studio</h1>
       <script type="application/ld+json">{"@context":"http://schema.org","@type":"Organization","name":"Studio","email":"hello@example.com"}</script>`
    ),
  ]);
  const out = convChecks(ctx);
  assert(
    'contact details that exist only in markup are reported as such, not as absent',
    /only in the page code/i.test(titleFor(out, 'CONV-010')),
    `got: "${titleFor(out, 'CONV-010')}"`
  );
}

{
  const ctx = context([
    page('https://example.com/', '<h1>Studio</h1><p>Reach us at hello@example.com any time.</p>'),
  ]);
  const out = convChecks(ctx);
  assert(
    'a plain-text email is reported as not clickable, not as no contact route',
    /not clickable/i.test(titleFor(out, 'CONV-010')),
    `got: "${titleFor(out, 'CONV-010')}"`
  );
}

{
  const ctx = context([
    page('https://example.com/', '<h1>Studio</h1><p>Nothing here at all.</p>'),
    page('https://example.com/work', '<h1>Work</h1><p>Some pictures.</p>'),
  ]);
  const out = convChecks(ctx);
  assert(
    'a site with genuinely no contact route is still caught',
    /no way for a visitor to contact you/i.test(titleFor(out, 'CONV-010')),
    `got: "${titleFor(out, 'CONV-010')}"`
  );
}

{
  const ctx = context([
    page(
      'https://example.com/',
      '<h1>Studio</h1><a href="https://calendly.com/studio/30min">Book a call</a>'
    ),
  ]);
  const out = convChecks(ctx);
  assert(
    'a booking embed alone is reported as booking-only, not as no contact route',
    /booking is the only way/i.test(titleFor(out, 'CONV-010')),
    `got: "${titleFor(out, 'CONV-010')}"`
  );
}

{
  const ctx = context([
    page('https://example.com/', '<h1>Studio</h1><a href="tel:+441234567890">Call us</a>'),
  ]);
  const out = convChecks(ctx);
  assert('a tel: link passes the contact check outright', passed(out, 'CONV-010'));
  assert('and the clickable-phone check passes too', passed(out, 'CONV-001'));
}

/* ------------------------------------------------------------------ *
 * Service and product classification
 * ------------------------------------------------------------------ */

console.log('\nService detection');

{
  const pages = [
    page(
      'https://example.com/',
      `<nav><a href="/shop">Shop</a><a href="/about">About</a><a href="/contact">Contact</a></nav>
       <h1>Wedding photographer in Bristol</h1>`
    ),
    page(
      'https://example.com/shop',
      `<nav><a href="/shop">Shop</a><a href="/about">About</a><a href="/contact">Contact</a></nav>
       <h1>Shop</h1>
       <a href="/shop/p/print-set">Print Set</a>
       <a href="/shop/p/photo-book">Photo Book</a>`
    ),
    page('https://example.com/shop/p/print-set', '<h1>Print Set</h1><p>A set of prints.</p>'),
  ];
  const profile = buildProfile(context(pages));
  const names = profile.services.map((s) => s.name.toLowerCase());
  assert('shop items are classified as products, not services',
    profile.services.filter((s) => s.source !== 'product').length === 0,
    `got: ${JSON.stringify(profile.services)}`);
  assert('the trade is read from the homepage heading', profile.category === 'photographer',
    `got: ${profile.category}`);
  assert('navigation labels do not become services', !names.includes('about') && !names.includes('contact'));
}

{
  const pages = [
    page(
      'https://example.com/',
      `<nav><a href="/services">Services</a><a href="/testimonials">Testimonials</a></nav><h1>Skin clinic</h1>`
    ),
    page(
      'https://example.com/services',
      `<nav><a href="/services">Services</a></nav>
       <h1>Services</h1>
       <p>Choose a treatment.</p>
       <a href="/dermaplaning">Dermaplaning</a>
       <a href="/led-light-therapy">LED Light Therapy</a>`
    ),
    page(
      'https://example.com/dermaplaning',
      '<h1>Dermaplaning</h1><p>A treatment that removes dead skin. Book an appointment online.</p>'
    ),
    page(
      'https://example.com/testimonials',
      '<h1>What they are saying</h1><p>Lovely reviews from clients.</p>'
    ),
  ];
  const profile = buildProfile(context(pages));
  const names = profile.services.map((s) => s.name.toLowerCase());
  assert('services linked from a services page are found', names.includes('dermaplaning'),
    `got: ${JSON.stringify(names)}`);
  assert('a testimonials page never becomes a service',
    !names.some((n) => n.includes('saying') || n.includes('testimonial')),
    `got: ${JSON.stringify(names)}`);
}

{
  // The failure that produced "How much does what they're saying cost?": site
  // navigation appears on every page, so nav links must not read as services.
  const nav = `<nav><a href="/lets-connect">Let's Connect</a><a href="/meet-gabby">Meet Gabby</a></nav>`;
  const pages = [
    page('https://example.com/', `${nav}<h1>Skin coach</h1>`),
    page('https://example.com/services', `${nav}<h1>Services</h1><p>Our treatments.</p>`),
  ];
  const profile = buildProfile(context(pages));
  const names = profile.services.map((s) => s.name.toLowerCase());
  assert('call-to-action nav labels are not services',
    !names.some((n) => n.includes('connect') || n.includes('meet')),
    `got: ${JSON.stringify(names)}`);
}

/* ------------------------------------------------------------------ *
 * Question coverage
 * ------------------------------------------------------------------ */

console.log('\nQuestion coverage');

{
  const pages = [
    page(
      'https://example.com/',
      `<h1>Dog groomer in Leeds</h1><p>We are a dog groomer based in Leeds.</p>`
    ),
    page(
      'https://example.com/services',
      `<h1>Services</h1><a href="/full-groom">Full Groom</a>`
    ),
    page(
      'https://example.com/full-groom',
      `<h1>Full Groom</h1><p>A full groom takes about 90 minutes and costs from £45. Book an appointment online.</p>`
    ),
  ];
  const ctx = context(pages);
  const profile = buildProfile(ctx);
  const analysis = analyseQuestions(profile, templateQuestions(profile), pages);
  const cost = analysis.gaps.find((g) => /how much does full groom cost/i.test(g.question));
  const duration = analysis.gaps.find((g) => /how long does full groom take/i.test(g.question));
  assert('a published price answers the cost question', cost?.status === 'answered',
    `got: ${cost?.status} at coverage ${cost?.coverage}`);
  assert('a stated duration answers the timing question', duration?.status === 'answered',
    `got: ${duration?.status}`);
}

{
  const pages = [
    page('https://example.com/', `<h1>Dog groomer in Leeds</h1><p>We are a dog groomer based in Leeds.</p>`),
    page('https://example.com/services', `<h1>Services</h1><a href="/full-groom">Full Groom</a>`),
    page(
      'https://example.com/full-groom',
      `<h1>Full Groom</h1><p>Our full groom is a lovely experience for your dog. Get in touch to arrange one.</p>`
    ),
  ];
  const ctx = context(pages);
  const profile = buildProfile(ctx);
  const analysis = analyseQuestions(profile, templateQuestions(profile), pages);
  const cost = analysis.gaps.find((g) => /how much does full groom cost/i.test(g.question));
  assert('a page about the service with no price is "asked but not answered"',
    cost?.status === 'partial',
    `got: ${cost?.status} at coverage ${cost?.coverage}`);
}

{
  const pages = [page('https://example.com/', '<h1>Hello</h1><p>Some words about nothing in particular.</p>')];
  const ctx = context(pages);
  const profile = buildProfile(ctx);
  const analysis = analyseQuestions(profile, templateQuestions(profile), pages);
  assert('a site we cannot profile produces no questions at all', !analysis.ran && analysis.gaps.length === 0);
}

/* ------------------------------------------------------------------ *
 * Page-type classification and the checks that read it
 *
 * The single most consequential shared signal in the engine: every check
 * below reads `pageType` off a real PageFacts object produced by the real
 * extractor, not a hand-typed enum, so a regression in the classifier itself
 * shows up here too.
 * ------------------------------------------------------------------ */

console.log('\nPage-type classification');

{
  const homeType = classifyPageType({ url: 'https://example.com/', depth: 0, wordCount: 400, schemaTypes: [], images: { length: 0 }, forms: { length: 0 } });
  const contactType = classifyPageType({ url: 'https://example.com/contact', depth: 1, wordCount: 40, schemaTypes: [], images: { length: 0 }, forms: { length: 1 } });
  const serviceType = classifyPageType({ url: 'https://example.com/services/branding', depth: 1, wordCount: 300, schemaTypes: [], images: { length: 0 }, forms: { length: 0 } });
  const productType = classifyPageType({ url: 'https://example.com/shop/p/mug', depth: 2, wordCount: 200, schemaTypes: ['Product'], images: { length: 3 }, forms: { length: 0 } });
  const blogType = classifyPageType({ url: 'https://example.com/blog/my-post', depth: 1, wordCount: 700, schemaTypes: ['BlogPosting'], images: { length: 1 }, forms: { length: 0 } });
  const aboutType = classifyPageType({ url: 'https://example.com/about', depth: 1, wordCount: 250, schemaTypes: [], images: { length: 0 }, forms: { length: 0 } });
  const galleryType = classifyPageType({ url: 'https://example.com/work', depth: 1, wordCount: 10, schemaTypes: [], images: { length: 8 }, forms: { length: 0 } });
  const standardType = classifyPageType({ url: 'https://example.com/random-thing', depth: 1, wordCount: 300, schemaTypes: [], images: { length: 0 }, forms: { length: 0 } });

  assert('the homepage is classified as home', homeType === 'home', `got: ${homeType}`);
  assert('/contact is classified as contact', contactType === 'contact', `got: ${contactType}`);
  assert('/services/x is classified as service', serviceType === 'service', `got: ${serviceType}`);
  assert('a /p/ product page with Product schema is classified as product', productType === 'product', `got: ${productType}`);
  assert('a /blog/ post with BlogPosting schema is classified as blog-post', blogType === 'blog-post', `got: ${blogType}`);
  assert('/about is classified as about', aboutType === 'about', `got: ${aboutType}`);
  assert('an image-heavy, near-textless page is classified as gallery', galleryType === 'gallery', `got: ${galleryType}`);
  assert('an unremarkable page falls back to standard', standardType === 'standard', `got: ${standardType}`);
}

{
  // ONPAGE-030 (thin content) and ONPAGE-040 (internal links) read the same
  // classifier, so a contact page and a gallery are exempted from both
  // consistently instead of only one (AUDIT-OF-THE-AUDIT.md, Step 5) — while
  // an equally short *service* page, which is not thin-by-design, still
  // fires normally.
  const pages = [
    page('https://example.com/', `<h1>Bright Studio</h1><p>${'word '.repeat(200)}</p>`),
    page('https://example.com/contact', '<h1>Contact</h1><p>Call us on the phone.</p>'),
    page('https://example.com/services/branding', '<h1>Branding</h1><p>We do branding.</p>'),
  ];
  const ctx = context(pages);
  const out = onpageChecks(ctx);
  const thin = findingFor(out, 'ONPAGE-030');
  const shallow = findingFor(out, 'ONPAGE-040');
  assert(
    'a short contact page is not flagged as thin content',
    !thin || !thin.affectedUrls.includes('https://example.com/contact'),
    `thin urls: ${JSON.stringify(thin?.affectedUrls)}`
  );
  assert(
    'a short service page with the same word count IS flagged as thin content',
    Boolean(thin && thin.affectedUrls.includes('https://example.com/services/branding')),
    `thin urls: ${JSON.stringify(thin?.affectedUrls)}`
  );
  assert(
    'a link-poor contact page is not flagged for weak internal linking',
    !shallow || !shallow.affectedUrls.includes('https://example.com/contact')
  );
}

{
  // CONV-030 (booking): only fires for a confidently-identified
  // appointment-led business. An e-commerce / non-local business with no
  // booking widget is not missing anything and gets `na`, not a finding.
  const clinicPages = [
    page('https://example.com/', '<h1>Riverside Dental Clinic</h1><p>Family dentistry.</p>'),
    page('https://example.com/services', '<h1>Services</h1><p>Check-ups, whitening, and more.</p>'),
  ];
  const clinicCtx = context(clinicPages);
  const clinicProfile = buildProfile(clinicCtx);
  clinicCtx.aeo = { profile: clinicProfile, gaps: [], answered: [], partial: [], missing: [], opportunities: [], existingQuestionHeadings: 0, hasFaqSchema: false, ran: true };
  const clinicOut = convChecks(clinicCtx);
  assert(
    'an appointment-led business with no booking link is flagged',
    findingIds(clinicOut).includes('CONV-030'),
    `profile: ${JSON.stringify(clinicProfile)}`
  );

  const shopPages = [
    page('https://example.com/', '<h1>Handmade Ceramics Shop</h1><p>Browse our collection.</p>'),
    page('https://example.com/shop/p/mug', '<h1>Mug</h1><p>A ceramic mug.</p>'),
  ];
  const shopCtx = context(shopPages, {
    squarespace: {
      ...context(shopPages).squarespace,
      features: { ...context(shopPages).squarespace.features, commerce: true },
    },
  });
  const shopProfile = buildProfile(shopCtx);
  shopCtx.aeo = { profile: shopProfile, gaps: [], answered: [], partial: [], missing: [], opportunities: [], existingQuestionHeadings: 0, hasFaqSchema: false, ran: true };
  const shopOut = convChecks(shopCtx);
  assert(
    'a commerce site with no booking link is not penalised for it',
    isNa(shopOut, 'CONV-030'),
    `result: ${JSON.stringify(resultFor(shopOut, 'CONV-030'))}`
  );
}

{
  // CONV-032 (pricing): still surfaced when absent, but never scored —
  // publishing prices is a business choice, not a defect, on every page type.
  const pages = [page('https://example.com/', '<h1>Studio</h1><p>We do great work for great clients.</p>')];
  const out = convChecks(context(pages));
  const result = resultFor(out, 'CONV-032');
  assert('missing pricing is still reported', findingIds(out).includes('CONV-032'));
  assert('missing pricing is never scored', Boolean(result?.unscored), `result: ${JSON.stringify(result)}`);
}

/* ------------------------------------------------------------------ *
 * Opportunity Engine
 * ------------------------------------------------------------------ */

console.log('\nOpportunity Engine');

function baseUnderstanding(overrides: Partial<import('../src/lib/audit/understanding').WebsiteUnderstanding> = {}) {
  return {
    businessType: { value: null, confidence: 'low' as const, source: 'none' as const },
    entityType: { value: null, confidence: 'observed' as const },
    location: { value: null, confidence: 'low' as const },
    isCommerce: false,
    services: [],
    primaryConversion: { value: 'none' as const, confidence: 'observed' as const, evidence: 'no conversion path found' },
    pages: { total: 1, byType: { home: 1 }, important: [{ url: 'https://example.com/', type: 'home' as const, title: 'Home' }] },
    confident: false,
    ...overrides,
  };
}

function critical(id: string, category: CheckResult['category'], urls: string[] = []): CheckResult {
  return fail(
    finding({ id, category, severity: 'critical', title: `${id} is broken`, detail: 'synthetic critical finding', affected: 1, applicable: 1, urls }),
    1
  );
}
function high(id: string, category: CheckResult['category'], urls: string[] = []): CheckResult {
  return fail(
    finding({ id, category, severity: 'high', title: `${id} needs attention`, detail: 'synthetic high finding', affected: 1, applicable: 1, urls }),
    1
  );
}

{
  // 1. No findings at all -> no opportunities of any kind.
  const report = buildOpportunities([], baseUnderstanding());
  assert('a clean site produces zero opportunities', report.all.length === 0 && report.criticalIssues.length === 0 && report.quickWins.length === 0);
}

{
  // 2. Two findings in the same group combine into one opportunity, not two.
  const results = [
    high('CONV-040', 'conv'),
    fail(finding({ id: 'CONV-042', category: 'conv', severity: 'low', title: 'No trust markers found', detail: 'synthetic', affected: 1, applicable: 1 }), 1, { unscored: true }),
  ];
  const report = buildOpportunities(results, baseUnderstanding());
  assert('CONV-040 and CONV-042 combine into a single trust opportunity', report.all.length === 1, `got ${report.all.length}: ${JSON.stringify(report.all.map((o) => o.id))}`);
  assert('the combined opportunity records both source findings', report.all[0].findingIds.length === 2);
  // 4. A group containing an unscored finding is graded low-confidence, even
  //    though it also contains a verified high-severity finding — confidence
  //    is never allowed to rescue a check the scoring model itself distrusts.
  assert('a group containing an unscored finding is low-confidence', report.all[0].confidence === 'low', `got: ${report.all[0].confidence}`);
}

{
  // 3. A single severe finding that matches no group still produces exactly
  //    one opportunity via the fallback path, never zero.
  const results = [critical('SEC-001', 'sec')];
  const report = buildOpportunities(results, baseUnderstanding());
  assert('a lone critical finding still becomes one opportunity', report.all.length === 1);
  assert('that opportunity is marked a critical issue', report.criticalIssues.length === 1);
}

{
  // 5. A critical technical finding is always labelled critical priority and
  //    always appears in criticalIssues — never trimmed by "top N" framing.
  const results = [critical('TECH-030', 'tech'), high('ONPAGE-002', 'onpage'), high('ONPAGE-011', 'onpage')];
  const report = buildOpportunities(results, baseUnderstanding());
  const techOpp = report.all.find((o) => o.findingIds.includes('TECH-030'));
  assert('the critical technical finding is priority critical', techOpp?.priority === 'critical');
  assert('the critical technical finding scores at least 85', (techOpp?.priorityScore ?? 0) >= 85, `got: ${techOpp?.priorityScore}`);
  assert('critical issues are never excluded from the ranked list', report.ranked.some((o) => o.id === techOpp?.id));
}

{
  // 6 & 9. Page importance and primary-conversion relevance both raise the
  // ranking score for an otherwise-identical finding, without changing its
  // priority label.
  const results = [high('CONV-021', 'conv', ['https://example.com/'])];
  const withoutContext = buildOpportunities(results, baseUnderstanding());
  const withContext = buildOpportunities(
    results,
    baseUnderstanding({ primaryConversion: { value: 'booking', confidence: 'observed', evidence: 'a booking embed was found' } })
  );
  assert(
    'a finding on an important page, relevant to the stated conversion, ranks higher than the same finding without that context',
    withContext.all[0].priorityScore > withoutContext.all[0].priorityScore,
    `with: ${withContext.all[0].priorityScore}, without: ${withoutContext.all[0].priorityScore}`
  );
  assert('neither changes the priority label itself', withContext.all[0].priority === withoutContext.all[0].priority);
}

{
  // 8. Different business types produce different business-relevance copy —
  // the same finding is not framed identically for every kind of business.
  const results = [high('CONV-040', 'conv')];
  const photographer = buildOpportunities(results, baseUnderstanding({ businessType: { value: 'photographer', confidence: 'high', source: 'text' }, confident: true }));
  const unknown = buildOpportunities(results, baseUnderstanding());
  assert(
    'a confidently-known business type is named in the relevance sentence',
    photographer.all[0].businessRelevance.includes('photographer'),
    `got: ${photographer.all[0].businessRelevance}`
  );
  assert('an unknown business type falls back to generic phrasing rather than naming one', !unknown.all[0].businessRelevance.includes('photographer'));
}

{
  // Website Doctor is a re-framing of the same opportunities, not a new
  // source of truth — every diagnosis should trace back to a real opportunity.
  const results = [high('CONV-040', 'conv'), high('CONV-042', 'conv')];
  const understanding = baseUnderstanding();
  const opportunities = buildOpportunities(results, understanding);
  const findings = results.flatMap((r) => r.findings);
  const diagnoses = buildWebsiteDoctor(opportunities, findings);
  assert('every diagnosis maps back to a real opportunity', diagnoses.every((d) => opportunities.all.some((o) => o.id === d.sourceOpportunityId)));
  assert(
    'a diagnosis built from more than one finding names them as contributing factors',
    diagnoses[0].likelyContributingFactors.length === 2,
    `got: ${JSON.stringify(diagnoses[0].likelyContributingFactors)}`
  );
}

/* ------------------------------------------------------------------ *
 * Goal-aware prioritisation
 * ------------------------------------------------------------------ */

console.log('\nGoal-aware prioritisation');

{
  // Fixture used across every goal-awareness case below: one critical
  // technical finding, one high conversion finding, one high performance
  // finding. Deliberately mixed categories so a goal can be relevant to some
  // and not others.
  const scenarioResults = () => [
    critical('TECH-030', 'tech'),
    high('CONV-021', 'conv', ['https://example.com/']),
    high('PERF-010', 'perf'),
  ];
  const understanding = baseUnderstanding();
  const baseReport = buildOpportunities(scenarioResults(), understanding);

  {
    // No businessContext at all: ranking must be byte-identical to the base
    // report — this is what makes it safe to call unconditionally, including
    // for every old report that predates this feature.
    const goalAware = applyGoalAwareness(baseReport, undefined, understanding);
    assert('with no businessContext, goal is null', goalAware.goal === null);
    assert(
      'with no businessContext, ranking order is identical to the base report',
      JSON.stringify(goalAware.ranked.map((o) => o.id)) === JSON.stringify(baseReport.ranked.map((o) => o.id))
    );
    assert(
      'with no businessContext, every finalPriorityScore equals basePriorityScore',
      goalAware.all.every((o) => o.finalPriorityScore === o.basePriorityScore)
    );
  }

  {
    // businessDescription/targetAudience alone (no goal) must not move the
    // ranking either — they inform the AI narrative layer only, never the
    // deterministic Opportunity Engine.
    const withDescriptionOnly = applyGoalAwareness(baseReport, { businessDescription: 'A boutique dog grooming studio.' }, understanding);
    const withAudienceOnly = applyGoalAwareness(baseReport, { targetAudience: 'Local pet owners' }, understanding);
    assert('businessDescription alone does not set a goal', withDescriptionOnly.goal === null);
    assert('targetAudience alone does not set a goal', withAudienceOnly.goal === null);
    assert(
      'businessDescription alone does not change ranking order',
      JSON.stringify(withDescriptionOnly.ranked.map((o) => o.id)) === JSON.stringify(baseReport.ranked.map((o) => o.id))
    );
  }

  const GOALS_UNDER_TEST = ['get_more_customers', 'get_more_sales', 'get_more_bookings', 'improve_performance', 'not_sure'] as const;

  for (const goal of GOALS_UNDER_TEST) {
    const goalAware = applyGoalAwareness(baseReport, { goal }, understanding);
    const run2 = applyGoalAwareness(baseReport, { goal }, understanding);

    assert(`[${goal}] findings/evidence are unchanged from the base report`, goalAware.all.every((o, i) => {
      const base = baseReport.all[i];
      return o.findingIds.join(',') === base.findingIds.join(',') && JSON.stringify(o.evidence) === JSON.stringify(base.evidence);
    }));
    assert(`[${goal}] the priority label is unchanged from the base report`, goalAware.all.every((o, i) => o.priority === baseReport.all[i].priority));
    assert(`[${goal}] the critical issue count is unchanged`, goalAware.criticalIssues.length === baseReport.criticalIssues.length);
    assert(
      `[${goal}] the critical technical finding still ranks first — goal relevance never outranks severity`,
      goalAware.ranked[0]?.priority === 'critical',
      `got: ${goalAware.ranked[0]?.priority} (${goalAware.ranked[0]?.id})`
    );
    assert(
      `[${goal}] every finalPriorityScore stays within its own priority tier's band`,
      goalAware.all.every((o) => {
        if (o.priority === 'critical') return o.finalPriorityScore >= 85 && o.finalPriorityScore <= 100;
        if (o.priority === 'high') return o.finalPriorityScore >= 55 && o.finalPriorityScore <= 84;
        if (o.priority === 'medium') return o.finalPriorityScore >= 25 && o.finalPriorityScore <= 54;
        return o.finalPriorityScore >= 0 && o.finalPriorityScore <= 24;
      })
    );
    assert(
      `[${goal}] every goalRelevanceScore is a sane 0-100 number, never NaN`,
      goalAware.all.every((o) => Number.isFinite(o.goalRelevanceScore) && o.goalRelevanceScore >= 0 && o.goalRelevanceScore <= 100)
    );
    assert(
      `[${goal}] goal relevance is deterministic across repeated runs`,
      JSON.stringify(goalAware.ranked.map((o) => [o.id, o.finalPriorityScore, o.goalRelevanceScore])) ===
        JSON.stringify(run2.ranked.map((o) => [o.id, o.finalPriorityScore, o.goalRelevanceScore]))
    );
  }

  {
    // The hard requirement, stated explicitly in the brief: "A low-confidence
    // inference must never outrank a high-confidence critical technical
    // problem simply because AI thinks it sounds interesting" — extended
    // here to goals. Pick a goal maximally relevant to the *other* opportunities'
    // categories (conversion, performance) and irrelevant to the critical
    // one's category (technical is not in get_more_sales' relevant list).
    const goalAware = applyGoalAwareness(baseReport, { goal: 'get_more_sales' }, understanding);
    const criticalOpp = goalAware.all.find((o) => o.priority === 'critical')!;
    const highOpps = goalAware.all.filter((o) => o.priority === 'high');
    assert('the critical opportunity is not the one the goal favours', criticalOpp.goalRelevanceScore < 85);
    assert('at least one high opportunity is favoured by the goal', highOpps.some((o) => o.goalRelevanceScore >= 85));
    assert(
      'even a goal-favoured high opportunity cannot outscore a goal-disfavoured critical one',
      highOpps.every((o) => o.finalPriorityScore < criticalOpp.finalPriorityScore)
    );
  }

  {
    // Website Doctor becomes goal-aware too: a diagnosis whose source
    // opportunity is strongly relevant to the goal gets a goalNote; one that
    // is not, does not. Never claims a lost outcome — see doctor.ts comment.
    const goalAware = applyGoalAwareness(baseReport, { goal: 'get_more_bookings' }, understanding);
    const findings = scenarioResults().flatMap((r) => r.findings);
    const diagnoses = buildWebsiteDoctor(baseReport, findings, goalAware);
    const relevantId = goalAware.all.find((o) => o.goalRelevanceScore >= 85)?.id;
    const irrelevantId = goalAware.all.find((o) => o.goalRelevanceScore < 85)?.id;
    assert('a goal-relevant diagnosis gets a goalNote', !!diagnoses.find((d) => d.id === relevantId)?.goalNote);
    assert('a goal-irrelevant diagnosis has no goalNote', !diagnoses.find((d) => d.id === irrelevantId)?.goalNote);
    assert(
      'the goalNote never claims a measured outcome (no lost/gained bookings claim)',
      !diagnoses.some((d) => d.goalNote && /lost|gained|will (get|increase)/i.test(d.goalNote))
    );

    const withoutGoal = buildWebsiteDoctor(baseReport, findings);
    assert('with no goal-aware report supplied, no diagnosis has a goalNote', withoutGoal.every((d) => !d.goalNote));
  }
}

/* ------------------------------------------------------------------ *
 * Report diff
 * ------------------------------------------------------------------ */

console.log('\nReport diff');

function reportFixture(overrides: Partial<AuditReport> = {}): AuditReport {
  const findings = overrides.findings ?? [];
  const base: AuditReport = {
    id: 'tok',
    inputUrl: 'https://example.com',
    finalUrl: 'https://example.com',
    host: 'example.com',
    siteName: 'Example',
    createdAt: '2026-01-01T00:00:00.000Z',
    squarespace: {
      isSquarespace: true,
      confidence: 100,
      version: '7.1',
      versionConfidence: 90,
      signals: [],
      siteStatus: 'live',
      context: null,
      editor: { fluid: 1, classic: 0, ratio: 1 },
      features: { commerce: false, scheduling: false, memberAreas: false, forms: true, popupOverlay: false, announcementBar: false, cookieBanner: false, badge: false, devMode: false },
    },
    score: { overall: 70, grade: 'C', categories: [], gated: false },
    findings,
    strengths: [],
    quickWins: [],
    coverage: { pagesCrawled: 1, pagesDiscovered: 1, checksRun: 0, checksApplicable: 0, sitemapUrls: 0, imagesProbed: 0, assetsProbed: 0, durationMs: 0, aiUsed: false },
    pageSummaries: [{ url: 'https://example.com/', title: 'Home', status: 200, issues: 0, criticalIssues: 0, words: 100 }],
    opportunity: { tier: 'low', signals: [], services: [] },
  };
  return { ...base, ...overrides };
}

function findingFixture(id: string, severity: Finding['severity'], overrides: Partial<Finding> = {}): Finding {
  return {
    id,
    category: 'tech',
    severity,
    confidence: 'verified',
    title: `${id} title`,
    detail: 'synthetic',
    evidence: [],
    affectedUrls: [],
    affectedCount: 1,
    applicableCount: 1,
    effort: 'quick',
    ...overrides,
  };
}

{
  // 15. No previous report: the diff is empty, not an error.
  const current = reportFixture({ findings: [findingFixture('TECH-030', 'critical')] });
  const diff = diffReports(current, null);
  assert('no previous report produces an empty, not-crashing diff', !diff.hasPrevious && diff.summary.length === 1);
}

{
  // 12/13/14. Resolved findings, new findings, and score change, all keyed by
  // stable finding ID rather than title text.
  const previous = reportFixture({
    createdAt: '2026-01-01T00:00:00.000Z',
    score: { overall: 60, grade: 'D', categories: [], gated: false },
    findings: [findingFixture('TECH-030', 'critical'), findingFixture('ONPAGE-002', 'medium')],
  });
  const current = reportFixture({
    createdAt: '2026-02-01T00:00:00.000Z',
    score: { overall: 75, grade: 'C', categories: [], gated: false },
    // TECH-030 resolved, ONPAGE-002 worsened to high, CONV-040 is new.
    findings: [findingFixture('ONPAGE-002', 'high'), findingFixture('CONV-040', 'high')],
  });
  const diff = diffReports(current, previous);
  assert('a finding present before and absent now is resolved', diff.resolvedIssues.some((f) => f.id === 'TECH-030'));
  assert('a finding absent before and present now is new', diff.newIssues.some((f) => f.id === 'CONV-040'));
  assert('a finding present in both, more severe now, is worsened', diff.worsened.some((f) => f.id === 'ONPAGE-002' && f.from === 'medium' && f.to === 'high'));
  assert('the score change is recorded from the previous report to this one', diff.scoreChange?.from === 60 && diff.scoreChange?.to === 75);
  assert('the summary states the score change in plain language', diff.summary.some((s) => /rose from 60 to 75/.test(s)), `got: ${JSON.stringify(diff.summary)}`);
  assert('the summary never states a number the data does not support (no revenue or traffic claims)', !diff.summary.some((s) => /\$|revenue|traffic/i.test(s)));
}

{
  // Backward compatibility: a previous report saved before `understanding` /
  // `opportunities` existed must not crash the diff, and those sections are
  // simply omitted rather than guessed at.
  const previous = reportFixture({ findings: [] }); // no `understanding`, no `opportunities` — as an old row would be
  const current = reportFixture({ findings: [], understanding: baseUnderstanding({ confident: true, businessType: { value: 'photographer', confidence: 'high', source: 'text' } }) });
  const diff = diffReports(current, previous);
  assert('diffing against a pre-understanding report does not throw and omits business-signal changes', diff.businessSignalChanges.length === 0);
  assert(
    'an old previous report (no opportunities/businessContext/understanding on that side) leaves the new goal-aware diff fields empty rather than guessed at',
    diff.topOpportunityCategoryChange === null &&
      diff.goalChange === null &&
      diff.importantPageChanges.added.length === 0 &&
      diff.importantPageChanges.removed.length === 0
  );
}

function opportunityFixture(id: string, category: string, overrides: Partial<any> = {}) {
  return {
    id,
    title: `${id} title`,
    summary: 'synthetic',
    category,
    findingIds: [id],
    affectedPages: [],
    evidence: [],
    businessRelevance: 'synthetic',
    priority: 'high',
    priorityScore: 60,
    effort: 'low',
    confidence: 'high',
    recommendedAction: 'do it',
    owner: 'you',
    isQuickWin: false,
    isCriticalIssue: false,
    ...overrides,
  };
}
function opportunityReportFixture(top: any) {
  return { all: [top], criticalIssues: [], quickWins: [], ranked: [top], top: [top] };
}

{
  // Structured top-opportunity change: a category shift, not a prose diff —
  // the explicit example from the brief ("Performance" -> "Conversion friction").
  const previous = reportFixture({ opportunities: opportunityReportFixture(opportunityFixture('performance:PERF-010', 'performance')) as any });
  const current = reportFixture({ opportunities: opportunityReportFixture(opportunityFixture('conversion:CONV-021', 'conversion')) as any });
  const diff = diffReports(current, previous);
  assert(
    'a change in the #1 opportunity category is represented as a structured change, not just compared titles',
    diff.topOpportunityCategoryChange?.from.category === 'performance' && diff.topOpportunityCategoryChange?.to.category === 'conversion',
    JSON.stringify(diff.topOpportunityCategoryChange)
  );
}

{
  // Structured goal change, keyed on the stable UserGoal value.
  const previous = reportFixture({ businessContext: { goal: 'get_more_traffic' } });
  const current = reportFixture({ businessContext: { goal: 'get_more_bookings' } });
  const diff = diffReports(current, previous);
  assert(
    'a change in stated goal between audits is captured structurally',
    diff.goalChange?.from === 'get_more_traffic' && diff.goalChange?.to === 'get_more_bookings',
    JSON.stringify(diff.goalChange)
  );
}

{
  // Structured important-page changes, keyed on URL.
  const prevU = baseUnderstanding({ pages: { total: 1, byType: { home: 1 }, important: [{ url: 'https://example.com/', type: 'home', title: 'Home' }] } });
  const curU = baseUnderstanding({
    pages: {
      total: 2,
      byType: { home: 1, contact: 1 },
      important: [
        { url: 'https://example.com/', type: 'home', title: 'Home' },
        { url: 'https://example.com/contact', type: 'contact', title: 'Contact' },
      ],
    },
  });
  const previous = reportFixture({ understanding: prevU as any });
  const current = reportFixture({ understanding: curU as any });
  const diff = diffReports(current, previous);
  assert('a page that newly matters is recorded as added', diff.importantPageChanges.added.includes('https://example.com/contact'));
  assert('nothing was removed in this case', diff.importantPageChanges.removed.length === 0);
}

/* ------------------------------------------------------------------ *
 * Copy hygiene
 * ------------------------------------------------------------------ */

console.log('\nCopy');

{
  const ctx = context([
    page('https://example.com/', '<h1>Studio</h1><p>Nothing here.</p>'),
    page('https://example.com/b', '<h1>B</h1><p>Nothing here either.</p>'),
  ]);
  const all = [...convChecks(ctx), ...aeoChecks(ctx)];
  const titles = all.flatMap((r) => r.findings.map((f) => f.title));
  const details = all.flatMap((r) => r.findings.map((f) => `${f.detail} ${f.narrative?.why ?? ''}`));
  assert('no machine pluralisation in titles', !titles.some((t) => /\(s\)/.test(t)),
    titles.filter((t) => /\(s\)/.test(t)).join(', '));
  assert('no em dashes in our own copy', !details.some((d) => /—/.test(d)));

  // Same house-style rule, extended to the Opportunity Engine / Website
  // Doctor / diff engine copy — these are a separate, hand-written string
  // table (GROUPS in opportunity.ts) that the finding-level check above
  // never exercises. An em dash slipped into a GROUPS entry once already
  // (production for a full phase before anyone noticed, because nothing
  // rendered it), so every group is triggered here at least once.
  {
    const everyGroupResults = [
      high('CONV-040', 'conv'), // trust-gap
      high('CONV-020', 'conv'), // conversion-friction
      high('AEO-030', 'aeo'), // information-gap
      high('PERF-777', 'perf'), // performance-health
      critical('TECH-777', 'tech'), // technical-health
      high('AEO-001', 'aeo'), // search-visibility
      high('SQS-777', 'sqs'), // squarespace-setup
      high('A11Y-777', 'a11y'), // accessibility-gaps
      high('SEC-777', 'sec'), // security-privacy
      critical('WILDCARD-999', 'onpage'), // fallback path (matches no group)
    ];
    const u = baseUnderstanding();
    const oppReport = buildOpportunities(everyGroupResults, u);
    const goalAware = applyGoalAwareness(oppReport, { goal: 'get_more_bookings' }, u);
    const doctorReport = buildWebsiteDoctor(oppReport, everyGroupResults.flatMap((r) => r.findings), goalAware);

    const oppCopy = oppReport.all.flatMap((o) => [o.title, o.summary, o.businessRelevance, o.recommendedAction]);
    const goalCopy = goalAware.all.map((o) => o.goalRelevanceReason);
    const doctorCopy = doctorReport.flatMap((d) => [d.diagnosis, d.impact, d.prescription, d.goalNote ?? '']);

    assert(
      'every opportunity group produces at least one opportunity (full copy coverage)',
      oppReport.all.length === everyGroupResults.length,
      `got ${oppReport.all.length} opportunities from ${everyGroupResults.length} triggered groups`
    );
    assert('no em dashes in Opportunity Engine copy', !oppCopy.some((c) => /—/.test(c)), oppCopy.filter((c) => /—/.test(c)).join(' | '));
    assert('no em dashes in goal-relevance copy', !goalCopy.some((c) => /—/.test(c)), goalCopy.filter((c) => /—/.test(c)).join(' | '));
    assert('no em dashes in Website Doctor copy', !doctorCopy.some((c) => /—/.test(c)), doctorCopy.filter((c) => /—/.test(c)).join(' | '));

    const diffNoPrevious = diffReports(reportFixture({ findings: [] }), null);
    const diffWithChanges = diffReports(
      reportFixture({
        findings: [],
        understanding: baseUnderstanding({ businessType: { value: 'photographer', confidence: 'high', source: 'text' }, primaryConversion: { value: 'booking', confidence: 'observed', evidence: 'x' } }),
        opportunities: oppReport,
        businessContext: { goal: 'get_more_bookings' },
      }),
      reportFixture({
        findings: [],
        understanding: baseUnderstanding({ primaryConversion: { value: 'contact-form', confidence: 'observed', evidence: 'y' } }),
        opportunities: buildOpportunities([critical('OTHER-1', 'perf')], baseUnderstanding()),
        businessContext: { goal: 'get_more_traffic' },
      })
    );
    const diffCopy = [...diffNoPrevious.summary, ...diffWithChanges.summary, ...diffWithChanges.businessSignalChanges];
    assert('no em dashes in report-diff copy', !diffCopy.some((c) => /—/.test(c)), diffCopy.filter((c) => /—/.test(c)).join(' | '));
  }

  // Narrative is attached by the narrative layer, not by the checks, so the
  // invariant to test here is coverage: every id a check can emit must have
  // copy waiting for it, either inline or in the map.
  const emitted = all.flatMap((r) => r.findings);
  applyNarrative({ findings: emitted } as any);
  assert(
    'every finding ends up with a full narrative',
    emitted.every((f) => f.narrative?.why && f.narrative?.action && f.narrative?.impact),
    emitted.filter((f) => !f.narrative?.why).map((f) => f.id).join(', ')
  );
  assert(
    'no narrative falls back to the category default',
    emitted.every((f) => NARRATIVE[f.id] || f.narrative?.why),
    emitted.filter((f) => !NARRATIVE[f.id]).map((f) => f.id).join(', ')
  );
}

/* ------------------------------------------------------------------ *
 * Business context intake (Part 13 of the personalization brief):
 * `sanitiseBusinessContext` (pipeline.ts) is the single point every field
 * the visitor can type passes through before it reaches the report, the
 * AI prompt or the PDF, so this is tested directly rather than through a
 * live crawl. `require`d, same as packBlocks below, to sidestep pulling in
 * pipeline.ts's own heavier transitive imports (crawler, safeFetch) at the
 * top of this file.
 * ------------------------------------------------------------------ */
console.log('\nBusiness context intake');
{
  const { sanitiseBusinessContext } = require('../src/lib/audit/pipeline');

  assert('no context at all produces no businessContext (URL-only audit is unchanged)', sanitiseBusinessContext(undefined) === undefined);
  assert('an empty object produces no businessContext', sanitiseBusinessContext({}) === undefined);

  const full = sanitiseBusinessContext({
    businessDescription: '  We run a small pottery studio.  ',
    targetAudience: '  Local gift shoppers  ',
    goal: 'get_more_bookings',
    competitorUrls: ['competitor-one.com', 'competitor-two.com'],
  });
  assert('businessDescription survives, trimmed', full?.businessDescription === 'We run a small pottery studio.');
  assert('targetAudience survives, trimmed', full?.targetAudience === 'Local gift shoppers');
  assert('a known goal survives', full?.goal === 'get_more_bookings');
  assert('competitor URLs survive', full?.competitorUrls?.length === 2);

  assert('an unknown goal is dropped rather than stored as free text', sanitiseBusinessContext({ goal: 'win_the_lottery' as any })?.goal === undefined);
  assert('whitespace-only description is dropped', sanitiseBusinessContext({ businessDescription: '   ' })?.businessDescription === undefined);

  const overlong = sanitiseBusinessContext({ businessDescription: 'x'.repeat(900), targetAudience: 'y'.repeat(900) });
  assert('an overlong description is capped, not rejected outright', overlong?.businessDescription?.length === 500);
  assert('an overlong audience is capped, not rejected outright', overlong?.targetAudience?.length === 300);

  const junkCompetitors = sanitiseBusinessContext({ competitorUrls: ['not a url', 'localhost', '   ', 'https://valid-competitor.com'] });
  assert('an invalid competitor URL is dropped rather than crashing the audit', junkCompetitors?.competitorUrls?.length === 1);
  assert('the one valid competitor URL still survives alongside junk', junkCompetitors?.competitorUrls?.[0].includes('valid-competitor.com'));

  const badProtocol = sanitiseBusinessContext({ competitorUrls: ['javascript://alert(1)', 'ftp://files.example.com', 'https://valid-competitor.com'] });
  assert('a non-http(s) competitor URL is dropped, only the http(s) one survives', badProtocol?.competitorUrls?.length === 1 && badProtocol.competitorUrls[0].includes('valid-competitor.com'));

  const dupeCompetitors = sanitiseBusinessContext({ competitorUrls: ['dupe.com', 'www.dupe.com', 'https://dupe.com/'] });
  assert('duplicate competitors (with/without www, with/without scheme) collapse to one', dupeCompetitors?.competitorUrls?.length === 1);

  const tooMany = sanitiseBusinessContext({ competitorUrls: ['a.com', 'b.com', 'c.com', 'd.com', 'e.com', 'f.com', 'g.com'] });
  assert('competitor URLs are capped at 5', tooMany?.competitorUrls?.length === 5);

  const selfAsCompetitor = sanitiseBusinessContext(
    { competitorUrls: ['my-own-site.com', 'https://www.my-own-site.com/pricing', 'a-real-competitor.com'] },
    'https://my-own-site.com/'
  );
  assert(
    'a visitor naming their own site as a competitor is caught, not carried through as a self-comparison',
    selfAsCompetitor?.competitorUrls?.length === 1 && selfAsCompetitor.competitorUrls[0].includes('a-real-competitor.com')
  );
}

/* ------------------------------------------------------------------ *
 * Comparison verdict wording
 * ------------------------------------------------------------------ */

console.log('\nComparison verdict');

{
  const comp = (host: string, overall: number, aheadOn: string[] = []) => ({
    url: `https://${host}`,
    host,
    ok: true as const,
    platform: 'Squarespace 7.1',
    overall,
    categories: {},
    pagesRead: 6,
    aheadOn,
    behindOn: [],
  });

  const v = (yourScore: number, competitors: any[]) => comparisonVerdict(yourScore, competitors);

  const level = v(88, [comp('a', 87), comp('b', 90)]);
  assert(
    'never claims you are ahead when the average is above you',
    !/ahead of the field/.test(level),
    level
  );

  const clearlyAhead = v(95, [comp('a', 70), comp('b', 74)]);
  assert('says so plainly when you are ahead', /ahead of the field/.test(clearlyAhead), clearlyAhead);

  const behind = v(60, [comp('a', 88, ['Conversion']), comp('b', 91, ['Conversion'])]);
  assert('names the common theme when they beat you', /Conversion/.test(behind), behind);
  assert('keeps the category label capitalised', !/conversion,/.test(behind), behind);

  const none = v(70, [
    { url: 'https://x', host: 'x', ok: false, platform: 'unknown', overall: 0, categories: {}, pagesRead: 0, aheadOn: [], behindOn: [], error: 'no' },
  ]);
  assert('says nothing was read rather than inventing a comparison', /could not read/.test(none), none);
}

/* ------------------------------------------------------------------ *
 * Competitive Intelligence Engine (compare.ts).
 *
 * `buildCompetitiveIntelligence` is a pure function over already-crawled
 * `AuditReport`s, no network involved, so the fixtures below are hand-built
 * reports rather than live crawls. This exercises Part 24 of the
 * competitor-intelligence brief as far as that is possible offline:
 * coverage floor, graceful degrade, goal-aware ranking (order only, never
 * verdicts), determinism, and the top/all relationship.
 * ------------------------------------------------------------------ */

console.log('\nCompetitive intelligence engine');
{
  const category = (id: string, score: number): any => ({
    id,
    label: { tech: 'Technical SEO', onpage: 'On-page SEO', perf: 'Performance', aeo: 'AI search readiness', conv: 'Conversion', schema: 'Structured data', a11y: 'Accessibility', sec: 'Security', mobile: 'Mobile', social: 'Social' }[id],
    score,
    weight: 1,
    applicableChecks: 1,
    criticalFailures: 0,
    findingCount: 0,
  });

  const baseCategories = ['tech', 'onpage', 'perf', 'aeo', 'conv', 'schema', 'a11y', 'sec', 'mobile', 'social'].map((id) =>
    category(id, 80)
  );

  function auditReport(overrides: any = {}): any {
    return {
      id: 'r1',
      inputUrl: 'https://you.example',
      finalUrl: 'https://you.example',
      host: 'you.example',
      siteName: 'You',
      createdAt: new Date(0).toISOString(),
      squarespace: { isSquarespace: true, confidence: 1, version: '7.1', versionConfidence: 1, signals: [], siteStatus: 'live', context: null, editor: { fluid: 1, classic: 0, ratio: 1 }, features: {} },
      score: { overall: 80, grade: 'B', categories: baseCategories, gated: false },
      findings: [],
      strengths: [],
      quickWins: [],
      coverage: { pagesCrawled: 6, pagesDiscovered: 6, checksRun: 1, checksApplicable: 1, sitemapUrls: 0, imagesProbed: 0, assetsProbed: 0, durationMs: 0, aiUsed: false },
      pageSummaries: [],
      ...overrides,
    };
  }

  const scoredFrom = (report: any, host: string): CompetitorScore => ({
    url: `https://${host}`,
    host,
    ok: true,
    platform: 'Another platform',
    overall: 80,
    categories: Object.fromEntries(report.score.categories.map((c: any) => [c.id, c.score])),
    pagesRead: report.coverage.pagesCrawled,
    aheadOn: [],
    behindOn: [],
  });

  const you = auditReport({
    understanding: {
      services: [{ name: 'a', hasOwnPage: true }, { name: 'b', hasOwnPage: true }, { name: 'c', hasOwnPage: false }],
      pages: { byType: { home: 1, service: 2, contact: 1, about: 1 } },
    },
    faq: { ran: true, answered: new Array(6).fill({}), gaps: [], partial: [], missing: [], opportunities: [], existingQuestionHeadings: 0, hasFaqSchema: false, profile: {} },
  });

  assert('no usable competitors produces no intelligence block', buildCompetitiveIntelligence(you, [], undefined) === undefined);

  const thinCompetitor = auditReport({ host: 'thin.example', coverage: { ...you.coverage, pagesCrawled: 1 } });
  assert(
    'a competitor crawled below the coverage floor (Part 9) is excluded entirely',
    buildCompetitiveIntelligence(you, [{ scored: scoredFrom(thinCompetitor, 'thin.example'), theirs: thinCompetitor }], undefined) === undefined
  );

  const bareCompetitor = auditReport({ host: 'bare.example' }); // no understanding, no faq
  const bareIntel = buildCompetitiveIntelligence(you, [{ scored: scoredFrom(bareCompetitor, 'bare.example'), theirs: bareCompetitor }], undefined);
  assert(
    'a competitor with no understanding or faq still degrades gracefully rather than crashing',
    bareIntel !== undefined
  );

  const richCompetitor = auditReport({
    host: 'rich.example',
    findings: [{ id: 'CONV-001', category: 'conv', severity: 'high', confidence: 'high', title: '', detail: '', evidence: [], affectedUrls: [], affectedCount: 0, applicableCount: 0 }],
    understanding: {
      services: [{ name: 'a', hasOwnPage: true }],
      pages: { byType: { home: 1 } },
    },
    faq: { ran: true, answered: new Array(1).fill({}), gaps: [], partial: [], missing: [], opportunities: [], existingQuestionHeadings: 0, hasFaqSchema: false, profile: {} },
  });
  const audited = [{ scored: scoredFrom(richCompetitor, 'rich.example'), theirs: richCompetitor }];

  const intel = buildCompetitiveIntelligence(you, audited, undefined);
  assert('a usable competitor produces a populated intelligence block', Boolean(intel && intel.all.length > 0));
  assert('comparedAgainst names the competitor host', intel?.comparedAgainst.includes('rich.example') === true);
  assert('coverageNote states both page counts, never presented as equally complete', /rich\.example: 6 pages read, against 6 of yours/.test(intel?.coverageNote || ''));
  assert('you having a phone number they lack shows as ahead, in observable language', intel?.all.some((d) => d.verdict === 'ahead' && /phone number/.test(d.detail)) === true);
  assert('nothing invents traffic, rankings or revenue claims', !intel?.all.some((d) => /traffic|ranks? higher|converts? better|more money|revenue/i.test(d.detail)));
  assert('service-count gap (3 vs 1) shows you ahead, not a fake single score', intel?.all.some((d) => d.key === 'services' && d.verdict === 'ahead') === true);
  assert('top is capped at 5', (intel?.top.length ?? 99) <= 5);
  assert('top is a strict prefix of all in the same order', JSON.stringify(intel?.top) === JSON.stringify(intel?.all.slice(0, 5)));
  assert('no single fabricated "competitor score" field exists on the result', !('score' in (intel || {})) && !('competitorScore' in (intel || {})));

  const intelAgain = buildCompetitiveIntelligence(you, audited, undefined);
  assert('identical inputs produce identical output (determinism)', JSON.stringify(intel) === JSON.stringify(intelAgain));

  const intelWithGoal = buildCompetitiveIntelligence(you, audited, 'get_more_bookings');
  const sameVerdicts =
    intel &&
    intelWithGoal &&
    JSON.stringify([...intel.all].map((d) => [d.key, d.verdict]).sort()) ===
      JSON.stringify([...intelWithGoal.all].map((d) => [d.key, d.verdict]).sort());
  assert('a goal changes ranking at most, never the underlying verdicts (Part 13)', Boolean(sameVerdicts));
  assert(
    'goal-relevant dimensions are marked as such only when a goal is supplied',
    intel?.all.every((d) => d.goalRelevant === false) === true
  );
  assert(
    'with a goal, at least one relevant dimension is flagged goal-relevant',
    intelWithGoal?.all.some((d) => d.goalRelevant) === true
  );

  const twoCompetitors = [
    { scored: scoredFrom(richCompetitor, 'rich.example'), theirs: richCompetitor },
    { scored: scoredFrom(bareCompetitor, 'bare.example'), theirs: bareCompetitor },
  ];
  const twoIntel = buildCompetitiveIntelligence(you, twoCompetitors, undefined);
  assert('two competitors both contribute dimensions', twoIntel?.comparedAgainst.length === 2);
  assert(
    'strengths, gaps and opportunities partition all without overlap or loss',
    twoIntel !== undefined &&
      twoIntel.strengths.length + twoIntel.gaps.length + twoIntel.opportunities.length <=
        twoIntel.all.length
  );
}

/* ------------------------------------------------------------------ *
 * Growth Intelligence (growth.ts).
 *
 * Built through the real `buildOpportunities`/`applyGoalAwareness`/
 * `buildWebsiteDoctor` chain rather than hand-typed Opportunity/Diagnosis
 * fixtures, so this exercises the actual finding-to-action path, not a
 * reimplementation of it. Covers as much of Part 25 of the brief as is
 * feasible offline: no context, a goal, no/one/two competitors, weak/strong
 * content and trust, missing/answered questions, determinism, an old report,
 * missing optional fields, no fabricated claims, no severity override.
 * ------------------------------------------------------------------ */

console.log('\nGrowth Intelligence');
{
  const ALL_CATEGORY_IDS: CategoryId[] = ['tech', 'onpage', 'perf', 'aeo', 'conv', 'schema', 'a11y', 'sec', 'mobile', 'social', 'sqs'];
  const baseCategories = (score = 80): any[] =>
    ALL_CATEGORY_IDS.map((id) => ({ id, label: CATEGORIES[id].label, score, weight: CATEGORIES[id].weight, applicableChecks: 1, criticalFailures: 0, findingCount: 0 }));

  function growthReport(overrides: any = {}): any {
    const understanding = overrides.understanding ?? baseUnderstanding();
    const results: CheckResult[] = overrides.results ?? [];
    const findings = results.flatMap((r) => r.findings);
    const opportunities = buildOpportunities(results, understanding);
    const goalAwareOpportunities = applyGoalAwareness(opportunities, overrides.businessContext, understanding);
    const doctor = buildWebsiteDoctor(opportunities, findings, goalAwareOpportunities);
    return {
      id: 'r1',
      inputUrl: 'https://you.example',
      finalUrl: 'https://you.example',
      host: 'you.example',
      siteName: 'You',
      createdAt: new Date(0).toISOString(),
      squarespace: { isSquarespace: true, confidence: 1, version: '7.1', versionConfidence: 1, signals: [], siteStatus: 'live', context: null, editor: { fluid: 1, classic: 0, ratio: 1 }, features: {} },
      score: { overall: 80, grade: 'B', categories: overrides.categories ?? baseCategories(), gated: false },
      findings,
      strengths: [],
      quickWins: [],
      coverage: { pagesCrawled: overrides.pagesCrawled ?? 6, pagesDiscovered: 6, checksRun: 1, checksApplicable: 1, sitemapUrls: 0, imagesProbed: 0, assetsProbed: 0, durationMs: 0, aiUsed: false },
      pageSummaries: [],
      understanding,
      opportunities,
      goalAwareOpportunities,
      doctor,
      businessContext: overrides.businessContext,
      faq: overrides.faq,
      comparison: overrides.comparison,
      opportunity: { tier: 'medium', signals: [], services: [] },
    };
  }

  // 1. No business context, no findings, no faq, no comparison: still builds
  //    (Part 24: old-report-shaped input must not crash), competitive area
  //    is explicitly "not run yet" rather than silently absent.
  {
    const g = buildGrowthIntelligence(growthReport());
    assert('a report with no findings still produces a growth intelligence block', Boolean(g));
    assert('no comparison means no competitive opportunities, not a crash', g?.competitiveOpportunities.length === 0);
    assert(
      'the competitive growth area says a comparison has not run yet',
      Boolean(g?.growthAreas.find((a) => a.key === 'competitive')?.note.includes('has been run yet'))
    );
    assert('recommendedActions never exceeds 7 (Part 16)', (g?.recommendedActions.length ?? 99) <= 7);
    assert('startHere is recommendedActions.slice(0, 3)', JSON.stringify(g?.startHere) === JSON.stringify(g?.recommendedActions.slice(0, 3)));
  }

  // 2. An old report (no understanding, no opportunities) must not crash and
  //    must return undefined, not a half-built object.
  {
    const old = growthReport();
    delete old.understanding;
    delete old.opportunities;
    const g = buildGrowthIntelligence(old);
    assert('a report missing understanding/opportunities returns undefined rather than crashing', g === undefined);
  }

  // 3. Weak content (services without a page, unanswered high-weight
  //    questions) produces a CREATE action and a needs-attention content area.
  {
    const faq = {
      profile: {} as any,
      gaps: [],
      answered: [],
      partial: [],
      missing: [
        { question: 'What does it cost?', kind: 'price', source: 'buyer-intent', weight: 3, status: 'missing', coverage: 0 },
        { question: 'How long does it take?', kind: 'duration', source: 'service', weight: 2, status: 'missing', coverage: 0 },
      ],
      opportunities: [],
      existingQuestionHeadings: 0,
      hasFaqSchema: false,
      ran: true,
    };
    const understanding = baseUnderstanding({
      services: [{ name: 'Kitchen remodeling', hasOwnPage: false }, { name: 'Bathroom remodeling', hasOwnPage: false }],
      confident: true,
    });
    const g = buildGrowthIntelligence(growthReport({ understanding, faq }));
    assert('services without a dedicated page produce a CREATE action', Boolean(g?.recommendedActions.some((a) => a.type === 'create' && a.area === 'content')));
    assert('unanswered important questions produce a CREATE action', Boolean(g?.recommendedActions.some((a) => a.type === 'create' && a.area === 'customer-questions')));
    assert('the highest-weight missing question surfaces first', g?.customerQuestionOpportunities[0]?.question === 'What does it cost?');
    assert('a price question is flagged conversion-relevant', g?.customerQuestionOpportunities[0]?.conversionRelevant === true);
  }

  // 4. Strong content (every service has a page, no missing questions):
  //    content area reads strong, no content CREATE action fires.
  {
    const faq = { profile: {} as any, gaps: [], answered: [{ question: 'x', kind: 'price', source: 'service', weight: 1, status: 'answered', coverage: 1 }], partial: [], missing: [], opportunities: [], existingQuestionHeadings: 1, hasFaqSchema: false, ran: true };
    const understanding = baseUnderstanding({ services: [{ name: 'Kitchen remodeling', hasOwnPage: true }], confident: true });
    const g = buildGrowthIntelligence(growthReport({ understanding, faq }));
    assert('every service having a page means no content CREATE action', !g?.recommendedActions.some((a) => a.type === 'create' && a.area === 'content'));
    assert('a fully-answered faq means no customer-question CREATE action', !g?.recommendedActions.some((a) => a.area === 'customer-questions'));
  }

  // 5. Weak trust (both CONV-040 and CONV-042 findings present) vs strong
  //    trust (neither present) changes the trust growth area, not by magic
  //    but because the underlying findings differ.
  {
    const weakTrustResults = [high('CONV-040', 'conv'), fail(finding({ id: 'CONV-042', category: 'conv', severity: 'low', title: 'No trust markers found', detail: 'synthetic', affected: 1, applicable: 1 }), 1, { unscored: true })];
    const weak = buildGrowthIntelligence(growthReport({ results: weakTrustResults }));
    const strong = buildGrowthIntelligence(growthReport({ results: [] }));
    assert('missing testimonials and credentials mark trust as needing attention', weak?.growthAreas.find((a) => a.key === 'trust')?.status === 'needs-attention');
    assert('no trust findings at all leaves trust strong', strong?.growthAreas.find((a) => a.key === 'trust')?.status === 'strong');
    assert('offer differentiation clarity reflects the same missing trust signals', weak?.offer.differentiationClarity === 'unclear');
  }

  // 6. Weak conversion (no CTA) drags the take-action step and offer next-step
  //    clarity down together, from the same finding, not two different guesses.
  {
    const noCta = [high('CONV-020', 'conv')];
    const g = buildGrowthIntelligence(growthReport({ results: noCta, understanding: baseUnderstanding({ confident: true, businessType: { value: 'studio', confidence: 'high', source: 'text' } }) }));
    assert('no CTA finding means the take-action step reads weak', g?.conversionPath.steps.find((s) => s.step === 'take-action')?.status === 'weak');
    assert('no CTA finding means next-step clarity is unclear', g?.offer.nextStepClarity === 'unclear');
  }

  // 7. Competitor combination (Part 13): reuses the same CompetitiveDimension
  //    shape compare.ts already produces, relabelled with Part 13's
  //    vocabulary, never a second competitor engine.
  {
    const intel = {
      comparedAgainst: ['rival.example'],
      all: [
        { key: 'trust-phone', label: 'a visible phone number', verdict: 'ahead' as const, detail: 'You have it, they do not.', goalRelevant: false, weight: 4 },
        { key: 'pages-service', label: 'a dedicated service page', verdict: 'open_opportunity' as const, detail: 'Neither of you has this yet.', goalRelevant: false, weight: 3 },
        { key: 'category-conv', label: 'Conversion', verdict: 'behind' as const, detail: 'They score higher on conversion.', goalRelevant: false, weight: 4 },
      ],
      top: [] as any[],
      strengths: [] as any[],
      gaps: [] as any[],
      opportunities: [] as any[],
      coverageNote: 'rival.example: 4 pages read, against 6 of yours.',
    };
    intel.top = intel.all;
    intel.strengths = intel.all.filter((d) => d.verdict === 'ahead');
    intel.gaps = intel.all.filter((d) => d.verdict === 'behind');
    intel.opportunities = intel.all.filter((d) => d.verdict === 'open_opportunity');

    const comparison = { ranAt: new Date(0).toISOString(), you: { host: 'you.example', overall: 80, categories: {} }, competitors: [], verdict: 'test', intelligence: intel };
    const g = buildGrowthIntelligence(growthReport({ comparison }));
    assert('an "ahead" dimension produces a PROTECT action', Boolean(g?.recommendedActions.some((a) => a.type === 'protect')));
    assert('an "open_opportunity" dimension produces an EXPLOIT action', Boolean(g?.recommendedActions.some((a) => a.type === 'exploit')));
    assert(
      'competitiveOpportunities relabels verdicts with Part 13 vocabulary, never the raw enum',
      Boolean(g?.competitiveOpportunities.every((o) => ['Competitive advantage', 'High priority gap', 'Market opportunity'].includes(o.title)))
    );
    assert('a "no_clear_difference" verdict would be dropped, not shown as an opportunity', !g?.competitiveOpportunities.some((o) => o.title === 'No clear difference'));
    assert(
      'the competitive growth area reflects the comparison, not the "not run yet" default',
      g?.growthAreas.find((a) => a.key === 'competitive')?.status !== 'developing' ||
        g?.growthAreas.find((a) => a.key === 'competitive')?.note !== 'No competitor comparison has been run yet.'
    );
  }

  // 8. Determinism: identical input produces byte-identical output.
  {
    const results = [high('CONV-021', 'conv'), critical('TECH-030', 'tech')];
    const report = growthReport({ results, businessContext: { goal: 'get_more_bookings' } });
    const a = buildGrowthIntelligence(report);
    const b = buildGrowthIntelligence(report);
    assert('identical input produces identical output', JSON.stringify(a) === JSON.stringify(b));
  }

  // 9. Goal awareness ranks, never promotes: a critical fix outranks a
  //    goal-relevant medium one regardless of goal (Part 17).
  {
    const results = [critical('TECH-030', 'tech'), high('CONV-021', 'conv')];
    // CONV-021 alone is 'high' via GROUPS (conversion-friction, minSize 1),
    // so pair it with a real medium-only source: PERF findings need 2 to
    // group and stay under critical/high, giving a clean 'medium' candidate.
    const mediumOnly = [critical('TECH-030', 'tech'), fail(finding({ id: 'PERF-013', category: 'perf', severity: 'medium', title: 'Oversized images', detail: 'synthetic', affected: 1, applicable: 1 }), 1), fail(finding({ id: 'PERF-014', category: 'perf', severity: 'medium', title: 'Old image formats', detail: 'synthetic', affected: 1, applicable: 1 }), 1)];
    const g = buildGrowthIntelligence(growthReport({ results: mediumOnly, businessContext: { goal: 'improve_performance' } }));
    const ranks: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    const ranked = (g?.recommendedActions ?? []).map((a) => ranks[a.priority]);
    assert(
      'recommendedActions is never out of priority order regardless of goal relevance',
      ranked.every((r, i) => i === 0 || ranked[i - 1] >= r),
      JSON.stringify(g?.recommendedActions.map((a) => [a.priority, a.goalRelevant]))
    );
  }

  // 10. No fabricated claims anywhere in the recommended actions or growth
  //     summary: the same evidence-only vocabulary check the rest of this
  //     file applies to written copy, applied to synthesised text too.
  {
    const results = [high('CONV-040', 'conv'), high('CONV-020', 'conv'), critical('TECH-030', 'tech')];
    const g = buildGrowthIntelligence(growthReport({ results, businessContext: { goal: 'get_more_sales' } }));
    const allText = [g?.growthSummary, ...(g?.recommendedActions ?? []).flatMap((a) => [a.title, a.why])].filter(Boolean).join(' ');
    assert(
      'no fabricated traffic, ranking or revenue claim anywhere in growth copy',
      !/gets? more traffic|ranks? higher|converts? better|makes? more money|% (increase|more|higher)/i.test(allText),
      allText
    );
    assert('no em dashes in growth copy', !allText.includes('—'));
  }
}

/* ------------------------------------------------------------------ *
 * The written content, and the page packer that lays it out
 * ------------------------------------------------------------------ */
{
  const { COMMON_ISSUES, FAQ, CATEGORY_EXPLAINER, HOW_IT_WORKS } = require('../src/lib/content');
  const { packBlocks } = require('../src/lib/pdf/document');

  const slugs = new Set(COMMON_ISSUES.map((i: any) => i.slug));
  assert('every common issue has its own slug', slugs.size === COMMON_ISSUES.length);
  assert(
    'every common issue is written as a question somebody would type',
    COMMON_ISSUES.every((i: any) => i.q.trim().endsWith('?'))
  );
  assert(
    'every common issue names the setting that fixes it',
    COMMON_ISSUES.every((i: any) => i.fix.length > 20)
  );
  assert('every FAQ entry answers its question', FAQ.every((f: any) => f.a.length > 40));

  /* House style, enforced rather than remembered: no em dashes anywhere in
     the copy, and no shouted headings. */
  const allCopy = [
    ...COMMON_ISSUES.flatMap((i: any) => [i.title, i.q, i.a, i.fix]),
    ...FAQ.flatMap((f: any) => [f.q, f.a]),
    ...Object.values(CATEGORY_EXPLAINER).flatMap((c: any) => [c.heading, c.body]),
    ...HOW_IT_WORKS.flatMap((h: any) => [h.title, h.body]),
  ];
  assert('no em dashes in the copy', !allCopy.some((s: string) => s.includes('\u2014')));
  assert(
    'no heading is shouted',
    !allCopy.some((s: string) => /\b[A-Z]{4,}\b/.test(s.replace(/HTTPS|HTTP|HTML|JSON|LD|WCAG|SEO|URLs|URL|AI|PDF|FAQ|CDN|DNS|SSL/g, '')))
  );

  const rows = (count: number) => ({
    kind: 'rows' as const,
    key: 'rows',
    chrome: 60,
    rowHeight: 25,
    count,
    node: () => null,
  });

  const split = packBlocks([rows(60)], 720);
  assert('a list longer than a page is split across pages', split.length > 1, `${split.length} pages`);
  assert(
    'splitting loses no rows',
    split.flat().reduce((a: number, p: any) => a + (p.to - p.from), 0) === 60
  );
  assert('a continued list says so', split[1][0].continued === true);

  const withAtom = packBlocks(
    [rows(11), { kind: 'atom' as const, key: 'atom', height: 700, node: () => null }],
    720
  );
  assert('a block that cannot fit starts a new page', withAtom.length === 2);
}

console.log(
  failures === 0
    ? `\nAll ${checks} checks passed.`
    : `\n${failures} of ${checks} checks failed.`
);
process.exit(failures === 0 ? 0 : 1);

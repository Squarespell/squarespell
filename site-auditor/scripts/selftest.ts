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
import { buildOpportunities } from '../src/lib/audit/opportunity';
import { buildWebsiteDoctor } from '../src/lib/audit/doctor';
import type { AuditContext } from '../src/lib/audit/context';
import { finding, fail } from '../src/lib/audit/context';
import { applyNarrative, NARRATIVE } from '../src/lib/audit/narrative';
import { comparisonVerdict } from '../src/lib/audit/compare';
import type { CheckResult, PageData, AuditReport, Finding } from '../src/lib/audit/types';
import { diffReports } from '../src/lib/audit/diff';

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

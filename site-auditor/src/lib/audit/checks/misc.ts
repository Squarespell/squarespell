/** Structured data, social sharing, accessibility, mobile, security and privacy. */

import { AuditContext, count, fail, finding, na, pass, truncate, verb } from '../context';
import type { CheckResult } from '../types';
import { pathOf } from '../url';

const TRACKERS: Array<{ re: RegExp; name: string }> = [
  { re: /googletagmanager\.com\/gtag\/js\?id=G-/i, name: 'Google Analytics 4' },
  { re: /googletagmanager\.com\/gtm\.js/i, name: 'Google Tag Manager' },
  { re: /google-analytics\.com/i, name: 'Google Analytics' },
  { re: /connect\.facebook\.net/i, name: 'Meta Pixel' },
  { re: /analytics\.tiktok\.com/i, name: 'TikTok Pixel' },
  { re: /snap\.licdn\.com/i, name: 'LinkedIn Insight Tag' },
  { re: /clarity\.ms/i, name: 'Microsoft Clarity' },
  { re: /static\.hotjar\.com/i, name: 'Hotjar' },
  { re: /bat\.bing\.com/i, name: 'Microsoft Ads UET' },
  { re: /ct\.pinterest\.com/i, name: 'Pinterest Tag' },
  { re: /js\.hs-scripts\.com/i, name: 'HubSpot' },
];

const CMP_RE =
  /cookiebot|cookielaw|onetrust|cookieyes|termly|iubenda|usercentrics|osano|complianz|cookie-script|klaro|civicuk|__tcfapi|gtag\('consent'/i;

export function schemaChecks(ctx: AuditContext): CheckResult[] {
  const out: CheckResult[] = [];
  const pages = ctx.htmlPages;
  const N = Math.max(1, pages.length);
  const home = ctx.homepage;

  const broken = pages.flatMap((p) => p.jsonLd.filter((b) => b.error).map((b) => ({ page: p.url, err: b.error! })));
  if (broken.length) {
    out.push(
      fail(
        finding({
          id: 'SCHEMA-002',
          category: 'schema',
          severity: 'high',
          title: 'Some structured data on your site is invalid and being ignored',
          detail:
            'A structured-data block failed to parse. Search engines discard invalid blocks entirely, so any rich result it was meant to produce is lost.',
          evidence: broken.slice(0, 3).map((b) => ({ label: pathOf(b.page), value: truncate(b.err, 120), url: b.page })),
          urls: broken.map((b) => b.page),
          affected: broken.length,
          applicable: Math.max(1, pages.reduce((a, p) => a + p.jsonLd.length, 0)),
        }),
        Math.max(1, pages.reduce((a, p) => a + p.jsonLd.length, 0))
      )
    );
  } else {
    out.push(pass('SCHEMA-002', 'schema', 'high', N));
  }

  const allTypes = new Set(pages.flatMap((p) => p.schemaTypes));
  const hasOrg = allTypes.has('Organization') || Array.from(allTypes).some((t) => /LocalBusiness|Dentist|Restaurant|Attorney|HairSalon|MedicalClinic|ProfessionalService/.test(t));
  if (!hasOrg) {
    out.push(
      fail(
        finding({
          id: 'SCHEMA-030',
          category: 'schema',
          severity: 'high',
          title: 'Your business is not described in structured data',
          detail:
            'Squarespace outputs a basic WebSite block and nothing else. Without an Organization or LocalBusiness block there is nothing telling Google your business name, address, phone number, opening hours or service area in a machine-readable way, which is what feeds knowledge panels and the local map pack.',
          evidence: [
            { label: 'Schema types found on the site', value: allTypes.size ? Array.from(allTypes).join(', ') : 'none' },
            { label: 'Organization / LocalBusiness', value: 'not present' },
          ],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Settings → Advanced → Code Injection → Header, paste a JSON-LD LocalBusiness or Organization block',
          effort: 'medium',
        }),
        1
      )
    );
  } else {
    out.push(pass('SCHEMA-030', 'schema', 'high', 1, 'Your business is described in structured data'));
  }

  const hasBreadcrumb = allTypes.has('BreadcrumbList');
  if (pages.length >= 4 && !hasBreadcrumb) {
    out.push(
      fail(
        finding({
          id: 'SCHEMA-040',
          category: 'schema',
          severity: 'low',
          title: 'No breadcrumb markup on a multi-page site',
          detail:
            'Breadcrumb markup replaces the raw URL in Google results with a readable path, which improves click-through and helps Google understand your site structure.',
          evidence: [{ label: 'BreadcrumbList markup', value: 'not found' }],
          affected: 1,
          applicable: 1,
          effort: 'medium',
        }),
        1
      )
    );
  } else if (pages.length >= 4) {
    out.push(pass('SCHEMA-040', 'schema', 'low', 1));
  }

  // Ratings claimed in markup but nowhere visible: a manual-action trigger.
  const ratingPages = pages.filter((p) => p.schemaTypes.some((t) => /AggregateRating/.test(t)));
  const ratingWithoutText = ratingPages.filter((p) => !/\b\d(\.\d)?\s*(out of|\/)\s*5|★|⭐|review/i.test(p.mainText));
  if (ratingWithoutText.length) {
    out.push(
      fail(
        finding({
          id: 'SCHEMA-008',
          category: 'schema',
          severity: 'high',
          title: 'Star ratings are claimed in markup but not shown on the page',
          detail:
            'Structured data declares an aggregate rating that a visitor cannot see anywhere in the page content. Google treats this as misleading markup and it is one of the most common causes of a structured-data manual action.',
          evidence: ratingWithoutText.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: 'AggregateRating in markup, no rating in visible text', url: p.url })),
          urls: ratingWithoutText.map((p) => p.url),
          affected: ratingWithoutText.length,
          applicable: Math.max(1, ratingPages.length),
        }),
        Math.max(1, ratingPages.length)
      )
    );
  } else if (ratingPages.length) {
    out.push(pass('SCHEMA-008', 'schema', 'high', ratingPages.length));
  }

  return out;
}

export function socialChecks(ctx: AuditContext): CheckResult[] {
  const out: CheckResult[] = [];
  const pages = ctx.htmlPages;
  const N = Math.max(1, pages.length);

  const noImage = pages.filter((p) => !p.og['og:image']);
  if (noImage.length) {
    out.push(
      fail(
        finding({
          id: 'SOCIAL-003',
          category: 'social',
          severity: 'medium',
          title: `${count(noImage.length, 'page')} ${verb(noImage.length, 'has', 'have')} no social sharing image`,
          detail:
            'When someone shares one of these pages on LinkedIn, Facebook or WhatsApp, the preview appears as a bare grey box. A branded image makes a shared link several times more likely to be clicked.',
          evidence: noImage.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: 'no og:image tag', url: p.url })),
          urls: noImage.map((p) => p.url),
          affected: noImage.length,
          applicable: N,
          squarespacePath: 'Marketing → Social Sharing, upload a 1200×630px image',
          effort: 'quick',
        }),
        N,
        { gamma: 1.0 }
      )
    );
  } else {
    out.push(pass('SOCIAL-003', 'social', 'medium', N, 'Shared links show a preview image'));
  }

  // Squarespace historically emits og:image over plain http://
  const insecureOg = pages.filter((p) => p.og['og:image']?.startsWith('http://'));
  if (insecureOg.length) {
    out.push(
      fail(
        finding({
          id: 'SOCIAL-004',
          category: 'social',
          severity: 'low',
          title: 'Your social sharing image is referenced over insecure HTTP',
          detail:
            'The og:image URL uses http:// rather than https://. Some platforms refuse to load it, which produces an empty preview even though an image is configured.',
          evidence: insecureOg.slice(0, 2).map((p) => ({ label: pathOf(p.url), value: truncate(p.og['og:image'], 100), url: p.url })),
          urls: insecureOg.map((p) => p.url),
          affected: insecureOg.length,
          applicable: N,
          platformLocked: ctx.squarespace.isSquarespace,
        }),
        N,
        { unscored: ctx.squarespace.isSquarespace }
      )
    );
  } else {
    out.push(pass('SOCIAL-004', 'social', 'low', N));
  }

  // SOCIAL-003/004 above only check the share-preview image; nothing checked
  // whether the title/description that accompany it are populated. A share
  // preview with a good image but a missing or garbage title is still broken
  // (AUDIT-OF-THE-AUDIT.md, Step 2). Cheap to add: uses the same `og` object
  // already extracted in extract.ts.
  const noOgTitle = pages.filter((p) => !p.og['og:title']?.trim());
  if (noOgTitle.length) {
    out.push(
      fail(
        finding({
          id: 'SOCIAL-005',
          category: 'social',
          severity: 'low',
          title: `${count(noOgTitle.length, 'page')} ${verb(noOgTitle.length, 'has', 'have')} no social share title`,
          detail:
            'Without an og:title tag, most platforms fall back to the page\'s regular title tag, which is usually fine, but some fall back to the raw URL instead. Setting it explicitly removes the guesswork.',
          evidence: noOgTitle.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: 'no og:title tag', url: p.url })),
          urls: noOgTitle.map((p) => p.url),
          affected: noOgTitle.length,
          applicable: N,
          effort: 'quick',
        }),
        N,
        { gamma: 1.0 }
      )
    );
  } else {
    out.push(pass('SOCIAL-005', 'social', 'low', N, 'Every page has a social share title'));
  }

  const noOgDescription = pages.filter((p) => !p.og['og:description']?.trim());
  if (noOgDescription.length) {
    out.push(
      fail(
        finding({
          id: 'SOCIAL-006',
          category: 'social',
          severity: 'low',
          title: `${count(noOgDescription.length, 'page')} ${verb(noOgDescription.length, 'has', 'have')} no social share description`,
          detail:
            'Without an og:description tag, a shared link on Facebook, LinkedIn or WhatsApp can show a blank or arbitrary line beneath the title, undermining the preview a good og:image is meant to earn.',
          evidence: noOgDescription.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: 'no og:description tag', url: p.url })),
          urls: noOgDescription.map((p) => p.url),
          affected: noOgDescription.length,
          applicable: N,
          effort: 'quick',
        }),
        N,
        { gamma: 1.0 }
      )
    );
  } else {
    out.push(pass('SOCIAL-006', 'social', 'low', N, 'Every page has a social share description'));
  }

  const noTwitter = pages.filter((p) => !p.twitter['twitter:card']);
  if (noTwitter.length === pages.length && pages.length) {
    out.push(
      fail(
        finding({
          id: 'SOCIAL-010',
          category: 'social',
          severity: 'low',
          title: 'No Twitter/X card type is declared',
          detail:
            'Without a twitter:card declaration, links shared on X fall back to a small preview instead of a large image card.',
          evidence: [{ label: 'twitter:card', value: 'not present on any page' }],
          affected: pages.length,
          applicable: N,
        }),
        N
      )
    );
  } else {
    out.push(pass('SOCIAL-010', 'social', 'low', N));
  }

  return out;
}

export function a11yChecks(ctx: AuditContext): CheckResult[] {
  const out: CheckResult[] = [];
  const pages = ctx.htmlPages;
  const N = Math.max(1, pages.length);

  const noLang = pages.filter((p) => !p.lang);
  if (noLang.length) {
    out.push(
      fail(
        finding({
          id: 'A11Y-001',
          category: 'a11y',
          severity: 'high',
          title: 'Pages do not declare their language',
          detail:
            'Without a lang attribute a screen reader may read your English content with the wrong pronunciation rules. It is a single attribute and a WCAG Level A requirement.',
          evidence: noLang.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: 'no lang attribute on <html>', url: p.url })),
          urls: noLang.map((p) => p.url),
          affected: noLang.length,
          applicable: N,
          platformLocked: ctx.squarespace.isSquarespace,
        }),
        N,
        { unscored: ctx.squarespace.isSquarespace }
      )
    );
  } else {
    out.push(pass('A11Y-001', 'a11y', 'high', N, 'Pages declare their language for screen readers'));
  }

  const unlabelled = pages.reduce((a, p) => a + p.a11y.unlabelledInputs, 0);
  const totalFields = pages.reduce((a, p) => a + p.forms.reduce((b, f) => b + f.fieldCount, 0), 0);
  if (totalFields > 0) {
    if (unlabelled > 0) {
      out.push(
        fail(
          finding({
            id: 'A11Y-010',
            category: 'a11y',
            severity: 'high',
            title: `${count(unlabelled, 'form field')} ${verb(unlabelled, 'has', 'have')} no label`,
            detail:
              'A screen reader announces an unlabelled field as just "edit text". Someone using one cannot tell whether they are typing their name, their email or their message. This is among the most commonly cited issues in accessibility complaints.',
            evidence: [{ label: 'Unlabelled fields', value: `${unlabelled} of ${totalFields} form fields` }],
            urls: pages.filter((p) => p.a11y.unlabelledInputs > 0).map((p) => p.url),
            affected: unlabelled,
            applicable: totalFields,
            effort: 'medium',
          }),
          totalFields,
          { gamma: 1.0 }
        )
      );
    } else {
      out.push(pass('A11Y-010', 'a11y', 'high', totalFields, 'All form fields are properly labelled'));
    }
  } else {
    out.push(na('A11Y-010', 'a11y', 'high'));
  }

  const namelessLinks = pages.reduce((a, p) => a + p.a11y.linksWithoutName, 0);
  const totalLinks = pages.reduce((a, p) => a + p.links.length, 0);
  if (totalLinks >= 10) {
    if (namelessLinks > 0) {
      out.push(
        fail(
          finding({
            id: 'A11Y-020',
            category: 'a11y',
            severity: 'medium',
            title: `${count(namelessLinks, 'link')} ${verb(namelessLinks, 'has', 'have')} no readable text`,
            detail:
              'These links contain only an icon or an image with no alternative text, so a screen reader announces the raw URL or nothing at all.',
            evidence: [{ label: 'Links with no accessible name', value: `${namelessLinks} of ${totalLinks}` }],
            urls: pages.filter((p) => p.a11y.linksWithoutName > 0).map((p) => p.url),
            affected: namelessLinks,
            applicable: totalLinks,
            effort: 'medium',
          }),
          totalLinks,
          { gamma: 1.0 }
        )
      );
    } else {
      out.push(pass('A11Y-020', 'a11y', 'medium', totalLinks));
    }
  }

  const namelessButtons = pages.reduce((a, p) => a + p.a11y.buttonsWithoutName, 0);
  if (namelessButtons > 3) {
    out.push(
      fail(
        finding({
          id: 'A11Y-044',
          category: 'a11y',
          severity: 'medium',
          title: `${count(namelessButtons, 'button')} ${verb(namelessButtons, 'has', 'have')} no accessible name`,
          detail:
            'Icon-only buttons, menu toggles, close buttons, carousel arrows, need an aria-label so assistive technology can announce what they do.',
          evidence: [{ label: 'Unnamed buttons', value: String(namelessButtons) }],
          affected: namelessButtons,
          applicable: Math.max(namelessButtons, 10),
          platformLocked: ctx.squarespace.isSquarespace,
        }),
        Math.max(namelessButtons, 10),
        { gamma: 1.0, unscored: ctx.squarespace.isSquarespace }
      )
    );
  } else {
    out.push(pass('A11Y-044', 'a11y', 'medium', N));
  }

  const framesNoTitle = pages.reduce((a, p) => a + p.a11y.iframesWithoutTitle, 0);
  const totalFrames = pages.reduce((a, p) => a + p.iframes.length, 0);
  if (totalFrames > 0) {
    if (framesNoTitle > 0) {
      out.push(
        fail(
          finding({
            id: 'A11Y-040',
            category: 'a11y',
            severity: 'low',
            title: `${count(framesNoTitle, 'embedded frame')} ${verb(framesNoTitle, 'has', 'have')} no title`,
            detail:
              'Embedded maps, videos and booking widgets need a title attribute so a screen reader can describe what the embedded region contains.',
            evidence: [{ label: 'Frames without a title', value: `${framesNoTitle} of ${totalFrames}` }],
            affected: framesNoTitle,
            applicable: totalFrames,
          }),
          totalFrames,
          { gamma: 1.0 }
        )
      );
    } else {
      out.push(pass('A11Y-040', 'a11y', 'low', totalFrames));
    }
  }

  const dupIds = pages.filter((p) => p.a11y.duplicateIds.length > 0);
  if (dupIds.length) {
    out.push(
      fail(
        finding({
          id: 'A11Y-050',
          category: 'a11y',
          severity: 'low',
          title: 'Duplicate element IDs were found',
          detail:
            'Repeated IDs break the links between labels and form fields, so assistive technology can associate the wrong label with the wrong control.',
          evidence: dupIds.slice(0, 2).map((p) => ({ label: pathOf(p.url), value: p.a11y.duplicateIds.slice(0, 4).join(', '), url: p.url })),
          urls: dupIds.map((p) => p.url),
          affected: dupIds.length,
          applicable: N,
          platformLocked: ctx.squarespace.isSquarespace,
        }),
        N,
        { unscored: ctx.squarespace.isSquarespace }
      )
    );
  } else {
    out.push(pass('A11Y-050', 'a11y', 'low', N));
  }

  return out;
}

export function mobileChecks(ctx: AuditContext): CheckResult[] {
  const out: CheckResult[] = [];
  const pages = ctx.htmlPages;
  const N = Math.max(1, pages.length);

  const noViewport = pages.filter((p) => !p.viewport);
  if (noViewport.length) {
    out.push(
      fail(
        finding({
          id: 'MOBILE-001',
          category: 'mobile',
          severity: 'critical',
          title: 'Pages have no mobile viewport setting',
          detail:
            'Without a viewport meta tag a phone renders the page at desktop width and zooms out, making all text unreadably small. Google indexes the mobile version of your site first, so this affects desktop rankings too.',
          evidence: noViewport.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: 'no viewport meta tag', url: p.url })),
          urls: noViewport.map((p) => p.url),
          affected: noViewport.length,
          applicable: N,
        }),
        N
      )
    );
  } else {
    out.push(pass('MOBILE-001', 'mobile', 'critical', N, 'Pages are configured to render correctly on phones'));
  }

  const zoomBlocked = pages.filter(
    (p) => /user-scalable\s*=\s*(no|0)/i.test(p.viewport) || /maximum-scale\s*=\s*1(\.0)?\b/i.test(p.viewport)
  );
  if (zoomBlocked.length) {
    out.push(
      fail(
        finding({
          id: 'MOBILE-002',
          category: 'mobile',
          severity: 'medium',
          title: 'Pinch-to-zoom is disabled on mobile',
          detail:
            'The viewport blocks zooming. Anyone with limited vision cannot enlarge your text, which is a WCAG failure as well as a frustration.',
          evidence: zoomBlocked.slice(0, 2).map((p) => ({ label: pathOf(p.url), value: p.viewport, url: p.url })),
          urls: zoomBlocked.map((p) => p.url),
          affected: zoomBlocked.length,
          applicable: N,
        }),
        N
      )
    );
  } else {
    out.push(pass('MOBILE-002', 'mobile', 'medium', N));
  }

  const fixedWidth = pages.filter((p) => p.fixedWidthHits >= 3);
  if (fixedWidth.length) {
    out.push(
      fail(
        finding({
          id: 'MOBILE-005',
          category: 'mobile',
          severity: 'low',
          confidence: 'heuristic',
          title: 'Some elements use fixed pixel widths wider than a phone screen',
          detail:
            'Inline styles set widths above 480px, which commonly causes sideways scrolling on a phone. This is a heuristic, confirm by viewing the page on a real device.',
          evidence: fixedWidth.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: `${p.fixedWidthHits} fixed-width elements`, url: p.url })),
          urls: fixedWidth.map((p) => p.url),
          affected: fixedWidth.length,
          applicable: N,
        }),
        N
      )
    );
  } else {
    out.push(pass('MOBILE-005', 'mobile', 'low', N));
  }

  return out;
}

export function secChecks(ctx: AuditContext): CheckResult[] {
  const out: CheckResult[] = [];
  const pages = ctx.htmlPages;
  const N = Math.max(1, pages.length);
  const isSqs = ctx.squarespace.isSquarespace;
  const home = ctx.homepage;

  /* ---------------- HTTPS + certificate ---------------- */
  if (!ctx.origin.startsWith('https://')) {
    out.push(
      fail(
        finding({
          id: 'SEC-001',
          category: 'sec',
          severity: 'critical',
          title: 'Your site does not use HTTPS',
          detail:
            'Browsers mark plain HTTP sites as "Not secure", and Google has used HTTPS as a ranking signal for a decade.',
          evidence: [{ label: 'Protocol', value: 'http://' }],
          affected: 1,
          applicable: 1,
        }),
        1
      )
    );
  } else {
    out.push(pass('SEC-001', 'sec', 'critical', 1, 'Your site is served securely over HTTPS'));
  }

  if (ctx.cert?.validTo) {
    const expiry = new Date(ctx.cert.validTo);
    const days = Math.round((expiry.getTime() - Date.now()) / 86_400_000);
    if (days < 21) {
      out.push(
        fail(
          finding({
            id: 'SEC-002',
            category: 'sec',
            severity: days < 0 ? 'critical' : 'high',
            title: days < 0 ? 'Your SSL certificate has expired' : `Your SSL certificate expires in ${days} days`,
            detail:
              days < 0
                ? 'Browsers will show a full-page security warning before anyone reaches your site.'
                : 'Renewal is usually automatic, but it is worth confirming, an expired certificate blocks every visitor with a full-page warning.',
            evidence: [
              { label: 'Expires', value: ctx.cert.validTo },
              { label: 'Issuer', value: ctx.cert.issuer || 'unknown' },
            ],
            affected: 1,
            applicable: 1,
          }),
          1
        )
      );
    } else {
      out.push(pass('SEC-002', 'sec', 'high', 1, `SSL certificate is valid for another ${days} days`));
    }
  }

  /* ---------------- mixed content ---------------- */
  const activeMixed = pages.filter((p) => p.mixedContentActive.length > 0);
  if (activeMixed.length) {
    out.push(
      fail(
        finding({
          id: 'SEC-013',
          category: 'sec',
          severity: 'high',
          title: 'Insecure resources are loaded on secure pages',
          detail:
            'Scripts or stylesheets are referenced over plain http:// on an https:// page. Browsers block these silently, which can break layout or functionality with no visible error.',
          evidence: activeMixed.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: truncate(p.mixedContentActive[0], 110), url: p.url })),
          urls: activeMixed.map((p) => p.url),
          affected: activeMixed.length,
          applicable: N,
        }),
        N
      )
    );
  } else {
    out.push(pass('SEC-013', 'sec', 'high', N));
  }

  /* ---------------- security headers ---------------- */
  const headers = home.headers;
  const missingHeaders: string[] = [];
  if (!headers['x-content-type-options']) missingHeaders.push('X-Content-Type-Options');
  if (!headers['x-frame-options'] && !/frame-ancestors/.test(headers['content-security-policy'] || '')) {
    missingHeaders.push('X-Frame-Options');
  }
  if (!headers['referrer-policy']) missingHeaders.push('Referrer-Policy');
  if (missingHeaders.length) {
    out.push(
      fail(
        finding({
          id: 'SEC-007',
          category: 'sec',
          severity: 'low',
          title: `${count(missingHeaders.length, 'standard security header')} ${verb(missingHeaders.length, 'is', 'are')} missing`,
          detail: isSqs
            ? 'These headers protect against clickjacking and content-type confusion. Squarespace controls response headers, so this is not something you can change from your account, it is reported for completeness rather than as a fault of your setup.'
            : 'These headers are a one-line server configuration change and protect against clickjacking and content-type confusion attacks.',
          evidence: [{ label: 'Missing', value: missingHeaders.join(', ') }],
          affected: missingHeaders.length,
          applicable: 3,
          platformLocked: isSqs,
        }),
        3,
        { unscored: isSqs }
      )
    );
  } else {
    out.push(pass('SEC-007', 'sec', 'low', 3, 'Standard security headers are configured'));
  }

  /* ---------------- exposed paths ---------------- */
  const exposed: string[] = [];
  if (ctx.probes.gitHead?.status === 200) exposed.push('/.git/HEAD');
  if (ctx.probes.dotEnv?.status === 200) exposed.push('/.env');
  if (exposed.length) {
    out.push(
      fail(
        finding({
          id: 'SEC-016',
          category: 'sec',
          severity: 'critical',
          title: 'Sensitive files are publicly readable',
          detail:
            'These files can expose source code, credentials or API keys to anyone who requests them.',
          evidence: exposed.map((p) => ({ label: p, value: 'returns HTTP 200' })),
          affected: exposed.length,
          applicable: 2,
        }),
        2
      )
    );
  } else {
    out.push(pass('SEC-016', 'sec', 'critical', 2));
  }

  /* ---------------- privacy policy ---------------- */
  const detectedTrackers = new Set<string>();
  for (const p of pages) {
    const hay = [...p.thirdPartyHosts, ...p.scripts.map((s) => s.src || '')].join(' ');
    for (const t of TRACKERS) if (t.re.test(hay)) detectedTrackers.add(t.name);
  }
  const hasPrivacy = pages.some((p) =>
    p.links.some((l) => l.abs && /\/(privacy|privacy-policy|datenschutz)/i.test(l.abs))
  );
  if (!hasPrivacy) {
    out.push(
      fail(
        finding({
          id: 'SEC-020',
          category: 'sec',
          severity: detectedTrackers.size ? 'high' : 'medium',
          title: 'No privacy policy page is linked from your site',
          detail: detectedTrackers.size
            ? `Your site loads tracking scripts (${Array.from(detectedTrackers).join(', ')}) but links to no privacy policy. This is a direct compliance gap under GDPR and CCPA, and it also breaches Google Ads and Meta Ads policy if you advertise.`
            : 'A privacy policy is expected by most privacy regulations and by the advertising platforms, even for a simple brochure site.',
          evidence: [
            { label: 'Privacy policy link', value: 'not found on any crawled page' },
            { label: 'Tracking scripts detected', value: detectedTrackers.size ? Array.from(detectedTrackers).join(', ') : 'none' },
          ],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Pages → add a new page → paste your privacy policy → link it in the footer',
          effort: 'quick',
        }),
        1
      )
    );
  } else {
    out.push(pass('SEC-020', 'sec', 'medium', 1, 'A privacy policy is linked from the site'));
  }

  /* ---------------- cookie consent ---------------- */
  const hasCmp =
    pages.some((p) => CMP_RE.test(p.headers['set-cookie'] || '')) ||
    pages.some((p) => p.thirdPartyHosts.some((h) => CMP_RE.test(h))) ||
    ctx.squarespace.features.cookieBanner;
  if (detectedTrackers.size > 0 && !hasCmp) {
    out.push(
      fail(
        finding({
          id: 'SEC-022',
          category: 'sec',
          severity: 'medium',
          title: 'Tracking runs with no cookie consent banner',
          detail: `Tracking scripts (${Array.from(detectedTrackers).join(', ')}) load without any consent mechanism. If you have visitors in the UK, EU or California this is a regulatory exposure.`,
          evidence: [{ label: 'Trackers', value: Array.from(detectedTrackers).join(', ') }],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Settings → Cookies & Visitor Data → enable the cookie banner',
          effort: 'quick',
        }),
        1
      )
    );
  } else {
    out.push(pass('SEC-022', 'sec', 'medium', 1));
  }

  /* ---------------- analytics presence ---------------- */
  // Category mismatch (whether analytics is installed is a marketing
  // question, not a security/privacy one) and it sat in philosophical
  // tension with SEC-022 above: a site owner who deliberately skips
  // analytics to avoid consent-banner complexity — a legitimate, increasingly
  // common choice — was being scored down either way they went
  // (AUDIT-OF-THE-AUDIT.md, Step 3, SEC-031). There is no category in this
  // engine built for "marketing/ops setup", so rather than force it into one,
  // this stays under Security & Privacy for now as a visible, informational
  // note, but is no longer counted toward the score.
  const hasAnalytics = Array.from(detectedTrackers).some((t) => /Analytics|Tag Manager/.test(t));
  if (!hasAnalytics) {
    out.push(
      fail(
        finding({
          id: 'SEC-031',
          category: 'sec',
          severity: 'low',
          title: 'No web analytics are installed',
          detail:
            'No Google Analytics or Tag Manager tag was found. Without analytics you cannot see which pages bring enquiries, where visitors drop off, or whether any change you make actually helps. Note: skipping analytics entirely is also a legitimate, increasingly common choice to sidestep consent-banner complexity, so treat this as worth considering rather than a defect.',
          evidence: [{ label: 'Analytics tags found', value: 'none' }],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Settings → Developer Tools → External API Keys → add your Google Analytics measurement ID (G-XXXXXXX)',
          effort: 'quick',
        }),
        1,
        { unscored: true }
      )
    );
  } else {
    out.push(pass('SEC-031', 'sec', 'low', 1, `Analytics is installed (${Array.from(detectedTrackers).filter((t) => /Analytics|Tag Manager/.test(t)).join(', ')})`));
  }

  return out;
}

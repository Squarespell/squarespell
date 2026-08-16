/**
 * Squarespace platform detection.
 *
 * Every signal here was verified against live Squarespace sites rather than
 * copied from a fingerprint database. We deliberately combine header, HTML,
 * asset-path and robots.txt evidence so that a single masked signal (for
 * example a site proxied behind Cloudflare, which strips `server` and
 * `x-contextid`) does not produce a false negative.
 */

import type { SquarespaceContext, SquarespaceDetection, RobotsInfo } from './types';

/**
 * Extracts `Static.SQUARESPACE_CONTEXT = {...}` by brace-matching.
 *
 * A lazy regex (`\{.*?\}`) truncates: the blob embeds braces and semicolons
 * inside string values. We scan with a string-aware depth counter instead.
 */
export function extractContext(html: string): SquarespaceContext | null {
  const anchor = html.search(/Static\s*\.\s*SQUARESPACE_CONTEXT\s*=\s*\{/);
  if (anchor === -1) return null;
  const start = html.indexOf('{', anchor);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let i = start; i < html.length && i < start + 900_000; i++) {
    const ch = html[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      if (inString) escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;
  try {
    return JSON.parse(html.slice(start, end + 1)) as SquarespaceContext;
  } catch {
    return null;
  }
}

/** Strips scripts and styles. Required before counting DOM feature markers:
 *  SQUARESPACE_CONTEXT embeds a 218-key localisation table plus a static
 *  rollup manifest, which makes naive substring counting fire on every site. */
export function stripScripts(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

const CONTEXT_ID_RE = /^[A-Za-z0-9+/]{6,12}\/[A-Za-z0-9+/]{6,12}$/;

export function detectSquarespace(input: {
  html: string;
  headers: Record<string, string>;
  status: number;
  robots?: RobotsInfo | null;
  configStatus?: number;
  configLocation?: string;
}): SquarespaceDetection {
  const { html, headers, status } = input;
  const dom = stripScripts(html);
  const signals: string[] = [];
  let score = 0;

  const add = (points: number, label: string) => {
    score += points;
    signals.push(label);
  };

  /* ---- Tier 1: conclusive ---- */
  const ctxId = headers['x-contextid'] || '';
  if (ctxId && CONTEXT_ID_RE.test(ctxId)) add(60, `x-contextid response header (${ctxId})`);
  const context = extractContext(html);
  if (context && (context.templateVersion || context.website)) {
    add(60, 'Static.SQUARESPACE_CONTEXT configuration object in page source');
  }
  if ((headers['server'] || '').toLowerCase() === 'squarespace') {
    add(50, 'server: Squarespace response header');
  }
  if (input.robots?.isSquarespaceDefault) {
    add(50, 'robots.txt matches the Squarespace platform default');
  }

  /* ---- Tier 2: strong ---- */
  if (/assets\.squarespace\.com\/universal\/scripts-compressed\//.test(html)) {
    add(30, 'Squarespace platform JavaScript bundles');
  }
  if (/static1\.squarespace\.com\/static\/(ta|vta|sitecss|versioned-site-css)\//.test(html)) {
    add(30, 'Squarespace compiled site CSS/JS path');
  }
  if (/assets\.squarespace\.com\/@sqs\/polyfiller\//.test(html)) {
    add(25, 'Squarespace polyfiller asset');
  }
  if (/images\.squarespace-cdn\.com\/content\/v1\/[0-9a-f]{24}/.test(html)) {
    add(25, 'Squarespace image CDN URLs');
  }
  if (/(^|;\s*)crumb=/.test(headers['set-cookie'] || '')) {
    add(20, 'Squarespace `crumb` CSRF cookie');
  }

  /* ---- Tier 3: corroborating ---- */
  if (/sqs-announcement-bar-dropzone/.test(dom)) add(15, 'Announcement-bar dropzone element');
  if (/<body[^>]+id="(collection|item)-[0-9a-f]{24}"/i.test(dom)) {
    add(15, 'Squarespace collection ID on <body>');
  }
  if (/xmlns:og="http:\/\/opengraphprotocol\.org\/schema\/"/.test(html)) {
    add(12, 'Legacy Squarespace <html> namespace attributes');
  }
  if (/data-loader="sqs"/.test(dom)) add(10, 'Squarespace image loader attributes');
  if (input.configStatus === 302 && /protected-redirect/.test(input.configLocation || '')) {
    add(10, '/config redirects to the Squarespace login flow');
  }
  if (/definitions\.sqspcdn\.com\/website-component-definition\//.test(html)) {
    add(8, 'Squarespace website-component definitions');
  }
  if (/data-controller="SectionWrapperController"/.test(dom)) {
    add(8, 'Squarespace section controller attributes');
  }

  score = Math.min(100, score);

  /* ---- System pages short-circuit ---- */
  let siteStatus: SquarespaceDetection['siteStatus'] = 'unknown';
  const titleMatch = html.match(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  if (status === 401 && /Private Site/i.test(title)) {
    siteStatus = 'private';
    score = 100;
    signals.push('Squarespace "Private Site" system page (site is password protected)');
  } else if (status === 404 && /Website Expired/i.test(title)) {
    siteStatus = 'expired';
    score = 100;
    signals.push('Squarespace "Website Expired" system page');
  } else if (status === 404 && /No Such Website|Website Not Found/i.test(title)) {
    // Squarespace serves this for a subdomain nobody has claimed, and for a
    // custom domain pointed at Squarespace without a site behind it. We used
    // to audit this page as though it were the site, which produced a full
    // scored report about a page that does not exist.
    siteStatus = 'missing';
    score = 100;
    signals.push('Squarespace "No Such Website" system page');
  } else if (score >= 80 && status >= 200 && status < 300) {
    siteStatus = 'live';
  }

  /* ---- Version discrimination ---- */
  let v71 = 0;
  let v70 = 0;
  const tv = context?.templateVersion;
  if (tv === '7.1') v71 += 50;
  else if (tv === '7') v70 += 50;
  if (context?.templateId === '5c5a519771c10ba3470d8101') v71 += 30;
  if (/static1\.squarespace\.com\/static\/(versioned-site-css|vta)\//.test(html)) v71 += 25;
  if (/static1\.squarespace\.com\/static\/(sitecss|ta)\//.test(html)) v70 += 25;
  const sectionCount = (dom.match(/<section[^>]+data-section-id="[0-9a-f]{24}"/gi) || []).length;
  if (sectionCount > 0) v71 += 20;
  if (/data-sqsp-section="/.test(dom)) v71 += 15;
  const bodyClass = (dom.match(/<body[^>]*class="([^"]*)"/i) || [])[1] || '';
  if (/collection-type-index/.test(bodyClass)) v70 += 15;
  if (/(^|\s)(ancillary-header-|banner-slideshow-controls-)/.test(bodyClass)) v70 += 10;
  if (/Index-page-content|Site-inner--index/.test(dom)) v70 += 10;

  const version: SquarespaceDetection['version'] =
    v71 === 0 && v70 === 0 ? 'unknown' : v71 > v70 ? '7.1' : '7.0';
  const versionConfidence =
    v71 + v70 === 0 ? 0 : Math.round((Math.max(v71, v70) / (v71 + v70)) * 100);

  /* ---- Editor mix (7.1 only, per-page) ---- */
  const fluid =
    (dom.match(/data-sqsp-section="fluid-engine"/g) || []).length +
    (dom.match(/data-fluid-engine-section/g) || []).length;
  const classic = (dom.match(/data-sqsp-section="classic-editor"/g) || []).length;
  const editorTotal = fluid + classic;

  /* ---- Template family (7.0) ---- */
  let templateFamily: string | undefined;
  if (version === '7.0') {
    if (/tweak-site-width-option-|ancillary-header-top-left-layout-|ancillary-mobile-bar-/.test(bodyClass)) {
      templateFamily = 'Brine family';
    } else if (/banner-slideshow-controls-|nav-button-corner-style-|center-navigation/.test(bodyClass)) {
      templateFamily = 'Bedford family';
    }
  }

  const ws = context?.websiteSettings || {};
  const features = {
    // `websiteSettings.storeSettings` is populated on every Squarespace site,
    // store or not, so it proves nothing. Only the commerce bundle does.
    commerce: /scripts-compressed\/commerce-[0-9a-f]{6,}/.test(html),
    scheduling:
      /acuity-block-wrapper|embed\.acuityscheduling\.com|data-acuity-url|squarespacescheduling\.com/.test(
        html
      ),
    // `betaFeatureFlags` lists `member_areas_feature` on every site, and the
    // user-account bundle also loads for Commerce customer accounts. The only
    // signal that actually varies is whether logins are switched on.
    memberAreas:
      /scripts-compressed\/user-account-core-[0-9a-f]{6,}/.test(html) &&
      ws.userAccountsSettings?.loginAllowed === true,
    forms:
      /class="[^"]*newsletter-form|data-form-id="[0-9a-f]{24}"|website\.components\.form/.test(html),
    // Only presence is used, deliberately. A popup/announcement-bar *overuse*
    // check (an aggressive popup firing immediately, or stacking with the
    // announcement bar) was proposed in AUDIT-OF-THE-AUDIT.md, Step 2 and
    // Step 7 (P3), gated on whether `popupOverlaySettings`'s timing/trigger
    // fields (delay, display frequency, trigger type) are reliably present
    // and stable across Squarespace versions. That is undocumented internal
    // JSON, not a public API, and this codebase has no live-site verification
    // step available in this environment to confirm field names against real
    // sites the way every other signal in this file was verified (per this
    // file's own header comment). Rather than encode a guess at field names
    // that could silently misread a totally different setting, this stays
    // unimplemented until it can be verified against real site payloads —
    // see the audit review for the deferred decision and rationale.
    popupOverlay: !!ws.popupOverlaySettings,
    announcementBar: context?.showAnnouncementBar === true,
    cookieBanner: !!(context?.cookieSettings?.isCookieBannerEnabled ?? ws.isCookieBannerEnabled),
    // `ssBadgeVisibility` reads 1 on every site we tested, including ones with
    // no visible badge, so it is not usable as a detection signal.
    badge: false,
    devMode:
      version === '7.0' &&
      !/tweak-/.test(bodyClass) &&
      !/static1\.squarespace\.com\/static\/(ta|sitecss)\//.test(html),
  };

  return {
    isSquarespace: score >= 80,
    confidence: score,
    version,
    versionConfidence,
    signals,
    siteStatus,
    context,
    editor: {
      fluid,
      classic,
      ratio: editorTotal > 0 ? Math.round((fluid / editorTotal) * 100) / 100 : null,
    },
    features,
    templateFamily,
  };
}

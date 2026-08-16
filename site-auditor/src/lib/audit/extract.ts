/**
 * Turns one fetched page into a structured, check-ready fact sheet.
 *
 * Everything downstream reads these facts rather than re-parsing HTML, so the
 * whole audit stays deterministic and each check stays cheap.
 */

import * as cheerio from 'cheerio';
import type { PageData } from './types';
import { canonicalise, sameSite, isCrawlablePage } from './url';
import { classifyPageType, type PageType } from './pagetype';

export interface LinkRef {
  href: string;
  abs: string | null;
  text: string;
  rel: string;
  target: string;
  internal: boolean;
  hasAccessibleName: boolean;
}

export interface ImageFact {
  src: string;
  abs: string | null;
  hasAltAttr: boolean;
  alt: string;
  width: string;
  height: string;
  loading: string;
  fetchPriority: string;
  hasSrcset: boolean;
  order: number;
  insideLink: boolean;
}

export interface FormFact {
  action: string;
  method: string;
  fieldCount: number;
  hasEmailField: boolean;
  hasTextarea: boolean;
  unlabelledFields: number;
  placeholderOnly: number;
  isNewsletter: boolean;
  isContact: boolean;
}

export interface PageFacts {
  url: string;
  status: number;
  depth: number;
  bytes: number;
  ttfbMs: number;
  headers: Record<string, string>;
  redirectChain: string[];

  title: string;
  titleCount: number;
  metaDescription: string | null;
  metaDescriptionCount: number;
  canonical: string | null;
  canonicalCount: number;
  metaRobots: string;
  xRobotsTag: string;
  lang: string;
  viewport: string;
  viewportCount: number;
  charset: string;

  h1: string[];
  headings: Array<{ level: number; text: string }>;
  headingSkips: number;

  wordCount: number;
  mainText: string;
  textSample: string;

  links: LinkRef[];
  /**
   * Links inside the page body only, with navigation, header and footer
   * removed. Site-wide navigation appears on every page, so treating all
   * anchors as "this page links to that" makes every page look related to
   * every other page.
   */
  contentLinks: LinkRef[];
  internalLinks: string[];
  images: ImageFact[];
  forms: FormFact[];
  /** Squarespace Form Blocks that are rendered client-side, so the <form>
   *  element is absent from the served HTML. We can see the placeholder but
   *  not the fields. */
  formBlockPlaceholders: number;
  /** Names of third-party form embeds detected on the page. */
  embeddedFormProviders: string[];
  /** Email addresses written as plain text rather than as mailto links. */
  textEmails: string[];
  /** Contact details that exist only in structured data or platform JSON. */
  markupContacts: { emails: string[]; phones: string[] };

  jsonLd: Array<{ raw: string; parsed: any; error?: string }>;
  schemaTypes: string[];

  og: Record<string, string>;
  twitter: Record<string, string>;

  scripts: Array<{ src: string | null; async: boolean; defer: boolean; inHead: boolean; module: boolean; inlineBytes: number }>;
  stylesheets: Array<{ href: string; media: string; inHead: boolean }>;
  iframes: Array<{ src: string; title: string }>;
  thirdPartyHosts: string[];
  inlineStyleBytes: number;

  telLinks: string[];
  mailtoLinks: string[];
  ctas: Array<{ text: string; offsetPct: number; strong: boolean }>;
  hasSkipLink: boolean;
  landmarks: { main: number; nav: number; header: number; footer: number };
  /**
   * Best-effort count of links inside the primary nav element. Prefers the
   * nav's direct-child links (a reasonable proxy for top-level items on most
   * Squarespace templates) and falls back to every link inside the nav when
   * no direct-child structure is found. This can over-count on templates
   * with unusual markup, so treat it as a heuristic, not an exact figure.
   */
  navLinkCount: number;

  a11y: {
    imagesMissingAlt: number;
    linksWithoutName: number;
    genericLinkText: number;
    unlabelledInputs: number;
    iframesWithoutTitle: number;
    positiveTabindex: number;
    emptyHeadings: number;
    duplicateIds: string[];
    ariaHiddenFocusable: number;
    buttonsWithoutName: number;
  };

  fixedWidthHits: number;
  smallFontHits: number;
  mixedContentActive: string[];
  mixedContentPassive: string[];
  base64Bytes: number;

  isSquarespaceSystemPage: boolean;

  /**
   * Best-effort page-type classification (home / blog-post / product /
   * gallery / contact / about / service / standard). See pagetype.ts for the
   * signals used and their limits. Checks that apply a uniform threshold to
   * every page (thin-content, internal-link count, question-heading
   * coverage) should read this instead of hand-rolling their own URL regex.
   */
  pageType: PageType;
}

const GENERIC_LINK_TEXT = new Set([
  'click here', 'here', 'read more', 'more', 'learn more', 'this', 'link',
  'details', 'continue', 'download', 'view', 'see more', 'find out more', 'go',
]);

const CTA_VERBS =
  /\b(get (a )?(free )?(quote|started|in touch)|book|schedule|contact|call|buy|shop|start|request|sign up|subscribe|enquire|inquire|apply|order|reserve|download|join|hire|work with)\b/i;

const WEAK_CTA = /^(submit|send|click here|learn more|read more|more|next|ok|go|continue)$/i;

/**
 * Third-party form embeds, by provider. Each renders in the browser, so the
 * served HTML carries only a loader script and an empty container. Recognising
 * the loader is the only way to know a form is there without running the page.
 */
const EMBEDDED_FORM_PROVIDERS: Array<[string, RegExp]> = [
  ['HubSpot', /js\.hsforms\.net|hsforms\.com\/forms|hbspt\.forms|hs-form-frame/i],
  ['Typeform', /embed\.typeform\.com|typeform-widget|form\.typeform\.com/i],
  ['Jotform', /(form|submit)\.jotform\.(com|co)|jotform-form/i],
  ['Google Forms', /docs\.google\.com\/forms|forms\.gle/i],
  ['Tally', /tally\.so\/(embed|r|widgets)/i],
  ['Fillout', /(forms\.)?fillout\.com/i],
  ['Mailchimp', /list-manage\.com|mc\.us\d+\.list-manage|chimpstatic\.com/i],
  ['Klaviyo', /klaviyo\.com\/onsite|klaviyo-form/i],
  ['Formstack', /formstack\.(com|io)/i],
  ['Wufoo', /wufoo\.com\/(forms|embed)/i],
  ['Paperform', /paperform\.co/i],
  ['Cognito Forms', /cognitoforms\.com/i],
  ['Zoho Forms', /forms\.zohopublic\.|zohoforms/i],
  ['Formspree', /formspree\.io/i],
  ['ActiveCampaign', /activehosted\.com\/f\/|prod\.activehosted/i],
  ['Marketo', /marketo\.(net|com)\/js\/forms/i],
  ['Pardot', /pardot\.com\/l\/|go\.pardot\.com/i],
  ['SurveyMonkey', /surveymonkey\.com\/r\//i],
  ['Airtable', /airtable\.com\/(embed|shr)/i],
  ['Gravity Forms', /gravityforms|gform_wrapper/i],
];

function absolute(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export function extractFacts(page: PageData): PageFacts {
  const $ = cheerio.load(page.html || '');
  const base = page.finalUrl || page.url;
  const isHttps = base.startsWith('https://');

  /* ---------- head ---------- */
  const titleEls = $('head title');
  const title = (titleEls.first().text() || '').replace(/\s+/g, ' ').trim();
  const descEls = $('head meta[name="description" i]');
  const metaDescription = descEls.length ? (descEls.first().attr('content') ?? '') : null;
  const canonicalEls = $('head link[rel="canonical" i]');
  const canonicalHref = canonicalEls.first().attr('href') || null;

  const metaRobots = [
    $('head meta[name="robots" i]').attr('content') || '',
    $('head meta[name="googlebot" i]').attr('content') || '',
  ]
    .filter(Boolean)
    .join(',')
    .toLowerCase();

  const viewportEls = $('head meta[name="viewport" i]');
  const viewport = viewportEls.first().attr('content') || '';

  /* ---------- headings ---------- */
  const headings: Array<{ level: number; text: string }> = [];
  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    const level = Number(el.tagName.slice(1));
    headings.push({ level, text: $(el).text().replace(/\s+/g, ' ').trim() });
  });
  const h1 = headings.filter((h) => h.level === 1).map((h) => h.text);
  let headingSkips = 0;
  let prev = 0;
  for (const h of headings) {
    if (prev && h.level > prev + 1) headingSkips++;
    prev = h.level;
  }

  /* ---------- main content ---------- */
  const contentRoot = $('main').length
    ? $('main')
    : $('article').length
      ? $('article')
      : $('#content, [role="main"]').length
        ? $('#content, [role="main"]')
        : $('body');
  const clone = contentRoot.clone();
  clone.find('script,style,nav,header,footer,aside,noscript,[aria-hidden="true"]').remove();
  const mainText = clone.text().replace(/\s+/g, ' ').trim();
  const wordCount = mainText ? mainText.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length : 0;

  /* ---------- links ---------- */
  // Hrefs that survive the nav/header/footer strip, used to tell body links
  // from chrome without walking the DOM twice.
  const contentHrefs = new Set<string>();
  clone.find('a[href]').each((_, el) => {
    const h = ($(el).attr('href') || '').trim();
    if (h) contentHrefs.add(h);
  });

  const links: LinkRef[] = [];
  const contentLinks: LinkRef[] = [];
  const telLinks: string[] = [];
  const mailtoLinks: string[] = [];
  let genericLinkText = 0;
  let linksWithoutName = 0;

  $('a').each((_, el) => {
    const $el = $(el);
    const href = ($el.attr('href') || '').trim();
    if (!href) return;
    if (/^tel:/i.test(href)) {
      telLinks.push(href.replace(/^tel:/i, '').trim());
      return;
    }
    if (/^mailto:/i.test(href)) {
      mailtoLinks.push(href.replace(/^mailto:/i, '').split('?')[0].trim());
      return;
    }
    if (/^(javascript:|#|data:)/i.test(href)) return;

    const text = $el.text().replace(/\s+/g, ' ').trim();
    const ariaLabel = ($el.attr('aria-label') || '').trim();
    const titleAttr = ($el.attr('title') || '').trim();
    const imgAlt = $el.find('img[alt]').attr('alt') || '';
    const hasAccessibleName = !!(text || ariaLabel || titleAttr || imgAlt.trim());
    if (!hasAccessibleName) linksWithoutName++;
    if (text && GENERIC_LINK_TEXT.has(text.toLowerCase())) genericLinkText++;

    const abs = absolute(href, base);
    const ref: LinkRef = {
      href,
      abs,
      text,
      rel: ($el.attr('rel') || '').toLowerCase(),
      target: ($el.attr('target') || '').toLowerCase(),
      internal: !!abs && sameSite(abs, base),
      hasAccessibleName,
    };
    links.push(ref);
    if (contentHrefs.has(href)) contentLinks.push(ref);
  });

  const internalLinks = Array.from(
    new Set(
      links
        .filter((l) => l.internal && l.abs && isCrawlablePage(l.abs))
        .map((l) => canonicalise(l.abs!))
        .filter((x): x is string => !!x)
    )
  );

  /* ---------- images ---------- */
  const images: ImageFact[] = [];
  let imagesMissingAlt = 0;
  $('img').each((i, el) => {
    const $el = $(el);
    const src = ($el.attr('src') || $el.attr('data-src') || '').trim();
    const hasAltAttr = $el.attr('alt') !== undefined;
    const alt = ($el.attr('alt') ?? '').trim();
    if (!hasAltAttr) imagesMissingAlt++;
    images.push({
      src,
      abs: src ? absolute(src, base) : null,
      hasAltAttr,
      alt,
      width: $el.attr('width') || '',
      height: $el.attr('height') || '',
      loading: ($el.attr('loading') || '').toLowerCase(),
      fetchPriority: ($el.attr('fetchpriority') || '').toLowerCase(),
      hasSrcset: !!$el.attr('srcset'),
      order: i,
      insideLink: $el.parents('a').length > 0,
    });
  });

  /* ---------- forms ---------- */
  const forms: FormFact[] = [];
  let unlabelledInputs = 0;
  const idSet = new Map<string, number>();
  $('[id]').each((_, el) => {
    const id = $(el).attr('id') || '';
    idSet.set(id, (idSet.get(id) || 0) + 1);
  });

  $('form').each((_, el) => {
    const $form = $(el);
    const controls = $form.find('input,select,textarea').filter((_, c) => {
      const t = ($(c).attr('type') || '').toLowerCase();
      return !['hidden', 'submit', 'button', 'reset', 'image'].includes(t);
    });
    let unlabelled = 0;
    let placeholderOnly = 0;
    controls.each((_, c) => {
      const $c = $(c);
      const id = $c.attr('id');
      const labelled =
        (!!id && $form.find(`label[for="${id.replace(/"/g, '\\"')}"]`).length > 0) ||
        $c.parents('label').length > 0 ||
        !!$c.attr('aria-label') ||
        !!$c.attr('aria-labelledby') ||
        !!$c.attr('title');
      if (!labelled) {
        unlabelled++;
        if ($c.attr('placeholder')) placeholderOnly++;
      }
    });
    unlabelledInputs += unlabelled;

    const signature = [
      $form.attr('action') || '', $form.attr('id') || '', $form.attr('class') || '',
    ].join(' ').toLowerCase();
    const hasEmailField =
      $form.find('input[type="email" i]').length > 0 ||
      $form.find('input[name*="email" i]').length > 0;
    const hasTextarea = $form.find('textarea').length > 0;

    forms.push({
      action: $form.attr('action') || '',
      method: ($form.attr('method') || 'get').toLowerCase(),
      fieldCount: controls.length,
      hasEmailField,
      hasTextarea,
      unlabelledFields: unlabelled,
      placeholderOnly,
      isNewsletter:
        /newsletter|subscribe|signup|sign-up|mailing/.test(signature) ||
        (hasEmailField && !hasTextarea && controls.length <= 2),
      isContact:
        /contact|enquir|inquir|quote|request|book|estimate/.test(signature) ||
        (hasEmailField && hasTextarea),
    });
  });

  // Squarespace's current Form Block ships as a web component: the served HTML
  // contains only a placeholder and a loader script, and the real <form> is
  // created by JavaScript. Counting `<form>` elements alone would therefore
  // report "this site has no contact form" on sites that plainly do.
  const formBlockPlaceholders =
    $('.sqs-block-form, [data-block-type="form"]').length ||
    (/website\.components\.form/.test(page.html) ? 1 : 0);

  // Plenty of Squarespace sites take enquiries through an embedded third-party
  // form rather than a Form Block. Those also render in the browser, so the
  // served HTML holds only a script tag and an empty div. Missing them means
  // telling a business with a working contact page that nobody can reach them,
  // which is the worst thing this tool can get wrong.
  const embeddedFormProviders = new Set<string>();
  for (const [name, re] of EMBEDDED_FORM_PROVIDERS) {
    if (re.test(page.html)) embeddedFormProviders.add(name);
  }

  // Email addresses written as plain text rather than linked. Still a way to
  // reach the business, and worth distinguishing from having nothing at all.
  const textEmails = Array.from(
    new Set(
      (mainText.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g) || [])
        .map((e) => e.toLowerCase())
        .filter((e) => !/\.(png|jpe?g|gif|webp|svg)$/.test(e))
    )
  ).slice(0, 5);

  /* ---------- structured data ---------- */
  const jsonLd: PageFacts['jsonLd'] = [];
  const schemaTypes = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      const cleaned = raw
        .replace(/^﻿/, '')
        .replace(/<!\[CDATA\[|\]\]>/g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      jsonLd.push({ raw: raw.slice(0, 4000), parsed });
      const walk = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(walk);
        const t = node['@type'];
        if (typeof t === 'string') schemaTypes.add(t);
        else if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && schemaTypes.add(x));
        if (node['@graph']) walk(node['@graph']);
        for (const v of Object.values(node)) if (v && typeof v === 'object') walk(v);
      };
      walk(parsed);
    } catch (e: any) {
      jsonLd.push({ raw: raw.slice(0, 800), parsed: null, error: e?.message || 'parse error' });
    }
  });

  /**
   * Contact details that live in structured data or in Squarespace's own
   * settings JSON rather than in a visible link. A site whose only email is an
   * icon in a client-rendered footer still has a contact route, and calling it
   * "no way to contact you" would be flatly wrong. It is worth reporting
   * separately, because a crawler that does not run JavaScript sees what we see.
   */
  const markupEmails = new Set<string>();
  const markupPhones = new Set<string>();
  const collectContacts = (node: any, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 6) return;
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string') {
        const key = k.toLowerCase();
        if (key === 'email' && /[\w.+-]+@[\w-]+\.[\w.]{2,}/.test(v)) {
          markupEmails.add(v.replace(/^mailto:/i, '').toLowerCase());
        } else if ((key === 'telephone' || key === 'phone') && /\d{5,}/.test(v.replace(/\D/g, ''))) {
          markupPhones.add(v.trim());
        } else if (/^mailto:/i.test(v)) {
          markupEmails.add(v.slice(7).toLowerCase());
        }
      } else if (v && typeof v === 'object') {
        collectContacts(v, depth + 1);
      }
    }
  };
  for (const entry of jsonLd) collectContacts(entry.parsed);
  // Squarespace stores footer social links, including an email link, in its
  // own inline settings JSON rather than as an anchor in the served HTML.
  for (const m of (page.html || '').matchAll(/"profileUrl":"mailto:([^"]+)"/gi)) {
    markupEmails.add(m[1].toLowerCase());
  }
  const markupContacts = {
    emails: Array.from(markupEmails).slice(0, 5),
    phones: Array.from(markupPhones).slice(0, 5),
  };

  /* ---------- social ---------- */
  const og: Record<string, string> = {};
  const twitter: Record<string, string> = {};
  $('meta').each((_, el) => {
    const $el = $(el);
    const key = ($el.attr('property') || $el.attr('name') || '').toLowerCase();
    const val = $el.attr('content') || '';
    if (key.startsWith('og:')) og[key] = og[key] ? og[key] : val;
    if (key.startsWith('twitter:')) twitter[key] = twitter[key] ? twitter[key] : val;
  });

  /* ---------- resources ---------- */
  const headHtml = $.html($('head')) || '';
  const scripts: PageFacts['scripts'] = [];
  $('script').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src') || null;
    const abs = src ? absolute(src, base) : null;
    const inHead = $el.parents('head').length > 0;
    scripts.push({
      src: abs,
      async: $el.attr('async') !== undefined,
      defer: $el.attr('defer') !== undefined,
      module: ($el.attr('type') || '') === 'module',
      inHead,
      inlineBytes: src ? 0 : Buffer.byteLength($el.contents().text() || '', 'utf8'),
    });
  });

  const stylesheets: PageFacts['stylesheets'] = [];
  $('link[rel="stylesheet" i]').each((_, el) => {
    const $el = $(el);
    const href = absolute($el.attr('href') || '', base);
    if (!href) return;
    stylesheets.push({
      href,
      media: ($el.attr('media') || '').toLowerCase(),
      inHead: $el.parents('head').length > 0,
    });
  });

  const iframes: PageFacts['iframes'] = [];
  let iframesWithoutTitle = 0;
  $('iframe').each((_, el) => {
    const $el = $(el);
    const src = absolute($el.attr('src') || '', base) || '';
    const t = ($el.attr('title') || $el.attr('aria-label') || '').trim();
    if (!t && $el.attr('aria-hidden') !== 'true') iframesWithoutTitle++;
    iframes.push({ src, title: t });
  });

  const pageHost = (() => {
    try {
      return new URL(base).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();
  const thirdPartyHosts = new Set<string>();
  const collectHost = (u: string | null) => {
    if (!u) return;
    try {
      const h = new URL(u).hostname.replace(/^www\./, '');
      if (h && h !== pageHost && !h.endsWith('.' + pageHost)) thirdPartyHosts.add(h);
    } catch {
      /* ignore */
    }
  };
  scripts.forEach((s) => collectHost(s.src));
  stylesheets.forEach((s) => collectHost(s.href));
  iframes.forEach((f) => collectHost(f.src));

  /* ---------- CTAs ---------- */
  const bodyHtml = $.html($('body')) || page.html;
  const bodyLen = Math.max(1, bodyHtml.length);
  const ctas: PageFacts['ctas'] = [];
  $('a,button').each((_, el) => {
    const $el = $(el);
    const text = $el.text().replace(/\s+/g, ' ').trim();
    if (!text || text.length > 60) return;
    const cls = ($el.attr('class') || '').toLowerCase();
    const looksButton = /\b(btn|button|cta|sqs-block-button|sqs-button-element)/.test(cls);
    if (!looksButton && !CTA_VERBS.test(text)) return;
    const html = $.html($el);
    const offset = bodyHtml.indexOf(html.slice(0, 120));
    ctas.push({
      text,
      offsetPct: offset >= 0 ? Math.round((offset / bodyLen) * 100) : 100,
      strong: CTA_VERBS.test(text) && !WEAK_CTA.test(text),
    });
  });

  /* ---------- accessibility extras ---------- */
  let positiveTabindex = 0;
  $('[tabindex]').each((_, el) => {
    if (Number($(el).attr('tabindex')) > 0) positiveTabindex++;
  });
  let ariaHiddenFocusable = 0;
  $('[aria-hidden="true"]').each((_, el) => {
    if ($(el).find('a[href],button,input,select,textarea,[tabindex]').length > 0) {
      ariaHiddenFocusable++;
    }
  });
  let buttonsWithoutName = 0;
  $('button,[role="button"]').each((_, el) => {
    const $el = $(el);
    const name = ($el.text() || '').trim() || $el.attr('aria-label') || $el.attr('title') || '';
    if (!name.trim()) buttonsWithoutName++;
  });
  const emptyHeadings = headings.filter((h) => !h.text).length;
  const duplicateIds = Array.from(idSet.entries())
    .filter(([, n]) => n > 1)
    .map(([id]) => id)
    .slice(0, 10);

  const firstFocusable = $('body a[href]').first();
  const hasSkipLink =
    firstFocusable.length > 0 && /skip.*(content|main|navigation)/i.test(firstFocusable.text());

  /* ---------- mobile / mixed content ---------- */
  let fixedWidthHits = 0;
  let smallFontHits = 0;
  let inlineStyleBytes = 0;
  $('[style]').each((_, el) => {
    const s = $(el).attr('style') || '';
    inlineStyleBytes += s.length;
    const w = s.match(/(?:^|[^-])width\s*:\s*(\d{3,})px/i);
    if (w && Number(w[1]) > 480 && (el as any).tagName !== 'img') fixedWidthHits++;
    const f = s.match(/font-size\s*:\s*([\d.]+)px/i);
    if (f && Number(f[1]) < 12) smallFontHits++;
  });
  $('style').each((_, el) => {
    inlineStyleBytes += ($(el).contents().text() || '').length;
  });

  const mixedActive: string[] = [];
  const mixedPassive: string[] = [];
  if (isHttps) {
    const activeRe = /(?:src|href|action)\s*=\s*["'](http:\/\/[^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = activeRe.exec(page.html)) && mixedActive.length + mixedPassive.length < 40) {
      const url = m[1];
      if (/\.(js|css)(\?|$)/i.test(url) || /action=/i.test(m[0])) mixedActive.push(url);
      else mixedPassive.push(url);
    }
  }

  const base64Bytes = (page.html.match(/data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+/gi) || []).reduce(
    (a, b) => a + b.length,
    0
  );

  const bodyClass = $('body').attr('class') || '';

  const primaryNav = $('nav,[role="navigation"]').first();
  const navDirectLinks = primaryNav.find('> ul > li > a, > ul > li > div > a, > a').length;
  const navAllLinks = primaryNav.find('a').length;
  const navLinkCount = navDirectLinks > 0 ? navDirectLinks : navAllLinks;

  const pageType = classifyPageType({
    url: base,
    depth: page.depth,
    wordCount,
    schemaTypes: Array.from(schemaTypes),
    images,
    forms,
    html: page.html,
  });

  return {
    url: base,
    status: page.status,
    depth: page.depth,
    bytes: page.bytes,
    ttfbMs: page.ttfbMs,
    headers: page.headers,
    redirectChain: page.redirectChain,

    title,
    titleCount: titleEls.length,
    metaDescription,
    metaDescriptionCount: descEls.length,
    canonical: canonicalHref ? absolute(canonicalHref, base) : null,
    canonicalCount: canonicalEls.length + (page.headers['link']?.includes('rel="canonical"') ? 1 : 0),
    metaRobots,
    xRobotsTag: (page.headers['x-robots-tag'] || '').toLowerCase(),
    lang: ($('html').attr('lang') || '').trim(),
    viewport,
    viewportCount: viewportEls.length,
    charset: $('meta[charset]').attr('charset') || '',

    h1,
    headings,
    headingSkips,

    wordCount,
    mainText,
    textSample: mainText.slice(0, 6000),

    links,
    contentLinks,
    internalLinks,
    images,
    forms,
    formBlockPlaceholders,
    embeddedFormProviders: Array.from(embeddedFormProviders),
    textEmails,
    markupContacts,

    jsonLd,
    schemaTypes: Array.from(schemaTypes),

    og,
    twitter,

    scripts,
    stylesheets,
    iframes,
    thirdPartyHosts: Array.from(thirdPartyHosts),
    inlineStyleBytes,

    telLinks: Array.from(new Set(telLinks)),
    mailtoLinks: Array.from(new Set(mailtoLinks)),
    ctas,
    hasSkipLink,
    landmarks: {
      main: $('main,[role="main"]').length,
      nav: $('nav,[role="navigation"]').length,
      header: $('header,[role="banner"]').length,
      footer: $('footer,[role="contentinfo"]').length,
    },
    navLinkCount,

    a11y: {
      imagesMissingAlt,
      linksWithoutName,
      genericLinkText,
      unlabelledInputs,
      iframesWithoutTitle,
      positiveTabindex,
      emptyHeadings,
      duplicateIds,
      ariaHiddenFocusable,
      buttonsWithoutName,
    },

    fixedWidthHits,
    smallFontHits,
    mixedContentActive: mixedActive,
    mixedContentPassive: mixedPassive,
    base64Bytes,

    isSquarespaceSystemPage: /squarespace-system-page/.test(bodyClass),
    pageType,
  };
}

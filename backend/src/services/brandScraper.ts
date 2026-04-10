import fetch from 'node-fetch';

/**
 * Thrown when the URL is not a Squarespace site.
 * Squarespell is Squarespace-ONLY by design (per product decision).
 * Route handlers catch this and return HTTP 422 with a user-facing message.
 */
export class NotSquarespaceError extends Error {
  readonly hostname: string;
  readonly code = 'NOT_SQUARESPACE' as const;
  constructor(hostname: string) {
    super(`${hostname} is not a Squarespace site. Squarespell only works with Squarespace websites.`);
    this.name = 'NotSquarespaceError';
    this.hostname = hostname;
  }
}

/**
 * Scrapes a SQUARESPACE website to extract:
 * 1. Brand visuals (colors, fonts, favicon, site name) from Squarespace CSS vars
 * 2. Business context (what the company does) from meta, headings, paragraphs, JSON-LD
 *
 * Hard-fails with NotSquarespaceError if the URL is not a Squarespace site.
 */
export async function scrapeBrand(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });
    const html = await res.text();
    console.log(`[Scraper] Fetched ${url}  -  ${html.length} chars, status ${res.status}`);

    // ── Site identity ──────────────────────────────────────────────────────
    const siteName =
      html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i)?.[1] ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:site_name"/i)?.[1] ||
      html.match(/<title>([^<|]+)/i)?.[1]?.trim() ||
      new URL(url).hostname.replace('www.', '');

    const faviconPath =
      html.match(/<link[^>]+rel="(?:shortcut )?icon"[^>]+href="([^"]+)"/i)?.[1] || '/favicon.ico';
    const faviconUrl = faviconPath.startsWith('http')
      ? faviconPath
      : `${new URL(url).origin}${faviconPath.startsWith('/') ? '' : '/'}${faviconPath}`;

    // ── Strategy 1: JSON-LD structured data ───────────────────────────────
    let jsonLdData: any = null;
    const jsonLdBlocks: string[] = [];
    const jsonLdRegex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let jm;
    while ((jm = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(jm[1].trim());
        jsonLdBlocks.push(JSON.stringify(parsed));
        if (!jsonLdData) jsonLdData = parsed;
      } catch {}
    }
    console.log(`[Scraper] JSON-LD blocks found: ${jsonLdBlocks.length}`);

    // Extract business info from JSON-LD
    let jsonLdDescription = '';
    let jsonLdType = '';
    let jsonLdServices: string[] = [];
    if (jsonLdData) {
      jsonLdDescription = jsonLdData.description || jsonLdData.about?.description || '';
      jsonLdType = jsonLdData['@type'] || '';
      if (jsonLdData.hasOfferCatalog?.itemListElement) {
        jsonLdServices = jsonLdData.hasOfferCatalog.itemListElement
          .map((item: any) => item.name || item.itemOffered?.name)
          .filter(Boolean);
      }
      if (jsonLdData.makesOffer) {
        jsonLdServices.push(...(Array.isArray(jsonLdData.makesOffer)
          ? jsonLdData.makesOffer.map((o: any) => o.name || o.itemOffered?.name).filter(Boolean)
          : []));
      }
    }

    // ── Strategy 2: Squarespace-specific data ─────────────────────────────
    let squarespaceContext = '';
    let isSquarespace = false;

    // Detect Squarespace — Squarespell is Squarespace-ONLY, hard-fail otherwise
    if (
      html.includes('Static.SQUARESPACE_CONTEXT') ||
      html.includes('static1.squarespace.com') ||
      html.includes('static.squarespace') ||
      /<meta[^>]+content="[^"]*Squarespace[^"]*"/i.test(html) ||
      /generator"[^>]+content="Squarespace/i.test(html)
    ) {
      isSquarespace = true;
      console.log('[Scraper] Squarespace site detected');
    }

    if (!isSquarespace) {
      const hostname = new URL(url).hostname.replace(/^www\./, '');
      console.warn(`[Scraper] HARD FAIL: ${hostname} is not a Squarespace site`);
      throw new NotSquarespaceError(hostname);
    }

    const sqspMatch = html.match(/Static\.SQUARESPACE_CONTEXT\s*=\s*(\{[\s\S]*?\});/);
    if (sqspMatch) {
      try {
        const sqspData = JSON.parse(sqspMatch[1]);
        squarespaceContext = JSON.stringify(sqspData).slice(0, 500);
        console.log('[Scraper] Squarespace context found');
      } catch {}
    }

    // Try Squarespace collection data
    const collectionMatch = html.match(/"collection"\s*:\s*(\{[\s\S]*?\})\s*[,}]/);
    let sqspCollectionInfo = '';
    if (collectionMatch) {
      try {
        const coll = JSON.parse(collectionMatch[1]);
        sqspCollectionInfo = `Collection: ${coll.title || ''} - ${coll.description || ''}`;
      } catch {}
    }

    // ── Strategy 3: Standard HTML extraction ──────────────────────────────
    // Strip ONLY scripts, styles, footer, noscript  -  keep everything else
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Meta descriptions
    const metaDescription =
      html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+name="description"/i)?.[1] || '';

    const ogDescription =
      html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i)?.[1] || '';

    const ogTitle =
      html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] || '';

    // Extract ALL headings (h1-h4)  -  these reveal core value props
    const headings: string[] = [];
    const headingRegex = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi;
    let match;
    while ((match = headingRegex.exec(html)) !== null && headings.length < 15) {
      const clean = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (clean.length > 3 && clean.length < 200) headings.push(clean);
    }

    // Extract paragraphs  -  main content
    const paragraphs: string[] = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    while ((match = pRegex.exec(html)) !== null && paragraphs.length < 12) {
      const clean = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (clean.length > 20 && clean.length < 600) paragraphs.push(clean);
    }

    // Extract link texts (navigation, services, products)
    const linkTexts: string[] = [];
    const linkRegex = /<a[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = linkRegex.exec(html)) !== null && linkTexts.length < 25) {
      const clean = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (clean.length > 2 && clean.length < 80 && !/^(home|menu|close|skip|#|back|top)/i.test(clean)) {
        linkTexts.push(clean);
      }
    }

    // Extract list items  -  often contain services, features, benefits
    const listItems: string[] = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    while ((match = liRegex.exec(html)) !== null && listItems.length < 20) {
      const clean = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (clean.length > 5 && clean.length < 200) listItems.push(clean);
    }

    // Extract button/CTA text  -  reveals key actions
    const ctaTexts: string[] = [];
    const btnRegex = /<(?:button|a)[^>]*class="[^"]*(?:btn|button|cta)[^"]*"[^>]*>([\s\S]*?)<\/(?:button|a)>/gi;
    while ((match = btnRegex.exec(html)) !== null && ctaTexts.length < 10) {
      const clean = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (clean.length > 2 && clean.length < 60) ctaTexts.push(clean);
    }

    // Extract image alt texts  -  describe products/services
    const altTexts: string[] = [];
    const imgRegex = /<img[^>]+alt="([^"]{5,120})"/gi;
    while ((match = imgRegex.exec(html)) !== null && altTexts.length < 10) {
      altTexts.push(match[1].trim());
    }

    // Body text excerpt  -  first ~2500 chars of clean text
    const bodyText = textContent.slice(0, 2500);

    // ── Build comprehensive business summary ──────────────────────────────
    const summaryParts = [
      ogTitle && `Page title: ${ogTitle}`,
      metaDescription && `Meta description: ${metaDescription}`,
      ogDescription && ogDescription !== metaDescription && `About: ${ogDescription}`,
      jsonLdType && `Business type (JSON-LD): ${jsonLdType}`,
      jsonLdDescription && `Business description (JSON-LD): ${jsonLdDescription}`,
      jsonLdServices.length > 0 && `Services listed (structured data): ${jsonLdServices.join(', ')}`,
      sqspCollectionInfo,
      headings.length > 0 && `Page headings: ${headings.join(' | ')}`,
      paragraphs.length > 0 && `Page content:\n${paragraphs.join('\n')}`,
      listItems.length > 0 && `Listed items/features: ${listItems.join(' | ')}`,
      ctaTexts.length > 0 && `Call-to-action buttons: ${ctaTexts.join(' | ')}`,
      altTexts.length > 0 && `Image descriptions: ${altTexts.join(' | ')}`,
      linkTexts.length > 0 && `Navigation/links: ${[...new Set(linkTexts)].join(' | ')}`,
      bodyText.length > 200 && `Full page text (excerpt):\n${bodyText}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const businessSummary = summaryParts.slice(0, 3500);

    console.log(`[Scraper] Extracted: ${headings.length} headings, ${paragraphs.length} paragraphs, ${linkTexts.length} links, ${listItems.length} list items`);
    console.log(`[Scraper] Business summary length: ${businessSummary.length} chars`);
    console.log(`[Scraper] First 300 chars of summary: ${businessSummary.slice(0, 300)}`);

    // ── Brand visuals extraction ───────────────────────────────────────────
    const inlineStyles = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [])
      .map((s: string) => s.replace(/<\/?style[^>]*>/gi, ''))
      .join('\n');

    // Try to fetch up to 4 external stylesheets for better color extraction.
    // For Squarespace we specifically want site.css and any stylesheet on static1.squarespace.com
    const sheetHrefs: string[] = [];
    const sheetRegex = /<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css[^"]*)"/gi;
    let sheetMatch;
    while ((sheetMatch = sheetRegex.exec(html)) !== null && sheetHrefs.length < 6) {
      sheetHrefs.push(sheetMatch[1]);
    }
    // Rank: prefer Squarespace site css, then local css, then external
    sheetHrefs.sort((a, b) => {
      const aSite = /site\.css|static1\.squarespace\.com/i.test(a) ? 0 : 1;
      const bSite = /site\.css|static1\.squarespace\.com/i.test(b) ? 0 : 1;
      return aSite - bSite;
    });
    let externalCss = '';
    for (const href of sheetHrefs.slice(0, 4)) {
      const sheetUrl = href.startsWith('http') ? href : `${new URL(url).origin}${href.startsWith('/') ? '' : '/'}${href}`;
      try {
        const r = await fetch(sheetUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
        externalCss += (await r.text()).slice(0, 120000) + '\n';
      } catch {}
    }

    const allCss = inlineStyles + '\n' + externalCss;

    // ── Squarespace / generic CSS custom property extraction ─────────────
    // Colors can appear as hex (#rgb, #rrggbb, #rrggbbaa), rgb(), rgba(), or hsl()
    const COLOR_VAL = '(?:#[0-9a-fA-F]{3,8}|rgba?\\([^)]+\\)|hsla?\\([^)]+\\))';

    // Extract ALL CSS custom property declarations and count their values
    // Multiple occurrences of the same --var with the same value means it's used in many sections
    const varOccurrences: Record<string, Record<string, number>> = {};
    const varRegex = new RegExp(`--([a-zA-Z][\\w-]*)\\s*:\\s*(${COLOR_VAL})`, 'g');
    let vm;
    while ((vm = varRegex.exec(allCss)) !== null) {
      const name = vm[1];
      const value = vm[2].toLowerCase().replace(/\s+/g, '');
      if (!varOccurrences[name]) varOccurrences[name] = {};
      varOccurrences[name][value] = (varOccurrences[name][value] || 0) + 1;
    }
    // Helper: return the most frequent value for a given var name
    const pickVar = (name: string): string | null => {
      const values = varOccurrences[name];
      if (!values) return null;
      const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
      return entries[0]?.[0] || null;
    };
    // Case-insensitive lookup because Squarespace uses camelCase but other sites kebab-case
    const pickVarAny = (...names: string[]): string | null => {
      for (const n of names) {
        const v = pickVar(n);
        if (v) return v;
      }
      // Try case-insensitive fallback across all var names
      const wanted = names.map(n => n.toLowerCase());
      for (const [name, values] of Object.entries(varOccurrences)) {
        if (wanted.includes(name.toLowerCase())) {
          const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
          if (entries[0]) return entries[0][0];
        }
      }
      return null;
    };

    console.log(`[Scraper] CSS custom props found: ${Object.keys(varOccurrences).length}`);
    const sqspCandidates = Object.keys(varOccurrences).filter(n =>
      /^(site|heading|paragraph|navigationLink|primaryButton|secondaryButton|tertiaryButton|accent|colorAccent|logoColor|tweak)/i.test(n)
    );
    console.log(`[Scraper] Squarespace-style vars matched: ${sqspCandidates.slice(0, 20).join(', ')}`);

    const extractVar = (v: string) => {
      const bareName = v.replace(/^--/, '');
      return pickVar(bareName);
    };
    const extractProp = (sel: string, prop: string) =>
      allCss.match(new RegExp(`${sel}[^{]*{[^}]*${prop}\\s*:\\s*(${COLOR_VAL})`, 'i'))?.[1] ?? null;

    // Extract theme-color meta tag (many sites set this)
    const themeColor = html.match(/<meta[^>]+name="theme-color"[^>]+content="([^"]+)"/i)?.[1] ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+name="theme-color"/i)?.[1] || '';
    const tileColor = html.match(/<meta[^>]+name="msapplication-TileColor"[^>]+content="([^"]+)"/i)?.[1] || '';

    // Extract all hex colors from CSS, sorted by frequency (excluding pure white/black/grays)
    const allHexColors: Record<string, number> = {};
    const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
    let hexMatch;
    while ((hexMatch = hexRegex.exec(allCss)) !== null) {
      const hex = hexMatch[0].toLowerCase();
      if (/^#(fff|000|[0-9a-f])\1*$/i.test(hex)) continue;
      if (/^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/i.test(hex)) continue;
      allHexColors[hex] = (allHexColors[hex] || 0) + 1;
    }
    const topColors = Object.entries(allHexColors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([c]) => c);

    // Font detection: prefer Squarespace heading font, then body font, then any custom prop
    const fontFamily =
      allCss.match(/--heading-font-font-family\s*:\s*['"]?([^'";,]+)/i)?.[1]?.trim() ||
      allCss.match(/--body-font-font-family\s*:\s*['"]?([^'";,]+)/i)?.[1]?.trim() ||
      extractVar('--heading-font-font-family') ||
      extractVar('--body-font-font-family') ||
      extractVar('--base-font') ||
      extractVar('--font-family') ||
      extractVar('--body-font') ||
      allCss.match(/font-family\s*:\s*['"]?([A-Za-z][\w\s]+)['"]?\s*[,;]/)?.[1]?.trim() ||
      'sans-serif';

    // ── Color picking strategy (Squarespace → generic → fallback) ──────
    // Squarespace 7.1: --siteBackgroundColor, --primaryButtonBackgroundColor,
    // --headingLargeColor, --paragraphMediumColor, --accentColor
    // Older 7.1 tweaks: --tweak-site-background-color, --tweak-color-button-primary-background

    const primaryColor =
      pickVarAny('primaryButtonBackgroundColor', 'accentColor', 'colorAccent', 'lightAccentColor', 'darkAccentColor') ||
      pickVarAny('tweak-color-button-primary-background', 'tweak-global-accent-color', 'tweak-accent-color', 'tweak-site-accent-color') ||
      themeColor ||
      tileColor ||
      extractVar('--primary-color') ||
      extractVar('--primary') ||
      extractVar('--accent-color') ||
      extractVar('--accent') ||
      extractVar('--brand-color') ||
      extractVar('--color-primary') ||
      extractVar('--wp--preset--color--primary') ||
      extractProp('\\.btn-primary', 'background-color') ||
      extractProp('\\.btn-primary', 'background') ||
      extractProp('\\.sqs-block-button-element', 'background-color') ||
      extractProp('\\.sqs-block-button-element', 'background') ||
      extractProp('a', 'color') ||
      (topColors.length > 0 ? topColors[0] : '#000000');

    const bgColor =
      pickVarAny('siteBackgroundColor') ||
      pickVarAny('tweak-site-background-color', 'tweak-global-bg-color', 'tweak-background-color') ||
      extractVar('--bg-color') ||
      extractVar('--background') ||
      extractVar('--color-background') ||
      extractProp('body', 'background-color') ||
      extractProp('body', 'background') ||
      extractProp(':root', 'background') ||
      '#ffffff';

    const textColor =
      pickVarAny('headingLargeColor', 'headingMediumColor', 'paragraphMediumColor', 'paragraphLargeColor', 'siteTitleColor', 'navigationLinkColor') ||
      pickVarAny('tweak-paragraph-medium-color', 'tweak-heading-large-color', 'tweak-heading-color-on-background', 'tweak-text-color') ||
      extractVar('--text-color') ||
      extractVar('--color-text') ||
      extractProp('body', 'color') ||
      '#000000';

    const accentColor =
      pickVarAny('primaryButtonTextColor', 'lightAccentColor', 'darkAccentColor', 'secondaryButtonBackgroundColor') ||
      pickVarAny('tweak-color-button-primary-text', 'tweak-secondary-color') ||
      extractVar('--accent') ||
      extractVar('--secondary') ||
      extractVar('--color-accent') ||
      (topColors.length > 1 ? topColors[1] : primaryColor);

    console.log(`[Scraper] Colors detected - primary: ${primaryColor}, bg: ${bgColor}, text: ${textColor}, accent: ${accentColor}`);
    console.log(`[Scraper] Theme-color meta: ${themeColor || 'none'}, Top CSS colors: ${topColors.slice(0, 5).join(', ')}`);
    console.log(`[Scraper] Font family: ${fontFamily}`);

    return {
      detected: true,
      colors: {
        background: bgColor,
        primary: primaryColor,
        text: textColor,
        accent: accentColor,
      },
      font_family: fontFamily,
      font_fallback: 'sans-serif',
      site_name: siteName,
      favicon_url: faviconUrl,
      business: {
        summary: businessSummary,
        meta_description: metaDescription,
        headings: headings.slice(0, 10),
        key_content: paragraphs.slice(0, 6),
        json_ld: jsonLdBlocks.length > 0 ? jsonLdBlocks[0]?.slice(0, 500) : null,
      },
    };
  } catch (err: any) {
    // NotSquarespaceError bubbles up so routes can return a clean 422
    if (err instanceof NotSquarespaceError) throw err;
    console.error(`[Scraper] FAILED for ${url}:`, err.message);
    // Network/parse failures fall through to a detected:false result so the
    // frontend can show a neutral dark theme and continue (no hard block here)
    return {
      detected: false,
      colors: { background: '#0a0f05', primary: '#D2FF1D', text: '#e8f5c8', accent: '#D2FF1D' },
      font_family: 'Poppins',
      font_fallback: 'sans-serif',
      site_name: '',
      favicon_url: '',
      business: { summary: '', meta_description: '', headings: [], key_content: [], json_ld: null },
    };
  } finally {
    clearTimeout(timeout);
  }
}

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
    // For Squarespace we specifically want site.css and any stylesheet on static1.squarespace.com.
    // Some sites put href BEFORE rel so try both regex orderings.
    const sheetHrefs = new Set<string>();
    const sheetRegex1 = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+\.css[^"']*)["']/gi;
    const sheetRegex2 = /<link[^>]+href=["']([^"']+\.css[^"']*)["'][^>]+rel=["']stylesheet["']/gi;
    let sheetMatch;
    while ((sheetMatch = sheetRegex1.exec(html)) !== null) sheetHrefs.add(sheetMatch[1]);
    while ((sheetMatch = sheetRegex2.exec(html)) !== null) sheetHrefs.add(sheetMatch[1]);
    // Rank: prefer Squarespace site.css first, then any squarespace CDN, then others.
    const rankedHrefs = Array.from(sheetHrefs).sort((a, b) => {
      const score = (s: string) => {
        if (/site\.css/i.test(s)) return 0;
        if (/static1\.squarespace\.com|sqspcdn\.com|squarespace\.com/i.test(s)) return 1;
        return 2;
      };
      return score(a) - score(b);
    });
    // Absolute URL builder that handles protocol-relative `//cdn.x.com/foo.css` correctly.
    const absolutize = (href: string): string => {
      const h = href.trim();
      if (h.startsWith('http://') || h.startsWith('https://')) return h;
      if (h.startsWith('//')) return `https:${h}`; // protocol-relative
      const base = new URL(url);
      if (h.startsWith('/')) return `${base.origin}${h}`;
      return `${base.origin}/${h}`;
    };
    let externalCss = '';
    let fetchedSheets = 0;
    for (const href of rankedHrefs.slice(0, 5)) {
      const sheetUrl = absolutize(href);
      try {
        const r = await fetch(sheetUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
        // Raise truncation cap so large Squarespace site.css files (1MB+) still include the :root HSL triples at the top
        externalCss += (await r.text()).slice(0, 300000) + '\n';
        fetchedSheets++;
      } catch {}
    }
    console.log(`[Scraper] External stylesheets fetched: ${fetchedSheets}/${rankedHrefs.length} (top: ${rankedHrefs[0] || 'none'})`);

    const allCss = inlineStyles + '\n' + externalCss;

    // ── Squarespace / generic CSS custom property extraction ─────────────
    // Colors can appear as hex (#rgb, #rrggbb, #rrggbbaa), rgb(), rgba(), or hsl()
    const COLOR_VAL = '(?:#[0-9a-fA-F]{3,8}|rgba?\\([^)]+\\)|hsla?\\([^)]+\\))';

    // Squarespace 7.1 defines HSL triples (H,S%,L%) at :root that get referenced
    // by hsla(var(--accent-hsl), 1) elsewhere. Extract these first so we can
    // inline the var() references into concrete colors.
    //   e.g.  --lightAccent-hsl: 72,100%,56%
    //         --accent-hsl:      0,0%,0%
    const hslTriples: Record<string, string> = {};
    const hslTripleRegex = /--([a-zA-Z][\w-]*-hsl)\s*:\s*([0-9.]+\s*,\s*[0-9.]+%\s*,\s*[0-9.]+%)/g;
    let hm;
    while ((hm = hslTripleRegex.exec(allCss)) !== null) {
      const name = hm[1];
      const triple = hm[2].replace(/\s+/g, '');
      // First occurrence wins (theme root declaration is usually first)
      if (!hslTriples[name]) hslTriples[name] = triple;
    }
    console.log(`[Scraper] HSL triples found: ${Object.keys(hslTriples).length} (e.g. ${Object.entries(hslTriples).slice(0, 3).map(([k, v]) => `${k}=${v}`).join(', ')})`);

    // Pre-process CSS: flatten `hsla(var(--foo-hsl), ALPHA)` → `hsla(H,S%,L%,ALPHA)`
    // so the main COLOR_VAL regex (which doesn't handle nested parens) can pick
    // them up as concrete colors. Same for hsl(...) and rgba(var(--foo-rgb), A).
    const resolvedCss = allCss.replace(
      /hsla?\(\s*var\(--([a-zA-Z][\w-]*-hsl)\)\s*,\s*([^)]+)\)/gi,
      (original, name: string, alpha: string) => {
        const triple = hslTriples[name];
        if (!triple) return original;
        return `hsla(${triple},${alpha.trim()})`;
      }
    );

    // Extract the alpha channel from a CSS color (returns 1 for fully opaque, 0 for fully transparent).
    const getAlpha = (color: string): number => {
      const s = color.toLowerCase().replace(/\s+/g, '');
      // rgba(r,g,b,A) or hsla(h,s%,l%,A)
      const fnMatch = s.match(/^(?:rgba|hsla)\([^)]*,\s*([0-9.]+)\s*\)$/i);
      if (fnMatch) return parseFloat(fnMatch[1]);
      // 8-digit hex #rrggbbaa
      const hex8 = s.match(/^#([0-9a-f]{8})$/i);
      if (hex8) return parseInt(hex8[1].slice(6, 8), 16) / 255;
      // 4-digit hex #rgba
      const hex4 = s.match(/^#([0-9a-f]{4})$/i);
      if (hex4) {
        const a = hex4[1][3];
        return parseInt(a + a, 16) / 255;
      }
      return 1;
    };

    // "Colorful" test — used to prefer saturated colors over greyscale when picking primary.
    // Rejects low-alpha values (< 0.5) because a 14%-alpha lime renders invisible as a CTA.
    const isColorful = (color: string): boolean => {
      if (getAlpha(color) < 0.5) return false;
      const s = color.toLowerCase().replace(/\s+/g, '');
      const hslMatch = s.match(/hsla?\(([0-9.]+),([0-9.]+)%,([0-9.]+)%/);
      if (hslMatch) {
        const sat = parseFloat(hslMatch[2]);
        const light = parseFloat(hslMatch[3]);
        // Greyscale: sat < 12%, OR near-black (light<8%), OR near-white (light>95%)
        return sat >= 12 && light > 8 && light < 95;
      }
      const hexMatch = s.match(/^#([0-9a-f]{6})$/i);
      if (hexMatch) {
        const r = parseInt(hexMatch[1].slice(0, 2), 16);
        const g = parseInt(hexMatch[1].slice(2, 4), 16);
        const b = parseInt(hexMatch[1].slice(4, 6), 16);
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        return (max - min) > 25 && max > 20 && min < 240;
      }
      const rgbMatch = s.match(/rgba?\((\d+),(\d+),(\d+)/);
      if (rgbMatch) {
        const r = +rgbMatch[1], g = +rgbMatch[2], b = +rgbMatch[3];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        return (max - min) > 25 && max > 20 && min < 240;
      }
      return false;
    };

    // Extract ALL CSS custom property declarations and count their values.
    // Multiple occurrences of the same --var with the same value means it's used in many sections.
    const varOccurrences: Record<string, Record<string, number>> = {};
    const varRegex = new RegExp(`--([a-zA-Z][\\w-]*)\\s*:\\s*(${COLOR_VAL})`, 'g');
    let vm;
    while ((vm = varRegex.exec(resolvedCss)) !== null) {
      const name = vm[1];
      const raw = vm[2].toLowerCase().replace(/\s+/g, '');
      // Skip any remaining unresolved var() references — they'd render as broken CSS in the preview
      if (raw.includes('var(')) continue;
      if (!varOccurrences[name]) varOccurrences[name] = {};
      varOccurrences[name][raw] = (varOccurrences[name][raw] || 0) + 1;
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

    // Like pickVarAny, but across ALL matching var names it prefers colorful values
    // over greyscale, then by frequency. Critical for sites whose --primaryButtonBackgroundColor
    // resolves to black but whose --lightAccentColor resolves to a vibrant brand color.
    const pickColorfulVarAny = (...names: string[]): string | null => {
      const wanted = names.map(n => n.toLowerCase());
      const candidates: Array<{ value: string; count: number; colorful: boolean; priority: number }> = [];
      for (const [name, values] of Object.entries(varOccurrences)) {
        const idx = wanted.indexOf(name.toLowerCase());
        if (idx === -1) continue;
        for (const [val, cnt] of Object.entries(values)) {
          candidates.push({ value: val, count: cnt, colorful: isColorful(val), priority: idx });
        }
      }
      if (candidates.length === 0) return null;
      candidates.sort((a, b) => {
        // 1. Colorful wins over greyscale
        if (a.colorful !== b.colorful) return a.colorful ? -1 : 1;
        // 2. Within same colorfulness, prefer earlier priority (order passed to pickColorfulVarAny)
        if (a.priority !== b.priority) return a.priority - b.priority;
        // 3. Tiebreak by frequency
        return b.count - a.count;
      });
      return candidates[0].value;
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
      resolvedCss.match(new RegExp(`${sel}[^{]*{[^}]*${prop}\\s*:\\s*(${COLOR_VAL})`, 'i'))?.[1] ?? null;

    // Extract theme-color meta tag (many sites set this)
    const themeColor = html.match(/<meta[^>]+name="theme-color"[^>]+content="([^"]+)"/i)?.[1] ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+name="theme-color"/i)?.[1] || '';
    const tileColor = html.match(/<meta[^>]+name="msapplication-TileColor"[^>]+content="([^"]+)"/i)?.[1] || '';

    // Extract all hex colors from CSS, sorted by frequency (excluding pure white/black/grays)
    const allHexColors: Record<string, number> = {};
    const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
    let hexMatch;
    while ((hexMatch = hexRegex.exec(resolvedCss)) !== null) {
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
      resolvedCss.match(/--heading-font-font-family\s*:\s*['"]?([^'";,]+)/i)?.[1]?.trim() ||
      resolvedCss.match(/--body-font-font-family\s*:\s*['"]?([^'";,]+)/i)?.[1]?.trim() ||
      extractVar('--heading-font-font-family') ||
      extractVar('--body-font-font-family') ||
      extractVar('--base-font') ||
      extractVar('--font-family') ||
      extractVar('--body-font') ||
      resolvedCss.match(/font-family\s*:\s*['"]?([A-Za-z][\w\s]+)['"]?\s*[,;]/)?.[1]?.trim() ||
      'sans-serif';

    // ── Color picking strategy (Squarespace → generic → fallback) ──────
    // Squarespace 7.1: --siteBackgroundColor, --primaryButtonBackgroundColor,
    // --headingLargeColor, --paragraphMediumColor, --accentColor
    // Older 7.1 tweaks: --tweak-site-background-color, --tweak-color-button-primary-background

    // IMPORTANT: prefer a *colorful* brand var over greyscale. On squarespell.com
    // --primaryButtonBackgroundColor resolves to black but --lightAccent-hsl is lime.
    // pickColorfulVarAny picks the lime.
    const primaryColor =
      pickColorfulVarAny(
        'lightAccentColor',
        'primaryButtonBackgroundColor',
        'accentColor',
        'colorAccent',
        'darkAccentColor',
        'secondaryButtonBackgroundColor',
        'tertiaryButtonBackgroundColor'
      ) ||
      pickColorfulVarAny(
        'tweak-color-button-primary-background',
        'tweak-global-accent-color',
        'tweak-accent-color',
        'tweak-site-accent-color'
      ) ||
      pickVarAny('primaryButtonBackgroundColor', 'accentColor', 'colorAccent', 'lightAccentColor', 'darkAccentColor') ||
      pickVarAny('tweak-color-button-primary-background', 'tweak-global-accent-color', 'tweak-accent-color', 'tweak-site-accent-color') ||
      (themeColor && isColorful(themeColor) ? themeColor : null) ||
      (tileColor && isColorful(tileColor) ? tileColor : null) ||
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
      themeColor ||
      tileColor ||
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
        nav_links: [...new Set(linkTexts)].slice(0, 6),
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
      business: { summary: '', meta_description: '', headings: [], key_content: [], json_ld: null, nav_links: [] },
    };
  } finally {
    clearTimeout(timeout);
  }
}

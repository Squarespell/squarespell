import fetch from 'node-fetch';

/**
 * Scrapes a website to extract:
 * 1. Brand visuals (colors, fonts, favicon, site name)
 * 2. Business context (what the company actually does)
 *
 * Uses multiple strategies:
 * - HTML meta tags, headings, paragraphs
 * - JSON-LD structured data
 * - Squarespace-specific data extraction
 * - Link/nav analysis for services
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
    console.log(`[Scraper] Fetched ${url} — ${html.length} chars, status ${res.status}`);

    // ── Site identity ──────────────────────────────────────────────────────
    const siteName =
      html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i)?.[1] ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:site_name"/i)?.[1] ||
      html.match(/<title>([^<|–—]+)/i)?.[1]?.trim() ||
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
        sqspCollectionInfo = `Collection: ${coll.title || ''} — ${coll.description || ''}`;
      } catch {}
    }

    // ── Strategy 3: Standard HTML extraction ──────────────────────────────
    // Strip ONLY scripts, styles, footer, noscript — keep everything else
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

    // Extract ALL headings (h1-h4) — these reveal core value props
    const headings: string[] = [];
    const headingRegex = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi;
    let match;
    while ((match = headingRegex.exec(html)) !== null && headings.length < 15) {
      const clean = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (clean.length > 3 && clean.length < 200) headings.push(clean);
    }

    // Extract paragraphs — main content
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

    // Extract list items — often contain services, features, benefits
    const listItems: string[] = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    while ((match = liRegex.exec(html)) !== null && listItems.length < 20) {
      const clean = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (clean.length > 5 && clean.length < 200) listItems.push(clean);
    }

    // Extract button/CTA text — reveals key actions
    const ctaTexts: string[] = [];
    const btnRegex = /<(?:button|a)[^>]*class="[^"]*(?:btn|button|cta)[^"]*"[^>]*>([\s\S]*?)<\/(?:button|a)>/gi;
    while ((match = btnRegex.exec(html)) !== null && ctaTexts.length < 10) {
      const clean = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (clean.length > 2 && clean.length < 60) ctaTexts.push(clean);
    }

    // Extract image alt texts — describe products/services
    const altTexts: string[] = [];
    const imgRegex = /<img[^>]+alt="([^"]{5,120})"/gi;
    while ((match = imgRegex.exec(html)) !== null && altTexts.length < 10) {
      altTexts.push(match[1].trim());
    }

    // Body text excerpt — first ~2500 chars of clean text
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

    // Try to fetch first external stylesheet
    const sheetHref = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css[^"]*)"/i)?.[1];
    let externalCss = '';
    if (sheetHref) {
      const sheetUrl = sheetHref.startsWith('http') ? sheetHref : `${new URL(url).origin}${sheetHref}`;
      try {
        const r = await fetch(sheetUrl, { signal: controller.signal });
        externalCss = (await r.text()).slice(0, 50000);
      } catch {}
    }

    const allCss = inlineStyles + '\n' + externalCss;
    const HEX = /(?:#[0-9a-fA-F]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))/;
    const extractVar = (v: string) =>
      allCss.match(new RegExp(`${v}\\s*:\\s*(${HEX.source})`, 'i'))?.[1] ?? null;
    const extractProp = (sel: string, prop: string) =>
      allCss.match(new RegExp(`${sel}[^{]*{[^}]*${prop}\\s*:\\s*(${HEX.source})`, 'i'))?.[1] ?? null;

    const fontFamily =
      extractVar('--base-font') ||
      allCss.match(/font-family\s*:\s*['"]?([A-Za-z\s]+)['"]?\s*[,;]/)?.[1]?.trim() ||
      'sans-serif';

    return {
      detected: true,
      colors: {
        background:
          extractVar('--black') || extractProp('body', 'background-color') || '#ffffff',
        primary:
          extractVar('--tweak-color-button-primary-background') ||
          extractVar('--accent-color') ||
          extractProp('a', 'color') ||
          '#000000',
        text: extractVar('--white') || extractProp('body', 'color') || '#000000',
        accent:
          extractVar('--tweak-color-button-primary-text') ||
          extractVar('--accent-color') ||
          '#000000',
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
    console.error(`[Scraper] FAILED for ${url}:`, err.message);
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

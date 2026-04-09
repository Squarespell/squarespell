import fetch from 'node-fetch';

/**
 * Scrapes a website to extract:
 * 1. Brand visuals (colors, fonts, favicon, site name)
 * 2. Business context (what the company actually does — headings, meta, key text)
 *
 * The business context is CRITICAL for generating relevant quizzes.
 */
export async function scrapeBrand(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    const html = await res.text();

    // ── Site identity ──────────────────────────────────────────────────────
    const siteName =
      html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i)?.[1] ||
      html.match(/<title>([^<|–—]+)/i)?.[1]?.trim() ||
      new URL(url).hostname.replace('www.', '');

    const faviconPath =
      html.match(/<link[^>]+rel="(?:shortcut )?icon"[^>]+href="([^"]+)"/i)?.[1] || '/favicon.ico';
    const faviconUrl = faviconPath.startsWith('http')
      ? faviconPath
      : `${new URL(url).origin}${faviconPath.startsWith('/') ? '' : '/'}${faviconPath}`;

    // ── Business context extraction ────────────────────────────────────────
    // Strip ONLY scripts, styles, and footer — keep header, nav, main content
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Meta description — often the best one-line summary of the business
    const metaDescription =
      html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+name="description"/i)?.[1] ||
      '';

    // OG description (often more marketing-focused)
    const ogDescription =
      html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i)?.[1] ||
      '';

    // OG title
    const ogTitle =
      html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] || '';

    // Extract headings (h1, h2, h3) — these reveal the core value props
    const headings: string[] = [];
    const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
    let match;
    while ((match = headingRegex.exec(html)) !== null && headings.length < 10) {
      const clean = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (clean.length > 3 && clean.length < 200) headings.push(clean);
    }

    // Extract key paragraphs (first meaningful text on the page)
    const paragraphs: string[] = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    while ((match = pRegex.exec(html)) !== null && paragraphs.length < 8) {
      const clean = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (clean.length > 30 && clean.length < 500) paragraphs.push(clean);
    }

    // Detect keywords/services from the page
    const fullText = [metaDescription, ogDescription, ...headings, ...paragraphs].join(' ').toLowerCase();

    // Also extract link texts to understand site structure/services
    const linkTexts: string[] = [];
    const linkRegex = /<a[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = linkRegex.exec(html)) !== null && linkTexts.length < 20) {
      const clean = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (clean.length > 2 && clean.length < 60 && !/^(home|menu|close|skip|#)/i.test(clean)) linkTexts.push(clean);
    }

    // Extract list items — often contain services, features, benefits
    const listItems: string[] = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    while ((match = liRegex.exec(html)) !== null && listItems.length < 15) {
      const clean = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (clean.length > 5 && clean.length < 200) listItems.push(clean);
    }

    // Extract text from body (first ~2000 chars of readable text for richer context)
    const bodyText = textContent.slice(0, 2000);

    // Build a richer business summary (max ~2000 chars to send to Claude)
    const businessSummary = [
      ogTitle && `Title: ${ogTitle}`,
      metaDescription && `Description: ${metaDescription}`,
      ogDescription && ogDescription !== metaDescription && `About: ${ogDescription}`,
      headings.length > 0 && `Key headings: ${headings.slice(0, 8).join(' | ')}`,
      paragraphs.length > 0 && `Key content: ${paragraphs.slice(0, 5).join(' ')}`,
      listItems.length > 0 && `Services/features listed: ${listItems.slice(0, 10).join(' | ')}`,
      linkTexts.length > 0 && `Site navigation/links: ${[...new Set(linkTexts)].slice(0, 12).join(' | ')}`,
      bodyText.length > 200 && `Page text excerpt: ${bodyText.slice(0, 600)}`,
    ]
      .filter(Boolean)
      .join('\n')
      .slice(0, 2000);

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
        externalCss = (await r.text()).slice(0, 50000); // Cap CSS size
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
      // Visual brand
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
      // Business context (NEW — this is what makes the quiz actually relevant)
      business: {
        summary: businessSummary,
        meta_description: metaDescription,
        headings: headings.slice(0, 6),
        key_content: paragraphs.slice(0, 4),
      },
    };
  } catch {
    return {
      detected: false,
      colors: { background: '#0a0f05', primary: '#D2FF1D', text: '#e8f5c8', accent: '#D2FF1D' },
      font_family: 'Poppins',
      font_fallback: 'sans-serif',
      site_name: '',
      favicon_url: '',
      business: { summary: '', meta_description: '', headings: [], key_content: [] },
    };
  } finally {
    clearTimeout(timeout);
  }
}

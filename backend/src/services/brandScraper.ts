import fetch from 'node-fetch';

export async function scrapeBrand(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Squarespell/1.0)' } });
    const html = await res.text();
    const siteName = html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i)?.[1] || html.match(/<title>([^<|]+)/i)?.[1]?.trim() || new URL(url).hostname.replace('www.', '');
    const faviconPath = html.match(/<link[^>]+rel="icon"[^>]+href="([^"]+)"/i)?.[1] || '/favicon.ico';
    const faviconUrl = faviconPath.startsWith('http') ? faviconPath : `${new URL(url).origin}${faviconPath}`;
    const inlineStyles = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []).map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n');
    const sheetHref = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css[^"]*)"/i)?.[1];
    let externalCss = '';
    if (sheetHref) {
      const sheetUrl = sheetHref.startsWith('http') ? sheetHref : `${new URL(url).origin}${sheetHref}`;
      try { const r = await fetch(sheetUrl, { signal: controller.signal }); externalCss = await r.text(); } catch {}
    }
    const allCss = inlineStyles + '\n' + externalCss;
    const HEX = /(?:#[0-9a-fA-F]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))/;
    const extractVar = (v: string) => allCss.match(new RegExp(`${v}\\s*:\\s*(${HEX.source})`, 'i'))?.[1] ?? null;
    const extractProp = (sel: string, prop: string) => allCss.match(new RegExp(`${sel}[^{]*{[^}]*${prop}\\s*:\\s*(${HEX.source})`, 'i'))?.[1] ?? null;
    return {
      detected: true,
      colors: {
        background: extractVar('--black') || extractProp('body', 'background-color') || '#ffffff',
        primary: extractVar('--tweak-color-button-primary-background') || extractVar('--accent-color') || extractProp('a', 'color') || '#000000',
        text: extractVar('--white') || extractProp('body', 'color') || '#000000',
        accent: extractVar('--tweak-color-button-primary-text') || extractVar('--accent-color') || '#000000'
      },
      font_family: extractVar('--base-font') || allCss.match(/font-family\s*:\s*['"]?([A-Za-z\s]+)['"]?\s*[,;]/)?.[1]?.trim() || 'sans-serif',
      font_fallback: 'sans-serif', site_name: siteName, favicon_url: faviconUrl
    };
  } catch {
    return { detected: false, colors: { background: '#0a0f05', primary: '#D2FF1D', text: '#e8f5c8', accent: '#D2FF1D' }, font_family: 'Poppins', font_fallback: 'sans-serif', site_name: '', favicon_url: '' };
  } finally { clearTimeout(timeout); }
}

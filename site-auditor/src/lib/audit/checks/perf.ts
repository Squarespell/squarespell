/** Performance signals measurable without a headless browser. */

import { AuditContext, count, fail, finding, na, pass, verb } from '../context';
import type { CheckResult } from '../types';
import { pathOf } from '../url';

function kb(bytes: number) {
  return `${Math.round(bytes / 1024)} KB`;
}

export function perfChecks(ctx: AuditContext): CheckResult[] {
  const out: CheckResult[] = [];
  const pages = ctx.htmlPages;
  const N = Math.max(1, pages.length);
  const isSqs = ctx.squarespace.isSquarespace;

  /* ---------------- TTFB ---------------- */
  const ttfbs = pages.map((p) => p.ttfbMs).filter((t) => t > 0).sort((a, b) => a - b);
  if (ttfbs.length) {
    const median = ttfbs[Math.floor(ttfbs.length / 2)];
    if (median > 1200) {
      out.push(
        fail(
          finding({
            id: 'PERF-001',
            category: 'perf',
            severity: median > 2500 ? 'high' : 'medium',
            title: `Your server takes ${(median / 1000).toFixed(1)}s to start responding`,
            detail:
              'Time to first byte is measured before anything at all appears on screen. Above roughly one second, every other speed optimisation is fighting a handicap.',
            evidence: [{ label: 'Median time to first byte', value: `${median} ms across ${ttfbs.length} pages` }],
            affected: 1,
            applicable: 1,
            platformLocked: isSqs,
          }),
          1,
          { unscored: isSqs }
        )
      );
    } else {
      out.push(pass('PERF-001', 'perf', 'medium', 1, `Server responds quickly (${median} ms to first byte)`));
    }
  }

  /* ---------------- HTML weight ---------------- */
  const heavyHtml = pages.filter((p) => p.bytes > 400_000);
  if (heavyHtml.length) {
    out.push(
      fail(
        finding({
          id: 'PERF-002',
          category: 'perf',
          severity: 'medium',
          title: `${count(heavyHtml.length, 'page')} ship an unusually large HTML document`,
          detail:
            'The HTML alone is several times the typical page. Browsers must download and parse all of it before rendering finishes, which delays what a visitor sees on a phone connection.',
          evidence: heavyHtml.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: kb(p.bytes), url: p.url })),
          urls: heavyHtml.map((p) => p.url),
          affected: heavyHtml.length,
          applicable: N,
        }),
        N
      )
    );
  } else {
    out.push(pass('PERF-002', 'perf', 'medium', N));
  }

  /* ---------------- compression ---------------- */
  const uncompressed = pages.filter(
    (p) => p.bytes > 20_000 && !/(br|gzip|deflate|zstd)/i.test(p.headers['content-encoding'] || '')
  );
  if (uncompressed.length) {
    out.push(
      fail(
        finding({
          id: 'PERF-003',
          category: 'perf',
          severity: 'medium',
          title: 'Pages are served without compression',
          detail:
            'Text compression typically cuts HTML transfer size by 70-80%. It is being sent uncompressed.',
          evidence: uncompressed.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: `${kb(p.bytes)}, no content-encoding`, url: p.url })),
          urls: uncompressed.map((p) => p.url),
          affected: uncompressed.length,
          applicable: N,
          platformLocked: isSqs,
        }),
        N,
        { unscored: isSqs }
      )
    );
  } else {
    out.push(pass('PERF-003', 'perf', 'medium', N, 'Pages are compressed in transit'));
  }

  /* ---------------- render-blocking JS ---------------- */
  const blocking = pages.map((p) => ({
    page: p,
    count: p.scripts.filter((s) => s.src && s.inHead && !s.async && !s.defer && !s.module).length,
  }));
  const worstBlocking = blocking.filter((b) => b.count >= 3);
  if (worstBlocking.length) {
    out.push(
      fail(
        finding({
          id: 'PERF-006',
          category: 'perf',
          severity: 'medium',
          title: 'Scripts in the page head block rendering',
          detail:
            'Scripts loaded in the <head> without async or defer stop the browser from drawing anything until they have downloaded and run. Each one adds directly to how long the page looks blank.',
          evidence: worstBlocking.slice(0, 3).map((b) => ({
            label: pathOf(b.page.url),
            value: count(b.count, 'render-blocking script'),
            url: b.page.url,
          })),
          urls: worstBlocking.map((b) => b.page.url),
          affected: worstBlocking.length,
          applicable: N,
          platformLocked: isSqs,
        }),
        N,
        { unscored: isSqs }
      )
    );
  } else {
    out.push(pass('PERF-006', 'perf', 'medium', N));
  }

  /* ---------------- third-party scripts ---------------- */
  const tpHosts = new Set<string>();
  for (const p of pages) for (const h of p.thirdPartyHosts) tpHosts.add(h);
  // Squarespace's own delivery hosts are not "third party" in any meaningful sense.
  const platformHosts = /squarespace|sqspcdn|sqsp\.net/i;
  const realThirdParty = Array.from(tpHosts).filter((h) => !platformHosts.test(h));
  if (realThirdParty.length > 8) {
    out.push(
      fail(
        finding({
          id: 'PERF-009',
          category: 'perf',
          severity: 'medium',
          title: `${count(realThirdParty.length, 'third-party service')} ${verb(realThirdParty.length, 'loads', 'load')} on your pages`,
          detail:
            'Every external service adds a DNS lookup, a connection and code you do not control. Each one can independently slow down or break your site.',
          evidence: [{ label: 'External hosts', value: realThirdParty.slice(0, 10).join(', ') }],
          affected: realThirdParty.length,
          applicable: realThirdParty.length,
          effort: 'medium',
        }),
        Math.max(1, realThirdParty.length),
        { gamma: 1.0 }
      )
    );
  } else {
    out.push(pass('PERF-009', 'perf', 'medium', 1, realThirdParty.length ? `Only ${realThirdParty.length} third-party services load` : 'No unnecessary third-party scripts'));
  }

  /* ---------------- images ---------------- */
  const probed = ctx.images.filter((i) => i.status === 200 && i.bytes > 0);
  if (probed.length >= 3) {
    const oversized = probed.filter((i) => i.bytes > 500_000);
    const total = probed.reduce((a, i) => a + i.bytes, 0);

    if (oversized.length) {
      out.push(
        fail(
          finding({
            id: 'PERF-013',
            category: 'perf',
            severity: 'high',
            title: `${count(oversized.length, 'image')} ${verb(oversized.length, 'is', 'are')} over 500 KB`,
            detail:
              'Large images are the most common cause of a slow Squarespace site. On a mobile connection a single 2 MB photo can add several seconds before the page is usable.',
            evidence: oversized
              .sort((a, b) => b.bytes - a.bytes)
              .slice(0, 4)
              .map((i) => ({ label: kb(i.bytes), value: i.url.split('/').pop()?.split('?')[0] || i.url, url: i.url })),
            urls: oversized.map((i) => i.url),
            affected: oversized.length,
            applicable: probed.length,
            squarespacePath: 'Export images at 2500px wide or less and under 500 KB before uploading, Squarespace will not shrink an oversized original for you',
            effort: 'medium',
          }),
          probed.length,
          { gamma: 1.0 }
        )
      );
    } else {
      out.push(pass('PERF-013', 'perf', 'high', probed.length, 'No oversized images were found'));
    }

    const modern = probed.filter((i) => /webp|avif/i.test(i.contentType));
    const modernShare = modern.length / probed.length;
    if (modernShare < 0.5) {
      out.push(
        fail(
          finding({
            id: 'PERF-014',
            category: 'perf',
            severity: 'low',
            title: 'Most images are served in older formats',
            detail:
              'WebP and AVIF typically cut image weight by half at the same visual quality. Only a minority of the images sampled were served in a modern format.',
            evidence: [
              { label: 'Modern formats', value: `${modern.length} of ${probed.length} images sampled (${Math.round(modernShare * 100)}%)` },
              { label: 'Total sampled image weight', value: kb(total) },
            ],
            affected: probed.length - modern.length,
            applicable: probed.length,
            platformLocked: isSqs,
          }),
          probed.length,
          { gamma: 1.0, unscored: isSqs }
        )
      );
    } else {
      out.push(pass('PERF-014', 'perf', 'low', probed.length, 'Images are served in modern, efficient formats'));
    }
  } else {
    out.push(na('PERF-013', 'perf', 'high'));
  }

  /* ---------------- layout shift risk ---------------- */
  const allImgs = pages.flatMap((p) => p.images.filter((i) => i.src && !/^data:/.test(i.src)).map((i) => ({ ...i, page: p.url })));
  if (allImgs.length >= 5) {
    const noDims = allImgs.filter((i) => !i.width || !i.height);
    if (noDims.length / allImgs.length > 0.3) {
      out.push(
        fail(
          finding({
            id: 'PERF-015',
            category: 'perf',
            severity: 'medium',
            title: `${count(noDims.length, 'image')} ${verb(noDims.length, 'has', 'have')} no declared width and height`,
            detail:
              'Without dimensions the browser cannot reserve space, so the page jumps around as images arrive. Google measures this directly as Cumulative Layout Shift, and it is a ranking signal as well as an obvious annoyance.',
            evidence: [{ label: 'Images without dimensions', value: `${noDims.length} of ${allImgs.length}` }],
            urls: Array.from(new Set(noDims.map((i) => i.page))),
            affected: noDims.length,
            applicable: allImgs.length,
            platformLocked: isSqs,
          }),
          allImgs.length,
          { gamma: 1.0, unscored: isSqs }
        )
      );
    } else {
      out.push(pass('PERF-015', 'perf', 'medium', allImgs.length, 'Images reserve their space, avoiding layout jumps'));
    }

    // Lazy-loading the hero image measurably delays the largest paint.
    const lazyHero = pages.filter((p) => {
      const first = p.images.filter((i) => i.src && !/^data:/.test(i.src))[0];
      return first && first.loading === 'lazy';
    });
    if (lazyHero.length) {
      out.push(
        fail(
          finding({
            id: 'PERF-017',
            category: 'perf',
            severity: 'low',
            title: `${count(lazyHero.length, 'page')} lazy-load their first image`,
            detail:
              'The first image on a page is usually the largest thing a visitor sees. Marking it lazy tells the browser to delay it, which makes the page feel slower rather than faster.',
            evidence: lazyHero.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: 'first image has loading="lazy"', url: p.url })),
            urls: lazyHero.map((p) => p.url),
            affected: lazyHero.length,
            applicable: N,
            platformLocked: isSqs,
          }),
          N,
          { unscored: isSqs }
        )
      );
    } else {
      out.push(pass('PERF-017', 'perf', 'low', N));
    }
  }

  /* ---------------- font family count ---------------- */
  // Multiple decorative fonts loaded at once through Squarespace's font
  // picker is a common, real performance mistake — each family is a separate
  // network request and a separate render-blocking risk. Cheap to compute
  // from data already extracted: Google Fonts / Typekit hosts in
  // thirdPartyHosts, plus any @font-face declarations in inline stylesheets.
  const fontHostPattern = /fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|fonts\.adobe\.com/i;
  const fontFamilies = new Set<string>();
  for (const p of pages) {
    for (const h of p.thirdPartyHosts) {
      if (fontHostPattern.test(h)) fontFamilies.add(h);
    }
  }
  // Squarespace's own uploaded custom fonts declare @font-face with a
  // family name we can read directly out of inline <style> blocks captured
  // in inlineStyleBytes' source — approximate via stylesheet hrefs that look
  // like Squarespace's font delivery path, since inline @font-face text
  // itself isn't retained in PageFacts.
  const sqsFontAssets = new Set<string>();
  for (const p of pages) {
    for (const s of p.stylesheets) {
      if (/squarespace-cdn\.com\/content\/v1\/.*\.(woff2?|otf|ttf)/i.test(s.href)) sqsFontAssets.add(s.href);
    }
  }
  const totalFontSources = fontFamilies.size + sqsFontAssets.size;
  if (totalFontSources > 3) {
    out.push(
      fail(
        finding({
          id: 'PERF-024',
          category: 'perf',
          severity: 'low',
          confidence: 'heuristic',
          title: `${count(totalFontSources, 'web font source')} ${verb(totalFontSources, 'loads', 'load')} on your pages`,
          detail:
            'Each additional font family is a separate network request and a separate chance for text to flash unstyled or invisible while it loads. Two font families, one for headings and one for body text, covers almost every design.',
          evidence: [
            { label: 'Font hosts / files detected', value: [...fontFamilies, ...sqsFontAssets].slice(0, 6).map((f) => f.split('/').pop() || f).join(', ') },
          ],
          affected: totalFontSources,
          applicable: totalFontSources,
          squarespacePath: 'Design → Fonts, reduce the number of distinct font families in use',
          effort: 'quick',
        }),
        Math.max(1, totalFontSources),
        { gamma: 1.0 }
      )
    );
  } else {
    out.push(pass('PERF-024', 'perf', 'low', Math.max(1, totalFontSources), totalFontSources ? undefined : 'No excess web font loading detected'));
  }

  /* ---------------- caching on static assets ---------------- */
  const cacheable = ctx.assets.filter((a) => a.status === 200);
  if (cacheable.length >= 3) {
    const poorlyCached = cacheable.filter((a) => {
      const m = a.cacheControl.match(/max-age=(\d+)/);
      return !m || Number(m[1]) < 86_400;
    });
    if (poorlyCached.length / cacheable.length > 0.5) {
      out.push(
        fail(
          finding({
            id: 'PERF-021',
            category: 'perf',
            severity: 'low',
            title: 'Static files are not cached for long by returning visitors',
            detail:
              'Stylesheets, scripts and fonts should be cached for weeks. Short cache lifetimes force repeat visitors to download everything again.',
            evidence: poorlyCached.slice(0, 3).map((a) => ({
              label: a.url.split('/').pop()?.split('?')[0] || a.url,
              value: a.cacheControl || 'no cache-control header',
            })),
            affected: poorlyCached.length,
            applicable: cacheable.length,
            platformLocked: isSqs,
          }),
          cacheable.length,
          { gamma: 1.0, unscored: isSqs }
        )
      );
    } else {
      out.push(pass('PERF-021', 'perf', 'low', cacheable.length, 'Static assets are cached efficiently'));
    }
  }

  return out;
}

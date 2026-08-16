/** Technical SEO: indexability, canonicals, redirects, sitemap, status codes. */

import { AuditContext, count, fail, finding, na, pass, truncate, verb } from '../context';
import type { CheckResult } from '../types';
import { pathOf } from '../url';

export function techChecks(ctx: AuditContext): CheckResult[] {
  const out: CheckResult[] = [];
  const pages = ctx.htmlPages;
  const N = Math.max(1, pages.length);

  /* ---------------- robots.txt ---------------- */
  // `platformLocked`/`unscored` were previously hardcoded true regardless of
  // platform, unlike every other platform-locked check in this codebase
  // (perf.ts, misc.ts all gate on `isSquarespace` first). Harmless for the
  // main product, since every audited site is confirmed Squarespace before
  // checks run, but wrong in competitor comparison mode: a missing robots.txt
  // on a WordPress/Wix competitor is a real, fixable fault, not a platform
  // limitation (AUDIT-OF-THE-AUDIT.md, Step 3).
  const isSqsForTech001 = ctx.squarespace.isSquarespace;
  if (!ctx.robots.found) {
    out.push(
      fail(
        finding({
          id: 'TECH-001',
          category: 'tech',
          severity: 'medium',
          title: 'No robots.txt file was found',
          detail:
            'Search engines request /robots.txt on every crawl. Without it they still crawl the site, but you lose the ability to declare where your sitemap lives, which slows down discovery of new pages.',
          evidence: [
            { label: 'Requested', value: `${ctx.origin}/robots.txt` },
            { label: 'Response', value: `HTTP ${ctx.robots.status || 'no response'}` },
          ],
          affected: 1,
          applicable: 1,
          effort: 'quick',
          platformLocked: isSqsForTech001,
        }),
        1,
        { unscored: isSqsForTech001 }
      )
    );
  } else {
    out.push(pass('TECH-001', 'tech', 'medium', 1, 'robots.txt is present and readable'));
  }

  /* ---------------- sitemap ---------------- */
  if (!ctx.sitemap.found) {
    out.push(
      fail(
        finding({
          id: 'TECH-010',
          category: 'tech',
          severity: 'high',
          title: 'No XML sitemap could be found',
          detail:
            'A sitemap is how a search engine learns about every page in one request instead of discovering them link by link. Nothing was returned at /sitemap.xml or any of the other standard locations, and robots.txt did not declare one.',
          evidence: [{ label: 'Locations tried', value: '/sitemap.xml, /sitemap_index.xml, /sitemap-index.xml, robots.txt Sitemap: directive' }],
          affected: 1,
          applicable: 1,
          effort: 'quick',
        }),
        1
      )
    );
  } else {
    if (ctx.sitemap.parseError) {
      out.push(
        fail(
          finding({
            id: 'TECH-011',
            category: 'tech',
            severity: 'high',
            title: 'Your sitemap is not valid XML',
            detail:
              'The sitemap was served but could not be parsed. Search engines will discard it entirely, so every page has to be discovered through internal links instead.',
            evidence: [
              { label: 'Sitemap', value: ctx.sitemap.url, url: ctx.sitemap.url },
              { label: 'Parse error', value: truncate(ctx.sitemap.parseError, 200) },
            ],
            urls: [ctx.sitemap.url],
            affected: 1,
            applicable: 1,
          }),
          1
        )
      );
    } else {
      out.push(
        pass(
          'TECH-011',
          'tech',
          'high',
          1,
          `Sitemap found at ${ctx.sitemap.url} listing ${ctx.sitemap.totalUrls} URLs`
        )
      );
    }

    if (ctx.sitemap.source === 'guess' && ctx.robots.found) {
      out.push(
        fail(
          finding({
            id: 'TECH-010b',
            category: 'tech',
            severity: 'low',
            title: 'Your sitemap is not declared in robots.txt',
            detail:
              'The sitemap exists at the standard location, but robots.txt does not point to it. Declaring it removes any guesswork for crawlers that do not assume the default path.',
            evidence: [{ label: 'Sitemap found at', value: ctx.sitemap.url, url: ctx.sitemap.url }],
            affected: 1,
            applicable: 1,
            effort: 'quick',
            platformLocked: ctx.squarespace.isSquarespace,
          }),
          1,
          { unscored: ctx.squarespace.isSquarespace }
        )
      );
    }

    // Sitemap entries that are not indexable.
    const byUrl = new Map(pages.map((p) => [p.url.replace(/\/$/, ''), p]));
    const nonIndexable: string[] = [];
    for (const entry of ctx.sitemap.urls.slice(0, 500)) {
      const p = byUrl.get(entry.loc.replace(/\/$/, ''));
      if (!p) continue;
      if (/\bnoindex\b/.test(p.metaRobots) || /\bnoindex\b/.test(p.xRobotsTag)) {
        nonIndexable.push(p.url);
      }
    }
    if (nonIndexable.length) {
      // Same root cause as TECH-030 below whenever a noindexed page is also
      // sitemapped: one misconfiguration ("hide this page from search
      // engines" left on while the page is still listed) triggers two scored
      // findings. Each check is measuring something real and distinct, so
      // this stays two findings rather than being merged away, but the copy
      // says so, so fixing the one setting doesn't look like it should have
      // moved the score by more than it did (AUDIT-OF-THE-AUDIT.md, Step 6).
      out.push(
        fail(
          finding({
            id: 'TECH-016',
            category: 'tech',
            severity: 'medium',
            title: 'Your sitemap lists pages that are blocked from being indexed',
            detail: `${count(nonIndexable.length, 'page')} ${verb(nonIndexable.length, 'appears', 'appear')} in your sitemap but carry a noindex instruction. You are telling search engines to index them and not to index them at the same time. This is usually the same underlying setting as the "blocked from Google" finding below (TECH-030); fixing it there resolves both.`,
            evidence: nonIndexable.slice(0, 3).map((u) => ({ label: 'Conflicting page', value: u, url: u })),
            urls: nonIndexable,
            affected: nonIndexable.length,
            applicable: Math.max(1, ctx.sitemap.urls.length),
          }),
          Math.max(1, ctx.sitemap.urls.length)
        )
      );
    } else if (ctx.sitemap.urls.length) {
      out.push(pass('TECH-016', 'tech', 'medium', ctx.sitemap.urls.length));
    }

    // lastmod quality
    const withLastmod = ctx.sitemap.urls.filter((u) => u.lastmod).length;
    if (ctx.sitemap.urls.length >= 5) {
      const coverage = withLastmod / ctx.sitemap.urls.length;
      if (coverage < 0.5) {
        out.push(
          fail(
            finding({
              id: 'TECH-017',
              category: 'tech',
              severity: 'low',
              title: 'Most sitemap entries have no last-modified date',
              detail: `Only ${withLastmod} of ${ctx.sitemap.urls.length} sitemap entries carry a <lastmod> value. Search engines use it to decide what to re-crawl first, so pages you have just updated can sit unnoticed for longer.`,
              evidence: [{ label: 'Coverage', value: `${Math.round(coverage * 100)}% of URLs have <lastmod>` }],
              affected: ctx.sitemap.urls.length - withLastmod,
              applicable: ctx.sitemap.urls.length,
              platformLocked: ctx.squarespace.isSquarespace,
            }),
            ctx.sitemap.urls.length,
            { unscored: ctx.squarespace.isSquarespace }
          )
        );
      } else {
        out.push(pass('TECH-017', 'tech', 'low', ctx.sitemap.urls.length));
      }
    }
  }

  /* ---------------- noindex ---------------- */
  const noindexPages = pages.filter(
    (p) => /\bnoindex\b/.test(p.metaRobots) || /\bnoindex\b/.test(p.xRobotsTag)
  );
  if (noindexPages.length) {
    const homepageBlocked = noindexPages.some((p) => p.depth === 0);
    out.push(
      fail(
        finding({
          id: 'TECH-030',
          category: 'tech',
          severity: homepageBlocked ? 'critical' : 'high',
          title: homepageBlocked
            ? 'Your homepage is blocked from Google'
            : `${count(noindexPages.length, 'page')} ${verb(noindexPages.length, 'is', 'are')} blocked from Google`,
          detail: homepageBlocked
            ? 'Your homepage carries a "noindex" instruction. Search engines are being explicitly told to keep it out of results, which removes the site from Google entirely.'
            : 'These pages carry a "noindex" instruction, so they will never appear in search results no matter how good the content is.',
          evidence: noindexPages.slice(0, 3).map((p) => ({
            label: pathOf(p.url),
            value: `robots directive: ${p.metaRobots || p.xRobotsTag}`,
            url: p.url,
          })),
          urls: noindexPages.map((p) => p.url),
          affected: noindexPages.length,
          applicable: N,
          squarespacePath: 'Pages → page settings (gear icon) → SEO → uncheck "Hide this page from search engines"',
          effort: 'quick',
        }),
        N
      )
    );
  } else {
    out.push(pass('TECH-030', 'tech', 'critical', N, 'No pages are accidentally hidden from search engines'));
  }

  /* ---------------- nosnippet (AEO-critical) ---------------- */
  const nosnippet = pages.filter((p) => /nosnippet|max-snippet\s*:\s*0/.test(p.metaRobots));
  if (nosnippet.length) {
    out.push(
      fail(
        finding({
          id: 'TECH-033',
          category: 'tech',
          severity: 'high',
          title: 'Search snippets are suppressed on some pages',
          detail:
            'A "nosnippet" or "max-snippet:0" directive stops Google showing any text preview for these pages, and also removes them from AI Overviews and AI-assistant citations.',
          evidence: nosnippet.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: p.metaRobots, url: p.url })),
          urls: nosnippet.map((p) => p.url),
          affected: nosnippet.length,
          applicable: N,
        }),
        N
      )
    );
  } else {
    out.push(pass('TECH-033', 'tech', 'high', N));
  }

  /* ---------------- canonicals ---------------- */
  const missingCanonical = pages.filter((p) => !p.canonical);
  if (missingCanonical.length) {
    out.push(
      fail(
        finding({
          id: 'TECH-040',
          category: 'tech',
          severity: 'medium',
          title: `${count(missingCanonical.length, 'page')} ${verb(missingCanonical.length, 'has', 'have')} no canonical URL`,
          detail:
            'A canonical tag tells search engines which address is the "real" one when the same content is reachable at several URLs. Without it, Google guesses, and ranking signals can end up split across duplicates.',
          evidence: missingCanonical.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: 'no <link rel="canonical">', url: p.url })),
          urls: missingCanonical.map((p) => p.url),
          affected: missingCanonical.length,
          applicable: N,
        }),
        N
      )
    );
  } else {
    out.push(pass('TECH-040', 'tech', 'medium', N, 'Every page declares a canonical URL'));
  }

  const crossDomain = pages.filter((p) => {
    if (!p.canonical) return false;
    try {
      const a = new URL(p.canonical).hostname.replace(/^www\./, '');
      const b = new URL(p.url).hostname.replace(/^www\./, '');
      return a !== b;
    } catch {
      return false;
    }
  });
  if (crossDomain.length) {
    out.push(
      fail(
        finding({
          id: 'TECH-044',
          category: 'tech',
          severity: 'critical',
          title: 'Pages point their canonical tag at a different domain',
          detail:
            'These pages tell Google that the authoritative version lives on another domain. Google will usually drop your version from the index entirely. This is the single most common cause of a site disappearing from search after a rebuild or a domain change.',
          evidence: crossDomain.slice(0, 3).map((p) => ({
            label: pathOf(p.url),
            value: `canonical → ${p.canonical}`,
            url: p.url,
          })),
          urls: crossDomain.map((p) => p.url),
          affected: crossDomain.length,
          applicable: N,
        }),
        N
      )
    );
  } else if (pages.some((p) => p.canonical)) {
    out.push(pass('TECH-044', 'tech', 'critical', N));
  }

  const multiCanonical = pages.filter((p) => p.canonicalCount > 1);
  if (multiCanonical.length) {
    out.push(
      fail(
        finding({
          id: 'TECH-041',
          category: 'tech',
          severity: 'high',
          title: 'Some pages declare more than one canonical URL',
          detail:
            'When a page contains conflicting canonical tags Google ignores all of them, so you lose control over which URL gets indexed.',
          evidence: multiCanonical.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: `${p.canonicalCount} canonical declarations`, url: p.url })),
          urls: multiCanonical.map((p) => p.url),
          affected: multiCanonical.length,
          applicable: N,
        }),
        N
      )
    );
  } else {
    out.push(pass('TECH-041', 'tech', 'high', N));
  }

  /* ---------------- HTTPS + host consolidation ---------------- */
  const httpRoot = ctx.probes.httpRoot;
  if (httpRoot) {
    if (httpRoot.status >= 200 && httpRoot.status < 300) {
      out.push(
        fail(
          finding({
            id: 'TECH-050',
            category: 'tech',
            severity: 'critical',
            title: 'Your site is reachable over insecure HTTP',
            detail:
              'Requesting the plain http:// address returned a page instead of redirecting to https://. Browsers show a "Not secure" warning, and the same content existing on two protocols splits your search ranking signals.',
            evidence: [{ label: 'http:// response', value: `HTTP ${httpRoot.status} (no redirect to HTTPS)` }],
            affected: 1,
            applicable: 1,
          }),
          1
        )
      );
    } else if ([301, 308].includes(httpRoot.status)) {
      out.push(pass('TECH-050', 'tech', 'critical', 1, 'HTTP traffic is permanently redirected to HTTPS'));
    } else if ([302, 303, 307].includes(httpRoot.status)) {
      out.push(
        fail(
          finding({
            id: 'TECH-050',
            category: 'tech',
            severity: 'low',
            title: 'HTTP redirects to HTTPS temporarily rather than permanently',
            detail:
              'The redirect from http:// to https:// uses a temporary status code. A permanent (301) redirect passes ranking signals more reliably.',
            evidence: [{ label: 'http:// response', value: `HTTP ${httpRoot.status} → ${httpRoot.location}` }],
            affected: 1,
            applicable: 1,
            platformLocked: ctx.squarespace.isSquarespace,
          }),
          1,
          { unscored: ctx.squarespace.isSquarespace }
        )
      );
    }
  }

  const wwwVariant = ctx.probes.wwwVariant;
  if (wwwVariant && wwwVariant.status >= 200 && wwwVariant.status < 300) {
    out.push(
      fail(
        finding({
          id: 'TECH-051',
          category: 'tech',
          severity: 'high',
          title: 'Your site loads on both the www and non-www address',
          detail:
            'Both hostnames return a page instead of one redirecting to the other. Search engines can treat these as two separate websites competing with each other.',
          evidence: [
            { label: 'Both return 200', value: `${ctx.origin} and the ${new URL(ctx.origin).hostname.startsWith('www.') ? 'non-www' : 'www'} variant` },
          ],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Settings → Domains → select your domain → set the preferred (primary) version',
        }),
        1
      )
    );
  } else if (wwwVariant) {
    out.push(pass('TECH-051', 'tech', 'high', 1, 'www and non-www addresses resolve to a single canonical host'));
  }

  /* ---------------- soft 404 ---------------- */
  const r404 = ctx.probes.random404;
  if (r404) {
    if (r404.status >= 200 && r404.status < 300) {
      out.push(
        fail(
          finding({
            id: 'TECH-057',
            category: 'tech',
            severity: 'high',
            title: 'Missing pages return "200 OK" instead of a 404',
            detail:
              'A request for a URL that does not exist returned a success status. Search engines will index these phantom URLs, which wastes crawl budget and can fill your index with empty pages.',
            evidence: [{ label: 'Random non-existent URL', value: `HTTP ${r404.status}` }],
            affected: 1,
            applicable: 1,
          }),
          1
        )
      );
    } else {
      out.push(pass('TECH-057', 'tech', 'high', 1, 'Missing pages correctly return a 404'));
    }
  }

  /* ---------------- redirect chains ---------------- */
  const chained = pages.filter((p) => p.redirectChain.length >= 2);
  if (chained.length) {
    out.push(
      fail(
        finding({
          id: 'TECH-052',
          category: 'tech',
          severity: 'low',
          title: `${count(chained.length, 'page')} load through a redirect chain`,
          detail:
            'Each redirect hop adds latency before anything renders, and long chains dilute the ranking signals passed to the destination.',
          evidence: chained.slice(0, 3).map((p) => ({
            label: pathOf(p.url),
            value: `${p.redirectChain.length} hops → ${p.url}`,
            url: p.url,
          })),
          urls: chained.map((p) => p.url),
          affected: chained.length,
          applicable: N,
        }),
        N
      )
    );
  } else {
    out.push(pass('TECH-052', 'tech', 'low', N));
  }

  /* ---------------- broken / erroring pages ---------------- */
  const errored = ctx.failedPages.filter((p) => p.status >= 400 || p.status === 0);
  if (errored.length) {
    const serverErrors = errored.filter((p) => p.status >= 500);
    out.push(
      fail(
        finding({
          id: 'TECH-059',
          category: 'tech',
          severity: serverErrors.length ? 'critical' : 'high',
          title: serverErrors.length
            ? `${count(serverErrors.length, 'page')} returned a server error`
            : `${errored.length} linked pages could not be loaded`,
          detail:
            'Visitors and search engines following your own internal links hit these URLs and get an error instead of content.',
          evidence: errored.slice(0, 4).map((p) => ({
            label: pathOf(p.url),
            value: p.status ? `HTTP ${p.status}` : 'no response',
            url: p.url,
          })),
          urls: errored.map((p) => p.url),
          affected: errored.length,
          applicable: N + errored.length,
        }),
        N + errored.length
      )
    );
  } else {
    out.push(pass('TECH-059', 'tech', 'critical', N, 'Every crawled page returned successfully'));
  }

  /* ---------------- broken internal links ---------------- */
  if (ctx.brokenLinks.length) {
    out.push(
      fail(
        finding({
          id: 'TECH-055',
          category: 'tech',
          severity: 'high',
          title: `${count(ctx.brokenLinks.length, 'internal link')} ${verb(ctx.brokenLinks.length, 'points', 'point')} to a broken page`,
          detail:
            'These links are on your site and lead nowhere. Visitors hit a dead end, and crawlers waste budget on URLs that will never rank.',
          evidence: ctx.brokenLinks.slice(0, 4).map((b) => ({
            label: `on ${pathOf(b.from)}`,
            value: `${pathOf(b.to)} → HTTP ${b.status || 'no response'}`,
            url: b.to,
          })),
          urls: ctx.brokenLinks.map((b) => b.to),
          affected: ctx.brokenLinks.length,
          applicable: Math.max(1, ctx.internalLinkGraph.size * 5),
        }),
        Math.max(1, ctx.internalLinkGraph.size * 5)
      )
    );
  } else {
    out.push(pass('TECH-055', 'tech', 'high', N, 'No broken internal links were found'));
  }

  /* ---------------- orphan pages ---------------- */
  // Structurally unreliable at our crawl depth: the link graph below is built
  // only from the pages we actually crawled (up to 12), so "not linked from
  // anywhere" really means "not linked from anywhere in a small sample of a
  // much larger site." On a real test run this produced a confident, wrong-
  // sounding claim ("50 pages are in your sitemap but not linked from
  // anywhere" out of 3,132 sitemap URLs with 12 pages crawled) — see
  // AUDIT-OF-THE-AUDIT.md, Step 3, TECH-018. Until we either gate this on a
  // minimum crawl-coverage ratio with real confirmation or spend extra
  // link-probe budget verifying candidates the way TECH-055 already does for
  // broken links, this is reported as a sampled, unscored lead rather than a
  // scored, flatly-worded count.
  const linked = new Set<string>();
  for (const set of ctx.internalLinkGraph.values()) for (const u of set) linked.add(u.replace(/\/$/, ''));
  const orphans = ctx.sitemap.urls
    .map((u) => u.loc.replace(/\/$/, ''))
    .filter((u) => u !== ctx.origin.replace(/\/$/, '') && !linked.has(u))
    .slice(0, 50);
  if (ctx.sitemap.urls.length >= 3) {
    const coveragePct = Math.round((N / Math.max(1, ctx.sitemap.urls.length)) * 100);
    if (orphans.length) {
      out.push(
        fail(
          finding({
            id: 'TECH-018',
            category: 'tech',
            severity: 'low',
            confidence: 'sampled',
            title: `${count(orphans.length, 'sitemap page')} ${verb(orphans.length, 'was', 'were')} not linked from any of the ${N} pages we sampled`,
            detail: `We checked links across the ${N} pages we crawled (${coveragePct}% of the ${ctx.sitemap.urls.length} URLs in your sitemap) and found none of them linking to these. That is a sample, not a full picture: a page linked only from one of the pages outside our sample looks identical in this data to a page linked from nowhere at all. Treat this as a list worth checking in Squarespace's Pages panel for a "Not Linked" section, not a confirmed finding.`,
            evidence: orphans.slice(0, 4).map((u) => ({ label: pathOf(u), value: u, url: u })),
            urls: orphans,
            affected: orphans.length,
            applicable: Math.max(1, ctx.sitemap.urls.length),
            squarespacePath: 'Pages → check whether these sit in "Not Linked", and if so, drag them into your navigation or link to them from a relevant page',
          }),
          Math.max(1, ctx.sitemap.urls.length),
          { unscored: true }
        )
      );
    } else {
      out.push(pass('TECH-018', 'tech', 'low', ctx.sitemap.urls.length));
    }
  } else {
    out.push(na('TECH-018', 'tech', 'low'));
  }

  /* ---------------- sitemap-wide broken-page sample ---------------- */
  // TECH-055/TECH-059 above only ever see errors among the pages we actually
  // crawled. This is a separate, deliberately small HEAD-probe sample of
  // sitemap URLs outside that crawl, so a rotten pocket of dead pages
  // elsewhere on a large site isn't invisible just because the crawl budget
  // never reached it (AUDIT-OF-THE-AUDIT.md, Step 2 and Step 7, P1).
  if (ctx.sitemapSample && ctx.sitemapSample.checked > 0) {
    if (ctx.sitemapSample.broken.length) {
      out.push(
        fail(
          finding({
            id: 'TECH-060',
            category: 'tech',
            severity: 'high',
            confidence: 'sampled',
            title: `${count(ctx.sitemapSample.broken.length, 'broken page')} ${verb(ctx.sitemapSample.broken.length, 'was', 'were')} found outside the pages we crawled`,
            detail: `We sampled ${ctx.sitemapSample.checked} additional sitemap URLs beyond the ${N} pages we crawled directly, spaced evenly across your sitemap, and HEAD-requested each one. ${count(ctx.sitemapSample.broken.length, 'of them')} ${verb(ctx.sitemapSample.broken.length, 'returns', 'return')} an error. This is a sample, not a full sweep, so treat the real count as at least this many.`,
            evidence: ctx.sitemapSample.broken.slice(0, 4).map((b) => ({
              label: pathOf(b.url),
              value: b.status ? `HTTP ${b.status}` : 'no response',
              url: b.url,
            })),
            urls: ctx.sitemapSample.broken.map((b) => b.url),
            affected: ctx.sitemapSample.broken.length,
            applicable: ctx.sitemapSample.checked,
          }),
          ctx.sitemapSample.checked
        )
      );
    } else {
      out.push(pass('TECH-060', 'tech', 'high', ctx.sitemapSample.checked, 'A spot-check of sitemap pages outside the crawl found no broken pages'));
    }
  } else {
    out.push(na('TECH-060', 'tech', 'high'));
  }

  return out;
}

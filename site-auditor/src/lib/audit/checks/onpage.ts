/** On-page SEO: titles, descriptions, headings, content depth, links, alt text. */

import { AuditContext, count, fail, finding, na, pass, truncate, verb } from '../context';
import type { CheckResult } from '../types';
import { pathOf } from '../url';
import { isThinByDesign, isDeadEndByDesign } from '../pagetype';

const PLACEHOLDER_RE =
  /lorem ipsum|your text here|insert (your )?(text|content)|under construction|\[your |example@example\.com|555-555-5555|123 main st|add your (own )?content/i;

const FILENAME_ALT_RE = /\.(jpe?g|png|gif|webp|avif|svg)$/i;

/**
 * Overlap coefficient over 8-word shingles: intersection size divided by the
 * SHORTER page's shingle count, rather than plain Jaccard, so a short page
 * that is entirely contained in a longer one still reads as a near-duplicate
 * rather than being diluted by the length difference.
 */
function shingleOverlap(a: string, b: string, n = 8): number {
  const shingles = (s: string) => {
    const words = s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean);
    const set = new Set<string>();
    for (let i = 0; i <= words.length - n; i++) set.add(words.slice(i, i + n).join(' '));
    return set;
  };
  const A = shingles(a);
  const B = shingles(b);
  if (A.size === 0 || B.size === 0) return 0;
  let intersection = 0;
  const smaller = A.size <= B.size ? A : B;
  const larger = A.size <= B.size ? B : A;
  for (const s of smaller) if (larger.has(s)) intersection++;
  return intersection / smaller.size;
}

export function onpageChecks(ctx: AuditContext): CheckResult[] {
  const out: CheckResult[] = [];
  const pages = ctx.htmlPages;
  const N = Math.max(1, pages.length);

  /* ---------------- titles ---------------- */
  const noTitle = pages.filter((p) => !p.title);
  if (noTitle.length) {
    out.push(
      fail(
        finding({
          id: 'ONPAGE-001',
          category: 'onpage',
          severity: 'critical',
          title: `${count(noTitle.length, 'page')} ${verb(noTitle.length, 'has', 'have')} no title tag`,
          detail:
            'The title tag is the clickable headline in Google results and the label on a browser tab. Without one, Google invents a title from whatever text it can find.',
          evidence: noTitle.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: 'empty <title>', url: p.url })),
          urls: noTitle.map((p) => p.url),
          affected: noTitle.length,
          applicable: N,
          squarespacePath: 'Pages → page settings (gear icon) → SEO → SEO Title',
          effort: 'quick',
        }),
        N
      )
    );
  } else {
    out.push(pass('ONPAGE-001', 'onpage', 'critical', N, 'Every page has a title tag'));
  }

  const titled = pages.filter((p) => p.title);
  const badLength = titled.filter((p) => p.title.length < 30 || p.title.length > 65);
  if (badLength.length) {
    out.push(
      fail(
        finding({
          id: 'ONPAGE-002',
          category: 'onpage',
          severity: 'medium',
          title: `${count(badLength.length, 'page title')} ${verb(badLength.length, 'is', 'are')} too short or too long`,
          detail:
            'Google shows roughly 30-60 characters of a title. Shorter than that and you waste the most valuable text you own; longer and it gets truncated or rewritten entirely.',
          evidence: badLength.slice(0, 4).map((p) => ({
            label: pathOf(p.url),
            value: `${p.title.length} chars, "${truncate(p.title, 80)}"`,
            url: p.url,
          })),
          urls: badLength.map((p) => p.url),
          affected: badLength.length,
          applicable: titled.length,
          squarespacePath: 'Pages → page settings (gear icon) → SEO → SEO Title',
          effort: 'quick',
        }),
        titled.length,
        { gamma: 1.0 }
      )
    );
  } else if (titled.length) {
    out.push(pass('ONPAGE-002', 'onpage', 'medium', titled.length, 'Page titles are a sensible length for search results'));
  }

  // Duplicate titles
  const titleMap = new Map<string, string[]>();
  for (const p of titled) {
    const key = p.title.toLowerCase().trim();
    titleMap.set(key, [...(titleMap.get(key) || []), p.url]);
  }
  const dupTitles = Array.from(titleMap.entries()).filter(([, urls]) => urls.length > 1);
  if (dupTitles.length) {
    const affected = dupTitles.reduce((a, [, u]) => a + u.length, 0);
    out.push(
      fail(
        finding({
          id: 'ONPAGE-004',
          category: 'onpage',
          severity: 'high',
          title: `${count(affected, 'page')} share a duplicate title`,
          detail:
            'When several pages carry the same title, Google cannot tell them apart and will usually pick one and suppress the rest. Each page should describe its own distinct topic.',
          evidence: dupTitles.slice(0, 3).map(([t, urls]) => ({
            label: `"${truncate(t, 60)}"`,
            value: `used on ${urls.length} pages: ${urls.slice(0, 3).map(pathOf).join(', ')}`,
          })),
          urls: dupTitles.flatMap(([, u]) => u),
          affected,
          applicable: titled.length,
          squarespacePath: 'Pages → page settings (gear icon) → SEO → SEO Title',
        }),
        titled.length
      )
    );
  } else if (titled.length > 1) {
    out.push(pass('ONPAGE-004', 'onpage', 'high', titled.length, 'Every page has a unique title'));
  }

  // Default / boilerplate titles.
  //
  // Widened from the original exact-match list (home/welcome/untitled/new
  // page/page N), which under-detected extremely common real placeholder
  // patterns (AUDIT-OF-THE-AUDIT.md, Step 3, ONPAGE-005). This measures the
  // same underlying problem as SQS-006 below — a page with no real SEO title
  // set — from a different angle (a closed pattern list here vs. "falls back
  // to the site name" there), so the two are cross-referenced rather than
  // merged outright: a title can be boilerplate without matching the site
  // name (e.g. "New Collection"), and can fall back to the site name without
  // matching any of these patterns.
  const BOILERPLATE_TITLE_RE =
    /^(home|welcome|untitled( page)?|new page|new collection|page( title)?|page \d+|my site|(?:the )?site title|(?:this is a )?title tag|edit this page|lorem ipsum)$/i;
  const boilerplate = titled.filter((p) => BOILERPLATE_TITLE_RE.test(p.title.trim()));
  if (boilerplate.length) {
    out.push(
      fail(
        finding({
          id: 'ONPAGE-005',
          category: 'onpage',
          severity: 'high',
          title: 'Some pages still use a placeholder title',
          detail:
            'Titles like "Home" or "Untitled" tell a searcher nothing about your business and contain none of the words people actually search for.',
          evidence: boilerplate.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: `"${p.title}"`, url: p.url })),
          urls: boilerplate.map((p) => p.url),
          affected: boilerplate.length,
          applicable: titled.length,
          squarespacePath: 'Pages → page settings (gear icon) → SEO → SEO Title',
          effort: 'quick',
        }),
        titled.length
      )
    );
  } else if (titled.length) {
    out.push(pass('ONPAGE-005', 'onpage', 'high', titled.length));
  }

  /* ---------------- meta descriptions ---------------- */
  const noDesc = pages.filter((p) => !p.metaDescription || !p.metaDescription.trim());
  if (noDesc.length) {
    out.push(
      fail(
        finding({
          id: 'ONPAGE-010',
          category: 'onpage',
          severity: 'medium',
          title: `${count(noDesc.length, 'page')} ${verb(noDesc.length, 'has', 'have')} no meta description`,
          detail:
            'The meta description is the two-line sales pitch under your link in Google. Leave it empty and Google grabs an arbitrary sentence from the page, which is rarely the one you would have chosen. Note that Squarespace outputs an empty description tag rather than omitting it, so tools that only check for the tag miss this.',
          evidence: noDesc.slice(0, 4).map((p) => ({ label: pathOf(p.url), value: p.metaDescription === null ? 'tag missing' : 'tag present but empty', url: p.url })),
          urls: noDesc.map((p) => p.url),
          affected: noDesc.length,
          applicable: N,
          squarespacePath: 'Pages → page settings (gear icon) → SEO → SEO Description',
          effort: 'quick',
        }),
        N,
        { gamma: 1.0 }
      )
    );
  } else {
    out.push(pass('ONPAGE-010', 'onpage', 'medium', N, 'Every page has a meta description'));
  }

  const described = pages.filter((p) => p.metaDescription && p.metaDescription.trim());
  const badDesc = described.filter((p) => {
    const l = p.metaDescription!.trim().length;
    return l < 70 || l > 170;
  });
  if (badDesc.length) {
    out.push(
      fail(
        finding({
          id: 'ONPAGE-011',
          category: 'onpage',
          severity: 'low',
          title: `${count(badDesc.length, 'meta description')} ${verb(badDesc.length, 'is', 'are')} outside the length Google displays`,
          detail:
            'Aim for roughly 120-160 characters. Below that you are leaving space unused; above it Google truncates mid-sentence or writes its own.',
          evidence: badDesc.slice(0, 3).map((p) => ({
            label: pathOf(p.url),
            value: `${p.metaDescription!.trim().length} chars`,
            url: p.url,
          })),
          urls: badDesc.map((p) => p.url),
          affected: badDesc.length,
          applicable: described.length,
          effort: 'quick',
        }),
        described.length,
        { gamma: 1.0 }
      )
    );
  } else if (described.length) {
    out.push(pass('ONPAGE-011', 'onpage', 'low', described.length));
  }

  /* ---------------- H1 ---------------- */
  const noH1 = pages.filter((p) => p.h1.filter((h) => h.trim()).length === 0);
  if (noH1.length) {
    out.push(
      fail(
        finding({
          id: 'ONPAGE-020',
          category: 'onpage',
          severity: 'high',
          title: `${count(noH1.length, 'page')} ${verb(noH1.length, 'has', 'have')} no H1 heading`,
          detail:
            'The H1 is the main on-page heading. It is one of the strongest signals of what a page is about, for both search engines and the AI systems that summarise pages.',
          evidence: noH1.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: 'no <h1> element', url: p.url })),
          urls: noH1.map((p) => p.url),
          affected: noH1.length,
          applicable: N,
          squarespacePath: 'Edit the page → click the headline text block → set it to Heading 1 in the text toolbar',
          effort: 'quick',
        }),
        N
      )
    );
  } else {
    out.push(pass('ONPAGE-020', 'onpage', 'high', N, 'Every page has a main H1 heading'));
  }

  const multiH1 = pages.filter((p) => p.h1.filter((h) => h.trim()).length > 2);
  if (multiH1.length) {
    out.push(
      fail(
        finding({
          id: 'ONPAGE-021',
          category: 'onpage',
          severity: 'low',
          title: `${count(multiH1.length, 'page')} ${verb(multiH1.length, 'uses', 'use')} three or more H1 headings`,
          detail:
            'Multiple H1s dilute the signal about what the page is primarily about. One clear H1 with H2s beneath it reads better to both people and machines.',
          evidence: multiH1.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: `${p.h1.length} H1 headings`, url: p.url })),
          urls: multiH1.map((p) => p.url),
          affected: multiH1.length,
          applicable: N,
        }),
        N
      )
    );
  } else {
    out.push(pass('ONPAGE-021', 'onpage', 'low', N));
  }

  const skipped = pages.filter((p) => p.headingSkips > 0);
  if (skipped.length) {
    out.push(
      fail(
        finding({
          id: 'ONPAGE-024',
          category: 'onpage',
          severity: 'low',
          title: `${count(skipped.length, 'page')} skip heading levels`,
          detail:
            'Headings jump from one level to a deeper one without the level in between (for example H2 straight to H4). Screen readers use this structure to navigate, and extraction tools use it to work out which text belongs to which section.',
          evidence: skipped.slice(0, 3).map((p) => ({ label: pathOf(p.url), value: `${p.headingSkips} skipped levels`, url: p.url })),
          urls: skipped.map((p) => p.url),
          affected: skipped.length,
          applicable: N,
        }),
        N
      )
    );
  } else {
    out.push(pass('ONPAGE-024', 'onpage', 'low', N));
  }

  /* ---------------- thin content ---------------- */
  // Previously a hand-written URL regex covering only
  // contact/privacy/terms/thank/cart/search, duplicated nowhere else in the
  // codebase and out of sync with ONPAGE-040 below, which had no exclusions
  // at all (AUDIT-OF-THE-AUDIT.md, Step 3 and Step 5). Both checks now read
  // the same shared page-type signal, so a gallery or a contact page is
  // exempted consistently instead of only from one of the two checks.
  const contentPages = pages.filter(
    (p) => !/\/(privacy|terms|thank|cart|search)/i.test(p.url) && !isThinByDesign(p.pageType)
  );
  const thin = contentPages.filter((p) => (p.depth === 0 ? p.wordCount < 150 : p.wordCount < 120));
  if (contentPages.length) {
    if (thin.length) {
      out.push(
        fail(
          finding({
            id: 'ONPAGE-030',
            category: 'onpage',
            severity: 'high',
            title: `${count(thin.length, 'page')} ${verb(thin.length, 'has', 'have')} very little readable text`,
            detail:
              'These pages contain almost no text that a search engine or an AI assistant can read. Design-led Squarespace sites often put the whole message inside images or a background video, beautiful for a visitor, invisible to everything else.',
            evidence: thin.slice(0, 4).map((p) => ({
              label: pathOf(p.url),
              value: `${p.wordCount} words of body text`,
              url: p.url,
            })),
            urls: thin.map((p) => p.url),
            affected: thin.length,
            applicable: contentPages.length,
            effort: 'medium',
          }),
          contentPages.length
        )
      );
    } else {
      out.push(pass('ONPAGE-030', 'onpage', 'high', contentPages.length, 'Pages contain enough readable text to be understood'));
    }
  }

  /* ---------------- placeholder content ---------------- */
  const placeholder = pages.filter((p) => PLACEHOLDER_RE.test(p.mainText));
  if (placeholder.length) {
    const onHome = placeholder.some((p) => p.depth === 0);
    out.push(
      fail(
        finding({
          id: 'ONPAGE-033',
          category: 'onpage',
          severity: onHome ? 'critical' : 'high',
          title: 'Placeholder template text is still live on the site',
          detail:
            'Unedited template copy such as "Lorem ipsum" or "Add your content here" is visible to visitors. It is the fastest way to lose a prospect\'s trust.',
          evidence: placeholder.slice(0, 3).map((p) => {
            const m = p.mainText.match(PLACEHOLDER_RE);
            const idx = m ? p.mainText.indexOf(m[0]) : 0;
            // Start the excerpt at a word boundary so the quote does not open
            // mid-word, which reads like a bug even when the finding is right.
            let from = Math.max(0, idx - 40);
            if (from > 0) {
              const space = p.mainText.indexOf(' ', from);
              if (space > -1 && space < idx) from = space + 1;
            }
            const excerpt = truncate(p.mainText.slice(from, idx + 120), 160);
            return {
              label: pathOf(p.url),
              value: (from > 0 ? '…' : '') + excerpt,
              url: p.url,
            };
          }),
          urls: placeholder.map((p) => p.url),
          affected: placeholder.length,
          applicable: N,
          effort: 'quick',
        }),
        N
      )
    );
  } else {
    out.push(pass('ONPAGE-033', 'onpage', 'critical', N));
  }

  /* ---------------- image alt text ---------------- */
  const allImages = pages.flatMap((p) => p.images.map((i) => ({ ...i, page: p.url })));
  const contentImages = allImages.filter((i) => i.src && !/^data:/.test(i.src));
  if (contentImages.length >= 3) {
    const missing = contentImages.filter((i) => !i.hasAltAttr);
    const filenameAlt = contentImages.filter(
      (i) => i.hasAltAttr && i.alt && FILENAME_ALT_RE.test(i.alt)
    );
    const coverage = 1 - missing.length / contentImages.length;

    if (coverage < 0.9) {
      out.push(
        fail(
          finding({
            id: 'ONPAGE-050',
            category: 'onpage',
            severity: 'medium',
            title: `${missing.length} of ${count(contentImages.length, 'image')} ${verb(missing.length, 'has', 'have')} no alt text`,
            detail:
              'Alt text is what a screen reader announces and what Google reads to understand an image. It is also a legal accessibility requirement in most markets.',
            evidence: missing.slice(0, 4).map((i) => ({
              label: pathOf(i.page),
              value: truncate(i.src, 90),
              url: i.abs || undefined,
            })),
            urls: Array.from(new Set(missing.map((i) => i.page))),
            affected: missing.length,
            applicable: contentImages.length,
            squarespacePath: 'Click the image → open the image editor → add a description in the "Alt text" / caption field',
            effort: 'medium',
          }),
          contentImages.length,
          { gamma: 1.0 }
        )
      );
    } else {
      out.push(pass('ONPAGE-050', 'onpage', 'medium', contentImages.length, 'Nearly all images carry alt text'));
    }

    if (filenameAlt.length) {
      out.push(
        fail(
          finding({
            id: 'ONPAGE-051',
            category: 'onpage',
            severity: 'low',
            title: `${count(filenameAlt.length, 'image')} ${verb(filenameAlt.length, 'uses', 'use')} the filename as alt text`,
            detail:
              'Squarespace falls back to the uploaded filename when no description is set, so screen readers read out things like "IMG_4821.jpg". Describing the image instead helps both accessibility and image search.',
            evidence: filenameAlt.slice(0, 3).map((i) => ({
              label: pathOf(i.page),
              value: `alt="${truncate(i.alt, 60)}"`,
              url: i.abs || undefined,
            })),
            urls: Array.from(new Set(filenameAlt.map((i) => i.page))),
            affected: filenameAlt.length,
            applicable: contentImages.length,
            effort: 'medium',
          }),
          contentImages.length,
          { gamma: 1.0 }
        )
      );
    } else {
      out.push(pass('ONPAGE-051', 'onpage', 'low', contentImages.length));
    }
  } else {
    out.push(na('ONPAGE-050', 'onpage', 'medium'));
  }

  /* ---------------- internal linking ---------------- */
  // Previously applied to every page with no exceptions, while ONPAGE-030
  // above exempted contact/privacy/terms/etc pages from the *thin-content*
  // check. A short, focused contact page — or a gallery, which is a
  // deliberate dead end by convention — failed this check for something that
  // is often good design, not a fault (AUDIT-OF-THE-AUDIT.md, Step 3 and
  // Step 5: the ONPAGE-030 vs ONPAGE-040 exclusion mismatch). Both checks now
  // share the same page-type-driven exclusion.
  const linkablePages = pages.filter((p) => !isDeadEndByDesign(p.pageType));
  const shallow = linkablePages.filter((p) => p.internalLinks.length < 3 && p.wordCount > 100);
  if (linkablePages.length >= 3) {
    if (shallow.length) {
      out.push(
        fail(
          finding({
            id: 'ONPAGE-040',
            category: 'onpage',
            severity: 'medium',
            title: `${count(shallow.length, 'page')} ${verb(shallow.length, 'has', 'have')} almost no internal links`,
            detail:
              'Pages with very few links out to the rest of the site trap visitors in a dead end and stop ranking strength flowing through your site.',
            evidence: shallow.slice(0, 3).map((p) => ({
              label: pathOf(p.url),
              value: `${p.internalLinks.length} internal links`,
              url: p.url,
            })),
            urls: shallow.map((p) => p.url),
            affected: shallow.length,
            applicable: linkablePages.length,
          }),
          linkablePages.length
        )
      );
    } else {
      out.push(pass('ONPAGE-040', 'onpage', 'medium', linkablePages.length, 'Pages link to each other well'));
    }
  }

  const genericTotal = pages.reduce((a, p) => a + p.a11y.genericLinkText, 0);
  const linkTotal = pages.reduce((a, p) => a + p.links.length, 0);
  if (linkTotal >= 20) {
    if (genericTotal / linkTotal > 0.15) {
      out.push(
        fail(
          finding({
            id: 'ONPAGE-043',
            category: 'onpage',
            severity: 'low',
            title: 'Many links use vague wording like "click here" or "read more"',
            detail:
              'Link text tells both a search engine and a screen-reader user what is on the other side. Generic wording throws that signal away.',
            evidence: [
              { label: 'Generic link text', value: `${genericTotal} of ${linkTotal} links (${Math.round((genericTotal / linkTotal) * 100)}%)` },
            ],
            affected: genericTotal,
            applicable: linkTotal,
          }),
          linkTotal,
          { gamma: 1.0 }
        )
      );
    } else {
      out.push(pass('ONPAGE-043', 'onpage', 'low', linkTotal));
    }
  }

  /* ---------------- navigation depth ---------------- */
  // Informational only — a heuristic count of nav links (see navLinkCount in
  // extract.ts), not a confirmed IA problem. More than ~7 top-level items is
  // a common real-world Squarespace pattern (every page added to the main
  // nav rather than grouped into a folder) that hurts both UX and crawl
  // efficiency.
  const homeNavCount = ctx.homepage.navLinkCount;
  if (homeNavCount > 7) {
    out.push(
      fail(
        finding({
          id: 'ONPAGE-071',
          category: 'onpage',
          severity: 'low',
          confidence: 'heuristic',
          title: `Your main navigation has ${homeNavCount} links`,
          detail:
            'A large flat navigation makes it harder for a visitor to find what they want quickly, and spreads link authority thinly across many destinations instead of concentrating it on the pages that matter most. This is a heuristic count and may include submenu items on some templates, so treat it as worth a look rather than a confirmed problem.',
          evidence: [{ label: 'Links detected in primary navigation', value: String(homeNavCount) }],
          urls: [ctx.homepage.url],
          affected: 1,
          applicable: 1,
        }),
        1,
        { unscored: true }
      )
    );
  } else {
    out.push(pass('ONPAGE-071', 'onpage', 'low', 1, 'Your main navigation is a focused, manageable size'));
  }

  /* ---------------- blog staleness ---------------- */
  // Informational only: a dead blog ("last post 2021") is a trust signal both
  // human readers and AI systems notice, but publishing cadence is a business
  // choice, not a defect, so this never affects the score.
  const blogPosts = pages.filter((p) => p.pageType === 'blog-post');
  if (blogPosts.length) {
    const postDates: number[] = [];
    for (const p of blogPosts) {
      let found: number | null = null;
      for (const block of p.jsonLd) {
        const walk = (n: any, depth = 0) => {
          if (found !== null || !n || typeof n !== 'object' || depth > 5) return;
          if (Array.isArray(n)) return n.forEach((x) => walk(x, depth + 1));
          if (typeof n.datePublished === 'string') {
            const t = Date.parse(n.datePublished);
            if (!Number.isNaN(t)) found = t;
          }
          for (const v of Object.values(n)) if (v && typeof v === 'object') walk(v, depth + 1);
        };
        walk(block.parsed);
      }
      if (found === null) {
        const entry = ctx.sitemap.urls.find((u) => u.loc.replace(/\/$/, '') === p.url.replace(/\/$/, ''));
        if (entry?.lastmod) {
          const t = Date.parse(entry.lastmod);
          if (!Number.isNaN(t)) found = t;
        }
      }
      if (found !== null) postDates.push(found);
    }
    if (postDates.length) {
      const newest = Math.max(...postDates);
      const monthsSinceNewest = Math.floor((Date.now() - newest) / (1000 * 60 * 60 * 24 * 30));
      if (monthsSinceNewest >= 8) {
        out.push(
          fail(
            finding({
              id: 'ONPAGE-070',
              category: 'onpage',
              severity: 'low',
              confidence: 'heuristic',
              title: `Your most recent blog post is about ${monthsSinceNewest} months old`,
              detail:
                'A blog with no recent activity reads as inactive to both visitors and AI systems weighing how current and trustworthy a source is. This does not affect your score, publishing cadence is a business choice, but a stale blog is worth knowing about.',
              evidence: [{ label: 'Newest post date found', value: new Date(newest).toISOString().slice(0, 10) }],
              affected: 1,
              applicable: 1,
            }),
            1,
            { unscored: true }
          )
        );
      } else {
        out.push(pass('ONPAGE-070', 'onpage', 'low', 1, 'Your blog has recent activity'));
      }
    } else {
      out.push(na('ONPAGE-070', 'onpage', 'low'));
    }
  } else {
    out.push(na('ONPAGE-070', 'onpage', 'low'));
  }

  /* ---------------- near-duplicate content ---------------- */
  // Distinct from SQS-007 (the specific /home duplicate-homepage case): this
  // catches the more general and more common pattern of a page duplicated as
  // a starting point and never rewritten. Gated to pages with a reasonable
  // amount of text, since two short pages can look similar by chance (Step 2
  // of the audit review flags this as the check's main false-positive risk).
  const comparablePages = pages.filter((p) => p.wordCount >= 80);
  const duplicatePairs: Array<{ a: string; b: string; overlap: number }> = [];
  for (let i = 0; i < comparablePages.length; i++) {
    for (let j = i + 1; j < comparablePages.length; j++) {
      const overlap = shingleOverlap(comparablePages[i].mainText, comparablePages[j].mainText);
      if (overlap > 0.8) {
        duplicatePairs.push({ a: comparablePages[i].url, b: comparablePages[j].url, overlap });
      }
    }
  }
  if (comparablePages.length >= 2) {
    if (duplicatePairs.length) {
      out.push(
        fail(
          finding({
            id: 'ONPAGE-060',
            category: 'onpage',
            severity: 'medium',
            confidence: 'heuristic',
            title: `${count(duplicatePairs.length, 'pair')} of pages share almost identical text`,
            detail:
              'These pages share more than 80% of their body text. This commonly happens on Squarespace when a page is duplicated as a starting point and the copy is never rewritten. Search engines struggle to decide which one to rank and often suppress one entirely.',
            evidence: duplicatePairs.slice(0, 4).map((d) => ({
              label: `${pathOf(d.a)} ↔ ${pathOf(d.b)}`,
              value: `${Math.round(d.overlap * 100)}% shared text`,
            })),
            urls: Array.from(new Set(duplicatePairs.flatMap((d) => [d.a, d.b]))),
            affected: duplicatePairs.length,
            applicable: comparablePages.length,
            effort: 'medium',
          }),
          comparablePages.length,
          { gamma: 1.0 }
        )
      );
    } else {
      out.push(pass('ONPAGE-060', 'onpage', 'medium', comparablePages.length, 'No pages share substantially duplicate text'));
    }
  } else {
    out.push(na('ONPAGE-060', 'onpage', 'medium'));
  }

  return out;
}

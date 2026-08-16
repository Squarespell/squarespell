/**
 * AI search readiness (AEO / GEO).
 *
 * The distinction that most audit tools get wrong: AI *search* crawlers are not
 * AI *training* crawlers. Blocking OAI-SearchBot removes you from ChatGPT's
 * citations; blocking GPTBot only opts you out of model training and costs you
 * nothing in visibility. We report those very differently.
 */

import { AuditContext, count, fail, finding, na, pass, truncate, verb } from '../context';
import type { CheckResult } from '../types';
import { isAllowed } from '../robots';
import { pathOf } from '../url';

const SEARCH_BOTS = [
  { agent: 'OAI-SearchBot', product: 'ChatGPT Search' },
  { agent: 'Claude-SearchBot', product: 'Claude' },
  { agent: 'PerplexityBot', product: 'Perplexity' },
  { agent: 'Bingbot', product: 'Bing and Microsoft Copilot' },
  { agent: 'Googlebot', product: 'Google Search and AI Overviews' },
];

const USER_FETCH_BOTS = [
  { agent: 'ChatGPT-User', product: 'ChatGPT live browsing' },
  { agent: 'Claude-User', product: 'Claude live browsing' },
  { agent: 'Perplexity-User', product: 'Perplexity live browsing' },
];

const TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', 'Applebot-Extended', 'Bytespider', 'anthropic-ai'];

const QUESTION_RE = /^(how|what|why|when|where|who|which|can|do|does|is|are|should|will)\b/i;

const CATEGORY_NOUNS =
  /\b(coach|coaching|photograph|videograph|design|designer|studio|agency|consultan|therapis|therapy|counsel|salon|barber|spa|yoga|pilates|fitness|trainer|nutrition|dentist|clinic|doctor|physio|chiropract|lawyer|attorney|solicitor|account|bookkeep|plumb|electric|builder|contractor|roofing|landscap|cleaning|florist|baker|bakery|restaurant|cafe|caterer|catering|wedding|planner|realtor|estate agent|architect|interior|marketing|copywrit|developer|artist|jeweller|jewelry|boutique|shop|store|school|tutor|veterinar|pet|travel|tour)\w*/i;

export function aeoChecks(ctx: AuditContext): CheckResult[] {
  const out: CheckResult[] = [];
  const pages = ctx.htmlPages;
  const N = Math.max(1, pages.length);
  const home = ctx.homepage;

  /* ---------------- AI search crawler access ---------------- */
  if (ctx.robots.found) {
    const blocked = SEARCH_BOTS.filter((b) => !isAllowed(ctx.robots, b.agent, '/'));
    if (blocked.length) {
      out.push(
        fail(
          finding({
            id: 'AEO-001',
            category: 'aeo',
            severity: 'critical',
            title: `Your robots.txt blocks ${count(blocked.length, 'AI search engine')}`,
            detail: `${blocked
              .map((b) => b.product)
              .join(', ')} are prevented from crawling your site, which removes you from their answers and citations entirely. This is different from blocking AI training crawlers, these are the bots that decide whether your business gets recommended when someone asks an assistant for a supplier.`,
            evidence: blocked.map((b) => ({ label: b.agent, value: `disallowed from /, no ${b.product} citations` })),
            affected: blocked.length,
            applicable: SEARCH_BOTS.length,
          }),
          SEARCH_BOTS.length
        )
      );
    } else {
      out.push(pass('AEO-001', 'aeo', 'critical', SEARCH_BOTS.length, 'AI search engines are allowed to crawl your site'));
    }

    const blockedUser = USER_FETCH_BOTS.filter((b) => !isAllowed(ctx.robots, b.agent, '/'));
    if (blockedUser.length) {
      out.push(
        fail(
          finding({
            id: 'AEO-002',
            category: 'aeo',
            severity: 'high',
            title: 'AI assistants cannot fetch your page when a user asks about you',
            detail: `${blockedUser
              .map((b) => b.product)
              .join(', ')} are blocked. When someone pastes your URL into an assistant or asks it to look you up, it will fail to read the page.`,
            evidence: blockedUser.map((b) => ({ label: b.agent, value: 'disallowed from /' })),
            affected: blockedUser.length,
            applicable: USER_FETCH_BOTS.length,
          }),
          USER_FETCH_BOTS.length
        )
      );
    } else {
      out.push(pass('AEO-002', 'aeo', 'high', USER_FETCH_BOTS.length));
    }

    // Training crawlers: reported as a policy choice, never scored.
    const blockedTraining = TRAINING_BOTS.filter((a) => !isAllowed(ctx.robots, a, '/'));
    if (blockedTraining.length) {
      out.push(
        fail(
          finding({
            id: 'AEO-003',
            category: 'aeo',
            severity: 'info',
            title: 'AI training crawlers are blocked (this is a policy choice, not a fault)',
            detail:
              'Your robots.txt blocks crawlers that collect data for training AI models. This does not affect whether AI assistants can cite you, those use separate search crawlers, which are handled above. Squarespace blocks these by default. Allowing them can help your brand accumulate mentions inside models over time; blocking them protects your content. Either answer is defensible.',
            evidence: [{ label: 'Blocked training agents', value: blockedTraining.join(', ') }],
            affected: 0,
            applicable: 0,
          }),
          0,
          { unscored: true }
        )
      );
    }
  }

  // Server-level bot blocking (robots.txt says yes, the WAF says no).
  if (ctx.aiBotProbe && ctx.aiBotProbe.length) {
    const hardBlocked = ctx.aiBotProbe.filter((p) => p.blocked);
    if (hardBlocked.length) {
      out.push(
        fail(
          finding({
            id: 'AEO-005',
            category: 'aeo',
            severity: 'critical',
            title: 'Your server refuses AI search crawlers even though robots.txt allows them',
            detail:
              'We requested your homepage using AI-crawler user agents and were refused at the server. A firewall or bot-protection rule is overriding robots.txt, so these engines never see your content. Nothing in robots.txt reveals this, it only shows up when you test with the real user agent.',
            evidence: hardBlocked.map((p) => ({ label: p.agent, value: `HTTP ${p.status} returned to this crawler` })),
            affected: hardBlocked.length,
            applicable: ctx.aiBotProbe.length,
          }),
          ctx.aiBotProbe.length
        )
      );
    } else {
      out.push(pass('AEO-005', 'aeo', 'critical', ctx.aiBotProbe.length, 'AI crawlers are served your pages normally'));
    }
  }

  /* ---------------- entity clarity on the homepage ---------------- */
  const opening = home.mainText.slice(0, 900);
  // CATEGORY_NOUNS is a whitelist of ~90 local, appointment-based trades
  // (coach, dentist, plumber, photographer...). Gating this check behind it
  // alone silently mis-scored every SaaS, e-commerce, media, nonprofit or B2B
  // business — a SaaS homepage opening with "the project management tool
  // built for design teams" contains none of those nouns and was flagged as
  // if it said nothing at all (AUDIT-OF-THE-AUDIT.md, Step 3, AEO-017; likely
  // the highest-volume false positive in the tool). buildProfile() already
  // reasons over category, named services and schema type together to decide
  // whether it understood the business — reuse that confidence signal, and
  // also accept a declared schema.org business/product type, rather than
  // relying on one closed noun list.
  const entityProfile = ctx.aeo?.profile;
  const statesWhatItDoesByNoun = CATEGORY_NOUNS.test(opening) || CATEGORY_NOUNS.test(home.title);
  const statesWhatItDoesByProfile = Boolean(entityProfile?.confident);
  const statesWhatItDoesBySchema = home.schemaTypes.some((t) =>
    /Organization|LocalBusiness|Store|Corporation|ProfessionalService|SoftwareApplication|Product|Service|WebApplication/i.test(t)
  );
  const statesWhatItDoes = statesWhatItDoesByNoun || statesWhatItDoesByProfile || statesWhatItDoesBySchema;
  if (!statesWhatItDoes) {
    out.push(
      fail(
        finding({
          id: 'AEO-017',
          category: 'aeo',
          // Downgraded from `high`: this is a heuristic that can miss a
          // genuinely clear homepage (a category outside our noun list, with
          // no schema and a profile we weren't confident about), so it should
          // read as "worth a second look", not a confirmed defect.
          severity: 'medium',
          confidence: 'heuristic',
          title: 'We could not automatically confirm what this business does from the homepage',
          detail:
            'We checked the first 900 characters of your homepage text, your title tag, your declared schema.org type, and our own business-profile classifier, and none of them gave a clear read on your trade or offering. This does not necessarily mean a human visitor finds your homepage unclear, only that this automated check could not confirm it, worth a second look rather than a confirmed problem.',
          evidence: [
            { label: 'Homepage title', value: home.title || '(none)' },
            { label: 'Opening body text', value: opening ? truncate(opening, 200) : '(no readable text found)' },
            { label: 'Declared schema.org type', value: home.schemaTypes[0] || '(none)' },
          ],
          urls: [home.url],
          affected: 1,
          applicable: 1,
          effort: 'quick',
        }),
        1
      )
    );
  } else {
    out.push(pass('AEO-017', 'aeo', 'medium', 1, 'Your homepage states what the business does in readable text'));
  }

  /* ---------------- semantic structure ---------------- */
  const noLandmarks = pages.filter((p) => p.landmarks.main === 0);
  if (noLandmarks.length === pages.length && pages.length > 0) {
    out.push(
      fail(
        finding({
          id: 'AEO-014',
          category: 'aeo',
          severity: 'medium',
          title: 'Pages have no <main> landmark to mark the primary content',
          detail:
            'Content-extraction pipelines, the ones AI assistants use to decide which part of a page is the article and which part is navigation, rely on HTML landmarks. Without them, your menu and footer get mixed into whatever gets quoted.',
          evidence: [{ label: 'Pages without a <main> element', value: `${noLandmarks.length} of ${pages.length}` }],
          urls: noLandmarks.map((p) => p.url),
          affected: noLandmarks.length,
          applicable: pages.length,
          platformLocked: ctx.squarespace.isSquarespace,
        }),
        pages.length,
        { unscored: ctx.squarespace.isSquarespace }
      )
    );
  } else {
    out.push(pass('AEO-014', 'aeo', 'medium', Math.max(1, pages.length)));
  }

  /* ---------------- question-format headings ---------------- */
  const longPages = pages.filter((p) => p.wordCount > 400);
  if (longPages.length) {
    const withoutQuestions = longPages.filter(
      (p) => !p.headings.some((h) => h.level >= 2 && h.level <= 4 && (QUESTION_RE.test(h.text) || h.text.endsWith('?')))
    );
    if (withoutQuestions.length) {
      out.push(
        fail(
          finding({
            id: 'AEO-010',
            category: 'aeo',
            severity: 'medium',
            title: `${count(withoutQuestions.length, 'substantial page')} ${verb(withoutQuestions.length, 'contains', 'contain')} no question-style headings`,
            detail:
              'AI assistants and Google\'s answer boxes lift text that sits directly under a heading phrased as the question a person actually asked. Pages built entirely from statement headings rarely get selected.',
            evidence: withoutQuestions.slice(0, 3).map((p) => ({
              label: pathOf(p.url),
              value: `${p.wordCount} words, ${p.headings.length} headings, none phrased as a question`,
              url: p.url,
            })),
            urls: withoutQuestions.map((p) => p.url),
            affected: withoutQuestions.length,
            applicable: longPages.length,
            effort: 'medium',
          }),
          longPages.length
        )
      );
    } else {
      out.push(pass('AEO-010', 'aeo', 'medium', longPages.length, 'Longer pages use question-style headings that AI answers can quote'));
    }
  } else {
    out.push(na('AEO-010', 'aeo', 'medium'));
  }

  /* ---------------- entity consistency ---------------- */
  const nameVariants = new Set<string>();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (home.og['og:site_name']) nameVariants.add(norm(home.og['og:site_name']));
  const ctxName = ctx.squarespace.context?.website?.siteTitle;
  if (ctxName) nameVariants.add(norm(String(ctxName)));
  for (const b of home.jsonLd) {
    const parsed = b.parsed;
    const walk = (n: any) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach(walk);
      const t = n['@type'];
      const types = Array.isArray(t) ? t : [t];
      if (types.some((x) => /Organization|LocalBusiness|WebSite/.test(String(x))) && typeof n.name === 'string') {
        nameVariants.add(norm(n.name));
      }
      Object.values(n).forEach((v) => v && typeof v === 'object' && walk(v));
    };
    walk(parsed);
  }
  nameVariants.delete('');
  if (nameVariants.size >= 3) {
    out.push(
      fail(
        finding({
          id: 'AEO-018',
          category: 'aeo',
          severity: 'medium',
          title: 'Your business name appears in several different forms',
          detail:
            'Search engines and AI systems match a business to a single entity by its name. When the name differs between your title tag, your social metadata and your structured data, those signals get split across what look like different companies.',
          evidence: [{ label: 'Variants found', value: Array.from(nameVariants).slice(0, 5).join(' | ') }],
          affected: nameVariants.size,
          applicable: nameVariants.size,
        }),
        Math.max(1, nameVariants.size)
      )
    );
  } else {
    out.push(pass('AEO-018', 'aeo', 'medium', 1));
  }

  /* ---------------- sameAs entity anchoring ---------------- */
  const sameAsUrls = new Set<string>();
  for (const b of home.jsonLd) {
    const walk = (n: any) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach(walk);
      if (n.sameAs) {
        const arr = Array.isArray(n.sameAs) ? n.sameAs : [n.sameAs];
        arr.forEach((s: any) => typeof s === 'string' && sameAsUrls.add(s));
      }
      Object.values(n).forEach((v) => v && typeof v === 'object' && walk(v));
    };
    walk(b.parsed);
  }
  if (sameAsUrls.size === 0) {
    out.push(
      fail(
        finding({
          id: 'AEO-019',
          category: 'aeo',
          severity: 'medium',
          title: 'Nothing connects your website to your other online profiles',
          detail:
            'A "sameAs" list in your structured data links your site to your Google Business Profile, Instagram, LinkedIn and review pages. Without it, search engines have to guess that those profiles are the same business as this website, and often they do not.',
          evidence: [{ label: 'sameAs entries found', value: '0' }],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Settings → Advanced → Code Injection → Header, add a JSON-LD Organization block with a sameAs array',
          effort: 'medium',
        }),
        1
      )
    );
  } else {
    out.push(pass('AEO-019', 'aeo', 'medium', 1, `${count(sameAsUrls.size, 'external profile')} ${verb(sameAsUrls.size, 'is', 'are')} linked via structured data`));
  }

  /* ---------------- about / contact reachability ---------------- */
  const allLinks = pages.flatMap((p) => p.links.map((l) => l.abs || ''));
  const hasAbout = allLinks.some((u) => /\/(about|our-story|team|who-we-are)/i.test(u));
  const hasContact = allLinks.some((u) => /\/(contact|get-in-touch|enquir|book)/i.test(u));
  if (!hasAbout || !hasContact) {
    out.push(
      fail(
        finding({
          id: 'AEO-024',
          category: 'aeo',
          severity: 'medium',
          title: `No ${!hasAbout && !hasContact ? 'About or Contact page' : !hasAbout ? 'About page' : 'Contact page'} was found in your navigation`,
          detail:
            'About and Contact pages are the two pages every trust-evaluation system looks for, Google\'s quality signals, AI assistants deciding whether you are a real business, and human visitors deciding whether to enquire.',
          evidence: [
            { label: 'About page', value: hasAbout ? 'found' : 'not found' },
            { label: 'Contact page', value: hasContact ? 'found' : 'not found' },
          ],
          affected: (!hasAbout ? 1 : 0) + (!hasContact ? 1 : 0),
          applicable: 2,
          effort: 'medium',
        }),
        2
      )
    );
  } else {
    out.push(pass('AEO-024', 'aeo', 'medium', 2, 'About and Contact pages are present'));
  }

  /* ================================================================ *
   * GEO layer: entity, topical authority, answerability
   * ================================================================ */
  const faq = ctx.aeo;
  const profile = faq?.profile;

  /* ---------------- questions the site does not answer ---------------- */
  if (faq?.ran && faq.gaps.length >= 6) {
    const opportunities = faq.opportunities;
    if (opportunities.length) {
      const partialCount = opportunities.filter((g) => g.status === 'partial').length;
      out.push(
        fail(
          finding({
            id: 'AEO-030',
            category: 'aeo',
            severity: opportunities.filter((g) => g.weight === 3).length >= 2 ? 'high' : 'medium',
            confidence: 'heuristic',
            title: `Your site does not answer ${count(opportunities.length, 'question')} a customer would ask`,
            detail: `We built these questions from what your own site says you do, then checked every page for an answer. ${
              partialCount > 0
                ? `${count(partialCount, 'of them')} ${verb(partialCount, 'is', 'are')} on a page that covers the subject but never gives the answer, which is the version AI assistants find most frustrating: they can tell the page is relevant, but they have nothing to quote.`
                : 'None of them are addressed anywhere on the site.'
            } When an assistant cannot find your answer, it uses a competitor's.`,
            evidence: opportunities.slice(0, 6).map((g) => ({
              label: g.status === 'partial' ? 'Asked but not answered' : 'Not covered',
              value:
                g.status === 'partial'
                  ? `${g.question}  (closest page: ${pathOf(g.pageUrl || '')}, mentions the subject, no answer)`
                  : g.question,
              url: g.pageUrl,
            })),
            affected: opportunities.length,
            applicable: faq.gaps.length,
            squarespacePath: 'Add an FAQ section to the relevant page, or a dedicated FAQ page, with each question as a Heading 2 and the answer in the first sentence beneath it',
            effort: 'medium',
            narrative: {
              why: 'AI assistants and answer boxes work by matching a question to a passage that answers it. A page that talks around the subject without answering cannot be quoted, so you lose the citation to whoever did answer it. These are also the questions that arrive in your inbox one at a time.',
              action: 'Write each question as a Heading 2, then answer it in the first two sentences underneath, plainly and specifically. A price range is better than silence, and "it depends, here is what it depends on" is better than both.',
              impact: 'Your pages become quotable, which is what makes a citation possible, and the enquiries you do get arrive further along because the obvious questions are already answered.',
            },
          }),
          faq.gaps.length,
          { gamma: 0.5 }
        )
      );
    } else {
      out.push(
        pass('AEO-030', 'aeo', 'medium', faq.gaps.length, 'Your site answers the questions a customer would ask before enquiring')
      );
    }
  } else {
    out.push(na('AEO-030', 'aeo', 'medium'));
  }

  /* ---------------- FAQ markup ---------------- */
  if (faq && faq.existingQuestionHeadings >= 3 && !faq.hasFaqSchema) {
    out.push(
      fail(
        finding({
          id: 'AEO-031',
          category: 'aeo',
          severity: 'medium',
          title: 'Your FAQ content is not marked up as an FAQ',
          detail: `We found ${count(faq.existingQuestionHeadings, 'question-style heading')} across your pages but no FAQPage structured data. The content is doing the work; the markup that tells search engines and assistants "this is a question and this is its answer" is missing, so they have to infer it.`,
          evidence: [
            { label: 'Question-style headings', value: String(faq.existingQuestionHeadings) },
            { label: 'FAQPage structured data', value: 'not found' },
          ],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Settings → Advanced → Code Injection, add an FAQPage JSON-LD block listing the same questions and answers that appear on the page',
          effort: 'medium',
          narrative: {
            why: 'You have already written the answers. Marking them up is what lets an assistant lift a single question and answer rather than guessing where one ends and the next begins.',
            action: 'Add FAQPage JSON-LD containing exactly the questions and answers already visible on the page. The markup must match the visible text, inventing entries there is a policy violation.',
            impact: 'Each question becomes individually addressable, which is the unit that answer engines actually cite.',
          },
        }),
        1
      )
    );
  } else if (faq?.hasFaqSchema) {
    out.push(pass('AEO-031', 'aeo', 'medium', 1, 'Your FAQ content is marked up so answer engines can read it'));
  } else {
    out.push(na('AEO-031', 'aeo', 'medium'));
  }

  /* ---------------- topical authority: services without a page ---------------- */
  const namedServices = profile ? profile.services.filter((s) => s.source !== 'product') : [];
  if (profile && namedServices.length >= 2) {
    // Shop products always have a page by definition, so they are excluded.
    const homeless = namedServices.filter((s) => !s.hasOwnPage);
    if (homeless.length) {
      out.push(
        fail(
          finding({
            id: 'AEO-032',
            category: 'aeo',
            severity: 'medium',
            confidence: 'heuristic',
            title: `${count(homeless.length, 'service')} you offer ${verb(homeless.length, 'has', 'have')} no page of ${verb(homeless.length, 'its', 'their')} own`,
            detail:
              'These appear in your navigation or on a list, but nothing on the site expands on them. A named service with no page behind it cannot rank for that service, and gives an AI assistant nothing to read when someone asks whether you do it.',
            evidence: homeless.slice(0, 5).map((s) => ({
              label: s.name,
              value: `named in your ${s.source === 'nav' ? 'navigation' : s.source === 'heading' ? 'page content' : 'site'}, no dedicated page found`,
            })),
            affected: homeless.length,
            applicable: namedServices.length,
            effort: 'project',
            narrative: {
              why: 'Depth on a subject is how both search engines and AI systems decide you are a credible source for it. One line on a list is not depth, and it competes with every other service on the same page.',
              action: 'Give each service you actually want work from its own page: what it is, who it suits, what it costs or how it is priced, what happens, and how to start.',
              impact: 'Each service becomes something you can be found for on its own terms rather than sharing one page with everything else you do.',
            },
          }),
          namedServices.length,
          { gamma: 0.5 }
        )
      );
    } else {
      out.push(pass('AEO-032', 'aeo', 'medium', namedServices.length, 'Every service you name has a page behind it'));
    }
  } else {
    out.push(na('AEO-032', 'aeo', 'medium'));
  }

  /* ---------------- internal linking opportunities ---------------- */
  if (profile) {
    const linkable = profile.services.filter((s) => s.hasOwnPage && s.url && s.name.length >= 8);
    const opportunities: Array<{ from: string; to: string; name: string }> = [];
    for (const s of linkable) {
      const target = (s.url || '').replace(/\/$/, '');
      const needle = s.name.toLowerCase();
      for (const p of pages) {
        if (p.url.replace(/\/$/, '') === target) continue;
        if (!p.mainText.toLowerCase().includes(needle)) continue;
        const linksOut = p.links.some((l) => (l.abs || '').replace(/\/$/, '') === target);
        if (!linksOut) opportunities.push({ from: p.url, to: s.url!, name: s.name });
      }
    }
    if (opportunities.length >= 2) {
      out.push(
        fail(
          finding({
            id: 'AEO-035',
            category: 'aeo',
            severity: 'low',
            confidence: 'heuristic',
            title: `${count(opportunities.length, 'page')} ${verb(opportunities.length, 'mentions', 'mention')} a service without linking to it`,
            detail:
              'These pages name a service you have a dedicated page for, but do not link to it. Internal links are how ranking signal moves around a site and how a reader gets from interest to the page that sells.',
            evidence: opportunities.slice(0, 5).map((o) => ({
              label: pathOf(o.from),
              value: `mentions "${o.name}" but does not link to ${pathOf(o.to)}`,
              url: o.from,
            })),
            urls: Array.from(new Set(opportunities.map((o) => o.from))),
            affected: opportunities.length,
            applicable: Math.max(opportunities.length, pages.length),
            effort: 'quick',
            narrative: {
              why: 'An unlinked mention is a dead end for the reader and a wasted signal for search engines, which read internal links as a statement about which of your pages matter.',
              action: 'Link the phrase where it appears, using the service name itself as the link text rather than "click here".',
              impact: 'Ranking signal flows to your service pages, and readers reach them at the moment they become interested rather than having to go looking.',
            },
          }),
          Math.max(opportunities.length, pages.length),
          { gamma: 0.5 }
        )
      );
    } else {
      out.push(pass('AEO-035', 'aeo', 'low', Math.max(1, pages.length)));
    }
  } else {
    out.push(na('AEO-035', 'aeo', 'low'));
  }

  /* ---------------- authorship and expertise ---------------- */
  const articlePages = pages.filter(
    (p) => /\/(blog|news|journal|articles?|insights?|posts?)\//i.test(pathOf(p.url)) || p.schemaTypes.some((t) => /BlogPosting|Article/i.test(t))
  );
  if (articlePages.length >= 2) {
    const noAuthor = articlePages.filter((p) => {
      const hasSchemaAuthor = p.jsonLd.some((b) => {
        let found = false;
        const walk = (n: any, d = 0) => {
          if (found || !n || typeof n !== 'object' || d > 5) return;
          if (Array.isArray(n)) return n.forEach((x) => walk(x, d + 1));
          if (n.author && (typeof n.author === 'string' || typeof n.author === 'object')) found = true;
          for (const v of Object.values(n)) if (v && typeof v === 'object') walk(v, d + 1);
        };
        walk(b.parsed);
        return found;
      });
      const hasTextAuthor = /\b(written by|posted by|author:|by\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/.test(p.mainText.slice(0, 1500));
      return !hasSchemaAuthor && !hasTextAuthor;
    });
    if (noAuthor.length) {
      out.push(
        fail(
          finding({
            id: 'AEO-034',
            category: 'aeo',
            severity: 'medium',
            title: `${count(noAuthor.length, 'article')} ${verb(noAuthor.length, 'has', 'have')} no named author`,
            detail:
              'Nothing on these pages says who wrote them. Search quality guidance and every AI system that weighs credibility look for a named, identifiable author with relevant experience, particularly on advice content.',
            evidence: noAuthor.slice(0, 4).map((p) => ({
              label: pathOf(p.url),
              value: 'no author in the text and none in structured data',
              url: p.url,
            })),
            urls: noAuthor.map((p) => p.url),
            affected: noAuthor.length,
            applicable: articlePages.length,
            squarespacePath: 'Blog post settings → Options → set an Author, and add a short bio block at the end of the post',
            effort: 'medium',
            narrative: {
              why: 'Anonymous advice is the cheapest content on the internet to produce, so systems that weigh credibility discount it. A named author with real experience is the difference between content that gets cited and content that gets ignored.',
              action: 'Set an author on every post, and add two or three lines at the end saying who they are and why they are qualified to write it.',
              impact: 'Your articles gain an accountable human behind them, which is what both readers and ranking systems use to decide whether to trust the advice.',
            },
          }),
          articlePages.length,
          { gamma: 0.5 }
        )
      );
    } else {
      out.push(pass('AEO-034', 'aeo', 'medium', articlePages.length, 'Your articles name the person who wrote them'));
    }
  } else {
    out.push(na('AEO-034', 'aeo', 'medium'));
  }

  /* ---------------- where you are ---------------- */
  const localish = Boolean(
    profile &&
      (profile.entityType === null || /LocalBusiness|Store|Restaurant|Salon|Spa|Gym|Dentist|Clinic|Service/i.test(profile.entityType))
  );
  if (profile && localish && !profile.isCommerce) {
    if (!profile.location) {
      out.push(
        fail(
          finding({
            id: 'AEO-036',
            category: 'aeo',
            severity: 'medium',
            confidence: 'heuristic',
            title: 'Your site never says where you are or which areas you cover',
            detail:
              'We could not find a town, region or service area in your page text or your structured data. "Near me" and "in [town]" are how most local searches are phrased, and an assistant asked for a supplier in a specific place cannot suggest a business with no stated location.',
            evidence: [
              { label: 'Location in structured data', value: 'not found' },
              { label: 'Location in page text', value: 'not found' },
            ],
            affected: 1,
            applicable: 1,
            squarespacePath: 'Add your town and service area to the footer and your About page, and add LocalBusiness structured data with a full address',
            effort: 'quick',
            narrative: {
              why: 'Location is one of the strongest filters in both local search and AI recommendations. Without it you are excluded from every query that mentions a place, which for most local businesses is most of the demand.',
              action: 'State the town you are based in and the areas you travel to, in visible text on the homepage or footer, and mirror it in LocalBusiness structured data.',
              impact: 'You become eligible for the "near me" and "in [town]" searches that currently cannot match you.',
            },
          }),
          1
        )
      );
    } else {
      out.push(
        pass('AEO-036', 'aeo', 'medium', 1, `Your location is stated (${profile.location}), so local searches can match you`)
      );
    }
  } else {
    out.push(na('AEO-036', 'aeo', 'medium'));
  }

  return out;
}

/**
 * The audit pipeline.
 *
 * URL → validate → probe → detect Squarespace → robots/sitemap → crawl →
 * extract → deterministic checks → score → (optional) AI interpretation.
 *
 * Everything is budget-bounded: a hard wall-clock deadline, a page cap, fixed
 * concurrency and per-request timeouts. If a stage runs out of budget the audit
 * degrades, it never hangs and never fails outright.
 */

import { safeFetch, probeAsset, pool, BlockedUrlError } from './safeFetch';
import { normaliseInput, canonicalise, prettyHost, pathOf } from './url';
import { fetchRobots } from './robots';
import { fetchSitemap } from './sitemap';
import { detectSquarespace } from './squarespace';
import { crawl, probeSiteLevel } from './crawler';
import { extractFacts, type PageFacts } from './extract';
import { techChecks } from './checks/tech';
import { onpageChecks } from './checks/onpage';
import { aeoChecks } from './checks/aeo';
import { perfChecks } from './checks/perf';
import { convChecks } from './checks/conv';
import { schemaChecks, socialChecks, a11yChecks, mobileChecks, secChecks } from './checks/misc';
import { sqsChecks } from './checks/sqs';
import { scoreAudit, prioritise, quickWins } from './scoring';
import { buildProfile } from './aeo/profile';
import { templateQuestions } from './aeo/questions';
import { analyseQuestions } from './aeo/gaps';
import { buildUnderstanding } from './understanding';
import { buildOpportunities, applyGoalAwareness } from './opportunity';
import { buildWebsiteDoctor } from './doctor';
import { applyNarrative } from './narrative';
import { buildVerdict } from './verdict';
import { count } from './context';
import type { AuditContext } from './context';
import type {
  AuditReport,
  CheckResult,
  Finding,
  PageData,
  ProgressEvent,
  AssetProbe,
  BusinessContext,
} from './types';

/**
 * Trim and bound whatever the client sent so a careless or hostile payload
 * cannot bloat the stored report or (once competitor URLs are actually
 * fetched, in a later phase) expand the audit's own attack surface. Silently
 * drops anything malformed rather than erroring the whole audit over
 * optional, non-essential input.
 */
function sanitiseBusinessContext(input?: BusinessContext): BusinessContext | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const out: BusinessContext = {};
  if (typeof input.businessDescription === 'string' && input.businessDescription.trim()) {
    out.businessDescription = input.businessDescription.trim().slice(0, 500);
  }
  if (typeof input.targetAudience === 'string' && input.targetAudience.trim()) {
    out.targetAudience = input.targetAudience.trim().slice(0, 300);
  }
  const KNOWN_GOALS = new Set([
    'get_more_customers', 'get_more_leads', 'get_more_sales', 'get_more_bookings',
    'get_more_traffic', 'improve_website', 'look_more_professional', 'beat_competitors',
    'improve_ai_visibility', 'improve_performance', 'not_sure',
  ]);
  if (typeof input.goal === 'string' && KNOWN_GOALS.has(input.goal)) {
    out.goal = input.goal;
  }
  if (typeof input.customGoal === 'string' && input.customGoal.trim()) {
    out.customGoal = input.customGoal.trim().slice(0, 200);
  }
  if (Array.isArray(input.competitorUrls)) {
    out.competitorUrls = input.competitorUrls
      .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
      .slice(0, 5)
      .map((u) => u.trim().slice(0, 500));
  }
  return Object.keys(out).length ? out : undefined;
}

export class AuditError extends Error {
  constructor(
    message: string,
    public code: string,
    public hint?: string
  ) {
    super(message);
  }
}

export interface AuditConfig {
  maxPages: number;
  concurrency: number;
  perRequestTimeoutMs: number;
  totalBudgetMs: number;
  maxImageProbes: number;
  maxAssetProbes: number;
  /**
   * Audit the site even when it is not Squarespace.
   *
   * The product refuses non-Squarespace sites on purpose: the checks, the fix
   * paths and the scoring all assume the platform, so the advice would be
   * unusable. Benchmarking is the exception. A competitor on WordPress is
   * still a competitor, and comparing crawlable, measurable things across
   * platforms is fair. Squarespace-specific findings are excluded from the
   * comparison rather than counted against them.
   */
  allowNonSquarespace?: boolean;
}

export const DEFAULT_CONFIG: AuditConfig = {
  maxPages: 12,
  concurrency: 4,
  perRequestTimeoutMs: 12_000,
  // Sized to finish comfortably inside a 60s serverless limit, which is the
  // Hobby-plan ceiling. On Pro this can be raised along with maxDuration.
  totalBudgetMs: 48_000,
  maxImageProbes: 20,
  maxAssetProbes: 10,
};

const AI_BOT_AGENTS = [
  {
    agent: 'OAI-SearchBot',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
  },
  {
    agent: 'PerplexityBot',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot',
  },
];

export async function runAudit(
  rawUrl: string,
  emit: (e: ProgressEvent) => void,
  config: AuditConfig = DEFAULT_CONFIG,
  // Optional, additive: nothing downstream requires this. It is validated
  // (see sanitiseBusinessContext), attached verbatim to the finished report
  // so it persists with it, and its `goal` (if set) drives the goal-aware
  // re-ranking below (`applyGoalAwareness`, opportunity.ts) as a top-up layer
  // that can never override severity-driven priority.
  businessContext?: BusinessContext
): Promise<AuditReport> {
  const started = Date.now();
  const deadline = started + config.totalBudgetMs;

  /* -------------------- 1. validate -------------------- */
  emit({ type: 'stage', stage: 'validate', label: 'Checking the address', pct: 3 });
  const input = normaliseInput(rawUrl);
  if (!input) throw new AuditError('Enter a website address to audit.', 'EMPTY_URL');

  let first;
  try {
    first = await safeFetch(input, {
      timeoutMs: config.perRequestTimeoutMs,
      maxBytes: 2_500_000,
      wantCert: true,
    });
  } catch (e: any) {
    if (e instanceof BlockedUrlError) {
      throw new AuditError(e.message, 'BLOCKED_URL');
    }
    throw new AuditError(
      `We could not reach ${prettyHost(input)}.`,
      'UNREACHABLE',
      'Check the address is spelled correctly and that the site is online. If the site is brand new, DNS may still be propagating.'
    );
  }

  if (first.status >= 500) {
    throw new AuditError(
      `${prettyHost(input)} returned a server error (HTTP ${first.status}).`,
      'SERVER_ERROR',
      'The site is online but its server is failing. Try again in a few minutes.'
    );
  }
  if (first.status === 403 || first.status === 429) {
    throw new AuditError(
      `${prettyHost(input)} is blocking automated requests (HTTP ${first.status}).`,
      'BOT_BLOCKED',
      'A firewall or bot-protection rule is refusing our crawler. Note that this also blocks Google and AI search crawlers.'
    );
  }

  // Somebody pasting a deep link to a page that has since been deleted should
  // get an audit of their site, not an error about the address they pasted.
  if (first.status === 404 && new URL(first.finalUrl).pathname !== '/') {
    try {
      const root = await safeFetch(new URL(first.finalUrl).origin, {
        timeoutMs: config.perRequestTimeoutMs,
        maxBytes: 2_500_000,
        wantCert: true,
      });
      if (root.status >= 200 && root.status < 300) {
        first = root;
        emit({ type: 'detail', message: 'That page no longer exists, so we audited the site itself' });
      }
    } catch {
      /* fall through to the checks below */
    }
  }

  const origin = new URL(first.finalUrl).origin;

  /* -------------------- 2. Squarespace detection -------------------- */
  emit({ type: 'stage', stage: 'detect', label: 'Detecting the platform', pct: 10 });

  const [robots, configProbe] = await Promise.all([
    fetchRobots(origin),
    safeFetch(`${origin}/config`, { timeoutMs: 6000, noFollow: true, maxBytes: 4000 }).catch(() => null),
  ]);

  const squarespace = detectSquarespace({
    html: first.body,
    headers: first.headers,
    status: first.status,
    robots,
    configStatus: configProbe?.status,
    configLocation: configProbe?.headers['location'],
  });

  if (!squarespace.isSquarespace && !config.allowNonSquarespace) {
    throw new AuditError(
      `${prettyHost(first.finalUrl)} does not appear to be a Squarespace website.`,
      'NOT_SQUARESPACE',
      'This tool is built specifically for Squarespace, the checks, the fixes and the scoring all assume the Squarespace platform. Running it against another platform would produce advice you cannot act on.'
    );
  }
  if (squarespace.siteStatus === 'private') {
    throw new AuditError(
      `${prettyHost(first.finalUrl)} is a Squarespace site, but it is password protected.`,
      'SITE_PRIVATE',
      'We can confirm the platform but not audit the content. Remove the site-wide password under Settings → Site Availability, then run the audit again.'
    );
  }
  if (squarespace.siteStatus === 'missing') {
    throw new AuditError(
      `There is no Squarespace site at ${prettyHost(first.finalUrl)}.`,
      'SITE_MISSING',
      'Squarespace is answering for this address but no site is published on it. Check the spelling, and if this is your own domain, confirm it is connected under Settings, then Domains.'
    );
  }
  if (squarespace.siteStatus === 'expired') {
    throw new AuditError(
      `${prettyHost(first.finalUrl)} is a Squarespace site whose subscription has expired.`,
      'SITE_EXPIRED',
      'Squarespace is serving its "Website Expired" page to every visitor and every search engine. Renewing the subscription restores the site.'
    );
  }

  if (first.status >= 400) {
    throw new AuditError(
      `${prettyHost(first.finalUrl)} returned HTTP ${first.status} instead of a page.`,
      'ENTRY_ERROR',
      'We can see this is Squarespace, but the address you gave us does not return a working page, so there is nothing to audit. Try the homepage address on its own.'
    );
  }

  emit({
    type: 'detail',
    message: `Squarespace ${squarespace.version} confirmed (${squarespace.confidence}% confidence)`,
  });

  /* -------------------- 3. sitemap + site-level probes -------------------- */
  emit({ type: 'stage', stage: 'discover', label: 'Reading robots.txt and sitemap', pct: 20 });
  const [sitemap, probes] = await Promise.all([
    fetchSitemap(origin, robots),
    probeSiteLevel(origin, Math.min(deadline, Date.now() + 15_000)),
  ]);
  if (sitemap.found) {
    emit({ type: 'detail', message: `Sitemap found, ${sitemap.totalUrls} pages listed` });
  }

  /* -------------------- 4. crawl -------------------- */
  emit({ type: 'stage', stage: 'crawl', label: 'Crawling your pages', pct: 30 });
  const crawlDeadline = Math.min(deadline - 16_000, Date.now() + 28_000);
  const crawlResult = await crawl(first.finalUrl, robots, sitemap, {
    maxPages: config.maxPages,
    concurrency: config.concurrency,
    perRequestTimeoutMs: config.perRequestTimeoutMs,
    deadline: crawlDeadline,
    onPage: (url, i, total) => {
      emit({ type: 'detail', message: `Analysed ${pathOf(url)}` });
      emit({
        type: 'stage',
        stage: 'crawl',
        label: 'Crawling your pages',
        pct: 30 + Math.round((i / total) * 25),
      });
    },
  });

  // Make sure the homepage response we already have is used rather than re-fetched.
  const homepageData: PageData = {
    url: canonicalise(first.finalUrl) || first.finalUrl,
    finalUrl: first.finalUrl,
    status: first.status,
    ok: first.status >= 200 && first.status < 300,
    depth: 0,
    redirectChain: first.redirectChain,
    headers: first.headers,
    html: first.body,
    bytes: first.bytes,
    ttfbMs: first.ttfbMs,
    contentType: first.contentType,
  };
  // Several requested URLs can land on the same final page: a slug that
  // redirects home, a trailing-slash variant, an old address with a URL
  // mapping. Counting each one as a page inflates the coverage claim ("we read
  // 9 pages" when three were the homepage) and skews every per-page ratio the
  // checks calculate, so collapse on the address actually served.
  const pagesRaw: PageData[] = [];
  const seenFinal = new Set<string>();
  for (const p of [
    homepageData,
    ...crawlResult.pages.filter((p) => p.depth !== 0 || p.finalUrl !== first.finalUrl),
  ]) {
    const key = canonicalise(p.finalUrl) || p.finalUrl;
    if (seenFinal.has(key)) continue;
    seenFinal.add(key);
    pagesRaw.push(p);
  }

  /* -------------------- 5. extract -------------------- */
  emit({ type: 'stage', stage: 'extract', label: 'Extracting page data', pct: 58 });
  const allFacts: PageFacts[] = [];
  for (const p of pagesRaw) {
    try {
      allFacts.push(extractFacts(p));
    } catch {
      /* a page that cannot be parsed simply does not contribute facts */
    }
  }
  const htmlPages = allFacts.filter((p) => p.status >= 200 && p.status < 300 && p.wordCount + p.links.length > 0);
  const failedPages = allFacts.filter((p) => p.status === 0 || p.status >= 400);
  const homepage = htmlPages.find((p) => p.depth === 0) || htmlPages[0] || allFacts[0];

  // Zero readable pages must be a hard stop, never a report. Running the checks
  // against an empty page set produces confident findings ("nobody can contact
  // you") drawn from no evidence at all, which is the single most damaging
  // thing this tool could do.
  if (!homepage || htmlPages.length === 0) {
    throw new AuditError(
      'We reached the site but could not read any page content.',
      'NO_CONTENT',
      'The server responded, but the pages contained no readable text or links. This usually means the content is drawn entirely by JavaScript after load, or something is serving a holding page. Search and AI crawlers read pages the same way we do, so this is worth investigating.'
    );
  }

  /* -------------------- 6. asset + bot probes -------------------- */
  emit({ type: 'stage', stage: 'assets', label: 'Measuring images and scripts', pct: 66 });

  const imageUrls = Array.from(
    new Set(
      htmlPages
        .flatMap((p) => p.images.map((i) => i.abs))
        .filter((u): u is string => !!u && !u.startsWith('data:'))
    )
  ).slice(0, config.maxImageProbes);

  const assetUrls = Array.from(
    new Set([
      ...htmlPages.flatMap((p) => p.stylesheets.map((s) => s.href)),
      ...htmlPages.flatMap((p) => p.scripts.map((s) => s.src).filter((s): s is string => !!s)),
    ])
  ).slice(0, config.maxAssetProbes);

  const probeBudget = Math.min(deadline - 9_000, Date.now() + 14_000);
  const crawledUrlSet = new Set(pagesRaw.map((p) => (canonicalise(p.finalUrl) || p.finalUrl).replace(/\/$/, '')));
  const [images, assets, aiBotProbe, brokenLinks, sitemapSample] = await Promise.all([
    Date.now() < probeBudget
      ? pool(imageUrls, 5, (u) => probeAsset(u, 6000))
      : Promise.resolve([] as AssetProbe[]),
    Date.now() < probeBudget
      ? pool(assetUrls, 4, (u) => probeAsset(u, 6000))
      : Promise.resolve([] as AssetProbe[]),
    pool(AI_BOT_AGENTS, 2, async (b) => {
      try {
        const r = await safeFetch(origin, {
          timeoutMs: 8000,
          maxBytes: 2000,
          headers: { 'user-agent': b.ua },
          discardBody: true,
        });
        return { agent: b.agent, status: r.status, blocked: r.status === 403 || r.status === 429 };
      } catch {
        return { agent: b.agent, status: 0, blocked: false };
      }
    }),
    checkInternalLinks(htmlPages, Math.min(deadline - 8_000, Date.now() + 10_000)),
    sampleSitemapHealth(
      sitemap.urls.map((u) => u.loc),
      crawledUrlSet,
      Math.min(deadline - 6_000, Date.now() + 9_000)
    ),
  ]);

  /* -------------------- 7. run checks -------------------- */
  emit({ type: 'stage', stage: 'checks', label: 'Running the audit checks', pct: 76 });

  const ctx: AuditContext = {
    origin,
    startUrl: input,
    homepage,
    homepageHtml: first.body,
    pages: allFacts,
    htmlPages,
    failedPages,
    robots,
    sitemap,
    squarespace,
    probes: probes as any,
    images: (images || []).filter(Boolean) as AssetProbe[],
    assets: (assets || []).filter(Boolean) as AssetProbe[],
    cert: first.cert,
    aiBotProbe: (aiBotProbe || []).filter(Boolean) as any,
    internalLinkGraph: crawlResult.internalLinks,
    brokenLinks,
    sitemapSample,
    budgetHit: crawlResult.budgetHit,
    discovered: crawlResult.discovered,
  };

  /* ---- question coverage: what a customer would ask, and whether you answer ---- */
  emit({ type: 'stage', stage: 'questions', label: 'Working out what your customers ask', pct: 80 });
  const profile = buildProfile(ctx);
  const questions = templateQuestions(profile);
  ctx.aeo = analyseQuestions(profile, questions, htmlPages);
  if (ctx.aeo.ran) {
    emit({
      type: 'detail',
      message: `Checked ${questions.length} customer questions against your pages`,
    });
  }

  const results: CheckResult[] = [
    ...safely(() => techChecks(ctx)),
    ...safely(() => onpageChecks(ctx)),
    ...safely(() => aeoChecks(ctx)),
    ...safely(() => perfChecks(ctx)),
    ...safely(() => convChecks(ctx)),
    ...safely(() => sqsChecks(ctx)),
    ...safely(() => schemaChecks(ctx)),
    ...safely(() => socialChecks(ctx)),
    ...safely(() => a11yChecks(ctx)),
    ...safely(() => mobileChecks(ctx)),
    ...safely(() => secChecks(ctx)),
  ];

  /* -------------------- 8. score -------------------- */
  emit({ type: 'stage', stage: 'score', label: 'Calculating your score', pct: 86 });

  // Sanitised once, reused by both the goal-aware ranking below and the
  // field persisted on the report — see sanitiseBusinessContext above.
  const sanitisedBusinessContext = sanitiseBusinessContext(businessContext);

  // Structured "what is this website" summary, built from data every step
  // above already produced. See understanding.ts for why this exists.
  const understanding = buildUnderstanding(ctx, profile, results);
  // Findings, grouped and prioritised into a short "what actually matters"
  // list. See opportunity.ts. Reads `results` (not just `findings` below)
  // because it needs each check's `unscored` flag to grade confidence.
  const opportunities = buildOpportunities(results, understanding);
  // Goal-aware re-ranking layered strictly on top of the deterministic
  // opportunities above. With no businessContext.goal this is byte-identical
  // ranking to `opportunities` — see opportunity.ts `applyGoalAwareness` for
  // why goal relevance can never move an opportunity out of its
  // severity-determined priority tier.
  const goalAwareOpportunities = applyGoalAwareness(opportunities, sanitisedBusinessContext, understanding);

  const score = scoreAudit(results);
  const findings = prioritise(results.flatMap((r) => r.findings));
  const strengths = results
    .filter((r) => r.strength && r.affected === 0)
    .map((r) => r.strength!)
    .slice(0, 8);
  // Diagnostic re-framing of the same opportunities — see doctor.ts.
  const doctor = buildWebsiteDoctor(opportunities, findings, goalAwareOpportunities);

  const pageSummaries = htmlPages.map((p) => {
    const pageFindings = findings.filter((f) => f.affectedUrls.includes(p.url));
    return {
      url: p.url,
      title: p.title || pathOf(p.url),
      status: p.status,
      issues: pageFindings.length,
      criticalIssues: pageFindings.filter((f) => f.severity === 'critical').length,
      words: p.wordCount,
    };
  });

  const report: AuditReport = {
    id: '',
    inputUrl: rawUrl,
    finalUrl: first.finalUrl,
    host: prettyHost(first.finalUrl),
    siteName:
      String(squarespace.context?.website?.siteTitle || '') ||
      homepage.og['og:site_name'] ||
      prettyHost(first.finalUrl),
    createdAt: new Date().toISOString(),
    squarespace,
    score,
    findings,
    strengths,
    quickWins: quickWins(findings),
    coverage: {
      pagesCrawled: htmlPages.length,
      pagesDiscovered: Math.max(crawlResult.discovered, htmlPages.length),
      checksRun: results.length,
      checksApplicable: results.filter((r) => r.applicable > 0 && !r.unscored).length,
      sitemapUrls: sitemap.totalUrls,
      imagesProbed: ctx.images.length,
      assetsProbed: ctx.assets.length,
      durationMs: Date.now() - started,
      aiUsed: false,
    },
    pageSummaries,
    faq: ctx.aeo,
    understanding,
    opportunities,
    goalAwareOpportunities,
    doctor,
    businessContext: sanitisedBusinessContext,
    opportunity: classifyOpportunity(findings, score.overall, squarespace),
  };

  // Interpretation is part of the deterministic result, not an AI add-on. The
  // report is complete and readable at this point whether or not a model is
  // ever called.
  applyNarrative(report);
  buildVerdict(report);

  return report;
}

function safely(fn: () => CheckResult[]): CheckResult[] {
  try {
    return fn();
  } catch (e) {
    console.error('[audit] check module failed', e);
    return [];
  }
}

/**
 * HEAD-probes a sample of sitemap URLs the crawl never visited.
 *
 * TECH-055/TECH-059 only ever see errors among the (at most 12) pages we
 * crawled. A site can have a rotten pocket of dead pages entirely outside
 * that sample — a large blog whose first 40 posts crawled fine but whose
 * archive from three redesigns ago 404s, for example — and the existing
 * checks are structurally blind to it (AUDIT-OF-THE-AUDIT.md, Step 2 and
 * Step 7, P1). This reuses the same bounded HEAD-probe mechanism
 * `checkInternalLinks` already uses for broken internal links, just pointed
 * at the sitemap instead of the link graph, so it costs nothing architecturally
 * new — just a second, cheap pass.
 */
async function sampleSitemapHealth(
  sitemapUrls: string[],
  crawledUrls: Set<string>,
  deadline: number,
  sampleSize = 15
): Promise<{ checked: number; broken: Array<{ url: string; status: number }> }> {
  const candidates = sitemapUrls
    .filter((u) => !crawledUrls.has(u.replace(/\/$/, '')))
    .filter((u, i, arr) => arr.indexOf(u) === i);
  if (!candidates.length || Date.now() > deadline) return { checked: 0, broken: [] };

  // Evenly spaced sample across the sitemap rather than just the first N, so
  // a broken pocket concentrated later in a large sitemap isn't missed.
  const step = Math.max(1, Math.floor(candidates.length / sampleSize));
  const sample: string[] = [];
  for (let i = 0; i < candidates.length && sample.length < sampleSize; i += step) {
    sample.push(candidates[i]);
  }

  const results = await pool(sample, 5, async (u) => {
    if (Date.now() > deadline) return null;
    const probe = await probeAsset(u, 5000);
    return { url: u, status: probe.status };
  });
  const checked = results.filter(Boolean).length;
  const broken = (results.filter(Boolean) as Array<{ url: string; status: number }>).filter(
    (r) => r.status >= 400 || r.status === 0
  );
  return { checked, broken };
}

/** HEAD-probes a sample of internal link targets we did not already crawl. */
async function checkInternalLinks(
  pages: PageFacts[],
  deadline: number
): Promise<Array<{ from: string; to: string; status: number }>> {
  const crawled = new Set(pages.map((p) => p.url.replace(/\/$/, '')));
  const candidates: Array<{ from: string; to: string }> = [];
  const seen = new Set<string>();
  for (const p of pages) {
    for (const l of p.internalLinks) {
      const key = l.replace(/\/$/, '');
      if (crawled.has(key) || seen.has(key)) continue;
      seen.add(key);
      candidates.push({ from: p.url, to: l });
      if (candidates.length >= 25) break;
    }
    if (candidates.length >= 25) break;
  }
  if (!candidates.length || Date.now() > deadline) return [];

  const results = await pool(candidates, 5, async (c) => {
    if (Date.now() > deadline) return null;
    const probe = await probeAsset(c.to, 5000);
    if (probe.status >= 400 || probe.status === 0) {
      return { from: c.from, to: c.to, status: probe.status };
    }
    return null;
  });
  return results.filter(Boolean) as Array<{ from: string; to: string; status: number }>;
}

/**
 * Classifies the commercial opportunity from the audit itself.
 * This is derived entirely from technical findings, no personal data, no
 * behavioural tracking, no inference about the individual visitor.
 */
function classifyOpportunity(
  findings: Finding[],
  overall: number,
  sqs: AuditReport['squarespace']
): AuditReport['opportunity'] {
  const signals: string[] = [];
  const services = new Set<string>();

  const critical = findings.filter((f) => f.severity === 'critical').length;
  const high = findings.filter((f) => f.severity === 'high').length;

  if (critical > 0) signals.push(count(critical, 'critical issue'));
  if (overall < 55) signals.push(`Overall score ${overall}`);

  const has = (prefix: string) => findings.some((f) => f.id.startsWith(prefix));
  if (has('CONV-')) {
    services.add('Conversion optimisation');
    signals.push('Conversion path gaps');
  }
  if (has('SCHEMA-030') || has('AEO-')) {
    services.add('SEO & AI search visibility');
    signals.push('Weak search and AI visibility');
  }
  if (findings.some((f) => f.id === 'SQS-001')) {
    services.add('Squarespace 7.0 → 7.1 migration');
    signals.push('Legacy platform version');
  }
  if (findings.some((f) => f.id === 'ONPAGE-030' || f.id === 'ONPAGE-033')) {
    services.add('Website redesign & copywriting');
    signals.push('Thin or placeholder content');
  }
  if (findings.some((f) => f.category === 'perf' && f.severity !== 'low')) {
    services.add('Performance optimisation');
  }
  if (findings.some((f) => f.id === 'SQS-004')) {
    services.add('Domain & brand setup');
  }
  if (sqs.features.commerce) services.add('Commerce optimisation');

  const tier: 'high' | 'medium' | 'low' =
    critical >= 1 || overall < 50 ? 'high' : high >= 3 || overall < 70 ? 'medium' : 'low';

  return { tier, signals: signals.slice(0, 6), services: Array.from(services).slice(0, 5) };
}

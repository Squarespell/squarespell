/**
 * Growth Intelligence.
 *
 * Every engine before this one answers a narrow question: what's broken
 * (findings), what does this business do (understanding), what should get
 * fixed first (opportunity/doctor), how did it change (diff), how does it
 * compare (compare). This module answers none of those on its own. It reads
 * what all of them already produced and combines it into the handful of
 * things a business owner actually wants to know: what's working, what's
 * missing, what a competitor is doing differently, and what to do about it
 * first.
 *
 * Three rules carried over from every engine before it:
 *
 *  1. No new facts. Everything here is `report.opportunities`,
 *     `report.doctor`, `report.understanding`, `report.faq` and
 *     `report.comparison` read differently, never a new check, a new crawl,
 *     or a new AI call.
 *  2. No fabricated numbers. There is no `growthScore`: a single number that
 *     blends "your FAQ coverage" with "your competitor's trust signals"
 *     would be exactly the kind of confident-looking nonsense this whole
 *     project exists to avoid. See compare.ts's refusal to invent a
 *     "Competitor Score" for the same reasoning, one phase earlier.
 *  3. Goal relevance ranks, it never promotes. A `medium` action can never
 *     outrank a `critical` one because the visitor said they want more
 *     bookings. See `PRIORITY_BANDS` in opportunity.ts for the mechanism
 *     this mirrors.
 */

import type {
  AuditReport,
  CategoryId,
  Evidence,
  UserGoal,
} from './types';
import { CATEGORIES } from './types';
import type { Opportunity, OpportunityCategory, OpportunityOwner, EffortLevel, PriorityLevel, GoalAwareOpportunity } from './opportunity';
import type { QuestionGap } from './aeo/gaps';
import type { CompetitiveDimension, CompetitiveVerdict } from './compare';

/* ------------------------------------------------------------------ *
 * Shape
 * ------------------------------------------------------------------ */

export type GrowthAreaKey =
  | 'content'
  | 'conversion'
  | 'trust'
  | 'customer-questions'
  | 'offer'
  | 'visibility'
  | 'competitive';

const GROWTH_AREA_LABELS: Record<GrowthAreaKey, string> = {
  content: 'Content coverage',
  conversion: 'Conversion path',
  trust: 'Trust signals',
  'customer-questions': 'Customer questions',
  offer: 'Offer clarity',
  visibility: 'Search and AI visibility',
  competitive: 'Competitive position',
};

export interface GrowthArea {
  key: GrowthAreaKey;
  label: string;
  status: 'strong' | 'developing' | 'needs-attention';
  note: string;
}

/** One evidence-based observation, the common shape behind every *Opportunities list below. */
export interface GrowthObservation {
  title: string;
  detail: string;
  area: GrowthAreaKey;
  priority: PriorityLevel;
  evidence: Evidence[];
}

type ClarityLevel = 'clear' | 'partial' | 'unclear';

/** Part 7 of the brief: whether the offer is clearly communicated, never whether it's a good offer. */
export interface OfferIntelligence {
  offerClarity: ClarityLevel;
  audienceClarity: ClarityLevel;
  differentiationClarity: ClarityLevel;
  nextStepClarity: ClarityLevel;
}

type StepStatus = 'strong' | 'unclear' | 'weak';

export interface ConversionStep {
  step: 'landing' | 'understand-offer' | 'build-trust' | 'get-answers' | 'take-action';
  label: string;
  status: StepStatus;
  note: string;
}

/** Part 9/10 of the brief: models the path a visitor takes, not just individual conversion findings. */
export interface ConversionPathIntelligence {
  pathType: 'booking' | 'lead' | 'sales' | 'unclear';
  confidence: 'high' | 'medium' | 'low';
  steps: ConversionStep[];
  weakestStep?: ConversionStep;
}

export interface QuestionIntelligence {
  question: string;
  status: 'answered' | 'partial' | 'missing';
  pageUrl?: string;
  /** 1-3, `QuestionGap.weight` unchanged: how commercially important this question is. */
  importance: number;
  conversionRelevant: boolean;
  /**
   * From the single `faq-coverage` dimension in `comparison.intelligence`, if
   * one exists: a site-wide comparison of how many questions each side
   * answers, not a per-question comparison (the crawl has no way to know
   * whether a competitor answers *this specific* question). Applied
   * identically to every question listed here for that reason.
   */
  competitiveCoverage?: 'ahead' | 'behind' | 'even';
}

export interface VisibilityIntelligence {
  searchStrengths: string[];
  aiStrengths: string[];
  gaps: string[];
}

export type GrowthActionType = 'fix' | 'create' | 'improve' | 'protect' | 'exploit';

export interface GrowthAction {
  title: string;
  why: string;
  evidence: Evidence[];
  area: GrowthAreaKey;
  type: GrowthActionType;
  effort: EffortLevel;
  priority: PriorityLevel;
  owner: OpportunityOwner;
  relatedFindingIds: string[];
  relatedOpportunityId?: string;
  squarespellService?: string;
  /** Whether `businessContext.goal` makes this action more relevant right now. Ranking only, see module comment. */
  goalRelevant: boolean;
}

export interface GrowthIntelligence {
  growthSummary: string;
  growthAreas: GrowthArea[];
  contentOpportunities: GrowthObservation[];
  conversionOpportunities: GrowthObservation[];
  trustOpportunities: GrowthObservation[];
  customerQuestionOpportunities: QuestionIntelligence[];
  offerOpportunities: GrowthObservation[];
  visibilityOpportunities: GrowthObservation[];
  competitiveOpportunities: GrowthObservation[];
  offer: OfferIntelligence;
  conversionPath: ConversionPathIntelligence;
  visibility: VisibilityIntelligence;
  /** FIX / CREATE / IMPROVE / PROTECT / EXPLOIT, ranked, capped at 7 (Part 16 of the brief). */
  recommendedActions: GrowthAction[];
  /** `recommendedActions.slice(0, 3)`, kept as its own field so the report/PDF can render "what should I do first" without re-deriving it. */
  startHere: GrowthAction[];
}

/* ------------------------------------------------------------------ *
 * Shared tables
 * ------------------------------------------------------------------ */

/**
 * Where each existing `OpportunityCategory` (opportunity.ts) lands in this
 * module's 7 growth areas. Security folds into `trust`, matching
 * opportunity.ts's own reasoning for that category ("these affect visitor
 * trust... not just a technical score"), never accessibility: Part 8 of the
 * brief defines trust as testimonials/credentials/proof, and an a11y finding
 * is a machine-checkable implementation detail, not that kind of signal, so
 * it folds into `visibility` alongside performance, technical,
 * search-visibility and squarespace-setup instead (all of them affect what a
 * search engine or AI system can find and understand, per Part 11).
 */
const OPPORTUNITY_AREA: Record<OpportunityCategory, GrowthAreaKey> = {
  trust: 'trust',
  conversion: 'conversion',
  content: 'content',
  performance: 'visibility',
  technical: 'visibility',
  'search-visibility': 'visibility',
  'squarespace-setup': 'visibility',
  accessibility: 'visibility',
  security: 'trust',
};

/** Part 17 of the brief, same shape as `GOAL_RELEVANT_CATEGORIES`/`GOAL_RELEVANT_DIMENSIONS` one layer up. Ranks candidates only, see module comment. */
const GROWTH_GOAL_AREAS: Record<UserGoal, GrowthAreaKey[]> = {
  get_more_customers: ['conversion', 'trust', 'customer-questions'],
  get_more_leads: ['offer', 'conversion', 'trust'],
  get_more_sales: ['offer', 'conversion', 'trust'],
  get_more_bookings: ['conversion', 'trust', 'customer-questions'],
  get_more_traffic: ['visibility', 'content'],
  improve_website: ['visibility', 'content'],
  look_more_professional: ['trust', 'offer'],
  beat_competitors: ['competitive'],
  improve_ai_visibility: ['visibility', 'customer-questions'],
  improve_performance: ['visibility'],
  not_sure: [],
};

function isGoalArea(area: GrowthAreaKey, goal: UserGoal | undefined): boolean {
  return Boolean(goal && GROWTH_GOAL_AREAS[goal]?.includes(area));
}

const CONVERSION_RELEVANT_KINDS = new Set(['price', 'booking', 'process', 'policy']);

function hasFinding(report: AuditReport, id: string): boolean {
  return report.findings.some((f) => f.id === id);
}

/* ------------------------------------------------------------------ *
 * Offer intelligence (Part 7)
 * ------------------------------------------------------------------ */

function buildOfferIntelligence(report: AuditReport): OfferIntelligence {
  const u = report.understanding!;

  // WHAT is being sold: named services plus a stated business type.
  const hasServices = u.services.length > 0;
  const hasBusinessType = Boolean(u.businessType.value);
  const offerClarity: ClarityLevel = hasServices && hasBusinessType ? 'clear' : hasServices || hasBusinessType ? 'partial' : 'unclear';

  // WHO it is for: only claimed clear when the site itself states a service
  // area or specific entity type with real confidence, never from what the
  // visitor typed into the personalization panel, that's what they told us,
  // not what the site tells a visitor.
  const locationConfident = u.location.value && (u.location.confidence === 'observed' || u.location.confidence === 'high');
  const entityConfident = u.entityType.value && u.entityType.confidence !== 'inferred' && u.entityType.confidence !== 'low';
  const audienceClarity: ClarityLevel = locationConfident && entityConfident ? 'clear' : locationConfident || entityConfident ? 'partial' : 'unclear';

  // WHY it matters / WHAT makes it different: proxied by the same trust
  // signals conv.ts already checks for, since credentials and proof are
  // usually where differentiation language actually lives on a small
  // business site.
  const testimonials = !hasFinding(report, 'CONV-040');
  const credentials = !hasFinding(report, 'CONV-042');
  const differentiationClarity: ClarityLevel = testimonials && credentials ? 'clear' : testimonials || credentials ? 'partial' : 'unclear';

  // WHAT happens next: read directly off the existing CTA findings.
  const noCta = hasFinding(report, 'CONV-020');
  const weakCta = hasFinding(report, 'CONV-021') || hasFinding(report, 'CONV-022');
  const nextStepClarity: ClarityLevel = noCta ? 'unclear' : weakCta ? 'partial' : 'clear';

  return { offerClarity, audienceClarity, differentiationClarity, nextStepClarity };
}

function offerObservations(offer: OfferIntelligence): GrowthObservation[] {
  const obs: GrowthObservation[] = [];
  if (offer.offerClarity !== 'clear') {
    obs.push({
      title: 'What the business sells or does is not entirely clear',
      detail:
        offer.offerClarity === 'unclear'
          ? 'Neither a named business type nor a specific service was confidently identified from what was crawled.'
          : 'Either the business type or the specific services offered came through clearly, but not both.',
      area: 'offer',
      priority: offer.offerClarity === 'unclear' ? 'high' : 'medium',
      evidence: [],
    });
  }
  if (offer.audienceClarity === 'unclear') {
    obs.push({
      title: 'Who the business serves is not stated clearly',
      detail: 'Neither a service area nor a specific business category was confidently identified, which makes it harder for a visitor (or a search engine) to tell if this business is a fit for them.',
      area: 'offer',
      priority: 'medium',
      evidence: [],
    });
  }
  if (offer.differentiationClarity === 'unclear') {
    obs.push({
      title: 'What makes the business different is not evident',
      detail: 'No testimonials, reviews, credentials or stated guarantees were detected anywhere on the site.',
      area: 'offer',
      priority: 'medium',
      evidence: [],
    });
  }
  if (offer.nextStepClarity !== 'clear') {
    obs.push({
      title: 'What a visitor should do next is not obvious',
      detail: offer.nextStepClarity === 'unclear' ? 'No call to action was found on the homepage.' : 'A call to action exists but is either buried or weakly worded.',
      area: 'offer',
      priority: offer.nextStepClarity === 'unclear' ? 'high' : 'medium',
      evidence: [],
    });
  }
  return obs;
}

/* ------------------------------------------------------------------ *
 * Conversion path intelligence (Part 9/10)
 * ------------------------------------------------------------------ */

function buildConversionPath(report: AuditReport, offer: OfferIntelligence): ConversionPathIntelligence {
  const u = report.understanding!;
  const conv = u.primaryConversion;

  const pathType: ConversionPathIntelligence['pathType'] =
    conv.value === 'purchase' ? 'sales' : conv.value === 'booking' ? 'booking' : conv.value === 'contact-form' ? 'lead' : 'unclear';

  const confidence: ConversionPathIntelligence['confidence'] =
    conv.confidence === 'observed' || conv.confidence === 'high' ? 'high' : conv.confidence === 'medium' ? 'medium' : 'low';

  const landingWeak = hasFinding(report, 'ONPAGE-001') || hasFinding(report, 'ONPAGE-020');
  const trustWeak = hasFinding(report, 'CONV-040') && hasFinding(report, 'CONV-042');
  const trustPartial = hasFinding(report, 'CONV-040') || hasFinding(report, 'CONV-042');

  const faq = report.faq;
  const answeredRatio =
    faq?.ran && faq.answered.length + faq.partial.length + faq.missing.length > 0
      ? faq.answered.length / (faq.answered.length + faq.partial.length + faq.missing.length)
      : null;

  const noCta = hasFinding(report, 'CONV-020');
  const weakCta = hasFinding(report, 'CONV-021') || hasFinding(report, 'CONV-022');

  const steps: ConversionStep[] = [
    {
      step: 'landing',
      label: 'A visitor lands on the site',
      status: landingWeak ? 'weak' : 'strong',
      note: landingWeak ? 'The homepage is missing a title or a main heading, which is often the first thing both a visitor and a search engine read.' : 'The homepage has a title and a main heading.',
    },
    {
      step: 'understand-offer',
      label: 'They understand what is on offer',
      status: offer.offerClarity === 'clear' ? 'strong' : offer.offerClarity === 'partial' ? 'unclear' : 'weak',
      note:
        offer.offerClarity === 'clear'
          ? 'The business type and its services came through clearly from what was crawled.'
          : 'What the business does was not fully clear from what was crawled.',
    },
    {
      step: 'build-trust',
      label: 'They look for a reason to trust the business',
      status: trustWeak ? 'weak' : trustPartial ? 'unclear' : 'strong',
      note: trustWeak
        ? 'No testimonials, reviews or stated credentials were found anywhere on the site.'
        : trustPartial
          ? 'Some trust evidence is present, but not both testimonials and stated credentials.'
          : 'Testimonials and stated credentials were both found.',
    },
    {
      step: 'get-answers',
      label: 'They get answers to their questions',
      status: answeredRatio === null ? 'unclear' : answeredRatio >= 0.6 ? 'strong' : answeredRatio >= 0.3 ? 'unclear' : 'weak',
      note:
        answeredRatio === null
          ? 'There was not enough evidence to judge how well customer questions are answered.'
          : `${faq!.answered.length} of ${faq!.answered.length + faq!.partial.length + faq!.missing.length} likely customer questions are directly answered on the site.`,
    },
    {
      step: 'take-action',
      label: 'They take the next step',
      status: noCta ? 'weak' : weakCta ? 'unclear' : 'strong',
      note: noCta ? 'No call to action was found on the homepage.' : weakCta ? 'A call to action exists but is buried or weakly worded.' : 'A clear call to action is present near the top of the homepage.',
    },
  ];

  const weakestStep = steps.find((s) => s.status === 'weak') ?? steps.find((s) => s.status === 'unclear');

  return { pathType, confidence, steps, weakestStep };
}

/* ------------------------------------------------------------------ *
 * Visibility intelligence (Part 11/12)
 * ------------------------------------------------------------------ */

function buildVisibilityIntelligence(report: AuditReport): VisibilityIntelligence {
  const categories = report.score.categories;
  const scoreOf = (id: CategoryId) => categories.find((c) => c.id === id)?.score;
  const u = report.understanding;
  const faq = report.faq;

  const searchStrengths: string[] = [];
  const aiStrengths: string[] = [];
  const gaps: string[] = [];

  for (const id of ['tech', 'onpage', 'schema'] as CategoryId[]) {
    const score = scoreOf(id);
    if (score === undefined) continue;
    if (score >= 85) searchStrengths.push(`${CATEGORIES[id].label} scores ${score}/100, a strength for search visibility.`);
    else if (score < 70) gaps.push(`${CATEGORIES[id].label} scores ${score}/100, which limits how well the site can be found and understood.`);
  }

  const aeoScore = scoreOf('aeo');
  if (aeoScore !== undefined) {
    if (aeoScore >= 85) aiStrengths.push(`AI search readiness scores ${aeoScore}/100.`);
    else if (aeoScore < 70) gaps.push(`AI search readiness scores ${aeoScore}/100, which limits how well AI systems can describe the site.`);
  }

  if (u?.entityType.value && (u.entityType.confidence === 'observed' || u.entityType.confidence === 'high')) {
    aiStrengths.push(`The business type is stated in a way AI systems can read directly (${u.entityType.value}).`);
  } else if (u && !u.entityType.value) {
    gaps.push('The site does not clearly state what type of business it is in a machine-readable way.');
  }

  if (faq?.ran) {
    if (faq.answered.length > 0) {
      aiStrengths.push(`${faq.answered.length} likely customer question${faq.answered.length === 1 ? ' is' : 's are'} answered directly on the site, which AI systems can cite.`);
    }
    if (faq.missing.length > 0) {
      gaps.push(`${faq.missing.length} likely customer question${faq.missing.length === 1 ? ' is' : 's are'} not answered anywhere on the site.`);
    }
  }

  return {
    searchStrengths: searchStrengths.slice(0, 4),
    aiStrengths: aiStrengths.slice(0, 4),
    gaps: gaps.slice(0, 4),
  };
}

/* ------------------------------------------------------------------ *
 * Customer question intelligence (Part 6)
 * ------------------------------------------------------------------ */

function buildQuestionIntelligence(report: AuditReport): QuestionIntelligence[] {
  const faq = report.faq;
  if (!faq?.ran) return [];

  const faqCoverage = report.comparison?.intelligence?.all.find((d) => d.key === 'faq-coverage');
  const competitiveCoverage: QuestionIntelligence['competitiveCoverage'] | undefined = faqCoverage
    ? faqCoverage.verdict === 'ahead'
      ? 'ahead'
      : faqCoverage.verdict === 'behind' || faqCoverage.verdict === 'competitor_advantage'
        ? 'behind'
        : 'even'
    : undefined;

  const byImportance = (a: QuestionGap, b: QuestionGap) => b.weight - a.weight;
  const gaps = [...faq.missing].sort(byImportance).concat([...faq.partial].sort(byImportance));

  return gaps.slice(0, 5).map((g) => ({
    question: g.question,
    status: g.status,
    pageUrl: g.pageUrl,
    importance: g.weight,
    conversionRelevant: CONVERSION_RELEVANT_KINDS.has(g.kind) || g.source === 'buyer-intent' || g.source === 'commerce',
    competitiveCoverage,
  }));
}

/* ------------------------------------------------------------------ *
 * Competitive growth combination (Part 13)
 *
 * The four combinations the brief asks for already exist as the five
 * `CompetitiveVerdict` values compare.ts computes: 'ahead' is exactly
 * "competitor weakness + your strength", 'behind'/'competitor_advantage' is
 * "competitor strength + your weakness", 'open_opportunity' is "both weak",
 * 'no_clear_difference' is "both strong". This just relabels them with the
 * vocabulary Part 13 asks for and drops the ties, which are not actionable.
 * ------------------------------------------------------------------ */

function competitiveLabel(verdict: CompetitiveVerdict): string {
  switch (verdict) {
    case 'ahead':
      return 'Competitive advantage';
    case 'behind':
    case 'competitor_advantage':
      return 'High priority gap';
    case 'open_opportunity':
      return 'Market opportunity';
    case 'no_clear_difference':
      return 'No clear difference';
  }
}

function weightToPriority(weight: number): PriorityLevel {
  return weight >= 4 ? 'high' : weight === 3 ? 'medium' : 'low';
}

function competitiveObservations(dims: CompetitiveDimension[]): GrowthObservation[] {
  return dims
    .filter((d) => d.verdict !== 'no_clear_difference')
    .slice(0, 5)
    .map((d) => ({
      title: competitiveLabel(d.verdict),
      detail: d.detail,
      area: 'competitive' as const,
      priority: weightToPriority(d.weight),
      evidence: [],
    }));
}

/* ------------------------------------------------------------------ *
 * Growth areas roll-up
 * ------------------------------------------------------------------ */

function computeGrowthAreas(
  report: AuditReport,
  offer: OfferIntelligence,
  areaObservations: Record<GrowthAreaKey, GrowthObservation[]>
): GrowthArea[] {
  const areas: GrowthArea[] = [];
  const status = (needsAttention: boolean, developing: boolean): GrowthArea['status'] =>
    needsAttention ? 'needs-attention' : developing ? 'developing' : 'strong';

  areas.push({
    key: 'content',
    label: GROWTH_AREA_LABELS.content,
    status: status(areaObservations.content.some((o) => o.priority === 'critical' || o.priority === 'high'), areaObservations.content.length > 0),
    note: areaObservations.content[0]?.detail ?? 'No significant content gaps were found in what was crawled.',
  });

  areas.push({
    key: 'conversion',
    label: GROWTH_AREA_LABELS.conversion,
    status: status(areaObservations.conversion.some((o) => o.priority === 'critical' || o.priority === 'high'), areaObservations.conversion.length > 0),
    note: areaObservations.conversion[0]?.detail ?? 'No significant conversion friction was found in what was crawled.',
  });

  areas.push({
    key: 'trust',
    label: GROWTH_AREA_LABELS.trust,
    status: status(areaObservations.trust.some((o) => o.priority === 'critical' || o.priority === 'high'), areaObservations.trust.length > 0),
    note: areaObservations.trust[0]?.detail ?? 'No significant trust gaps were found in what was crawled.',
  });

  const faq = report.faq;
  const answeredRatio = faq?.ran && faq.answered.length + faq.partial.length + faq.missing.length > 0
    ? faq.answered.length / (faq.answered.length + faq.partial.length + faq.missing.length)
    : null;
  areas.push({
    key: 'customer-questions',
    label: GROWTH_AREA_LABELS['customer-questions'],
    status: answeredRatio === null ? 'developing' : answeredRatio >= 0.6 ? 'strong' : answeredRatio >= 0.3 ? 'developing' : 'needs-attention',
    note:
      answeredRatio === null
        ? 'Not enough was crawled to judge how well customer questions are answered.'
        : `${faq!.answered.length} of ${faq!.answered.length + faq!.partial.length + faq!.missing.length} likely customer questions are answered directly.`,
  });

  areas.push({
    key: 'offer',
    label: GROWTH_AREA_LABELS.offer,
    status:
      offer.offerClarity === 'clear' && offer.nextStepClarity === 'clear' && offer.differentiationClarity !== 'unclear'
        ? 'strong'
        : offer.offerClarity === 'unclear' || offer.nextStepClarity === 'unclear'
          ? 'needs-attention'
          : 'developing',
    note: areaObservations.offer[0]?.detail ?? 'The offer, audience and next step all came through clearly.',
  });

  const visScores = ['tech', 'onpage', 'schema', 'aeo']
    .map((id) => report.score.categories.find((c) => c.id === id)?.score)
    .filter((s): s is number => s !== undefined);
  const visAvg = visScores.length ? visScores.reduce((a, b) => a + b, 0) / visScores.length : null;
  areas.push({
    key: 'visibility',
    label: GROWTH_AREA_LABELS.visibility,
    status: visAvg === null ? 'developing' : visAvg >= 80 ? 'strong' : visAvg >= 60 ? 'developing' : 'needs-attention',
    note: areaObservations.visibility[0]?.detail ?? 'Technical SEO, on-page SEO, structured data and AI search readiness are all in a healthy range.',
  });

  const intel = report.comparison?.intelligence;
  areas.push({
    key: 'competitive',
    label: GROWTH_AREA_LABELS.competitive,
    status: !intel ? 'developing' : intel.gaps.length > intel.strengths.length ? 'needs-attention' : intel.strengths.length > 0 ? 'strong' : 'developing',
    note: !intel ? 'No competitor comparison has been run yet.' : (areaObservations.competitive[0]?.detail ?? 'Nothing separates you from the competitors compared by a margin worth acting on.'),
  });

  return areas;
}

/* ------------------------------------------------------------------ *
 * Growth summary (Part 18: "your website right now")
 * ------------------------------------------------------------------ */

function buildGrowthSummary(report: AuditReport, areas: GrowthArea[], actionCount: number): string {
  const u = report.understanding!;
  const businessType = u.confident && u.businessType.value ? u.businessType.value : null;
  const attention = areas.filter((a) => a.status === 'needs-attention').length;
  const strong = areas.filter((a) => a.status === 'strong').length;

  const subject = businessType ? `${report.host}, a ${businessType.toLowerCase()} website,` : `${report.host}`;
  const scoreClause = `scores ${report.score.overall}/100`;

  const balance =
    attention === 0
      ? 'with no area needing urgent attention'
      : attention === 1
        ? 'with one area needing attention'
        : `with ${attention} areas needing attention`;

  const strengthClause = strong > 0 ? `, and ${strong} area${strong === 1 ? '' : 's'} already in good shape` : '';

  const actionsClause =
    actionCount > 0
      ? ` There ${actionCount === 1 ? 'is' : 'are'} ${actionCount} evidence-based action${actionCount === 1 ? '' : 's'} below, ranked by what matters most first.`
      : '';

  return `${subject} ${scoreClause}, ${balance}${strengthClause}.${actionsClause}`;
}

/* ------------------------------------------------------------------ *
 * Recommended actions (Part 14/15/16/19)
 * ------------------------------------------------------------------ */

const TYPE_ORDER: Record<GrowthActionType, number> = { fix: 5, create: 4, improve: 3, protect: 2, exploit: 1 };
const PRIORITY_RANK: Record<PriorityLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function buildRecommendedActions(report: AuditReport, goal: UserGoal | undefined): GrowthAction[] {
  const candidates: GrowthAction[] = [];
  const doctorById = new Map((report.doctor ?? []).map((d) => [d.id, d] as const));
  const oppSource: Array<Opportunity | GoalAwareOpportunity> = (report.goalAwareOpportunities?.ranked ?? report.opportunities!.ranked).slice(0, 10);

  for (const o of oppSource) {
    if (o.priority !== 'critical' && o.priority !== 'high' && o.priority !== 'medium') continue;
    const diag = doctorById.get(o.id);
    const area = OPPORTUNITY_AREA[o.category];
    const goalRelevant = 'goalRelevanceScore' in o ? o.goalRelevanceScore >= 85 : isGoalArea(area, goal);
    candidates.push({
      title: diag?.diagnosis ?? o.title,
      why: diag?.impact ?? o.businessRelevance,
      evidence: diag?.evidence ?? o.evidence,
      area,
      type: o.priority === 'medium' ? 'improve' : 'fix',
      effort: o.effort,
      priority: o.priority,
      owner: o.owner,
      relatedFindingIds: o.findingIds,
      relatedOpportunityId: o.id,
      squarespellService: o.squarespellService,
      goalRelevant,
    });
  }

  const u = report.understanding!;
  const servicesWithoutPage = u.services.filter((s) => !s.hasOwnPage);
  if (servicesWithoutPage.length > 0) {
    const names = servicesWithoutPage.map((s) => s.name).slice(0, 4).join(', ');
    candidates.push({
      title: `Create dedicated pages for the service${servicesWithoutPage.length === 1 ? '' : 's'} that do not have one yet`,
      why: `The site names ${names}, but no dedicated page was found for ${servicesWithoutPage.length === 1 ? 'it' : 'them'}, which limits how much a visitor or a search engine can learn about ${servicesWithoutPage.length === 1 ? 'it' : 'them'} specifically.`,
      evidence: [],
      area: 'content',
      type: 'create',
      effort: servicesWithoutPage.length >= 3 ? 'high' : 'medium',
      priority: servicesWithoutPage.length >= 2 ? 'high' : 'medium',
      owner: 'seo',
      relatedFindingIds: [],
      squarespellService: 'SEO & AI search visibility',
      goalRelevant: isGoalArea('content', goal),
    });
  }

  const faq = report.faq;
  if (faq?.ran) {
    const importantGaps = [...faq.missing].filter((g) => g.weight >= 2).sort((a, b) => b.weight - a.weight);
    if (importantGaps.length > 0) {
      candidates.push({
        title: 'Create content that answers the questions customers are most likely asking',
        why: `${importantGaps.length} question${importantGaps.length === 1 ? '' : 's'} a visitor would likely ask, including "${importantGaps[0].question}", ${importantGaps.length === 1 ? 'is' : 'are'} not answered anywhere on the site.`,
        evidence: importantGaps.slice(0, 3).map((g) => ({ label: 'Unanswered question', value: g.question })),
        area: 'customer-questions',
        type: 'create',
        effort: 'medium',
        priority: importantGaps.some((g) => g.weight >= 3) ? 'high' : 'medium',
        owner: 'seo',
        relatedFindingIds: [],
        squarespellService: 'SEO & AI search visibility',
        goalRelevant: isGoalArea('customer-questions', goal),
      });
    }
  }

  const intel = report.comparison?.intelligence;
  if (intel?.strengths[0]) {
    const d = intel.strengths[0];
    candidates.push({
      title: `Protect your advantage on ${d.label.toLowerCase()}`,
      why: d.detail,
      evidence: [],
      area: 'competitive',
      type: 'protect',
      effort: 'low',
      priority: d.weight >= 4 ? 'medium' : 'low',
      owner: 'you',
      relatedFindingIds: [],
      goalRelevant: isGoalArea('competitive', goal),
    });
  }
  if (intel?.opportunities[0]) {
    const d = intel.opportunities[0];
    candidates.push({
      title: `Claim ground on ${d.label.toLowerCase()} before a competitor does`,
      why: d.detail,
      evidence: [],
      area: 'competitive',
      type: 'exploit',
      effort: 'medium',
      priority: 'medium',
      owner: 'marketer',
      relatedFindingIds: [],
      goalRelevant: isGoalArea('competitive', goal),
    });
  }

  return [...candidates].sort((a, b) => {
    const p = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (p !== 0) return p;
    const g = (b.goalRelevant ? 1 : 0) - (a.goalRelevant ? 1 : 0);
    if (g !== 0) return g;
    return TYPE_ORDER[b.type] - TYPE_ORDER[a.type];
  });
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

/**
 * Builds the growth intelligence layer from an already-complete report.
 * Pure synthesis, no crawling, no new checks, no AI call (see module
 * comment). Returns `undefined` when the report predates the Opportunity
 * Engine or Website Understanding (Part 24 of the brief: old reports must
 * keep rendering, never crash on a missing optional field).
 *
 * Safe to call twice on the same report at different points in its life:
 * once right after the audit completes (no competitor data yet), and again
 * after a comparison is run (see `saveComparison` in db.ts), so the
 * competitive angle appears without a second crawl or a schema change.
 */
export function buildGrowthIntelligence(report: AuditReport): GrowthIntelligence | undefined {
  if (!report.understanding || !report.opportunities) return undefined;

  const goal = report.businessContext?.goal;
  const oppSource: Array<Opportunity | GoalAwareOpportunity> = report.goalAwareOpportunities?.ranked ?? report.opportunities.ranked;

  const observationsForArea = (area: GrowthAreaKey, limit = 3): GrowthObservation[] =>
    oppSource
      .filter((o) => OPPORTUNITY_AREA[o.category] === area)
      .slice(0, limit)
      .map((o) => ({ title: o.title, detail: o.summary, area, priority: o.priority, evidence: o.evidence.slice(0, 3) }));

  const offer = buildOfferIntelligence(report);
  const conversionPath = buildConversionPath(report, offer);
  const visibility = buildVisibilityIntelligence(report);
  const customerQuestionOpportunities = buildQuestionIntelligence(report);

  const intel = report.comparison?.intelligence;
  const competitiveOpportunities = intel ? competitiveObservations(intel.top) : [];

  const areaObservations: Record<GrowthAreaKey, GrowthObservation[]> = {
    content: observationsForArea('content'),
    conversion: observationsForArea('conversion'),
    trust: observationsForArea('trust'),
    'customer-questions': [],
    offer: offerObservations(offer),
    visibility: observationsForArea('visibility'),
    competitive: competitiveOpportunities,
  };

  const growthAreas = computeGrowthAreas(report, offer, areaObservations);
  const recommendedActions = buildRecommendedActions(report, goal).slice(0, 7);
  const growthSummary = buildGrowthSummary(report, growthAreas, recommendedActions.length);

  return {
    growthSummary,
    growthAreas,
    contentOpportunities: areaObservations.content,
    conversionOpportunities: areaObservations.conversion,
    trustOpportunities: areaObservations.trust,
    customerQuestionOpportunities,
    offerOpportunities: areaObservations.offer,
    visibilityOpportunities: areaObservations.visibility,
    competitiveOpportunities,
    offer,
    conversionPath,
    visibility,
    recommendedActions,
    startHere: recommendedActions.slice(0, 3),
  };
}

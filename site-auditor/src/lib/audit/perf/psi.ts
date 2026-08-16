/**
 * Real performance data from Google, rather than our own proxies.
 *
 * Two kinds of number arrive from one call to the PageSpeed Insights API:
 *
 *   field  What real Chrome users actually experienced on this site over the
 *          last 28 days, from the Chrome UX Report. This is the data Google
 *          uses to assess Core Web Vitals, so it is the only performance
 *          number that directly affects ranking. It only exists for sites with
 *          enough traffic, and its absence is itself worth reporting plainly
 *          rather than hiding.
 *   lab    A single Lighthouse run from Google's own infrastructure. Always
 *          available, useful for diagnosis, and explicitly not what Google
 *          ranks on. We label it as such, because presenting a lab score as a
 *          ranking factor is the most common lie in SEO tooling.
 *
 * This runs outside the main audit. Lighthouse takes ten to thirty seconds,
 * which would consume the whole crawl budget, so the report renders first and
 * this fills in behind it. Every failure mode returns a state the UI can show
 * honestly instead of an error.
 */

import { safeFetch } from '../safeFetch';

export type CwvMetric = 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';

export interface FieldMetric {
  metric: CwvMetric;
  /** The 75th percentile, which is the threshold Google assesses against. */
  p75: number;
  /** Formatted for a human, e.g. "2.4 s" or "0.08". */
  display: string;
  category: 'good' | 'needs-improvement' | 'poor';
  /** Share of visits in each bucket, as percentages. */
  distribution: [number, number, number];
  /** True when this is a Core Web Vital rather than a supporting metric. */
  core: boolean;
}

export interface PsiResult {
  status: 'ok' | 'no-field-data' | 'unavailable';
  fetchedAt: string;
  strategy: 'mobile' | 'desktop';
  /** Real-user data, empty when the site has too little traffic to qualify. */
  field: FieldMetric[];
  /** True when the field data describes the whole origin, not this page. */
  fieldIsOrigin: boolean;
  /** Google's overall Core Web Vitals verdict for the URL or origin. */
  fieldVerdict: 'pass' | 'fail' | null;
  /** Lighthouse performance score, 0 to 100. */
  labScore: number | null;
  labMetrics: Array<{ label: string; display: string; score: number | null }>;
  /** Lighthouse opportunities with a real time saving, largest first. */
  opportunities: Array<{ title: string; savingsMs: number; description: string }>;
  /** Present when we could not get data, phrased for the reader. */
  note?: string;
}

const THRESHOLDS: Record<CwvMetric, { good: number; poor: number; core: boolean; unit: 'ms' | 'unitless' }> = {
  LCP: { good: 2500, poor: 4000, core: true, unit: 'ms' },
  INP: { good: 200, poor: 500, core: true, unit: 'ms' },
  CLS: { good: 0.1, poor: 0.25, core: true, unit: 'unitless' },
  FCP: { good: 1800, poor: 3000, core: false, unit: 'ms' },
  TTFB: { good: 800, poor: 1800, core: false, unit: 'ms' },
};

const FIELD_KEYS: Array<[string, CwvMetric]> = [
  ['LARGEST_CONTENTFUL_PAINT_MS', 'LCP'],
  ['INTERACTION_TO_NEXT_PAINT', 'INP'],
  ['CUMULATIVE_LAYOUT_SHIFT_SCORE', 'CLS'],
  ['FIRST_CONTENTFUL_PAINT_MS', 'FCP'],
  ['EXPERIMENTAL_TIME_TO_FIRST_BYTE', 'TTFB'],
];

function categorise(metric: CwvMetric, value: number): FieldMetric['category'] {
  const t = THRESHOLDS[metric];
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}

function display(metric: CwvMetric, value: number): string {
  if (metric === 'CLS') return (value / 100).toFixed(2);
  if (value >= 1000) return `${(value / 1000).toFixed(1)} s`;
  return `${Math.round(value)} ms`;
}

/**
 * CLS arrives multiplied by 100 so it can be an integer. Undoing that at the
 * threshold rather than at display time would break the comparison, so the
 * conversion happens in exactly one place.
 */
function normalise(metric: CwvMetric, raw: number): number {
  return metric === 'CLS' ? raw / 100 : raw;
}

export async function fetchPageSpeed(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile',
  timeoutMs = 55_000
): Promise<PsiResult> {
  const base: PsiResult = {
    status: 'unavailable',
    fetchedAt: new Date().toISOString(),
    strategy,
    field: [],
    fieldIsOrigin: false,
    fieldVerdict: null,
    labScore: null,
    labMetrics: [],
    opportunities: [],
  };

  const key = process.env.PAGESPEED_API_KEY;
  const endpoint =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance` +
    (key ? `&key=${encodeURIComponent(key)}` : '');

  let payload: any;
  try {
    const res = await safeFetch(endpoint, { timeoutMs, maxBytes: 4_000_000 });
    if (res.status === 429) {
      return { ...base, note: 'Google is rate limiting these requests right now. Try again in a few minutes.' };
    }
    if (res.status !== 200) {
      return { ...base, note: `Google returned HTTP ${res.status} for this measurement.` };
    }
    payload = JSON.parse(res.body);
  } catch (e: any) {
    return {
      ...base,
      note: /timeout|abort/i.test(String(e?.message))
        ? 'Google took too long to measure the page. This usually means the page is slow to load for their crawler too.'
        : 'We could not reach Google’s measurement service.',
    };
  }

  return parsePsi(payload, strategy);
}

/**
 * Pure parsing, separated from fetching so it can be exercised against a
 * recorded response. The live API has a per-project daily quota that a shared
 * anonymous key exhausts quickly, and a parser that is only ever tested when
 * the quota happens to be free is a parser nobody has tested.
 */
export function parsePsi(payload: any, strategy: 'mobile' | 'desktop' = 'mobile'): PsiResult {
  const base: PsiResult = {
    status: 'unavailable',
    fetchedAt: new Date().toISOString(),
    strategy,
    field: [],
    fieldIsOrigin: false,
    fieldVerdict: null,
    labScore: null,
    labMetrics: [],
    opportunities: [],
  };

  /* ---------------- field data ---------------- */
  const loading = payload.loadingExperience;
  const origin = payload.originLoadingExperience;
  const source = loading?.metrics && Object.keys(loading.metrics).length ? loading : origin;
  const fieldIsOrigin = source === origin && !!origin;

  const field: FieldMetric[] = [];
  if (source?.metrics) {
    for (const [apiKey, metric] of FIELD_KEYS) {
      const m = source.metrics[apiKey];
      if (!m || typeof m.percentile !== 'number') continue;
      const value = normalise(metric, m.percentile);
      const dist = Array.isArray(m.distributions)
        ? (m.distributions.map((d: any) => Math.round((d.proportion || 0) * 100)) as number[])
        : [0, 0, 0];
      field.push({
        metric,
        p75: value,
        display: display(metric, m.percentile),
        category: categorise(metric, value),
        distribution: [dist[0] || 0, dist[1] || 0, dist[2] || 0],
        core: THRESHOLDS[metric].core,
      });
    }
  }

  const core = field.filter((f) => f.core);
  const fieldVerdict = core.length ? (core.every((f) => f.category === 'good') ? 'pass' : 'fail') : null;

  /* ---------------- lab data ---------------- */
  const lh = payload.lighthouseResult;
  const labScore =
    typeof lh?.categories?.performance?.score === 'number'
      ? Math.round(lh.categories.performance.score * 100)
      : null;

  const labMetrics: PsiResult['labMetrics'] = [];
  for (const id of [
    'largest-contentful-paint',
    'first-contentful-paint',
    'total-blocking-time',
    'cumulative-layout-shift',
    'speed-index',
  ]) {
    const a = lh?.audits?.[id];
    if (!a || !a.displayValue) continue;
    labMetrics.push({
      label: a.title || id,
      display: String(a.displayValue),
      score: typeof a.score === 'number' ? Math.round(a.score * 100) : null,
    });
  }

  const opportunities: PsiResult['opportunities'] = [];
  for (const a of Object.values(lh?.audits || {}) as any[]) {
    const savings = a?.details?.overallSavingsMs;
    if (typeof savings !== 'number' || savings < 100) continue;
    opportunities.push({
      title: String(a.title || '').slice(0, 160),
      savingsMs: Math.round(savings),
      description: String(a.description || '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // strip the doc links Google embeds
        .slice(0, 400),
    });
  }
  opportunities.sort((a, b) => b.savingsMs - a.savingsMs);

  if (!field.length && labScore === null) {
    return { ...base, note: 'Google returned no usable measurement for this address.' };
  }

  return {
    ...base,
    status: field.length ? 'ok' : 'no-field-data',
    field,
    fieldIsOrigin,
    fieldVerdict,
    labScore,
    labMetrics,
    opportunities: opportunities.slice(0, 5),
    note: field.length
      ? undefined
      : 'This site does not yet have enough Chrome traffic for Google to publish real-user data, so only the lab measurement below is available. That is normal for a small site and is not itself a problem.',
  };
}

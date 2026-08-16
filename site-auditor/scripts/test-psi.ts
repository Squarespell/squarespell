/**
 * Parser test for the PageSpeed Insights response.
 *
 * Run with `npx tsx scripts/test-psi.ts`.
 *
 * The live API has a daily quota that the shared anonymous key exhausts, so
 * the parser is verified against a recorded-shape response instead of hoping
 * the quota is free when someone happens to run it. The fixture follows the
 * documented v5 schema, including the detail that catches everyone out: CLS
 * arrives multiplied by 100 so it can be an integer.
 */

import { parsePsi } from '../src/lib/audit/perf/psi';

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.log(`  FAIL  ${label}\n        expected ${e}\n        actual   ${a}`);
  } else {
    console.log(`  ok    ${label} = ${a}`);
  }
}

const withField = {
  loadingExperience: {
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: {
        percentile: 3100,
        distributions: [
          { min: 0, max: 2500, proportion: 0.62 },
          { min: 2500, max: 4000, proportion: 0.24 },
          { min: 4000, proportion: 0.14 },
        ],
      },
      INTERACTION_TO_NEXT_PAINT: {
        percentile: 150,
        distributions: [
          { min: 0, max: 200, proportion: 0.88 },
          { min: 200, max: 500, proportion: 0.09 },
          { min: 500, proportion: 0.03 },
        ],
      },
      // 8 here means a CLS of 0.08.
      CUMULATIVE_LAYOUT_SHIFT_SCORE: {
        percentile: 8,
        distributions: [
          { min: 0, max: 10, proportion: 0.91 },
          { min: 10, max: 25, proportion: 0.06 },
          { min: 25, proportion: 0.03 },
        ],
      },
      EXPERIMENTAL_TIME_TO_FIRST_BYTE: { percentile: 950, distributions: [] },
    },
  },
  lighthouseResult: {
    categories: { performance: { score: 0.47 } },
    audits: {
      'largest-contentful-paint': { title: 'Largest Contentful Paint', displayValue: '4.2 s', score: 0.11 },
      'total-blocking-time': { title: 'Total Blocking Time', displayValue: '890 ms', score: 0.2 },
      'uses-optimized-images': {
        title: 'Efficiently encode images',
        description: 'Optimized images load faster. [Learn more](https://example.com/docs).',
        details: { overallSavingsMs: 1450 },
      },
      'render-blocking-resources': {
        title: 'Eliminate render-blocking resources',
        description: 'Resources are blocking the first paint.',
        details: { overallSavingsMs: 620 },
      },
      'noise-below-threshold': { title: 'Tiny saving', details: { overallSavingsMs: 40 } },
    },
  },
};

console.log('PSI parser, site with real-user data:');
const a = parsePsi(withField);
check('status', a.status, 'ok');
check('CLS is divided back down', a.field.find((f) => f.metric === 'CLS')?.p75, 0.08);
check('CLS display', a.field.find((f) => f.metric === 'CLS')?.display, '0.08');
check('CLS is good at 0.08', a.field.find((f) => f.metric === 'CLS')?.category, 'good');
check('LCP is poor at 3.1s', a.field.find((f) => f.metric === 'LCP')?.category, 'needs-improvement');
check('LCP display', a.field.find((f) => f.metric === 'LCP')?.display, '3.1 s');
check('INP is good', a.field.find((f) => f.metric === 'INP')?.category, 'good');
check('TTFB display', a.field.find((f) => f.metric === 'TTFB')?.display, '950 ms');
check('TTFB is not a core vital', a.field.find((f) => f.metric === 'TTFB')?.core, false);
check('one failing core vital fails the assessment', a.fieldVerdict, 'fail');
check('distribution percentages', a.field.find((f) => f.metric === 'LCP')?.distribution, [62, 24, 14]);
check('lab score', a.labScore, 47);
check('opportunities are ordered by saving', a.opportunities.map((o) => o.savingsMs), [1450, 620]);
check('doc links are stripped from descriptions', a.opportunities[0].description.includes('http'), false);
check('sub-100ms savings are dropped', a.opportunities.length, 2);
check('field is page level, not origin', a.fieldIsOrigin, false);

console.log('\nPSI parser, all core vitals good:');
const allGood = JSON.parse(JSON.stringify(withField));
allGood.loadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS.percentile = 2100;
check('verdict passes', parsePsi(allGood).fieldVerdict, 'pass');

console.log('\nPSI parser, site too small for field data:');
const originOnly = {
  loadingExperience: { metrics: {} },
  originLoadingExperience: {
    metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2000, distributions: [] } },
  },
  lighthouseResult: { categories: { performance: { score: 0.9 } }, audits: {} },
};
const b = parsePsi(originOnly);
check('falls back to origin data', b.fieldIsOrigin, true);
check('status is ok when origin data exists', b.status, 'ok');

const noField = { lighthouseResult: { categories: { performance: { score: 0.9 } }, audits: {} } };
const c = parsePsi(noField);
check('status when no field data at all', c.status, 'no-field-data');
check('lab score still present', c.labScore, 90);
check('note explains the absence', typeof c.note === 'string' && c.note.length > 40, true);

const empty = parsePsi({});
check('empty payload is unavailable', empty.status, 'unavailable');

console.log(failures === 0 ? '\nAll PSI parser checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);

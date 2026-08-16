/**
 * "How the audit works" + "What the audit measures" — moved here verbatim
 * from the old Explainers.tsx (a server component; this stays one too, so
 * the copy is still in the HTML a crawler receives). Same HOW_IT_WORKS and
 * CATEGORY_EXPLAINER data from lib/content.ts, same eleven categories in
 * the same order, same .lp/.how/.defs classes that section always used.
 */

import { HOW_IT_WORKS, CATEGORY_EXPLAINER } from '@/lib/content';
import type { CategoryId } from '@/lib/audit/types';

const CATEGORY_ORDER: CategoryId[] = [
  'tech',
  'onpage',
  'perf',
  'aeo',
  'conv',
  'sqs',
  'schema',
  'a11y',
  'sec',
  'mobile',
  'social',
];

export function CategoryExplainerSection() {
  return (
    <div className="frame">
      <section className="lp" id="method">
        <h2>How the audit works</h2>
        <div className="how">
          {HOW_IT_WORKS.map((step, i) => (
            <div className="how-row" key={step.title}>
              <span className="how-n num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp" id="categories">
        <h2>What the audit measures</h2>
        <p className="lp-lede">
          Eleven categories, weighted by how much each one costs you when it is wrong. Every check
          runs against your own pages, and anything that does not apply to your site is excluded
          from the score rather than counted as a pass.
        </p>
        <dl className="defs">
          {CATEGORY_ORDER.map((id) => (
            <div className="def" key={id}>
              <dt>{CATEGORY_EXPLAINER[id].heading}</dt>
              <dd>{CATEGORY_EXPLAINER[id].body}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

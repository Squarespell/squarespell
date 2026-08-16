/**
 * "Squarespace problems we find on most sites" — moved here verbatim from
 * the old Explainers.tsx. Same eight featured issues (COMMON_ISSUES.slice
 * (0, 8), lib/content.ts) and the same link out to the full guide at
 * /squarespace-seo-issues (untouched — that page is out of scope), same
 * .lp/.qa classes that section always used.
 */

import Link from 'next/link';
import { COMMON_ISSUES } from '@/lib/content';

const FEATURED_ISSUES = COMMON_ISSUES.slice(0, 8);

export function CommonIssuesSection() {
  return (
    <div className="frame">
      <section className="lp" id="common">
        <h2>Squarespace problems we find on most sites</h2>
        <p className="lp-lede">
          These are the faults the audit reports most often, with the setting that fixes each one.
          None of them need a developer.
        </p>
        <div className="qa">
          {FEATURED_ISSUES.map((issue) => (
            <article className="qa-item" key={issue.slug} id={issue.slug}>
              <h3>{issue.q}</h3>
              <p>{issue.a}</p>
              <p className="qa-fix">
                <span>The fix</span>
                {issue.fix}
              </p>
            </article>
          ))}
        </div>
        <p className="lp-more">
          <Link href="/squarespace-seo-issues">
            All {COMMON_ISSUES.length} common Squarespace SEO problems, with fixes
          </Link>
        </p>
      </section>
    </div>
  );
}

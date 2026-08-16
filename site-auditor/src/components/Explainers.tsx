/**
 * The written part of the landing page.
 *
 * A server component, so every word is in the HTML that a crawler or an
 * assistant receives, rather than arriving after hydration. It renders below
 * the tool and only while the tool is idle: once a report is on screen the
 * reader has what they came for and this would be noise.
 *
 * The shape is deliberate. Each block asks a question in a heading and answers
 * it in the first sentence of the paragraph under it, which is the form a
 * featured snippet quotes and an assistant can lift without rewriting.
 */

import Link from 'next/link';
import { CATEGORY_EXPLAINER, COMMON_ISSUES, HOW_IT_WORKS } from '@/lib/content';
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

/** The eight faults worth showing on the landing page. The rest are on the guide. */
const FEATURED_ISSUES = COMMON_ISSUES.slice(0, 8);

/**
 * The reference design specifies six exact FAQ questions for this section (it
 * shows no answers, since the mockup is a static specimen). The questions are
 * reproduced verbatim; the answers are drawn from the site's real FAQ content
 * where a topic matches, written fresh where it does not, since a functional
 * accordion needs real answer text.
 */
export const REFERENCE_FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Is the audit really 100% free?',
    a: 'Yes. There is no account, no card and no trial. Enter your address and the report appears in the browser, and you can have a PDF copy by email if you want one.',
  },
  {
    q: 'What’s included in the report?',
    a: 'Around a hundred checks across eleven categories: technical SEO, on-page SEO, performance, AI search readiness, conversion, Squarespace setup, structured data, accessibility, security and privacy, mobile and social sharing. Every finding carries the evidence it was based on, taken from your own pages.',
  },
  {
    q: 'How long does it take to get my report?',
    a: 'About ten seconds for most sites. We crawl up to a few dozen pages, run around a hundred checks against what we find, and build the report as the results arrive.',
  },
  {
    q: 'Can Squarespell fix the issues for me?',
    a: 'Yes, if you would rather not fix things yourself. Our team can implement the recommendations for you — see the "We Can Help You Fix It" section above, or get in touch through squarespell.com for a quote.',
  },
  {
    q: 'Will I need an account?',
    a: 'No. There is no login and nothing to create. Run the audit and view or download your report right away.',
  },
  {
    q: 'Do you work with all Squarespace versions?',
    a: 'Both 7.0 and 7.1. The report tells you which version you are on and how confident it is, and checks that only apply to one version are not held against a site built on the other.',
  },
];

export function Explainers() {
  return (
    <>
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

      <div className="rd">
        <div className="wrap">
          <section id="faq" className="faq">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-grid">
              {REFERENCE_FAQ.map((item) => (
                <details className="faq-item" key={item.q}>
                  <summary>
                    {item.q}
                    <b>+</b>
                  </summary>
                  <p style={{ marginTop: 8, fontSize: 7, lineHeight: 1.5, color: '#a6a6a6' }}>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

/** FAQPage markup for the questions on this page, and nothing that is not on it. */
export function FaqSchema({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }),
      }}
    />
  );
}

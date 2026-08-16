/**
 * The reference page for the faults the audit finds most often.
 *
 * It exists because these are the questions people type before they know a
 * tool like this exists: "why do all my Squarespace pages have the same title",
 * "do Not Linked pages show up in Google". Each answer is complete on its own,
 * names the setting that fixes it, and does not require running the audit,
 * which is also what makes it worth citing.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Masthead, Footer } from '@/components/Chrome';
import { FaqSchema } from '@/components/Explainers';
import { COMMON_ISSUES } from '@/lib/content';

const TITLE = 'Common Squarespace SEO problems, and how to fix each one';
const DESCRIPTION =
  'The Squarespace SEO faults we find on most sites: the duplicate /home page, default SEO titles, auto-generated URL slugs, Not Linked pages in search, oversized images and missing structured data, each with the exact setting that fixes it.';

export const metadata: Metadata = {
  title: `${TITLE} | Squarespell`,
  description: DESCRIPTION,
  alternates: { canonical: '/squarespace-seo-issues' },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'article' },
};

export default function IssuesPage() {
  return (
    <>
      <Masthead />
      <main>
        <div className="frame">
          <article className="doc">
            <p className="crumb">
              <Link href="/">Squarespace site auditor</Link>
            </p>
            <h1>{TITLE}</h1>
            <p className="doc-lede">
              These {COMMON_ISSUES.length} faults account for most of what our audit reports on a
              typical Squarespace site. Every one of them is something you can fix yourself from
              inside Squarespace, and none of them needs custom code. If you want to know which of
              them apply to your own site, the <Link href="/">free audit</Link> checks all of them
              and shows you the evidence.
            </p>

            {COMMON_ISSUES.map((issue, i) => (
              <section className="doc-part" id={issue.slug} key={issue.slug}>
                <h2>
                  <span className="doc-n num">{String(i + 1).padStart(2, '0')}</span>
                  {issue.title}
                </h2>
                <h3>{issue.q}</h3>
                <p>{issue.a}</p>
                <p className="qa-fix">
                  <span>The fix</span>
                  {issue.fix}
                </p>
              </section>
            ))}

            <section className="doc-part">
              <h2>Which of these apply to your site</h2>
              <p>
                Guessing is the expensive part. The audit reads your pages, checks all of the above
                along with around ninety other things, and tells you which ones are actually true of
                your site, on which pages, with the evidence it measured.
              </p>
              <p className="lp-more">
                <Link href="/">Run a free audit of your Squarespace site</Link>
              </p>
            </section>
          </article>
        </div>
      </main>
      <Footer />
      <FaqSchema items={COMMON_ISSUES.map((i) => ({ q: i.q, a: `${i.a} ${i.fix}` }))} />
    </>
  );
}

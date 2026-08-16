/**
 * Homepage FAQ — the same six reference-design questions (REFERENCE_FAQ,
 * moved here verbatim from the old Explainers.tsx) and the same FAQPage
 * JSON-LD (FaqSchema, unchanged logic), now a readable-scale <details>
 * accordion (.home-faq-item) instead of the old 7px .rd .faq-item mini
 * grid. page.tsx renders `<FaqSchema items={REFERENCE_FAQ} />` exactly as
 * it did before, just imported from this file instead of Explainers.tsx.
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

export function FaqSection() {
  return (
    <section id="faq" className="frame home-section">
      <div className="home-section-head">
        <h2>Frequently Asked Questions</h2>
        <p>Still have questions? We&rsquo;re here to help.</p>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {REFERENCE_FAQ.map((item) => (
          <details className="home-faq-item" key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
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

/**
 * FaqSchema is the one export from this file still in use: squarespace-seo-issues/page.tsx
 * renders it for its own FAQ set, and the homepage (src/app/page.tsx) now imports its own
 * copy from src/components/landing/faq-section.tsx. The written landing-page content this
 * file used to render (Explainers(), REFERENCE_FAQ) has been rebuilt in
 * src/components/landing/category-explainer-section.tsx, common-issues-section.tsx and
 * faq-section.tsx, and is no longer rendered from here.
 */

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

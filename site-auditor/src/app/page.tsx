import { Auditor } from '@/components/Auditor';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { CategoryExplainerSection } from '@/components/landing/category-explainer-section';
import { CommonIssuesSection } from '@/components/landing/common-issues-section';
import { FaqSection, FaqSchema, REFERENCE_FAQ } from '@/components/landing/faq-section';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* The prose sections are server components passed through the tool, so
            they are in the HTML a crawler receives and disappear the moment a
            report takes their place. */}
        <Auditor>
          <CategoryExplainerSection />
          <CommonIssuesSection />
          <FaqSection />
        </Auditor>
      </main>
      <Footer />
      <FaqSchema items={REFERENCE_FAQ} />
    </>
  );
}

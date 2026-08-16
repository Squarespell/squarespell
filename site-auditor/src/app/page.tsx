import { Auditor } from '@/components/Auditor';
import { Masthead, Footer } from '@/components/Chrome';
import { Explainers, FaqSchema, REFERENCE_FAQ } from '@/components/Explainers';

export default function HomePage() {
  return (
    <>
      <Masthead />
      <main>
        {/* The explainers are a server component passed through the tool, so
            they are in the HTML a crawler receives and disappear the moment a
            report takes their place. */}
        <Auditor>
          <Explainers />
        </Auditor>
      </main>
      <Footer />
      <FaqSchema items={REFERENCE_FAQ} />
    </>
  );
}

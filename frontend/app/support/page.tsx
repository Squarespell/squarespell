import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/home/MarketingShell';

export const metadata: Metadata = {
  title: 'Support | Squarespell Quiz',
  description: 'How to contact Squarespell Quiz support.',
  robots: { index: false, follow: false },
};

// The contact address is the one already published in this app's own terms and privacy pages.
const SUPPORT_EMAIL = 'info@squarespell.com';

export default function SupportPage() {
  return (
    <MarketingShell>
      <section className="section">
        <div className="shell">
          <div className="kicker">Support</div>
          <div className="section-head">
            <h2>Talk to a person.</h2>
            <p>Questions about your quizzes, leads, billing or embedding? Email us and include the email on your Squarespell Quiz account and, if it helps, a link to the quiz.</p>
          </div>
          <p>
            <a className="button teal" href={'mailto:' + SUPPORT_EMAIL + '?subject=Squarespell%20Quiz%20support'}>
              Email {SUPPORT_EMAIL} <span className="arr">↗</span>
            </a>
          </p>
          <p className="proof-note" style={{ marginTop: 20 }}>This address is for Squarespell Quiz support. Pro plans include priority email support and Business plans include email and chat priority support.</p>
        </div>
      </section>
    </MarketingShell>
  );
}

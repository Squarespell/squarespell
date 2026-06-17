export const metadata = {
  title: 'Privacy Policy | Squarespell Quiz',
  description: 'How Squarespell Quiz collects, uses, and protects data for quiz owners and their visitors.',
};

const S: 'left' = 'left';
const W = '#ffffff';
const T = '#1A1A1A';
const M = '#6B6B6B';
const B = '#E4E3E0';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: T, marginBottom: 10, letterSpacing: '-.01em' }}>{title}</h2>
      <div style={{ fontSize: 15, lineHeight: 1.7, color: M }}>{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div style={{ background: W, minHeight: '100vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px 100px', textAlign: S }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: T, letterSpacing: '-.02em', marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: M, marginBottom: 48 }}>Last updated: June 16, 2026</p>

        <Section title="Overview">
          Squarespell Quiz ("Squarespell," "we," "us") provides an AI-powered quiz funnel builder
          that Squarespace site owners ("Customers") embed on their own websites to collect leads
          from their visitors ("End Users"). This policy explains what data we collect, why, and
          how it's handled for both Customers and End Users.
        </Section>

        <Section title="What we collect">
          From Customers: account details (name, email, password hash), the Squarespace site URL
          you connect, billing information (processed by our payment provider — we do not store
          full card numbers), and the quiz content you create or generate with AI.
          <br /><br />
          From End Users (your site visitors): name, email address, and quiz answers, only when
          they voluntarily submit them through a quiz's lead-capture step. We also collect basic
          usage analytics (views, completions, drop-off) tied to the quiz, not to an individual
          beyond what's submitted.
        </Section>

        <Section title="How we use it">
          To operate the product: generating quizzes, scoring and routing leads, syncing leads to
          the integrations a Customer connects (e.g. Mailchimp, Klaviyo, Google Sheets, Zapier),
          sending account and billing notifications, and improving reliability and performance.
          We do not sell personal data, and we do not use End User data submitted through a
          Customer's quiz for our own marketing.
        </Section>

        <Section title="Data sharing">
          We share data with the subprocessors required to run the service — hosting, email
          delivery, payment processing, and any third-party integration a Customer explicitly
          connects their quiz to. We do not share data with advertisers or data brokers.
        </Section>

        <Section title="Data retention & deletion">
          Customers can export or delete leads at any time from their dashboard. Account data is
          retained while a subscription is active and deleted within 30 days of account closure,
          except where retention is required for legal or billing records.
        </Section>

        <Section title="Your rights">
          Depending on your location, you may have the right to access, correct, export, or delete
          your personal data. End Users should first contact the Customer whose quiz they
          interacted with, since that Customer controls the data collected through their quiz; if
          that's not possible, contact us directly and we'll assist.
        </Section>

        <Section title="Contact">
          Questions about this policy can be sent to{' '}
          <a href="mailto:info@squarespell.com" style={{ color: '#0f7377' }}>info@squarespell.com</a>.
        </Section>
      </div>
    </div>
  );
}

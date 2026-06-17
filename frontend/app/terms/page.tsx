export const metadata = {
  title: 'Terms of Service | Squarespell Quiz',
  description: 'The terms governing use of Squarespell Quiz.',
};

const S: 'left' = 'left';
const W = '#ffffff';
const T = '#1A1A1A';
const M = '#6B6B6B';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: T, marginBottom: 10, letterSpacing: '-.01em' }}>{title}</h2>
      <div style={{ fontSize: 15, lineHeight: 1.7, color: M }}>{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div style={{ background: W, minHeight: '100vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px 100px', textAlign: S }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: T, letterSpacing: '-.02em', marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ fontSize: 14, color: M, marginBottom: 48 }}>Last updated: June 16, 2026</p>

        <Section title="Using Squarespell Quiz">
          By creating an account or using Squarespell Quiz ("the Service"), you agree to these
          terms. You must be authorized to act on behalf of the website you connect, and you're
          responsible for the content of the quizzes you create or generate with AI.
        </Section>

        <Section title="Plans, billing & trials">
          Paid plans are billed monthly or annually as selected at checkout. The 14-day free trial
          gives full Pro-tier access with no credit card required; after it ends you may choose a
          paid plan or continue on a limited free tier. Annual plans are non-refundable but can be
          cancelled to prevent renewal. Monthly plans can be cancelled anytime and take effect
          immediately, with no further charges.
        </Section>

        <Section title="Acceptable use">
          You may not use the Service to collect leads through deceptive quizzes, to harvest data
          without disclosing it to your visitors, or in any way that violates applicable law
          (including anti-spam and data-protection law in the jurisdictions you operate in). You're
          responsible for your own compliance with consent requirements (e.g. GDPR, CAN-SPAM) when
          collecting leads through your quiz.
        </Section>

        <Section title="Your content">
          You retain ownership of the quiz content, branding, and lead data you create or collect.
          We process it only to operate the Service on your behalf and as described in our{' '}
          <a href="/privacy" style={{ color: '#0f7377' }}>Privacy Policy</a>.
        </Section>

        <Section title="Service availability">
          We aim for high availability but don't guarantee the Service will be uninterrupted or
          error-free. We may update or change features over time; we'll make reasonable efforts to
          avoid breaking changes to live, embedded quizzes.
        </Section>

        <Section title="Limitation of liability">
          The Service is provided "as is." To the extent permitted by law, Squarespell is not
          liable for indirect, incidental, or consequential damages arising from your use of the
          Service, including lost leads or revenue.
        </Section>

        <Section title="Termination">
          You can cancel your account at any time from your dashboard. We may suspend or terminate
          accounts that violate these terms or the acceptable use section above.
        </Section>

        <Section title="Contact">
          Questions about these terms can be sent to{' '}
          <a href="mailto:info@squarespell.com" style={{ color: '#0f7377' }}>info@squarespell.com</a>.
        </Section>
      </div>
    </div>
  );
}

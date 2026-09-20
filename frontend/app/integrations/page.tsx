/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell } from '@/components/marketing/home/MarketingShell';
import { ROUTES } from '@/components/marketing/home/routes';
import { TRIAL_DAYS } from '@/lib/plans';
import { CATALOG_INTEGRATIONS, UNVERIFIED_INTEGRATIONS } from '@/components/marketing/home/integrationLogos';

export const metadata: Metadata = {
  title: 'Integrations | Squarespell Quiz',
  description: 'The tools Squarespell Quiz can send quiz answers, scores and leads to.',
  robots: { index: false, follow: false },
};

export default function IntegrationsPage() {
  return (
    <MarketingShell>
      <section className="integration section">
        <div className="shell">
          <div className="kicker">Integrations</div>
          <div className="section-head">
            <h2>Send every lead somewhere useful.</h2>
            <p>Sync outcomes, scores and answers to the tools your team already uses. Integrations and webhooks are included with the Pro and Business plans.</p>
          </div>
          <h3 style={{ fontSize: 26, margin: '0 0 18px' }}>Included with Pro</h3>
          <div className="integration-logos">
            {CATALOG_INTEGRATIONS.map((i) => (
              <div className="integration-logo" key={i.name}>
                <img src={i.logo} alt={i.name + ' logo'} loading="lazy" decoding="async" />
                <span>{i.name}</span>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: 26, margin: '56px 0 18px' }}>Being verified</h3>
          <div className="integration-logos">
            {UNVERIFIED_INTEGRATIONS.map((i) => (
              <div className="integration-logo" key={i.name}>
                <img src={i.logo} alt={i.name + ' logo'} loading="lazy" decoding="async" />
                <span>{i.name}</span>
              </div>
            ))}
          </div>
          <p className="integration-note">
            The connectors above marked as being verified exist in the product code. Each one is tested end to end before it is listed as available. Logos belong to their respective owners and are used only to identify the service.
          </p>
          <p style={{ marginTop: 36 }}>
            <Link className="button teal" href={ROUTES.trial}>
              Start {TRIAL_DAYS}-day trial <span className="arr">↗</span>
            </Link>
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}

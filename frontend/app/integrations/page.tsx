/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell } from '@/components/marketing/home/MarketingShell';
import { ROUTES } from '@/components/marketing/home/routes';
import { LOGOS } from '@/components/marketing/home/logoAssets';
import { TRIAL_DAYS } from '@/lib/plans';

export const metadata: Metadata = {
  title: 'Integrations | Squarespell Quiz',
  description: 'The tools Squarespell Quiz can send quiz answers, scores and leads to, and the status of each one.',
  robots: { index: false, follow: false },
};

type Status = 'Available' | 'Requires customer configuration' | 'Planned';

// "Available" is reserved for integrations whose customer-facing flow is implemented and verified end to end.
// None has completed that verification yet, so none is listed as Available.
const INTEGRATIONS: { name: string; logo?: string; status: Status; note: string }[] = [
  { name: 'Mailchimp', logo: LOGOS.mailchimp, status: 'Requires customer configuration', note: 'Connect your Mailchimp account and choose an audience.' },
  { name: 'Klaviyo', logo: LOGOS.klaviyo, status: 'Requires customer configuration', note: 'Connect your Klaviyo account and choose a list.' },
  { name: 'ConvertKit', logo: LOGOS.kit, status: 'Requires customer configuration', note: 'Connect your ConvertKit account and choose a form or tag.' },
  { name: 'Google Sheets', logo: LOGOS.googleSheets, status: 'Requires customer configuration', note: 'Connect a Google account and pick a spreadsheet.' },
  { name: 'Zapier', logo: LOGOS.zapier, status: 'Requires customer configuration', note: 'Create a Zap in your own Zapier account.' },
  { name: 'Webhooks', logo: LOGOS.webhooks, status: 'Requires customer configuration', note: 'Paste your own endpoint URL to receive lead data.' },
  { name: 'HubSpot', logo: LOGOS.hubspot, status: 'Requires customer configuration', note: 'Reached through Zapier. No direct connector yet.' },
  { name: 'ActiveCampaign', status: 'Planned', note: 'No dedicated connector yet. Use Zapier or webhooks meanwhile.' },
  { name: 'Calendly', status: 'Planned', note: 'No dedicated connector yet. Use Zapier or webhooks meanwhile.' },
  { name: 'Acuity Scheduling', status: 'Planned', note: 'No dedicated connector yet. Use Zapier or webhooks meanwhile.' },
];

export default function IntegrationsPage() {
  return (
    <MarketingShell>
      <section className="integration section">
        <div className="shell">
          <div className="kicker">Integrations</div>
          <div className="section-head">
            <h2>Send every lead somewhere useful.</h2>
            <p>Send outcomes, scores and answers to the tools your team already uses. Integrations and webhooks are included with the Pro and Business plans.</p>
          </div>
          <div className="int-legend">
            <span><b className="int-status ok">Available</b> Works without setup on your side and has been verified end to end.</span>
            <span><b className="int-status cfg">Requires customer configuration</b> You connect your own account, key or endpoint.</span>
            <span><b className="int-status plan">Planned</b> Not built yet.</span>
          </div>
          <div className="int-list">
            {INTEGRATIONS.map((i) => (
              <div className="int-row" key={i.name}>
                <div className="int-mark">{i.logo ? <img src={i.logo} alt={i.name + ' logo'} loading="lazy" decoding="async" /> : <span aria-hidden="true">{i.name.charAt(0)}</span>}</div>
                <div className="int-body"><strong>{i.name}</strong><p>{i.note}</p></div>
                <b className={'int-status ' + (i.status === 'Available' ? 'ok' : i.status === 'Planned' ? 'plan' : 'cfg')}>{i.status}</b>
              </div>
            ))}
          </div>
          <div className="integration-note">
            <p><strong>Embedding is separate from integrations.</strong> Integrations send lead data out of a quiz. They do not place a quiz on a web page. To show a quiz on Squarespace, WordPress, Shopify, Wix, Webflow, Framer or any site that allows custom code, you paste the embed code yourself.</p>
            <p>Logos belong to their respective owners and are used only to identify the service.</p>
          </div>
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

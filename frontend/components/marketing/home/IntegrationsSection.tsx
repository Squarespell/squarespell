/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { ROUTES } from './routes';
import { LOGOS } from './logoAssets';

const TOOLS = [
  { name: 'Mailchimp', logo: LOGOS.mailchimp },
  { name: 'Klaviyo', logo: LOGOS.klaviyo },
  { name: 'ConvertKit', logo: LOGOS.kit },
  { name: 'HubSpot', logo: LOGOS.hubspot },
  { name: 'Google Sheets', logo: LOGOS.googleSheets },
  { name: 'Zapier', logo: LOGOS.zapier },
  { name: 'Webhooks', logo: LOGOS.webhooks },
];

export function IntegrationsSection() {
  return (
    <section className="integration section" id="integrations"><div className="shell integration-grid"><div className="integration-copy reveal"><div className="kicker">Send every lead somewhere useful</div><h2>Your stack, connected.</h2><p>Send outcomes, scores and answers to the tools your team already uses. Pro unlocks all integrations and webhooks.</p><Link href={ROUTES.integrations} className="button ghost">See integration details <span className="arr">↗</span></Link></div><div className="reveal"><div className="integration-logos">{TOOLS.map((t) => (
      <div className="integration-logo" key={t.name}><img src={t.logo} alt={t.name + ' logo'} loading="lazy" decoding="async" /><span>{t.name}</span></div>
    ))}</div><p className="integration-note">Some tools need setup on your side. The integrations page shows the status of each one.</p></div></div></section>
  );
}

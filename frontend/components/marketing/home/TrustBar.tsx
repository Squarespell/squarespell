/* eslint-disable @next/next/no-img-element */
import { LOGOS } from './logoAssets';

const PLATFORMS = [
  { name: 'Squarespace', logo: LOGOS.squarespace },
  { name: 'WordPress', logo: LOGOS.wordpress },
  { name: 'Shopify', logo: LOGOS.shopify },
  { name: 'Wix', logo: LOGOS.wix },
  { name: 'Webflow', logo: LOGOS.webflow },
  { name: 'Framer', logo: LOGOS.framer },
];

export function TrustBar() {
  return (
    <div className="trust-bar"><span className="trust-label">Add it to the site you already use</span><div className="logo-viewport"><div className="logo-track" aria-label="Website platforms">{[0, 1].map((copy) => PLATFORMS.map((p) => (
      <div className="platform-logo" key={copy + p.name} aria-hidden={copy === 1 ? true : undefined}><img src={p.logo} alt={copy === 0 ? p.name + ' logo' : ''} />{p.name} <small>embed</small></div>
    )))}</div></div></div>
  );
}

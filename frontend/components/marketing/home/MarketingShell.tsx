import type { CSSProperties, ReactNode } from 'react';
import './home.css';
import { Header } from './Header';
import { Footer } from './Footer';

// next/font/google was removed: it fetches font metadata from Google's
// servers at *build* time (not just runtime), which made CI builds fail
// whenever that network call was unreliable. home.css reads its font
// stacks from the --font-manrope / --font-dm-sans custom properties below,
// so this sets them to a system font stack instead of a self-hosted
// Google Font, without touching home.css itself.
const SYSTEM_SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const shellStyle: CSSProperties = {
  ['--font-manrope' as any]: SYSTEM_SANS,
  ['--font-dm-sans' as any]: SYSTEM_SANS,
};

/** Public marketing chrome: skip link, header, footer and the scoped .sqhome styles. */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="sqhome" style={shellStyle}>
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}

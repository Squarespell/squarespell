import { DM_Sans, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import './home.css';
import { Header } from './Header';
import { Footer } from './Footer';

// Self-hosted by next/font, exposed as CSS variables that home.css consumes.
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-manrope', display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-dm-sans', display: 'swap' });

/** Public marketing chrome: skip link, header, footer and the scoped .sqhome styles. */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className={`sqhome ${manrope.variable} ${dmSans.variable}`}>
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}

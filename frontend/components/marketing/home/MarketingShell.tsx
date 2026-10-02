import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import './home.css';
import { Header } from './Header';
import { Footer } from './Footer';

// Bundled with the app (npm @fontsource-variable) and self-hosted by next/font, exposed as CSS variables that home.css
// consumes. Nothing is fetched from Google Fonts.
const manrope = localFont({ src: '../../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2', weight: '200 800', variable: '--font-manrope', display: 'swap' });
const dmSans = localFont({ src: '../../../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2', weight: '100 1000', variable: '--font-dm-sans', display: 'swap' });

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

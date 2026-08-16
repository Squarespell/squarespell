/**
 * Homepage-only footer — same link structure as Chrome.tsx's <Footer>
 * (which keeps serving every other page unchanged), rebuilt at a larger,
 * more spacious scale on the product's own tokens (.home-footer*).
 */

import { MarkSquarespace } from '@/components/Icons';

const BRAND_URL = process.env.NEXT_PUBLIC_BRAND_URL || 'https://squarespell.com';

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 20, height: 20 }}>
      <path d="M12 2.5 21 7.8v8.4L12 21.5 3 16.2V7.8L12 2.5Z" stroke="currentColor" strokeWidth={2} />
      <path d="m7 12 5-3 5 3-5 3-5-3Z" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/#features', label: 'Features' },
      { href: '/#report', label: 'Sample Report' },
      { href: '/#how', label: 'How It Works' },
      { href: '/#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/#about', label: 'About Us' },
      { href: `${BRAND_URL}/squarespace-website-design`, label: 'Our Work', external: true },
      { href: `${BRAND_URL}/squarespace-blog`, label: 'Blog', external: true },
      { href: `${BRAND_URL}/contact-us`, label: 'Contact', external: true },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/squarespace-seo-issues', label: 'Squarespace SEO Guide' },
      { href: '/#features', label: 'Speed Optimization Guide' },
      { href: `${BRAND_URL}/contact-us`, label: 'Help Center', external: true },
      { href: `${BRAND_URL}/squarespace-website-design`, label: 'Case Studies', external: true },
    ],
  },
];

export function Footer() {
  return (
    <div className="home-footer">
      <div className="frame">
        <div className="home-footer-grid">
          <div className="home-footer-brand">
            <a className="home-brand" href="/">
              <BrandMark />
              SQUARESPELL
            </a>
            <p>
              Premium Squarespace plugins, templates and services to help you build, grow and
              optimize your business.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div className="home-footer-col" key={col.title}>
              <h4>{col.title}</h4>
              {col.links.map((link) =>
                link.external ? (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                ) : (
                  <a key={link.label} href={link.href}>
                    {link.label}
                  </a>
                )
              )}
            </div>
          ))}
        </div>

        <div className="home-footer-bottom">
          <span>© {new Date().getFullYear()} Squarespell. Built for Squarespace, focused on results.</span>
          <span>
            <MarkSquarespace />
            Squarespace specialists
          </span>
        </div>
      </div>
    </div>
  );
}

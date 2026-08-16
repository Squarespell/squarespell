'use client';

/**
 * Homepage-only nav — a fresh, larger-scale header (not the tiny literal-
 * port .rd header Chrome.tsx renders on every other page). Hand-written
 * CSS on the product's own tokens (.home-nav*, globals.css), no framework.
 * Chrome.tsx's <Masthead>/<Footer> are untouched and keep serving
 * /privacy, /squarespace-seo-issues, /not-found and /r/[token].
 */

import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/#features', label: 'Features' },
  { href: '/#report', label: 'Sample report' },
  { href: '/#how', label: 'How it works' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/#about', label: 'About us' },
];

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.5 21 7.8v8.4L12 21.5 3 16.2V7.8L12 2.5Z" stroke="currentColor" strokeWidth={2} />
      <path d="m7 12 5-3 5 3-5 3-5-3Z" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="home-nav">
      <div className="home-nav-inner">
        <a className="home-brand" href="/">
          <BrandMark />
          SQUARESPELL
        </a>

        <nav className="home-nav-links" aria-label="Sections">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="home-nav-actions">
          <a className="btn" href="/#audit-form">
            Audit my site
          </a>
          <button
            type="button"
            className="home-nav-toggle"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {open && (
        <nav className="home-nav-mobile" aria-label="Sections">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
          <a href="/#audit-form" onClick={() => setOpen(false)}>
            Audit my site
          </a>
        </nav>
      )}
    </div>
  );
}

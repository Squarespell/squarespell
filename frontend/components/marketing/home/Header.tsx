'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ROUTES } from './routes';

const NAV = [
  ['/#product', 'Product'],
  ['/#modes', 'Quiz modes'],
  ['/#templates', 'Templates'],
  ['/#integrations', 'Integrations'],
  ['/#pricing', 'Pricing'],
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="header">
      <div className="shell nav">
        <a className="brand" href="/" aria-label="Squarespell Quiz home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="2" fill="#fff" /><path d="M12 6v5M12 11L7 16M12 11l5 5" /><circle cx="7" cy="18" r="2" fill="#fff" /><circle cx="17" cy="18" r="2" fill="#fff" /></svg>
          </span>
          <span>
            Squarespell <small>Quiz</small>
          </span>
        </a>
        <nav className="nav-links" aria-label="Main navigation">
          {NAV.map(([href, label]) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </nav>
        <div className="nav-actions">
          <Link className="text-button" href={ROUTES.login}>Log in</Link>
          <Link className="button teal" href={ROUTES.trial}>
            Start free trial <span className="arr">↗</span>
          </Link>
          <button
            ref={menuButton}
            type="button"
            className="menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? '×' : '☰'}
          </button>
        </div>
      </div>
      <nav className="mobile-nav" id="mobile-nav" aria-label="Mobile navigation" hidden={!open}>
        {NAV.map(([href, label]) => (
          <a key={href} href={href} onClick={close}>{label}</a>
        ))}
        <Link href={ROUTES.login} onClick={close}>Log in</Link>
      </nav>
    </header>
  );
}

'use client';
/**
 * Cookie choice for the app: the same card and wording as squarespellquiz.com (SEO plan Segment 4, task 4.1). Shown
 * until the visitor chooses on either host; never on quiz-taker pages or inside an iframe (embedded quizzes).
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { initAnalytics, isAnalyticsPage, readConsent, setConsent } from '@/lib/analytics';

const PRIVACY = 'https://squarespellquiz.com/privacy/#analytics';

export default function ConsentBanner() {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);

  useEffect(function () {
    if (window.self !== window.top || !isAnalyticsPage(pathname)) { setOpen(false); return; }
    initAnalytics();
    setOpen(readConsent() === '');
  }, [pathname]);

  // "Cookie settings" (any element with data-sqs-consent-open, as on squarespellquiz.com) reopens the choice and moves
  // focus into it, so changing your mind is as easy as the first choice.
  const reopened = useRef(false);
  const firstButton = useRef<HTMLButtonElement | null>(null);
  useEffect(function () {
    function onClick(e: MouseEvent) {
      const t = e.target as Element | null;
      if (!t || typeof t.closest !== 'function' || !t.closest('[data-sqs-consent-open]')) return;
      if (window.self !== window.top || !isAnalyticsPage(pathname)) return;
      e.preventDefault();
      initAnalytics();
      reopened.current = true;
      setOpen(true);
      if (firstButton.current) { firstButton.current.focus(); reopened.current = false; }
    }
    document.addEventListener('click', onClick);
    return function () { document.removeEventListener('click', onClick); };
  }, [pathname]);
  useEffect(function () {
    if (open && reopened.current && firstButton.current) { firstButton.current.focus(); reopened.current = false; }
  }, [open]);

  if (!open) return null;
  function choose(v: 'granted' | 'denied') { setConsent(v); setOpen(false); }
  return (
    <div role="region" aria-label="Cookie choice" style={S.box}>
      <p style={S.title}>Can we count your visit?</p>
      <p style={S.text}>
        If you agree, we use Google Analytics to see which pages help people. Nothing is counted if you reject.{' '}
        <a href={PRIVACY} style={S.link}>Privacy policy</a>
      </p>
      <div style={S.row}>
        <button type="button" ref={firstButton} style={S.button} onClick={function () { choose('denied'); }}>Reject</button>
        <button type="button" style={S.button} onClick={function () { choose('granted'); }}>Accept</button>
      </div>
    </div>
  );
}

// Accept and Reject look the same, so neither is the easier choice.
const S: Record<string, CSSProperties> = {
  box: { position: 'fixed', zIndex: 1000, left: 12, right: 12, bottom: 12, maxWidth: 400, boxSizing: 'border-box', background: '#FFFFFF', color: '#0B1233', border: '1px solid #E2E7FF', borderRadius: 14, boxShadow: '0 18px 50px -20px rgba(11, 18, 51, 0.35)', padding: '16px 16px 14px', fontSize: 14, lineHeight: 1.5 },
  title: { margin: '0 0 4px', fontSize: 16, fontWeight: 600, fontFamily: '"Inter Tight", var(--font-inter), system-ui, sans-serif' },
  text: { margin: '0 0 12px', color: '#3B4466' },
  link: { color: '#3154FF', textDecoration: 'underline' },
  row: { display: 'flex', gap: 10 },
  button: { flex: 1, minHeight: 44, borderRadius: 10, border: '1px solid #3154FF', background: '#3154FF', color: '#FFFFFF', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
};

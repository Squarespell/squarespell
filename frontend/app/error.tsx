'use client';

/**
 * Global error boundary for the Next.js App Router.
 *
 * Replaces the raw "Application error: a client-side exception has occurred
 * (see the browser console for more information). Digest: 257878998" screen
 * with a branded recovery surface.
 *
 * Next.js passes two things:
 *   - `error`: the caught error (with optional `.digest` in production)
 *   - `reset`: a thunk that re-mounts the segment
 */

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Best-effort console log for Sentry / dev tools.
    if (typeof console !== 'undefined') {
      console.error('[Squarespell] Unhandled error', error);
    }
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100svh',
        background: '#F7F7F5',
        color: '#1A1A1A',
        fontFamily: '"DM Sans", system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}
    >
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            margin: '0 auto 20px',
            borderRadius: 12,
            background: 'rgba(13,115,119,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, opacity: 0.66, lineHeight: 1.55, margin: '0 0 24px' }}>
          We hit a snag loading this page. It is usually temporary - try again
          in a moment or head back home.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '12px 22px',
              borderRadius: 100,
              background: '#0D7377',
              color: '#FFFFFF',
              border: 0,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: '"DM Sans", system-ui, sans-serif',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              padding: '12px 22px',
              borderRadius: 100,
              background: 'transparent',
              color: '#1A1A1A',
              border: '1px solid #E4E3E0',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Go home
          </a>
        </div>

        {error?.digest ? (
          <p style={{ marginTop: 28, fontSize: 11, opacity: 0.32, fontFamily: 'ui-monospace, monospace' }}>
            Reference ID: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}

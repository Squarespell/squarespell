'use client';

/**
 * Dashboard-level error boundary.
 *
 * Catches errors inside the dashboard layout without losing the sidebar shell.
 * Shows a branded recovery card inside the main content area.
 */

import { useEffect } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from './_components/DashboardShell';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(function() {
    console.error('[Squarespell] Dashboard error', error);
  }, [error]);

  return (
    <DashboardShell title="Error">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 200px)',
          padding: 40,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              margin: '0 auto 20px',
              borderRadius: 14,
              background: 'rgba(255,90,90,0.08)',
              border: '1px solid rgba(255,90,90,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff5a5a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h2
            style={{
              margin: '0 0 10px',
              fontSize: 22,
              fontWeight: 800,
              color: C.TEXT,
              letterSpacing: '-0.03em',
            }}
          >
            Something went wrong
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: C.TEXT_MUTED, lineHeight: 1.6 }}>
            This page ran into a problem. Your data is safe - try refreshing or come back in a moment.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={function() { reset(); }}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                background: C.ACCENT,
                color: '#FFFFFF',
                border: 0,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: '"DM Sans", system-ui, sans-serif',
              }}
            >
              Try again
            </button>
            <a
              href="/dashboard"
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                background: 'transparent',
                color: C.TEXT,
                border: '1px solid ' + C.BORDER,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                fontFamily: '"DM Sans", system-ui, sans-serif',
              }}
            >
              Back to overview
            </a>
          </div>

          {error.digest && (
            <p style={{ marginTop: 24, fontSize: 11, color: C.TEXT_SUBTLE, fontFamily: 'ui-monospace, monospace' }}>
              Ref: {error.digest}
            </p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

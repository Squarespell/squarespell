'use client';
import { useEffect } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';

export default function AnalyticsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(function() { console.error('[Squarespell] Analytics error', error); }, [error]);

  return (
    <DashboardShell title="Error">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)', padding: 40 }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff5a5a" strokeWidth="1.5" style={{ marginBottom: 16 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: C.TEXT }}>Analytics Error</h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: C.TEXT_MUTED }}>Something went wrong loading analytics. Your data is safe.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={function() { reset(); }} style={{ padding: '10px 20px', borderRadius: 8, background: C.ACCENT, color: '#fff', border: 0, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Try again</button>
            <a href="/dashboard" style={{ padding: '10px 20px', borderRadius: 8, background: 'transparent', color: C.TEXT, border: '1px solid ' + C.BORDER, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Back to dashboard</a>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

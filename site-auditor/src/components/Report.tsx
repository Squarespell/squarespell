'use client';

import dynamic from 'next/dynamic';
import type { AuditReport } from '@/lib/audit/types';

/**
 * The post-audit report is now a shadcn/ui + Tailwind dashboard
 * (src/components/dashboard/*), replacing the previous hand-CSS report
 * layout entirely. This file stays a thin composer on purpose: both
 * Auditor.tsx and src/app/r/[token]/page.tsx import `{ Report }` from
 * here unchanged, so none of the audit engine, API routes, or database
 * logic needed to move.
 *
 * The dynamic import (ssr: false) keeps dashboard.css and every shadcn/
 * Tailwind component out of the bundle for every route that doesn't
 * render a finished report -- most importantly the marketing homepage,
 * which stays on the existing plain-CSS system with zero Tailwind
 * footprint.
 */
const DashboardShell = dynamic(() => import('./dashboard/dashboard-shell').then((m) => m.DashboardShell), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading report…</div>
  ),
});

export function Report({ report, onReset }: { report: AuditReport; onReset: () => void }) {
  return <DashboardShell report={report} onReset={onReset} />;
}

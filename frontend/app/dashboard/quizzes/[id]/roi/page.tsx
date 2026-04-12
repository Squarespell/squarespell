'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';

import { DashboardShell, DASHBOARD_COLORS as C } from '../../../_components/DashboardShell';
import { useDashboardAuth } from '../../../_components/useDashboardAuth';
import {
  PageHeader,
  Card,
  StatCard,
  EmptyState,
  PrimaryButton,
  PageLoading,
} from '../../../_components/PageShell';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

interface ROIData {
  total_leads: number;
  qualified_leads: number;
  estimated_pipeline: number;
  average_deal_value: number;
}

interface Quiz {
  id: string;
  title: string;
  mode: string;
  settings: Record<string, any>;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ROIPage({ params }: { params: { id: string } }) {
  const { token, status: authStatus } = useDashboardAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [roi, setROI] = useState<ROIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // Fetch quiz details
        const quizRes = await fetch(`${API}/api/quizzes/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!quizRes.ok) {
          setLoading(false);
          return;
        }
        const quizData = await quizRes.json();
        if (!cancelled) setQuiz(quizData);

        // Fetch ROI analytics
        const roiRes = await fetch(`${API}/api/quizzes/${params.id}/analytics/roi`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (roiRes.ok) {
          const roiData: ROIData = await roiRes.json();
          if (!cancelled) setROI(roiData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, params.id]);

  if (authStatus === 'loading' || loading) {
    return (
      <DashboardShell title="ROI">
        <PageLoading />
      </DashboardShell>
    );
  }

  if (!quiz || !roi) {
    return (
      <DashboardShell title="ROI">
        <EmptyState
          title="Could not load ROI data"
          body="There was an error loading ROI analytics for this quiz."
          action={<PrimaryButton href="/dashboard/quizzes">Back to quizzes</PrimaryButton>}
        />
      </DashboardShell>
    );
  }

  const isPriceCalculator = quiz.mode === 'price_calculator';
  const isClientQualifier = quiz.mode === 'client_qualifier';

  return (
    <DashboardShell title="ROI">
      <PageHeader
        title="ROI Dashboard"
        subtitle={`Performance metrics for ${quiz.title || 'Untitled Quiz'}`}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <StatCard label="Total Leads" value={fmt(roi.total_leads)} accent />
        {isClientQualifier && (
          <StatCard label="Qualified Leads" value={fmt(roi.qualified_leads)} />
        )}
        <StatCard label="Estimated Pipeline" value={formatCurrency(roi.estimated_pipeline)} accent />
        {!isPriceCalculator && (
          <StatCard label="Average Deal Value" value={formatCurrency(roi.average_deal_value)} />
        )}
      </div>

      <Card>
        <div style={{ padding: '24px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px 0', color: C.TEXT }}>
            Summary
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
            }}
          >
            <div>
              <p style={{ fontSize: 12, color: C.TEXT_MUTED, margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>
                Total Leads Generated
              </p>
              <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: C.ACCENT }}>
                {fmt(roi.total_leads)}
              </p>
            </div>

            {isClientQualifier && (
              <div>
                <p style={{ fontSize: 12, color: C.TEXT_MUTED, margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>
                  Qualified Leads
                </p>
                <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: C.ACCENT }}>
                  {fmt(roi.qualified_leads)}
                </p>
              </div>
            )}

            <div>
              <p style={{ fontSize: 12, color: C.TEXT_MUTED, margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>
                Estimated Pipeline Value
              </p>
              <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: C.ACCENT }}>
                {formatCurrency(roi.estimated_pipeline)}
              </p>
            </div>
          </div>

          {roi.total_leads > 0 && (
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${C.BORDER}` }}>
              <p style={{ fontSize: 13, color: C.TEXT, lineHeight: 1.6 }}>
                {isPriceCalculator ? (
                  <>This quiz generated {fmt(roi.total_leads)} leads with a combined estimated value of {formatCurrency(roi.estimated_pipeline)}.</>
                ) : isClientQualifier ? (
                  <>This quiz generated {fmt(roi.total_leads)} total leads with {fmt(roi.qualified_leads)} qualified leads, representing an estimated pipeline value of {formatCurrency(roi.estimated_pipeline)}.</>
                ) : (
                  <>This quiz generated {fmt(roi.total_leads)} leads with an estimated pipeline value of {formatCurrency(roi.estimated_pipeline)}.</>
                )}
              </p>
            </div>
          )}
        </div>
      </Card>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link
          href={`/dashboard/quizzes/${params.id}`}
          style={{
            color: C.TEXT_MUTED,
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Back to quiz settings
        </Link>
      </div>
    </DashboardShell>
  );
}

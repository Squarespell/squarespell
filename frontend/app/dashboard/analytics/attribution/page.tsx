'use client';

/**
 * /dashboard/analytics/attribution - Cross-quiz attribution dashboard.
 *
 * Shows per-quiz and per-outcome metrics: leads captured, emails sent,
 * opened, clicked, and revenue attributed. Connects the full pipeline
 * from quiz view to conversion.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '../../_components/DashboardShell';
import { DASHBOARD_COLORS as C } from '../../_components/dashboardColors';
import {
  PageHeader,
  Card,
  EmptyState,
  StatCard,
  Pill,
  GhostButton,
  PageLoading,
} from '../../_components/PageShell';
import { api } from '@/lib/api';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface OutcomeAttribution {
  outcome_id: string;
  outcome_name: string;
  leads: number;
}

interface QuizAttribution {
  quiz_id: string;
  quiz_title: string;
  views: number;
  leads: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  revenue_cents: number;
  outcomes: OutcomeAttribution[];
}

interface AttributionData {
  quizzes: QuizAttribution[];
  totals: {
    leads: number;
    emails_sent: number;
    emails_opened: number;
    emails_clicked: number;
    revenue_cents: number;
  };
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function pct(num: number, den: number): string {
  if (den === 0) return '-';
  return ((num / den) * 100).toFixed(1) + '%';
}

function dollars(cents: number): string {
  if (cents === 0) return '$0';
  return '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function costPerLead(revenueCents: number, leads: number): string {
  if (leads === 0 || revenueCents === 0) return '-';
  return dollars(Math.round(revenueCents / leads));
}

// -----------------------------------------------------------------------
// Quiz attribution row
// -----------------------------------------------------------------------

function QuizRow({
  quiz,
  maxLeads,
}: {
  quiz: QuizAttribution;
  maxLeads: number;
}) {
  var router = useRouter();
  var [expanded, setExpanded] = useState(false);
  var barWidth = maxLeads > 0 ? (quiz.leads / maxLeads) * 100 : 0;

  return (
    <div style={{
      background: C.ELEVATED,
      border: '1px solid ' + C.HAIRLINE,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 10,
    }}>
      {/* Main row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr repeat(5, 1fr) 80px',
          alignItems: 'center',
          gap: 12,
          padding: '14px 20px',
          cursor: quiz.outcomes.length > 0 ? 'pointer' : 'default',
        }}
        onClick={function () { if (quiz.outcomes.length > 0) setExpanded(!expanded); }}
      >
        {/* Quiz name + bar */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: C.TEXT }}>
              {quiz.quiz_title}
            </span>
            {quiz.outcomes.length > 0 && (
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke={C.TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </div>
          <div style={{ height: 4, borderRadius: 2, background: C.HAIRLINE, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: barWidth + '%',
              background: C.ACCENT,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Views */}
        <div style={{ fontSize: 13, color: C.TEXT, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {quiz.views.toLocaleString()}
        </div>

        {/* Leads */}
        <div style={{ fontSize: 13, color: C.TEXT, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {quiz.leads.toLocaleString()}
        </div>

        {/* Emails sent */}
        <div style={{ fontSize: 13, color: C.TEXT_MUTED, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {quiz.emails_sent.toLocaleString()}
        </div>

        {/* Click rate */}
        <div style={{ fontSize: 13, color: C.TEXT_MUTED, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {pct(quiz.emails_clicked, quiz.emails_sent)}
        </div>

        {/* Revenue */}
        <div style={{
          fontSize: 13, textAlign: 'right', fontWeight: 600,
          color: quiz.revenue_cents > 0 ? '#4cd964' : C.TEXT_MUTED,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {dollars(quiz.revenue_cents)}
        </div>

        {/* Action */}
        <div style={{ textAlign: 'right' }}>
          <button
            type="button"
            onClick={function (e) { e.stopPropagation(); router.push('/dashboard/analytics/' + quiz.quiz_id); }}
            style={{
              background: 'none', border: '1px solid ' + C.BORDER,
              borderRadius: 6, padding: '4px 10px', fontSize: 11,
              fontWeight: 600, color: C.TEXT_MUTED, cursor: 'pointer',
              fontFamily: '"Poppins",system-ui,sans-serif',
            }}
          >
            View
          </button>
        </div>
      </div>

      {/* Outcome breakdown */}
      {expanded && quiz.outcomes.length > 0 && (
        <div style={{
          borderTop: '1px solid ' + C.HAIRLINE,
          padding: '10px 20px 14px 40px',
          background: 'rgba(0,0,0,0.02)',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: C.TEXT_SUBTLE,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 8,
          }}>
            Outcome breakdown
          </div>
          {quiz.outcomes.map(function (o) {
            var outcomeBar = quiz.leads > 0 ? (o.leads / quiz.leads) * 100 : 0;
            return (
              <div key={o.outcome_id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '4px 0',
              }}>
                <span style={{ fontSize: 12.5, color: C.TEXT, minWidth: 120, flexShrink: 0 }}>
                  {o.outcome_name}
                </span>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.HAIRLINE }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: outcomeBar + '%',
                    background: C.SUCCESS,
                  }} />
                </div>
                <span style={{ fontSize: 12, color: C.TEXT_MUTED, fontVariantNumeric: 'tabular-nums', minWidth: 50, textAlign: 'right' }}>
                  {o.leads} leads
                </span>
                <span style={{ fontSize: 11, color: C.TEXT_SUBTLE, fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'right' }}>
                  {pct(o.leads, quiz.leads)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default function AttributionPage() {
  var [data, setData] = useState<AttributionData | null>(null);
  var [loading, setLoading] = useState(true);

  var loadData = useCallback(function () {
    setLoading(true);
    api.getAttribution()
      .then(function (d: any) { setData(d); })
      .catch(function () { setData({ quizzes: [], totals: { leads: 0, emails_sent: 0, emails_opened: 0, emails_clicked: 0, revenue_cents: 0 } }); })
      .finally(function () { setLoading(false); });
  }, []);

  useEffect(function () { loadData(); }, [loadData]);

  if (loading) {
    return (
      <DashboardShell title="Attribution">
        <PageLoading />
      </DashboardShell>
    );
  }

  var totals = data ? data.totals : { leads: 0, emails_sent: 0, emails_opened: 0, emails_clicked: 0, revenue_cents: 0 };
  var quizzes = data ? data.quizzes : [];
  var maxLeads = quizzes.reduce(function (max, q) { return Math.max(max, q.leads); }, 0);

  return (
    <DashboardShell title="Attribution">
      <PageHeader
        title="Attribution"
        subtitle="Track the full journey from quiz view to conversion across all quizzes"
      />

      {/* Top-level KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: 12,
        marginBottom: 28,
      }}>
        <StatCard label="Total leads" value={totals.leads.toLocaleString()} accent />
        <StatCard label="Emails sent" value={totals.emails_sent.toLocaleString()} />
        <StatCard label="Emails opened" value={totals.emails_opened.toLocaleString()} sub={pct(totals.emails_opened, totals.emails_sent) + ' open rate'} />
        <StatCard label="Email clicks" value={totals.emails_clicked.toLocaleString()} sub={pct(totals.emails_clicked, totals.emails_sent) + ' CTR'} />
        <StatCard
          label="Revenue"
          value={dollars(totals.revenue_cents)}
          accent={totals.revenue_cents > 0}
          sub={totals.revenue_cents > 0 ? costPerLead(totals.revenue_cents, totals.leads) + ' per lead' : 'No payments yet'}
        />
      </div>

      {/* Table header */}
      {quizzes.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr repeat(5, 1fr) 80px',
          gap: 12,
          padding: '0 20px 10px',
          fontSize: 10,
          fontWeight: 700,
          color: C.TEXT_SUBTLE,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          <div>Quiz</div>
          <div style={{ textAlign: 'right' }}>Views</div>
          <div style={{ textAlign: 'right' }}>Leads</div>
          <div style={{ textAlign: 'right' }}>Emails</div>
          <div style={{ textAlign: 'right' }}>Click rate</div>
          <div style={{ textAlign: 'right' }}>Revenue</div>
          <div />
        </div>
      )}

      {/* Quiz rows */}
      {quizzes.map(function (q) {
        return <QuizRow key={q.quiz_id} quiz={q} maxLeads={maxLeads} />;
      })}

      {/* Empty state */}
      {quizzes.length === 0 && (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
          }
          title="No attribution data yet"
          body="Create quizzes and send email campaigns to start tracking the full conversion pipeline."
        />
      )}
    </DashboardShell>
  );
}

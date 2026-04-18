'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  DashboardShell,
  DASHBOARD_COLORS as C
} from '../../_components/DashboardShell';
import { useDashboardAuth } from '../../_components/useDashboardAuth';
import {
  PageHeader,
  Card,
  StatCard,
  PageLoading,
  GhostButton,
} from '../../_components/PageShell';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type Lead = {
  id: string;
  name: string | null;
  email: string;
  answers: Record<string, any>;
  outcome_id: string | null;
  score?: number | null;
  score_label?: string;
  qualified?: boolean;
  path_taken?: string[];
  calculated_price?: number;
  created_at: string;
  quiz_id: string;
  metadata?: Record<string, any>;
  quizzes?: {
    id: string;
    title: string;
    slug: string;
    mode?: string;
    questions?: Array<{ text: string; options: Array<{ text: string }> }>;
    outcomes?: Array<{
      id: string;
      title: string;
      description?: string;
      price?: string;
      score_threshold?: number;
    }>;
    branding?: any;
    settings?: any;
  } | null;
};

function formatDate(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleDateString() + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getScoreColor(label: string | undefined) {
  switch (label) {
    case 'Hot':
      return '#22c55e';
    case 'Warm':
      return '#f59e0b';
    case 'Cold':
      return '#9ca3af';
    default:
      return '#6b7280';
  }
}

function getScoreBgColor(label: string | undefined) {
  switch (label) {
    case 'Hot':
      return 'rgba(34, 197, 94, 0.1)';
    case 'Warm':
      return 'rgba(245, 158, 11, 0.1)';
    case 'Cold':
      return 'rgba(156, 163, 175, 0.1)';
    default:
      return 'rgba(107, 114, 128, 0.1)';
  }
}

export default function LeadDetailPage() {
  const params = useParams();
  const { token, status: authStatus } = useDashboardAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const leadId = typeof params.id === 'string' ? params.id : '';

  useEffect(() => {
    if (!token || !leadId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`${API}/api/leads/${leadId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 404) {
            setError('Lead not found');
          } else {
            setError('Failed to load lead');
          }
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setLead(data);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError('Failed to load lead');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, leadId]);

  if (authStatus === 'loading' || loading) {
    return (
      <DashboardShell title="Lead">
        <PageLoading />
      </DashboardShell>
    );
  }

  if (error || !lead) {
    return (
      <DashboardShell title="Lead">
        <PageHeader title="Lead not found" />
        <Card>
          <p style={{ color: C.TEXT_MUTED, margin: 0 }}>{error || 'This lead could not be loaded.'}</p>
          <div style={{ marginTop: 20 }}>
            <GhostButton
              onClick={() => window.history.back()}
            >
              Go back
            </GhostButton>
          </div>
        </Card>
      </DashboardShell>
    );
  }

  const matchedOutcome = lead.outcome_id && lead.quizzes?.outcomes
    ? lead.quizzes.outcomes.find((o) => o.id === lead.outcome_id)
    : null;

  const scoreColor = getScoreColor(lead.score_label);
  const scoreBgColor = getScoreBgColor(lead.score_label);

  return (
    <DashboardShell title={`${lead.name || lead.email}`}>
      <PageHeader
        title={lead.name || lead.email}
        subtitle={`From ${lead.quizzes?.title || 'Unknown Quiz'}`}
        actions={
          <GhostButton onClick={() => window.history.back()}>
            Back to leads
          </GhostButton>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Quiz" value={lead.quizzes?.title || 'Unknown'} />
        <StatCard label="Email" value={lead.email} />
        <StatCard label="Captured" value={formatDate(lead.created_at)} />
        {lead.score !== null && lead.score !== undefined && (
          <StatCard label="Score" value={lead.score} accent />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}>
        {lead.score !== null && lead.score !== undefined && (
          <Card>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 14 }}>
              Lead Status
            </div>
            <div
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                color: scoreColor,
                background: scoreBgColor,
                whiteSpace: 'nowrap',
              }}
            >
              {lead.score_label || 'Unknown'} ({lead.score})
            </div>
          </Card>
        )}

        {matchedOutcome && (
          <Card>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 14 }}>
              Outcome
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT }}>
              {matchedOutcome.title}
            </div>
          </Card>
        )}

        {lead.qualified !== undefined && (
          <Card>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 14 }}>
              Status
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT }}>
              {lead.qualified ? 'Qualified' : 'Nurture'}
            </div>
          </Card>
        )}

        {lead.calculated_price !== undefined && (
          <Card>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 14 }}>
              Estimated Price
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.ACCENT }}>
              ${lead.calculated_price.toFixed(2)}
            </div>
          </Card>
        )}
      </div>

      {lead.metadata?.ai_summary && (
        <Card style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ACCENT, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            AI Insights
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: C.TEXT }}>
            {lead.metadata.ai_summary}
          </div>
        </Card>
      )}

      {matchedOutcome?.description && (
        <Card style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 12 }}>
            Outcome Description
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: C.TEXT }}>
            {matchedOutcome.description}
          </div>
        </Card>
      )}

      {lead.quizzes?.questions && Object.keys(lead.answers).length > 0 && (
        <Card style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Answers
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(lead.answers).map(([qIdx, aIdx]) => {
              const qIndex = Number(qIdx);
              const aIndex = Number(aIdx);
              const question = lead.quizzes?.questions?.[qIndex];
              const selectedOption = question?.options?.[aIndex];

              if (!question || !selectedOption) return null;

              return (
                <div key={qIdx}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 8 }}>
                    Q{qIndex + 1}: {question.text}
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: C.TEXT,
                      padding: '12px 14px',
                      background: C.ACCENT_LIGHT,
                      borderLeft: `3px solid ${C.ACCENT}`,
                      borderRadius: 4,
                    }}
                  >
                    {selectedOption.text}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {lead.metadata && (
        <Card>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Timeline & Metadata
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: C.TEXT_MUTED }}>Lead ID</span>
              <span style={{ color: C.TEXT, fontFamily: 'monospace', fontSize: 12 }}>{lead.id}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderTop: `1px solid ${C.BORDER}`, paddingTop: 12 }}>
              <span style={{ color: C.TEXT_MUTED }}>Captured</span>
              <span style={{ color: C.TEXT }}>{formatDate(lead.created_at)}</span>
            </div>

            {lead.metadata.device && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderTop: `1px solid ${C.BORDER}`, paddingTop: 12 }}>
                <span style={{ color: C.TEXT_MUTED }}>Device</span>
                <span style={{ color: C.TEXT }}>{lead.metadata.device}</span>
              </div>
            )}

            {lead.metadata.time_to_complete_ms && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderTop: `1px solid ${C.BORDER}`, paddingTop: 12 }}>
                <span style={{ color: C.TEXT_MUTED }}>Time to Complete</span>
                <span style={{ color: C.TEXT }}>
                  {Math.round(lead.metadata.time_to_complete_ms / 1000)}s
                </span>
              </div>
            )}
          </div>
        </Card>
      )}
    </DashboardShell>
  );
}

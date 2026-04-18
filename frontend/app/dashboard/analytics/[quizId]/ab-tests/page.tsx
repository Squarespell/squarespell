'use client';

/**
 * /dashboard/analytics/[quizId]/ab-tests - A/B testing dashboard for a quiz.
 *
 * Lists existing tests, allows creating new ones (pick variant quizzes,
 * set weights), shows per-variant stats (impressions, conversions, rate),
 * and lets the user start/pause/complete tests or declare a winner.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '../../../_components/DashboardShell';
import { DASHBOARD_COLORS as C } from '../../../_components/dashboardColors';
import {
  PageHeader,
  Card,
  EmptyState,
  PrimaryButton,
  GhostButton,
  Pill,
  PageLoading,
  StatCard,
} from '../../../_components/PageShell';
import { api } from '@/lib/api';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface Variant {
  variant_id: string;
  quiz_id: string;
  weight: number;
}

interface VariantStat {
  variant_id: string;
  impressions: number;
  conversions: number;
  conversion_rate: number;
}

interface ABTest {
  id: string;
  quiz_id: string;
  name: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  variants: Variant[];
  winner_variant_id: string | null;
  stats?: VariantStat[];
  created_at: string;
  updated_at: string;
  ended_at: string | null;
}

interface QuizSummary {
  id: string;
  title: string;
  status: string;
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

const statusPillVariant = (s: string) => {
  if (s === 'running') return 'live' as const;
  if (s === 'completed') return 'accent' as const;
  return 'draft' as const;
};

function pct(n: number): string {
  return n.toFixed(1) + '%';
}

// -----------------------------------------------------------------------
// Create test form
// -----------------------------------------------------------------------

function CreateTestForm({
  quizId,
  quizzes,
  onCreated,
  onCancel,
}: {
  quizId: string;
  quizzes: QuizSummary[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [variants, setVariants] = useState<Array<{ quiz_id: string; weight: number }>>([
    { quiz_id: quizId, weight: 50 },
    { quiz_id: '', weight: 50 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateVariant(idx: number, patch: Partial<{ quiz_id: string; weight: number }>) {
    setVariants(function (prev) {
      var next = prev.map(function (v, i) {
        return i === idx ? { ...v, ...patch } : v;
      });
      return next;
    });
  }

  function addVariant() {
    setVariants(function (prev) { return prev.concat([{ quiz_id: '', weight: 0 }]); });
  }

  function removeVariant(idx: number) {
    if (variants.length <= 2) return;
    setVariants(function (prev) { return prev.filter(function (_, i) { return i !== idx; }); });
  }

  async function handleSubmit() {
    setError('');
    if (!name.trim()) { setError('Test name is required'); return; }
    var incomplete = variants.some(function (v) { return !v.quiz_id; });
    if (incomplete) { setError('All variants must have a quiz selected'); return; }
    var totalWeight = variants.reduce(function (s, v) { return s + v.weight; }, 0);
    if (totalWeight <= 0) { setError('Total weight must be greater than zero'); return; }

    setSaving(true);
    try {
      var payload = {
        name: name.trim(),
        variants: variants.map(function (v, i) {
          return {
            variant_id: String.fromCharCode(65 + i),
            quiz_id: v.quiz_id,
            weight: v.weight,
          };
        }),
      };
      await api.createABTest(quizId, payload);
      onCreated();
    } catch (e: any) {
      setError(e.message || 'Failed to create test');
    } finally {
      setSaving(false);
    }
  }

  var inputStyle: React.CSSProperties = {
    padding: '10px 14px',
    background: C.SURFACE,
    border: '1px solid ' + C.BORDER,
    borderRadius: 10,
    fontSize: 13.5,
    color: C.TEXT,
    fontFamily: '"DM Sans",system-ui,sans-serif',
    outline: 'none',
    width: '100%',
  };

  var labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: C.TEXT_MUTED,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 6,
    display: 'block',
  };

  var selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none' as const,
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\' fill=\'none\'%3E%3Cpath d=\'M3 4.5L6 7.5L9 4.5\' stroke=\'%238a919c\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: 32,
  };

  return (
    <Card style={{ marginBottom: 24 }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, color: C.TEXT }}>
        New A/B test
      </h2>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Test name</label>
        <input
          type="text"
          value={name}
          onChange={function (e) { setName(e.target.value); }}
          placeholder="e.g. Homepage quiz - headline test"
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Variants</label>
        <div style={{ display: 'grid', gap: 10 }}>
          {variants.map(function (v, idx) {
            return (
              <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(210,255,29,0.08)',
                  border: '1px solid rgba(210,255,29,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: C.ACCENT, flexShrink: 0,
                }}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <select
                  value={v.quiz_id}
                  onChange={function (e) { updateVariant(idx, { quiz_id: e.target.value }); }}
                  style={{ ...selectStyle, flex: 1 }}
                >
                  <option value="">Select quiz variant...</option>
                  {quizzes.map(function (q) {
                    return (
                      <option key={q.id} value={q.id}>
                        {q.title} {q.id === quizId ? '(this quiz)' : ''}
                      </option>
                    );
                  })}
                </select>
                <div style={{ width: 80, flexShrink: 0 }}>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={v.weight}
                    onChange={function (e) { updateVariant(idx, { weight: parseInt(e.target.value) || 0 }); }}
                    style={{ ...inputStyle, textAlign: 'center' as const }}
                  />
                </div>
                <span style={{ fontSize: 11, color: C.TEXT_MUTED, width: 12 }}>%</span>
                {variants.length > 2 && (
                  <button
                    type="button"
                    onClick={function () { removeVariant(idx); }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: C.TEXT_MUTED, fontSize: 16, padding: 4,
                    }}
                    title="Remove variant"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {variants.length < 5 && (
          <button
            type="button"
            onClick={addVariant}
            style={{
              marginTop: 8, background: 'none', border: 'none',
              color: C.ACCENT, fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', padding: '4px 0',
            }}
          >
            + Add variant
          </button>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 12.5, color: '#ef4444', marginBottom: 12, lineHeight: 1.4 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <PrimaryButton onClick={handleSubmit} disabled={saving}>
          {saving ? 'Creating...' : 'Create test'}
        </PrimaryButton>
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
      </div>
    </Card>
  );
}

// -----------------------------------------------------------------------
// Test detail card
// -----------------------------------------------------------------------

function TestCard({
  test,
  quizzes,
  onRefresh,
}: {
  test: ABTest;
  quizzes: QuizSummary[];
  onRefresh: () => void;
}) {
  var [acting, setActing] = useState(false);

  function quizTitle(quizId: string): string {
    var q = quizzes.find(function (q) { return q.id === quizId; });
    return q ? q.title : quizId.slice(0, 8) + '...';
  }

  async function setStatus(status: string) {
    setActing(true);
    try {
      await api.updateABTestStatus(test.id, status);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActing(false);
    }
  }

  async function declareWinner(variantId: string) {
    setActing(true);
    try {
      await api.declareABTestWinner(test.id, variantId);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActing(false);
    }
  }

  var totalImpressions = (test.stats || []).reduce(function (s, v) { return s + v.impressions; }, 0);
  var totalConversions = (test.stats || []).reduce(function (s, v) { return s + v.conversions; }, 0);

  // Find the best-performing variant
  var bestVariant: VariantStat | null = null;
  if (test.stats && test.stats.length > 0) {
    bestVariant = test.stats.reduce(function (best, v) {
      return v.conversion_rate > best.conversion_rate ? v : best;
    });
  }

  var barColors = ['#D2FF1D', '#3b7dd8', '#e67e22', '#9b59b6', '#1abc9c'];

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.TEXT }}>
            {test.name}
          </h3>
          <Pill variant={statusPillVariant(test.status)}>{test.status}</Pill>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {test.status === 'draft' && (
            <PrimaryButton onClick={function () { setStatus('running'); }} disabled={acting}>
              Start test
            </PrimaryButton>
          )}
          {test.status === 'running' && (
            <>
              <GhostButton onClick={function () { setStatus('paused'); }} disabled={acting}>
                Pause
              </GhostButton>
              <GhostButton onClick={function () { setStatus('completed'); }} disabled={acting}>
                End test
              </GhostButton>
            </>
          )}
          {test.status === 'paused' && (
            <>
              <PrimaryButton onClick={function () { setStatus('running'); }} disabled={acting}>
                Resume
              </PrimaryButton>
              <GhostButton onClick={function () { setStatus('completed'); }} disabled={acting}>
                End test
              </GhostButton>
            </>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total impressions" value={totalImpressions.toLocaleString()} />
        <StatCard label="Total conversions" value={totalConversions.toLocaleString()} />
        <StatCard
          label="Overall rate"
          value={totalImpressions > 0 ? pct((totalConversions / totalImpressions) * 100) : '-'}
        />
      </div>

      {/* Variant breakdown */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          Variant performance
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {test.variants.map(function (variant, idx) {
            var stat = (test.stats || []).find(function (s) { return s.variant_id === variant.variant_id; });
            var impressions = stat ? stat.impressions : 0;
            var conversions = stat ? stat.conversions : 0;
            var rate = stat ? stat.conversion_rate : 0;
            var isWinner = test.winner_variant_id === variant.variant_id;
            var isBest = bestVariant && bestVariant.variant_id === variant.variant_id && totalImpressions > 0;
            var maxRate = bestVariant ? bestVariant.conversion_rate : 0;
            var barWidth = maxRate > 0 ? (rate / maxRate) * 100 : 0;
            var color = barColors[idx % barColors.length];

            return (
              <div
                key={variant.variant_id}
                style={{
                  padding: 16,
                  background: isWinner ? 'rgba(210,255,29,0.04)' : C.SURFACE,
                  border: '1px solid ' + (isWinner ? 'rgba(210,255,29,0.25)' : C.BORDER),
                  borderRadius: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: color + '20', border: '1px solid ' + color + '40',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: color,
                    }}>
                      {variant.variant_id}
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: C.TEXT }}>
                      {quizTitle(variant.quiz_id)}
                    </span>
                    <span style={{ fontSize: 11, color: C.TEXT_MUTED }}>
                      {variant.weight}% traffic
                    </span>
                    {isWinner && <Pill variant="accent">Winner</Pill>}
                    {isBest && !isWinner && test.status !== 'completed' && (
                      <Pill variant="live">Leading</Pill>
                    )}
                  </div>
                  {test.status === 'running' && !test.winner_variant_id && (
                    <button
                      type="button"
                      onClick={function () { declareWinner(variant.variant_id); }}
                      disabled={acting}
                      style={{
                        background: 'none', border: '1px solid ' + C.BORDER,
                        borderRadius: 8, padding: '5px 12px', fontSize: 11,
                        fontWeight: 600, color: C.TEXT_MUTED, cursor: 'pointer',
                        fontFamily: '"DM Sans",system-ui,sans-serif',
                      }}
                    >
                      Declare winner
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 24, fontSize: 12.5, color: C.TEXT_MUTED, marginBottom: 8 }}>
                  <span>{impressions.toLocaleString()} impressions</span>
                  <span>{conversions.toLocaleString()} conversions</span>
                  <span style={{ fontWeight: 700, color: rate > 0 ? C.TEXT : C.TEXT_MUTED }}>
                    {pct(rate)} rate
                  </span>
                </div>

                {/* Conversion rate bar */}
                <div style={{
                  height: 6, borderRadius: 3,
                  background: 'rgba(255,255,255,0.04)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: barWidth + '%',
                    background: color,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer meta */}
      <div style={{ fontSize: 11, color: C.TEXT_SUBTLE, marginTop: 12 }}>
        Created {new Date(test.created_at).toLocaleDateString()}
        {test.ended_at ? ' - Ended ' + new Date(test.ended_at).toLocaleDateString() : ''}
      </div>
    </Card>
  );
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default function ABTestsPage({ params }: { params: { quizId: string } }) {
  var router = useRouter();
  var [tests, setTests] = useState<ABTest[]>([]);
  var [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  var [loading, setLoading] = useState(true);
  var [showCreate, setShowCreate] = useState(false);

  var loadData = useCallback(function () {
    setLoading(true);
    Promise.all([
      api.listABTests(params.quizId).catch(function () { return []; }),
      api.getQuizzes().catch(function () { return []; }),
    ]).then(function (results) {
      var testList = results[0] as ABTest[];
      var quizList = results[1] as QuizSummary[];

      // For each test, fetch detailed stats
      if (testList.length > 0) {
        Promise.all(
          testList.map(function (t) {
            return api.getABTest(t.id).catch(function () { return t; });
          })
        ).then(function (detailed) {
          setTests(detailed);
          setQuizzes(quizList);
          setLoading(false);
        });
      } else {
        setTests(testList);
        setQuizzes(quizList);
        setLoading(false);
      }
    });
  }, [params.quizId]);

  useEffect(function () { loadData(); }, [loadData]);

  if (loading) {
    return (
      <DashboardShell title="A/B tests">
        <PageLoading />
      </DashboardShell>
    );
  }

  var runningCount = tests.filter(function (t) { return t.status === 'running'; }).length;
  var completedCount = tests.filter(function (t) { return t.status === 'completed'; }).length;

  return (
    <DashboardShell title="A/B tests">
      <PageHeader
        title="A/B tests"
        subtitle="Split traffic between quiz variants and compare conversion rates"
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <GhostButton onClick={function () { router.push('/dashboard/analytics/' + params.quizId); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Analytics
            </GhostButton>
            {!showCreate && (
              <PrimaryButton onClick={function () { setShowCreate(true); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New test
              </PrimaryButton>
            )}
          </div>
        }
      />

      {/* Summary pills */}
      {tests.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <Pill variant="neutral">{tests.length} total</Pill>
          {runningCount > 0 && <Pill variant="live">{runningCount} running</Pill>}
          {completedCount > 0 && <Pill variant="accent">{completedCount} completed</Pill>}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <CreateTestForm
          quizId={params.quizId}
          quizzes={quizzes}
          onCreated={function () { setShowCreate(false); loadData(); }}
          onCancel={function () { setShowCreate(false); }}
        />
      )}

      {/* Test list */}
      {tests.map(function (test) {
        return (
          <TestCard
            key={test.id}
            test={test}
            quizzes={quizzes}
            onRefresh={loadData}
          />
        );
      })}

      {/* Empty state */}
      {tests.length === 0 && !showCreate && (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5" />
              <path d="M8 3H3v5" />
              <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
              <path d="m15 9 6-6" />
            </svg>
          }
          title="No A/B tests yet"
          body="Create a test to split traffic between quiz variants and find the highest-converting version."
          action={
            <PrimaryButton onClick={function () { setShowCreate(true); }}>
              Create your first test
            </PrimaryButton>
          }
        />
      )}
    </DashboardShell>
  );
}

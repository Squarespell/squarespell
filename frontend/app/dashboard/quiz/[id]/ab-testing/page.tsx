'use client';

/**
 * /dashboard/quiz/[id]/ab-testing - A/B Testing management for a specific quiz.
 *
 * Allows creating split tests between quiz variants, monitoring results,
 * and declaring winners based on conversion data.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell, DASHBOARD_COLORS as C } from '../../../_components/DashboardShell';
import { useDashboardAuth } from '../../../_components/useDashboardAuth';
import {
  PageHeader,
  Card,
  EmptyState,
  PrimaryButton,
  GhostButton,
  PageLoading,
} from '../../../_components/PageShell';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

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
  created_at: string;
  updated_at: string;
  ended_at: string | null;
  stats?: VariantStat[];
}

interface Quiz {
  id: string;
  title: string;
  slug: string;
}

/* ── Icons ───────────────────────────────── */
var BackIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M5 12l7 7M5 12l7-7" />
  </svg>
);

var SplitIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </svg>
);

var PlayIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

var PauseIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
  </svg>
);

var TrophyIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 22V12M14 22V12M8 6h8a2 2 0 0 1 2 2v4a6 6 0 0 1-12 0V8a2 2 0 0 1 2-2z" />
  </svg>
);

/* ── Status helpers ─────────────────────── */
function statusPill(status: string) {
  switch (status) {
    case 'running':
      return { bg: C.SUCCESS_LIGHT, color: C.SUCCESS, label: 'Running' };
    case 'draft':
      return { bg: C.GRAY_100, color: C.GRAY_600, label: 'Draft' };
    case 'paused':
      return { bg: C.WARNING_LIGHT, color: C.WARNING, label: 'Paused' };
    case 'completed':
      return { bg: C.BRAND_50, color: C.ACCENT, label: 'Completed' };
    default:
      return { bg: C.GRAY_100, color: C.GRAY_600, label: status };
  }
}

/* ── Input styles ───────────────────────── */
var inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: C.SURFACE,
  border: '1px solid ' + C.GRAY_300,
  borderRadius: 8,
  color: C.GRAY_900,
  fontSize: 14,
  fontFamily: C.FONT,
  boxShadow: C.SHADOW_XS,
  outline: 'none',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

export default function ABTestingPage({ params }: { params: { id: string } }) {
  var { token, status: authStatus } = useDashboardAuth();
  var router = useRouter();
  var [quiz, setQuiz] = useState<Quiz | null>(null);
  var [tests, setTests] = useState<ABTest[]>([]);
  var [loading, setLoading] = useState(true);
  var [creating, setCreating] = useState(false);
  var [showForm, setShowForm] = useState(false);
  var [formError, setFormError] = useState('');
  var [quizzes, setQuizzes] = useState<Quiz[]>([]);

  // Form state
  var [testName, setTestName] = useState('');
  var [variantCount, setVariantCount] = useState(2);
  var [variantData, setVariantData] = useState<Array<{ quizId: string; weight: string }>>([
    { quizId: '', weight: '50' },
    { quizId: '', weight: '50' },
  ]);

  // Fetch quiz and tests
  useEffect(() => {
    if (authStatus !== 'ready' || !token) return;

    var fetchData = async () => {
      try {
        // Fetch quiz
        var quizRes = await fetch(`${API}/api/quizzes/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!quizRes.ok) {
          setLoading(false);
          return;
        }
        var quizData = await quizRes.json();
        setQuiz(quizData);

        // Fetch all quizzes for variant selection
        var allQuizzesRes = await fetch(`${API}/api/quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (allQuizzesRes.ok) {
          var allQuizzes = await allQuizzesRes.json();
          setQuizzes(allQuizzes);
        }

        // Fetch tests for this quiz
        var testsRes = await fetch(`${API}/api/quizzes/${params.id}/ab-tests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!testsRes.ok) {
          setLoading(false);
          return;
        }
        var testsData = await testsRes.json();

        // Fetch stats for each test
        var testsWithStats = await Promise.all(
          testsData.map(async (test: ABTest) => {
            try {
              var statsRes = await fetch(`${API}/api/quizzes/tests/${test.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (statsRes.ok) {
                return await statsRes.json();
              }
              return test;
            } catch {
              return test;
            }
          })
        );

        setTests(testsWithStats);
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, token, authStatus]);

  var handleVariantCountChange = (newCount: number) => {
    setVariantCount(newCount);
    var newData = Array(newCount)
      .fill(null)
      .map((_, i) => {
        if (i < variantData.length) return variantData[i];
        return { quizId: '', weight: String(Math.round(100 / newCount)) };
      });
    setVariantData(newData);
  };

  var handleVariantChange = (index: number, field: 'quizId' | 'weight', value: string) => {
    var newData = [...variantData];
    if (field === 'quizId') {
      newData[index].quizId = value;
    } else {
      newData[index].weight = value;
    }
    setVariantData(newData);
  };

  var handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!testName.trim()) {
      setFormError('Test name is required');
      return;
    }

    // Validate variants
    var selectedQuizzes = new Set<string>();
    var totalWeight = 0;

    for (var v of variantData) {
      if (!v.quizId) {
        setFormError('All variants must select a quiz');
        return;
      }
      if (selectedQuizzes.has(v.quizId)) {
        setFormError('Each variant must use a different quiz');
        return;
      }
      selectedQuizzes.add(v.quizId);

      var weight = parseFloat(v.weight);
      if (isNaN(weight) || weight <= 0) {
        setFormError('All weights must be positive numbers');
        return;
      }
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      setFormError('Total weight must be greater than 0');
      return;
    }

    setCreating(true);

    try {
      // Normalize weights to sum to 100
      var variants: Variant[] = variantData.map((v, i) => ({
        variant_id: `variant-${i}`,
        quiz_id: v.quizId,
        weight: (parseFloat(v.weight) / totalWeight) * 100,
      }));

      var res = await fetch(`${API}/api/quizzes/${params.id}/ab-tests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: testName, variants }),
      });

      if (!res.ok) {
        var err = await res.json();
        setFormError(err.error || 'Failed to create test');
        setCreating(false);
        return;
      }

      var newTest = await res.json();
      setTests([newTest, ...tests]);
      setTestName('');
      setVariantData([
        { quizId: '', weight: '50' },
        { quizId: '', weight: '50' },
      ]);
      setShowForm(false);
      setCreating(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create test');
      setCreating(false);
    }
  };

  var handleStatusChange = async (testId: string, newStatus: 'running' | 'paused') => {
    try {
      var res = await fetch(`${API}/api/quizzes/tests/${testId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      var updated = await res.json();
      setTests(tests.map((t) => (t.id === testId ? updated : t)));
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  var handleDeclareWinner = async (testId: string, variantId: string) => {
    try {
      var res = await fetch(`${API}/api/quizzes/tests/${testId}/winner`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variant_id: variantId }),
      });

      if (!res.ok) throw new Error('Failed to declare winner');

      var updated = await res.json();
      setTests(tests.map((t) => (t.id === testId ? updated : t)));
    } catch (err) {
      console.error('Declare winner error:', err);
    }
  };

  var getQuizTitle = (quizId: string) => {
    return quizzes.find((q) => q.id === quizId)?.title || quizId.slice(0, 8) + '...';
  };

  if (authStatus !== 'ready' || loading) {
    return (
      <DashboardShell>
        <PageLoading />
      </DashboardShell>
    );
  }

  if (!quiz) {
    return (
      <DashboardShell>
        <EmptyState
          title="Quiz not found"
          body="The quiz you're looking for doesn't exist or you don't have access."
          action={<GhostButton onClick={() => router.push('/dashboard/quizzes')}>Back to Quizzes</GhostButton>}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Back link */}
      <div style={{ marginBottom: 16 }}>
        <a
          href="/dashboard/quizzes"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontWeight: 500,
            color: C.GRAY_500,
            textDecoration: 'none',
            fontFamily: C.FONT,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.ACCENT; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.GRAY_500; }}
        >
          {BackIcon}
          Back to Quizzes
        </a>
      </div>

      <PageHeader
        title="A/B Testing"
        subtitle={`Split traffic between quiz variants to optimize conversions for "${quiz.title}".`}
        actions={
          !showForm ? (
            <PrimaryButton onClick={() => setShowForm(true)}>
              {SplitIcon}
              Create New Test
            </PrimaryButton>
          ) : undefined
        }
      />

      {/* ── Create Test Form ─────────────────── */}
      {showForm && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>New A/B Test</h2>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT }}>
              Select which quiz variants to test and set their traffic weights.
            </p>
          </div>

          {formError && (
            <div
              style={{
                background: C.DANGER_LIGHT,
                border: '1px solid rgba(180,35,24,0.2)',
                color: C.DANGER,
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 20,
                fontSize: 14,
                fontFamily: C.FONT,
              }}
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateTest}>
            {/* Test Name */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: C.GRAY_700, marginBottom: 6, fontFamily: C.FONT }}>
                Test Name
              </label>
              <input
                type="text"
                placeholder="e.g., Homepage CTA Test"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = C.ACCENT;
                  e.currentTarget.style.boxShadow = C.FOCUS_RING;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = C.GRAY_300;
                  e.currentTarget.style.boxShadow = C.SHADOW_XS;
                }}
              />
            </div>

            {/* Variant Count */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: C.GRAY_700, marginBottom: 6, fontFamily: C.FONT }}>
                Number of Variants
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => handleVariantCountChange(count)}
                    style={{
                      padding: '8px 20px',
                      background: variantCount === count ? C.ACCENT : C.SURFACE,
                      color: variantCount === count ? '#FFFFFF' : C.GRAY_700,
                      border: '1px solid ' + (variantCount === count ? C.ACCENT : C.GRAY_300),
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: C.FONT,
                      boxShadow: C.SHADOW_XS,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {count} variants
                  </button>
                ))}
              </div>
            </div>

            {/* Variants */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: C.GRAY_700, marginBottom: 12, fontFamily: C.FONT }}>
                Variants
              </label>
              {variantData.map((variant, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-end',
                    marginBottom: i < variantData.length - 1 ? 12 : 0,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, color: C.GRAY_500, marginBottom: 4, fontFamily: C.FONT }}>
                      Variant {String.fromCharCode(65 + i)} — Quiz
                    </label>
                    <select
                      value={variant.quizId}
                      onChange={(e) => handleVariantChange(i, 'quizId', e.target.value)}
                      style={{
                        ...inputStyle,
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 14px center',
                        paddingRight: 36,
                      }}
                    >
                      <option value="">Select a quiz...</option>
                      {quizzes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title} {q.id === params.id ? ' (current)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ width: 110 }}>
                    <label style={{ display: 'block', fontSize: 12, color: C.GRAY_500, marginBottom: 4, fontFamily: C.FONT }}>
                      Weight (%)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={variant.weight}
                      onChange={(e) => handleVariantChange(i, 'weight', e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = C.ACCENT;
                        e.currentTarget.style.boxShadow = C.FOCUS_RING;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = C.GRAY_300;
                        e.currentTarget.style.boxShadow = C.SHADOW_XS;
                      }}
                    />
                  </div>
                </div>
              ))}

              {/* Weight summary */}
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 14px',
                  background: C.GRAY_50,
                  borderRadius: 6,
                  fontSize: 13,
                  color: C.GRAY_500,
                  fontFamily: C.FONT,
                }}
              >
                Total weight: {variantData.reduce((sum, v) => sum + (parseFloat(v.weight) || 0), 0)}% — will be normalized to 100%.
              </div>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', gap: 12 }}>
              <PrimaryButton type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Test'}
              </PrimaryButton>
              <GhostButton
                onClick={() => {
                  setShowForm(false);
                  setFormError('');
                }}
              >
                Cancel
              </GhostButton>
            </div>
          </form>
        </Card>
      )}

      {/* ── Tests List ───────────────────────── */}
      {tests.length === 0 && !showForm ? (
        <EmptyState
          icon={SplitIcon}
          title="No A/B tests yet"
          body="Create your first split test to start optimizing this quiz for higher conversions."
          action={
            <PrimaryButton onClick={() => setShowForm(true)}>
              {SplitIcon}
              Create First Test
            </PrimaryButton>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tests.map((test) => {
            var sp = statusPill(test.status);
            return (
              <Card key={test.id}>
                {/* Test Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>{test.name}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>
                      Created {new Date(test.created_at).toLocaleDateString()}
                      {test.ended_at && ` — Ended ${new Date(test.ended_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: sp.bg,
                      border: '1px solid ' + sp.color + '30',
                      borderRadius: 16,
                      padding: '4px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: sp.color,
                      fontFamily: C.FONT,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: sp.color }} />
                    {sp.label}
                  </span>
                </div>

                {/* Variants table */}
                <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.FONT }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid ' + C.GRAY_200 }}>
                        <th style={{ textAlign: 'left', padding: '10px 0', fontSize: 12, fontWeight: 500, color: C.GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Variant
                        </th>
                        <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, fontWeight: 500, color: C.GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Weight
                        </th>
                        <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, fontWeight: 500, color: C.GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Impressions
                        </th>
                        <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, fontWeight: 500, color: C.GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Conversions
                        </th>
                        <th style={{ textAlign: 'right', padding: '10px 0', fontSize: 12, fontWeight: 500, color: C.GRAY_500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Conv. Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {test.variants.map((variant, i) => {
                        var stat = test.stats?.find((s) => s.variant_id === variant.variant_id);
                        var isWinner = test.winner_variant_id === variant.variant_id;
                        return (
                          <tr
                            key={variant.variant_id}
                            style={{
                              borderBottom: i < test.variants.length - 1 ? '1px solid ' + C.GRAY_100 : 'none',
                              background: isWinner ? C.BRAND_25 : 'transparent',
                            }}
                          >
                            <td style={{ padding: '12px 0', fontSize: 14, color: C.GRAY_900, fontFamily: C.FONT }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 500 }}>{String.fromCharCode(65 + i)}.</span>
                                <span style={{ color: isWinner ? C.ACCENT : C.GRAY_900 }}>
                                  {getQuizTitle(variant.quiz_id)}
                                </span>
                                {isWinner && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      fontSize: 11,
                                      background: C.ACCENT,
                                      color: '#FFFFFF',
                                      borderRadius: 12,
                                      padding: '2px 10px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {TrophyIcon} Winner
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px 12px', fontSize: 14, color: C.GRAY_600, fontFamily: C.FONT }}>
                              {variant.weight.toFixed(0)}%
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px 12px', fontSize: 14, color: C.GRAY_900, fontVariantNumeric: 'tabular-nums', fontFamily: C.FONT }}>
                              {stat?.impressions ?? 0}
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px 12px', fontSize: 14, color: C.GRAY_900, fontVariantNumeric: 'tabular-nums', fontFamily: C.FONT }}>
                              {stat?.conversions ?? 0}
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px 0', fontSize: 14, color: C.ACCENT, fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontFamily: C.FONT }}>
                              {(stat?.conversion_rate ?? 0).toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10 }}>
                  {test.status === 'draft' && (
                    <PrimaryButton onClick={() => handleStatusChange(test.id, 'running')}>
                      {PlayIcon}
                      Start Test
                    </PrimaryButton>
                  )}

                  {test.status === 'running' && (
                    <>
                      <GhostButton onClick={() => handleStatusChange(test.id, 'paused')}>
                        {PauseIcon}
                        Pause
                      </GhostButton>
                      {test.stats && test.stats.length > 0 && (
                        <PrimaryButton
                          onClick={() => {
                            var winner = test.stats!.reduce((prev, current) =>
                              prev.conversion_rate > current.conversion_rate ? prev : current
                            );
                            handleDeclareWinner(test.id, winner.variant_id);
                          }}
                        >
                          {TrophyIcon}
                          Declare Winner
                        </PrimaryButton>
                      )}
                    </>
                  )}

                  {test.status === 'paused' && (
                    <PrimaryButton onClick={() => handleStatusChange(test.id, 'running')}>
                      {PlayIcon}
                      Resume Test
                    </PrimaryButton>
                  )}

                  {test.status === 'completed' && (
                    <div
                      style={{
                        width: '100%',
                        background: C.SUCCESS_LIGHT,
                        border: '1px solid rgba(2,122,72,0.2)',
                        borderRadius: 8,
                        padding: '10px 14px',
                        textAlign: 'center',
                        color: C.SUCCESS,
                        fontSize: 14,
                        fontWeight: 500,
                        fontFamily: C.FONT,
                      }}
                    >
                      Test completed on {new Date(test.ended_at!).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}

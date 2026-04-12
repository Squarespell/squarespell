'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

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

export default function ABTestingPage({ params }: { params: { id: string } }) {
  const { getToken } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  // Form state
  const [testName, setTestName] = useState('');
  const [variantCount, setVariantCount] = useState(2);
  const [variantData, setVariantData] = useState<Array<{ quizId: string; weight: string }>>([
    { quizId: '', weight: '50' },
    { quizId: '', weight: '50' },
  ]);

  // Fetch quiz and tests
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        // Fetch quiz
        const quizRes = await fetch(`${API}/api/quizzes/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!quizRes.ok) {
          setLoading(false);
          return;
        }
        const quizData = await quizRes.json();
        setQuiz(quizData);

        // Fetch all quizzes for variant selection
        const allQuizzesRes = await fetch(`${API}/api/quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (allQuizzesRes.ok) {
          const allQuizzes = await allQuizzesRes.json();
          setQuizzes(allQuizzes);
        }

        // Fetch tests for this quiz
        const testsRes = await fetch(`${API}/api/quizzes/${params.id}/ab-tests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!testsRes.ok) {
          setLoading(false);
          return;
        }
        const testsData = await testsRes.json();

        // Fetch stats for each test
        const testsWithStats = await Promise.all(
          testsData.map(async (test: ABTest) => {
            try {
              const statsRes = await fetch(`${API}/api/ab-tests/tests/${test.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (statsRes.ok) {
                const testWithStats = await statsRes.json();
                return testWithStats;
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
  }, [params.id, getToken]);

  const handleVariantCountChange = (newCount: number) => {
    setVariantCount(newCount);
    const newData = Array(newCount)
      .fill(null)
      .map((_, i) => {
        if (i < variantData.length) return variantData[i];
        return { quizId: '', weight: String(Math.round(100 / newCount)) };
      });
    setVariantData(newData);
  };

  const handleVariantChange = (index: number, field: 'quizId' | 'weight', value: string) => {
    const newData = [...variantData];
    if (field === 'quizId') {
      newData[index].quizId = value;
    } else {
      newData[index].weight = value;
    }
    setVariantData(newData);
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!testName.trim()) {
      setFormError('Test name is required');
      return;
    }

    // Validate variants
    const selectedQuizzes = new Set<string>();
    let totalWeight = 0;

    for (const v of variantData) {
      if (!v.quizId) {
        setFormError('All variants must select a quiz');
        return;
      }
      if (selectedQuizzes.has(v.quizId)) {
        setFormError('Each variant must use a different quiz');
        return;
      }
      selectedQuizzes.add(v.quizId);

      const weight = parseFloat(v.weight);
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
      const token = await getToken();
      if (!token) {
        setFormError('Authentication failed');
        return;
      }

      // Normalize weights to sum to 100
      const variants: Variant[] = variantData.map((v, i) => ({
        variant_id: `variant-${i}`,
        quiz_id: v.quizId,
        weight: parseFloat(v.weight) / totalWeight * 100,
      }));

      const res = await fetch(`${API}/api/quizzes/${params.id}/ab-tests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: testName,
          variants,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || 'Failed to create test');
        setCreating(false);
        return;
      }

      const newTest = await res.json();
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

  const handleStatusChange = async (testId: string, newStatus: 'running' | 'paused') => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API}/api/ab-tests/tests/${testId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      const updated = await res.json();
      setTests(tests.map(t => (t.id === testId ? updated : t)));
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const handleDeclareWinner = async (testId: string, variantId: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API}/api/ab-tests/tests/${testId}/winner`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variant_id: variantId }),
      });

      if (!res.ok) throw new Error('Failed to declare winner');

      const updated = await res.json();
      setTests(tests.map(t => (t.id === testId ? updated : t)));
    } catch (err) {
      console.error('Declare winner error:', err);
    }
  };

  const getQuizTitle = (quizId: string) => {
    return quizzes.find(q => q.id === quizId)?.title || quizId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return '#4ade80';
      case 'draft':
        return 'rgba(240,242,245,.5)';
      case 'paused':
        return '#f59e0b';
      case 'completed':
        return '#D2FF1D';
      default:
        return 'rgba(240,242,245,.5)';
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#07090c', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(210,255,29,.2)', borderTopColor: '#D2FF1D', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={{ background: '#07090c', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0f2f5', fontFamily: 'DM Sans, sans-serif' }}>
        <p>Quiz not found.</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
        body{font-family:'DM Sans',system-ui,sans-serif;background:#07090c;color:#f0f2f5}
        :root{--acc:#D2FF1D;--g1:rgba(255,255,255,.055);--g2:rgba(255,255,255,.034);--b1:rgba(255,255,255,.09);--b2:rgba(255,255,255,.058);--t1:#f0f2f5;--t3:rgba(240,242,245,.42);--t4:rgba(240,242,245,.22)}
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--acc)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>A/B Testing</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.04em', marginBottom: 8 }}>{quiz.title}</h1>
          <p style={{ fontSize: 14, color: 'var(--t3)' }}>Split traffic between variant quizzes to test and optimize for higher conversions.</p>
        </div>

        {/* Create Test Button */}
        <div style={{ marginBottom: 32 }}>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: 'var(--acc)',
                color: '#07090c',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Create New Test
            </button>
          )}
        </div>

        {/* Create Test Form */}
        {showForm && (
          <div style={{ background: 'var(--g1)', border: '.5px solid var(--b1)', borderRadius: 14, padding: 32, marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>New A/B Test</h2>

            {formError && (
              <div style={{ background: 'rgba(239,68,68,.1)', border: '.5px solid rgba(239,68,68,.3)', color: '#f87171', borderRadius: 8, padding: 12, marginBottom: 24, fontSize: 13 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTest}>
              {/* Test Name */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Test Name</label>
                <input
                  type="text"
                  placeholder="e.g., Homepage CTA Test"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#07090c',
                    border: '.5px solid var(--b1)',
                    borderRadius: 8,
                    color: '#f0f2f5',
                    fontSize: 14,
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                />
              </div>

              {/* Variant Count */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Number of Variants</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handleVariantCountChange(count)}
                      style={{
                        padding: '8px 16px',
                        background: variantCount === count ? 'var(--acc)' : 'var(--g2)',
                        color: variantCount === count ? '#07090c' : '#f0f2f5',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variants */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Variants</label>
                {variantData.map((variant, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < variantData.length - 1 ? 12 : 0 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>Quiz</label>
                      <select
                        value={variant.quizId}
                        onChange={(e) => handleVariantChange(i, 'quizId', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: '#07090c',
                          border: '.5px solid var(--b1)',
                          borderRadius: 8,
                          color: '#f0f2f5',
                          fontSize: 14,
                          fontFamily: 'DM Sans, sans-serif',
                        }}
                      >
                        <option value="">Select a quiz</option>
                        {quizzes.filter(q => q.id !== params.id).map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ width: 100 }}>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>Weight</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={variant.weight}
                        onChange={(e) => handleVariantChange(i, 'weight', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: '#07090c',
                          border: '.5px solid var(--b1)',
                          borderRadius: 8,
                          color: '#f0f2f5',
                          fontSize: 14,
                          fontFamily: 'DM Sans, sans-serif',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    background: 'var(--acc)',
                    color: '#07090c',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 24px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: creating ? 'not-allowed' : 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    opacity: creating ? 0.6 : 1,
                  }}
                >
                  {creating ? 'Creating...' : 'Create Test'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError('');
                  }}
                  style={{
                    background: 'var(--g2)',
                    color: '#f0f2f5',
                    border: '.5px solid var(--b1)',
                    borderRadius: 8,
                    padding: '10px 24px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tests List */}
        {tests.length === 0 ? (
          <div style={{ background: 'var(--g1)', border: '.5px solid var(--b1)', borderRadius: 14, padding: 48, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--t3)', marginBottom: 16 }}>No A/B tests created yet.</p>
            <p style={{ fontSize: 12, color: 'var(--t4)' }}>Create your first test to start optimizing this quiz.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {tests.map((test) => (
              <div key={test.id} style={{ background: 'var(--g1)', border: '.5px solid var(--b1)', borderRadius: 14, padding: 24, overflow: 'hidden' }}>
                {/* Test Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{test.name}</h3>
                    <p style={{ fontSize: 12, color: 'var(--t3)' }}>
                      Created {new Date(test.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: `${getStatusColor(test.status)}20`,
                        border: `.5px solid ${getStatusColor(test.status)}40`,
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: getStatusColor(test.status),
                        textTransform: 'capitalize',
                      }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: getStatusColor(test.status) }} />
                      {test.status}
                    </div>
                  </div>
                </div>

                {/* Stats Table */}
                {test.stats && test.stats.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.04em' }}>Results</p>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '.5px solid var(--b1)' }}>
                            <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: 600, color: 'var(--t3)' }}>Variant</th>
                            <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: 'var(--t3)' }}>Impressions</th>
                            <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: 'var(--t3)' }}>Conversions</th>
                            <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: 'var(--t3)' }}>Conversion Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {test.variants.map((variant, i) => {
                            const stat = test.stats?.find(s => s.variant_id === variant.variant_id);
                            const isWinner = test.winner_variant_id === variant.variant_id;
                            return (
                              <tr
                                key={variant.variant_id}
                                style={{
                                  borderBottom: i < test.variants.length - 1 ? '.5px solid var(--b2)' : 'none',
                                  background: isWinner ? 'rgba(210,255,29,.05)' : 'transparent',
                                }}
                              >
                                <td style={{ padding: '12px 0', color: isWinner ? 'var(--acc)' : '#f0f2f5' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {getQuizTitle(variant.quiz_id)}
                                    {isWinner && <span style={{ fontSize: 11, background: 'var(--acc)', color: '#07090c', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>Winner</span>}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--t1)' }}>{stat?.impressions ?? 0}</td>
                                <td style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--t1)' }}>{stat?.conversions ?? 0}</td>
                                <td style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--acc)', fontWeight: 600 }}>
                                  {stat?.conversion_rate.toFixed(2)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {test.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange(test.id, 'running')}
                    style={{
                      width: '100%',
                      background: 'var(--acc)',
                      color: '#07090c',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    Start Test
                  </button>
                )}

                {test.status === 'running' && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => handleStatusChange(test.id, 'paused')}
                      style={{
                        flex: 1,
                        background: 'var(--g2)',
                        color: '#f0f2f5',
                        border: '.5px solid var(--b1)',
                        borderRadius: 8,
                        padding: '10px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      Pause
                    </button>
                    {test.stats && test.stats.length > 0 && (
                      <button
                        onClick={() => {
                          const winner = test.stats.reduce((prev, current) =>
                            prev.conversion_rate > current.conversion_rate ? prev : current
                          );
                          handleDeclareWinner(test.id, winner.variant_id);
                        }}
                        style={{
                          flex: 1,
                          background: 'var(--acc)',
                          color: '#07090c',
                          border: 'none',
                          borderRadius: 8,
                          padding: '10px',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'DM Sans, sans-serif',
                        }}
                      >
                        Declare Winner
                      </button>
                    )}
                  </div>
                )}

                {test.status === 'paused' && (
                  <button
                    onClick={() => handleStatusChange(test.id, 'running')}
                    style={{
                      width: '100%',
                      background: 'var(--acc)',
                      color: '#07090c',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    Resume Test
                  </button>
                )}

                {test.status === 'completed' && (
                  <div
                    style={{
                      background: 'rgba(74,222,128,.05)',
                      border: '.5px solid rgba(74,222,128,.3)',
                      borderRadius: 8,
                      padding: 12,
                      textAlign: 'center',
                      color: '#4ade80',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Test completed on {new Date(test.ended_at!).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

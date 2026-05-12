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

/* ── Shared styles ───────────────────── */
var cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid ' + C.GRAY_200,
  borderRadius: 16,
  boxShadow: C.SHADOW_XS,
};

var inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: '#fff',
  border: '1px solid ' + C.GRAY_200,
  borderRadius: 10,
  color: C.GRAY_900,
  fontSize: 14,
  fontFamily: C.FONT,
  outline: 'none',
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

/* ── Status helpers ─────────────────── */
function statusPill(status: string) {
  switch (status) {
    case 'running':
      return { bg: C.SUCCESS_LIGHT, color: C.SUCCESS, label: 'Running' };
    case 'draft':
      return { bg: C.GRAY_100, color: C.GRAY_600, label: 'Draft' };
    case 'paused':
      return { bg: '#FEF3CD', color: '#B45309', label: 'Paused' };
    case 'completed':
      return { bg: C.BRAND_50, color: C.ACCENT, label: 'Completed' };
    default:
      return { bg: C.GRAY_100, color: C.GRAY_600, label: status };
  }
}

var variantColors = ['#0f7377', '#7C3AED', '#EA580C', '#0284C7'];
var variantLabels = ['A', 'B', 'C', 'D'];

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

  useEffect(() => {
    if (authStatus !== 'ready' || !token) return;

    var fetchData = async () => {
      try {
        var quizRes = await fetch(`${API}/api/quizzes/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!quizRes.ok) { setLoading(false); return; }
        var quizData = await quizRes.json();
        setQuiz(quizData);

        var allQuizzesRes = await fetch(`${API}/api/quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (allQuizzesRes.ok) {
          var allQuizzes = await allQuizzesRes.json();
          setQuizzes(allQuizzes);
        }

        var testsRes = await fetch(`${API}/api/quizzes/${params.id}/ab-tests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!testsRes.ok) { setLoading(false); return; }
        var testsData = await testsRes.json();

        var testsWithStats = await Promise.all(
          testsData.map(async (test: ABTest) => {
            try {
              var statsRes = await fetch(`${API}/api/quizzes/tests/${test.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (statsRes.ok) return await statsRes.json();
              return test;
            } catch { return test; }
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
    var evenWeight = String(Math.round(100 / newCount));
    var newData = Array(newCount)
      .fill(null)
      .map((_, i) => {
        if (i < variantData.length) return variantData[i];
        return { quizId: '', weight: evenWeight };
      });
    setVariantData(newData);
  };

  var handleVariantChange = (index: number, field: 'quizId' | 'weight', value: string) => {
    var newData = [...variantData];
    if (field === 'quizId') newData[index].quizId = value;
    else newData[index].weight = value;
    setVariantData(newData);
  };

  var handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!testName.trim()) { setFormError('Test name is required'); return; }

    var selectedQuizzes = new Set<string>();
    var totalWeight = 0;
    for (var v of variantData) {
      if (!v.quizId) { setFormError('All variants must select a quiz'); return; }
      if (selectedQuizzes.has(v.quizId)) { setFormError('Each variant must use a different quiz'); return; }
      selectedQuizzes.add(v.quizId);
      var weight = parseFloat(v.weight);
      if (isNaN(weight) || weight <= 0) { setFormError('All weights must be positive numbers'); return; }
      totalWeight += weight;
    }
    if (totalWeight === 0) { setFormError('Total weight must be greater than 0'); return; }

    setCreating(true);
    try {
      var variants: Variant[] = variantData.map((v, i) => ({
        variant_id: `variant-${i}`,
        quiz_id: v.quizId,
        weight: (parseFloat(v.weight) / totalWeight) * 100,
      }));

      var res = await fetch(`${API}/api/quizzes/${params.id}/ab-tests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: testName, variants }),
      });

      if (!res.ok) { var err = await res.json(); setFormError(err.error || 'Failed to create test'); setCreating(false); return; }

      var newTest = await res.json();
      setTests([newTest, ...tests]);
      setTestName('');
      setVariantData([{ quizId: '', weight: '50' }, { quizId: '', weight: '50' }]);
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      var updated = await res.json();
      setTests(tests.map((t) => (t.id === testId ? updated : t)));
    } catch (err) { console.error('Status update error:', err); }
  };

  var handleDeclareWinner = async (testId: string, variantId: string) => {
    try {
      var res = await fetch(`${API}/api/quizzes/tests/${testId}/winner`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_id: variantId }),
      });
      if (!res.ok) throw new Error('Failed to declare winner');
      var updated = await res.json();
      setTests(tests.map((t) => (t.id === testId ? updated : t)));
    } catch (err) { console.error('Declare winner error:', err); }
  };

  var handleDeleteTest = async (testId: string) => {
    if (!confirm('Delete this A/B test? This cannot be undone.')) return;
    try {
      var res = await fetch(`${API}/api/quizzes/tests/${testId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 404) {
        setTests(tests.filter((t) => t.id !== testId));
      }
    } catch (err) { console.error('Delete error:', err); }
  };

  var getQuizTitle = (quizId: string) => {
    return quizzes.find((q) => q.id === quizId)?.title || quizId.slice(0, 8) + '...';
  };

  if (authStatus !== 'ready' || loading) {
    return (
      <DashboardShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, fontFamily: C.FONT, color: C.GRAY_400, fontSize: 14 }}>
          Loading...
        </div>
      </DashboardShell>
    );
  }

  if (!quiz) {
    return (
      <DashboardShell>
        <div style={{ ...cardStyle, padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 8 }}>Quiz not found</div>
          <div style={{ fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT, marginBottom: 20 }}>
            The quiz you're looking for doesn't exist or you don't have access.
          </div>
          <button onClick={() => router.push('/dashboard/quizzes')} style={{
            padding: '10px 20px', borderRadius: 10, border: '1px solid ' + C.GRAY_200,
            background: '#fff', color: C.GRAY_700, fontSize: 14, fontWeight: 600,
            fontFamily: C.FONT, cursor: 'pointer',
          }}>
            Back to Quizzes
          </button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <style>{`
        .ab-btn:hover { transform: translateY(-1px); box-shadow: ${C.SHADOW_MD}; }
        .ab-btn:active { transform: translateY(0); }
        .ab-input:focus { border-color: ${C.ACCENT} !important; box-shadow: ${C.FOCUS_RING} !important; }
        .ab-card:hover { box-shadow: ${C.SHADOW_MD}; }
        .ab-back:hover { color: ${C.ACCENT} !important; }
        .ab-row:hover { background: ${C.GRAY_50}; }
        .ab-del:hover { background: #FEF3F2 !important; border-color: #F04438 !important; color: #F04438 !important; }
      `}</style>

      {/* Back link */}
      <a href="/dashboard/quizzes" className="ab-back" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 14, fontWeight: 500, color: C.GRAY_500, textDecoration: 'none',
        fontFamily: C.FONT, marginBottom: 20, transition: 'color 0.15s',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Quizzes
      </a>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, lineHeight: 1.3 }}>
            A/B Testing
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT }}>
            Split traffic between quiz variants to optimize conversions for &ldquo;{quiz.title}&rdquo;.
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="ab-btn" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600,
            fontFamily: C.FONT, cursor: 'pointer', boxShadow: C.SHADOW_XS,
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
            Create New Test
          </button>
        )}
      </div>

      {/* ── Create Test Form ─────────────────── */}
      {showForm && (
        <div style={{ ...cardStyle, padding: 28, marginBottom: 24 }} className="ab-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: C.BRAND_50,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>New A/B Test</h2>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>
                Select quiz variants and set traffic weights.
              </p>
            </div>
          </div>

          {formError && (
            <div style={{
              background: '#FEF3F2', border: '1px solid #FEE4E2', color: '#B42318',
              borderRadius: 10, padding: '10px 14px', marginBottom: 20,
              fontSize: 13, fontFamily: C.FONT, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B42318" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateTest}>
            {/* Test Name */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.GRAY_700, marginBottom: 6, fontFamily: C.FONT }}>
                Test Name
              </label>
              <input
                type="text"
                className="ab-input"
                placeholder="e.g., Homepage CTA Test"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Variant Count */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.GRAY_700, marginBottom: 6, fontFamily: C.FONT }}>
                Number of Variants
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[2, 3, 4].map((count) => (
                  <button key={count} type="button" onClick={() => handleVariantCountChange(count)} style={{
                    padding: '8px 20px',
                    background: variantCount === count ? C.ACCENT : '#fff',
                    color: variantCount === count ? '#fff' : C.GRAY_700,
                    border: '1px solid ' + (variantCount === count ? C.ACCENT : C.GRAY_200),
                    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: C.FONT, transition: 'all 0.15s',
                  }}>
                    {count} variants
                  </button>
                ))}
              </div>
            </div>

            {/* Variants */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.GRAY_700, marginBottom: 10, fontFamily: C.FONT }}>
                Variants
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {variantData.map((variant, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'center',
                    padding: '12px 16px', background: C.GRAY_50, borderRadius: 10,
                    border: '1px solid ' + C.GRAY_100,
                  }}>
                    {/* Variant badge */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: variantColors[i], color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, fontFamily: C.FONT, flexShrink: 0,
                    }}>
                      {variantLabels[i]}
                    </div>
                    {/* Quiz select */}
                    <div style={{ flex: 1 }}>
                      <select
                        className="ab-input"
                        value={variant.quizId}
                        onChange={(e) => handleVariantChange(i, 'quizId', e.target.value)}
                        style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}
                      >
                        <option value="">Select a quiz...</option>
                        {quizzes.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.title}{q.id === params.id ? ' (current)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Weight */}
                    <div style={{ width: 90 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          className="ab-input"
                          min="1"
                          step="1"
                          value={variant.weight}
                          onChange={(e) => handleVariantChange(i, 'weight', e.target.value)}
                          style={{ ...inputStyle, background: '#fff', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, flexShrink: 0 }}>%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Weight summary */}
              <div style={{
                marginTop: 10, padding: '8px 14px', background: C.BRAND_25, borderRadius: 8,
                fontSize: 12, color: C.ACCENT, fontFamily: C.FONT, fontWeight: 500,
              }}>
                Total: {variantData.reduce((sum, v) => sum + (parseFloat(v.weight) || 0), 0)}% &mdash; will be normalized to 100%.
              </div>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="ab-btn" disabled={creating} style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: creating ? C.GRAY_200 : C.ACCENT,
                color: creating ? C.GRAY_400 : '#fff',
                fontSize: 14, fontWeight: 600, fontFamily: C.FONT,
                cursor: creating ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}>
                {creating ? 'Creating...' : 'Create Test'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setFormError(''); }} style={{
                padding: '10px 20px', borderRadius: 10,
                border: '1px solid ' + C.GRAY_200, background: '#fff',
                color: C.GRAY_700, fontSize: 14, fontWeight: 600,
                fontFamily: C.FONT, cursor: 'pointer',
              }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tests List ───────────────────────── */}
      {tests.length === 0 && !showForm ? (
        <div style={{ ...cardStyle, padding: '56px 24px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: C.BRAND_50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, margin: '0 0 8px' }}>
            No A/B tests yet
          </h3>
          <p style={{ fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT, margin: '0 0 24px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
            Create your first split test to optimize this quiz for higher conversions.
          </p>
          <button onClick={() => setShowForm(true)} className="ab-btn" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600,
            fontFamily: C.FONT, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
            Create First Test
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tests.map((test) => {
            var sp = statusPill(test.status);
            var totalImpressions = test.stats?.reduce((s, st) => s + st.impressions, 0) || 0;
            var totalConversions = test.stats?.reduce((s, st) => s + st.conversions, 0) || 0;
            var overallRate = totalImpressions > 0 ? (totalConversions / totalImpressions * 100) : 0;

            return (
              <div key={test.id} style={{ ...cardStyle, overflow: 'hidden' }} className="ab-card">
                {/* Test Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid ' + C.GRAY_100 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, background: C.BRAND_50,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                        </svg>
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>{test.name}</h3>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.GRAY_400, fontFamily: C.FONT }}>
                          Created {new Date(test.created_at).toLocaleDateString()}
                          {test.ended_at && ` · Ended ${new Date(test.ended_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: sp.bg, borderRadius: 16, padding: '4px 12px',
                        fontSize: 12, fontWeight: 600, color: sp.color, fontFamily: C.FONT,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sp.color }} />
                        {sp.label}
                      </span>
                      <button onClick={() => handleDeleteTest(test.id)} className="ab-del" title="Delete test" style={{
                        width: 32, height: 32, borderRadius: 8, border: '1px solid ' + C.GRAY_200,
                        background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: C.GRAY_400, transition: 'all 0.15s',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Summary stat bar */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                  borderBottom: '1px solid ' + C.GRAY_100,
                }}>
                  {[
                    { label: 'Total Impressions', value: totalImpressions.toLocaleString() },
                    { label: 'Total Conversions', value: totalConversions.toLocaleString() },
                    { label: 'Overall Conv. Rate', value: overallRate.toFixed(1) + '%' },
                  ].map((stat, si) => (
                    <div key={si} style={{
                      padding: '14px 24px',
                      borderRight: si < 2 ? '1px solid ' + C.GRAY_100 : 'none',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: C.GRAY_400, fontFamily: C.FONT, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                        {stat.label}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, fontVariantNumeric: 'tabular-nums' }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Variants */}
                <div style={{ padding: '0' }}>
                  {test.variants.map((variant, i) => {
                    var stat = test.stats?.find((s) => s.variant_id === variant.variant_id);
                    var isWinner = test.winner_variant_id === variant.variant_id;
                    var impressions = stat?.impressions ?? 0;
                    var conversions = stat?.conversions ?? 0;
                    var rate = impressions > 0 ? (conversions / impressions * 100) : 0;

                    return (
                      <div key={variant.variant_id} className="ab-row" style={{
                        padding: '14px 24px',
                        borderBottom: i < test.variants.length - 1 ? '1px solid ' + C.GRAY_100 : 'none',
                        display: 'flex', alignItems: 'center', gap: 16,
                        background: isWinner ? C.BRAND_25 : 'transparent',
                        transition: 'background 0.15s',
                      }}>
                        {/* Variant badge */}
                        <div style={{
                          width: 28, height: 28, borderRadius: 7,
                          background: variantColors[i] || C.GRAY_300, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, fontFamily: C.FONT, flexShrink: 0,
                        }}>
                          {variantLabels[i]}
                        </div>

                        {/* Quiz name */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {getQuizTitle(variant.quiz_id)}
                          </div>
                          {isWinner && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 11, background: C.ACCENT, color: '#fff',
                              borderRadius: 12, padding: '2px 8px', fontWeight: 600, marginTop: 4,
                            }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 22V12M14 22V12M8 6h8a2 2 0 012 2v4a6 6 0 01-12 0V8a2 2 0 012-2z" />
                              </svg>
                              Winner
                            </span>
                          )}
                        </div>

                        {/* Stats */}
                        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexShrink: 0 }}>
                          <div style={{ textAlign: 'right', minWidth: 60 }}>
                            <div style={{ fontSize: 11, color: C.GRAY_400, fontFamily: C.FONT, marginBottom: 2 }}>Weight</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.GRAY_700, fontFamily: C.FONT, fontVariantNumeric: 'tabular-nums' }}>
                              {variant.weight.toFixed(0)}%
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', minWidth: 60 }}>
                            <div style={{ fontSize: 11, color: C.GRAY_400, fontFamily: C.FONT, marginBottom: 2 }}>Views</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT, fontVariantNumeric: 'tabular-nums' }}>
                              {impressions.toLocaleString()}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', minWidth: 60 }}>
                            <div style={{ fontSize: 11, color: C.GRAY_400, fontFamily: C.FONT, marginBottom: 2 }}>Leads</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT, fontVariantNumeric: 'tabular-nums' }}>
                              {conversions.toLocaleString()}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', minWidth: 70 }}>
                            <div style={{ fontSize: 11, color: C.GRAY_400, fontFamily: C.FONT, marginBottom: 2 }}>Conv.</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: rate > 0 ? C.ACCENT : C.GRAY_400, fontFamily: C.FONT, fontVariantNumeric: 'tabular-nums' }}>
                              {rate.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid ' + C.GRAY_100, display: 'flex', gap: 10, alignItems: 'center' }}>
                  {test.status === 'draft' && (
                    <button onClick={() => handleStatusChange(test.id, 'running')} className="ab-btn" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 20px', borderRadius: 8, border: 'none',
                      background: C.ACCENT, color: '#fff', fontSize: 13, fontWeight: 600,
                      fontFamily: C.FONT, cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Start Test
                    </button>
                  )}

                  {test.status === 'running' && (
                    <>
                      <button onClick={() => handleStatusChange(test.id, 'paused')} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 20px', borderRadius: 8,
                        border: '1px solid ' + C.GRAY_200, background: '#fff',
                        color: C.GRAY_700, fontSize: 13, fontWeight: 600,
                        fontFamily: C.FONT, cursor: 'pointer',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                        </svg>
                        Pause
                      </button>
                      {test.stats && test.stats.length > 0 && (
                        <button onClick={() => {
                          var winner = test.stats!.reduce((prev, current) =>
                            prev.conversion_rate > current.conversion_rate ? prev : current
                          );
                          handleDeclareWinner(test.id, winner.variant_id);
                        }} className="ab-btn" style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '8px 20px', borderRadius: 8, border: 'none',
                          background: '#7C3AED', color: '#fff', fontSize: 13, fontWeight: 600,
                          fontFamily: C.FONT, cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 22V12M14 22V12M8 6h8a2 2 0 012 2v4a6 6 0 01-12 0V8a2 2 0 012-2z" />
                          </svg>
                          Declare Winner
                        </button>
                      )}
                      <div style={{ flex: 1 }} />
                      <div style={{ fontSize: 12, color: C.GRAY_400, fontFamily: C.FONT, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.SUCCESS, animation: 'pulse 2s infinite' }} />
                        Test is running — traffic is being split
                      </div>
                    </>
                  )}

                  {test.status === 'paused' && (
                    <button onClick={() => handleStatusChange(test.id, 'running')} className="ab-btn" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 20px', borderRadius: 8, border: 'none',
                      background: C.ACCENT, color: '#fff', fontSize: 13, fontWeight: 600,
                      fontFamily: C.FONT, cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Resume Test
                    </button>
                  )}

                  {test.status === 'completed' && (
                    <div style={{
                      flex: 1, background: C.SUCCESS_LIGHT, border: '1px solid #D1FAE5',
                      borderRadius: 8, padding: '10px 14px', textAlign: 'center',
                      color: C.SUCCESS, fontSize: 13, fontWeight: 600, fontFamily: C.FONT,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.SUCCESS} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      Test completed{test.ended_at ? ` on ${new Date(test.ended_at).toLocaleDateString()}` : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tips card */}
      {tests.length > 0 && (
        <div style={{
          ...cardStyle, padding: '20px 24px', marginTop: 20,
          background: C.GRAY_50, borderColor: C.GRAY_100,
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#EEF2FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 4 }}>
              A/B Testing Tips
            </div>
            <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.6 }}>
              Let tests run for at least 100 impressions per variant before declaring a winner.
              The more traffic each variant receives, the more statistically significant your results will be.
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

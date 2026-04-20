'use client';
import { EmptyState, PrimaryButton } from '@/app/dashboard/_components/PageShell';
import { DashboardShell, DASHBOARD_COLORS as C } from '@/app/dashboard/_components/DashboardShell';
import { useDashboardAuth } from '@/app/dashboard/_components/useDashboardAuth';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, ChevronDown } from 'lucide-react';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

interface Email {
  delay_days: number;
  subject: string;
  body: string;
  cta_url?: string;
  cta_text?: string;
}

interface SequenceConditions {
  outcome_ids?: string[];
  score_min?: number | null;
  score_max?: number | null;
  segments?: string[];
  mode?: string | null;
}

interface EmailSequence {
  id: string;
  name: string;
  emails: Email[];
  conditions: SequenceConditions;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface Outcome {
  id: string;
  title: string;
}

export default function SequencesPage() {
  var params = useParams();
  var router = useRouter();
  var quizId = params.id as string;
  var { token } = useDashboardAuth();

  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    emails: [{ delay_days: 0, subject: '', body: '', cta_url: '', cta_text: '' }] as Email[],
    conditions: {
      outcome_ids: [],
      score_min: null,
      score_max: null,
      segments: [],
      mode: null,
    } as SequenceConditions,
    enabled: true,
  });

  // Fetch quiz and sequences
  useEffect(function() {
    if (token) fetchQuizAndSequences();
  }, [quizId, token]);

  var fetchQuizAndSequences = async function() {
    try {
      setLoading(true);
      setError(null);
      var headers: Record<string, string> = { Authorization: 'Bearer ' + token };

      // Fetch quiz
      var quizRes = await fetch(API + '/api/quizzes/' + quizId, { headers: headers });
      if (!quizRes.ok) throw new Error('Failed to fetch quiz');
      var quizData = await quizRes.json();
      setQuiz(quizData);

      // Fetch sequences
      var seqRes = await fetch(API + '/api/quizzes/' + quizId + '/sequences', { headers: headers });
      if (!seqRes.ok) throw new Error('Failed to fetch sequences');
      var seqData = await seqRes.json();
      setSequences(seqData || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = () => {
    setFormData({
      ...formData,
      emails: [
        ...formData.emails,
        { delay_days: formData.emails.length * 3, subject: '', body: '', cta_url: '', cta_text: '' },
      ],
    });
  };

  const handleRemoveEmail = (index: number) => {
    setFormData({
      ...formData,
      emails: formData.emails.filter((_, i) => i !== index),
    });
  };

  const handleEmailChange = (index: number, field: keyof Email, value: any) => {
    const updated = [...formData.emails];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, emails: updated });
  };

  const handleConditionChange = (field: keyof SequenceConditions, value: any) => {
    setFormData({
      ...formData,
      conditions: {
        ...formData.conditions,
        [field]: value,
      },
    });
  };

  const handleOutcomeToggle = (outcomeId: string) => {
    const current = formData.conditions.outcome_ids || [];
    const updated = current.includes(outcomeId)
      ? current.filter(id => id !== outcomeId)
      : [...current, outcomeId];
    handleConditionChange('outcome_ids', updated);
  };

  const handleSegmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const segments = e.target.value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    handleConditionChange('segments', segments);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      setError('Sequence name is required');
      return;
    }

    if (formData.emails.length === 0) {
      setError('At least one email is required');
      return;
    }

    for (const email of formData.emails) {
      if (!email.subject.trim() || !email.body.trim()) {
        setError('All emails must have a subject and body');
        return;
      }
    }

    try {
      setError(null);
      var method = editingId ? 'PUT' : 'POST';
      var endpoint = editingId
        ? API + '/api/quizzes/' + quizId + '/sequences/' + editingId
        : API + '/api/quizzes/' + quizId + '/sequences';

      var res = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save sequence');
      }

      // Refresh sequences
      await fetchQuizAndSequences();

      // Reset form
      setShowCreateForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        emails: [{ delay_days: 0, subject: '', body: '', cta_url: '', cta_text: '' }],
        conditions: { outcome_ids: [], score_min: null, score_max: null, segments: [], mode: null },
        enabled: true,
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (seq: EmailSequence) => {
    setFormData({
      name: seq.name,
      emails: seq.emails,
      conditions: seq.conditions,
      enabled: seq.enabled,
    });
    setEditingId(seq.id);
    setShowCreateForm(true);
  };

  const handleDelete = async (seqId: string) => {
    if (!confirm('Are you sure you want to delete this sequence?')) return;

    try {
      var res = await fetch(API + '/api/quizzes/' + quizId + '/sequences/' + seqId, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchQuizAndSequences();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      emails: [{ delay_days: 0, subject: '', body: '', cta_url: '', cta_text: '' }],
      conditions: { outcome_ids: [], score_min: null, score_max: null, segments: [], mode: null },
      enabled: true,
    });
  };

  const conditionsSummary = (conditions: SequenceConditions) => {
    const parts = [];
    if (conditions.outcome_ids?.length) {
      parts.push(`${conditions.outcome_ids.length} outcome(s)`);
    }
    if (conditions.score_min !== null && conditions.score_min !== undefined) {
      parts.push(`score >= ${conditions.score_min}`);
    }
    if (conditions.score_max !== null && conditions.score_max !== undefined) {
      parts.push(`score <= ${conditions.score_max}`);
    }
    if (conditions.segments?.length) {
      parts.push(`segments: ${conditions.segments.join(', ')}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'All leads';
  };

  if (loading) {
    return (
      <DashboardShell title="Email Sequences">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
          <div style={{ width: 28, height: 28, border: '3px solid ' + C.BORDER, borderTopColor: C.ACCENT, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Email Sequences">
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button
            onClick={function() { router.back(); }}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: C.ELEVATED, border: '1px solid ' + C.BORDER,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ArrowLeft size={16} color={C.TEXT_MUTED} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.TEXT }}>{quiz?.title || 'Quiz'}</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: C.TEXT_MUTED }}>Email Sequences</p>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.2)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 18,
            fontSize: 13, color: '#cc3333',
          }}>
            {error}
          </div>
        )}

        {/* Create Button */}
        {!showCreateForm && (
          <PrimaryButton onClick={function() { setShowCreateForm(true); }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> New Sequence
            </span>
          </PrimaryButton>
        )}

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div style={{ background: C.ELEVATED, border: '1px solid ' + C.BORDER, borderRadius: 14, padding: 24, marginTop: 20, marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700, color: C.TEXT }}>
              {editingId ? 'Edit Sequence' : 'Create New Sequence'}
            </h2>

            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Sequence Name</label>
                <input type="text" value={formData.name} onChange={function(e) { setFormData({ ...formData, name: e.target.value }); }} placeholder="e.g., Enterprise Nurture" style={{ width: '100%', padding: '10px 14px', border: '1px solid ' + C.BORDER, borderRadius: 10, fontSize: 14, color: C.TEXT, background: C.SURFACE, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>

              {/* Conditions Section */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: C.TEXT }}>Targeting Conditions</h3>

                {quiz?.outcomes && quiz.outcomes.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 8 }}>Target Outcomes</label>
                    {(quiz.outcomes as Outcome[]).map(function(outcome) {
                      return (
                        <label key={outcome.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6, fontSize: 13, color: C.TEXT }}>
                          <input type="checkbox" checked={formData.conditions.outcome_ids?.includes(outcome.id) || false} onChange={function() { handleOutcomeToggle(outcome.id); }} />
                          {outcome.title}
                        </label>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 6 }}>Min Score</label>
                    <input type="number" value={formData.conditions.score_min ?? ''} onChange={function(e) { handleConditionChange('score_min', e.target.value ? parseInt(e.target.value) : null); }} placeholder="None" style={{ width: '100%', padding: '10px 14px', border: '1px solid ' + C.BORDER, borderRadius: 10, fontSize: 14, color: C.TEXT, background: C.SURFACE, outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 6 }}>Max Score</label>
                    <input type="number" value={formData.conditions.score_max ?? ''} onChange={function(e) { handleConditionChange('score_max', e.target.value ? parseInt(e.target.value) : null); }} placeholder="None" style={{ width: '100%', padding: '10px 14px', border: '1px solid ' + C.BORDER, borderRadius: 10, fontSize: 14, color: C.TEXT, background: C.SURFACE, outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 6 }}>Segments (comma-separated)</label>
                  <input type="text" value={formData.conditions.segments?.join(', ') || ''} onChange={handleSegmentChange} placeholder="e.g., enterprise, small-business" style={{ width: '100%', padding: '10px 14px', border: '1px solid ' + C.BORDER, borderRadius: 10, fontSize: 14, color: C.TEXT, background: C.SURFACE, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.TEXT }}>
                  <input type="checkbox" checked={formData.enabled} onChange={function(e) { setFormData({ ...formData, enabled: e.target.checked }); }} />
                  Enable this sequence
                </label>
              </div>

              {/* Emails Section */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: C.TEXT }}>Emails</h3>

                {formData.emails.map(function(email, idx) {
                  return (
                    <div key={idx} style={{ background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.TEXT }}>Email {idx + 1}</span>
                        {formData.emails.length > 1 && (
                          <button type="button" onClick={function() { handleRemoveEmail(idx); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                            <Trash2 size={14} color="#cc3333" />
                          </button>
                        )}
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 4, textTransform: 'uppercase' as const }}>Delay (days)</label>
                        <input type="number" min="0" value={email.delay_days} onChange={function(e) { handleEmailChange(idx, 'delay_days', parseInt(e.target.value)); }} style={{ width: 80, padding: '8px 12px', border: '1px solid ' + C.BORDER, borderRadius: 8, fontSize: 13, color: C.TEXT, background: '#FFFFFF', outline: 'none' }} />
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 4, textTransform: 'uppercase' as const }}>Subject</label>
                        <input type="text" value={email.subject} onChange={function(e) { handleEmailChange(idx, 'subject', e.target.value); }} placeholder="Email subject" style={{ width: '100%', padding: '8px 12px', border: '1px solid ' + C.BORDER, borderRadius: 8, fontSize: 13, color: C.TEXT, background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' as const }} />
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 4, textTransform: 'uppercase' as const }}>Body</label>
                        <textarea value={email.body} onChange={function(e) { handleEmailChange(idx, 'body', e.target.value); }} placeholder="Email body (HTML or plain text)" rows={4} style={{ width: '100%', padding: '8px 12px', border: '1px solid ' + C.BORDER, borderRadius: 8, fontSize: 13, color: C.TEXT, background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' as const, resize: 'vertical' as const, fontFamily: 'inherit' }} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 4, textTransform: 'uppercase' as const }}>CTA URL</label>
                          <input type="url" value={email.cta_url || ''} onChange={function(e) { handleEmailChange(idx, 'cta_url', e.target.value); }} placeholder="https://..." style={{ width: '100%', padding: '8px 12px', border: '1px solid ' + C.BORDER, borderRadius: 8, fontSize: 13, color: C.TEXT, background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' as const }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 4, textTransform: 'uppercase' as const }}>CTA Text</label>
                          <input type="text" value={email.cta_text || ''} onChange={function(e) { handleEmailChange(idx, 'cta_text', e.target.value); }} placeholder="e.g., Learn More" style={{ width: '100%', padding: '8px 12px', border: '1px solid ' + C.BORDER, borderRadius: 8, fontSize: 13, color: C.TEXT, background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' as const }} />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button type="button" onClick={handleAddEmail} style={{ width: '100%', padding: '10px 0', border: '1px dashed ' + C.BORDER, borderRadius: 10, background: 'transparent', color: C.TEXT_MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  + Add Another Email
                </button>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 10 }}>
                <PrimaryButton onClick={undefined}>{editingId ? 'Update Sequence' : 'Create Sequence'}</PrimaryButton>
                <button type="button" onClick={handleCancel} style={{ padding: '10px 20px', background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 10, color: C.TEXT_MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Sequences List */}
        <div style={{ marginTop: 24 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.TEXT }}>Active Sequences</h2>

          {sequences.length === 0 ? (
            <div style={{ background: C.ELEVATED, border: '1px solid ' + C.BORDER, borderRadius: 14, padding: 40, textAlign: 'center' as const }}>
              <EmptyState title="No sequences yet" body="Create an email sequence to automatically follow up with quiz respondents." />
            </div>
          ) : (
            sequences.map(function(seq) {
              return (
                <div key={seq.id} style={{ background: C.ELEVATED, border: '1px solid ' + C.BORDER, borderRadius: 14, padding: 20, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.TEXT }}>{seq.name}</h3>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: C.TEXT_MUTED }}>{conditionsSummary(seq.conditions)}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {!seq.enabled && (
                        <span style={{ padding: '3px 8px', background: 'rgba(255,59,48,0.08)', color: '#cc3333', fontSize: 11, fontWeight: 600, borderRadius: 6 }}>Disabled</span>
                      )}
                      <button onClick={function() { handleEdit(seq); }} style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: '1px solid ' + C.BORDER, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Edit2 size={13} color={C.ACCENT} />
                      </button>
                      <button onClick={function() { handleDelete(seq.id); }} style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: '1px solid ' + C.BORDER, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={13} color="#cc3333" />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {seq.emails.map(function(email, idx) {
                      return (
                        <div key={idx} style={{ background: C.SURFACE, border: '1px solid ' + C.HAIRLINE, borderRadius: 10, padding: 12 }}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', background: C.ACCENT, color: '#FFFFFF', borderRadius: 6, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Day {email.delay_days}</span>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{email.subject}</div>
                          <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{email.body}</div>
                          {email.cta_url && (
                            <div style={{ fontSize: 11, color: C.ACCENT, marginTop: 6, fontWeight: 600 }}>CTA: {email.cta_text || 'Learn More'}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

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
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black rounded-lg font-medium hover:bg-yellow-300 transition mb-8"
          >
            <Plus className="w-4 h-4" />
            New Sequence
          </button>
        )}

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingId ? 'Edit Sequence' : 'Create New Sequence'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sequence Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Enterprise Nurture"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              {/* Conditions Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Targeting Conditions</h3>

                {/* Outcomes */}
                {quiz?.outcomes && quiz.outcomes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Target Outcomes
                    </label>
                    <div className="space-y-2">
                      {(quiz.outcomes as Outcome[]).map((outcome) => (
                        <label key={outcome.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.conditions.outcome_ids?.includes(outcome.id) || false}
                            onChange={() => handleOutcomeToggle(outcome.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-yellow-400 focus:ring-yellow-400"
                          />
                          <span className="text-slate-300">{outcome.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Score Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Min Score
                    </label>
                    <input
                      type="number"
                      value={formData.conditions.score_min ?? ''}
                      onChange={(e) =>
                        handleConditionChange(
                          'score_min',
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="None"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Max Score
                    </label>
                    <input
                      type="number"
                      value={formData.conditions.score_max ?? ''}
                      onChange={(e) =>
                        handleConditionChange(
                          'score_max',
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="None"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                </div>

                {/* Segments */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Segments (comma-separated tags)
                  </label>
                  <input
                    type="text"
                    value={formData.conditions.segments?.join(', ') || ''}
                    onChange={handleSegmentChange}
                    placeholder="e.g., enterprise, small-business, nonprofit"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* Enabled */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-yellow-400 focus:ring-yellow-400"
                  />
                  <span className="text-slate-300">Enable this sequence</span>
                </label>
              </div>

              {/* Emails Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Emails</h3>

                {formData.emails.map((email, idx) => (
                  <div key={idx} className="bg-slate-700 border border-slate-600 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-300">
                        Email {idx + 1}
                      </span>
                      {formData.emails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(idx)}
                          className="p-1 hover:bg-slate-600 rounded transition"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Delay (days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={email.delay_days}
                        onChange={(e) =>
                          handleEmailChange(idx, 'delay_days', parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={email.subject}
                        onChange={(e) =>
                          handleEmailChange(idx, 'subject', e.target.value)
                        }
                        placeholder="Email subject"
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Body
                      </label>
                      <textarea
                        value={email.body}
                        onChange={(e) =>
                          handleEmailChange(idx, 'body', e.target.value)
                        }
                        placeholder="Email body (HTML or plain text)"
                        rows={4}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          CTA URL (optional)
                        </label>
                        <input
                          type="url"
                          value={email.cta_url || ''}
                          onChange={(e) =>
                            handleEmailChange(idx, 'cta_url', e.target.value)
                          }
                          placeholder="https://..."
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          CTA Text (optional)
                        </label>
                        <input
                          type="text"
                          value={email.cta_text || ''}
                          onChange={(e) =>
                            handleEmailChange(idx, 'cta_text', e.target.value)
                          }
                          placeholder="e.g., Learn More"
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddEmail}
                  className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-slate-300 transition"
                >
                  + Add Another Email
                </button>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-yellow-400 text-black rounded-lg font-medium hover:bg-yellow-300 transition"
                >
                  {editingId ? 'Update Sequence' : 'Create Sequence'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sequences List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Active Sequences</h2>

          {sequences.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
              <EmptyState title="No sequences yet" body="Create an email sequence to automatically follow up with quiz respondents." />
            </div>
          ) : (
            sequences.map((seq) => (
              <div key={seq.id} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{seq.name}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {conditionsSummary(seq.conditions)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!seq.enabled && (
                      <span className="px-2 py-1 bg-red-950 text-red-200 text-xs rounded font-medium">
                        Disabled
                      </span>
                    )}
                    <button
                      onClick={() => handleEdit(seq)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4 text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(seq.id)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {seq.emails.map((email, idx) => (
                    <div key={idx} className="bg-slate-700 rounded-lg p-3 text-sm">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="px-2 py-1 bg-yellow-400 text-black rounded text-xs font-medium">
                          Day {email.delay_days}
                        </span>
                      </div>
                      <p className="text-slate-300 font-medium truncate">{email.subject}</p>
                      <p className="text-slate-400 text-xs mt-1 line-clamp-2">{email.body}</p>
                      {email.cta_url && (
                        <p className="text-blue-400 text-xs mt-2">CTA: {email.cta_text || 'Learn More'}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

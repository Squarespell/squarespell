'use client';

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageHeader, Card, EmptyState, PrimaryButton, GhostButton, PageLoading, Pill } from '../_components/PageShell';

type AutomationRule = {
  id: string;
  name: string;
  trigger_config: { type: string; quiz_id?: string; tag_id?: string };
  action_config: { type: string };
  enabled: boolean;
  fire_count: number;
  last_fired_at: string | null;
  created_at: string;
};

type Quiz = {
  id: string;
  title: string;
};

var TRIGGER_LABELS: Record<string, string> = {
  lead_created: 'Lead created',
  tag_added: 'Tag added',
  segment_entered: 'Segment entered',
  quiz_completed: 'Quiz completed',
};

var ACTION_LABELS: Record<string, string> = {
  send_email: 'Send email',
  add_tag: 'Add tag',
  start_sequence: 'Start sequence',
};

var TRIGGER_OPTIONS = [
  { value: 'quiz_completed', label: 'Quiz completed' },
  { value: 'lead_created', label: 'Lead created' },
  { value: 'tag_added', label: 'Tag added' },
  { value: 'segment_entered', label: 'Segment entered' },
];

var ACTION_OPTIONS = [
  { value: 'send_email', label: 'Send email' },
  { value: 'add_tag', label: 'Add tag' },
  { value: 'start_sequence', label: 'Start sequence' },
];

var inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid ' + C.GRAY_200,
  borderRadius: 8,
  fontSize: 13.5,
  fontFamily: C.FONT,
  color: C.GRAY_900,
  background: C.SURFACE,
  outline: 'none',
  boxSizing: 'border-box' as const,
};

var labelStyle = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600 as const,
  color: C.GRAY_600,
  marginBottom: 6,
  fontFamily: C.FONT,
};

export default function AutomationsPage() {
  var { token, status } = useDashboardAuth();
  var [rules, setRules] = useState<AutomationRule[]>([]);
  var [quizzes, setQuizzes] = useState<Quiz[]>([]);
  var [loading, setLoading] = useState(true);
  var [showCreate, setShowCreate] = useState(false);
  var [saving, setSaving] = useState(false);

  // Create form state
  var [formName, setFormName] = useState('');
  var [formTrigger, setFormTrigger] = useState('quiz_completed');
  var [formQuizId, setFormQuizId] = useState('');
  var [formAction, setFormAction] = useState('send_email');

  var apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

  useEffect(function() {
    if (!token) return;
    var cancelled = false;
    (async function() {
      try {
        var res = await fetch(apiBase + '/api/automations', {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (res.ok && !cancelled) {
          var data = await res.json();
          setRules(data.rules || data || []);
        }
      } catch {}

      // Also fetch quizzes for the trigger quiz selector
      try {
        var qRes = await fetch(apiBase + '/api/quizzes', {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (qRes.ok && !cancelled) {
          var qData = await qRes.json();
          setQuizzes(qData.quizzes || qData || []);
        }
      } catch {}

      if (!cancelled) setLoading(false);
    })();
    return function() { cancelled = true; };
  }, [token]);

  async function toggleRule(id: string, enabled: boolean) {
    if (!token) return;
    await fetch(apiBase + '/api/automations/' + id, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    });
    setRules(function(prev) {
      return prev.map(function(r) { return r.id === id ? Object.assign({}, r, { enabled: !enabled }) : r; });
    });
  }

  async function deleteRule(id: string) {
    if (!token) return;
    await fetch(apiBase + '/api/automations/' + id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    });
    setRules(function(prev) { return prev.filter(function(r) { return r.id !== id; }); });
  }

  async function createRule() {
    if (!token || !formName.trim()) return;
    setSaving(true);
    try {
      var triggerConfig: any = { type: formTrigger };
      if (formTrigger === 'quiz_completed' && formQuizId) {
        triggerConfig.quiz_id = formQuizId;
      }
      var res = await fetch(apiBase + '/api/automations', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          trigger_config: triggerConfig,
          action_config: { type: formAction },
        }),
      });
      if (res.ok) {
        var newRule = await res.json();
        setRules(function(prev) { return [newRule].concat(prev); });
        setShowCreate(false);
        setFormName('');
        setFormTrigger('quiz_completed');
        setFormQuizId('');
        setFormAction('send_email');
      }
    } catch {}
    setSaving(false);
  }

  if (status === 'loading') return <DashboardShell title="Automations"><PageLoading /></DashboardShell>;

  return (
    <DashboardShell title="Automations">
      <PageHeader
        title="Automations"
        subtitle="Trigger actions automatically when leads complete quizzes, reach scores, or get tagged"
        actions={
          <PrimaryButton onClick={function() { setShowCreate(true); }}>
            + Create automation
          </PrimaryButton>
        }
      />

      {/* Create Automation Modal */}
      {showCreate && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={function(e) { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div
            style={{
              background: C.SURFACE,
              borderRadius: 14,
              padding: 28,
              width: 460,
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 20 }}>
              Create automation
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                placeholder="e.g. Send welcome email on quiz completion"
                value={formName}
                onChange={function(e) { setFormName(e.target.value); }}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>When this happens (trigger)</label>
              <select
                value={formTrigger}
                onChange={function(e) { setFormTrigger(e.target.value); }}
                style={Object.assign({}, inputStyle, { cursor: 'pointer' })}
              >
                {TRIGGER_OPTIONS.map(function(opt) {
                  return <option key={opt.value} value={opt.value}>{opt.label}</option>;
                })}
              </select>
            </div>

            {(formTrigger === 'quiz_completed' || formTrigger === 'lead_created') && quizzes.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>For quiz (optional)</label>
                <select
                  value={formQuizId}
                  onChange={function(e) { setFormQuizId(e.target.value); }}
                  style={Object.assign({}, inputStyle, { cursor: 'pointer' })}
                >
                  <option value="">Any quiz</option>
                  {quizzes.map(function(q) {
                    return <option key={q.id} value={q.id}>{q.title || 'Untitled'}</option>;
                  })}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Do this (action)</label>
              <select
                value={formAction}
                onChange={function(e) { setFormAction(e.target.value); }}
                style={Object.assign({}, inputStyle, { cursor: 'pointer' })}
              >
                {ACTION_OPTIONS.map(function(opt) {
                  return <option key={opt.value} value={opt.value}>{opt.label}</option>;
                })}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <GhostButton onClick={function() { setShowCreate(false); }}>Cancel</GhostButton>
              <PrimaryButton
                onClick={function() { createRule(); }}
                disabled={!formName.trim() || saving}
              >
                {saving ? 'Creating...' : 'Create automation'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <PageLoading />
      ) : rules.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_300} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            }
            title="No automations yet"
            body="Create automation rules to send emails, add tags, or start sequences when specific events happen."
            action={
              <PrimaryButton onClick={function() { setShowCreate(true); }}>
                + Create your first automation
              </PrimaryButton>
            }
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rules.map(function(rule) {
            return (
              <Card key={rule.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>{rule.name}</span>
                      <Pill variant={rule.enabled ? 'live' : 'neutral'}>
                        {rule.enabled ? 'Active' : 'Paused'}
                      </Pill>
                    </div>
                    <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>
                      When <strong>{TRIGGER_LABELS[rule.trigger_config?.type] || rule.trigger_config?.type || 'unknown'}</strong>
                      {' '}&rarr;{' '}
                      <strong>{ACTION_LABELS[rule.action_config?.type] || rule.action_config?.type || 'unknown'}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: C.GRAY_400, marginTop: 4, fontFamily: C.FONT }}>
                      Fired {rule.fire_count} time{rule.fire_count !== 1 ? 's' : ''}
                      {rule.last_fired_at ? ' \u00b7 Last: ' + new Date(rule.last_fired_at).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={function() { toggleRule(rule.id, rule.enabled); }}
                      style={{
                        padding: '6px 14px',
                        border: '1px solid ' + C.GRAY_200,
                        borderRadius: 8,
                        background: C.SURFACE,
                        color: C.GRAY_600,
                        fontSize: 13,
                        fontFamily: C.FONT,
                        cursor: 'pointer',
                      }}
                    >
                      {rule.enabled ? 'Pause' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={function() { deleteRule(rule.id); }}
                      style={{
                        padding: '6px 14px',
                        border: '1px solid ' + C.GRAY_200,
                        borderRadius: 8,
                        background: C.SURFACE,
                        color: C.DANGER,
                        fontSize: 13,
                        fontFamily: C.FONT,
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}

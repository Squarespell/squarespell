'use client';

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageHeader, Card, EmptyState, PrimaryButton, PageLoading, Pill } from '../_components/PageShell';

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

export default function AutomationsPage() {
  var { token, status } = useDashboardAuth();
  var [rules, setRules] = useState<AutomationRule[]>([]);
  var [loading, setLoading] = useState(true);

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

  if (status === 'loading') return <DashboardShell title="Automations"><PageLoading /></DashboardShell>;

  return (
    <DashboardShell title="Automations">
      <PageHeader
        title="Automations"
        subtitle="Trigger actions automatically when leads complete quizzes, reach scores, or get tagged"
      />

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

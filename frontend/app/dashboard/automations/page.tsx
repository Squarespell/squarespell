'use client';

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';

/* ─── types ─── */
type AutomationRule = {
  id: string; name: string;
  trigger_config: { type: string; quiz_id?: string; tag_id?: string };
  action_config: { type: string };
  enabled: boolean; fire_count: number;
  last_fired_at: string | null; created_at: string;
};
type Quiz = { id: string; title: string };

var TRIGGER_LABELS: Record<string, string> = {
  lead_created: 'Lead created', tag_added: 'Tag added',
  segment_entered: 'Segment entered', quiz_completed: 'Quiz completed',
};
var ACTION_LABELS: Record<string, string> = {
  send_email: 'Send email', add_tag: 'Add tag', start_sequence: 'Start sequence',
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

/* ─── sparkline SVG ─── */
function Sparkline({ color }: { color: string }) {
  return (
    <svg width="80" height="32" viewBox="0 0 80 32" fill="none" style={{ position: 'absolute', bottom: 12, right: 16, opacity: 0.35 }}>
      <path d="M0 28Q10 20 20 24T40 16T60 20T80 10" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ─── shared card ─── */
var cardBase: React.CSSProperties = {
  background: '#fff', border: '1px solid ' + C.GRAY_200,
  borderRadius: 16, boxShadow: C.SHADOW_XS,
};

/* ─── page ─── */
export default function AutomationsPage() {
  var { token, status } = useDashboardAuth();
  var [rules, setRules] = useState<AutomationRule[]>([]);
  var [quizzes, setQuizzes] = useState<Quiz[]>([]);
  var [loading, setLoading] = useState(true);
  var [showCreate, setShowCreate] = useState(false);
  var [saving, setSaving] = useState(false);

  var [formName, setFormName] = useState('');
  var [formTrigger, setFormTrigger] = useState('quiz_completed');
  var [formQuizId, setFormQuizId] = useState('');
  var [formAction, setFormAction] = useState('send_email');

  var apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

  useEffect(function () {
    if (!token) return;
    var cancelled = false;
    (async function () {
      try {
        var res = await fetch(apiBase + '/api/automations', { headers: { Authorization: 'Bearer ' + token } });
        if (res.ok && !cancelled) { var d = await res.json(); setRules(d.rules || d || []); }
      } catch {}
      try {
        var qRes = await fetch(apiBase + '/api/quizzes', { headers: { Authorization: 'Bearer ' + token } });
        if (qRes.ok && !cancelled) { var qd = await qRes.json(); setQuizzes(qd.quizzes || qd || []); }
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return function () { cancelled = true; };
  }, [token]);

  async function toggleRule(id: string, enabled: boolean) {
    if (!token) return;
    await fetch(apiBase + '/api/automations/' + id, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    });
    setRules(function (prev) { return prev.map(function (r) { return r.id === id ? Object.assign({}, r, { enabled: !enabled }) : r; }); });
  }

  async function deleteRule(id: string) {
    if (!token) return;
    await fetch(apiBase + '/api/automations/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    setRules(function (prev) { return prev.filter(function (r) { return r.id !== id; }); });
  }

  async function createRule() {
    if (!token || !formName.trim()) return;
    setSaving(true);
    try {
      var triggerConfig: any = { type: formTrigger };
      if (formTrigger === 'quiz_completed' && formQuizId) triggerConfig.quiz_id = formQuizId;
      var res = await fetch(apiBase + '/api/automations', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), trigger_config: triggerConfig, action_config: { type: formAction } }),
      });
      if (res.ok) {
        var newRule = await res.json();
        setRules(function (prev) { return [newRule].concat(prev); });
        setShowCreate(false); setFormName(''); setFormTrigger('quiz_completed'); setFormQuizId(''); setFormAction('send_email');
      }
    } catch {}
    setSaving(false);
  }

  var activeCount = rules.filter(function (r) { return r.enabled; }).length;
  var totalFired = rules.reduce(function (s, r) { return s + (r.fire_count || 0); }, 0);

  if (status === 'loading' || loading) {
    return (
      <DashboardShell title="Automations">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, fontFamily: C.FONT, color: C.GRAY_400, fontSize: 14 }}>Loading...</div>
      </DashboardShell>
    );
  }

  /* ─── input style ─── */
  var inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid ' + C.GRAY_200,
    borderRadius: 10, fontSize: 14, fontFamily: C.FONT, color: C.GRAY_900,
    outline: 'none', boxSizing: 'border-box', background: '#fff',
  };

  return (
    <DashboardShell title="Automations">
      <style>{`
        .auto-stat { transition: box-shadow 0.2s; }
        .auto-stat:hover { box-shadow: ${C.SHADOW_MD}; }
        .auto-create { transition: background 0.15s; }
        .auto-create:hover { background: ${C.ACCENT_HOVER} !important; }
        .auto-card { transition: box-shadow 0.2s, border-color 0.2s; }
        .auto-card:hover { box-shadow: ${C.SHADOW_MD}; border-color: ${C.GRAY_300}; }
        .auto-action { transition: background 0.15s; }
        .auto-action:hover { background: ${C.GRAY_50} !important; }
        .auto-recipe { transition: box-shadow 0.2s; }
        .auto-recipe:hover { box-shadow: ${C.SHADOW_MD}; }
        .auto-input:focus { border-color: ${C.ACCENT} !important; box-shadow: ${C.FOCUS_RING} !important; }
        .auto-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        @media (max-width: 1200px) { .auto-stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 900px) { .auto-stats-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={{ maxWidth: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, lineHeight: 1.3 }}>
            Automations
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT, maxWidth: 480, lineHeight: 1.5 }}>
            Trigger actions automatically when leads complete quizzes, reach scores, or get tagged.
          </p>
        </div>
        {rules.length > 0 && (
          <button type="button" className="auto-create"
            onClick={function () { setShowCreate(true); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600,
              fontFamily: C.FONT, cursor: 'pointer', boxShadow: C.SHADOW_XS, whiteSpace: 'nowrap',
            }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3.333v9.334M3.333 8h9.334" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
            Create automation
          </button>
        )}
      </div>

      {/* ── 4 Stat cards ── */}
      <div className="auto-stats-grid">
        {[
          { label: 'Active automations', value: String(activeCount), sub: activeCount === 0 ? 'No active rules yet' : activeCount + ' running', iconBg: C.BRAND_50, color: C.ACCENT,
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="M14 8l3 4-3 4" /></svg> },
          { label: 'Emails sent (automated)', value: String(totalFired), sub: totalFired === 0 ? 'No emails sent yet' : totalFired + ' total', iconBg: '#F4EBFF', color: '#7F56D9',
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg> },
          { label: 'Leads in automation', value: '0', sub: 'No leads enrolled yet', iconBg: '#FEF0C7', color: '#DC6803',
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC6803" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg> },
          { label: 'Time saved', value: '0h', sub: 'Automate and save time', iconBg: '#E0F2FE', color: '#0086C9',
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0086C9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
        ].map(function (stat, i) {
          return (
            <div key={i} className="auto-stat" style={{
              ...cardBase, padding: '20px 20px 18px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: stat.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {stat.icon}
                </div>
                <div style={{ position: 'relative', zIndex: 1, minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, fontWeight: 500, marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: C.GRAY_400, fontFamily: C.FONT, marginTop: 6 }}>{stat.sub}</div>
                </div>
              </div>
              <Sparkline color={stat.color} />
            </div>
          );
        })}
      </div>

      {/* ── Rules list or empty state ── */}
      {rules.length === 0 ? (
        <>
          {/* Workflow illustration empty state */}
          <div style={{
            ...cardBase, padding: '48px 24px 40px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20,
          }}>
            {/* Workflow nodes illustration */}
            <div style={{ position: 'relative', width: 320, height: 140, marginBottom: 28 }}>
              {/* Center lightning node */}
              <div style={{
                position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                width: 60, height: 60, borderRadius: 14,
                background: C.BRAND_50, border: '2px dashed ' + C.ACCENT,
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              {/* Left email node */}
              <div style={{
                position: 'absolute', top: 30, left: 30,
                width: 44, height: 44, borderRadius: 12, background: '#ECFDF3',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#12B76A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              {/* Right people node */}
              <div style={{
                position: 'absolute', top: 30, right: 30,
                width: 44, height: 44, borderRadius: 12, background: '#F4EBFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              {/* Bottom tag node */}
              <div style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                width: 44, height: 44, borderRadius: 12, background: C.BRAND_50,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              </div>
              {/* Connecting dashed lines */}
              <svg width="320" height="140" viewBox="0 0 320 140" fill="none"
                style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}>
                <line x1="86" y1="52" x2="128" y2="50" stroke={C.GRAY_300} strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="192" y1="50" x2="244" y2="52" stroke={C.GRAY_300} strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="160" y1="82" x2="160" y2="96" stroke={C.GRAY_300} strokeWidth="1.5" strokeDasharray="4 4" />
              </svg>
              {/* Sparkle decorations */}
              <svg width="12" height="12" viewBox="0 0 14 14" style={{ position: 'absolute', top: 8, left: 100 }}>
                <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill={C.ACCENT} opacity="0.25" />
              </svg>
              <svg width="10" height="10" viewBox="0 0 14 14" style={{ position: 'absolute', top: 0, right: 80 }}>
                <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill="#7F56D9" opacity="0.3" />
              </svg>
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, margin: '0 0 8px' }}>
              No automations yet
            </h3>
            <p style={{ fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT, margin: '0 0 28px', textAlign: 'center', maxWidth: 440, lineHeight: 1.5 }}>
              Create automation rules to send emails, add tags, or start sequences when specific events happen.
            </p>

            <button type="button" className="auto-create"
              onClick={function () { setShowCreate(true); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '12px 28px', borderRadius: 10, border: 'none',
                background: C.ACCENT, color: '#fff', fontSize: 15, fontWeight: 600,
                fontFamily: C.FONT, cursor: 'pointer', boxShadow: C.SHADOW_XS, marginBottom: 32,
              }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3.333v9.334M3.333 8h9.334" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
              Create your first automation
            </button>

            {/* Bottom features row */}
            <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12B76A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>, text: 'Send personalized emails' },
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC6803" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>, text: 'Add tags automatically' },
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>, text: 'Save time & grow faster' },
              ].map(function (f, i) {
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {f.icon}
                    <span style={{ fontSize: 13, color: C.GRAY_600, fontFamily: C.FONT, fontWeight: 500 }}>{f.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recipe banner */}
          <div className="auto-recipe" style={{
            ...cardBase, padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12,
          }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: C.GRAY_100,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_600} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 2 }}>
                  Not sure where to start?
                </div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>
                  Explore pre-built automation recipes to get started in seconds.
                </div>
              </div>
            </div>
            <button type="button" className="auto-action" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 10, border: '1px solid ' + C.GRAY_200,
              background: '#fff', color: C.GRAY_700, fontSize: 14, fontWeight: 600,
              fontFamily: C.FONT, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              Browse recipes
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </>
      ) : (
        /* ── Rules list ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rules.map(function (rule) {
            return (
              <div key={rule.id} className="auto-card" style={{
                ...cardBase, padding: '18px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: rule.enabled ? C.BRAND_50 : C.GRAY_100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={rule.enabled ? C.ACCENT : C.GRAY_400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>{rule.name}</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: C.FONT,
                        background: rule.enabled ? '#ECFDF3' : C.GRAY_100,
                        color: rule.enabled ? '#027A48' : C.GRAY_500,
                      }}>
                        {rule.enabled && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#12B76A' }} />}
                        {rule.enabled ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>
                      When <strong style={{ fontWeight: 600 }}>{TRIGGER_LABELS[rule.trigger_config?.type] || rule.trigger_config?.type || 'unknown'}</strong>
                      {' → '}
                      <strong style={{ fontWeight: 600 }}>{ACTION_LABELS[rule.action_config?.type] || rule.action_config?.type || 'unknown'}</strong>
                      <span style={{ color: C.GRAY_400, marginLeft: 8 }}>
                        {rule.fire_count} time{rule.fire_count !== 1 ? 's' : ''}
                        {rule.last_fired_at ? ' · Last: ' + new Date(rule.last_fired_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button type="button" className="auto-action" onClick={function () { toggleRule(rule.id, rule.enabled); }}
                    style={{
                      padding: '8px 16px', border: '1px solid ' + C.GRAY_200, borderRadius: 8,
                      background: '#fff', color: C.GRAY_600, fontSize: 13, fontWeight: 600,
                      fontFamily: C.FONT, cursor: 'pointer',
                    }}>
                    {rule.enabled ? 'Pause' : 'Enable'}
                  </button>
                  <button type="button" className="auto-action" onClick={function () { deleteRule(rule.id); }}
                    style={{
                      padding: '8px 16px', border: '1px solid ' + C.GRAY_200, borderRadius: 8,
                      background: '#fff', color: '#F04438', fontSize: 13, fontWeight: 600,
                      fontFamily: C.FONT, cursor: 'pointer',
                    }}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {/* Recipe banner */}
          <div className="auto-recipe" style={{
            ...cardBase, padding: '20px 24px', marginTop: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12,
          }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: C.GRAY_100,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_600} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 2 }}>Not sure where to start?</div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>Explore pre-built automation recipes to get started in seconds.</div>
              </div>
            </div>
            <button type="button" className="auto-action" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 10, border: '1px solid ' + C.GRAY_200,
              background: '#fff', color: C.GRAY_700, fontSize: 14, fontWeight: 600,
              fontFamily: C.FONT, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              Browse recipes
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      </div>{/* close overflow wrapper */}

      {/* ── Create modal ── */}
      {showCreate && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(16, 24, 40, 0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}
          onClick={function (e) { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 28,
            width: 480, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto',
            boxShadow: '0 20px 60px rgba(16, 24, 40, 0.18)',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 24 }}>
              Create automation
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.GRAY_600, marginBottom: 6, fontFamily: C.FONT }}>Name</label>
              <input type="text" className="auto-input" placeholder="e.g. Send welcome email on quiz completion"
                value={formName} onChange={function (e) { setFormName(e.target.value); }}
                style={inputStyle} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.GRAY_600, marginBottom: 6, fontFamily: C.FONT }}>When this happens (trigger)</label>
              <select value={formTrigger} onChange={function (e) { setFormTrigger(e.target.value); }}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                {TRIGGER_OPTIONS.map(function (o) { return <option key={o.value} value={o.value}>{o.label}</option>; })}
              </select>
            </div>

            {(formTrigger === 'quiz_completed' || formTrigger === 'lead_created') && quizzes.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.GRAY_600, marginBottom: 6, fontFamily: C.FONT }}>For quiz (optional)</label>
                <select value={formQuizId} onChange={function (e) { setFormQuizId(e.target.value); }}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Any quiz</option>
                  {quizzes.map(function (q) { return <option key={q.id} value={q.id}>{q.title || 'Untitled'}</option>; })}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.GRAY_600, marginBottom: 6, fontFamily: C.FONT }}>Do this (action)</label>
              <select value={formAction} onChange={function (e) { setFormAction(e.target.value); }}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                {ACTION_OPTIONS.map(function (o) { return <option key={o.value} value={o.value}>{o.label}</option>; })}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={function () { setShowCreate(false); }}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: '1px solid ' + C.GRAY_200,
                  background: '#fff', color: C.GRAY_600, fontSize: 14, fontWeight: 600,
                  fontFamily: C.FONT, cursor: 'pointer',
                }}>Cancel</button>
              <button type="button" className="auto-create" onClick={createRule}
                disabled={!formName.trim() || saving}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: !formName.trim() || saving ? C.GRAY_200 : C.ACCENT,
                  color: !formName.trim() || saving ? C.GRAY_400 : '#fff',
                  fontSize: 14, fontWeight: 600, fontFamily: C.FONT,
                  cursor: !formName.trim() || saving ? 'not-allowed' : 'pointer',
                }}>
                {saving ? 'Creating...' : 'Create automation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { DisplayTitle, PageLoading } from '../_components/PageShell';

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
        if (res.ok && !cancelled) { var d = await res.json(); var list = Array.isArray(d) ? d : (d && (d.rules || d.automations)); setRules(Array.isArray(list) ? list : []); }
      } catch {}
      try {
        var qRes = await fetch(apiBase + '/api/quizzes', { headers: { Authorization: 'Bearer ' + token } });
        if (qRes.ok && !cancelled) { var qd = await qRes.json(); var ql = Array.isArray(qd) ? qd : qd && qd.quizzes; setQuizzes(Array.isArray(ql) ? ql : []); }
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
  var lastFired = rules.map(function (r) { return r.last_fired_at; }).filter(Boolean).sort().pop() || null;

  var RECIPES = [
    { name: 'Welcome new leads', body: 'Send a friendly welcome email when someone becomes a lead.', trigger: 'lead_created', action: 'send_email', bg: C.PERIWINKLE_SOFT, art: C.BRAND_300, icon: 'M12 11a4 4 0 100-8 4 4 0 000 8zM5 21c0-3.9 3.1-7 7-7s7 3.1 7 7' },
    { name: 'Follow up after a quiz', body: 'Send a follow-up email when someone completes a specific quiz.', trigger: 'quiz_completed', action: 'send_email', bg: '#EEF3FF', art: C.BRAND_300, icon: 'M5 20v-6M12 20V8M19 20V4' },
    { name: 'Nurture a segment', body: 'Start an email sequence when a lead enters an audience segment.', trigger: 'segment_entered', action: 'start_sequence', bg: C.ACID_SOFT, art: C.ACID, icon: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5M17 11a3 3 0 100-6M22 21c0-3-1.8-5-4.5-5.7' },
  ];

  function applyRecipe(r: typeof RECIPES[number]) {
    setFormName(r.name);
    setFormTrigger(r.trigger);
    setFormAction(r.action);
    setFormQuizId('');
    setShowCreate(true);
  }

  var inputStyle: React.CSSProperties = { width: '100%', height: 46, padding: '0 14px', borderRadius: 6, border: '1px solid ' + C.BORDER, fontSize: 15, fontFamily: C.FONT, color: C.INK, background: '#fff' };
  var labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, color: C.INK, marginBottom: 8 };

  function relTime(s: string | null) {
    if (!s) return 'Never';
    var d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
    if (d < 1) return 'Today';
    if (d === 1) return 'Yesterday';
    return d + ' days ago';
  }

  if (status === 'loading' || loading) {
    return <DashboardShell title="Automations"><PageLoading /></DashboardShell>;
  }

  var nodes = [
    { t: 'Quiz completed', b: 'A lead finishes your quiz', bg: C.PERIWINKLE_SOFT, icon: 'M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM9 8h6M9 12h6M9 16h3' },
    { t: 'Add tag', b: 'Automatically tag the lead', bg: C.ACID_SOFT, icon: 'M20.6 13.4 13.4 20.6a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8zM7.5 7.5h.01' },
    { t: 'Send email', b: 'Send a personalised follow-up email', bg: C.PERIWINKLE_SOFT, icon: 'M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zM22 7l-10 7L2 7' },
  ];

  return (
    <DashboardShell title="Automations">
      <style dangerouslySetInnerHTML={{ __html: `
        .au-hero { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 32px; align-items: start; margin-bottom: 32px; }
        .au-stats { display: grid; grid-template-columns: repeat(4, minmax(150px, auto)); }
        .au-stats > div { padding: 6px 28px; border-left: 1px solid ${C.BORDER}; }
        .au-recipes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .au-btn { display: inline-flex; align-items: center; gap: 10px; height: 42px; padding: 0 18px; border-radius: 6px; border: 1px solid ${C.BORDER}; background: #fff; color: ${C.INK}; font: 500 15px ${C.FONT}; cursor: pointer; }
        .au-btn:hover { border-color: ${C.GRAY_300}; }
        @media (max-width: 1200px) { .au-hero { grid-template-columns: 1fr; } .au-stats > div:first-child { border-left: none; padding-left: 0; } .au-recipes { grid-template-columns: 1fr; } }
        @media (max-width: 700px) { .au-stats { grid-template-columns: 1fr 1fr; row-gap: 16px; } .au-flow { flex-direction: column; } }
      ` }} />

      {/* Header */}
      <div className="au-hero">
        <div style={{ minWidth: 0 }}>
          <DisplayTitle size="xl">Let your quizzes do the follow-up.</DisplayTitle>
          <p style={{ margin: '16px 0 0', fontSize: 'clamp(17px, 1.5vw, 21px)', color: C.GRAY_600, maxWidth: 620 }}>Trigger actions automatically when leads complete quizzes, get tagged or enter a segment.</p>
        </div>
        <div className="au-stats" style={{ paddingTop: 30 }}>
          {[
            { v: String(activeCount), l: 'Active automations', s: activeCount ? 'Running now' : 'No active rules yet' },
            { v: String(rules.length), l: 'Automations', s: rules.length ? (rules.length - activeCount) + ' paused' : 'None created yet' },
            { v: totalFired.toLocaleString(), l: 'Times run', s: totalFired ? 'Across all automations' : 'Nothing has run yet' },
            { v: relTime(lastFired), l: 'Last run', s: lastFired ? new Date(lastFired).toLocaleDateString() : 'Waiting for a trigger' },
          ].map(function (m) {
            return (
              <div key={m.l} className="stat">
                <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: m.v.length > 6 ? 26 : 42, fontWeight: 500, letterSpacing: '-0.03em', color: C.INK, lineHeight: 1.05 }}>{m.v}</div>
                <div style={{ fontSize: 16, color: C.INK, marginTop: 8 }}>{m.l}</div>
                <div style={{ fontSize: 14, color: C.GRAY_500, marginTop: 4 }}>{m.s}</div>
              </div>
            );
          })}
        </div>
      </div>

      {rules.length === 0 ? (
        <section style={{ position: 'relative', overflow: 'hidden', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: '26px 24px 40px', marginBottom: 28 }}>
          <svg aria-hidden="true" width="300" height="340" viewBox="0 0 300 340" style={{ position: 'absolute', left: 0, bottom: 0 }}>
            <path d="M0 50 A 170 170 0 0 1 170 220 L 0 220 Z" fill={C.PERIWINKLE_SOFT} />
            <path d="M100 200 A 140 140 0 0 1 240 340 L 100 340 Z" fill={C.ACCENT} />
            <rect x="210" y="180" width="18" height="18" fill={C.ACID} />
          </svg>
          <svg aria-hidden="true" width="300" height="230" viewBox="0 0 300 230" style={{ position: 'absolute', right: 0, top: 0 }}>
            <path d="M300 0 L 300 210 L 130 210 Z" fill={C.PERIWINKLE_SOFT} opacity="0.7" />
            <rect x="130" y="40" width="18" height="18" fill={C.ACID} />
            <text x="20" y="70" fontSize="22" fill={C.INK} fontFamily="'Instrument Serif', Georgia, serif" fontStyle="italic" transform="rotate(-12 20 70)">From curiosity</text>
            <text x="30" y="110" fontSize="22" fill={C.INK} fontFamily="'Instrument Serif', Georgia, serif" fontStyle="italic" transform="rotate(-12 30 110)">to connection.</text>
          </svg>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', color: C.GRAY_600, marginBottom: 12 }}>EXAMPLE WORKFLOW</div>
            <div className="au-flow" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 16 }}>
              {nodes.map(function (n, i) {
                return (
                  <div key={n.t} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ width: 170, textAlign: 'center' }}>
                      <span style={{ width: 92, height: 92, borderRadius: 8, background: n.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.INK }}>
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={n.icon} /></svg>
                      </span>
                      <div style={{ fontSize: 19, fontWeight: 600, color: C.INK, marginTop: 14 }}>{n.t}</div>
                      <div style={{ fontSize: 15, color: C.GRAY_600, marginTop: 4, lineHeight: 1.35 }}>{n.b}</div>
                    </div>
                    {i < nodes.length - 1 && (
                      <svg aria-hidden="true" width="110" height="92" viewBox="0 0 110 92"><path d="M0 46 H 100 M 92 38 L 100 46 L 92 54" fill="none" stroke={C.GRAY_400} strokeWidth="1.4" strokeDasharray="4 4" /></svg>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: 'center', marginTop: 36 }}>
              <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 30, fontWeight: 500, letterSpacing: '-0.025em', color: C.INK }}>Create your first automation</div>
              <p style={{ margin: '6px 0 20px', fontSize: 17, color: C.GRAY_600 }}>Save time, engage your audience, and turn quiz results into action.</p>
              <button type="button" onClick={function () { setShowCreate(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, height: 52, padding: '0 30px', borderRadius: 6, border: 'none', background: C.ACCENT, color: '#fff', fontSize: 17, fontWeight: 500, fontFamily: C.FONT, cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                Create automation
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontFamily: C.DISPLAY_FONT, fontSize: 26, fontWeight: 500, color: C.INK }}>Your automations</h2>
            <button type="button" onClick={function () { setShowCreate(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 44, padding: '0 20px', borderRadius: 6, border: 'none', background: C.ACCENT, color: '#fff', fontSize: 15, fontFamily: C.FONT, cursor: 'pointer' }}>+ Create automation</button>
          </div>
          <div style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
            {rules.map(function (rule, i) {
              var quiz = quizzes.find(function (q) { return q.id === rule.trigger_config?.quiz_id; });
              return (
                <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 22px', borderTop: i === 0 ? 'none' : '1px solid ' + C.BORDER_LIGHT, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 600, color: C.INK }}>{rule.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap', fontSize: 14 }}>
                      <span style={{ padding: '3px 10px', borderRadius: 4, background: C.PERIWINKLE_SOFT, color: C.BRAND_700 }}>{TRIGGER_LABELS[rule.trigger_config?.type] || rule.trigger_config?.type}{quiz ? ': ' + quiz.title : ''}</span>
                      <span aria-hidden="true" style={{ color: C.GRAY_400 }}></span>
                      <span style={{ padding: '3px 10px', borderRadius: 4, background: C.ACID_SOFT, color: C.INK }}>{ACTION_LABELS[rule.action_config?.type] || rule.action_config?.type}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: C.GRAY_600, minWidth: 150 }}>Ran {rule.fire_count || 0} {rule.fire_count === 1 ? 'time' : 'times'}<br /><span style={{ color: C.GRAY_500 }}>Last: {relTime(rule.last_fired_at)}</span></div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 14, color: C.INK, cursor: 'pointer' }}>
                    <input type="checkbox" role="switch" checked={rule.enabled} onChange={function () { toggleRule(rule.id, rule.enabled); }} style={{ width: 18, height: 18, accentColor: C.ACCENT }} />
                    {rule.enabled ? 'Active' : 'Paused'}
                  </label>
                  <button type="button" className="au-btn" style={{ color: C.DANGER }} onClick={function () { if (confirm('Delete this automation?')) deleteRule(rule.id); }}>Delete</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recipes */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontFamily: C.DISPLAY_FONT, fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em', color: C.INK }}>Or try a recipe</h2>
        <span style={{ fontSize: 15, color: C.GRAY_600 }}>Quick ways to get started with common automation flows.</span>
      </div>
      <div className="au-recipes">
        {RECIPES.map(function (r) {
          return (
            <article key={r.name} style={{ position: 'relative', overflow: 'hidden', display: 'flex', gap: 18, padding: 20, borderRadius: 8, border: '1px solid ' + C.BORDER, background: r.bg }}>
              <svg aria-hidden="true" width="140" height="120" viewBox="0 0 140 120" style={{ position: 'absolute', right: 0, bottom: 0 }}><path d="M140 10 A 110 110 0 0 0 30 120 L 140 120 Z" fill={r.art} opacity="0.55" /></svg>
              <span style={{ position: 'relative', width: 64, height: 64, borderRadius: 8, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.ACCENT, flexShrink: 0 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={r.icon} /></svg>
              </span>
              <div style={{ position: 'relative' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: C.INK }}>{r.name}</h3>
                <p style={{ margin: '6px 0 14px', fontSize: 15, color: C.GRAY_600, lineHeight: 1.45 }}>{r.body}</p>
                <button type="button" className="au-btn" onClick={function () { applyRecipe(r); }}>Use recipe <span aria-hidden="true"></span></button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div role="dialog" aria-modal="true" aria-labelledby="au-create-title" onMouseDown={function (e) { if (e.target === e.currentTarget) setShowCreate(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(11, 18, 51,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 28, width: 520, maxWidth: '100%', maxHeight: '86vh', overflow: 'auto', boxShadow: C.SHADOW_LG }}>
            <h2 id="au-create-title" style={{ margin: '0 0 22px', fontFamily: C.DISPLAY_FONT, fontSize: 26, fontWeight: 500, color: C.INK }}>Create automation</h2>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="au-name" style={labelStyle}>Name</label>
              <input id="au-name" type="text" placeholder="e.g. Send welcome email on quiz completion" value={formName} onChange={function (e) { setFormName(e.target.value); }} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="au-trigger" style={labelStyle}>When this happens</label>
              <select id="au-trigger" value={formTrigger} onChange={function (e) { setFormTrigger(e.target.value); }} style={{ ...inputStyle, cursor: 'pointer' }}>
                {TRIGGER_OPTIONS.map(function (o) { return <option key={o.value} value={o.value}>{o.label}</option>; })}
              </select>
            </div>
            {(formTrigger === 'quiz_completed' || formTrigger === 'lead_created') && quizzes.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="au-quiz" style={labelStyle}>For quiz (optional)</label>
                <select id="au-quiz" value={formQuizId} onChange={function (e) { setFormQuizId(e.target.value); }} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Any quiz</option>
                  {quizzes.map(function (q) { return <option key={q.id} value={q.id}>{q.title || 'Untitled'}</option>; })}
                </select>
              </div>
            )}
            <div style={{ marginBottom: 26 }}>
              <label htmlFor="au-action" style={labelStyle}>Do this</label>
              <select id="au-action" value={formAction} onChange={function (e) { setFormAction(e.target.value); }} style={{ ...inputStyle, cursor: 'pointer' }}>
                {ACTION_OPTIONS.map(function (o) { return <option key={o.value} value={o.value}>{o.label}</option>; })}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="au-btn" onClick={function () { setShowCreate(false); }}>Cancel</button>
              <button type="button" onClick={createRule} disabled={!formName.trim() || saving}
                style={{ height: 42, padding: '0 20px', borderRadius: 6, border: 'none', background: !formName.trim() || saving ? C.GRAY_100 : C.ACCENT, color: !formName.trim() || saving ? C.GRAY_400 : '#fff', fontSize: 15, fontFamily: C.FONT, cursor: !formName.trim() || saving ? 'default' : 'pointer' }}>
                {saving ? 'Creating...' : 'Create automation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

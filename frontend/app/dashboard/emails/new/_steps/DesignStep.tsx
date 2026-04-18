'use client';
import React, { useState } from 'react';
import { DASHBOARD_COLORS as C } from '../../../_components/DashboardShell';
import { GhostButton, PrimaryButton } from '../../../_components/PageShell';
import { EMAIL_TEMPLATES, EmailTemplate } from './templates';

export type DesignState = {
  templateId: string;
  subject: string;
  html: string;
  fromName: string;
  fromEmail: string;
};

export function DesignStep({
  state, setState, onNext, onBack,
}: {
  state: DesignState;
  setState: (u: Partial<DesignState>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');
  const [darkMode, setDarkMode] = useState(false);
  const [showHtml, setShowHtml] = useState(false);

  const pickTemplate = (t: EmailTemplate) => setState({
    templateId: t.id,
    html: t.html,
    subject: state.subject || t.subjectSuggestion,
  });

  const previewHtml = state.html
    .replace(/\{\{firstName\}\}/g, 'Alex')
    .replace(/\{\{outcomeTitle\}\}/g, 'The Curator')
    .replace(/\{\{quizTitle\}\}/g, 'Your quiz')
    .replace(/\{\{ctaUrl\}\}/g, '#')
    .replace(/\{\{brand\}\}/g, 'Your brand')
    .replace(/\{\{unsubscribeUrl\}\}/g, '#');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* LEFT: template + fields */}
      <div style={{ background: C.SURFACE, border: `1px solid ${C.BORDER}`, borderRadius: 16, padding: 24 }}>
        <h2 style={{ margin: '0 0 18px', fontSize: 20, color: C.TEXT }}>Pick a template</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
          {EMAIL_TEMPLATES.map(t => (
            <button key={t.id} onClick={() => pickTemplate(t)} style={{
              textAlign: 'left', padding: '12px 14px',
              background: state.templateId === t.id ? 'rgba(210,255,29,0.10)' : C.ELEVATED,
              border: `1px solid ${state.templateId === t.id ? C.ACCENT : C.BORDER}`,
              borderRadius: 10, cursor: 'pointer',
            }}>
              <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 13 }}>{t.name}</div>
              <div style={{ color: C.TEXT_SUBTLE, fontSize: 11, marginTop: 2 }}>{t.description}</div>
            </button>
          ))}
        </div>

        <Field label="Subject line">
          <input value={state.subject} onChange={e => setState({ subject: e.target.value })}
            placeholder="Your result is in" style={inputStyle} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="From name">
            <input value={state.fromName} onChange={e => setState({ fromName: e.target.value })}
              placeholder="Your brand" style={inputStyle} />
          </Field>
          <Field label="From email">
            <input value={state.fromEmail} onChange={e => setState({ fromEmail: e.target.value })}
              placeholder="hello@yourdomain.com" style={inputStyle} />
          </Field>
        </div>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Label>{showHtml ? 'HTML' : 'Content'}</Label>
          <button onClick={() => setShowHtml(v => !v)} style={{
            background: 'transparent', border: `1px solid ${C.BORDER}`,
            color: C.TEXT_MUTED, fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
          }}>{showHtml ? 'Edit visually' : 'Edit HTML'}</button>
        </div>
        <textarea value={state.html} onChange={e => setState({ html: e.target.value })}
          style={{ ...inputStyle, minHeight: 220, fontFamily: showHtml ? 'ui-monospace,monospace' : 'inherit', fontSize: showHtml ? 12 : 13 }} />
        <div style={{ color: C.TEXT_SUBTLE, fontSize: 11, marginTop: 6 }}>
          Variables: {'{{firstName}}'}, {'{{outcomeTitle}}'}, {'{{quizTitle}}'}, {'{{ctaUrl}}'}, {'{{brand}}'}
        </div>
      </div>

      {/* RIGHT: live preview */}
      <div style={{ background: C.SURFACE, border: `1px solid ${C.BORDER}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', minHeight: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: C.TEXT }}>Preview</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setDarkMode(d => !d)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: darkMode ? '#1a1a2e' : 'transparent',
              color: darkMode ? '#e0e0e0' : C.TEXT_MUTED,
              border: '1px solid ' + (darkMode ? '#333' : C.BORDER),
              padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              <svg width={13} height={13} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'/>
              </svg>
              Dark
            </button>
            <div style={{ display: 'flex', gap: 4, background: C.ELEVATED, borderRadius: 8, padding: 3 }}>
              {(['desktop', 'mobile'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  background: view === v ? C.ACCENT : 'transparent',
                  color: view === v ? '#0a0a0a' : C.TEXT_MUTED,
                  border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>{v === 'desktop'
                    ? <><svg width={13} height={13} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' style={{marginRight:5,verticalAlign:'middle'}}><rect x='2' y='3' width='20' height='14' rx='2'/><line x1='8' y1='21' x2='16' y2='21'/><line x1='12' y1='17' x2='12' y2='21'/></svg>Desktop</>
                    : <><svg width={13} height={13} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' style={{marginRight:5,verticalAlign:'middle'}}><rect x='5' y='2' width='14' height='20' rx='2'/><line x1='12' y1='18' x2='12.01' y2='18'/></svg>Mobile</> }</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{
          flex: 1, background: darkMode ? '#1a1a2e' : '#f5f5f7', borderRadius: 10, padding: 16,
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'auto',
          transition: 'background 0.2s ease',
        }}>
          <iframe
            title="preview"
            srcDoc={darkMode
              ? '<!doctype html><html><head><style>'
                + 'body{margin:0;background:#1a1a2e;color:#e0e0e0;}'
                + 'table,td,div,p,span,h1,h2,h3,h4,h5,h6,li,a{color:#e0e0e0 !important;}'
                + 'body,table,td,div{background-color:#1a1a2e !important;}'
                + 'a{color:#7eb8ff !important;}'
                + 'img{opacity:0.85;}'
                + 'h1,h2,h3{color:#f0f0f0 !important;}'
                + '</style></head><body>' + previewHtml + '</body></html>'
              : '<!doctype html><html><body style="margin:0;background:#f5f5f7;">' + previewHtml + '</body></html>'}
            style={{
              width: view === 'desktop' ? '100%' : 375,
              maxWidth: view === 'desktop' ? 640 : 375,
              minHeight: 560, border: 'none',
              background: darkMode ? '#1a1a2e' : '#fff',
              borderRadius: 8,
              transition: 'background 0.2s ease',
            }}
          />
        </div>
      </div>

      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <GhostButton onClick={onBack}>← Back</GhostButton>
        <PrimaryButton onClick={onNext} disabled={!state.subject || !state.html || !state.fromEmail}>
          Continue to review →
        </PrimaryButton>
      </div>
    </div>
  );
}

const Field = ({ label, children }: any) => (
  <div style={{ marginBottom: 12 }}>
    <Label>{label}</Label>
    {children}
  </div>
);
const Label = ({ children }: any) => (
  <div style={{ color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{children}</div>
);
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: C.ELEVATED,
  border: `1px solid ${C.BORDER}`, borderRadius: 10, color: C.TEXT, fontSize: 14,
};

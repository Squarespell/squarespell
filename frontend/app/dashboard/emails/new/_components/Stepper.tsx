'use client';
import React from 'react';
import { DASHBOARD_COLORS as C } from '../../../_components/DashboardShell';

export type StepKey = 'setup' | 'template' | 'audience' | 'design' | 'review';

var STEPS: { key: StepKey; label: string; hint: string }[] = [
  { key: 'setup',    label: 'Setup',    hint: 'Name your campaign' },
  { key: 'template', label: 'Template', hint: 'Pick a starting design' },
  { key: 'audience', label: 'Audience', hint: 'Who gets this email' },
  { key: 'design',   label: 'Edit',     hint: 'Customize the content' },
  { key: 'review',   label: 'Send',     hint: 'Preview and send' },
];

export function Stepper({ current, onJump }: { current: StepKey; onJump?: (k: StepKey) => void }) {
  var idx = STEPS.findIndex(function(s) { return s.key === current; });
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
      {STEPS.map(function(s, i) {
        var active = s.key === current;
        var done = i < idx;
        var clickable = !!onJump && (done || active);
        return (
          <button
            key={s.key}
            onClick={function() { if (clickable && onJump) onJump(s.key); }}
            disabled={!clickable}
            style={{
              flex: 1,
              textAlign: 'left',
              background: active ? C.ACCENT_LIGHT : C.SURFACE,
              border: '1px solid ' + (active ? C.ACCENT : C.BORDER),
              borderRadius: 14,
              padding: '12px 14px',
              cursor: clickable ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11,
                background: done ? C.ACCENT : active ? C.ACCENT : C.BORDER,
                color: done || active ? '#FFFFFF' : C.TEXT_MUTED,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>{done ? '\u2713' : i + 1}</div>
              <div style={{ color: active ? C.TEXT : done ? C.TEXT : C.TEXT_MUTED, fontWeight: 600, fontSize: 13 }}>
                {s.label}
              </div>
            </div>
            <div style={{ color: C.TEXT_SUBTLE, fontSize: 11, paddingLeft: 30 }}>{s.hint}</div>
          </button>
        );
      })}
    </div>
  );
}

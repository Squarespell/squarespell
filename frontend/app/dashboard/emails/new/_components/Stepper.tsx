'use client';
import React from 'react';
import { DASHBOARD_COLORS as C } from '../../../_components/DashboardShell';

export type StepKey = 'audience' | 'design' | 'review';

const STEPS: { key: StepKey; label: string; hint: string }[] = [
  { key: 'audience', label: 'Audience', hint: 'Who gets this email' },
  { key: 'design',   label: 'Design',   hint: 'Pick a template, edit the content' },
  { key: 'review',   label: 'Review',   hint: 'Preview, test, send' },
];

export function Stepper({ current, onJump }: { current: StepKey; onJump?: (k: StepKey) => void }) {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
      {STEPS.map((s, i) => {
        const active = s.key === current;
        const done = i < idx;
        const clickable = !!onJump && (done || active);
        return (
          <button
            key={s.key}
            onClick={() => clickable && onJump!(s.key)}
            disabled={!clickable}
            style={{
              flex: 1,
              textAlign: 'left',
              background: active ? C.ACCENT_LIGHT : C.SURFACE,
              border: `1px solid ${active ? C.ACCENT : C.BORDER}`,
              borderRadius: 14,
              padding: '14px 16px',
              cursor: clickable ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11,
                background: done ? C.ACCENT : active ? C.ACCENT : C.BORDER,
                color: done || active ? '#FFFFFF' : C.TEXT_MUTED,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>{done ? '✓' : i + 1}</div>
              <div style={{ color: active ? C.TEXT : done ? C.TEXT : C.TEXT_MUTED, fontWeight: 600, fontSize: 14 }}>
                {s.label}
              </div>
            </div>
            <div style={{ color: C.TEXT_SUBTLE, fontSize: 12, paddingLeft: 32 }}>{s.hint}</div>
          </button>
        );
      })}
    </div>
  );
}

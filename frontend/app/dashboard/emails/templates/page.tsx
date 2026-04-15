'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { DASHBOARD_COLORS as C } from '../../_components/DashboardShell';
import { PageHeader, Card, Pill, PrimaryButton } from '../../_components/PageShell';
import { EMAIL_TEMPLATES, EmailTemplate, TemplateCategory } from '../../../../lib/email_templates';

type CategoryFilter = 'all' | TemplateCategory;

const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  'post-quiz': 'Post-quiz',
  'outcome': 'Outcome',
  'nurture': 'Nurture',
  'abandoner': 'Abandoner',
  'booking': 'Booking',
  'discount': 'Discount',
};

const FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All templates' },
  { id: 'post-quiz', label: 'Post-quiz' },
  { id: 'outcome', label: 'Outcome' },
  { id: 'nurture', label: 'Nurture' },
  { id: 'abandoner', label: 'Abandoner' },
  { id: 'booking', label: 'Booking' },
  { id: 'discount', label: 'Discount' },
];

function IconMail({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 7 9-7" />
    </svg>
  );
}

function IconEye({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconClose({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6l-12 12" />
    </svg>
  );
}

function TemplateThumb({ template }: { template: EmailTemplate }) {
  const glyph = (() => {
    switch (template.category) {
      case 'post-quiz':
        return (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l2.09 4.24 4.68.68-3.39 3.3.8 4.66L12 13.77 7.82 15.88l.8-4.66L5.23 7.92l4.68-.68L12 3z" />
          </svg>
        );
      case 'outcome':
        return (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12l3 3 5-6" />
          </svg>
        );
      case 'nurture':
        return (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h4l2-4 4 8 2-4h4" />
          </svg>
        );
      case 'abandoner':
        return (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h13" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        );
      case 'booking':
        return (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 9h18M8 3v4M16 3v4" />
          </svg>
        );
      case 'discount':
        return (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 12l-8 8-9-9V3h8l9 9z" />
            <circle cx="7.5" cy="7.5" r="1.2" />
          </svg>
        );
    }
  })();

  return (
    <div
      style={{
        height: 120,
        borderRadius: 10,
        background: 'linear-gradient(180deg, #1a1a1d 0%, #131315 100%)',
        border: '1px solid ' + C.BORDER,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
      }}
    >
      {glyph}
    </div>
  );
}

function PreviewModal({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.BG_CARD,
          border: '1px solid ' + C.BORDER,
          borderRadius: 14,
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid ' + C.BORDER,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pill variant="accent">{CATEGORY_LABEL[template.category]}</Pill>
            <div style={{ color: C.TEXT_PRIMARY, fontSize: 15, fontWeight: 600 }}>{template.title}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close preview"
            style={{
              background: 'transparent',
              border: 'none',
              color: C.TEXT_MUTED,
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconClose size={18} />
          </button>
        </div>
        <div style={{ padding: '14px 20px 0', color: C.TEXT_MUTED, fontSize: 13, lineHeight: '18px' }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: C.TEXT_PRIMARY, fontWeight: 500 }}>Subject:</span> {template.defaultSubject}
          </div>
          <div>
            <span style={{ color: C.TEXT_PRIMARY, fontWeight: 500 }}>Preheader:</span> {template.defaultPreheader}
          </div>
        </div>
        <div style={{ padding: '14px 20px 20px', flex: 1, minHeight: 0 }}>
          <iframe
            title={template.title + ' preview'}
            srcDoc={template.html}
            sandbox=""
            style={{
              width: '100%',
              height: '55vh',
              border: '1px solid ' + C.BORDER,
              borderRadius: 10,
              background: '#0b0b0c',
            }}
          />
        </div>
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid ' + C.BORDER,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ color: C.TEXT_MUTED, fontSize: 12, lineHeight: '18px', maxWidth: 420 }}>
            {template.whyQuizNative}
          </div>
          <Link
            href={'/dashboard/emails/new?template=' + template.id}
            style={{ textDecoration: 'none' }}
          >
            <PrimaryButton>Use this template</PrimaryButton>
          </Link>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template, onPreview }: { template: EmailTemplate; onPreview: (t: EmailTemplate) => void }) {
  return (
    <Card>
      <TemplateThumb template={template} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Pill variant="accent">{CATEGORY_LABEL[template.category]}</Pill>
      </div>
      <div style={{ color: C.TEXT_PRIMARY, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{template.title}</div>
      <div style={{ color: C.TEXT_MUTED, fontSize: 13, lineHeight: '19px', marginBottom: 10 }}>{template.oneLiner}</div>
      <div
        style={{
          color: C.TEXT_MUTED,
          fontSize: 12,
          lineHeight: '17px',
          marginBottom: 14,
          paddingLeft: 10,
          borderLeft: '2px solid ' + C.ACCENT,
        }}
      >
        {template.whyQuizNative}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onPreview(template)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            background: 'transparent',
            color: C.TEXT_PRIMARY,
            border: '1px solid ' + C.BORDER,
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          <IconEye size={14} />
          Preview
        </button>
        <Link href={'/dashboard/emails/new?template=' + template.id} style={{ textDecoration: 'none', flex: 1 }}>
          <PrimaryButton style={{ width: '100%' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconMail size={14} />
              Use template
            </span>
          </PrimaryButton>
        </Link>
      </div>
    </Card>
  );
}

export default function EmailTemplatesPage() {
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [preview, setPreview] = useState<EmailTemplate | null>(null);

  const visible = useMemo(() => {
    if (filter === 'all') return EMAIL_TEMPLATES;
    return EMAIL_TEMPLATES.filter((t) => t.category === filter);
  }, [filter]);

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        title="Email templates"
        subtitle="Six starting points, each one only works because the recipient just took your quiz."
      />

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '7px 13px',
                borderRadius: 999,
                border: '1px solid ' + (active ? C.ACCENT : C.BORDER),
                background: active ? 'rgba(210,255,29,0.1)' : 'transparent',
                color: active ? C.ACCENT : C.TEXT_PRIMARY,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}
      >
        {visible.map((t) => (
          <TemplateCard key={t.id} template={t} onPreview={setPreview} />
        ))}
      </div>

      {preview ? <PreviewModal template={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}

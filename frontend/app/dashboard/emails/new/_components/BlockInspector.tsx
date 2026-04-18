'use client';

/**
 * BlockInspector - right sidebar that edits the selected block's properties.
 *
 * Renders contextual form fields based on block.type. All changes flow
 * back via onUpdate(updatedBlock).
 */

import React from 'react';
import { DASHBOARD_COLORS as C } from '../../../_components/dashboardColors';
import {
  Block,
  HeroBlock,
  HeadingBlock,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  DividerBlock,
  SpacerBlock,
  CardGridBlock,
  TestimonialBlock,
  StatBlock,
  SignatureBlock,
  PostscriptBlock,
  FooterBlock,
  Alignment,
  ButtonVariant,
} from '../../../../../lib/email/blocks';

/* ------------------------------------------------------------------ */
/*  Shared field components                                           */
/* ------------------------------------------------------------------ */

const fieldStyle: React.CSSProperties = { marginBottom: 14 };
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 700,
  color: C.TEXT_MUTED,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: 5,
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: C.ELEVATED,
  border: `1px solid ${C.BORDER}`,
  borderRadius: 8,
  color: C.TEXT,
  fontSize: 13,
  fontFamily: 'inherit',
};
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'auto' as React.CSSProperties['appearance'],
};
const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 80,
  resize: 'vertical',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function AlignField({ value, onChange }: { value?: Alignment; onChange: (v: Alignment) => void }) {
  return (
    <Field label="Alignment">
      <div style={{ display: 'flex', gap: 4 }}>
        {(['left', 'center', 'right'] as Alignment[]).map(a => (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            style={{
              flex: 1,
              padding: '6px 0',
              background: value === a ? C.ACCENT_LIGHT : 'transparent',
              border: `1px solid ${value === a ? C.ACCENT : C.BORDER}`,
              borderRadius: 6,
              color: value === a ? C.ACCENT : C.TEXT_MUTED,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {a}
          </button>
        ))}
      </div>
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/*  Per-type inspectors                                               */
/* ------------------------------------------------------------------ */

function HeroInspector({ block, onUpdate }: { block: HeroBlock; onUpdate: (b: Block) => void }) {
  const set = (p: Partial<HeroBlock>) => onUpdate({ ...block, ...p });
  return (
    <>
      <Field label="Variant">
        <select value={block.variant} onChange={e => set({ variant: e.target.value as HeroBlock['variant'] })} style={selectStyle}>
          <option value="gradient">Gradient</option>
          <option value="image">Image</option>
          <option value="illustration">Illustration</option>
        </select>
      </Field>
      <Field label="Eyebrow"><input value={block.eyebrow || ''} onChange={e => set({ eyebrow: e.target.value })} style={inputStyle} placeholder="Optional small label" /></Field>
      <Field label="Headline"><input value={block.headline} onChange={e => set({ headline: e.target.value })} style={inputStyle} /></Field>
      <Field label="Subheadline"><input value={block.subheadline || ''} onChange={e => set({ subheadline: e.target.value })} style={inputStyle} /></Field>
      {block.variant === 'gradient' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="From color"><input type="color" value={block.gradientFrom || C.ACCENT} onChange={e => set({ gradientFrom: e.target.value })} style={{ ...inputStyle, height: 36, padding: 4 }} /></Field>
          <Field label="To color"><input type="color" value={block.gradientTo || C.ACCENT} onChange={e => set({ gradientTo: e.target.value })} style={{ ...inputStyle, height: 36, padding: 4 }} /></Field>
        </div>
      )}
      {block.variant === 'image' && (
        <Field label="Image URL"><input value={block.imageUrl || ''} onChange={e => set({ imageUrl: e.target.value })} style={inputStyle} placeholder="https://..." /></Field>
      )}
      <Field label="CTA label"><input value={block.ctaLabel || ''} onChange={e => set({ ctaLabel: e.target.value })} style={inputStyle} placeholder="Optional button text" /></Field>
      <Field label="CTA URL"><input value={block.ctaUrl || ''} onChange={e => set({ ctaUrl: e.target.value })} style={inputStyle} placeholder="{{ctaUrl}}" /></Field>
      <AlignField value={block.align} onChange={align => set({ align })} />
    </>
  );
}

function HeadingInspector({ block, onUpdate }: { block: HeadingBlock; onUpdate: (b: Block) => void }) {
  const set = (p: Partial<HeadingBlock>) => onUpdate({ ...block, ...p });
  return (
    <>
      <Field label="Level">
        <select value={block.level} onChange={e => set({ level: Number(e.target.value) as 1 | 2 | 3 })} style={selectStyle}>
          <option value={1}>H1 - Large</option>
          <option value={2}>H2 - Medium</option>
          <option value={3}>H3 - Small</option>
        </select>
      </Field>
      <Field label="Text"><input value={block.text} onChange={e => set({ text: e.target.value })} style={inputStyle} /></Field>
      <AlignField value={block.align} onChange={align => set({ align })} />
    </>
  );
}

function TextInspector({ block, onUpdate }: { block: TextBlock; onUpdate: (b: Block) => void }) {
  const set = (p: Partial<TextBlock>) => onUpdate({ ...block, ...p });
  return (
    <>
      <Field label="Content">
        <textarea value={block.content} onChange={e => set({ content: e.target.value })} style={textareaStyle} />
        <div style={{ fontSize: 10, color: C.TEXT_SUBTLE, marginTop: 4 }}>
          Supports &lt;strong&gt;, &lt;em&gt;, &lt;a href=&quot;...&quot;&gt; tags and merge tags.
        </div>
      </Field>
      <AlignField value={block.align} onChange={align => set({ align })} />
    </>
  );
}

function ImageInspector({ block, onUpdate }: { block: ImageBlock; onUpdate: (b: Block) => void }) {
  const set = (p: Partial<ImageBlock>) => onUpdate({ ...block, ...p });
  return (
    <>
      <Field label="Image URL"><input value={block.url} onChange={e => set({ url: e.target.value })} style={inputStyle} placeholder="https://..." /></Field>
      <Field label="Alt text"><input value={block.alt} onChange={e => set({ alt: e.target.value })} style={inputStyle} /></Field>
      <Field label="Max width (px)"><input type="number" value={block.width || 560} onChange={e => set({ width: Number(e.target.value) })} style={inputStyle} /></Field>
      <Field label="Link URL"><input value={block.href || ''} onChange={e => set({ href: e.target.value })} style={inputStyle} placeholder="Optional click-through URL" /></Field>
      <Field label="Caption"><input value={block.caption || ''} onChange={e => set({ caption: e.target.value })} style={inputStyle} /></Field>
    </>
  );
}

function ButtonInspector({ block, onUpdate }: { block: ButtonBlock; onUpdate: (b: Block) => void }) {
  const set = (p: Partial<ButtonBlock>) => onUpdate({ ...block, ...p });
  return (
    <>
      <Field label="Label"><input value={block.label} onChange={e => set({ label: e.target.value })} style={inputStyle} /></Field>
      <Field label="URL"><input value={block.url} onChange={e => set({ url: e.target.value })} style={inputStyle} /></Field>
      <Field label="Variant">
        <select value={block.variant || 'primary'} onChange={e => set({ variant: e.target.value as ButtonVariant })} style={selectStyle}>
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="ghost">Ghost</option>
        </select>
      </Field>
      <Field label="Full width">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.TEXT }}>
          <input type="checkbox" checked={block.fullWidth || false} onChange={e => set({ fullWidth: e.target.checked })} />
          Stretch to full width
        </label>
      </Field>
      <AlignField value={block.align} onChange={align => set({ align })} />
    </>
  );
}

function DividerInspector({ block, onUpdate }: { block: DividerBlock; onUpdate: (b: Block) => void }) {
  const set = (p: Partial<DividerBlock>) => onUpdate({ ...block, ...p });
  return (
    <Field label="Style">
      <select value={block.style || 'solid'} onChange={e => set({ style: e.target.value as 'solid' | 'dashed' })} style={selectStyle}>
        <option value="solid">Solid</option>
        <option value="dashed">Dashed</option>
      </select>
    </Field>
  );
}

function SpacerInspector({ block, onUpdate }: { block: SpacerBlock; onUpdate: (b: Block) => void }) {
  const set = (p: Partial<SpacerBlock>) => onUpdate({ ...block, ...p });
  return (
    <Field label="Height (px)">
      <input type="number" min={4} max={120} value={block.height} onChange={e => set({ height: Number(e.target.value) })} style={inputStyle} />
    </Field>
  );
}

function TestimonialInspector({ block, onUpdate }: { block: TestimonialBlock; onUpdate: (b: Block) => void }) {
  const set = (p: Partial<TestimonialBlock>) => onUpdate({ ...block, ...p });
  return (
    <>
      <Field label="Quote"><textarea value={block.quote} onChange={e => set({ quote: e.target.value })} style={textareaStyle} /></Field>
      <Field label="Author name"><input value={block.authorName} onChange={e => set({ authorName: e.target.value })} style={inputStyle} /></Field>
      <Field label="Author title"><input value={block.authorTitle || ''} onChange={e => set({ authorTitle: e.target.value })} style={inputStyle} /></Field>
      <Field label="Avatar URL"><input value={block.authorAvatarUrl || ''} onChange={e => set({ authorAvatarUrl: e.target.value })} style={inputStyle} placeholder="Optional avatar image" /></Field>
      <Field label="Rating">
        <select value={block.rating || ''} onChange={e => set({ rating: e.target.value ? (Number(e.target.value) as 1|2|3|4|5) : undefined })} style={selectStyle}>
          <option value="">No rating</option>
          {[5,4,3,2,1].map(n => <option key={n} value={n}>{'*'.repeat(n)} ({n} stars)</option>)}
        </select>
      </Field>
    </>
  );
}

function StatInspector({ block, onUpdate }: { block: StatBlock; onUpdate: (b: Block) => void }) {
  const set = (p: Partial<StatBlock>) => onUpdate({ ...block, ...p });
  return (
    <>
      <Field label="Columns">
        <select value={block.columns} onChange={e => set({ columns: Number(e.target.value) as 2|3|4 })} style={selectStyle}>
          <option value={2}>2 columns</option>
          <option value={3}>3 columns</option>
          <option value={4}>4 columns</option>
        </select>
      </Field>
      {block.items.map((item, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
          <Field label={`Stat ${i + 1} value`}><input value={item.value} onChange={e => {
            const items = [...block.items];
            items[i] = { ...items[i], value: e.target.value };
            set({ items });
          }} style={inputStyle} /></Field>
          <Field label={`Stat ${i + 1} label`}><input value={item.label} onChange={e => {
            const items = [...block.items];
            items[i] = { ...items[i], label: e.target.value };
            set({ items });
          }} style={inputStyle} /></Field>
        </div>
      ))}
    </>
  );
}

function SignatureInspector({ block, onUpdate }: { block: SignatureBlock; onUpdate: (b: Block) => void }) {
  const set = (p: Partial<SignatureBlock>) => onUpdate({ ...block, ...p });
  return (
    <>
      <Field label="Name"><input value={block.name} onChange={e => set({ name: e.target.value })} style={inputStyle} /></Field>
      <Field label="Title"><input value={block.title || ''} onChange={e => set({ title: e.target.value })} style={inputStyle} /></Field>
      <Field label="Message"><textarea value={block.message || ''} onChange={e => set({ message: e.target.value })} style={textareaStyle} placeholder="Optional note above signature" /></Field>
      <Field label="Avatar URL"><input value={block.avatarUrl || ''} onChange={e => set({ avatarUrl: e.target.value })} style={inputStyle} /></Field>
    </>
  );
}

function PostscriptInspector({ block, onUpdate }: { block: PostscriptBlock; onUpdate: (b: Block) => void }) {
  const set = (p: Partial<PostscriptBlock>) => onUpdate({ ...block, ...p });
  return (
    <Field label="Content"><textarea value={block.content} onChange={e => set({ content: e.target.value })} style={textareaStyle} /></Field>
  );
}

function FooterInspector({ block, onUpdate }: { block: FooterBlock; onUpdate: (b: Block) => void }) {
  const set = (p: Partial<FooterBlock>) => onUpdate({ ...block, ...p });
  return (
    <>
      <Field label="Show unsubscribe">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.TEXT }}>
          <input type="checkbox" checked={block.showUnsubscribe} onChange={e => set({ showUnsubscribe: e.target.checked })} />
          Include unsubscribe link
        </label>
      </Field>
      <Field label="Preference center">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.TEXT }}>
          <input type="checkbox" checked={block.showPreferenceCenter} onChange={e => set({ showPreferenceCenter: e.target.checked })} />
          Include preference center link
        </label>
      </Field>
      <Field label="Legal note"><input value={block.legalNote || ''} onChange={e => set({ legalNote: e.target.value })} style={inputStyle} placeholder="Copyright line or disclaimer" /></Field>
    </>
  );
}

function CardGridInspector({ block, onUpdate }: { block: CardGridBlock; onUpdate: (b: Block) => void }) {
  const set = (p: Partial<CardGridBlock>) => onUpdate({ ...block, ...p });
  const updateCard = (i: number, patch: Partial<CardGridBlock['cards'][0]>) => {
    const cards = block.cards.map((c, j) => j === i ? { ...c, ...patch } : c);
    set({ cards });
  };
  return (
    <>
      <Field label="Columns">
        <select value={block.columns} onChange={e => set({ columns: Number(e.target.value) as 2|3 })} style={selectStyle}>
          <option value={2}>2 columns</option>
          <option value={3}>3 columns</option>
        </select>
      </Field>
      {block.cards.map((card, i) => (
        <div key={card.id} style={{
          padding: 10, background: 'rgba(0,0,0,0.02)',
          border: `1px solid ${C.HAIRLINE}`, borderRadius: 8, marginBottom: 8,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.TEXT_MUTED, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Card {i + 1}
          </div>
          <Field label="Title"><input value={card.title} onChange={e => updateCard(i, { title: e.target.value })} style={inputStyle} /></Field>
          <Field label="Body"><input value={card.body || ''} onChange={e => updateCard(i, { body: e.target.value })} style={inputStyle} /></Field>
          <Field label="CTA label"><input value={card.ctaLabel || ''} onChange={e => updateCard(i, { ctaLabel: e.target.value })} style={inputStyle} /></Field>
          <Field label="CTA URL"><input value={card.ctaUrl || ''} onChange={e => updateCard(i, { ctaUrl: e.target.value })} style={inputStyle} /></Field>
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main inspector component                                         */
/* ------------------------------------------------------------------ */

export interface BlockInspectorProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onClose: () => void;
}

export function BlockInspector({ block, onUpdate, onClose }: BlockInspectorProps) {
  return (
    <div style={{
      background: C.SURFACE,
      border: `1px solid ${C.BORDER}`,
      borderRadius: 14,
      padding: 18,
      overflow: 'auto',
      maxHeight: 'calc(100vh - 200px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.TEXT, textTransform: 'capitalize' }}>
          {block.type === 'cardGrid' ? 'Card Grid' : block.type} settings
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', color: C.TEXT_MUTED, cursor: 'pointer',
            borderRadius: 6,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} />
          </svg>
        </button>
      </div>

      {block.type === 'hero' && <HeroInspector block={block as HeroBlock} onUpdate={onUpdate} />}
      {block.type === 'heading' && <HeadingInspector block={block as HeadingBlock} onUpdate={onUpdate} />}
      {block.type === 'text' && <TextInspector block={block as TextBlock} onUpdate={onUpdate} />}
      {block.type === 'image' && <ImageInspector block={block as ImageBlock} onUpdate={onUpdate} />}
      {block.type === 'button' && <ButtonInspector block={block as ButtonBlock} onUpdate={onUpdate} />}
      {block.type === 'divider' && <DividerInspector block={block as DividerBlock} onUpdate={onUpdate} />}
      {block.type === 'spacer' && <SpacerInspector block={block as SpacerBlock} onUpdate={onUpdate} />}
      {block.type === 'cardGrid' && <CardGridInspector block={block as CardGridBlock} onUpdate={onUpdate} />}
      {block.type === 'testimonial' && <TestimonialInspector block={block as TestimonialBlock} onUpdate={onUpdate} />}
      {block.type === 'stat' && <StatInspector block={block as StatBlock} onUpdate={onUpdate} />}
      {block.type === 'signature' && <SignatureInspector block={block as SignatureBlock} onUpdate={onUpdate} />}
      {block.type === 'postscript' && <PostscriptInspector block={block as PostscriptBlock} onUpdate={onUpdate} />}
      {block.type === 'footer' && <FooterInspector block={block as FooterBlock} onUpdate={onUpdate} />}
    </div>
  );
}

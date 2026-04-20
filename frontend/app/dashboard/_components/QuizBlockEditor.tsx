'use client';

/**
 * QuizBlockEditor - drag-drop visual block editor for quiz construction.
 *
 * Renders quiz blocks (questions, content, outcomes, lead gate) as
 * editable cards with:
 *   - Click to select (opens property inspector)
 *   - Drag handle to reorder
 *   - Add-block inserter between blocks
 *   - Delete / duplicate from inline controls
 *   - Keyboard shortcuts (arrows, delete, Cmd+D, Cmd+N)
 *   - Undo/redo history
 *   - Auto-save via onChange callback
 *
 * Uses native HTML drag-and-drop. No external dependencies.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { DASHBOARD_COLORS as C } from './DashboardShell';
import {
  QuizBlock,
  QuizBlockType,
  QuestionBlock,
  HeadingBlock,
  TextBlock,
  ImageBlock,
  OutcomeBlock,
  LeadGateBlock,
  LogicBlock,
  QUIZ_PALETTE,
  createDefaultQuizBlock,
  uid,
} from '../../../lib/quiz/blocks';

/* ------------------------------------------------------------------ */
/*  Block label + preview helpers                                     */
/* ------------------------------------------------------------------ */

function blockLabel(b: QuizBlock): string {
  switch (b.type) {
    case 'question': return 'Question';
    case 'heading': return 'H' + (b as HeadingBlock).level + ' Heading';
    case 'text': return 'Text';
    case 'image': return 'Image';
    case 'divider': return 'Divider';
    case 'outcome': return 'Outcome';
    case 'leadGate': return 'Lead Gate';
    case 'logic': return 'Logic';
    default: return (b as any).type;
  }
}

function blockPreview(b: QuizBlock): string {
  switch (b.type) {
    case 'question': return (b as QuestionBlock).text || '';
    case 'heading': return (b as HeadingBlock).text || '';
    case 'text': return ((b as TextBlock).content || '').slice(0, 80);
    case 'image': return (b as ImageBlock).alt || '(no alt text)';
    case 'outcome': return (b as OutcomeBlock).title || '';
    case 'leadGate': return (b as LeadGateBlock).headline || '';
    case 'logic': return (b as LogicBlock).condition || '';
    default: return '';
  }
}

function blockColor(type: QuizBlockType): string {
  switch (type) {
    case 'question': return C.ACCENT;
    case 'outcome': return '#4cd964';
    case 'leadGate': return '#ff9500';
    case 'logic': return '#af52de';
    default: return C.TEXT_MUTED;
  }
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                         */
/* ------------------------------------------------------------------ */

function PaletteIcon({ d }: { d: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function DragHandle() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.4 }}>
      <circle cx={9} cy={5} r={1.5} /><circle cx={15} cy={5} r={1.5} />
      <circle cx={9} cy={12} r={1.5} /><circle cx={15} cy={12} r={1.5} />
      <circle cx={9} cy={19} r={1.5} /><circle cx={15} cy={19} r={1.5} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Undo/redo history                                                 */
/* ------------------------------------------------------------------ */

var MAX_HISTORY = 50;

function useHistory(initial: QuizBlock[]) {
  var [stack, setStack] = useState<QuizBlock[][]>([initial]);
  var [index, setIndex] = useState(0);

  var current = stack[index] || initial;

  var push = useCallback(function(next: QuizBlock[]) {
    setStack(function(prev) {
      var newStack = prev.slice(0, index + 1);
      newStack.push(next);
      if (newStack.length > MAX_HISTORY) newStack = newStack.slice(newStack.length - MAX_HISTORY);
      return newStack;
    });
    setIndex(function(prev) { return Math.min(prev + 1, MAX_HISTORY - 1); });
  }, [index]);

  var undo = useCallback(function() {
    setIndex(function(prev) { return Math.max(prev - 1, 0); });
  }, []);

  var redo = useCallback(function() {
    setIndex(function(prev) { return Math.min(prev + 1, stack.length - 1); });
  }, [stack.length]);

  var canUndo = index > 0;
  var canRedo = index < stack.length - 1;

  return { current: current, push: push, undo: undo, redo: redo, canUndo: canUndo, canRedo: canRedo };
}

/* ------------------------------------------------------------------ */
/*  Add-block inserter                                                */
/* ------------------------------------------------------------------ */

function AddBlockInserter({
  onAdd,
  expanded,
  onToggle,
}: {
  onAdd: (type: QuizBlockType) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '1px dashed ' + (expanded ? C.ACCENT : C.BORDER),
          background: expanded ? C.ACCENT_LIGHT : 'transparent',
          color: expanded ? C.ACCENT : C.TEXT_MUTED,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2.5} strokeLinecap="round">
          <line x1={12} y1={5} x2={12} y2={19} />
          <line x1={5} y1={12} x2={19} y2={12} />
        </svg>
      </button>

      {expanded && (
        <div style={{
          position: 'absolute', top: 36, left: '50%', transform: 'translateX(-50%)',
          zIndex: 20, background: C.ELEVATED, border: '1px solid ' + C.BORDER,
          borderRadius: 14, padding: 10,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
          minWidth: 320, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>
          {QUIZ_PALETTE.map(function(p) {
            return (
              <button
                key={p.type}
                type="button"
                onClick={function() { onAdd(p.type); onToggle(); }}
                title={p.description}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, padding: '10px 6px',
                  background: 'transparent', border: 'none', borderRadius: 8,
                  color: C.TEXT_MUTED, fontSize: 10, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.12s ease',
                  fontFamily: 'Inter,system-ui,sans-serif',
                }}
                onMouseEnter={function(e) {
                  e.currentTarget.style.background = C.ACCENT_LIGHT;
                  e.currentTarget.style.color = C.ACCENT;
                }}
                onMouseLeave={function(e) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = C.TEXT_MUTED;
                }}
              >
                <PaletteIcon d={p.icon} />
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Block card (canvas row)                                           */
/* ------------------------------------------------------------------ */

function BlockCard({
  block,
  index,
  selected,
  onSelect,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDrop,
  dragOver,
}: {
  block: QuizBlock;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dragOver: boolean;
}) {
  var label = blockLabel(block);
  var preview = blockPreview(block);
  var color = blockColor(block.type);
  var questionNum = block.type === 'question' ? index + 1 : null;

  return (
    <div
      data-block-id={block.id}
      onClick={onSelect}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px',
        background: selected ? 'rgba(13,115,119,0.04)' : C.ELEVATED,
        border: '1px solid ' + (selected ? C.ACCENT : C.HAIRLINE),
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        borderTopWidth: dragOver ? 3 : 1,
        borderTopColor: dragOver ? C.ACCENT : (selected ? C.ACCENT : C.HAIRLINE),
      }}
    >
      {/* Drag handle */}
      <div
        draggable
        onDragStart={onDragStart}
        style={{ cursor: 'grab', padding: '4px 2px', flexShrink: 0 }}
      >
        <DragHandle />
      </div>

      {/* Type badge */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: color + '12',
        border: '1px solid ' + color + '30',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {questionNum !== null ? (
          <span style={{ fontSize: 14, fontWeight: 700, color: color }}>{questionNum}</span>
        ) : (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color}
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d={QUIZ_PALETTE.find(function(p) { return p.type === block.type; })?.icon || ''} />
          </svg>
        )}
      </div>

      {/* Block info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', marginBottom: 2,
          color: selected ? C.ACCENT : C.TEXT_MUTED,
        }}>
          {label}
        </div>
        {preview && (
          <div style={{
            fontSize: 13, color: C.TEXT, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {preview}
          </div>
        )}
        {block.type === 'question' && (
          <div style={{ fontSize: 11, color: C.TEXT_SUBTLE, marginTop: 3 }}>
            {(block as QuestionBlock).options.length} options
            {(block as QuestionBlock).questionStyle !== 'buttons' ? ' - ' + (block as QuestionBlock).questionStyle : ''}
          </div>
        )}
      </div>

      {/* Inline actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
        onClick={function(e) { e.stopPropagation(); }}
      >
        <button
          type="button"
          onClick={onDuplicate}
          title="Duplicate"
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'transparent', border: 'none',
            color: C.TEXT_SUBTLE, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={function(e) { e.currentTarget.style.background = C.SIDEBAR; }}
          onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x={9} y={9} width={13} height={13} rx={2} ry={2} />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'transparent', border: 'none',
            color: C.TEXT_SUBTLE, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(255,59,48,0.08)'; e.currentTarget.style.color = '#ff3b30'; }}
          onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.TEXT_SUBTLE; }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Property inspector                                                */
/* ------------------------------------------------------------------ */

function InspectorField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED,
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

var inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  background: C.BG, border: '1px solid ' + C.BORDER,
  borderRadius: 8, color: C.TEXT, fontFamily: 'Inter,system-ui,sans-serif',
  outline: 'none',
};

var selectStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  background: C.BG, border: '1px solid ' + C.BORDER,
  borderRadius: 8, color: C.TEXT, fontFamily: 'Inter,system-ui,sans-serif',
  outline: 'none', cursor: 'pointer',
};

function BlockInspector({
  block,
  allBlocks,
  onChange,
}: {
  block: QuizBlock;
  allBlocks: QuizBlock[];
  onChange: (updated: QuizBlock) => void;
}) {
  function updateField(key: string, value: any) {
    onChange(Object.assign({}, block, { [key]: value }));
  }

  // Question inspector
  if (block.type === 'question') {
    var qb = block as QuestionBlock;
    return (
      <div>
        <InspectorField label="Question text">
          <textarea
            value={qb.text}
            onChange={function(e) { updateField('text', e.target.value); }}
            style={Object.assign({}, inputStyle, { minHeight: 72, resize: 'vertical' as const })}
          />
        </InspectorField>

        <InspectorField label="Subtitle (optional)">
          <input
            value={qb.subtitle || ''}
            onChange={function(e) { updateField('subtitle', e.target.value); }}
            style={inputStyle}
            placeholder="Additional context..."
          />
        </InspectorField>

        <InspectorField label="Answer style">
          <select
            value={qb.questionStyle}
            onChange={function(e) { updateField('questionStyle', e.target.value); }}
            style={selectStyle}
          >
            <option value="buttons">Buttons</option>
            <option value="cards">Cards</option>
            <option value="dropdown">Dropdown</option>
            <option value="imageChoice">Image choice</option>
          </select>
        </InspectorField>

        <InspectorField label="Options">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {qb.options.map(function(opt, oi) {
              return (
                <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: C.TEXT_SUBTLE, width: 18, textAlign: 'center', flexShrink: 0 }}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <input
                    value={opt.text}
                    onChange={function(e) {
                      var newOpts = qb.options.slice();
                      newOpts[oi] = Object.assign({}, opt, { text: e.target.value });
                      updateField('options', newOpts);
                    }}
                    style={Object.assign({}, inputStyle, { flex: 1 })}
                    placeholder={'Option ' + String.fromCharCode(65 + oi)}
                  />
                  <input
                    type="number"
                    value={opt.score || 0}
                    onChange={function(e) {
                      var newOpts = qb.options.slice();
                      newOpts[oi] = Object.assign({}, opt, { score: parseInt(e.target.value) || 0 });
                      updateField('options', newOpts);
                    }}
                    style={Object.assign({}, inputStyle, { width: 52, textAlign: 'center' as const, padding: '9px 6px' })}
                    title="Score"
                  />
                  {qb.options.length > 2 && (
                    <button
                      type="button"
                      onClick={function() {
                        var newOpts = qb.options.filter(function(_, idx) { return idx !== oi; });
                        updateField('options', newOpts);
                      }}
                      style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: 'transparent', border: 'none',
                        color: C.TEXT_SUBTLE, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
            {qb.options.length < 8 && (
              <button
                type="button"
                onClick={function() {
                  var newOpts = qb.options.slice();
                  newOpts.push({ id: uid(), text: '', score: 0 });
                  updateField('options', newOpts);
                }}
                style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: 'transparent', border: '1px dashed ' + C.BORDER,
                  color: C.TEXT_MUTED, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter,system-ui,sans-serif',
                }}
              >
                + Add option
              </button>
            )}
          </div>
        </InspectorField>
      </div>
    );
  }

  // Heading inspector
  if (block.type === 'heading') {
    var hb = block as HeadingBlock;
    return (
      <div>
        <InspectorField label="Text">
          <input value={hb.text} onChange={function(e) { updateField('text', e.target.value); }} style={inputStyle} />
        </InspectorField>
        <InspectorField label="Level">
          <select value={hb.level} onChange={function(e) { updateField('level', parseInt(e.target.value)); }} style={selectStyle}>
            <option value={1}>H1 - Large</option>
            <option value={2}>H2 - Medium</option>
            <option value={3}>H3 - Small</option>
          </select>
        </InspectorField>
        <InspectorField label="Alignment">
          <select value={hb.align || 'left'} onChange={function(e) { updateField('align', e.target.value); }} style={selectStyle}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </InspectorField>
      </div>
    );
  }

  // Text inspector
  if (block.type === 'text') {
    var tb = block as TextBlock;
    return (
      <div>
        <InspectorField label="Content">
          <textarea
            value={tb.content}
            onChange={function(e) { updateField('content', e.target.value); }}
            style={Object.assign({}, inputStyle, { minHeight: 100, resize: 'vertical' as const })}
          />
        </InspectorField>
        <InspectorField label="Alignment">
          <select value={tb.align || 'left'} onChange={function(e) { updateField('align', e.target.value); }} style={selectStyle}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </InspectorField>
      </div>
    );
  }

  // Image inspector
  if (block.type === 'image') {
    var ib = block as ImageBlock;
    return (
      <div>
        <InspectorField label="Image URL">
          <input value={ib.url} onChange={function(e) { updateField('url', e.target.value); }} style={inputStyle} placeholder="https://..." />
        </InspectorField>
        <InspectorField label="Alt text">
          <input value={ib.alt} onChange={function(e) { updateField('alt', e.target.value); }} style={inputStyle} />
        </InspectorField>
        <InspectorField label="Max width (px)">
          <input type="number" value={ib.width || 560} onChange={function(e) { updateField('width', parseInt(e.target.value) || 560); }} style={inputStyle} />
        </InspectorField>
      </div>
    );
  }

  // Outcome inspector
  if (block.type === 'outcome') {
    var ob = block as OutcomeBlock;
    return (
      <div>
        <InspectorField label="Title">
          <input value={ob.title} onChange={function(e) { updateField('title', e.target.value); }} style={inputStyle} />
        </InspectorField>
        <InspectorField label="Description">
          <textarea
            value={ob.description}
            onChange={function(e) { updateField('description', e.target.value); }}
            style={Object.assign({}, inputStyle, { minHeight: 80, resize: 'vertical' as const })}
          />
        </InspectorField>
        <InspectorField label="CTA text">
          <input value={ob.ctaText || ''} onChange={function(e) { updateField('ctaText', e.target.value); }} style={inputStyle} placeholder="Learn more" />
        </InspectorField>
        <InspectorField label="CTA URL">
          <input value={ob.ctaUrl || ''} onChange={function(e) { updateField('ctaUrl', e.target.value); }} style={inputStyle} placeholder="https://..." />
        </InspectorField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <InspectorField label="Min score">
            <input type="number" value={ob.minScore ?? ''} onChange={function(e) { updateField('minScore', e.target.value === '' ? undefined : parseInt(e.target.value)); }} style={inputStyle} />
          </InspectorField>
          <InspectorField label="Max score">
            <input type="number" value={ob.maxScore ?? ''} onChange={function(e) { updateField('maxScore', e.target.value === '' ? undefined : parseInt(e.target.value)); }} style={inputStyle} />
          </InspectorField>
        </div>
      </div>
    );
  }

  // Lead gate inspector
  if (block.type === 'leadGate') {
    var lgb = block as LeadGateBlock;
    return (
      <div>
        <InspectorField label="Headline">
          <input value={lgb.headline} onChange={function(e) { updateField('headline', e.target.value); }} style={inputStyle} />
        </InspectorField>
        <InspectorField label="Subtext">
          <input value={lgb.subtext || ''} onChange={function(e) { updateField('subtext', e.target.value); }} style={inputStyle} />
        </InspectorField>
        <InspectorField label="Button label">
          <input value={lgb.buttonLabel} onChange={function(e) { updateField('buttonLabel', e.target.value); }} style={inputStyle} />
        </InspectorField>
        <InspectorField label="Placement">
          <select value={lgb.placement} onChange={function(e) { updateField('placement', e.target.value); }} style={selectStyle}>
            <option value="before_results">Before results</option>
            <option value="after_question">After specific question</option>
          </select>
        </InspectorField>
        <InspectorField label="Fields">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lgb.fields.map(function(field, fi) {
              return (
                <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <select
                    value={field.type}
                    onChange={function(e) {
                      var newFields = lgb.fields.slice();
                      newFields[fi] = Object.assign({}, field, { type: e.target.value, label: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) });
                      updateField('fields', newFields);
                    }}
                    style={Object.assign({}, selectStyle, { width: 100 })}
                  >
                    <option value="email">Email</option>
                    <option value="name">Name</option>
                    <option value="phone">Phone</option>
                    <option value="company">Company</option>
                    <option value="custom">Custom</option>
                  </select>
                  <input
                    value={field.label}
                    onChange={function(e) {
                      var newFields = lgb.fields.slice();
                      newFields[fi] = Object.assign({}, field, { label: e.target.value });
                      updateField('fields', newFields);
                    }}
                    style={Object.assign({}, inputStyle, { flex: 1 })}
                  />
                  <label style={{ fontSize: 11, color: C.TEXT_MUTED, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={function(e) {
                        var newFields = lgb.fields.slice();
                        newFields[fi] = Object.assign({}, field, { required: e.target.checked });
                        updateField('fields', newFields);
                      }}
                    />
                    Req
                  </label>
                </div>
              );
            })}
            {lgb.fields.length < 5 && (
              <button
                type="button"
                onClick={function() {
                  var newFields = lgb.fields.slice();
                  newFields.push({ id: uid(), type: 'custom', label: 'Custom field', required: false, placeholder: '' });
                  updateField('fields', newFields);
                }}
                style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: 'transparent', border: '1px dashed ' + C.BORDER,
                  color: C.TEXT_MUTED, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter,system-ui,sans-serif',
                }}
              >
                + Add field
              </button>
            )}
          </div>
        </InspectorField>
      </div>
    );
  }

  // Divider inspector
  if (block.type === 'divider') {
    return (
      <div>
        <InspectorField label="Style">
          <select value={(block as any).style || 'solid'} onChange={function(e) { updateField('style', e.target.value); }} style={selectStyle}>
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </InspectorField>
      </div>
    );
  }

  // Logic inspector
  if (block.type === 'logic') {
    var lb = block as LogicBlock;
    var questionBlocks = allBlocks.filter(function(b) { return b.type === 'question'; });
    return (
      <div>
        <InspectorField label="Condition">
          <select value={lb.condition} onChange={function(e) { updateField('condition', e.target.value); }} style={selectStyle}>
            <option value="always">Always</option>
            <option value="score_range">Score range</option>
            <option value="answer_match">Answer match</option>
          </select>
        </InspectorField>
        {lb.condition === 'score_range' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InspectorField label="Min score">
              <input type="number" value={lb.scoreMin ?? ''} onChange={function(e) { updateField('scoreMin', e.target.value === '' ? undefined : parseInt(e.target.value)); }} style={inputStyle} />
            </InspectorField>
            <InspectorField label="Max score">
              <input type="number" value={lb.scoreMax ?? ''} onChange={function(e) { updateField('scoreMax', e.target.value === '' ? undefined : parseInt(e.target.value)); }} style={inputStyle} />
            </InspectorField>
          </div>
        )}
        {lb.condition === 'answer_match' && (
          <InspectorField label="Match question">
            <select value={lb.matchQuestionId || ''} onChange={function(e) { updateField('matchQuestionId', e.target.value); }} style={selectStyle}>
              <option value="">Select question...</option>
              {questionBlocks.map(function(qb) {
                return <option key={qb.id} value={qb.id}>{(qb as QuestionBlock).text.slice(0, 40)}</option>;
              })}
            </select>
          </InspectorField>
        )}
        <InspectorField label="Go to block">
          <select value={lb.gotoBlockId || ''} onChange={function(e) { updateField('gotoBlockId', e.target.value); }} style={selectStyle}>
            <option value="">Select target...</option>
            {allBlocks.filter(function(b) { return b.id !== block.id; }).map(function(b) {
              return <option key={b.id} value={b.id}>{blockLabel(b)}: {blockPreview(b).slice(0, 30)}</option>;
            })}
          </select>
        </InspectorField>
      </div>
    );
  }

  return <div style={{ color: C.TEXT_MUTED, fontSize: 13 }}>No properties for this block type.</div>;
}

/* ------------------------------------------------------------------ */
/*  Main export: QuizBlockEditor                                      */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Live preview component                                             */
/* ------------------------------------------------------------------ */

function LivePreview({ blocks }: { blocks: QuizBlock[] }) {
  var questions = blocks.filter(function(b) { return b.type === 'question'; }) as QuestionBlock[];
  var headings = blocks.filter(function(b) { return b.type === 'heading'; }) as HeadingBlock[];
  var texts = blocks.filter(function(b) { return b.type === 'text'; }) as TextBlock[];

  return (
    <div style={{
      padding: 20, background: '#FFFFFF', borderRadius: 12,
      border: '1px solid ' + C.BORDER, maxHeight: 'calc(100vh - 120px)',
      overflowY: 'auto', fontSize: 13,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.TEXT_SUBTLE, marginBottom: 16 }}>
        Live preview
      </div>
      {blocks.map(function(block, idx) {
        if (block.type === 'heading') {
          var hb = block as HeadingBlock;
          var sizes: Record<number, number> = { 1: 22, 2: 18, 3: 15 };
          return (
            <div key={block.id} style={{ fontSize: sizes[hb.level] || 18, fontWeight: 700, color: C.TEXT, textAlign: (hb.align || 'left') as any, marginBottom: 12, lineHeight: 1.3 }}>
              {hb.text}
            </div>
          );
        }
        if (block.type === 'text') {
          var tb = block as TextBlock;
          return (
            <div key={block.id} style={{ fontSize: 13, color: C.TEXT_MUTED, textAlign: (tb.align || 'left') as any, marginBottom: 12, lineHeight: 1.6 }}>
              {tb.content}
            </div>
          );
        }
        if (block.type === 'image') {
          var ib = block as ImageBlock;
          return (
            <div key={block.id} style={{ marginBottom: 12, textAlign: 'center' }}>
              {ib.url ? (
                <img src={ib.url} alt={ib.alt} style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid ' + C.BORDER }} />
              ) : (
                <div style={{ padding: '24px 16px', background: C.SIDEBAR, borderRadius: 8, color: C.TEXT_SUBTLE, fontSize: 12 }}>
                  Image placeholder
                </div>
              )}
            </div>
          );
        }
        if (block.type === 'divider') {
          return <hr key={block.id} style={{ border: 'none', borderTop: '1px ' + ((block as any).style || 'solid') + ' ' + C.BORDER, margin: '16px 0' }} />;
        }
        if (block.type === 'question') {
          var qb = block as QuestionBlock;
          return (
            <div key={block.id} style={{ marginBottom: 16, padding: 16, background: C.SIDEBAR, borderRadius: 10, border: '1px solid ' + C.BORDER }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 10, lineHeight: 1.4 }}>
                {qb.text}
              </div>
              {qb.options.map(function(opt, oi) {
                return (
                  <div key={opt.id} style={{
                    padding: '8px 12px', marginBottom: 4, borderRadius: 8,
                    background: '#FFFFFF', border: '1px solid ' + C.BORDER,
                    fontSize: 13, color: C.TEXT, cursor: 'default',
                  }}>
                    {String.fromCharCode(65 + oi)}. {opt.text}
                  </div>
                );
              })}
            </div>
          );
        }
        if (block.type === 'leadGate') {
          var lgb = block as LeadGateBlock;
          return (
            <div key={block.id} style={{ marginBottom: 16, padding: 20, background: C.ACCENT_LIGHT, borderRadius: 10, border: '1px solid ' + C.ACCENT + '30', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.TEXT, marginBottom: 6 }}>{lgb.headline}</div>
              {lgb.subtext && <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginBottom: 12 }}>{lgb.subtext}</div>}
              <div style={{ padding: '8px 14px', background: '#FFFFFF', border: '1px solid ' + C.BORDER, borderRadius: 8, fontSize: 12, color: C.TEXT_SUBTLE, marginBottom: 8 }}>
                you@example.com
              </div>
              <div style={{ padding: '8px 16px', background: C.ACCENT, color: '#FFFFFF', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'inline-block' }}>
                {lgb.buttonLabel}
              </div>
            </div>
          );
        }
        if (block.type === 'outcome') {
          var ob = block as OutcomeBlock;
          return (
            <div key={block.id} style={{ marginBottom: 16, padding: 16, background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#16A34A', marginBottom: 6 }}>Outcome</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 4 }}>{ob.title}</div>
              <div style={{ fontSize: 12, color: C.TEXT_MUTED, lineHeight: 1.5 }}>{ob.description}</div>
              {ob.ctaText && (
                <div style={{ marginTop: 10, padding: '6px 14px', background: C.ACCENT, color: '#FFFFFF', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'inline-block' }}>
                  {ob.ctaText}
                </div>
              )}
            </div>
          );
        }
        return null;
      })}
      {blocks.length === 0 && (
        <div style={{ color: C.TEXT_SUBTLE, textAlign: 'center', padding: '20px 0' }}>
          Add blocks to see a preview
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export: QuizBlockEditor                                      */
/* ------------------------------------------------------------------ */

export interface QuizBlockEditorProps {
  blocks: QuizBlock[];
  onChange: (blocks: QuizBlock[]) => void;
}

export function QuizBlockEditor({ blocks: initialBlocks, onChange }: QuizBlockEditorProps) {
  var history = useHistory(initialBlocks);
  var blocks = history.current;
  var [selectedId, setSelectedId] = useState<string | null>(null);
  var [showPreview, setShowPreview] = useState(false);
  var [expandedInserter, setExpandedInserter] = useState<number | null>(null);
  var [dragSourceId, setDragSourceId] = useState<string | null>(null);
  var [dragOverId, setDragOverId] = useState<string | null>(null);
  var containerRef = useRef<HTMLDivElement>(null);

  // Sync back to parent when blocks change
  var prevBlocksRef = useRef(initialBlocks);
  useEffect(function() {
    if (blocks !== prevBlocksRef.current) {
      prevBlocksRef.current = blocks;
      onChange(blocks);
    }
  }, [blocks, onChange]);

  // Sync incoming blocks if parent changes them
  useEffect(function() {
    if (initialBlocks !== prevBlocksRef.current) {
      prevBlocksRef.current = initialBlocks;
      history.push(initialBlocks);
    }
  }, [initialBlocks]);

  var selectedBlock = selectedId ? blocks.find(function(b) { return b.id === selectedId; }) || null : null;

  function commit(next: QuizBlock[]) {
    history.push(next);
  }

  function addBlock(type: QuizBlockType, afterIndex: number) {
    var newBlock = createDefaultQuizBlock(type);
    var next = blocks.slice();
    next.splice(afterIndex + 1, 0, newBlock);
    commit(next);
    setSelectedId(newBlock.id);
    setExpandedInserter(null);
  }

  function deleteBlock(id: string) {
    var next = blocks.filter(function(b) { return b.id !== id; });
    commit(next);
    if (selectedId === id) setSelectedId(null);
  }

  function duplicateBlock(id: string) {
    var idx = blocks.findIndex(function(b) { return b.id === id; });
    if (idx < 0) return;
    var clone = JSON.parse(JSON.stringify(blocks[idx]));
    clone.id = uid();
    // Give new IDs to nested items
    if (clone.options) {
      for (var i = 0; i < clone.options.length; i++) {
        clone.options[i].id = uid();
      }
    }
    if (clone.fields) {
      for (var j = 0; j < clone.fields.length; j++) {
        clone.fields[j].id = uid();
      }
    }
    var next = blocks.slice();
    next.splice(idx + 1, 0, clone);
    commit(next);
    setSelectedId(clone.id);
  }

  function updateBlock(updated: QuizBlock) {
    var next = blocks.map(function(b) { return b.id === updated.id ? updated : b; });
    commit(next);
  }

  // Drag and drop
  function handleDragStart(id: string) {
    return function(e: React.DragEvent) {
      setDragSourceId(id);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    };
  }

  function handleDragOver(id: string) {
    return function(e: React.DragEvent) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverId(id);
    };
  }

  function handleDrop(targetId: string) {
    return function(e: React.DragEvent) {
      e.preventDefault();
      setDragOverId(null);
      if (!dragSourceId || dragSourceId === targetId) return;
      var fromIdx = blocks.findIndex(function(b) { return b.id === dragSourceId; });
      var toIdx = blocks.findIndex(function(b) { return b.id === targetId; });
      if (fromIdx < 0 || toIdx < 0) return;
      var next = blocks.slice();
      var item = next.splice(fromIdx, 1)[0];
      next.splice(toIdx, 0, item);
      commit(next);
      setDragSourceId(null);
    };
  }

  // Keyboard shortcuts
  useEffect(function() {
    function handleKey(e: KeyboardEvent) {
      var meta = e.metaKey || e.ctrlKey;

      // Undo: Cmd+Z
      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        history.undo();
        return;
      }
      // Redo: Cmd+Shift+Z
      if (meta && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        history.redo();
        return;
      }
      // New question: Cmd+N
      if (meta && e.key === 'n') {
        e.preventDefault();
        addBlock('question', blocks.length - 1);
        return;
      }
      // Duplicate: Cmd+D
      if (meta && e.key === 'd' && selectedId) {
        e.preventDefault();
        duplicateBlock(selectedId);
        return;
      }
      // Delete: Backspace/Delete
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedId) {
        var target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
        e.preventDefault();
        deleteBlock(selectedId);
        return;
      }
      // Arrow navigation
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        var target2 = e.target as HTMLElement;
        if (target2.tagName === 'INPUT' || target2.tagName === 'TEXTAREA' || target2.tagName === 'SELECT') return;
        e.preventDefault();
        var curIdx = selectedId ? blocks.findIndex(function(b) { return b.id === selectedId; }) : -1;
        var newIdx = e.key === 'ArrowUp' ? Math.max(curIdx - 1, 0) : Math.min(curIdx + 1, blocks.length - 1);
        if (blocks[newIdx]) setSelectedId(blocks[newIdx].id);
        // Move block: Alt+Arrow
        if (e.altKey && selectedId && curIdx >= 0) {
          var swap = blocks.slice();
          var moved = swap.splice(curIdx, 1)[0];
          swap.splice(newIdx, 0, moved);
          commit(swap);
        }
        return;
      }
      // Escape: deselect
      if (e.key === 'Escape') {
        setSelectedId(null);
        setExpandedInserter(null);
      }
    }

    window.addEventListener('keydown', handleKey);
    return function() { window.removeEventListener('keydown', handleKey); };
  }, [blocks, selectedId, history]);

  // Close inserter on outside click
  useEffect(function() {
    function handleClick(e: MouseEvent) {
      if (expandedInserter !== null) {
        var el = e.target as HTMLElement;
        if (!el.closest('[data-inserter]')) setExpandedInserter(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, [expandedInserter]);

  // Count questions for numbering
  var questionCounter = 0;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'grid',
        gridTemplateColumns: selectedBlock ? '1fr 320px' : showPreview ? '1fr 340px' : '1fr',
        gap: 0,
        minHeight: '100%',
      }}
    >
      {/* Canvas */}
      <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 18, padding: '0 2px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: C.TEXT_MUTED, fontWeight: 600 }}>
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 12, color: C.TEXT_SUBTLE }}>
              {blocks.filter(function(b) { return b.type === 'question'; }).length} questions
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={function() { setShowPreview(!showPreview); setSelectedId(null); }}
              title={showPreview ? 'Hide preview' : 'Show live preview'}
              style={{
                height: 30, padding: '0 10px', borderRadius: 6,
                background: showPreview ? C.ACCENT_LIGHT : 'transparent',
                border: showPreview ? '1px solid ' + C.ACCENT + '30' : 'none',
                color: showPreview ? C.ACCENT : C.TEXT_MUTED,
                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: 'Inter,system-ui,sans-serif',
                marginRight: 4,
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx={12} cy={12} r={3} />
              </svg>
              Preview
            </button>
            <button
              type="button"
              onClick={history.undo}
              disabled={!history.canUndo}
              title="Undo (Cmd+Z)"
              style={{
                width: 30, height: 30, borderRadius: 6,
                background: 'transparent', border: 'none',
                color: history.canUndo ? C.TEXT_MUTED : C.TEXT_SUBTLE,
                cursor: history.canUndo ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: history.canUndo ? 1 : 0.4,
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
            </button>
            <button
              type="button"
              onClick={history.redo}
              disabled={!history.canRedo}
              title="Redo (Cmd+Shift+Z)"
              style={{
                width: 30, height: 30, borderRadius: 6,
                background: 'transparent', border: 'none',
                color: history.canRedo ? C.TEXT_MUTED : C.TEXT_SUBTLE,
                cursor: history.canRedo ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: history.canRedo ? 1 : 0.4,
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>
        </div>

        {/* Block list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Top inserter */}
          <div data-inserter="true">
            <AddBlockInserter
              onAdd={function(type) { addBlock(type, -1); }}
              expanded={expandedInserter === -1}
              onToggle={function() { setExpandedInserter(expandedInserter === -1 ? null : -1); }}
            />
          </div>

          {blocks.map(function(block, idx) {
            if (block.type === 'question') questionCounter++;
            return (
              <div key={block.id}>
                <BlockCard
                  block={block}
                  index={block.type === 'question' ? questionCounter : idx}
                  selected={selectedId === block.id}
                  onSelect={function() { setSelectedId(block.id); }}
                  onDelete={function() { deleteBlock(block.id); }}
                  onDuplicate={function() { duplicateBlock(block.id); }}
                  onDragStart={handleDragStart(block.id)}
                  onDragOver={handleDragOver(block.id)}
                  onDrop={handleDrop(block.id)}
                  dragOver={dragOverId === block.id && dragSourceId !== block.id}
                />
                <div data-inserter="true">
                  <AddBlockInserter
                    onAdd={function(type) { addBlock(type, idx); }}
                    expanded={expandedInserter === idx}
                    onToggle={function() { setExpandedInserter(expandedInserter === idx ? null : idx); }}
                  />
                </div>
              </div>
            );
          })}

          {blocks.length === 0 && (
            <div style={{
              padding: '48px 20px', textAlign: 'center',
              border: '1px dashed ' + C.BORDER, borderRadius: 14,
              color: C.TEXT_MUTED, fontSize: 14,
            }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_SUBTLE}
                strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
                style={{ margin: '0 auto 12px', display: 'block' }}>
                <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
                <line x1={12} y1={8} x2={12} y2={16} />
                <line x1={8} y1={12} x2={16} y2={12} />
              </svg>
              Click the + button above to add your first block
            </div>
          )}
        </div>

        {/* Keyboard shortcut hint */}
        <div style={{
          marginTop: 24, padding: '12px 16px',
          background: C.SURFACE, borderRadius: 10,
          fontSize: 11, color: C.TEXT_SUBTLE, lineHeight: 1.7,
        }}>
          <strong style={{ color: C.TEXT_MUTED }}>Shortcuts:</strong>{' '}
          Cmd+N add question, Cmd+D duplicate, Alt+Arrow reorder, Delete remove, Cmd+Z undo, Escape deselect
        </div>
      </div>

      {/* Inspector panel */}
      {selectedBlock && (
        <div style={{
          borderLeft: '1px solid ' + C.HAIRLINE,
          background: C.SURFACE,
          padding: '20px 18px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 60px)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 20,
          }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: C.TEXT,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: blockColor(selectedBlock.type) + '12',
                border: '1px solid ' + blockColor(selectedBlock.type) + '30',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={blockColor(selectedBlock.type)}
                  strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d={QUIZ_PALETTE.find(function(p) { return p.type === selectedBlock.type; })?.icon || ''} />
                </svg>
              </div>
              {blockLabel(selectedBlock)}
            </div>
            <button
              type="button"
              onClick={function() { setSelectedId(null); }}
              style={{
                width: 24, height: 24, borderRadius: 6,
                background: 'transparent', border: 'none',
                color: C.TEXT_SUBTLE, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} />
              </svg>
            </button>
          </div>

          <BlockInspector
            block={selectedBlock}
            allBlocks={blocks}
            onChange={updateBlock}
          />
        </div>
      )}

      {/* Live preview panel */}
      {showPreview && !selectedBlock && (
        <div style={{
          borderLeft: '1px solid ' + C.HAIRLINE,
          background: C.SIDEBAR,
          padding: '20px 16px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 60px)',
        }}>
          <LivePreview blocks={blocks} />
        </div>
      )}
    </div>
  );
}

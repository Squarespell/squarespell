'use client';

/**
 * BlockEditorCanvas - drag-drop visual editor for email Block[] arrays.
 *
 * Renders each block as an editable card. Supports:
 *   - Click to select a block (opens inspector)
 *   - Drag handle to reorder blocks
 *   - Add-block toolbar between every pair of blocks
 *   - Delete / duplicate block from inline controls
 *   - Keyboard: arrow keys move selection, delete removes block
 *
 * No external dependencies - uses HTML drag-and-drop API.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DASHBOARD_COLORS as C } from '../../../_components/dashboardColors';
import {
  Block,
  BlockType,
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
} from '../../../../../lib/email/blocks';

/* ------------------------------------------------------------------ */
/*  Block palette (add new blocks)                                    */
/* ------------------------------------------------------------------ */

type PaletteItem = { type: BlockType; label: string; icon: string };

const PALETTE: PaletteItem[] = [
  { type: 'hero', label: 'Hero', icon: 'M4 5h16v10H4z' },
  { type: 'heading', label: 'Heading', icon: 'M6 4v16M18 4v16M6 12h12' },
  { type: 'text', label: 'Text', icon: 'M4 6h16M4 10h16M4 14h10' },
  { type: 'image', label: 'Image', icon: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z' },
  { type: 'button', label: 'Button', icon: 'M4 8h16v8H4zM8 12h8' },
  { type: 'divider', label: 'Divider', icon: 'M3 12h18' },
  { type: 'spacer', label: 'Spacer', icon: 'M12 5v14M8 9l4-4 4 4M8 15l4 4 4-4' },
  { type: 'cardGrid', label: 'Cards', icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z' },
  { type: 'testimonial', label: 'Quote', icon: 'M10 11l-2 2H5l2-4h3zM19 11l-2 2h-3l2-4h3z' },
  { type: 'stat', label: 'Stats', icon: 'M4 20V10M10 20V4M16 20v-6' },
  { type: 'signature', label: 'Signature', icon: 'M5 21c2-3 4-5 7-5s5 2 7 5M12 11a3 3 0 100-6 3 3 0 000 6z' },
  { type: 'footer', label: 'Footer', icon: 'M4 18h16M4 14h16M9 10h6' },
];

let nextBlockId = Date.now();
function uid(): string {
  nextBlockId += 1;
  return 'blk_' + nextBlockId.toString(36);
}

function createDefaultBlock(type: BlockType): Block {
  const id = uid();
  switch (type) {
    case 'hero':
      return { id, type: 'hero', variant: 'gradient', headline: 'Your headline here', subheadline: 'Supporting text goes here', gradientFrom: '#D2FF1D', gradientTo: '#0a0d12', align: 'center' } as HeroBlock;
    case 'heading':
      return { id, type: 'heading', level: 2, text: 'Section heading', align: 'left' } as HeadingBlock;
    case 'text':
      return { id, type: 'text', content: 'Write your paragraph text here. You can use <strong>bold</strong> and <em>italic</em> formatting.', align: 'left' } as TextBlock;
    case 'image':
      return { id, type: 'image', url: '', alt: 'Image description', width: 560 } as ImageBlock;
    case 'button':
      return { id, type: 'button', label: 'Click here', url: '{{ctaUrl}}', variant: 'primary', align: 'center' } as ButtonBlock;
    case 'divider':
      return { id, type: 'divider', style: 'solid' } as DividerBlock;
    case 'spacer':
      return { id, type: 'spacer', height: 24 } as SpacerBlock;
    case 'cardGrid':
      return { id, type: 'cardGrid', columns: 2, cards: [
        { id: uid(), title: 'Card one', body: 'Description', ctaLabel: 'Learn more', ctaUrl: '#' },
        { id: uid(), title: 'Card two', body: 'Description', ctaLabel: 'Learn more', ctaUrl: '#' },
      ] } as CardGridBlock;
    case 'testimonial':
      return { id, type: 'testimonial', quote: '"This changed everything for my business."', authorName: 'Alex Smith', authorTitle: 'Founder' } as TestimonialBlock;
    case 'stat':
      return { id, type: 'stat', columns: 3, items: [
        { value: '95%', label: 'Satisfaction' },
        { value: '2.5x', label: 'Growth' },
        { value: '500+', label: 'Customers' },
      ] } as StatBlock;
    case 'signature':
      return { id, type: 'signature', name: 'Your Name', title: 'Your title', message: 'Thanks for reading!' } as SignatureBlock;
    case 'postscript':
      return { id, type: 'postscript', content: 'P.S. Do not miss this limited-time offer.' } as PostscriptBlock;
    case 'footer':
      return { id, type: 'footer', showUnsubscribe: true, showPreferenceCenter: true } as FooterBlock;
    default:
      return { id, type: 'text', content: 'New block', align: 'left' } as TextBlock;
  }
}

/* ------------------------------------------------------------------ */
/*  Block label + icon helper                                         */
/* ------------------------------------------------------------------ */

function blockLabel(b: Block): string {
  switch (b.type) {
    case 'hero': return 'Hero';
    case 'heading': return `H${(b as HeadingBlock).level} Heading`;
    case 'text': return 'Text';
    case 'image': return 'Image';
    case 'button': return `Button: ${(b as ButtonBlock).label}`;
    case 'divider': return 'Divider';
    case 'spacer': return `Spacer (${(b as SpacerBlock).height}px)`;
    case 'cardGrid': return `Card Grid (${(b as CardGridBlock).columns} col)`;
    case 'testimonial': return 'Testimonial';
    case 'stat': return `Stats (${(b as StatBlock).columns} col)`;
    case 'signature': return 'Signature';
    case 'postscript': return 'P.S.';
    case 'footer': return 'Footer';
    default: return (b as { type: string }).type;
  }
}

function blockPreview(b: Block): string {
  switch (b.type) {
    case 'hero': return (b as HeroBlock).headline || '';
    case 'heading': return (b as HeadingBlock).text || '';
    case 'text': return stripHtml((b as TextBlock).content || '').slice(0, 80);
    case 'image': return (b as ImageBlock).alt || '(no alt text)';
    case 'button': return (b as ButtonBlock).label || '';
    case 'testimonial': return stripHtml((b as TestimonialBlock).quote || '').slice(0, 60);
    case 'signature': return (b as SignatureBlock).name || '';
    case 'postscript': return stripHtml((b as PostscriptBlock).content || '').slice(0, 60);
    case 'footer': return 'Unsubscribe + legal';
    default: return '';
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

/* ------------------------------------------------------------------ */
/*  Inline SVG icon for palette items                                 */
/* ------------------------------------------------------------------ */

function PaletteIcon({ d }: { d: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Drag handle icon                                                  */
/* ------------------------------------------------------------------ */

function DragHandle() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ opacity: 0.4 }}>
      <circle cx={9} cy={5} r={1.5} /><circle cx={15} cy={5} r={1.5} />
      <circle cx={9} cy={12} r={1.5} /><circle cx={15} cy={12} r={1.5} />
      <circle cx={9} cy={19} r={1.5} /><circle cx={15} cy={19} r={1.5} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Add-block inserter (appears between blocks)                       */
/* ------------------------------------------------------------------ */

function AddBlockInserter({
  onAdd,
  expanded,
  onToggle,
}: {
  onAdd: (type: BlockType) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Add block"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: `1px dashed ${expanded ? C.ACCENT : C.BORDER}`,
          background: expanded ? 'rgba(210,255,29,0.08)' : 'transparent',
          color: expanded ? C.ACCENT : C.TEXT_MUTED,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1,
          transition: 'all 0.15s ease',
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
          <line x1={12} y1={5} x2={12} y2={19} />
          <line x1={5} y1={12} x2={19} y2={12} />
        </svg>
      </button>

      {expanded && (
        <div style={{
          position: 'absolute',
          top: 36,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          background: C.ELEVATED,
          border: `1px solid ${C.BORDER}`,
          borderRadius: 14,
          padding: 10,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 4,
          minWidth: 280,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {PALETTE.map(p => (
            <button
              key={p.type}
              type="button"
              onClick={() => { onAdd(p.type); onToggle(); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 6px',
                background: 'transparent',
                border: 'none',
                borderRadius: 8,
                color: C.TEXT_MUTED,
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(210,255,29,0.08)';
                e.currentTarget.style.color = C.ACCENT;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = C.TEXT_MUTED;
              }}
            >
              <PaletteIcon d={p.icon} />
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single block card                                                 */
/* ------------------------------------------------------------------ */

function BlockCard({
  block,
  selected,
  onSelect,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverPosition,
}: {
  block: Block;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dragOverPosition: 'above' | 'below' | null;
}) {
  const label = blockLabel(block);
  const preview = blockPreview(block);

  return (
    <div
      data-block-id={block.id}
      onClick={onSelect}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: selected ? 'rgba(210,255,29,0.06)' : C.ELEVATED,
        border: `1px solid ${selected ? C.ACCENT : C.BORDER}`,
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        borderTopWidth: dragOverPosition === 'above' ? 3 : 1,
        borderBottomWidth: dragOverPosition === 'below' ? 3 : 1,
        borderTopColor: dragOverPosition === 'above' ? C.ACCENT : (selected ? C.ACCENT : C.BORDER),
        borderBottomColor: dragOverPosition === 'below' ? C.ACCENT : (selected ? C.ACCENT : C.BORDER),
      }}
    >
      {/* Drag handle */}
      <div
        draggable
        onDragStart={onDragStart}
        style={{ cursor: 'grab', padding: '4px 2px', flexShrink: 0 }}
        aria-label="Drag to reorder"
      >
        <DragHandle />
      </div>

      {/* Block info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: selected ? C.ACCENT : C.TEXT_MUTED,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 2,
        }}>
          {label}
        </div>
        {preview && (
          <div style={{
            fontSize: 12.5,
            color: C.TEXT_SUBTLE,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {preview}
          </div>
        )}
      </div>

      {/* Inline actions */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0, opacity: selected ? 1 : 0, transition: 'opacity 0.1s' }}
        onClick={e => e.stopPropagation()}>
        <InlineAction label="Duplicate" onClick={onDuplicate}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x={9} y={9} width={13} height={13} rx={2} />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        </InlineAction>
        <InlineAction label="Delete" onClick={onDelete} danger>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </InlineAction>
      </div>
    </div>
  );
}

function InlineAction({ label, onClick, danger, children }: {
  label: string; onClick: () => void; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        borderRadius: 6,
        color: danger ? '#ef4444' : C.TEXT_MUTED,
        cursor: 'pointer',
        transition: 'all 0.1s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main canvas component                                             */
/* ------------------------------------------------------------------ */

export interface BlockEditorCanvasProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
}

export function BlockEditorCanvas({ blocks, onChange, selectedBlockId, onSelectBlock }: BlockEditorCanvasProps) {
  const [openInsertIdx, setOpenInsertIdx] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'above' | 'below' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close inserter on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (openInsertIdx !== null) {
        setOpenInsertIdx(null);
      }
    }
    if (openInsertIdx !== null) {
      document.addEventListener('click', handleClick, { capture: true });
      return () => document.removeEventListener('click', handleClick, { capture: true });
    }
  }, [openInsertIdx]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!selectedBlockId || blocks.length === 0) return;
      const idx = blocks.findIndex(b => b.id === selectedBlockId);
      if (idx === -1) return;

      if (e.key === 'ArrowDown' && idx < blocks.length - 1) {
        e.preventDefault();
        onSelectBlock(blocks[idx + 1].id);
      } else if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        onSelectBlock(blocks[idx - 1].id);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target || !(e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable]')) {
        e.preventDefault();
        const next = blocks.filter(b => b.id !== selectedBlockId);
        onChange(next);
        if (next.length > 0) {
          const newIdx = Math.min(idx, next.length - 1);
          onSelectBlock(next[newIdx].id);
        } else {
          onSelectBlock(null);
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [selectedBlockId, blocks, onChange, onSelectBlock]);

  const insertBlock = useCallback((atIdx: number, type: BlockType) => {
    const newBlock = createDefaultBlock(type);
    const updated = [...blocks];
    updated.splice(atIdx, 0, newBlock);
    onChange(updated);
    onSelectBlock(newBlock.id);
  }, [blocks, onChange, onSelectBlock]);

  const deleteBlock = useCallback((id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    const next = blocks.filter(b => b.id !== id);
    onChange(next);
    if (selectedBlockId === id) {
      if (next.length > 0) {
        onSelectBlock(next[Math.min(idx, next.length - 1)].id);
      } else {
        onSelectBlock(null);
      }
    }
  }, [blocks, onChange, selectedBlockId, onSelectBlock]);

  const duplicateBlock = useCallback((id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const clone: Block = { ...JSON.parse(JSON.stringify(blocks[idx])), id: uid() };
    const updated = [...blocks];
    updated.splice(idx + 1, 0, clone);
    onChange(updated);
    onSelectBlock(clone.id);
  }, [blocks, onChange, onSelectBlock]);

  // Drag handlers
  const handleDragStart = useCallback((idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }, []);

  const handleDragOver = useCallback((idx: number) => (e: React.DragEvent) => {
    if (dragIdx === null || dragIdx === idx) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDragOverIdx(idx);
    setDragOverPos(e.clientY < midY ? 'above' : 'below');
  }, [dragIdx]);

  const handleDrop = useCallback((targetIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) {
      resetDrag();
      return;
    }
    const updated = [...blocks];
    const [moved] = updated.splice(dragIdx, 1);
    let insertAt = targetIdx;
    if (dragIdx < targetIdx) insertAt -= 1;
    if (dragOverPos === 'below') insertAt += 1;
    updated.splice(Math.max(0, Math.min(updated.length, insertAt)), 0, moved);
    onChange(updated);
    resetDrag();
  }, [dragIdx, dragOverPos, blocks, onChange]);

  function resetDrag() {
    setDragIdx(null);
    setDragOverIdx(null);
    setDragOverPos(null);
  }

  return (
    <div
      ref={containerRef}
      onDragEnd={resetDrag}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        minHeight: 200,
      }}
    >
      {/* Inserter at top */}
      <AddBlockInserter
        onAdd={type => insertBlock(0, type)}
        expanded={openInsertIdx === 0}
        onToggle={() => setOpenInsertIdx(openInsertIdx === 0 ? null : 0)}
      />

      {blocks.map((block, idx) => (
        <React.Fragment key={block.id}>
          <BlockCard
            block={block}
            selected={selectedBlockId === block.id}
            onSelect={() => onSelectBlock(block.id)}
            onDelete={() => deleteBlock(block.id)}
            onDuplicate={() => duplicateBlock(block.id)}
            onDragStart={handleDragStart(idx)}
            onDragOver={handleDragOver(idx)}
            onDrop={handleDrop(idx)}
            dragOverPosition={dragOverIdx === idx ? dragOverPos : null}
          />
          <AddBlockInserter
            onAdd={type => insertBlock(idx + 1, type)}
            expanded={openInsertIdx === idx + 1}
            onToggle={() => setOpenInsertIdx(openInsertIdx === idx + 1 ? null : idx + 1)}
          />
        </React.Fragment>
      ))}

      {blocks.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: C.TEXT_MUTED,
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              style={{ display: 'inline-block' }}>
              <rect x={3} y={3} width={18} height={18} rx={2} />
              <line x1={12} y1={8} x2={12} y2={16} />
              <line x1={8} y1={12} x2={16} y2={12} />
            </svg>
          </div>
          Click + above to add your first block
        </div>
      )}
    </div>
  );
}

export { createDefaultBlock, PALETTE, type PaletteItem };

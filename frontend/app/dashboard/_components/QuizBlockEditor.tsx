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
  BranchRule,
  AnswerLayout,
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

var LETTERS = 'ABCDEFGHIJKLMNOP';

function BlockCard({
  block,
  index,
  selected,
  onSelect,
  onDelete,
  onDuplicate,
  onChange,
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
  onChange: (updated: QuizBlock) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dragOver: boolean;
}) {
  var label = blockLabel(block);
  var preview = blockPreview(block);
  var color = blockColor(block.type);
  var questionNum = block.type === 'question' ? index : null;
  var qb = block.type === 'question' ? (block as QuestionBlock) : null;

  function updateQuestionText(text: string) {
    if (!qb) return;
    onChange(Object.assign({}, qb, { text: text }) as QuizBlock);
  }

  function updateOptionText(optIdx: number, text: string) {
    if (!qb) return;
    var newOpts = qb.options.map(function(o, i) {
      return i === optIdx ? Object.assign({}, o, { text: text }) : o;
    });
    onChange(Object.assign({}, qb, { options: newOpts }) as QuizBlock);
  }

  function updateOptionScore(optIdx: number, score: number) {
    if (!qb) return;
    var newOpts = qb.options.map(function(o, i) {
      return i === optIdx ? Object.assign({}, o, { score: score }) : o;
    });
    onChange(Object.assign({}, qb, { options: newOpts }) as QuizBlock);
  }

  return (
    <div
      data-block-id={block.id}
      onClick={onSelect}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        position: 'relative',
        background: selected ? 'rgba(13,115,119,0.03)' : C.ELEVATED,
        border: '1px solid ' + (selected ? C.ACCENT : C.BORDER),
        borderRadius: 14,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        borderTopWidth: dragOver ? 3 : 1,
        borderTopColor: dragOver ? C.ACCENT : (selected ? C.ACCENT : C.BORDER),
        boxShadow: selected ? '0 0 0 3px rgba(13,115,119,0.08), 0 4px 12px rgba(16,24,40,0.08)' : '0 1px 2px rgba(16,24,40,0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px 20px 12px', cursor: 'pointer' }}>
        {/* Drag handle */}
        <div
          draggable
          onDragStart={onDragStart}
          style={{ cursor: 'grab', padding: '4px 2px', flexShrink: 0, opacity: 0.35, transition: 'opacity 0.15s' }}
          onMouseEnter={function(e) { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={function(e) { e.currentTarget.style.opacity = '0.35'; }}
        >
          <DragHandle />
        </div>

        {/* Number/icon badge */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: selected ? C.ACCENT : (color + '12'),
          border: '1px solid ' + (selected ? C.ACCENT : color + '30'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}>
          {questionNum !== null ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: selected ? '#FFFFFF' : color }}>Q{questionNum}</span>
          ) : (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={selected ? '#FFFFFF' : color}
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d={QUIZ_PALETTE.find(function(p) { return p.type === block.type; })?.icon || ''} />
            </svg>
          )}
        </div>

        {/* Content header */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Editable question text or static preview */}
          {selected && qb ? (
            <textarea
              value={qb.text}
              onChange={function(e) { updateQuestionText(e.target.value); }}
              onClick={function(e) { e.stopPropagation(); }}
              rows={2}
              placeholder="Type your question..."
              style={{
                width: '100%', fontSize: 15, fontWeight: 600, color: C.TEXT,
                fontFamily: C.FONT + ',system-ui,sans-serif',
                lineHeight: 1.4, border: '1px solid ' + C.BORDER, borderRadius: 8,
                padding: '8px 10px', background: '#FFFFFF', resize: 'vertical',
                outline: 'none', marginBottom: 4,
              }}
              onFocus={function(e) { (e.target as HTMLTextAreaElement).style.borderColor = C.ACCENT; (e.target as HTMLTextAreaElement).style.boxShadow = '0 0 0 2px rgba(13,115,119,0.1)'; }}
              onBlur={function(e) { (e.target as HTMLTextAreaElement).style.borderColor = C.BORDER; (e.target as HTMLTextAreaElement).style.boxShadow = 'none'; }}
            />
          ) : preview ? (
            <div style={{
              fontSize: 15, color: C.TEXT, fontWeight: 600, lineHeight: 1.4,
              fontFamily: C.FONT, marginBottom: 4,
            }}>
              {preview}
            </div>
          ) : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {qb ? (
                <>
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><circle cx={12} cy={12} r={10}/><circle cx={12} cy={12} r={3}/></svg>
                  {qb.questionType === 'multiple' ? 'Multi select' : 'Single select'}
                </>
              ) : (
                label
              )}
            </span>
            {qb && (
              <span style={{ fontSize: 12, color: C.TEXT_SUBTLE }}>
                {qb.options.length} options
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}
          onClick={function(e) { e.stopPropagation(); }}
        >
          <button type="button" onClick={onDuplicate} title="Duplicate"
            style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: 'none', color: C.TEXT_SUBTLE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={function(e) { e.currentTarget.style.background = '#F2F4F7'; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x={9} y={9} width={13} height={13} rx={2} ry={2} />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
          <button type="button" onClick={onDelete} title="Delete"
            style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: 'none', color: C.TEXT_SUBTLE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(255,59,48,0.06)'; e.currentTarget.style.color = '#ff3b30'; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.TEXT_SUBTLE; }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Answer options - layout-aware rendering */}
      {qb && (function() {
        var layout = qb.answerLayout || 'list';

        /* Shared score badge */
        function scoreBadge(opt: any) {
          return (
            <span style={{
              fontSize: 11, fontWeight: 600, flexShrink: 0,
              padding: '3px 8px', borderRadius: 6,
              background: (opt.score || 0) >= 3 ? 'rgba(13,115,119,0.12)' : 'rgba(0,0,0,0.04)',
              color: (opt.score || 0) >= 3 ? C.ACCENT : C.TEXT_MUTED,
              border: '1px solid ' + ((opt.score || 0) >= 3 ? 'rgba(13,115,119,0.2)' : 'rgba(0,0,0,0.06)'),
            }}>
              +{opt.score || 0}pts
            </span>
          );
        }

        /* Inline image upload for answer option cards */
        function handleOptionImageUpload(optIndex: number, file: File) {
          var reader = new FileReader();
          reader.onload = function() {
            var base64 = (reader.result as string).split(',')[1];
            var doUp = function(token: string) {
              fetch(API_BASE + '/api/media/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' },
                body: JSON.stringify({ data: base64, fileName: file.name, contentType: file.type }),
              })
              .then(function(res) {
                if (!res.ok) return res.json().then(function(d) { throw new Error(d.error || 'Upload failed (' + res.status + ')'); });
                return res.json();
              })
              .then(function(data) {
                if (data.url) {
                  var newOpts = qb!.options.slice();
                  newOpts[optIndex] = Object.assign({}, newOpts[optIndex], { imageUrl: data.url });
                  onChange(Object.assign({}, qb, { options: newOpts }) as QuizBlock);
                }
              })
              .catch(function(err) { console.error('Image upload error:', err); alert('Image upload failed: ' + (err.message || 'Unknown error')); });
            };
            if (typeof window !== 'undefined' && (window as any).Clerk) {
              (window as any).Clerk.session?.getToken().then(function(t: string) { doUp(t || ''); }).catch(function() { doUp(''); });
            } else { doUp(''); }
          };
          reader.readAsDataURL(file);
        }

        /* Set option image from URL (Pexels or paste) */
        function setOptionImage(optIndex: number, url: string) {
          var newOpts = qb!.options.slice();
          newOpts[optIndex] = Object.assign({}, newOpts[optIndex], { imageUrl: url });
          onChange(Object.assign({}, qb, { options: newOpts }) as QuizBlock);
        }

        /* ---- Unified Image Picker (Squarespace-style) ---- */
        function openImagePicker(optIndex: number) {
          var modal = document.createElement('div');
          modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(4px)';
          var box = document.createElement('div');
          box.style.cssText = 'background:#fff;border-radius:16px;width:100%;max-width:620px;max-height:82vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 48px rgba(0,0,0,0.2)';

          /* Header with CLOSE */
          var header = document.createElement('div');
          header.style.cssText = 'padding:16px 20px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between';
          header.innerHTML = '<span style="font-size:13px;font-weight:700;color:#344054;letter-spacing:0.02em;cursor:pointer" id="imgPickerClose">CLOSE</span>'
            + '<span style="font-size:11px;color:#98A2B3;font-weight:500">Add Image</span>';
          box.appendChild(header);

          /* Tab bar */
          var tabBar = document.createElement('div');
          tabBar.style.cssText = 'display:flex;border-bottom:1px solid #E5E7EB';
          var tabs = [
            { id: 'upload', label: 'Upload File', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' },
            { id: 'stock', label: 'Browse Stock Images', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' },
          ];
          tabs.forEach(function(tab) {
            var btn = document.createElement('button');
            btn.id = 'tab_' + tab.id;
            btn.style.cssText = 'flex:1;padding:14px 16px;border:none;background:transparent;cursor:pointer;font-size:13px;font-weight:600;color:#667085;display:flex;align-items:center;justify-content:center;gap:8px;font-family:Inter,system-ui,sans-serif;border-bottom:2px solid transparent;transition:all 0.15s';
            btn.innerHTML = tab.icon + tab.label;
            btn.addEventListener('click', function() { showTab(tab.id); });
            tabBar.appendChild(btn);
          });
          box.appendChild(tabBar);

          /* Content area */
          var content = document.createElement('div');
          content.style.cssText = 'flex:1;overflow:hidden;min-height:280px;display:flex;flex-direction:column';
          box.appendChild(content);

          modal.appendChild(box);
          document.body.appendChild(modal);

          function close() { if (modal.parentNode) document.body.removeChild(modal); }
          modal.addEventListener('click', function(e) { if (e.target === modal) close(); });
          (header.querySelector('#imgPickerClose') as HTMLElement).addEventListener('click', close);

          var activeTab = '';

          function showTab(tabId: string) {
            activeTab = tabId;
            /* Style tabs */
            tabs.forEach(function(t) {
              var el = tabBar.querySelector('#tab_' + t.id) as HTMLElement;
              if (t.id === tabId) {
                el.style.color = '#0D7377';
                el.style.borderBottomColor = '#0D7377';
              } else {
                el.style.color = '#667085';
                el.style.borderBottomColor = 'transparent';
              }
            });

            if (tabId === 'upload') {
              content.innerHTML = '<div style="padding:40px 20px;text-align:center">'
                + '<div style="width:80px;height:80px;margin:0 auto 16px;border-radius:16px;background:#F9FAFB;border:2px dashed #D0D5DD;display:flex;align-items:center;justify-content:center">'
                + '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#98A2B3" stroke-width="1.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>'
                + '<div style="font-size:14px;font-weight:600;color:#344054;margin-bottom:6px">Upload an image</div>'
                + '<div style="font-size:12px;color:#667085;margin-bottom:20px">JPG, PNG, GIF or WebP. Max 5MB.</div>'
                + '<label style="display:inline-flex;align-items:center;gap:8px;padding:10px 24px;background:#0D7377;color:#fff;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:Inter,system-ui,sans-serif">'
                + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
                + 'Choose File'
                + '<input type="file" accept="image/*" style="display:none" id="imgPickerFileInput" />'
                + '</label>'
                + '</div>';
              var fileInput = content.querySelector('#imgPickerFileInput') as HTMLInputElement;
              fileInput.addEventListener('change', function() {
                var f = fileInput.files?.[0];
                if (f) {
                  handleOptionImageUpload(optIndex, f);
                  close();
                }
              });
            }

            if (tabId === 'stock') {
              content.innerHTML = '<div style="padding:12px 16px;border-bottom:1px solid #F2F4F7">'
                + '<div style="display:flex;align-items:center;gap:8px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:0 12px">'
                + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#98A2B3" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>'
                + '<input id="stockSearch" type="text" placeholder="Search images..." style="flex:1;border:none;outline:none;font-size:14px;padding:10px 0;background:transparent;font-family:Inter,system-ui,sans-serif" />'
                + '</div></div>'
                + '<div id="stockResults" style="padding:12px;column-count:3;column-gap:8px;overflow-y:auto;flex:1">'
                + '<div style="column-span:all;text-align:center;padding:40px 0;color:#98A2B3;font-size:13px">'
                + '<div style="width:32px;height:32px;border:3px solid #E5E7EB;border-top-color:#0D7377;border-radius:50%;margin:0 auto 8px;animation:spin 0.8s linear infinite"></div>'
                + 'Loading images...</div></div>';

              /* Add spinner animation */
              var styleEl = document.createElement('style');
              styleEl.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
              box.appendChild(styleEl);

              var searchInput = content.querySelector('#stockSearch') as HTMLInputElement;
              var resultsDiv = content.querySelector('#stockResults') as HTMLDivElement;
              var timer: any = null;
              searchInput.focus();

              var renderResults = function(data: any) {
                if (!data.results || data.results.length === 0) {
                  resultsDiv.innerHTML = '<div style="column-span:all;text-align:center;padding:40px 0;color:#98A2B3;font-size:13px">No images found. Try another term.</div>';
                  return;
                }
                resultsDiv.innerHTML = '';
                data.results.forEach(function(img: any) {
                  var card = document.createElement('div');
                  card.style.cssText = 'border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:border-color 0.15s;break-inside:avoid;margin-bottom:8px';
                  card.innerHTML = '<img src="' + (img.thumb || img.url) + '" style="width:100%;height:auto;display:block" />';
                  card.addEventListener('mouseenter', function() { card.style.borderColor = '#0D7377'; });
                  card.addEventListener('mouseleave', function() { card.style.borderColor = 'transparent'; });
                  card.addEventListener('click', function() {
                    setOptionImage(optIndex, img.url || img.thumb);
                    close();
                  });
                  resultsDiv.appendChild(card);
                });
              };

              var doSearch = function(q: string) {
                resultsDiv.innerHTML = '<div style="column-span:all;text-align:center;padding:40px 0;color:#98A2B3;font-size:13px">'
                  + '<div style="width:32px;height:32px;border:3px solid #E5E7EB;border-top-color:#0D7377;border-radius:50%;margin:0 auto 8px;animation:spin 0.8s linear infinite"></div>'
                  + 'Searching...</div>';
                var fetchFn = function(token: string) {
                  fetch(API_BASE + '/api/media/search?q=' + encodeURIComponent(q) + '&page=1', {
                    headers: { Authorization: token ? 'Bearer ' + token : '' },
                  })
                  .then(function(res) { return res.json(); })
                  .then(renderResults)
                  .catch(function() {
                    resultsDiv.innerHTML = '<div style="column-span:all;text-align:center;padding:40px 0;color:#EF4444;font-size:13px">Search failed. Check connection.</div>';
                  });
                };
                if (typeof window !== 'undefined' && (window as any).Clerk) {
                  (window as any).Clerk.session?.getToken().then(function(t: string) { fetchFn(t || ''); }).catch(function() { fetchFn(''); });
                } else { fetchFn(''); }
              };

              /* Auto-load popular images on open */
              doSearch('nature');

              searchInput.addEventListener('input', function() {
                clearTimeout(timer);
                var val = searchInput.value.trim();
                if (val.length === 0) { doSearch('nature'); return; }
                if (val.length < 2) return;
                timer = setTimeout(function() { doSearch(val); }, 400);
              });
              searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') close();
                if (e.key === 'Enter') {
                  clearTimeout(timer);
                  var val = searchInput.value.trim();
                  if (val) doSearch(val);
                }
              });
            }
          }

          /* Default to stock images tab — show images immediately */
          showTab('stock');
        }

        /* ---- shared image overlay for Replace/Delete buttons ---- */
        var imageOverlay = function(oi: number) {
          return (
            <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 2, display: 'flex', gap: 3 }}>
              <span onClick={function(e) { e.preventDefault(); e.stopPropagation(); openImagePicker(oi); }}
                style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>Replace</span>
              <span onClick={function(e) { e.preventDefault(); e.stopPropagation(); setOptionImage(oi, ''); }}
                style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(220,38,38,0.8)', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>Delete</span>
            </div>
          );
        };

        /* ---- shared card bottom bar (letter badge + text + score) ---- */
        var cardBottomBar = function(opt: any, oi: number) {
          return (
            <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: selected ? C.ACCENT : '#E9ECEF', color: selected ? '#fff' : C.TEXT_MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{LETTERS[oi]}</div>
              {selected ? (
                <input value={opt.text} onChange={function(e) { updateOptionText(oi, e.target.value); }} onClick={function(e) { e.stopPropagation(); }} placeholder={'Option ' + LETTERS[oi]}
                  style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.TEXT, fontFamily: C.FONT + ',system-ui,sans-serif', border: '1px solid ' + C.BORDER, borderRadius: 6, padding: '5px 8px', background: '#FAFAFA', outline: 'none', minWidth: 0 }}
                  onFocus={function(e) { e.currentTarget.style.borderColor = C.ACCENT; }} onBlur={function(e) { e.currentTarget.style.borderColor = C.BORDER; }} />
              ) : (
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.text || 'Option ' + LETTERS[oi]}</span>
              )}
              {scoreBadge(opt)}
            </div>
          );
        };

        /* ---- GRID layout ---- */
        if (layout === 'grid') {
          return (
            <div style={{ padding: '0 20px 16px 74px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {qb.options.map(function(opt, oi) {
                return (
                  <div key={opt.id} style={{
                    borderRadius: 10, overflow: 'hidden',
                    border: '1px solid ' + (selected ? C.ACCENT + '40' : C.BORDER),
                    background: '#fff', transition: 'border-color 0.15s',
                  }}>
                    <div style={{ position: 'relative' }}>
                      <div onClick={function(e) { e.stopPropagation(); if (selected) openImagePicker(oi); }}
                        style={{ cursor: selected ? 'pointer' : 'default' }}>
                        {opt.imageUrl ? (
                          <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
                            <img src={opt.imageUrl} alt={opt.text} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        ) : (
                          <div style={{ aspectRatio: '4/3', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {selected ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth={2}><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" /></svg>
                                <span style={{ fontSize: 11, color: C.ACCENT, fontWeight: 600 }}>Add Image</span>
                              </div>
                            ) : (
                              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#D0D5DD" strokeWidth={1.5}><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" /></svg>
                            )}
                          </div>
                        )}
                      </div>
                      {opt.imageUrl && selected && imageOverlay(oi)}
                    </div>
                    {cardBottomBar(opt, oi)}
                  </div>
                );
              })}
            </div>
          );
        }

        /* ---- FULL BACKGROUND layout ---- */
        if (layout === 'fullBackground') {
          return (
            <div style={{ padding: '0 20px 16px 74px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {qb.options.map(function(opt, oi) {
                return (
                  <div key={opt.id} style={{
                    position: 'relative', borderRadius: 10, overflow: 'hidden',
                    border: '1px solid ' + (selected ? C.ACCENT + '40' : C.BORDER),
                    aspectRatio: '4/3', display: 'flex', alignItems: 'flex-end',
                    cursor: selected ? 'pointer' : 'default',
                  }}>
                    {opt.imageUrl ? (
                      <img src={opt.imageUrl} alt={opt.text} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div onClick={function(e) { e.stopPropagation(); if (selected) openImagePicker(oi); }}
                        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #F3F4F6, #E5E7EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: selected ? 'pointer' : 'default' }}>
                        {selected ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth={2}><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" /></svg>
                            <span style={{ fontSize: 11, color: C.ACCENT, fontWeight: 600 }}>Add Image</span>
                          </div>
                        ) : (
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#D0D5DD" strokeWidth={1.5}><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" /></svg>
                        )}
                      </div>
                    )}
                    {opt.imageUrl && selected && imageOverlay(oi)}
                    <div style={{ position: 'relative', zIndex: 1, width: '100%', padding: '20px 10px 8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.55))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.25)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, backdropFilter: 'blur(4px)' }}>{LETTERS[oi]}</div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{opt.text || 'Option ' + LETTERS[oi]}</span>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                        background: 'rgba(255,255,255,0.2)',
                        color: '#fff', backdropFilter: 'blur(4px)',
                      }}>+{opt.score || 0}pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        /* ---- LIST + IMAGE layout ---- */
        if (layout === 'imageThumbnails') {
          return (
            <div style={{ padding: '0 20px 16px 74px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {qb.options.map(function(opt, oi) {
                return (
                  <div key={opt.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 8px',
                    borderRadius: 10, background: '#fff', border: '1px solid ' + (selected ? C.ACCENT + '40' : C.BORDER),
                    transition: 'border-color 0.15s',
                  }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}
                      onClick={function(e) { e.stopPropagation(); if (selected) openImagePicker(oi); }}>
                      {opt.imageUrl ? (
                        <img src={opt.imageUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', display: 'block', cursor: selected ? 'pointer' : 'default' }}
                          onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: 8, background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: selected ? 'pointer' : 'default' }}>
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={selected ? C.ACCENT : '#D0D5DD'} strokeWidth={1.5}><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" /></svg>
                        </div>
                      )}
                      {opt.imageUrl && selected && (
                        <div style={{ position: 'absolute', top: -4, right: -4, zIndex: 2 }}>
                          <span onClick={function(e) { e.preventDefault(); e.stopPropagation(); setOptionImage(oi, ''); }}
                            style={{ fontSize: 8, fontWeight: 700, width: 16, height: 16, borderRadius: 8, background: '#DC2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: 1 }}>×</span>
                        </div>
                      )}
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: selected ? C.ACCENT : '#E9ECEF', color: selected ? '#fff' : C.TEXT_MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{LETTERS[oi]}</div>
                    {selected ? (
                      <input value={opt.text} onChange={function(e) { updateOptionText(oi, e.target.value); }} onClick={function(e) { e.stopPropagation(); }} placeholder={'Option ' + LETTERS[oi]}
                        style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.TEXT, fontFamily: C.FONT + ',system-ui,sans-serif', border: '1px solid ' + C.BORDER, borderRadius: 6, padding: '6px 10px', background: '#FAFAFA', outline: 'none' }}
                        onFocus={function(e) { e.currentTarget.style.borderColor = C.ACCENT; }} onBlur={function(e) { e.currentTarget.style.borderColor = C.BORDER; }} />
                    ) : (
                      <span style={{ flex: 1, fontWeight: 500, fontSize: 13, color: C.TEXT }}>{opt.text || 'Option ' + LETTERS[oi]}</span>
                    )}
                    {scoreBadge(opt)}
                  </div>
                );
              })}
            </div>
          );
        }

        /* ---- DEFAULT LIST layout ---- */
        return (
          <div style={{ padding: '0 20px 16px 74px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {qb.options.map(function(opt, oi) {
              return (
                <div key={opt.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: '#fff', border: '1px solid ' + (selected ? C.ACCENT + '40' : C.BORDER),
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: selected ? C.ACCENT : '#E9ECEF',
                    color: selected ? '#fff' : C.TEXT_MUTED,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    transition: 'all 0.15s',
                  }}>
                    {LETTERS[oi]}
                  </div>
                  {opt.imageUrl && (
                    <img src={opt.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                      onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  {selected ? (
                    <input
                      value={opt.text}
                      onChange={function(e) { updateOptionText(oi, e.target.value); }}
                      onClick={function(e) { e.stopPropagation(); }}
                      placeholder={'Option ' + LETTERS[oi]}
                      style={{
                        flex: 1, fontSize: 13, fontWeight: 500, color: C.TEXT,
                        fontFamily: C.FONT + ',system-ui,sans-serif',
                        border: '1px solid ' + C.BORDER, borderRadius: 6,
                        padding: '6px 10px', background: '#FAFAFA', outline: 'none',
                      }}
                      onFocus={function(e) { e.currentTarget.style.borderColor = C.ACCENT; e.currentTarget.style.background = '#FFF'; }}
                      onBlur={function(e) { e.currentTarget.style.borderColor = C.BORDER; e.currentTarget.style.background = '#FAFAFA'; }}
                    />
                  ) : (
                    <span style={{ flex: 1, fontWeight: 500, fontSize: 13, color: C.TEXT }}>{opt.text || 'Option ' + LETTERS[oi]}</span>
                  )}
                  {selected ? (
                    <input
                      type="number" min={0} max={10}
                      value={opt.score || 0}
                      onChange={function(e) { updateOptionScore(oi, parseInt(e.target.value) || 0); }}
                      onClick={function(e) { e.stopPropagation(); }}
                      title="Score points"
                      style={{
                        width: 52, fontSize: 13, fontWeight: 600, color: C.ACCENT,
                        fontFamily: C.FONT + ',system-ui,sans-serif',
                        border: '1px solid ' + C.BORDER, borderRadius: 6,
                        padding: '6px 6px', background: '#FAFAFA', outline: 'none',
                        textAlign: 'center',
                      }}
                      onFocus={function(e) { e.currentTarget.style.borderColor = C.ACCENT; }}
                      onBlur={function(e) { e.currentTarget.style.borderColor = C.BORDER; }}
                    />
                  ) : scoreBadge(opt)}
                </div>
              );
            })}
          </div>
        );
      })()}
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
    <div style={{ marginBottom: 22 }}>
      <label style={{
        display: 'block', fontSize: 13, fontWeight: 600, color: C.TEXT_MUTED,
        marginBottom: 10, fontFamily: C.FONT + ',system-ui,sans-serif',
        letterSpacing: '-0.01em',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

var inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', fontSize: 15,
  background: '#FFFFFF', border: '1px solid ' + C.BORDER,
  borderRadius: 12, color: C.TEXT, fontFamily: C.FONT + ',system-ui,sans-serif',
  outline: 'none', lineHeight: 1.5,
};

var selectStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', fontSize: 15,
  background: '#FFFFFF', border: '1px solid ' + C.BORDER,
  borderRadius: 12, color: C.TEXT, fontFamily: C.FONT + ',system-ui,sans-serif',
  outline: 'none', cursor: 'pointer',
};

/* Toggle button group — replaces dropdowns for 2-4 options */
function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: 'flex', gap: 0, background: '#F2F4F7', borderRadius: 12,
      padding: 4, border: '1px solid ' + C.BORDER,
    }}>
      {options.map(function(opt) {
        var active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={function() { onChange(opt.value); }}
            style={{
              flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none',
              background: active ? '#FFFFFF' : 'transparent',
              color: active ? C.TEXT : C.TEXT_MUTED,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: C.FONT + ',system-ui,sans-serif',
              boxShadow: active ? '0 1px 3px rgba(16,24,40,0.08)' : 'none',
              transition: 'all 0.15s ease',
              letterSpacing: '-0.01em',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* Collapsible section for sidebar — premium spacing */
function SidebarSection({
  title,
  icon,
  defaultOpen,
  children,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  var [open, setOpen] = useState(defaultOpen !== false);
  return (
    <div style={{ borderBottom: '1px solid ' + C.BORDER }}>
      <button
        type="button"
        onClick={function() { setOpen(!open); }}
        style={{
          width: '100%', padding: '18px 24px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: C.FONT + ',system-ui,sans-serif',
        }}
      >
        {icon}
        <span style={{ fontSize: 15, fontWeight: 700, color: C.TEXT, flex: 1, textAlign: 'left', letterSpacing: '-0.01em' }}>{title}</span>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED}
          strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '0 24px 22px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MediaPicker — Squarespace-style image/video upload & browse       */
/* ------------------------------------------------------------------ */

var API_BASE = (typeof window !== 'undefined' && (window as any).__NEXT_PUBLIC_API_URL)
  || process.env.NEXT_PUBLIC_API_URL
  || 'https://squarespell-api.onrender.com';

function MediaPicker({
  mediaType,
  mediaUrl,
  onChangeType,
  onChangeUrl,
  onClear,
}: {
  mediaType?: 'image' | 'video';
  mediaUrl: string;
  onChangeType: (t: 'image' | 'video' | undefined) => void;
  onChangeUrl: (url: string) => void;
  onClear: () => void;
}) {
  var [tab, setTab] = useState<'content' | 'browse'>('content');
  var [uploading, setUploading] = useState(false);
  var [uploadError, setUploadError] = useState('');
  var [searchQuery, setSearchQuery] = useState('');
  var [searchResults, setSearchResults] = useState<any[]>([]);
  var [searching, setSearching] = useState(false);
  var [showLinkInput, setShowLinkInput] = useState(false);
  var fileInputRef = useRef<HTMLInputElement>(null);

  // If there's already media, show the preview with remove option
  if (mediaUrl) {
    return (
      <div>
        {mediaType === 'image' && (
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid ' + C.BORDER, marginBottom: 10 }}>
            <img src={mediaUrl} alt="Media" style={{ width: '100%', display: 'block', maxHeight: 160, objectFit: 'cover' }}
              onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
        {mediaType === 'video' && (
          <div style={{ padding: '12px 14px', background: '#F9FAFB', borderRadius: 10, border: '1px solid ' + C.BORDER, marginBottom: 10, fontSize: 12, color: C.TEXT_MUTED, wordBreak: 'break-all' }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {mediaUrl}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={function() { setShowLinkInput(true); }}
            style={{ flex: 1, padding: '7px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: C.SURFACE, border: '1px solid ' + C.BORDER, color: C.TEXT_MUTED, cursor: 'pointer', fontFamily: C.FONT }}>
            Replace
          </button>
          <button type="button" onClick={onClear}
            style={{ padding: '7px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: 'transparent', border: '1px solid ' + C.BORDER, color: '#ff3b30', cursor: 'pointer', fontFamily: C.FONT }}>
            Remove
          </button>
        </div>
        {showLinkInput && (
          <div style={{ marginTop: 8 }}>
            <input
              value={mediaUrl}
              onChange={function(e) { onChangeUrl(e.target.value); }}
              style={Object.assign({}, inputStyle, { fontSize: 12 })}
              placeholder={mediaType === 'video' ? 'YouTube or Vimeo URL...' : 'Paste image URL...'}
            />
          </div>
        )}
      </div>
    );
  }

  // No media yet — show the Squarespace-style picker
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    var file = e.target.files?.[0];
    if (!file) return;
    var isVideo = file.type.startsWith('video/');
    setUploading(true);
    setUploadError('');
    var reader = new FileReader();
    reader.onload = function() {
      var base64 = (reader.result as string).split(',')[1];
      var token = '';
      // Get auth token from Clerk
      if (typeof window !== 'undefined' && (window as any).Clerk) {
        (window as any).Clerk.session?.getToken().then(function(t: string) {
          token = t || '';
          doUpload(base64, file!.name, file!.type, token, isVideo);
        }).catch(function() {
          doUpload(base64, file!.name, file!.type, '', isVideo);
        });
      } else {
        doUpload(base64, file!.name, file!.type, '', isVideo);
      }
    };
    reader.readAsDataURL(file);
  }

  function doUpload(base64: string, fileName: string, contentType: string, token: string, isVideo: boolean) {
    setUploadError('');
    fetch(API_BASE + '/api/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' },
      body: JSON.stringify({ data: base64, fileName: fileName, contentType: contentType }),
    })
    .then(function(res) {
      if (!res.ok) throw new Error('Upload failed (' + res.status + ')');
      return res.json();
    })
    .then(function(data) {
      if (data.url) {
        onChangeType(isVideo ? 'video' : 'image');
        onChangeUrl(data.url);
      } else {
        setUploadError(data.error || 'Upload succeeded but no URL was returned. Please try again.');
      }
      setUploading(false);
    })
    .catch(function(err) {
      setUploading(false);
      setUploadError(err.message || 'Upload failed. Check your connection and try again.');
    });
  }

  function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    var token = '';
    var doSearch = function(t: string) {
      fetch(API_BASE + '/api/media/search?q=' + encodeURIComponent(searchQuery) + '&page=1', {
        headers: { Authorization: t ? 'Bearer ' + t : '' },
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        setSearchResults(data.results || []);
        setSearching(false);
      })
      .catch(function() { setSearching(false); });
    };
    if (typeof window !== 'undefined' && (window as any).Clerk) {
      (window as any).Clerk.session?.getToken().then(function(t: string) { doSearch(t || ''); }).catch(function() { doSearch(''); });
    } else { doSearch(''); }
  }

  function selectStock(url: string) {
    onChangeType('image');
    onChangeUrl(url);
    setSearchResults([]);
    setTab('content');
  }

  var tabStyle = function(active: boolean): React.CSSProperties {
    return {
      padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer',
      background: 'none', border: 'none',
      color: active ? C.TEXT : C.TEXT_MUTED,
      borderBottom: active ? '2px solid ' + C.TEXT : '2px solid transparent',
      fontFamily: C.FONT + ',system-ui,sans-serif',
    };
  };

  var menuBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '12px 14px', background: '#FFFFFF',
    border: '1px solid ' + C.BORDER, borderRadius: 10,
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
    color: C.TEXT, fontFamily: C.FONT + ',system-ui,sans-serif',
    transition: 'background 0.12s',
  };

  return (
    <div>
      {/* Type toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
        {(['image', 'video'] as const).map(function(mt) {
          var isActive = mediaType === mt;
          return (
            <button key={mt} type="button"
              onClick={function() { onChangeType(isActive ? undefined : mt); }}
              style={{
                padding: '8px 12px', borderRadius: 8,
                background: isActive ? C.ACCENT : C.SIDEBAR,
                border: '1px solid ' + (isActive ? C.ACCENT : C.BORDER),
                color: isActive ? '#FFFFFF' : C.TEXT_MUTED,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.FONT,
              }}
            >
              {mt === 'image' ? 'Image' : 'Video'}
            </button>
          );
        })}
      </div>

      {mediaType && (
        <div>
          {/* Tabs: Content / Browse Stock */}
          {mediaType === 'image' && (
            <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid ' + C.BORDER, marginBottom: 14 }}>
              <button type="button" style={tabStyle(tab === 'content')} onClick={function() { setTab('content'); }}>Content</button>
              <button type="button" style={tabStyle(tab === 'browse')} onClick={function() { setTab('browse'); }}>Browse Stock</button>
            </div>
          )}

          {/* Content tab (or only tab for video) */}
          {(tab === 'content' || mediaType === 'video') && (
            <div>
              {/* Upload drop zone */}
              <div
                onClick={function() { fileInputRef.current?.click(); }}
                style={{
                  border: '2px dashed ' + C.BORDER, borderRadius: 12,
                  padding: '28px 16px', textAlign: 'center',
                  cursor: uploading ? 'wait' : 'pointer',
                  background: '#FAFAFA', transition: 'border-color 0.15s, background 0.15s',
                  marginBottom: 10,
                }}
                onMouseEnter={function(e) { e.currentTarget.style.borderColor = C.ACCENT; e.currentTarget.style.background = 'rgba(13,115,119,0.03)'; }}
                onMouseLeave={function(e) { e.currentTarget.style.borderColor = C.BORDER; e.currentTarget.style.background = '#FAFAFA'; }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: '#EAECF0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 10px',
                }}>
                  {uploading ? (
                    <div style={{ width: 16, height: 16, border: '2px solid ' + C.ACCENT, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <line x1={12} y1={5} x2={12} y2={19} /><line x1={5} y1={12} x2={19} y2={12} />
                    </svg>
                  )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 3 }}>
                  {uploading ? 'Uploading...' : (mediaType === 'video' ? 'Add a Video' : 'Add an Image')}
                </div>
                <div style={{ fontSize: 12, color: C.TEXT_MUTED }}>
                  {mediaType === 'video' ? '30 minutes max' : '20 MB max'}
                </div>
                {uploadError && (
                  <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)', fontSize: 11, color: '#ff3b30', lineHeight: 1.4 }}>
                    {uploadError}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={mediaType === 'video' ? 'video/*' : 'image/*'}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Action menu */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button type="button" onClick={function() { fileInputRef.current?.click(); }}
                  style={menuBtnStyle}
                  onMouseEnter={function(e) { e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={function(e) { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                  UPLOAD FILE
                </button>

                {mediaType === 'image' && (
                  <button type="button" onClick={function() { setTab('browse'); }}
                    style={menuBtnStyle}
                    onMouseEnter={function(e) { e.currentTarget.style.background = '#F9FAFB'; }}
                    onMouseLeave={function(e) { e.currentTarget.style.background = '#FFFFFF'; }}
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx={11} cy={11} r={8} /><line x1={21} y1={21} x2={16.65} y2={16.65} />
                    </svg>
                    BROWSE STOCK IMAGES
                  </button>
                )}

                <button type="button" onClick={function() { setShowLinkInput(!showLinkInput); }}
                  style={menuBtnStyle}
                  onMouseEnter={function(e) { e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={function(e) { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                  {mediaType === 'video' ? 'ADD FROM LINK' : 'PASTE URL'}
                </button>
              </div>

              {showLinkInput && (
                <div style={{ marginTop: 10 }}>
                  <input
                    autoFocus
                    placeholder={mediaType === 'video' ? 'YouTube or Vimeo URL...' : 'https://...'}
                    onKeyDown={function(e) {
                      if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                        onChangeUrl((e.target as HTMLInputElement).value);
                      }
                    }}
                    onBlur={function(e) { if (e.target.value) { onChangeUrl(e.target.value); } }}
                    style={Object.assign({}, inputStyle, { fontSize: 13 })}
                  />
                  {mediaType === 'video' && (
                    <div style={{ fontSize: 11, color: C.TEXT_SUBTLE, marginTop: 4 }}>YouTube or Vimeo</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Browse Stock tab — Pexels search */}
          {tab === 'browse' && mediaType === 'image' && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <input
                  value={searchQuery}
                  onChange={function(e) { setSearchQuery(e.target.value); }}
                  onKeyDown={function(e) { if (e.key === 'Enter') handleSearch(); }}
                  placeholder="Search free photos..."
                  style={Object.assign({}, inputStyle, { flex: 1, fontSize: 13 })}
                />
                <button type="button" onClick={handleSearch}
                  disabled={searching}
                  style={{
                    padding: '8px 14px', borderRadius: 8,
                    background: C.ACCENT, border: 'none', color: '#FFFFFF',
                    fontSize: 12, fontWeight: 600, cursor: searching ? 'wait' : 'pointer',
                    fontFamily: C.FONT, flexShrink: 0,
                  }}
                >
                  {searching ? '...' : 'Search'}
                </button>
              </div>

              {/* Results grid */}
              {searchResults.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                  {searchResults.map(function(img) {
                    return (
                      <div key={img.id}
                        onClick={function() { selectStock(img.regular || img.thumb); }}
                        style={{
                          borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                          border: '2px solid transparent', transition: 'border-color 0.15s',
                          position: 'relative',
                        }}
                        onMouseEnter={function(e) { e.currentTarget.style.borderColor = C.ACCENT; }}
                        onMouseLeave={function(e) { e.currentTarget.style.borderColor = 'transparent'; }}
                      >
                        <img src={img.thumb} alt={img.alt} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                          padding: '12px 6px 4px', fontSize: 9, color: '#fff',
                        }}>
                          {img.credit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {searchResults.length === 0 && !searching && searchQuery && (
                <div style={{ textAlign: 'center', padding: '20px 10px', color: C.TEXT_MUTED, fontSize: 12 }}>
                  No results. Try a different search term.
                </div>
              )}

              <div style={{ fontSize: 10, color: C.TEXT_SUBTLE, marginTop: 8, textAlign: 'center' }}>
                Photos provided by Pexels
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spin animation for upload */}
      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
    </div>
  );
}

function BlockInspector({
  block,
  allBlocks,
  onChange,
  onChangeAllQuestions,
  onDeselect,
  userPlan,
}: {
  block: QuizBlock;
  allBlocks: QuizBlock[];
  onChange: (updated: QuizBlock) => void;
  onChangeAllQuestions?: (updates: Record<string, any>) => void;
  onDeselect?: () => void;
  userPlan?: UserPlan;
}) {
  function updateField(key: string, value: any) {
    onChange(Object.assign({}, block, { [key]: value }));
  }

  // Question inspector — features-only sidebar (text editing is inline on cards)
  if (block.type === 'question') {
    var qb = block as QuestionBlock;
    var allQuestions = allBlocks.filter(function(b) { return b.type === 'question'; }) as QuestionBlock[];
    return (
      <div>
        {/* Answer style settings */}
        <SidebarSection title="Answer style" defaultOpen={true}
          icon={<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>}
        >
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 8 }}>Selection type</div>
            <ToggleGroup
              options={[
                { value: 'single', label: 'Single' },
                { value: 'multiple', label: 'Multi' },
              ]}
              value={qb.questionType || 'single'}
              onChange={function(v) {
                if (onChangeAllQuestions) { onChangeAllQuestions({ questionType: v }); }
                else { updateField('questionType', v); }
              }}
            />
          </div>
          {/* Answer layout — single control for how answers appear */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 8 }}>Layout</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                { value: 'list', label: 'List', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
                { value: 'grid', label: '2×2 Grid', icon: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z' },
                { value: 'imageThumbnails', label: 'List + Image', icon: 'M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21' },
                { value: 'fullBackground', label: 'Full Image', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 15l4-4 4 4 4-4 4 4' },
              ] as { value: string; label: string; icon: string }[]).map(function(opt) {
                var isActive = (qb.answerLayout || 'list') === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={function() {
                      // Apply layout to ALL questions
                      var style = opt.value === 'grid' ? 'cards' : opt.value === 'fullBackground' ? 'imageChoice' : opt.value === 'imageThumbnails' ? 'imageChoice' : 'buttons';
                      if (onChangeAllQuestions) {
                        onChangeAllQuestions({ answerLayout: opt.value, questionStyle: style });
                      } else {
                        onChange(Object.assign({}, block, { answerLayout: opt.value, questionStyle: style }));
                      }
                    }}
                    style={{
                      padding: '10px 8px', borderRadius: 8,
                      border: '1.5px solid ' + (isActive ? C.ACCENT : C.BORDER),
                      background: isActive ? C.ACCENT_LIGHT : 'transparent',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column' as const,
                      alignItems: 'center', gap: 5, fontFamily: C.FONT + ',system-ui,sans-serif',
                    }}
                  >
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={isActive ? C.ACCENT : C.TEXT_MUTED} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                      <path d={opt.icon} />
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? C.ACCENT : C.TEXT_MUTED }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Add / remove options */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
            <span style={{ fontSize: 14, color: C.TEXT_MUTED, fontWeight: 600 }}>{qb.options.length} options</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {qb.options.length > 2 && (
                <button
                  type="button"
                  onClick={function() {
                    var newOpts = qb.options.slice(0, -1);
                    updateField('options', newOpts);
                  }}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: 'transparent', border: '1px solid ' + C.BORDER,
                    color: C.TEXT_MUTED, cursor: 'pointer', fontFamily: C.FONT + ',system-ui,sans-serif',
                  }}
                >
                  Remove
                </button>
              )}
              {qb.options.length < 8 && (
                <button
                  type="button"
                  onClick={function() {
                    var newOpts = qb.options.slice();
                    newOpts.push({ id: uid(), text: '', score: 0 });
                    updateField('options', newOpts);
                  }}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: C.ACCENT, border: 'none',
                    color: '#FFFFFF', cursor: 'pointer', fontFamily: C.FONT + ',system-ui,sans-serif',
                  }}
                >
                  + Add option
                </button>
              )}
            </div>
          </div>
        </SidebarSection>

        {/* Media section removed — image upload is now inline on grid/thumbnail cards */}

        {/* Section 4: Branching — collapsed by default */}
        <SidebarSection title={<>Branching{!hasPlanAccess(userPlan, 'starter') && <PlanBadge requiredPlan="starter" />}</>} defaultOpen={!!(qb.branchRules && qb.branchRules.length > 0)}
          icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>}
        >
          <div style={{ fontSize: 13, color: C.TEXT_MUTED, marginBottom: 14, lineHeight: 1.5 }}>
            Send users to different questions based on their answer.
          </div>
          {qb.options.map(function(opt, oi) {
            return (
              <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ACCENT, width: 22 }}>{String.fromCharCode(65 + oi)}</span>
                <select
                  value={(qb.branchRules || []).find(function(r) { return r.if_answer === opt.id; })?.goto || ''}
                  onChange={function(e) {
                    var rules = (qb.branchRules || []).filter(function(r) { return r.if_answer !== opt.id; });
                    if (e.target.value) {
                      rules.push({ if_answer: opt.id, goto: e.target.value });
                    }
                    updateField('branchRules', rules.length > 0 ? rules : undefined);
                  }}
                  style={Object.assign({}, selectStyle, { flex: 1 })}
                >
                  <option value="">Next question</option>
                  {allBlocks.filter(function(b) { return b.id !== block.id && (b.type === 'question' || b.type === 'outcome' || b.type === 'leadGate'); }).map(function(b) {
                    var bLabel = b.type === 'question'
                      ? 'Q' + (allQuestions.findIndex(function(q) { return q.id === b.id; }) + 1) + ': ' + (b as QuestionBlock).text.slice(0, 25)
                      : blockLabel(b) + ': ' + blockPreview(b).slice(0, 25);
                    return <option key={b.id} value={b.id}>{bLabel}</option>;
                  })}
                </select>
              </div>
            );
          })}
        </SidebarSection>

        {/* Section 5: Advanced — collapsed */}
        <SidebarSection title={<>Advanced{!hasPlanAccess(userPlan, 'starter') && <PlanBadge requiredPlan="starter" />}</>} defaultOpen={false}
          icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={3} /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>}
        >
          {/* Timer */}
          <InspectorField label="Time limit (seconds)">
            <input
              type="number"
              value={qb.timeLimit || 0}
              onChange={function(e) { updateField('timeLimit', parseInt(e.target.value) || 0); }}
              style={inputStyle}
              min={0}
              placeholder="0 = no limit"
            />
          </InspectorField>

          {/* Explanations per answer */}
          <div style={{ fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 8 }}>Answer explanations</div>
          {qb.options.map(function(opt, oi) {
            return (
              <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, width: 16, textAlign: 'center' }}>{String.fromCharCode(65 + oi)}</span>
                <input
                  value={opt.explanation || ''}
                  onChange={function(e) {
                    var newOpts = qb.options.slice();
                    newOpts[oi] = Object.assign({}, opt, { explanation: e.target.value });
                    updateField('options', newOpts);
                  }}
                  style={Object.assign({}, inputStyle, { flex: 1, padding: '6px 8px', fontSize: 12 })}
                  placeholder="Explanation after answer..."
                />
              </div>
            );
          })}
        </SidebarSection>
      </div>
    );
  }

  // Heading inspector
  if (block.type === 'heading') {
    var hb = block as HeadingBlock;
    return (
      <div>
        <SidebarSection title="Heading" defaultOpen={true}
          icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth={2}><path d="M6 4v16M18 4v16M6 12h12" /></svg>}
        >
          <InspectorField label="Text">
            <input value={hb.text} onChange={function(e) { updateField('text', e.target.value); }} style={inputStyle} />
          </InspectorField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <InspectorField label="Size">
              <select value={hb.level} onChange={function(e) { updateField('level', parseInt(e.target.value)); }} style={selectStyle}>
                <option value={1}>Large</option>
                <option value={2}>Medium</option>
                <option value={3}>Small</option>
              </select>
            </InspectorField>
            <InspectorField label="Align">
              <select value={hb.align || 'left'} onChange={function(e) { updateField('align', e.target.value); }} style={selectStyle}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </InspectorField>
          </div>
        </SidebarSection>
      </div>
    );
  }

  // Text inspector
  if (block.type === 'text') {
    var tb = block as TextBlock;
    return (
      <div>
        <SidebarSection title="Text" defaultOpen={true}
          icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth={2}><path d="M4 6h16M4 10h16M4 14h10" /></svg>}
        >
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
        </SidebarSection>
      </div>
    );
  }

  // Image inspector
  if (block.type === 'image') {
    var ib = block as ImageBlock;
    return (
      <div>
        <SidebarSection title="Image" defaultOpen={true}
          icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth={2}><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" /></svg>}
        >
          <InspectorField label="Image URL">
            <input value={ib.url} onChange={function(e) { updateField('url', e.target.value); }} style={inputStyle} placeholder="Paste image URL..." />
          </InspectorField>
          {ib.url && (
            <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden', border: '1px solid ' + C.BORDER }}>
              <img src={ib.url} alt={ib.alt} style={{ width: '100%', display: 'block', maxHeight: 140, objectFit: 'cover' }}
                onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}
          <InspectorField label="Alt text">
            <input value={ib.alt} onChange={function(e) { updateField('alt', e.target.value); }} style={inputStyle} />
          </InspectorField>
        </SidebarSection>
      </div>
    );
  }

  // Outcome inspector — clean sections
  if (block.type === 'outcome') {
    var ob = block as OutcomeBlock;
    return (
      <div>
        {/* Section: Content */}
        <SidebarSection title="Result content" defaultOpen={true}
          icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
        >
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
        </SidebarSection>

        {/* Section: Image */}
        <SidebarSection title="Result image" defaultOpen={!!ob.imageUrl}
          icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth={2}><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" /></svg>}
        >
          <input
            value={ob.imageUrl || ''}
            onChange={function(e) { updateField('imageUrl', e.target.value); }}
            style={inputStyle}
            placeholder="Paste image URL..."
          />
          {ob.imageUrl && (
            <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid ' + C.BORDER }}>
              <img src={ob.imageUrl} alt={ob.title} style={{ width: '100%', display: 'block', maxHeight: 120, objectFit: 'cover' }}
                onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}
        </SidebarSection>

        {/* Hero image */}
        <div style={{ marginBottom: 16, padding: '12px', background: C.SIDEBAR, border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
          <label style={{
            display: 'block', fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED,
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
          }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ verticalAlign: '-1px', marginRight: 4 }}>
              <rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" />
            </svg>
            Result image
          </label>
          <input
            value={ob.imageUrl || ''}
            onChange={function(e) { updateField('imageUrl', e.target.value); }}
            style={inputStyle}
            placeholder="Image URL for result page..."
          />
          {ob.imageUrl && (
            <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid ' + C.BORDER }}>
              <img src={ob.imageUrl} alt={ob.title} style={{ width: '100%', display: 'block', maxHeight: 140, objectFit: 'cover' }}
                onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}
        </div>

        {/* Section: CTA & scoring */}
        <SidebarSection title="Action & scoring" defaultOpen={true}
          icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1={10} y1={14} x2={21} y2={3} /></svg>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <InspectorField label="CTA text">
              <input value={ob.ctaText || ''} onChange={function(e) { updateField('ctaText', e.target.value); }} style={inputStyle} placeholder="Learn more" />
            </InspectorField>
            <InspectorField label="CTA URL">
              <input value={ob.ctaUrl || ''} onChange={function(e) { updateField('ctaUrl', e.target.value); }} style={inputStyle} placeholder="https://..." />
            </InspectorField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <InspectorField label="Min score">
              <input type="number" value={ob.minScore ?? ''} onChange={function(e) { updateField('minScore', e.target.value === '' ? undefined : parseInt(e.target.value)); }} style={inputStyle} />
            </InspectorField>
            <InspectorField label="Max score">
              <input type="number" value={ob.maxScore ?? ''} onChange={function(e) { updateField('maxScore', e.target.value === '' ? undefined : parseInt(e.target.value)); }} style={inputStyle} />
            </InspectorField>
          </div>
        </SidebarSection>

        {/* Section: Social sharing */}
        <SidebarSection title={<>Social sharing{!hasPlanAccess(userPlan, 'pro') && <PlanBadge requiredPlan="pro" />}</>} defaultOpen={ob.shareEnabled || false}
          icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={18} cy={5} r={3} /><circle cx={6} cy={12} r={3} /><circle cx={18} cy={19} r={3} /><line x1={8.59} y1={13.51} x2={15.42} y2={17.49} /><line x1={15.41} y1={6.51} x2={8.59} y2={10.49} /></svg>}
        >
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            fontSize: 13, fontWeight: 500, color: C.TEXT, marginBottom: 10,
          }}>
            <input
              type="checkbox"
              checked={ob.shareEnabled || false}
              onChange={function(e) { updateField('shareEnabled', e.target.checked); }}
              style={{ accentColor: C.ACCENT, width: 16, height: 16 }}
            />
            Show share buttons on result
          </label>
          {ob.shareEnabled && (
            <div>
              <input
                value={ob.shareText || ''}
                onChange={function(e) { updateField('shareText', e.target.value); }}
                style={inputStyle}
                placeholder="I got [result]! Take the quiz..."
              />
              <div style={{ marginTop: 6, fontSize: 11, color: C.TEXT_SUBTLE }}>
                Adds Twitter, Facebook, and LinkedIn share buttons.
              </div>
            </div>
          )}
        </SidebarSection>
      </div>
    );
  }

  // Lead gate inspector — clean sections
  if (block.type === 'leadGate') {
    var lgb = block as LeadGateBlock;
    return (
      <div>
        <SidebarSection title="Content" defaultOpen={true}
          icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={2} y={4} width={20} height={16} rx={2} /><path d="M22 4L12 13 2 4" /></svg>}
        >
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
        </SidebarSection>
        <SidebarSection title={'Form fields (' + lgb.fields.length + ')'} defaultOpen={true}
          icon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={3} width={18} height={18} rx={2} /><path d="M3 9h18M9 21V9" /></svg>}
        >
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
                    style={Object.assign({}, selectStyle, { width: 100, padding: '8px 10px', fontSize: 12 })}
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
                    style={Object.assign({}, inputStyle, { flex: 1, fontSize: 13 })}
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
                      style={{ accentColor: C.ACCENT }}
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
                  padding: '8px', borderRadius: 8,
                  background: 'transparent', border: '1px dashed ' + C.BORDER,
                  color: C.TEXT_MUTED, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter,system-ui,sans-serif',
                }}
              >
                + Add field
              </button>
            )}
          </div>
        </SidebarSection>
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

function extractVideoId(url: string): { platform: string; id: string } | null {
  if (!url) return null;
  var ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { platform: 'youtube', id: ytMatch[1] };
  var vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { platform: 'vimeo', id: vimeoMatch[1] };
  return null;
}

function VideoEmbed({ url }: { url: string }) {
  var vid = extractVideoId(url);
  if (!vid) return <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8, fontSize: 11, color: '#98a2b3', textAlign: 'center' }}>Invalid video URL</div>;
  var src = vid.platform === 'youtube'
    ? 'https://www.youtube.com/embed/' + vid.id
    : 'https://player.vimeo.com/video/' + vid.id;
  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
      <iframe src={src} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
    </div>
  );
}

function ShareButtons({ text, title }: { text: string; title: string }) {
  var encodedText = encodeURIComponent(text || 'Check out my quiz result: ' + title);
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
      {/* Twitter/X */}
      <div style={{
        width: 36, height: 36, borderRadius: 8, background: '#1DA1F2', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }} title="Share on X">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
      </div>
      {/* Facebook */}
      <div style={{
        width: 36, height: 36, borderRadius: 8, background: '#1877F2', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }} title="Share on Facebook">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
      </div>
      {/* LinkedIn */}
      <div style={{
        width: 36, height: 36, borderRadius: 8, background: '#0A66C2', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }} title="Share on LinkedIn">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
      </div>
    </div>
  );
}

function LivePreview({ blocks }: { blocks: QuizBlock[] }) {
  var questions = blocks.filter(function(b) { return b.type === 'question'; }) as QuestionBlock[];
  var outcomes = blocks.filter(function(b) { return b.type === 'outcome'; }) as OutcomeBlock[];
  var totalQ = questions.length;

  var [currentQ, setCurrentQ] = useState(0);
  var [selectedAnswers, setSelectedAnswers] = useState<Record<number, number[]>>({});
  var [totalScore, setTotalScore] = useState(0);
  var [showResult, setShowResult] = useState(false);

  function handleRestart() {
    setCurrentQ(0);
    setSelectedAnswers({});
    setTotalScore(0);
    setShowResult(false);
  }

  function handleSelectAnswer(optIndex: number) {
    var qb = questions[currentQ];
    if (!qb) return;
    var isMultiple = qb.questionType === 'multiple';
    var prev = selectedAnswers[currentQ] || [];
    var next: number[];
    if (isMultiple) {
      next = prev.indexOf(optIndex) >= 0 ? prev.filter(function(i) { return i !== optIndex; }) : prev.concat([optIndex]);
    } else {
      next = [optIndex];
    }
    var newAnswers = Object.assign({}, selectedAnswers);
    newAnswers[currentQ] = next;
    setSelectedAnswers(newAnswers);

    /* Auto-advance for single-select after short delay */
    if (!isMultiple) {
      setTimeout(function() {
        var score = (qb.options[optIndex] && qb.options[optIndex].score) || 0;
        var newTotal = totalScore + score;
        setTotalScore(newTotal);
        if (currentQ + 1 < totalQ) {
          setCurrentQ(currentQ + 1);
        } else {
          setShowResult(true);
        }
      }, 350);
    }
  }

  function handleNextMultiple() {
    var qb = questions[currentQ];
    var picks = selectedAnswers[currentQ] || [];
    var score = 0;
    picks.forEach(function(pi) { score += (qb.options[pi] && qb.options[pi].score) || 0; });
    var newTotal = totalScore + score;
    setTotalScore(newTotal);
    if (currentQ + 1 < totalQ) {
      setCurrentQ(currentQ + 1);
    } else {
      setShowResult(true);
    }
  }

  /* Find matching outcome */
  function getOutcome() {
    var matched = outcomes.find(function(o) {
      var min = o.minScore !== undefined ? o.minScore : -Infinity;
      var max = o.maxScore !== undefined ? o.maxScore : Infinity;
      return totalScore >= min && totalScore <= max;
    });
    return matched || outcomes[0] || null;
  }

  var qb = questions[currentQ];
  var picks = selectedAnswers[currentQ] || [];
  var isMultiple = qb ? qb.questionType === 'multiple' : false;
  var progress = totalQ > 0 ? ((showResult ? totalQ : currentQ) / totalQ) * 100 : 0;

  return (
    <div style={{
      padding: 20, background: '#FFFFFF', borderRadius: 12,
      border: '1px solid ' + C.BORDER, maxHeight: 'calc(100vh - 120px)',
      overflowY: 'auto', fontSize: 13,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.TEXT_SUBTLE }}>
          Interactive Preview
        </div>
        <button type="button" onClick={handleRestart} style={{
          fontSize: 10, fontWeight: 600, color: C.ACCENT, background: C.ACCENT_LIGHT,
          border: '1px solid ' + C.ACCENT + '30', borderRadius: 6, padding: '3px 10px',
          cursor: 'pointer', fontFamily: 'Inter,system-ui,sans-serif',
        }}>
          Restart
        </button>
      </div>

      {/* Progress bar */}
      {totalQ > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: C.TEXT_SUBTLE, fontWeight: 600 }}>
              {showResult ? 'Complete' : 'Question ' + (currentQ + 1) + ' of ' + totalQ}
            </span>
            <span style={{ fontSize: 10, color: C.ACCENT, fontWeight: 700 }}>Score: {totalScore}</span>
          </div>
          <div style={{ height: 6, background: '#F2F4F7', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: 'linear-gradient(90deg, ' + C.ACCENT + ', #10B981)',
              width: progress + '%', transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Show result */}
      {showResult && (function() {
        var outcome = getOutcome();
        if (!outcome) {
          return (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.TEXT, marginBottom: 8 }}>Quiz Complete!</div>
              <div style={{ fontSize: 13, color: C.TEXT_MUTED, marginBottom: 4 }}>Your score: {totalScore} points</div>
              <div style={{ fontSize: 11, color: C.TEXT_SUBTLE }}>No outcome matched. Add outcomes with score ranges.</div>
            </div>
          );
        }
        return (
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #BBF7D0', background: '#F0FDF4' }}>
            {outcome.imageUrl && (
              <div style={{ height: 120, overflow: 'hidden' }}>
                <img src={outcome.imageUrl} alt={outcome.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={function(e) { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
              </div>
            )}
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#16A34A', marginBottom: 6 }}>Your result</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.TEXT, marginBottom: 6 }}>{outcome.title}</div>
              <div style={{ fontSize: 12, color: C.TEXT_MUTED, lineHeight: 1.6, marginBottom: 8 }}>{outcome.description}</div>
              <div style={{ fontSize: 11, color: C.TEXT_SUBTLE }}>Score: {totalScore} pts</div>
              {outcome.ctaText && (
                <div style={{ marginTop: 10, padding: '10px 20px', background: C.ACCENT, color: '#FFFFFF', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'inline-block' }}>
                  {outcome.ctaText}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Current question */}
      {!showResult && qb && (
        <div style={{ padding: 16, background: C.SIDEBAR, borderRadius: 10, border: '1px solid ' + C.BORDER }}>
          {/* Question header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.ACCENT, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Question {currentQ + 1} of {totalQ}
            </span>
            {qb.timeLimit ? (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', background: '#FEF2F2', padding: '3px 8px', borderRadius: 4 }}>
                {qb.timeLimit}s
              </span>
            ) : null}
          </div>

          {/* Media */}
          {qb.mediaUrl && qb.mediaType === 'image' && (
            <div style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden' }}>
              <img src={qb.mediaUrl} alt="" style={{ width: '100%', display: 'block', maxHeight: 160, objectFit: 'cover' }}
                onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}

          <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 4, lineHeight: 1.4 }}>
            {qb.text}
          </div>
          {qb.subtitle && <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginBottom: 8 }}>{qb.subtitle}</div>}
          {isMultiple && <div style={{ fontSize: 10, color: C.ACCENT, fontWeight: 600, marginBottom: 8 }}>Select all that apply</div>}

          {/* Answer options — clickable */}
          {(function() {
            var layout = qb.answerLayout || 'list';
            if (!qb.answerLayout || qb.answerLayout === 'list') {
              if (qb.questionStyle === 'cards') layout = 'grid';
              else if (qb.questionStyle === 'imageChoice') layout = 'grid';
            }

            function optStyle(oi: number, base: Record<string, any>) {
              var isSel = picks.indexOf(oi) >= 0;
              return Object.assign({}, base, {
                border: '2px solid ' + (isSel ? C.ACCENT : C.BORDER),
                background: isSel ? C.ACCENT_LIGHT : (base.background || '#fff'),
                cursor: 'pointer', transition: 'all 0.15s ease',
              });
            }

            if (layout === 'grid' || qb.questionStyle === 'imageChoice') {
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {qb.options.map(function(opt, oi) {
                    return (
                      <div key={opt.id} onClick={function() { handleSelectAnswer(oi); }}
                        style={optStyle(oi, { borderRadius: 10, overflow: 'hidden' })}>
                        {opt.imageUrl ? (
                          <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
                            <img src={opt.imageUrl} alt={opt.text} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        ) : (
                          <div style={{ aspectRatio: '4/3', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#D0D5DD" strokeWidth={1.5}><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" /></svg>
                          </div>
                        )}
                        <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.TEXT }}>{opt.text || 'Option ' + String.fromCharCode(65 + oi)}</span>
                          <span style={{ fontSize: 9, color: C.TEXT_SUBTLE, fontWeight: 600 }}>+{opt.score || 0}pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            if (layout === 'imageThumbnails') {
              return qb.options.map(function(opt, oi) {
                return (
                  <div key={opt.id} onClick={function() { handleSelectAnswer(oi); }}
                    style={optStyle(oi, { padding: '8px 12px', marginBottom: 6, borderRadius: 10, fontSize: 13, color: C.TEXT, display: 'flex', alignItems: 'center', gap: 10 })}>
                    {opt.imageUrl ? (
                      <img src={opt.imageUrl} alt={opt.text} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                        onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#D0D5DD" strokeWidth={1.5}><rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" /></svg>
                      </div>
                    )}
                    <span style={{ flex: 1 }}>{String.fromCharCode(65 + oi)}. {opt.text}</span>
                    <span style={{ fontSize: 10, color: C.TEXT_SUBTLE, fontWeight: 600 }}>+{opt.score || 0}pts</span>
                  </div>
                );
              });
            }

            if (layout === 'fullBackground') {
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {qb.options.map(function(opt, oi) {
                    var isSel = picks.indexOf(oi) >= 0;
                    return (
                      <div key={opt.id} onClick={function() { handleSelectAnswer(oi); }}
                        style={{
                          position: 'relative', borderRadius: 10, overflow: 'hidden',
                          border: '2px solid ' + (isSel ? C.ACCENT : C.BORDER), cursor: 'pointer',
                          aspectRatio: '4/3', display: 'flex', alignItems: 'flex-end',
                          transition: 'all 0.15s ease',
                          background: opt.imageUrl ? 'transparent' : 'linear-gradient(135deg, #F3F4F6, #E5E7EB)',
                        }}>
                        {opt.imageUrl && <img src={opt.imageUrl} alt={opt.text} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                        <div style={{ position: 'relative', zIndex: 1, width: '100%', padding: '20px 10px 8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.55))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{opt.text || 'Option ' + String.fromCharCode(65 + oi)}</span>
                          <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.8 }}>+{opt.score || 0}pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            /* Default list */
            return qb.options.map(function(opt, oi) {
              var isSel = picks.indexOf(oi) >= 0;
              return (
                <div key={opt.id} onClick={function() { handleSelectAnswer(oi); }}
                  style={{
                    padding: '10px 14px', marginBottom: 6, borderRadius: 10,
                    background: isSel ? C.ACCENT_LIGHT : '#FFFFFF',
                    border: '2px solid ' + (isSel ? C.ACCENT : C.BORDER),
                    fontSize: 13, color: C.TEXT, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'all 0.15s ease',
                  }}>
                  {opt.imageUrl ? (
                    <img src={opt.imageUrl} alt={opt.text} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                      onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div style={{
                      width: 22, height: 22, borderRadius: qb.questionType === 'multiple' ? 4 : 11,
                      border: '2px solid ' + (isSel ? C.ACCENT : C.BORDER), flexShrink: 0,
                      background: isSel ? C.ACCENT : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSel && <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                  )}
                  <span style={{ flex: 1 }}>{String.fromCharCode(65 + oi)}. {opt.text}</span>
                  <span style={{ fontSize: 10, color: C.TEXT_SUBTLE, fontWeight: 600 }}>+{opt.score || 0}pts</span>
                </div>
              );
            });
          })()}

          {/* Next button for multiple-select */}
          {isMultiple && picks.length > 0 && (
            <button type="button" onClick={handleNextMultiple} style={{
              marginTop: 12, width: '100%', padding: '10px 16px',
              background: C.ACCENT, color: '#FFFFFF', borderRadius: 8,
              fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
              fontFamily: 'Inter,system-ui,sans-serif',
            }}>
              {currentQ + 1 < totalQ ? 'Next Question' : 'See Results'}
            </button>
          )}
        </div>
      )}

      {!showResult && !qb && totalQ === 0 && (
        <div style={{ color: C.TEXT_SUBTLE, textAlign: 'center', padding: '20px 0' }}>
          Add questions to preview the quiz
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export: QuizBlockEditor                                      */
/* ------------------------------------------------------------------ */

export interface QuizSettings {
  shuffle_questions?: boolean;
  show_progress_bar?: boolean;
  transition_type?: 'slide' | 'fade' | 'scale' | 'none';
  remove_branding?: boolean;
  enable_recaptcha?: boolean;
  custom_css?: string;
}

export type UserPlan = 'free' | 'trial' | 'starter' | 'pro' | 'agency';

export interface QuizBlockEditorProps {
  blocks: QuizBlock[];
  onChange: (blocks: QuizBlock[]) => void;
  settings?: QuizSettings;
  onSettingsChange?: (settings: QuizSettings) => void;
  userPlan?: UserPlan;
}

/** Plan badge shown inline next to gated features */
function PlanBadge({ requiredPlan }: { requiredPlan: 'starter' | 'pro' | 'agency' }) {
  var colors: Record<string, { bg: string; text: string }> = {
    starter: { bg: '#EFF6FF', text: '#2563EB' },
    pro: { bg: '#F5F3FF', text: '#7C3AED' },
    agency: { bg: '#FFF7ED', text: '#EA580C' },
  };
  var c = colors[requiredPlan] || colors.pro;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
      background: c.bg, color: c.text, textTransform: 'uppercase', letterSpacing: '0.04em',
      marginLeft: 6, verticalAlign: 'middle',
    }}>
      {requiredPlan}
    </span>
  );
}

/** Check if user's plan includes the required tier */
function hasPlanAccess(userPlan: UserPlan | undefined, required: 'starter' | 'pro' | 'agency'): boolean {
  var tiers: Record<string, number> = { free: 0, trial: 0, starter: 1, pro: 2, agency: 3 };
  var userTier = tiers[userPlan || 'free'] || 0;
  var requiredTier = tiers[required] || 0;
  return userTier >= requiredTier;
}

export function QuizBlockEditor({ blocks: initialBlocks, onChange, settings, onSettingsChange, userPlan }: QuizBlockEditorProps) {
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

  var [showSkipLogicModal, setShowSkipLogicModal] = useState(false);

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

  /* ------------------------------------------------------------------ */
  /*  Left question sidebar helpers                                      */
  /* ------------------------------------------------------------------ */
  var questionBlocks = blocks.filter(function(b) { return b.type === 'question'; });
  var outcomeBlocks = blocks.filter(function(b) { return b.type === 'outcome'; });
  var hasLeadGate = blocks.some(function(b) { return b.type === 'leadGate'; });
  var otherBlocks = blocks.filter(function(b) {
    return b.type !== 'question' && b.type !== 'outcome' && b.type !== 'leadGate';
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── Top Bar ── */}
      <div style={{
        height: 56, minHeight: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid ' + C.BORDER,
        background: C.SURFACE,
        fontFamily: C.FONT + ',system-ui,sans-serif',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/dashboard/quizzes" style={{ display: 'flex', alignItems: 'center', color: C.TEXT_MUTED, textDecoration: 'none' }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </a>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.TEXT, letterSpacing: '-0.02em' }}>Quiz Editor</span>
          <span style={{ fontSize: 12, color: C.TEXT_SUBTLE, fontWeight: 500 }}>
            {blocks.filter(function(b) { return b.type === 'question'; }).length} questions
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={function() { setShowPreview(!showPreview); setSelectedId(null); }}
            style={{
              height: 34, padding: '0 14px', borderRadius: 8,
              background: showPreview ? C.ACCENT_LIGHT : C.SURFACE,
              border: '1px solid ' + (showPreview ? C.ACCENT + '40' : C.BORDER),
              color: showPreview ? C.ACCENT : C.TEXT,
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: C.FONT + ',system-ui,sans-serif',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx={12} cy={12} r={3} />
            </svg>
            Preview
          </button>
          <button
            type="button"
            style={{
              height: 34, padding: '0 18px', borderRadius: 8,
              background: C.ACCENT, border: 'none',
              color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: C.FONT + ',system-ui,sans-serif',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}
            title="Changes are auto-saved"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Published
          </button>
        </div>
      </div>
      {/* ── 3-Column Editor Grid ── */}
      <div
        ref={containerRef}
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr 380px',
          gap: 0,
          flex: 1,
          overflow: 'hidden',
        }}
      >
      {/* Left question sidebar — numbered question list */}
      <div style={{
        borderRight: '1px solid ' + C.BORDER,
        background: C.SURFACE,
        overflowY: 'auto', height: '100%',
        scrollbarWidth: 'thin' as const, scrollbarColor: '#D0D5DD transparent',
        padding: '16px 0',
      }}>
        {/* Section: Questions */}
        <div style={{ padding: '0 12px', marginBottom: 6 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: C.TEXT_SUBTLE,
            textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 4px',
            marginBottom: 8,
          }}>
            Questions ({questionBlocks.length})
          </div>
        </div>
        {questionBlocks.map(function(qBlock, qi) {
          var q = qBlock as QuestionBlock;
          var isSelected = selectedId === q.id;
          return (
            <button
              key={q.id}
              type="button"
              onClick={function() { setSelectedId(q.id); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 16px', border: 'none', cursor: 'pointer',
                background: isSelected ? C.ACCENT_LIGHT : 'transparent',
                borderLeft: isSelected ? '3px solid ' + C.ACCENT : '3px solid transparent',
                fontSize: 12, fontWeight: isSelected ? 600 : 500,
                color: isSelected ? C.ACCENT : C.TEXT,
                fontFamily: 'Inter,system-ui,sans-serif',
                textAlign: 'left', transition: 'all 0.1s ease',
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: isSelected ? C.ACCENT : C.BORDER,
                color: isSelected ? '#fff' : C.TEXT_MUTED,
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {qi + 1}
              </span>
              <span style={{
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                flex: 1,
              }}>
                {q.text || 'Untitled question'}
              </span>
            </button>
          );
        })}

        {/* Section: Closings (outcomes + lead gate) */}
        {(outcomeBlocks.length > 0 || hasLeadGate) && (
          <>
            <div style={{
              borderTop: '1px solid ' + C.BORDER, margin: '12px 12px 6px',
            }} />
            <div style={{ padding: '0 12px', marginBottom: 6 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: C.TEXT_SUBTLE,
                textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 4px',
                marginBottom: 8,
              }}>
                Closings
              </div>
            </div>
            {hasLeadGate && (
              <button
                type="button"
                onClick={function() {
                  var lg = blocks.find(function(b) { return b.type === 'leadGate'; });
                  if (lg) setSelectedId(lg.id);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 16px', border: 'none', cursor: 'pointer',
                  background: selectedId && blocks.find(function(b) { return b.id === selectedId && b.type === 'leadGate'; }) ? C.ACCENT_LIGHT : 'transparent',
                  borderLeft: selectedId && blocks.find(function(b) { return b.id === selectedId && b.type === 'leadGate'; }) ? '3px solid ' + C.ACCENT : '3px solid transparent',
                  fontSize: 12, fontWeight: 500,
                  color: C.TEXT, fontFamily: 'Inter,system-ui,sans-serif',
                  textAlign: 'left',
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Lead Gate
              </button>
            )}
            {outcomeBlocks.map(function(oBlock, oi) {
              var o = oBlock as OutcomeBlock;
              var isSelected = selectedId === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={function() { setSelectedId(o.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 16px', border: 'none', cursor: 'pointer',
                    background: isSelected ? C.ACCENT_LIGHT : 'transparent',
                    borderLeft: isSelected ? '3px solid ' + C.ACCENT : '3px solid transparent',
                    fontSize: 12, fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? C.ACCENT : C.TEXT,
                    fontFamily: 'Inter,system-ui,sans-serif',
                    textAlign: 'left',
                  }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={isSelected ? C.ACCENT : C.TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 }}>
                    {o.title || 'Outcome ' + (oi + 1)}
                  </span>
                </button>
              );
            })}
          </>
        )}

        {/* Section: Other blocks */}
        {otherBlocks.length > 0 && (
          <>
            <div style={{
              borderTop: '1px solid ' + C.BORDER, margin: '12px 12px 6px',
            }} />
            <div style={{ padding: '0 12px', marginBottom: 6 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: C.TEXT_SUBTLE,
                textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 4px',
                marginBottom: 8,
              }}>
                Content ({otherBlocks.length})
              </div>
            </div>
            {otherBlocks.map(function(oBlock) {
              var isSelected = selectedId === oBlock.id;
              return (
                <button
                  key={oBlock.id}
                  type="button"
                  onClick={function() { setSelectedId(oBlock.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 16px', border: 'none', cursor: 'pointer',
                    background: isSelected ? C.ACCENT_LIGHT : 'transparent',
                    borderLeft: isSelected ? '3px solid ' + C.ACCENT : '3px solid transparent',
                    fontSize: 12, fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? C.ACCENT : C.TEXT,
                    fontFamily: 'Inter,system-ui,sans-serif',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 }}>
                    {blockLabel(oBlock)}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Canvas — independently scrollable */}
      <div style={{
        padding: '24px 32px', overflowY: 'auto', height: '100%',
        scrollbarWidth: 'thin' as const, scrollbarColor: '#D0D5DD transparent',
      }}>
        {showPreview ? (
          <LivePreview blocks={blocks} />
        ) : (
        <>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 18, padding: '0 2px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: C.TEXT_MUTED, fontWeight: 600 }}>
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={function() { setShowSkipLogicModal(true); }}
              title="Skip logic overview"
              style={{
                height: 30, padding: '0 10px', borderRadius: 6,
                background: showSkipLogicModal ? C.ACCENT_LIGHT : 'transparent',
                border: showSkipLogicModal ? '1px solid ' + C.ACCENT + '30' : 'none',
                color: showSkipLogicModal ? C.ACCENT : C.TEXT_MUTED,
                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: 'Inter,system-ui,sans-serif',
                marginRight: 4,
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
              Skip Logic{!hasPlanAccess(userPlan, 'starter') && <PlanBadge requiredPlan="starter" />}
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
                  onChange={updateBlock}
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
        </>
        )}
      </div>

      {/* Sidebar — always visible, independently scrollable */}
      <div style={{
        borderLeft: '1px solid ' + C.BORDER,
        background: C.SURFACE,
        overflowY: 'auto',
        height: '100%',
        scrollbarWidth: 'thin' as const, scrollbarColor: '#D0D5DD transparent',
      }}>
        {selectedBlock ? (
          <>
            {/* Inspector header — premium sticky bar */}
            <div style={{
              padding: '22px 24px',
              borderBottom: '1px solid ' + C.BORDER,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'sticky', top: 0, background: C.SURFACE, zIndex: 5,
            }}>
              <div style={{
                fontSize: 17, fontWeight: 700, color: C.TEXT, letterSpacing: '-0.02em',
                display: 'flex', alignItems: 'center', gap: 12,
                fontFamily: C.FONT + ',system-ui,sans-serif',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: blockColor(selectedBlock.type) + '12',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={blockColor(selectedBlock.type)}
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
                  width: 34, height: 34, borderRadius: 10,
                  background: 'transparent', border: '1px solid ' + C.BORDER,
                  color: C.TEXT_MUTED, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={function(e) { e.currentTarget.style.borderColor = C.TEXT_MUTED; }}
                onMouseLeave={function(e) { e.currentTarget.style.borderColor = C.BORDER; }}
              >
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} />
                </svg>
              </button>
            </div>

            {/* Inspector content — sections handle own padding */}
            <BlockInspector
              block={selectedBlock}
              allBlocks={blocks}
              onChange={updateBlock}
              onChangeAllQuestions={function(updates: Record<string, any>) {
                var next = blocks.map(function(b) {
                  if (b.type === 'question') {
                    return Object.assign({}, b, updates);
                  }
                  return b;
                });
                commit(next);
              }}
              onDeselect={function() { setSelectedId(null); }}
              userPlan={userPlan}
            />
          </>
        ) : (
          /* Default sidebar — quiz overview when nothing selected */
          <div style={{ padding: '32px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'rgba(13,115,119,0.08)', color: C.ACCENT,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x={3} y={3} width={7} height={7} /><rect x={14} y={3} width={7} height={7} />
                  <rect x={14} y={14} width={7} height={7} /><rect x={3} y={14} width={7} height={7} />
                </svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.TEXT, fontFamily: C.FONT + ',system-ui,sans-serif', marginBottom: 6, letterSpacing: '-0.02em' }}>
                Block Editor
              </div>
              <div style={{ fontSize: 14, color: C.TEXT_MUTED, lineHeight: 1.5 }}>
                Click any block to edit its settings
              </div>
            </div>

            <div style={{ background: '#F9FAFB', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.TEXT_MUTED, marginBottom: 14, letterSpacing: '-0.01em' }}>Overview</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ textAlign: 'center', background: C.SURFACE, borderRadius: 12, padding: '16px 8px', border: '1px solid ' + C.BORDER }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: C.ACCENT, marginBottom: 4 }}>
                    {blocks.filter(function(b) { return b.type === 'question'; }).length}
                  </div>
                  <div style={{ fontSize: 12, color: C.TEXT_MUTED, fontWeight: 500 }}>Questions</div>
                </div>
                <div style={{ textAlign: 'center', background: C.SURFACE, borderRadius: 12, padding: '16px 8px', border: '1px solid ' + C.BORDER }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: C.ACCENT, marginBottom: 4 }}>
                    {blocks.filter(function(b) { return b.type === 'outcome'; }).length}
                  </div>
                  <div style={{ fontSize: 12, color: C.TEXT_MUTED, fontWeight: 500 }}>Outcomes</div>
                </div>
                <div style={{ textAlign: 'center', background: C.SURFACE, borderRadius: 12, padding: '16px 8px', border: '1px solid ' + C.BORDER }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: C.ACCENT, marginBottom: 4 }}>
                    {blocks.length}
                  </div>
                  <div style={{ fontSize: 12, color: C.TEXT_MUTED, fontWeight: 500 }}>Total blocks</div>
                </div>
                <div style={{ textAlign: 'center', background: C.SURFACE, borderRadius: 12, padding: '16px 8px', border: '1px solid ' + C.BORDER }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: C.ACCENT, marginBottom: 4 }}>
                    {blocks.filter(function(b) { return b.type === 'leadGate'; }).length > 0 ? 'On' : 'Off'}
                  </div>
                  <div style={{ fontSize: 12, color: C.TEXT_MUTED, fontWeight: 500 }}>Lead gate</div>
                </div>
              </div>
            </div>

            {/* Quiz Settings */}
            <div style={{ background: '#F9FAFB', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.TEXT_MUTED, marginBottom: 14, letterSpacing: '-0.01em' }}>Quiz Settings</div>

              {/* Randomize questions */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                padding: '14px 16px', background: C.SURFACE, borderRadius: 12,
                border: '1px solid ' + C.BORDER, marginBottom: 10,
              }}>
                <input
                  type="checkbox"
                  checked={settings?.shuffle_questions || false}
                  onChange={function() {
                    if (onSettingsChange) {
                      onSettingsChange(Object.assign({}, settings, { shuffle_questions: !(settings?.shuffle_questions || false) }));
                    }
                  }}
                  style={{ accentColor: C.ACCENT, width: 18, height: 18 }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT }}>Shuffle questions</div>
                  <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginTop: 2 }}>Randomize order each attempt</div>
                </div>
              </label>

              {/* Show progress bar */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                padding: '14px 16px', background: C.SURFACE, borderRadius: 12,
                border: '1px solid ' + C.BORDER, marginBottom: 10,
              }}>
                <input
                  type="checkbox"
                  checked={settings?.show_progress_bar !== false}
                  onChange={function() {
                    if (onSettingsChange) {
                      onSettingsChange(Object.assign({}, settings, { show_progress_bar: settings?.show_progress_bar === false ? true : false }));
                    }
                  }}
                  style={{ accentColor: C.ACCENT, width: 18, height: 18 }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT }}>Progress bar</div>
                  <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginTop: 2 }}>Show completion progress</div>
                </div>
              </label>

              {/* Animation style */}
              <div style={{
                padding: '14px 16px', background: C.SURFACE, borderRadius: 12,
                border: '1px solid ' + C.BORDER,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 10 }}>Transition</div>
                <ToggleGroup
                  options={[
                    { value: 'slide', label: 'Slide' },
                    { value: 'fade', label: 'Fade' },
                    { value: 'scale', label: 'Scale' },
                    { value: 'none', label: 'None' },
                  ]}
                  value={settings?.transition_type || 'slide'}
                  onChange={function(val) {
                    if (onSettingsChange) {
                      onSettingsChange(Object.assign({}, settings, { transition_type: val }));
                    }
                  }}
                />
              </div>

              {/* Remove Squarespell branding — Pro */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 12, cursor: hasPlanAccess(userPlan, 'pro') ? 'pointer' : 'not-allowed',
                padding: '14px 16px', background: C.SURFACE, borderRadius: 12,
                border: '1px solid ' + C.BORDER, marginTop: 10,
                opacity: hasPlanAccess(userPlan, 'pro') ? 1 : 0.6,
              }}>
                <input
                  type="checkbox"
                  checked={settings?.remove_branding || false}
                  disabled={!hasPlanAccess(userPlan, 'pro')}
                  onChange={function() {
                    if (onSettingsChange && hasPlanAccess(userPlan, 'pro')) {
                      onSettingsChange(Object.assign({}, settings, { remove_branding: !(settings?.remove_branding || false) }));
                    }
                  }}
                  style={{ accentColor: C.ACCENT, width: 18, height: 18 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, display: 'flex', alignItems: 'center' }}>
                    Remove branding{!hasPlanAccess(userPlan, 'pro') && <PlanBadge requiredPlan="pro" />}
                  </div>
                  <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginTop: 2 }}>Hide &quot;Powered by Squarespell&quot; watermark</div>
                </div>
              </label>

              {/* reCAPTCHA — Starter */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 12, cursor: hasPlanAccess(userPlan, 'starter') ? 'pointer' : 'not-allowed',
                padding: '14px 16px', background: C.SURFACE, borderRadius: 12,
                border: '1px solid ' + C.BORDER, marginTop: 10,
                opacity: hasPlanAccess(userPlan, 'starter') ? 1 : 0.6,
              }}>
                <input
                  type="checkbox"
                  checked={settings?.enable_recaptcha || false}
                  disabled={!hasPlanAccess(userPlan, 'starter')}
                  onChange={function() {
                    if (onSettingsChange && hasPlanAccess(userPlan, 'starter')) {
                      onSettingsChange(Object.assign({}, settings, { enable_recaptcha: !(settings?.enable_recaptcha || false) }));
                    }
                  }}
                  style={{ accentColor: C.ACCENT, width: 18, height: 18 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, display: 'flex', alignItems: 'center' }}>
                    reCAPTCHA protection{!hasPlanAccess(userPlan, 'starter') && <PlanBadge requiredPlan="starter" />}
                  </div>
                  <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginTop: 2 }}>Block spam submissions with Google reCAPTCHA</div>
                </div>
              </label>

              {/* Custom CSS — Pro */}
              <div style={{
                padding: '14px 16px', background: C.SURFACE, borderRadius: 12,
                border: '1px solid ' + C.BORDER, marginTop: 10,
                opacity: hasPlanAccess(userPlan, 'pro') ? 1 : 0.6,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                  Custom CSS{!hasPlanAccess(userPlan, 'pro') && <PlanBadge requiredPlan="pro" />}
                </div>
                <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginBottom: 8 }}>Add custom styles to your quiz embed</div>
                <textarea
                  value={settings?.custom_css || ''}
                  disabled={!hasPlanAccess(userPlan, 'pro')}
                  onChange={function(e) {
                    if (onSettingsChange && hasPlanAccess(userPlan, 'pro')) {
                      onSettingsChange(Object.assign({}, settings, { custom_css: e.target.value }));
                    }
                  }}
                  placeholder={hasPlanAccess(userPlan, 'pro') ? '.squarespell-quiz {\n  /* your styles */\n}' : 'Upgrade to Pro to add custom CSS'}
                  style={{
                    width: '100%', minHeight: 72, padding: '8px 10px', borderRadius: 8,
                    border: '1px solid ' + C.BORDER, fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    color: C.TEXT, background: hasPlanAccess(userPlan, 'pro') ? '#fff' : '#F9FAFB',
                    resize: 'vertical' as const,
                  }}
                />
              </div>
            </div>

            {/* Feature summary */}
            <div style={{ background: '#F9FAFB', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.TEXT_MUTED, marginBottom: 12, letterSpacing: '-0.01em' }}>Features used</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                {blocks.some(function(b) { return b.type === 'question' && (b as QuestionBlock).questionStyle === 'imageChoice'; }) && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 6, background: '#F0FDF4', color: '#16A34A' }}>Image choices</span>
                )}
                {blocks.some(function(b) { return b.type === 'question' && (b as QuestionBlock).mediaUrl; }) && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB' }}>Media</span>
                )}
                {blocks.some(function(b) { return b.type === 'question' && (b as QuestionBlock).branchRules && (b as QuestionBlock).branchRules!.length > 0; }) && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 6, background: '#F5F3FF', color: '#7C3AED' }}>Branching</span>
                )}
                {blocks.some(function(b) { return b.type === 'question' && (b as QuestionBlock).timeLimit; }) && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 6, background: '#FEF2F2', color: '#EF4444' }}>Timers</span>
                )}
                {blocks.some(function(b) { return b.type === 'outcome' && (b as OutcomeBlock).shareEnabled; }) && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 6, background: '#FFF7ED', color: '#EA580C' }}>Social sharing</span>
                )}
                {blocks.some(function(b) { return b.type === 'outcome' && (b as OutcomeBlock).imageUrl; }) && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 6, background: '#ECFDF5', color: '#059669' }}>Rich results</span>
                )}
                {blocks.some(function(b) { return b.type === 'leadGate'; }) && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 6, background: '#FFF1F2', color: '#E11D48' }}>Lead capture</span>
                )}
                {blocks.some(function(b) { return b.type === 'question' && (b as QuestionBlock).options.some(function(o) { return o.explanation; }); }) && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 6, background: '#FEFCE8', color: '#CA8A04' }}>Explanations</span>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Skip Logic Modal — all questions at a glance with per-answer routing */}
      {showSkipLogicModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }} onClick={function(e) { if (e.target === e.currentTarget) setShowSkipLogicModal(false); }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 800,
            maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const,
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid ' + C.BORDER,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: C.TEXT, margin: 0 }}>Skip Logic Overview</h2>
                <p style={{ fontSize: 12, color: C.TEXT_MUTED, margin: '4px 0 0' }}>
                  Route users to different questions based on their answers. Set "Next question" for default flow.
                </p>
              </div>
              <button
                type="button"
                onClick={function() { setShowSkipLogicModal(false); }}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'transparent', border: '1px solid ' + C.BORDER,
                  color: C.TEXT_MUTED, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} />
                </svg>
              </button>
            </div>

            {/* Modal body — scrollable list of all questions */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
              {questionBlocks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: C.TEXT_MUTED, fontSize: 14 }}>
                  No questions yet. Add questions to set up skip logic.
                </div>
              )}
              {questionBlocks.map(function(qBlock, qi) {
                var q = qBlock as QuestionBlock;
                var hasRules = q.branchRules && q.branchRules.length > 0;
                return (
                  <div key={q.id} style={{
                    marginBottom: 16, border: '1px solid ' + C.BORDER,
                    borderRadius: 12, overflow: 'hidden',
                    background: hasRules ? 'rgba(13,115,119,0.02)' : C.SURFACE,
                  }}>
                    {/* Question header */}
                    <div style={{
                      padding: '14px 16px', borderBottom: '1px solid ' + C.BORDER,
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                        background: hasRules ? C.ACCENT : C.BORDER,
                        color: hasRules ? '#fff' : C.TEXT_MUTED,
                        fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {qi + 1}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, flex: 1 }}>
                        {q.text || 'Untitled question'}
                      </span>
                      {hasRules && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                          background: '#F5F3FF', color: '#7C3AED',
                        }}>
                          {q.branchRules!.length} rule{q.branchRules!.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Per-answer routing */}
                    <div style={{ padding: '12px 16px' }}>
                      {q.options.map(function(opt, oi) {
                        var currentTarget = (q.branchRules || []).find(function(r) { return r.if_answer === opt.id; })?.goto || '';
                        return (
                          <div key={opt.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            marginBottom: oi < q.options.length - 1 ? 8 : 0,
                          }}>
                            <span style={{
                              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                              background: C.ACCENT_LIGHT, color: C.ACCENT,
                              fontSize: 11, fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span style={{
                              fontSize: 13, color: C.TEXT, flex: 1,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                              maxWidth: 200,
                            }}>
                              {opt.text || 'Option ' + (oi + 1)}
                            </span>
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_SUBTLE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                            <select
                              value={currentTarget}
                              onChange={function(e) {
                                var newBlock = JSON.parse(JSON.stringify(q));
                                var rules = (newBlock.branchRules || []).filter(function(r: BranchRule) { return r.if_answer !== opt.id; });
                                if (e.target.value) {
                                  rules.push({ if_answer: opt.id, goto: e.target.value });
                                }
                                newBlock.branchRules = rules.length > 0 ? rules : undefined;
                                updateBlock(newBlock);
                              }}
                              style={{
                                padding: '6px 10px', borderRadius: 6,
                                border: '1px solid ' + C.BORDER, fontSize: 12,
                                color: currentTarget ? C.ACCENT : C.TEXT_MUTED,
                                fontWeight: currentTarget ? 600 : 400,
                                background: currentTarget ? C.ACCENT_LIGHT : '#fff',
                                cursor: 'pointer', fontFamily: 'Inter,system-ui,sans-serif',
                                minWidth: 200,
                              }}
                            >
                              <option value="">Next question (default)</option>
                              {blocks.filter(function(b) { return b.id !== q.id && (b.type === 'question' || b.type === 'outcome' || b.type === 'leadGate'); }).map(function(b) {
                                var bIdx = questionBlocks.findIndex(function(qb) { return qb.id === b.id; });
                                var bLabel = b.type === 'question'
                                  ? 'Q' + (bIdx + 1) + ': ' + ((b as QuestionBlock).text || 'Untitled').slice(0, 30)
                                  : blockLabel(b) + ': ' + blockPreview(b).slice(0, 30);
                                return <option key={b.id} value={b.id}>{bLabel}</option>;
                              })}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

'use client';

/**
 * Custom Select dropdown that renders a fully styled options list
 * instead of relying on the browser's native <select> popup.
 *
 * Supports keyboard navigation, click-outside-to-close, scroll lock on
 * the options panel, and flip-up positioning when near the bottom of the
 * viewport.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DASHBOARD_COLORS as C } from './dashboardColors';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  style?: React.CSSProperties;
}

export function Select({ value, onChange, options, placeholder = 'Select...', style }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [flipUp, setFlipUp] = useState(false);

  const selectedOption = options.find(o => o.value === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Flip positioning
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setFlipUp(spaceBelow < 240);
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    if (!open || !listRef.current || highlightIdx < 0) return;
    const item = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx, open]);

  const toggle = useCallback(() => {
    setOpen(prev => {
      if (!prev) {
        // On open, highlight the currently selected item
        const idx = options.findIndex(o => o.value === value);
        setHighlightIdx(idx >= 0 ? idx : 0);
      }
      return !prev;
    });
  }, [options, value]);

  const select = useCallback((val: string) => {
    onChange(val);
    setOpen(false);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        toggle();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx(prev => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < options.length) {
          select(options[highlightIdx].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  }, [open, highlightIdx, options, select, toggle]);

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={toggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%',
          padding: '10px 32px 10px 12px',
          background: C.SURFACE,
          border: `1px solid ${open ? C.ACCENT : C.BORDER}`,
          borderRadius: 10,
          color: selectedOption ? C.TEXT : C.TEXT_SUBTLE,
          fontSize: 13,
          textAlign: 'left',
          cursor: 'pointer',
          boxSizing: 'border-box' as const,
          outline: 'none',
          transition: 'border-color 0.15s ease',
          position: 'relative',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' as const,
        }}
      >
        {selectedOption ? selectedOption.label : placeholder}
        {/* Chevron */}
        <svg
          width={10}
          height={6}
          viewBox="0 0 10 6"
          fill="none"
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: `translateY(-50%) rotate(${open ? '180deg' : '0deg'})`,
            transition: 'transform 0.15s ease',
            pointerEvents: 'none',
          }}
        >
          <path d="M1 1L5 5L9 1" stroke={C.TEXT_MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown options */}
      {open && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            ...(flipUp ? { bottom: '100%', marginBottom: 4 } : { top: '100%', marginTop: 4 }),
            zIndex: 50,
            background: C.SURFACE,
            border: `1px solid ${C.BORDER}`,
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
            maxHeight: 220,
            overflowY: 'auto',
            padding: 4,
          }}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === highlightIdx;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => select(opt.value)}
                onMouseEnter={() => setHighlightIdx(idx)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 7,
                  fontSize: 13,
                  color: isSelected ? C.ACCENT : C.TEXT,
                  fontWeight: isSelected ? 600 : 400,
                  background: isHighlighted ? C.ACCENT_LIGHT : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'background 0.1s ease',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {/* Check icon for selected item */}
                {isSelected ? (
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.ACCENT}
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span style={{ width: 14, flexShrink: 0 }} />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.label}</span>
              </div>
            );
          })}
          {options.length === 0 && (
            <div style={{ padding: '12px 14px', fontSize: 13, color: C.TEXT_SUBTLE, textAlign: 'center' }}>
              No options
            </div>
          )}
        </div>
      )}
    </div>
  );
}

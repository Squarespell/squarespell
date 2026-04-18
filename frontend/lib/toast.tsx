'use client';
import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const COLORS: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: '#0d1f0d', border: '#1a3a1a', text: '#4ade80', icon: '\u2713' },
  error:   { bg: '#1f0d0d', border: '#3a1a1a', text: '#f87171', icon: '\u2717' },
  info:    { bg: '#0d1520', border: '#1a2a3a', text: '#60a5fa', icon: '\u2139' },
  warning: { bg: '#1f1a0d', border: '#3a321a', text: '#fbbf24', icon: '\u26A0' },
};

/* ------------------------------------------------------------------ */
/* Toast Item                                                          */
/* ------------------------------------------------------------------ */

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const c = COLORS[t.type];
  return (
    <div
      role="alert"
      onClick={() => onDismiss(t.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        color: '#1A1A1A',
        fontSize: 14,
        fontFamily: '"DM Sans", system-ui, sans-serif',
        fontWeight: 500,
        cursor: 'pointer',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        animation: 'sq-toast-in 0.25s ease-out',
        maxWidth: 420,
        lineHeight: 1.4,
      }}
    >
      <span style={{ fontSize: 16, color: c.text, flexShrink: 0 }}>{c.icon}</span>
      <span>{t.message}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = `toast-${++idCounter}`;
    const t: Toast = { id, message, type, duration };
    setToasts(prev => [...prev.slice(-4), t]); // keep max 5
    const timer = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  const ctx: ToastContextValue = {
    toast: addToast,
    success: useCallback((m, d) => addToast(m, 'success', d), [addToast]),
    error: useCallback((m, d) => addToast(m, 'error', d), [addToast]),
    info: useCallback((m, d) => addToast(m, 'info', d), [addToast]),
    warning: useCallback((m, d) => addToast(m, 'warning', d), [addToast]),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            pointerEvents: 'auto',
          }}
        >
          <style>{`
            @keyframes sq-toast-in {
              from { opacity: 0; transform: translateY(12px) scale(0.96); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback for components outside provider - just console.log
    return {
      toast: (m) => console.log('[toast]', m),
      success: (m) => console.log('[toast:success]', m),
      error: (m) => console.error('[toast:error]', m),
      info: (m) => console.log('[toast:info]', m),
      warning: (m) => console.warn('[toast:warning]', m),
    };
  }
  return ctx;
}

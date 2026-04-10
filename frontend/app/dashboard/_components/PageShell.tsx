'use client';

/**
 * PageShell — small reusable primitives for dashboard pages so every page has a
 * consistent header, empty state, card, pill, and stat block without pulling
 * in a UI library. Keeps every dashboard page visually identical to /try.
 */

import { ReactNode } from 'react';
import { DASHBOARD_COLORS as C } from './DashboardShell';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap',
        marginBottom: 28,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 800,
            color: C.TEXT,
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: '8px 0 0 0', fontSize: 14, color: C.TEXT_MUTED }}>{subtitle}</p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  padding = 24,
  style,
}: {
  children: ReactNode;
  padding?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: C.ELEVATED,
        border: `1px solid ${C.BORDER}`,
        borderRadius: 14,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <Card padding={20}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: C.TEXT_MUTED,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: accent ? C.ACCENT : C.TEXT,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
    </Card>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <Card padding={48} style={{ textAlign: 'center' }}>
      {icon && (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(210,255,29,0.08)',
            border: '1px solid rgba(210,255,29,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            color: C.ACCENT,
          }}
        >
          {icon}
        </div>
      )}
      <h2 style={{ margin: '0 0 10px 0', fontSize: 22, fontWeight: 700, color: C.TEXT, letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      {body && (
        <p
          style={{
            margin: '0 auto 24px',
            fontSize: 14.5,
            color: C.TEXT_MUTED,
            maxWidth: 440,
            lineHeight: 1.55,
          }}
        >
          {body}
        </p>
      )}
      {action}
    </Card>
  );
}

export function PrimaryButton({
  children,
  onClick,
  href,
  type = 'button',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 24px',
    background: disabled ? 'rgba(210,255,29,0.3)' : C.ACCENT,
    color: C.BG,
    border: 'none',
    borderRadius: 100,
    fontSize: 13.5,
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    textDecoration: 'none',
    fontFamily: '"DM Sans",system-ui,sans-serif',
    transition: 'transform 0.15s ease, box-shadow 0.2s ease',
  };
  if (href) {
    return (
      <a
        href={href}
        style={style}
        onMouseEnter={(e) => {
          if (disabled) return;
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 0 24px rgba(210,255,29,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={style}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 0 24px rgba(210,255,29,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  href,
  target,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  target?: string;
}) {
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '11px 20px',
    background: 'transparent',
    color: C.TEXT,
    border: `1px solid ${C.BORDER}`,
    borderRadius: 100,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: '"DM Sans",system-ui,sans-serif',
    transition: 'all 0.15s ease',
  };
  const hover = (e: any) => {
    e.currentTarget.style.background = 'rgba(210,255,29,0.08)';
    e.currentTarget.style.borderColor = 'rgba(210,255,29,0.4)';
    e.currentTarget.style.color = C.ACCENT;
  };
  const leave = (e: any) => {
    e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.borderColor = C.BORDER;
    e.currentTarget.style.color = C.TEXT;
  };
  if (href) {
    return (
      <a href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} style={style} onMouseEnter={hover} onMouseLeave={leave}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} style={style} onMouseEnter={hover} onMouseLeave={leave}>
      {children}
    </button>
  );
}

export function Pill({
  children,
  variant = 'neutral',
}: {
  children: ReactNode;
  variant?: 'live' | 'draft' | 'neutral' | 'accent';
}) {
  const colors = {
    live: { bg: 'rgba(76,175,80,0.14)', fg: '#4cd964' },
    draft: { bg: 'rgba(156,163,175,0.15)', fg: '#9ca3af' },
    neutral: { bg: 'rgba(255,255,255,0.06)', fg: C.TEXT_MUTED },
    accent: { bg: 'rgba(210,255,29,0.1)', fg: C.ACCENT },
  }[variant];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: colors.bg,
        color: colors.fg,
      }}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `${Math.max(2, size / 14)}px solid rgba(210,255,29,0.15)`,
        borderTopColor: C.ACCENT,
        borderRadius: '50%',
        animation: 'sq-spin 0.75s linear infinite',
      }}
    >
      <style>{`@keyframes sq-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function PageLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <Spinner size={32} />
    </div>
  );
}

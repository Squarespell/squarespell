'use client';

/**
 * PageShell - reusable primitives for dashboard pages.
 * Light theme with warm off-white palette and deep teal accent.
 */

import { ReactNode } from 'react';
import { DASHBOARD_COLORS as C } from './dashboardColors';

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
        gap: 24,
        flexWrap: 'wrap',
        marginBottom: 32,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            color: C.TEXT,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            fontFamily: '"DM Sans",system-ui,sans-serif',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              margin: '8px 0 0 0',
              fontSize: 14,
              color: C.TEXT_SECONDARY,
              lineHeight: 1.5,
              maxWidth: 560,
              fontFamily: '"Inter","DM Sans",system-ui,sans-serif',
            }}
          >
            {subtitle}
          </p>
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
        background: C.SURFACE,
        border: `1px solid ${C.BORDER}`,
        borderRadius: 12,
        padding,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, accent, sub }: { label: string; value: ReactNode; accent?: boolean; sub?: string }) {
  return (
    <Card padding={20}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: C.TEXT_SECONDARY,
          letterSpacing: '0.01em',
          marginBottom: 10,
          textTransform: 'uppercase',
          fontFamily: '"Inter","DM Sans",system-ui,sans-serif',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: accent ? C.ACCENT : C.TEXT,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          fontFamily: '"DM Sans",system-ui,sans-serif',
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 8, fontFamily: '"Inter","DM Sans",system-ui,sans-serif' }}>{sub}</div>
      )}
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
    <Card padding={56} style={{ textAlign: 'center' }}>
      {icon && (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: C.ACCENT_LIGHT,
            border: `1px solid ${C.BORDER}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: C.ACCENT,
          }}
        >
          {icon}
        </div>
      )}
      <h2 style={{ margin: '0 0 10px 0', fontSize: 22, fontWeight: 700, color: C.TEXT, letterSpacing: '-0.02em', fontFamily: '"DM Sans",system-ui,sans-serif' }}>
        {title}
      </h2>
      {body && (
        <p
          style={{
            margin: '0 auto 24px',
            fontSize: 14,
            color: C.TEXT_SECONDARY,
            maxWidth: 400,
            lineHeight: 1.55,
            fontFamily: '"Inter","DM Sans",system-ui,sans-serif',
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
    padding: '10px 22px',
    background: disabled ? 'rgba(13,115,119,0.4)' : C.ACCENT,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 13.5,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    textDecoration: 'none',
    fontFamily: '"DM Sans",system-ui,sans-serif',
    transition: 'background 0.15s ease, transform 0.15s ease',
  };
  const hoverIn = (e: any) => {
    if (disabled) return;
    e.currentTarget.style.background = C.ACCENT_HOVER;
    e.currentTarget.style.transform = 'translateY(-1px)';
  };
  const hoverOut = (e: any) => {
    e.currentTarget.style.background = disabled ? 'rgba(13,115,119,0.4)' : C.ACCENT;
    e.currentTarget.style.transform = 'translateY(0)';
  };
  if (href) {
    return (
      <a href={href} style={style} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={style} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  href,
  target,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  target?: string;
  disabled?: boolean;
}) {
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 18px',
    background: 'transparent',
    color: C.TEXT,
    border: `1px solid ${C.BORDER}`,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: '"DM Sans",system-ui,sans-serif',
    transition: 'all 0.15s ease',
  };
  const hover = (e: any) => {
    e.currentTarget.style.background = C.ACCENT_LIGHT;
    e.currentTarget.style.borderColor = C.ACCENT;
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
    <button type="button" onClick={onClick} disabled={disabled} style={{ ...style, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer' }} onMouseEnter={disabled ? undefined : hover} onMouseLeave={disabled ? undefined : leave}>
      {children}
    </button>
  );
}

export function Pill({
  children,
  variant = 'neutral',
}: {
  children: ReactNode;
  variant?: 'live' | 'draft' | 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}) {
  const colors: Record<string, { bg: string; fg: string }> = {
    live: { bg: C.SUCCESS_LIGHT, fg: C.SUCCESS },
    draft: { bg: '#F5F5F4', fg: C.TEXT_SECONDARY },
    neutral: { bg: '#F5F5F4', fg: C.TEXT_SECONDARY },
    accent: { bg: C.ACCENT_LIGHT, fg: C.ACCENT },
    success: { bg: C.SUCCESS_LIGHT, fg: C.SUCCESS },
    warning: { bg: C.WARNING_LIGHT, fg: C.WARNING },
    danger: { bg: C.DANGER_LIGHT, fg: C.DANGER },
  };
  const c = colors[variant] || colors.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        background: c.bg,
        color: c.fg,
      }}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 28, label = 'Loading' }: { size?: number; label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        width: size,
        height: size,
        border: `${Math.max(2, size / 14)}px solid ${C.BORDER}`,
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
      <Spinner size={32} label="Loading page" />
    </div>
  );
}

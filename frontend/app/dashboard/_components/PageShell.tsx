'use client';

/**
 * PageShell - reusable primitives for dashboard pages.
 * Untitled UI-inspired clean white design with Inter font.
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
        marginBottom: 24,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 600,
            color: C.GRAY_900,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            fontFamily: C.FONT,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: 14,
              color: C.GRAY_500,
              lineHeight: 1.5,
              maxWidth: 560,
              fontFamily: C.FONT,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{actions}</div>}
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
        border: '1px solid ' + C.GRAY_200,
        borderRadius: 12,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, accent, sub }: { label: string; value: ReactNode; accent?: boolean; sub?: string }) {
  return (
    <Card padding={24}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: C.GRAY_500,
          marginBottom: 10,
          fontFamily: C.FONT,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: accent ? C.ACCENT : C.GRAY_900,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          fontFamily: C.FONT,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 14, color: C.GRAY_500, marginTop: 12, fontFamily: C.FONT }}>{sub}</div>
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
            width: 48,
            height: 48,
            borderRadius: 12,
            background: C.GRAY_100,
            border: '1px solid ' + C.GRAY_200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: C.GRAY_600,
          }}
        >
          {icon}
        </div>
      )}
      <h2 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600, color: C.GRAY_900, letterSpacing: '-0.01em', fontFamily: C.FONT }}>
        {title}
      </h2>
      {body && (
        <p
          style={{
            margin: '0 auto 24px',
            fontSize: 14,
            color: C.GRAY_500,
            maxWidth: 400,
            lineHeight: 1.5,
            fontFamily: C.FONT,
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
  var style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 18px',
    background: disabled ? 'rgba(13,115,119,0.4)' : C.ACCENT,
    color: '#FFFFFF',
    border: '1px solid ' + (disabled ? 'rgba(13,115,119,0.4)' : C.ACCENT),
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    textDecoration: 'none',
    fontFamily: C.FONT,
    boxShadow: C.SHADOW_XS,
    transition: 'all 0.15s ease',
  };
  function hoverIn(e: any) {
    if (disabled) return;
    e.currentTarget.style.background = C.ACCENT_HOVER;
    e.currentTarget.style.borderColor = C.ACCENT_HOVER;
  }
  function hoverOut(e: any) {
    e.currentTarget.style.background = disabled ? 'rgba(13,115,119,0.4)' : C.ACCENT;
    e.currentTarget.style.borderColor = disabled ? 'rgba(13,115,119,0.4)' : C.ACCENT;
  }
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
  var style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 16px',
    background: C.SURFACE,
    color: C.GRAY_700,
    border: '1px solid ' + C.GRAY_300,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: C.FONT,
    boxShadow: C.SHADOW_XS,
    transition: 'all 0.12s ease',
  };
  function hover(e: any) {
    e.currentTarget.style.background = C.GRAY_50;
  }
  function leave(e: any) {
    e.currentTarget.style.background = C.SURFACE;
  }
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
  var colors: Record<string, { bg: string; fg: string; border: string }> = {
    live: { bg: C.SUCCESS_LIGHT, fg: C.SUCCESS_700, border: 'rgba(18,183,106,0.15)' },
    draft: { bg: C.GRAY_100, fg: C.GRAY_600, border: C.GRAY_200 },
    neutral: { bg: C.GRAY_100, fg: C.GRAY_600, border: C.GRAY_200 },
    accent: { bg: C.ACCENT_LIGHT, fg: C.ACCENT, border: 'rgba(13,115,119,0.15)' },
    success: { bg: C.SUCCESS_LIGHT, fg: C.SUCCESS_700, border: 'rgba(18,183,106,0.15)' },
    warning: { bg: C.WARNING_LIGHT, fg: C.WARNING, border: 'rgba(247,144,9,0.15)' },
    danger: { bg: C.DANGER_LIGHT, fg: C.DANGER, border: 'rgba(240,68,56,0.15)' },
  };
  var c = colors[variant] || colors.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 16,
        fontSize: 12,
        fontWeight: 500,
        background: c.bg,
        color: c.fg,
        border: '1px solid ' + c.border,
        fontFamily: C.FONT,
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
        border: Math.max(2, size / 14) + 'px solid ' + C.GRAY_200,
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

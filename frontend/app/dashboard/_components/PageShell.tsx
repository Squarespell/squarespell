'use client';

/**
 * PageShell - reusable primitives for dashboard pages, styled to match the squarespellquiz.com landing page.
 *
 * Inter Tight 500 headings where the last word of a title ending in "." is set in Instrument Serif italic blue,
 * pill eyebrows, compact inline metrics separated by fine rules, 16px hairline cards and 12px blue primary actions.
 * Every export keeps its previous name and props, so existing pages keep working; new optional props add the
 * redesign's eyebrow, breadcrumb and heading-size options.
 */

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DASHBOARD_COLORS as C } from './dashboardColors';

/** Display heading. For a title ending in ".", the last word is set in Instrument Serif italic blue, as on the landing page. */
export function DisplayTitle({ children, size = 'lg', as = 'h1' }: { children: string; size?: 'xl' | 'lg' | 'md'; as?: 'h1' | 'h2' }) {
  var fontSize = size === 'xl' ? 'clamp(40px, 5.6vw, 76px)' : size === 'lg' ? 'clamp(34px, 4.4vw, 60px)' : 'clamp(26px, 3vw, 40px)';
  var text = children || '';
  var hasDot = text.endsWith('.');
  var cut = hasDot ? text.lastIndexOf(' ') : -1;
  var body = hasDot ? text.slice(0, cut + 1) : text;
  var accent = hasDot ? text.slice(cut + 1) : '';
  var Tag = as;
  return (
    <Tag
      style={{
        margin: 0,
        fontFamily: C.DISPLAY_FONT,
        fontSize: fontSize,
        fontWeight: 500,
        letterSpacing: '-0.04em',
        lineHeight: 1.02,
        color: C.INK,
      }}
    >
      {body}
      {hasDot && <em style={{ fontFamily: C.SERIF_FONT, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.01em', color: C.ACCENT }}>{accent}</em>}
    </Tag>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 500, letterSpacing: '0.02em', color: C.ACCENT, background: C.GRAY_50, border: '1px solid ' + C.BORDER, padding: '6px 13px', borderRadius: 999, marginBottom: 16, fontFamily: C.FONT }}>
      <i style={{ width: 6, height: 6, borderRadius: '50%', background: C.ACCENT, display: 'inline-block' }} />
      {children}
    </div>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.GRAY_500, marginBottom: 14, fontFamily: C.FONT }}>
      {items.map(function(it, i) {
        var last = i === items.length - 1;
        return (
          <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {it.href && !last ? <Link href={it.href} style={{ color: C.GRAY_600 }}>{it.label}</Link> : <span style={{ color: last ? C.INK : C.GRAY_600, fontWeight: last ? 500 : 400 }}>{it.label}</span>}
            {!last && <span aria-hidden="true" style={{ color: C.GRAY_300 }}>/</span>}
          </span>
        );
      })}
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  breadcrumb,
  size = 'lg',
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
  breadcrumb?: { label: string; href?: string }[];
  size?: 'xl' | 'lg' | 'md';
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
        marginBottom: 32,
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 480px' }}>
        {breadcrumb && <Breadcrumb items={breadcrumb} />}
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <DisplayTitle size={size}>{title}</DisplayTitle>
        {subtitle && (
          <p style={{ margin: '16px 0 0 0', fontSize: 'clamp(16px, 1.35vw, 19px)', color: C.TEXT_SECONDARY, lineHeight: 1.6, maxWidth: 720, fontFamily: C.FONT }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: breadcrumb || eyebrow ? 28 : 6 }}>{actions}</div>}
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
        border: '1px solid ' + C.BORDER,
        borderRadius: C.RADIUS,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Compact inline metric row separated by fine vertical rules (replaces rows of metric cards). */
export function InlineMetrics({ items, style }: { items: { value: ReactNode; label: string; hint?: string }[]; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', rowGap: 16, ...style }}>
      {items.map(function(m, i) {
        return (
          <div
            key={m.label}
            className="stat"
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              padding: i === 0 ? '0 36px 0 0' : '0 36px',
              borderLeft: i === 0 ? 'none' : '1px solid ' + C.BORDER,
              fontFamily: C.FONT,
            }}
            title={m.hint}
          >
            <span style={{ fontFamily: C.DISPLAY_FONT, fontSize: 'clamp(26px, 2.4vw, 34px)', fontWeight: 500, letterSpacing: '-0.035em', color: C.INK, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {m.value}
            </span>
            <span style={{ fontSize: 15, color: C.GRAY_600 }}>{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function StatCard({ label, value, accent, sub }: { label: string; value: ReactNode; accent?: boolean; sub?: string }) {
  return (
    <Card padding={20}>
      <div className="stat" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            fontFamily: C.DISPLAY_FONT,
            fontSize: 30,
            fontWeight: 500,
            color: accent ? C.ACCENT : C.INK,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 14, color: C.GRAY_600, fontFamily: C.FONT }}>{label}</div>
        {sub && <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>{sub}</div>}
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
            width: 48,
            height: 48,
            borderRadius: C.RADIUS,
            background: C.PERIWINKLE_SOFT,
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
      <h2 style={{ margin: '0 0 8px 0', fontFamily: C.DISPLAY_FONT, fontSize: 24, fontWeight: 500, color: C.INK, letterSpacing: '-0.025em' }}>
        {title}
      </h2>
      {body && (
        <p style={{ margin: '0 auto 22px', fontSize: 15, color: C.GRAY_600, maxWidth: 440, lineHeight: 1.5, fontFamily: C.FONT }}>
          {body}
        </p>
      )}
      {action}
    </Card>
  );
}

var BTN_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: 42,
  padding: '0 18px',
  borderRadius: C.RADIUS_SM,
  fontSize: 15,
  fontWeight: 500,
  textDecoration: 'none',
  fontFamily: C.FONT,
  whiteSpace: 'nowrap',
  transition: 'background 0.12s ease, border-color 0.12s ease',
};

export function PrimaryButton({
  children,
  onClick,
  href,
  type = 'button',
  disabled,
  size = 'md',
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  size?: 'md' | 'lg';
}) {
  var style: React.CSSProperties = {
    ...BTN_BASE,
    height: size === 'lg' ? 52 : 42,
    padding: size === 'lg' ? '0 26px' : '0 18px',
    fontSize: size === 'lg' ? 16.5 : 15,
    background: disabled ? C.BRAND_100 : C.ACCENT,
    color: disabled ? C.BRAND_300 : '#FFFFFF',
    border: '1px solid ' + (disabled ? C.BRAND_100 : C.ACCENT),
    cursor: disabled ? 'default' : 'pointer',
  };
  function hoverIn(e: any) {
    if (disabled) return;
    e.currentTarget.style.background = C.ACCENT_HOVER;
    e.currentTarget.style.borderColor = C.ACCENT_HOVER;
    e.currentTarget.style.boxShadow = '0 14px 30px -14px rgba(49,84,255,0.8)';
  }
  function hoverOut(e: any) {
    e.currentTarget.style.background = disabled ? C.BRAND_100 : C.ACCENT;
    e.currentTarget.style.borderColor = disabled ? C.BRAND_100 : C.ACCENT;
    e.currentTarget.style.boxShadow = 'none';
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
    ...BTN_BASE,
    background: C.SURFACE,
    color: C.INK,
    border: '1px solid ' + C.GRAY_300,
    cursor: 'pointer',
  };
  function hover(e: any) {
    e.currentTarget.style.borderColor = C.ACCENT;
    e.currentTarget.style.color = C.ACCENT;
  }
  function leave(e: any) {
    e.currentTarget.style.borderColor = C.GRAY_300;
    e.currentTarget.style.color = C.INK;
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

/** Minimal outlined status badge: Live in blue, Draft in navy, others in their semantic tone. */
export function Pill({
  children,
  variant = 'neutral',
}: {
  children: ReactNode;
  variant?: 'live' | 'draft' | 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}) {
  var colors: Record<string, { bg: string; fg: string; border: string }> = {
    live: { bg: C.SURFACE, fg: C.ACCENT, border: C.ACCENT },
    draft: { bg: C.SURFACE, fg: C.INK, border: C.GRAY_400 },
    neutral: { bg: C.GRAY_50, fg: C.GRAY_600, border: C.BORDER },
    accent: { bg: C.PERIWINKLE_SOFT, fg: C.ACCENT, border: C.PERIWINKLE },
    success: { bg: C.SUCCESS_LIGHT, fg: C.SUCCESS_700, border: 'rgba(14,122,63,0.25)' },
    warning: { bg: C.WARNING_LIGHT, fg: C.WARNING, border: 'rgba(154,91,0,0.25)' },
    danger: { bg: C.DANGER_LIGHT, fg: C.DANGER, border: 'rgba(192,39,27,0.25)' },
  };
  var c = colors[variant] || colors.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 24,
        padding: '0 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        background: c.bg,
        color: c.fg,
        border: '1px solid ' + c.border,
        fontFamily: C.FONT,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/** Underlined local tabs (e.g. Tags / Segments, Overview / History). Controlled by the caller. */
export function UnderlineTabs({ tabs, value, onChange }: { tabs: { value: string; label: ReactNode }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 28, borderBottom: '1px solid ' + C.BORDER, marginBottom: 24, overflowX: 'auto' }}>
      {tabs.map(function(t) {
        var active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={function() { onChange(t.value); }}
            style={{
              background: 'transparent', border: 'none', padding: '0 2px 12px', marginBottom: -1, fontSize: 15,
              fontWeight: active ? 600 : 500, color: active ? C.ACCENT : C.GRAY_600, borderBottom: '2px solid ' + (active ? C.ACCENT : 'transparent'),
              fontFamily: C.FONT, whiteSpace: 'nowrap', cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented pill filter (All / Live / Drafts ...). Active segment is solid blue. */
export function SegmentedFilter({ options, value, onChange }: { options: { value: string; label: string; count?: number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(function(o) {
        var active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={function() { onChange(o.value); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', borderRadius: 999,
              border: '1px solid ' + (active ? C.ACCENT : C.GRAY_300), background: active ? C.ACCENT : C.SURFACE,
              color: active ? '#fff' : C.INK, fontSize: 14, fontWeight: 500, fontFamily: C.FONT, cursor: 'pointer',
            }}
          >
            {o.label}
            {typeof o.count === 'number' && (
              <span style={{ fontSize: 12, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(255,255,255,0.2)' : C.GRAY_100, color: active ? '#fff' : C.ACCENT }}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

var SETTINGS_TABS = [
  { href: '/dashboard/settings', label: 'General', match: function(p: string) { return p === '/dashboard/settings'; } },
  { href: '/dashboard/brand-kit', label: 'Branding', match: function(p: string) { return p.startsWith('/dashboard/brand-kit') || p.startsWith('/dashboard/settings/white-label'); } },
  { href: '/dashboard/settings/custom-domain', label: 'Domains', match: function(p: string) { return p.startsWith('/dashboard/settings/custom-domain'); } },
  { href: '/dashboard/team', label: 'Team', match: function(p: string) { return p.startsWith('/dashboard/team'); } },
  { href: '/dashboard/billing', label: 'Billing', match: function(p: string) { return p.startsWith('/dashboard/billing'); } },
];

/** Settings local navigation shared by General, Branding, Domains, Team and Billing. */
export function SettingsTabs() {
  var pathname = usePathname() || '';
  return (
    <nav aria-label="Settings" style={{ display: 'flex', gap: 30, borderBottom: '1px solid ' + C.BORDER, marginBottom: 28, overflowX: 'auto' }}>
      {SETTINGS_TABS.map(function(t) {
        var active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            style={{
              padding: '0 2px 13px', marginBottom: -1, fontSize: 15, fontWeight: active ? 600 : 500,
              color: active ? C.ACCENT : C.GRAY_600, borderBottom: '2px solid ' + (active ? C.ACCENT : 'transparent'), whiteSpace: 'nowrap', fontFamily: C.FONT,
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
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

'use client';

/**
 * DashboardShell - the persistent chrome that wraps every top-level dashboard page (2026 redesign).
 *
 * Two horizontal navigation bars instead of a sidebar:
 *   1. Primary bar: wordmark, the four areas Workspace / Audience / Engage / Insights, search, notifications, account menu.
 *   2. Contextual bar: the pages of the active area (for Workspace: Dashboard, Quizzes, Templates, Publish, Integrations, Settings).
 *
 * Rules
 * -----
 * - The chrome is persistent across route changes (no re-mount flicker).
 * - The active area and page are derived from the pathname, so deep links highlight correctly.
 * - Full-screen editor routes opt out of the chrome (hideSidebar / isEditorRoute) and render their own editor shell.
 * - Plan and usage live in the account menu, so nothing from the old sidebar card is lost.
 */

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { TopBanner } from './TopBanner';
import { NotificationBell } from './NotificationBell';
import { CommandPalette } from './CommandPalette';
import { OnboardingTour } from './OnboardingTour';
import { DASHBOARD_COLORS } from './dashboardColors';

var C = DASHBOARD_COLORS;

/* ---------- navigation model ---------- */

type SubItem = { href: string; label: string; tour?: string; match?: (p: string) => boolean };
type NavItem = SubItem & { icon?: ReactNode; children?: SubItem[] };
type Area = { key: string; label: string; href: string; tour?: string; items: NavItem[] };

function starts(p: string, prefix: string): boolean {
  return p === prefix || p.startsWith(prefix + '/');
}

function isEditorRoute(pathname: string): boolean {
  if (pathname === '/dashboard/editor' || pathname.startsWith('/dashboard/editor/')) return true;
  if (pathname === '/dashboard') return false;
  var knownPrefixes = [
    '/dashboard/quizzes', '/dashboard/quiz', '/dashboard/leads', '/dashboard/analytics',
    '/dashboard/integrations', '/dashboard/billing', '/dashboard/settings',
    '/dashboard/team', '/dashboard/emails', '/dashboard/segmentation',
    '/dashboard/automations', '/dashboard/commerce', '/dashboard/templates',
    '/dashboard/brand-kit', '/dashboard/referrals', '/dashboard/embed',
    '/dashboard/admin', '/dashboard/trash', '/dashboard/sites', '/dashboard/translations',
  ];
  if (knownPrefixes.some(function(prefix) { return starts(pathname, prefix); })) return false;
  return pathname.startsWith('/dashboard/');
}

var SETTINGS_PREFIXES = ['/dashboard/settings', '/dashboard/billing', '/dashboard/brand-kit', '/dashboard/team', '/dashboard/referrals', '/dashboard/trash'];

function areasFor(connectEnabled: boolean): Area[] {
  var publishChildren: SubItem[] = [];
  if (connectEnabled) publishChildren.push({ href: '/dashboard/sites', label: 'Sites' });
  publishChildren.push({ href: '/dashboard/embed', label: 'Manual embed', tour: 'embed' });
  return [
    {
      key: 'workspace', label: 'Workspace', href: '/dashboard',
      items: [
        { href: '/dashboard', label: 'Dashboard', tour: 'dashboard', match: function(p) { return p === '/dashboard'; }, icon: <HomeIcon /> },
        {
          href: '/dashboard/quizzes', label: 'Quizzes', tour: 'quizzes',
          match: function(p) { return starts(p, '/dashboard/quizzes') || starts(p, '/dashboard/quiz') || starts(p, '/dashboard/translations') || isEditorRoute(p); },
        },
        { href: '/dashboard/templates', label: 'Templates', tour: 'templates' },
        {
          href: publishChildren[0].href, label: 'Publish',
          match: function(p) { return starts(p, '/dashboard/sites') || starts(p, '/dashboard/embed'); },
          children: publishChildren,
        },
        { href: '/dashboard/integrations', label: 'Integrations', tour: 'integrations' },
        {
          href: '/dashboard/settings', label: 'Settings', tour: 'billing',
          match: function(p) { return SETTINGS_PREFIXES.some(function(x) { return starts(p, x); }); },
        },
      ],
    },
    {
      key: 'audience', label: 'Audience', href: '/dashboard/leads', tour: 'leads',
      items: [
        { href: '/dashboard/leads', label: 'Leads' },
        { href: '/dashboard/segmentation', label: 'Segmentation' },
      ],
    },
    {
      key: 'engage', label: 'Engage', href: '/dashboard/emails', tour: 'emails',
      items: [
        { href: '/dashboard/emails', label: 'Email campaigns' },
        { href: '/dashboard/automations', label: 'Automations' },
        { href: '/dashboard/commerce', label: 'Products' },
      ],
    },
    {
      key: 'insights', label: 'Insights', href: '/dashboard/analytics', tour: 'analytics',
      items: [
        { href: '/dashboard/analytics', label: 'Analytics', match: function(p) { return starts(p, '/dashboard/analytics') && !starts(p, '/dashboard/analytics/attribution'); } },
        { href: '/dashboard/analytics/attribution', label: 'Attribution' },
      ],
    },
  ];
}

function itemActive(item: SubItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  return starts(pathname, item.href);
}

function areaFor(areas: Area[], pathname: string): Area {
  for (var i = 0; i < areas.length; i++) {
    if (areas[i].items.some(function(it) { return itemActive(it, pathname); })) return areas[i];
  }
  return areas[0];
}

/* ---------- icons and brand ---------- */

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V10z" />
    </svg>
  );
}

function Chevron({ open }: { open?: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

import { BrandMark, Wordmark } from './Brand';
export { BrandMark, Wordmark };

var searchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7.5" />
    <path d="M20.5 20.5l-4.2-4.2" />
  </svg>
);

/* ---------- plan data (moved from the old sidebar card into the account menu) ---------- */

type PlanCardData = {
  name: string;
  renewsAt: string;
  isTrial: boolean;
  trialDaysLeft: number;
  leadsUsed: number;
  leadsLimit: number;
  quizzesUsed: number;
  quizzesLimit: number;
};

function isUnlimited(limit: number): boolean {
  return limit <= 0 || limit === Infinity || limit >= 999999;
}

function UsageLine({ label, used, limit }: { label: string; used: number; limit: number }) {
  var unlimited = isUnlimited(limit);
  var pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  var color = pct >= 90 ? C.DANGER : pct >= 70 ? C.WARNING_500 : C.ACCENT;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.GRAY_600 }}>
        <span>{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: C.INK }}>
          {unlimited ? used.toLocaleString() + ' / ∞' : used.toLocaleString() + ' / ' + limit.toLocaleString()}
        </span>
      </div>
      {!unlimited && (
        <div style={{ height: 4, background: C.GRAY_100, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: color }} />
        </div>
      )}
    </div>
  );
}

/* ---------- account menu ---------- */

function AccountMenu({ userEmail, plan, onSignOut }: { userEmail: string; plan: PlanCardData; onSignOut: () => void }) {
  var [open, setOpen] = useState(false);
  var ref = useRef<HTMLDivElement>(null);
  var userName = userEmail.split('@')[0] || 'Account';
  var displayName = userName.charAt(0).toUpperCase() + userName.slice(1);
  var initial = (userName[0] || 'S').toUpperCase();

  useEffect(function() {
    if (!open) return;
    var onDoc = function(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    var onKey = function(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return function() { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  var link = function(href: string, label: string) {
    return (
      <Link href={href} role="menuitem" onClick={function() { setOpen(false); }} className="sq-menu-item">
        {label}
      </Link>
    );
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={function() { setOpen(function(v) { return !v; }); }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', padding: '4px 2px', color: C.INK, fontFamily: C.FONT }}
      >
        <span style={{ width: 34, height: 34, borderRadius: '50%', background: C.INK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600 }}>
          {initial}
        </span>
        <span className="sq-hide-sm" style={{ fontSize: 14, fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
        <span className="sq-hide-sm" style={{ color: C.GRAY_500 }}><Chevron open={open} /></span>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 280, background: C.SURFACE,
            border: '1px solid ' + C.BORDER, borderRadius: C.RADIUS, boxShadow: C.SHADOW_LG, zIndex: 60, overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + C.BORDER }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.INK }}>{displayName}</div>
            <div style={{ fontSize: 12, color: C.GRAY_500, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail || '-'}</div>
          </div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + C.BORDER, background: C.GRAY_25 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.INK }}>{plan.name}</span>
              <span style={{ fontSize: 12, color: plan.isTrial && plan.trialDaysLeft <= 3 ? C.WARNING : C.GRAY_500 }}>
                {plan.isTrial ? (plan.trialDaysLeft > 0 ? plan.trialDaysLeft + ' days left in trial' : 'Trial ended') : plan.renewsAt ? 'Renews ' + plan.renewsAt : 'Active'}
              </span>
            </div>
            <UsageLine label="Leads this month" used={plan.leadsUsed} limit={plan.leadsLimit} />
            <UsageLine label="Quizzes" used={plan.quizzesUsed} limit={plan.quizzesLimit} />
          </div>
          <div style={{ padding: 6 }}>
            {link('/dashboard/billing', plan.isTrial ? 'Choose a plan' : 'Billing & plan')}
            {link('/dashboard/settings', 'Workspace settings')}
            {link('/dashboard/brand-kit', 'Brand kit')}
            {link('/dashboard/team', 'Team')}
            {link('/dashboard/referrals', 'Referrals')}
            {link('/dashboard/trash', 'Trash')}
            <a href="https://docs.squarespell.com" target="_blank" rel="noopener noreferrer" role="menuitem" className="sq-menu-item">Help center</a>
          </div>
          <div style={{ padding: 6, borderTop: '1px solid ' + C.BORDER }}>
            <button type="button" role="menuitem" onClick={onSignOut} className="sq-menu-item" style={{ color: C.DANGER }}>Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- contextual nav item with optional dropdown (Publish) ---------- */

function SubNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  var active = itemActive(item, pathname);
  var [open, setOpen] = useState(false);
  var ref = useRef<HTMLDivElement>(null);

  useEffect(function() {
    if (!open) return;
    var onDoc = function(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    var onKey = function(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return function() { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (item.children && item.children.length > 1) {
    return (
      <div ref={ref} style={{ position: 'relative', display: 'flex' }}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={function() { setOpen(function(v) { return !v; }); }}
          className={'sq-subnav-link' + (active ? ' is-active' : '')}
        >
          {item.label} <Chevron open={open} />
        </button>
        {open && (
          <div role="menu" style={{ position: 'absolute', left: 0, top: 'calc(100% + 4px)', minWidth: 200, background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: C.RADIUS, boxShadow: C.SHADOW_LG, padding: 6, zIndex: 60 }}>
            {item.children.map(function(child) {
              var childTour = child.tour ? { 'data-tour': child.tour } : {};
              return (
                <Link key={child.href} href={child.href} role="menuitem" onClick={function() { setOpen(false); }} className="sq-menu-item" aria-current={starts(pathname, child.href) ? 'page' : undefined} {...childTour}>
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  var single = item.children && item.children.length === 1 ? item.children[0] : null;
  var href = single ? single.href : item.href;
  var tour = single && single.tour ? single.tour : item.tour;
  var tourAttr = tour ? { 'data-tour': tour } : {};
  return (
    <Link href={href} className={'sq-subnav-link' + (active ? ' is-active' : '')} aria-current={active ? 'page' : undefined} {...tourAttr}>
      {item.icon && active ? <span style={{ display: 'inline-flex', color: C.ACCENT }}>{item.icon}</span> : null}
      {item.label}
    </Link>
  );
}

/* ---------- shell ---------- */

interface DashboardShellProps {
  children: ReactNode;
  title?: string;
  /** Page-level actions; rendered at the right end of the contextual navigation bar. */
  topbarRight?: ReactNode;
  contentPadding?: string;
  /** Hides both navigation bars (used by focused multi-step flows). */
  hideTopbar?: boolean;
  /** Hides all chrome (full-screen editor). Defaults to true on editor routes. */
  hideSidebar?: boolean;
}

export function DashboardShell({
  children,
  topbarRight,
  contentPadding = '40px 40px 72px',
  hideTopbar = false,
  hideSidebar,
}: DashboardShellProps) {
  var pathname = usePathname() || '/dashboard';
  var isOnEditor = isEditorRoute(pathname);
  var hideChrome = hideSidebar !== undefined ? hideSidebar : isOnEditor;
  var router = useRouter();
  var { signOut: clerkSignOut } = useClerk();
  var { user } = useUser();
  var { getToken } = useAuth();
  var [isMobile, setIsMobile] = useState(false);
  var [bannerToken, setBannerToken] = useState<string | null>(null);
  var [connectEnabled, setConnectEnabled] = useState(false);
  var [planData, setPlanData] = useState<PlanCardData>({
    name: 'Loading...', renewsAt: '', isTrial: false, trialDaysLeft: 0,
    leadsUsed: 0, leadsLimit: 0, quizzesUsed: 0, quizzesLimit: 0,
  });

  useEffect(function() {
    var check = function() { setIsMobile(window.innerWidth < 768); };
    check();
    window.addEventListener('resize', check);
    return function() { window.removeEventListener('resize', check); };
  }, []);

  useEffect(function() {
    var cancelled = false;
    (async function() {
      try {
        var t = await getToken();
        if (!cancelled) setBannerToken(t);
      } catch { /* ignore */ }
    })();
    return function() { cancelled = true; };
  }, [getToken]);

  var userEmail = user?.primaryEmailAddress?.emailAddress || '';

  // One-button connect feature flag (server-side, off by default): decides whether Sites appears under Publish.
  useEffect(function() {
    if (!bannerToken) return;
    var cancelled = false;
    var apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';
    fetch(apiBase + '/api/connect/config', { headers: { Authorization: 'Bearer ' + bannerToken } })
      .then(function(r) { return r.ok ? r.json() : { enabled: false }; })
      .then(function(d) { if (!cancelled) setConnectEnabled(!!(d && d.enabled)); })
      .catch(function() { /* flag unreachable: keep Manual embed only */ });
    return function() { cancelled = true; };
  }, [bannerToken]);

  // Plan and usage for the account menu.
  useEffect(function() {
    if (!bannerToken) return;
    var cancelled = false;
    var apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';
    (async function() {
      try {
        var res = await fetch(apiBase + '/api/user/plan', { headers: { Authorization: 'Bearer ' + bannerToken } });
        if (res.ok) {
          var data = await res.json();
          if (!cancelled) {
            var renewDate = data.current_period_end ? new Date(data.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            var PLAN_NAMES: Record<string, string> = {
              free: 'Free Plan', trial: 'Free Trial', core: 'Core Plan', pro: 'Pro Plan',
              business: 'Business Plan', agency: 'Business Plan',
              starter: 'Core Plan', growth: 'Pro Plan', scale: 'Business Plan',
            };
            var rawPlan = (data.plan || 'free').toLowerCase();
            var planDisplayName = PLAN_NAMES[rawPlan] || (rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1) + ' Plan');
            var isTrial = rawPlan === 'free' || rawPlan === 'trial';
            var trialDaysLeft = 0;
            if (isTrial && data.trial_ends_at) {
              trialDaysLeft = Math.max(0, Math.ceil((new Date(data.trial_ends_at).getTime() - Date.now()) / 86400000));
            }
            setPlanData({
              name: planDisplayName,
              renewsAt: renewDate,
              isTrial: isTrial,
              trialDaysLeft: trialDaysLeft,
              leadsUsed: data.leads_this_month ?? data.usage?.leads ?? 0,
              leadsLimit: data.limits?.leads ?? 0,
              quizzesUsed: data.quiz_count ?? 0,
              quizzesLimit: data.limits?.quizzes ?? 0,
            });
          }
        }
      } catch {}
    })();
    return function() { cancelled = true; };
  }, [bannerToken]);

  var areas = areasFor(connectEnabled);
  var currentArea = areaFor(areas, pathname);

  var signOut = function() { clerkSignOut(function() { router.push('/sign-in'); }); };
  var openSearch = function() { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true })); };
  var sidePad = isMobile ? 16 : 40;

  var chrome = (
    <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
      {/* Primary bar */}
      <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: isMobile ? 14 : 44, padding: '0 ' + sidePad + 'px', borderBottom: '1px solid ' + C.BORDER }}>
        <Link href="/dashboard" aria-label="Squarespell Quiz home" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Wordmark compact={isMobile} />
        </Link>
        <nav aria-label="Primary" className="sq-scroll-x" style={{ display: 'flex', alignItems: 'stretch', gap: isMobile ? 18 : 34, alignSelf: 'stretch', minWidth: 0 }}>
          {areas.map(function(area) {
            var active = area.key === currentArea.key;
            var tourAttr = area.tour ? { 'data-tour': area.tour } : {};
            return (
              <Link key={area.key} href={area.href} className={'sq-area-link' + (active ? ' is-active' : '')} aria-current={active ? 'true' : undefined} {...tourAttr}>
                {area.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={openSearch} className="sq-search" aria-label="Search anything (Command K)">
          {searchIcon}
          <span className="sq-hide-sm" style={{ flex: 1, textAlign: 'left' }}>Search anything...</span>
          <kbd className="sq-hide-sm">⌘K</kbd>
        </button>
        <NotificationBell />
        <AccountMenu userEmail={userEmail} plan={planData} onSignOut={signOut} />
      </div>

      {/* Contextual bar */}
      <div style={{ minHeight: 52, display: 'flex', alignItems: 'center', gap: 16, padding: '0 ' + sidePad + 'px', borderBottom: '1px solid ' + C.BORDER, background: 'rgba(250,251,255,0.95)' }}>
        <nav aria-label={currentArea.label} className="sq-scroll-x" style={{ display: 'flex', alignItems: 'stretch', gap: isMobile ? 18 : 30, alignSelf: 'stretch', minWidth: 0, flex: 1 }}>
          {currentArea.key === 'workspace' && !isMobile && (
            <span style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: C.GRAY_600, paddingRight: 18, borderRight: '1px solid ' + C.BORDER, margin: '14px 0' }}>
              My workspace
            </span>
          )}
          {currentArea.items.map(function(item) {
            return <SubNavItem key={item.label} item={item} pathname={pathname} />;
          })}
        </nav>
        {topbarRight && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>{topbarRight}</div>}
      </div>
    </header>
  );

  return (
    <div style={{ background: C.BG, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: C.FONT, color: C.TEXT }}>
      <a
        href="#sq-main"
        style={{ position: 'absolute', left: -9999, top: 0, zIndex: 100, padding: '12px 24px', background: C.ACCENT, color: '#FFFFFF', fontWeight: 700, fontSize: 14, borderRadius: '0 0 8px 0' }}
        onFocus={function(e: any) { e.currentTarget.style.left = '0'; }}
        onBlur={function(e: any) { e.currentTarget.style.left = '-9999px'; }}
      >
        Skip to main content
      </a>

      <style dangerouslySetInnerHTML={{ __html: SHELL_CSS }} />

      {!hideChrome && !hideTopbar && chrome}
      <CommandPalette />
      {!hideChrome && !hideTopbar && <OnboardingTour />}

      {!hideChrome && <TopBanner token={bannerToken} />}

      <main id="sq-main" style={{ flex: 1, minWidth: 0, width: '100%', padding: hideChrome ? 0 : (isMobile ? '28px 16px 56px' : contentPadding) }}>
        <div style={hideChrome ? undefined : { maxWidth: 1440, margin: '0 auto', width: '100%' }}>{children}</div>
      </main>
    </div>
  );
}

var SHELL_CSS = `
  *:focus-visible { outline: 2px solid ${C.ACCENT}; outline-offset: 2px; }
  .sq-scroll-x { overflow-x: auto; scrollbar-width: none; }
  .sq-scroll-x::-webkit-scrollbar { display: none; }
  .sq-area-link { position: relative; display: flex; align-items: center; font-size: 15px; font-weight: 500; color: ${C.GRAY_700}; white-space: nowrap; transition: color .12s; }
  .sq-area-link:hover { color: ${C.INK}; }
  .sq-area-link.is-active { color: ${C.ACCENT}; }
  .sq-area-link.is-active::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: ${C.ACCENT}; }
  .sq-subnav-link { position: relative; display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 500; color: ${C.GRAY_600}; white-space: nowrap; background: transparent; border: none; padding: 0; font-family: ${C.FONT}; transition: color .12s; }
  .sq-subnav-link:hover { color: ${C.INK}; }
  .sq-subnav-link.is-active { color: ${C.INK}; font-weight: 600; }
  .sq-subnav-link.is-active::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: ${C.ACCENT}; }
  .sq-search { display: flex; align-items: center; gap: 10px; height: 38px; padding: 0 12px; width: 300px; max-width: 30vw; border: 1px solid ${C.BORDER}; border-radius: ${C.RADIUS_SM}px; background: #fff; color: ${C.GRAY_500}; font-size: 14px; font-family: ${C.FONT}; }
  .sq-search:hover { border-color: ${C.GRAY_300}; }
  .sq-search kbd { font-family: ${C.FONT}; font-size: 11px; color: ${C.GRAY_500}; border: 1px solid ${C.BORDER}; border-radius: 4px; padding: 1px 5px; background: ${C.GRAY_50}; }
  .sq-menu-item { display: block; width: 100%; text-align: left; padding: 8px 10px; border-radius: 6px; font-size: 14px; color: ${C.INK}; background: transparent; border: none; font-family: ${C.FONT}; }
  .sq-menu-item:hover, .sq-menu-item[aria-current="page"] { background: ${C.GRAY_50}; }
  @media (max-width: 767px) {
    .sq-hide-sm { display: none !important; }
    .sq-search { width: 38px; padding: 0; justify-content: center; }
  }
`;

// Re-export for backward compatibility
export { DASHBOARD_COLORS } from './dashboardColors';

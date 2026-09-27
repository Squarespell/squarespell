'use client';

/**
 * /dashboard/settings - Workspace settings, General tab (2026 redesign, screen 23: "Workspace settings.").
 *
 * Settings sections share the horizontal SettingsTabs (General / Branding / Domains / Team / Billing / Referrals).
 * This page holds the lead-notification toggle and quick links to the other areas, plus a help strip.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { DisplayTitle, PageLoading, SettingsTabs } from '../_components/PageShell';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

const PLAN_LABEL: Record<string, string> = { core: 'Core', pro: 'Pro', business: 'Business', trial: 'Trial', free: 'Free', starter: 'Core', growth: 'Pro', agency: 'Business' };

function Icon({ d, bg }: { d: string; bg: string }) {
  return (
    <span style={{ width: 60, height: 60, borderRadius: 8, background: bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.INK, flexShrink: 0 }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
    </span>
  );
}

const ROWS = [
  { id: 'integrations', title: 'Integrations', desc: 'Manage webhooks and integrations. Zapier and API keys are planned.', href: '/dashboard/integrations', btn: 'Manage', bg: C.PERIWINKLE_SOFT, icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM17 14v6M14 17h6' },
  { id: 'billing', title: 'Subscription & usage', desc: 'View your plan, usage and billing details.', href: '/dashboard/billing', btn: 'Manage', bg: '#F7EFE6', icon: 'M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2zM2 10h20' },
  { id: 'white-label', title: 'White-label branding', desc: 'Customize your branding and remove Squarespell branding.', href: '/dashboard/settings/white-label', btn: 'Manage', bg: C.ACID_SOFT, icon: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z' },
  { id: 'custom-domain', title: 'Custom quiz domain', desc: 'Custom quiz domains are planned. See what is coming.', href: '/dashboard/settings/custom-domain', btn: 'View', bg: C.PERIWINKLE_SOFT, icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20' },
];

export default function SettingsPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/user/plan`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data.email_notifications !== undefined) setEmailNotifs(!!data.email_notifications);
          if (data.email) { const n = String(data.email).split('@')[0]; setName(n.charAt(0).toUpperCase() + n.slice(1)); }
          if (data.plan) setPlan(PLAN_LABEL[String(data.plan).toLowerCase()] || String(data.plan));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token]);

  async function toggleNotifs(val: boolean) {
    setEmailNotifs(val);
    setSaving(true);
    try {
      await fetch(`${API}/api/user/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: val }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  if (authStatus === 'loading') {
    return <DashboardShell title="Settings"><PageLoading /></DashboardShell>;
  }

  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 32, padding: '18px 26px' };

  return (
    <DashboardShell title="Settings">
      <style dangerouslySetInnerHTML={{ __html: `
        .st-row:hover { background: ${C.GRAY_25}; }
        .st-btn { display: inline-flex; align-items: center; gap: 12px; height: 50px; padding: 0 22px; border-radius: 6px; border: 1px solid ${C.BORDER}; background: #fff; color: ${C.INK}; font: 500 16px ${C.FONT}; text-decoration: none; white-space: nowrap; }
        .st-btn:hover { border-color: ${C.GRAY_300}; }
        @media (max-width: 760px) { .st-head { flex-direction: column; } .st-row { flex-wrap: wrap; gap: 16px !important; } .st-help { flex-direction: column; align-items: flex-start !important; } }
      ` }} />

      {/* Header */}
      <div className="st-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 32 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.GRAY_500, marginBottom: 14 }}>Settings</div>
          <DisplayTitle size="xl">Workspace settings.</DisplayTitle>
          <p style={{ margin: '14px 0 0', fontSize: 'clamp(17px, 1.5vw, 21px)', color: C.GRAY_600 }}>Manage your account preferences and workspace settings.</p>
        </div>
        {name && (
          <Link href="/dashboard/billing" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', marginTop: 24, background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, textDecoration: 'none', color: 'inherit' }}>
            <span style={{ width: 52, height: 52, borderRadius: '50%', background: C.INK, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{name.charAt(0)}</span>
            <span>
              <span style={{ display: 'block', fontSize: 17, fontWeight: 600, color: C.INK }}>{name}</span>
              <span style={{ display: 'block', fontSize: 14, color: C.GRAY_500, marginTop: 2 }}>Owner{plan ? ' · ' + plan + ' plan' : ''}</span>
            </span>
          </Link>
        )}
      </div>

      <SettingsTabs />

      {loading ? <PageLoading /> : (
        <>
          <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, overflow: 'hidden' }}>
            <div className="st-row" style={row}>
              <Icon bg={C.PERIWINKLE_SOFT} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div id="st-notif-label" style={{ fontSize: 19, fontWeight: 600, color: C.INK }}>Notifications</div>
                <div style={{ fontSize: 16, color: C.GRAY_600, marginTop: 4 }}>Email me when a new lead arrives.</div>
              </div>
              {saved && <span role="status" style={{ fontSize: 14, color: C.SUCCESS }}>Saved</span>}
              <button type="button" role="switch" aria-checked={emailNotifs} aria-labelledby="st-notif-label" disabled={saving} onClick={() => toggleNotifs(!emailNotifs)}
                style={{ position: 'relative', width: 62, height: 34, borderRadius: 999, border: 'none', background: emailNotifs ? C.ACCENT : C.GRAY_200, cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 4, left: emailNotifs ? 32 : 4, width: 26, height: 26, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
              </button>
            </div>
            {ROWS.map((r) => (
              <div key={r.id} className="st-row" style={{ ...row, borderTop: '1px solid ' + C.BORDER }}>
                <Icon bg={r.bg} d={r.icon} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 600, color: C.INK }}>{r.title}</div>
                  <div style={{ fontSize: 16, color: C.GRAY_600, marginTop: 4 }}>{r.desc}</div>
                </div>
                <Link href={r.href} className="st-btn">
                  {r.btn}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                </Link>
              </div>
            ))}
          </section>

          <section className="st-help" style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 20, marginTop: 16, padding: '18px 26px', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={C.INK} strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01" /></svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: C.INK }}>Need help?</div>
              <div style={{ fontSize: 15, color: C.GRAY_600 }}>Visit our help center or contact our support team.</div>
            </div>
            <a href="https://squarespell.com/help" target="_blank" rel="noopener noreferrer" className="st-btn" style={{ height: 46 }}>Help center ↗</a>
            <a href="mailto:support@squarespell.com" className="st-btn" style={{ height: 46, background: C.ACCENT, color: '#fff', borderColor: C.ACCENT }}>Contact support</a>
          </section>
        </>
      )}
    </DashboardShell>
  );
}

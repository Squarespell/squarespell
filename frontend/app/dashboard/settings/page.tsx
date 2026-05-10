'use client';
import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageLoading } from '../_components/PageShell';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

/* ── Gear illustration (header) ── */
function GearIllustration() {
  return (
    <div style={{ position: 'relative', width: 120, height: 100 }}>
      {/* Platform / base */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: 80, height: 10, borderRadius: '50%',
        background: 'linear-gradient(135deg, #E0F5F6 0%, #B3E6E8 100%)',
        opacity: 0.7,
      }} />
      {/* Gear body */}
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)' }}>
        <circle cx="32" cy="32" r="28" fill={C.BRAND_50} stroke={C.ACCENT} strokeWidth="1.5" />
        <circle cx="32" cy="32" r="18" fill="white" stroke={C.ACCENT} strokeWidth="1.5" />
        <circle cx="32" cy="32" r="8" fill={C.ACCENT} opacity="0.15" />
        {/* Gear teeth */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <rect key={angle} x="30" y="1" width="4" height="8" rx="2" fill={C.ACCENT}
            transform={`rotate(${angle} 32 32)`} />
        ))}
      </svg>
      {/* Sparkles */}
      <svg width="10" height="10" viewBox="0 0 10 10" style={{ position: 'absolute', top: 8, right: 12 }}>
        <path d="M5 0L6 4L10 5L6 6L5 10L4 6L0 5L4 4Z" fill={C.ACCENT} opacity="0.5" />
      </svg>
      <svg width="7" height="7" viewBox="0 0 10 10" style={{ position: 'absolute', top: 28, right: 2 }}>
        <path d="M5 0L6 4L10 5L6 6L5 10L4 6L0 5L4 4Z" fill={C.ACCENT} opacity="0.35" />
      </svg>
      <svg width="6" height="6" viewBox="0 0 10 10" style={{ position: 'absolute', top: 4, left: 14 }}>
        <path d="M5 0L6 4L10 5L6 6L5 10L4 6L0 5L4 4Z" fill={C.ACCENT} opacity="0.3" />
      </svg>
      {/* Floating dots */}
      <div style={{ position: 'absolute', top: 18, left: 6, width: 5, height: 5, borderRadius: '50%', background: C.BRAND_100 }} />
      <div style={{ position: 'absolute', bottom: 22, right: 6, width: 4, height: 4, borderRadius: '50%', background: C.BRAND_300, opacity: 0.4 }} />
    </div>
  );
}

/* ── Icon circles for each settings row ── */
function IconCircle({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 12, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

/* ── Bell icon ── */
function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/* ── Integrations icon ── */
function IntegrationsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="8" height="8" rx="2" />
      <rect x="14" y="2" width="8" height="8" rx="2" />
      <rect x="2" y="14" width="8" height="8" rx="2" />
      <path d="M18 14v4h-4" />
      <path d="M14 18l4-4" />
    </svg>
  );
}

/* ── Billing icon ── */
function BillingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8590C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="3" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

/* ── White-label / pen icon ── */
function WhiteLabelIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#12B76A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/* ── Globe icon ── */
function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

/* ── Headset icon ── */
function HeadsetIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

/* ── External link icon (small) ── */
function ExternalLinkIcon({ color = C.ACCENT }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6, flexShrink: 0 }}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

/* ── Chat bubble icon (small) ── */
function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6, flexShrink: 0 }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/* ── Chevron right (small) ── */
function ChevronRight({ color = C.GRAY_500 }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/* ================================================================ */
export default function SettingsPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/user/plan`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.email_notifications !== undefined) setEmailNotifs(!!data.email_notifications);
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

  /* toggle styles */
  const toggleStyle: React.CSSProperties = {
    width: 44, height: 24, borderRadius: 12, border: 0,
    cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
  };
  const dotStyle = (on: boolean): React.CSSProperties => ({
    position: 'absolute', top: 3, width: 18, height: 18,
    borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.2s',
    left: on ? 23 : 3,
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
  });

  /* row style */
  const rowBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px',
    transition: 'background 0.15s',
  };

  /* settings rows data */
  const settingsRows = [
    {
      id: 'notifications',
      icon: <BellIcon />,
      iconBg: C.BRAND_50,
      title: 'Notifications',
      desc: 'Email notifications for new leads',
      action: 'toggle' as const,
    },
    {
      id: 'integrations',
      icon: <IntegrationsIcon />,
      iconBg: C.BRAND_50,
      title: 'Integrations',
      desc: 'Manage webhooks, Zapier, and API keys.',
      action: 'link' as const,
      href: '/dashboard/integrations',
      btnLabel: 'Manage',
    },
    {
      id: 'billing',
      icon: <BillingIcon />,
      iconBg: '#FFF4ED',
      title: 'Billing',
      desc: 'Subscription and usage',
      action: 'link' as const,
      href: '/dashboard/billing',
      btnLabel: 'Manage',
    },
    {
      id: 'white-label',
      icon: <WhiteLabelIcon />,
      iconBg: '#ECFDF3',
      title: 'White-Label Branding',
      desc: 'Custom branding',
      action: 'link' as const,
      href: '/dashboard/settings/white-label',
      btnLabel: 'Manage',
    },
    {
      id: 'custom-domain',
      icon: <GlobeIcon />,
      iconBg: C.BRAND_50,
      title: 'Custom Domain',
      desc: 'Custom quiz domain',
      action: 'link' as const,
      href: '/dashboard/settings/custom-domain',
      btnLabel: 'Configure',
    },
  ];

  return (
    <DashboardShell title="Settings">
      {/* inject hover CSS */}
      <style>{`
        .sq-settings-row:hover { background: ${C.GRAY_25}; }
        .sq-manage-btn { transition: all 0.15s ease; }
        .sq-manage-btn:hover { background: ${C.GRAY_50} !important; border-color: ${C.GRAY_300} !important; }
        .sq-help-outlined:hover { background: ${C.GRAY_50} !important; border-color: ${C.GRAY_300} !important; }
        .sq-help-filled:hover { background: ${C.ACCENT_HOVER} !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.TEXT, fontFamily: C.FONT }}>
            Settings
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: C.TEXT_MUTED, fontFamily: C.FONT }}>
            Manage your account preferences and workspace settings.
          </p>
        </div>
        <GearIllustration />
      </div>

      {loading ? <PageLoading /> : (
        <>
          {/* ── Main settings card ── */}
          <div style={{
            background: C.SURFACE, borderRadius: 16, border: `1px solid ${C.BORDER}`,
            boxShadow: C.SHADOW_XS, overflow: 'hidden',
          }}>
            {settingsRows.map((row, i) => (
              <div
                key={row.id}
                className="sq-settings-row"
                onMouseEnter={() => setHoverRow(row.id)}
                onMouseLeave={() => setHoverRow(null)}
                style={{
                  ...rowBase,
                  borderBottom: i < settingsRows.length - 1 ? `1px solid ${C.BORDER}` : 'none',
                  background: hoverRow === row.id ? C.GRAY_25 : 'transparent',
                }}
              >
                {/* Icon */}
                <IconCircle bg={row.iconBg}>
                  {row.icon}
                </IconCircle>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, fontFamily: C.FONT, marginBottom: 2 }}>
                    {row.title}
                  </div>
                  <div style={{ fontSize: 13, color: C.TEXT_MUTED, fontFamily: C.FONT }}>
                    {row.desc}
                  </div>
                </div>

                {/* Action */}
                {row.action === 'toggle' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {saved && <span style={{ fontSize: 12, color: C.SUCCESS, fontWeight: 600 }}>Saved</span>}
                    <button
                      onClick={() => toggleNotifs(!emailNotifs)}
                      disabled={saving}
                      style={{ ...toggleStyle, background: emailNotifs ? C.ACCENT : C.GRAY_200 }}
                      aria-label="Toggle email notifications"
                    >
                      <div style={dotStyle(emailNotifs)} />
                    </button>
                  </div>
                ) : (
                  <Link href={row.href!} className="sq-manage-btn" style={{
                    display: 'flex', alignItems: 'center',
                    padding: '8px 16px', background: C.SURFACE, color: C.GRAY_600,
                    border: `1px solid ${C.BORDER}`, borderRadius: 8, fontSize: 13,
                    fontWeight: 600, textDecoration: 'none', fontFamily: C.FONT,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {row.btnLabel}
                    <ChevronRight color={C.GRAY_400} />
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* ── Need help? banner ── */}
          <div style={{
            marginTop: 24, padding: '20px 24px', borderRadius: 16,
            border: `1px solid ${C.BORDER}`, background: C.SURFACE,
            boxShadow: C.SHADOW_XS,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <IconCircle bg={C.BRAND_50}>
                <HeadsetIcon />
              </IconCircle>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.TEXT, fontFamily: C.FONT }}>
                  Need help?
                </div>
                <div style={{ fontSize: 13, color: C.TEXT_MUTED, fontFamily: C.FONT, marginTop: 2 }}>
                  We're here to help you get the most out of Squarespell Quiz.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <a href="https://squarespell.com/help" target="_blank" rel="noopener noreferrer" className="sq-help-outlined" style={{
                display: 'flex', alignItems: 'center',
                padding: '9px 16px', borderRadius: 8,
                border: `1px solid ${C.BORDER}`, background: C.SURFACE,
                color: C.TEXT_SECONDARY, fontSize: 13, fontWeight: 600,
                textDecoration: 'none', fontFamily: C.FONT,
                whiteSpace: 'nowrap',
              }}>
                Visit help center
                <ExternalLinkIcon color={C.GRAY_400} />
              </a>
              <a href="mailto:support@squarespell.com" className="sq-help-filled" style={{
                display: 'flex', alignItems: 'center',
                padding: '9px 16px', borderRadius: 8, border: 'none',
                background: C.ACCENT, color: '#FFFFFF',
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                fontFamily: C.FONT, whiteSpace: 'nowrap',
              }}>
                Contact support
                <ChatIcon />
              </a>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

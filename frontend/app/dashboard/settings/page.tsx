'use client';
import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageHeader, Card, PageLoading } from '../_components/PageShell';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

export default function SettingsPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const toggleStyle: React.CSSProperties = {
    width: 44, height: 24, borderRadius: 12, border: 0,
    cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
  };

  const dotStyle = (on: boolean): React.CSSProperties => ({
    position: 'absolute', top: 3, width: 18, height: 18,
    borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.2s',
    left: on ? 23 : 3,
  });

  return (
    <DashboardShell title="Settings">
      <PageHeader title="Settings" subtitle="Manage your account preferences" />

      {loading ? <PageLoading /> : (
        <div style={{ display: 'grid', gap: 20 }}>
          <Card>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>Notifications</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 4 }}>
                  Email notifications for new leads
                </div>
                <div style={{ fontSize: 12.5, color: C.TEXT_MUTED }}>
                  Get an email each time someone completes one of your quizzes.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {saved && <span style={{ fontSize: 12, color: C.SUCCESS, fontWeight: 600 }}>Saved</span>}
                <button
                  onClick={() => toggleNotifs(!emailNotifs)}
                  disabled={saving}
                  style={{ ...toggleStyle, background: emailNotifs ? C.ACCENT : 'rgba(255,255,255,0.15)' }}
                >
                  <div style={dotStyle(emailNotifs)} />
                </button>
              </div>
            </div>
          </Card>

          <Card>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>Integrations</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 4 }}>Connected services</div>
                <div style={{ fontSize: 12.5, color: C.TEXT_MUTED }}>Manage webhooks, Zapier, and API keys.</div>
              </div>
              <Link href="/dashboard/integrations" style={{
                padding: '10px 18px', background: C.SURFACE, color: C.TEXT,
                border: `1px solid ${C.BORDER}`, borderRadius: 100, fontSize: 13,
                fontWeight: 600, textDecoration: 'none',
              }}>
                Manage
              </Link>
            </div>
          </Card>

          <Card>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>Billing</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 4 }}>Subscription and usage</div>
                <div style={{ fontSize: 12.5, color: C.TEXT_MUTED }}>View your plan, usage limits, and payment details.</div>
              </div>
              <Link href="/dashboard/billing" style={{
                padding: '10px 18px', background: C.SURFACE, color: C.TEXT,
                border: `1px solid ${C.BORDER}`, borderRadius: 100, fontSize: 13,
                fontWeight: 600, textDecoration: 'none',
              }}>
                Manage
              </Link>
            </div>
          </Card>

          <Card>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>White-Label Branding</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 4 }}>Custom branding</div>
                <div style={{ fontSize: 12.5, color: C.TEXT_MUTED }}>Customize quiz appearance with your brand (Agency plan).</div>
              </div>
              <Link href="/dashboard/settings/white-label" style={{
                padding: '10px 18px', background: C.SURFACE, color: C.TEXT,
                border: `1px solid ${C.BORDER}`, borderRadius: 100, fontSize: 13,
                fontWeight: 600, textDecoration: 'none',
              }}>
                Manage
              </Link>
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}

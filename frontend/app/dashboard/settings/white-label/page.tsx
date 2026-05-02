'use client';

/**
 * /dashboard/settings/white-label - White-label branding settings for Agency tier.
 *
 * Agency plan users can customize:
 * - Brand name (shown in footer)
 * - Logo URL
 * - Primary brand color (hex)
 * - Toggle to hide "Powered by Squarespell" footer
 *
 * Non-Agency users see an upgrade prompt.
 */

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../../_components/DashboardShell';
import { useDashboardAuth } from '../../_components/useDashboardAuth';
import { PageHeader, Card, PrimaryButton, GhostButton, PageLoading } from '../../_components/PageShell';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

interface WhiteLabelSettings {
  white_label_enabled: boolean;
  custom_brand_name: string | null;
  custom_brand_logo_url: string | null;
  custom_brand_color: string | null;
  hide_powered_by: boolean;
}

interface UserPlan {
  plan: string;
}

export default function WhiteLabelSettingsPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [settings, setSettings] = useState<WhiteLabelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  var brandName = settings?.custom_brand_name || 'Your Brand';
  var logoUrl = settings?.custom_brand_logo_url || '';
  var brandColor = settings?.custom_brand_color || '#0D7377';
  var hidePoweredBy = settings?.hide_powered_by || false;

  useEffect(() => {
    if (!token) return;
    (async function() {
      try {
        var planRes = await fetch(API + '/api/user/plan', {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (!planRes.ok) throw new Error('Failed to load plan');
        var planData = await planRes.json();
        setPlan(planData);

        var settingsRes = await fetch(API + '/api/white-label', {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (settingsRes.ok) {
          var settingsData = await settingsRes.json();
          setSettings(settingsData);
        } else {
          setSettings({
            white_label_enabled: false,
            custom_brand_name: null,
            custom_brand_logo_url: null,
            custom_brand_color: null,
            hide_powered_by: false,
          });
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function handleSave() {
    if (!settings || !token) return;
    setSaving(true);
    setError('');
    try {
      var res = await fetch(API + '/api/white-label', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          white_label_enabled: settings.white_label_enabled,
          custom_brand_name: settings.custom_brand_name,
          custom_brand_logo_url: settings.custom_brand_logo_url,
          custom_brand_color: settings.custom_brand_color,
          hide_powered_by: settings.hide_powered_by,
        }),
      });
      if (!res.ok) {
        var body = await res.json().catch(function() { return {}; });
        throw new Error(body.error || 'Failed to save settings');
      }
      setSaved(true);
      setTimeout(function() { setSaved(false); }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (authStatus === 'loading' || loading) {
    return <DashboardShell title="White-Label Settings"><PageLoading /></DashboardShell>;
  }

  if (authStatus === 'unauthed') {
    return <DashboardShell title="White-Label Settings"><PageLoading /></DashboardShell>;
  }

  if (!plan || !['agency', 'business'].includes(plan.plan)) {
    return (
      <DashboardShell title="White-Label Settings">
        <PageHeader title="White-Label Branding" subtitle="Customize the look and feel of public quiz pages" />
        <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 700, color: C.TEXT }}>
            Business Plan Required
          </h2>
          <p style={{ margin: '0 0 20px 0', fontSize: 14, color: C.TEXT_MUTED, maxWidth: 400 }}>
            White-label branding is available for Business tier users. Upgrade your account to customize the appearance of your quizzes.
          </p>
          <Link
            href="/pricing"
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              background: C.ACCENT,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            View Pricing
          </Link>
        </Card>
      </DashboardShell>
    );
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px',
    background: C.SURFACE,
    border: `1px solid ${C.BORDER}`,
    borderRadius: 10,
    fontSize: 13.5,
    color: C.TEXT,
    fontFamily: '"DM Sans",system-ui,sans-serif',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: C.TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
    display: 'block',
  };

  const toggleStyle: React.CSSProperties = {
    width: 44,
    height: 24,
    borderRadius: 12,
    border: 0,
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.2s',
  };

  const dotStyle = (on: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: 3,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#FFFFFF',
    transition: 'left 0.2s',
    left: on ? 23 : 3,
  });

  return (
    <DashboardShell title="White-Label Settings">
      <PageHeader title="White-Label Branding" subtitle="Customize the look and feel of public quiz pages" />

      <div style={{ display: 'grid', gap: 20, maxWidth: 800 }}>
        <Card>
          <h2 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
            Branding Settings
          </h2>

          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={labelStyle}>Brand Name</label>
              <input
                type="text"
                value={settings.custom_brand_name || ''}
                onChange={function(e) {
                  setSettings({ ...settings, custom_brand_name: e.target.value || null });
                }}
                placeholder="Your Company Name"
                style={inputStyle}
              />
              <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginTop: 6 }}>
                Shown in the quiz footer when white-label is enabled
              </div>
            </div>

            <div>
              <label style={labelStyle}>Logo URL</label>
              <input
                type="text"
                value={settings.custom_brand_logo_url || ''}
                onChange={function(e) {
                  setSettings({ ...settings, custom_brand_logo_url: e.target.value || null });
                }}
                placeholder="https://example.com/logo.png"
                style={inputStyle}
              />
              <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginTop: 6 }}>
                Direct link to your logo image (PNG, JPG, or SVG)
              </div>
            </div>

            <div>
              <label style={labelStyle}>Brand Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: settings.custom_brand_color || '#0D7377',
                    border: `1px solid ${C.BORDER}`,
                    flexShrink: 0,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <input
                    type="color"
                    value={settings.custom_brand_color || '#0D7377'}
                    onChange={function(e) {
                      setSettings({ ...settings, custom_brand_color: e.target.value });
                    }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer',
                      width: '100%',
                      height: '100%',
                    }}
                  />
                </label>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={settings.custom_brand_color || ''}
                    onChange={function(e) {
                      setSettings({ ...settings, custom_brand_color: e.target.value || null });
                    }}
                    placeholder="#0D7377"
                    style={{
                      ...inputStyle,
                      fontFamily: 'ui-monospace,monospace',
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginTop: 6 }}>
                Hex color code for buttons and accents
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
            Footer Options
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 4 }}>
                Hide "Powered by Squarespell"
              </div>
              <div style={{ fontSize: 12.5, color: C.TEXT_MUTED }}>
                Remove the Squarespell branding from quiz footer
              </div>
            </div>
            <button
              onClick={function() {
                setSettings({ ...settings, hide_powered_by: !settings.hide_powered_by });
              }}
              style={{
                ...toggleStyle,
                background: settings.hide_powered_by ? C.ACCENT : 'rgba(255,255,255,0.15)',
              }}
            >
              <div style={dotStyle(settings.hide_powered_by)} />
            </button>
          </div>
        </Card>

        <Card style={{ background: C.SURFACE, border: `1px solid ${C.BORDER}` }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
            Preview
          </h2>
          <div
            style={{
              padding: '16px',
              background: settings.custom_brand_color || '#0D7377',
              borderRadius: 8,
              color: '#FFFFFF',
              textAlign: 'center',
              minHeight: 80,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {settings.custom_brand_logo_url && (
              <img
                src={settings.custom_brand_logo_url}
                alt="Logo preview"
                style={{ height: 32, maxWidth: 120, objectFit: 'contain' }}
              />
            )}
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {settings.custom_brand_name || 'Your Brand Name'}
            </div>
            {!settings.hide_powered_by && (
              <div style={{ fontSize: 11, opacity: 0.8 }}>
                Powered by Squarespell
              </div>
            )}
          </div>
        </Card>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px',
              background: C.ACCENT,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>Saved</span>}
          {error && <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>{error}</span>}
        </div>
      </div>
    </DashboardShell>
  );
}

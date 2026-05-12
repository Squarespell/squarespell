'use client';

/**
 * /dashboard/settings/custom-domain - Custom domain settings for Business tier.
 *
 * Business plan users can:
 * - Set a custom domain (e.g., quiz.yourbrand.com)
 * - See DNS instructions (CNAME to quiz.squarespell.com)
 * - Check domain verification status
 *
 * Non-Business users see an upgrade prompt.
 */

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../../_components/DashboardShell';
import { useDashboardAuth } from '../../_components/useDashboardAuth';
import { PageHeader, Card, PageLoading } from '../../_components/PageShell';
import Link from 'next/link';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

interface DomainSettings {
  custom_domain: string | null;
  domain_verified: boolean;
}

export default function CustomDomainPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var [plan, setPlan] = useState<string>('free');
  var [settings, setSettings] = useState<DomainSettings>({ custom_domain: null, domain_verified: false });
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState(false);
  var [saved, setSaved] = useState(false);
  var [error, setError] = useState('');
  var [domainInput, setDomainInput] = useState('');
  var [verifying, setVerifying] = useState(false);

  useEffect(function() {
    if (!token) return;
    (function() {
      fetch(API + '/api/user/plan', { headers: { Authorization: 'Bearer ' + token } })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          setPlan(data.plan || 'free');
          if (data.custom_domain) {
            setSettings({ custom_domain: data.custom_domain, domain_verified: data.domain_verified || false });
            setDomainInput(data.custom_domain);
          }
        })
        .catch(function() {})
        .finally(function() { setLoading(false); });
    })();
  }, [token]);

  function handleSave() {
    if (!token) return;
    setSaving(true);
    setError('');
    fetch(API + '/api/user/custom-domain', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ custom_domain: domainInput.trim() || null }),
    })
      .then(function(res) {
        if (!res.ok) return res.json().then(function(b) { throw new Error(b.error || 'Failed to save'); });
        return res.json();
      })
      .then(function(data) {
        setSettings({ custom_domain: data.custom_domain, domain_verified: data.domain_verified || false });
        setSaved(true);
        setTimeout(function() { setSaved(false); }, 2000);
      })
      .catch(function(err) { setError(err.message || 'Failed to save'); })
      .finally(function() { setSaving(false); });
  }

  function handleVerify() {
    if (!token) return;
    setVerifying(true);
    fetch(API + '/api/user/custom-domain/verify', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.verified) {
          setSettings(function(prev) { return Object.assign({}, prev, { domain_verified: true }); });
        } else {
          setError('Domain verification failed. Make sure your CNAME record is set up correctly.');
        }
      })
      .catch(function() { setError('Verification check failed'); })
      .finally(function() { setVerifying(false); });
  }

  if (authStatus === 'loading' || loading) {
    return <DashboardShell title="Custom Domain"><PageLoading /></DashboardShell>;
  }

  if (!['agency', 'business'].includes(plan)) {
    return (
      <DashboardShell title="Custom Domain">
        <PageHeader title="Custom Domain" subtitle="Serve quizzes from your own domain" />
        <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 700, color: C.TEXT }}>
            Business Plan Required
          </h2>
          <p style={{ margin: '0 0 20px 0', fontSize: 14, color: C.TEXT_MUTED, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
            Custom domains are available for Business tier users. Upgrade your account to serve quizzes from your own domain.
          </p>
          <Link href="/pricing" style={{
            display: 'inline-block', padding: '10px 24px', background: C.ACCENT,
            color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 14,
            fontWeight: 600, textDecoration: 'none', cursor: 'pointer',
          }}>
            View Pricing
          </Link>
        </Card>
      </DashboardShell>
    );
  }

  var inputStyle = {
    padding: '10px 14px', background: C.SURFACE, border: '1px solid ' + C.BORDER,
    borderRadius: 10, fontSize: 13.5, color: C.TEXT, fontFamily: '"Poppins",system-ui,sans-serif',
    outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  };

  return (
    <DashboardShell title="Custom Domain">
      <PageHeader title="Custom Domain" subtitle="Serve quizzes from your own domain" />

      <div style={{ display: 'grid', gap: 20, maxWidth: 800 }}>
        <Card>
          <h2 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
            Domain Configuration
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
              Custom Domain
            </label>
            <input
              type="text"
              value={domainInput}
              onChange={function(e) { setDomainInput(e.target.value); }}
              placeholder="quiz.yourbrand.com"
              style={inputStyle}
            />
            <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginTop: 6 }}>
              Enter the subdomain you want to use for your quizzes.
            </div>
          </div>

          {settings.custom_domain && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
              background: settings.domain_verified ? '#F0FDF4' : '#FEF3C7',
              border: '1px solid ' + (settings.domain_verified ? '#BBF7D0' : '#FDE68A'),
              borderRadius: 10, marginBottom: 16,
            }}>
              <span style={{ fontSize: 14 }}>{settings.domain_verified ? '✓' : '⏳'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: settings.domain_verified ? '#16A34A' : '#B45309' }}>
                {settings.domain_verified ? 'Domain verified and active' : 'Pending verification'}
              </span>
              {!settings.domain_verified && (
                <button type="button" onClick={handleVerify} disabled={verifying}
                  style={{
                    marginLeft: 'auto', padding: '5px 14px', borderRadius: 6,
                    border: '1px solid #D97706', background: '#FFFBEB', color: '#B45309',
                    fontSize: 12, fontWeight: 600, cursor: verifying ? 'wait' : 'pointer',
                  }}>
                  {verifying ? 'Checking...' : 'Verify now'}
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" onClick={handleSave} disabled={saving}
              style={{
                padding: '10px 24px', background: C.ACCENT, color: '#FFFFFF',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              }}>
              {saving ? 'Saving...' : 'Save Domain'}
            </button>
            {saved && <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>Saved</span>}
            {error && <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>{error}</span>}
          </div>
        </Card>

        <Card>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
            DNS Setup Instructions
          </h2>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: C.TEXT }}>
            <p style={{ margin: '0 0 12px 0' }}>To connect your custom domain, add a CNAME record in your DNS provider:</p>
            <div style={{
              background: '#1D2939', borderRadius: 8, padding: 16, fontFamily: 'monospace',
              fontSize: 13, color: '#E5E7EB', lineHeight: 1.5, marginBottom: 16,
            }}>
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: '#9CA3AF' }}>Type:</span> <span style={{ color: '#67E8F9' }}>CNAME</span>
              </div>
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: '#9CA3AF' }}>Name:</span> <span style={{ color: '#67E8F9' }}>{domainInput ? domainInput.split('.')[0] : 'quiz'}</span>
              </div>
              <div>
                <span style={{ color: '#9CA3AF' }}>Value:</span> <span style={{ color: '#67E8F9' }}>quiz.squarespell.com</span>
              </div>
            </div>
            <p style={{ margin: '0 0 8px 0', fontSize: 13, color: C.TEXT_MUTED }}>
              DNS changes can take up to 48 hours to propagate. Once configured, click "Verify now" above to confirm.
            </p>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}

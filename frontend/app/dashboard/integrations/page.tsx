'use client';

/**
 * /dashboard/integrations - Where users connect lead delivery destinations.
 *
 * Backed by /api/integrations (GET/POST/PATCH/DELETE). Today we ship a
 * fully-working webhook integration (the only one with a /test endpoint in
 * the backend) plus "Coming soon" cards for the marketing tools customers
 * keep asking about, so the surface area feels complete from day one.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import {
  PageHeader,
  Card,
  PrimaryButton,
  GhostButton,
  Pill,
  PageLoading,
} from '../_components/PageShell';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type Integration = {
  id: string;
  type: 'webhook' | 'zapier' | 'mailchimp' | 'klaviyo' | 'convertkit' | 'google_sheets';
  config: Record<string, any>;
  active: boolean;
  created_at: string;
};

type Catalog = {
  type: Integration['type'];
  name: string;
  tagline: string;
  available: boolean;
};

const CATALOG: Catalog[] = [
  { type: 'webhook', name: 'Custom webhook', tagline: 'POST every lead to your own URL.', available: true },
  { type: 'zapier', name: 'Zapier', tagline: 'Trigger any of 5,000+ Zapier apps.', available: true },
  { type: 'mailchimp', name: 'Mailchimp', tagline: 'Push leads straight into a Mailchimp audience.', available: false },
  { type: 'klaviyo', name: 'Klaviyo', tagline: 'Sync leads + outcome tags into Klaviyo.', available: false },
  { type: 'convertkit', name: 'ConvertKit', tagline: 'Subscribe leads to a ConvertKit form or tag.', available: false },
  { type: 'google_sheets', name: 'Google Sheets', tagline: 'Append every lead to a Google Sheet row.', available: false },
];

function labelFor(type: Integration['type']): string {
  return CATALOG.find((c) => c.type === type)?.name ?? type;
}

function WebhookForm({
  onCreated,
  token,
}: {
  onCreated: (i: Integration) => void;
  token: string;
}) {
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!url) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/integrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: 'webhook', config: { url } }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to save webhook');
      }
      const data = await res.json();
      onCreated(data);
      setUrl('');
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: C.TEXT_MUTED,
          marginBottom: 8,
        }}
      >
        Webhook URL
      </label>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://your-server.com/hooks/squarespell"
        style={{
          width: '100%',
          padding: '12px 16px',
          background: C.SURFACE,
          border: `1px solid ${C.BORDER}`,
          borderRadius: 10,
          fontSize: 13.5,
          color: C.TEXT,
          fontFamily: '"DM Sans",system-ui,sans-serif',
          outline: 'none',
          marginBottom: 12,
        }}
      />
      {error && (
        <div style={{ color: '#ff6b6b', fontSize: 12.5, marginBottom: 12 }}>{error}</div>
      )}
      <PrimaryButton onClick={submit} disabled={saving || !url}>
        {saving ? 'Saving…' : 'Add webhook'}
      </PrimaryButton>
    </div>
  );
}

function IntegrationRow({
  integration,
  token,
  onChange,
  onDelete,
}: {
  integration: Integration;
  token: string;
  onChange: (i: Integration) => void;
  onDelete: (id: string) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function toggle() {
    const res = await fetch(`${API}/api/integrations/${integration.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ active: !integration.active }),
    });
    if (res.ok) onChange(await res.json());
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API}/api/integrations/test/${integration.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setTestResult('Delivered ✓');
      else setTestResult(`Failed: ${data.error || data.status}`);
    } catch (e: any) {
      setTestResult(`Failed: ${e.message}`);
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  }

  async function remove() {
    if (!confirm('Remove this integration?')) return;
    const res = await fetch(`${API}/api/integrations/${integration.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) onDelete(integration.id);
  }

  return (
    <div
      style={{
        padding: '16px 18px',
        border: `1px solid ${C.BORDER}`,
        borderRadius: 12,
        background: C.SURFACE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 260px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.TEXT }}>
            {labelFor(integration.type)}
          </span>
          <Pill variant={integration.active ? 'live' : 'draft'}>
            {integration.active ? 'Active' : 'Paused'}
          </Pill>
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: C.TEXT_MUTED,
            fontFamily: 'ui-monospace,monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {integration.config?.url || JSON.stringify(integration.config)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {testResult && (
          <span
            style={{
              fontSize: 12.5,
              color: testResult.startsWith('Delivered') ? '#4cd964' : '#ff6b6b',
              fontWeight: 600,
            }}
          >
            {testResult}
          </span>
        )}
        {integration.type === 'webhook' && (
          <GhostButton onClick={runTest}>{testing ? 'Testing…' : 'Send test'}</GhostButton>
        )}
        <GhostButton onClick={toggle}>{integration.active ? 'Pause' : 'Resume'}</GhostButton>
        <GhostButton onClick={remove}>Remove</GhostButton>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWebhookForm, setShowWebhookForm] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`${API}/api/integrations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load integrations');
        const data = await res.json();
        if (!cancelled) setIntegrations(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (authStatus === 'loading') {
    return (
      <DashboardShell title="Integrations">
        <PageLoading />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Integrations">
      <PageHeader
        title="Integrations"
        subtitle="Deliver captured leads wherever your team already works"
      />

      {loading ? (
        <PageLoading />
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.TEXT }}>
                Connected ({integrations.length})
              </h2>
              {!showWebhookForm && (
                <PrimaryButton onClick={() => setShowWebhookForm(true)}>+ Add webhook</PrimaryButton>
              )}
            </div>

            {showWebhookForm && (
              <div
                style={{
                  padding: 18,
                  border: `1px solid ${C.BORDER}`,
                  borderRadius: 12,
                  background: C.SURFACE,
                  marginBottom: integrations.length > 0 ? 14 : 0,
                }}
              >
                <WebhookForm
                  token={token || ''}
                  onCreated={(i) => {
                    setIntegrations((prev) => [i, ...prev]);
                    setShowWebhookForm(false);
                  }}
                />
                <div style={{ marginTop: 10 }}>
                  <GhostButton onClick={() => setShowWebhookForm(false)}>Cancel</GhostButton>
                </div>
              </div>
            )}

            {integrations.length === 0 && !showWebhookForm ? (
              <div
                style={{
                  padding: '28px 20px',
                  textAlign: 'center',
                  color: C.TEXT_MUTED,
                  fontSize: 13.5,
                }}
              >
                No integrations connected yet. Add a webhook to start delivering leads.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {integrations.map((i) => (
                  <IntegrationRow
                    key={i.id}
                    integration={i}
                    token={token || ''}
                    onChange={(updated) =>
                      setIntegrations((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                    }
                    onDelete={(id) => setIntegrations((prev) => prev.filter((p) => p.id !== id))}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
              Available integrations
            </h2>
            <p style={{ margin: '0 0 18px 0', fontSize: 13, color: C.TEXT_MUTED }}>
              Pick where you want new leads to land.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {CATALOG.map((c) => (
                <div
                  key={c.type}
                  onClick={() => {
                    if (c.type === 'webhook' && c.available) setShowWebhookForm(true);
                    if (c.type === 'zapier' && c.available) router.push('/dashboard/integrations/api-keys');
                  }}
                  style={{
                    padding: 16,
                    border: `1px solid ${C.BORDER}`,
                    borderRadius: 12,
                    background: c.available ? C.SURFACE : 'rgba(255,255,255,0.02)',
                    opacity: c.available ? 1 : 0.7,
                    cursor: c.available ? 'pointer' : 'default',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => { if (c.available) e.currentTarget.style.borderColor = C.TEXT_MUTED; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.BORDER; }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: C.TEXT }}>{c.name}</span>
                    {!c.available ? <Pill>Soon</Pill> : c.type !== 'webhook' ? <Pill variant='live'>Set up</Pill> : null}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.TEXT_MUTED, lineHeight: 1.5 }}>
                    {c.tagline}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}

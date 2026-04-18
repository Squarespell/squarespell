'use client';
import { useEffect, useState, useCallback } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../../_components/DashboardShell';
import { useDashboardAuth } from '../../_components/useDashboardAuth';
import { PageHeader, Card, PrimaryButton, GhostButton, PageLoading } from '../../_components/PageShell';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type ApiKey = {
  id: string; name: string; key_prefix: string;
  created_at: string; last_used_at: string | null;
  revoked_at: string | null; api_key?: string;
};

export default function ApiKeysPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/api-keys`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setKeys(Array.isArray(data) ? data : []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  async function createKey() {
    if (!token) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name || 'Untitled Key' }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.api_key); setName(''); setShowCreate(false); fetchKeys();
      }
    } catch (e) { console.error(e); } finally { setCreating(false); }
  }

  async function revokeKey(id: string) {
    if (!token || !confirm('Revoke this API key? Any integrations using it will stop working.')) return;
    try {
      const res = await fetch(`${API}/api/api-keys/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchKeys();
    } catch (e) { console.error(e); }
  }

  function copyKey(text: string) {
    navigator.clipboard.writeText(text); setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeKeys = keys.filter(k => !k.revoked_at);
  const revokedKeys = keys.filter(k => k.revoked_at);

  if (authStatus === 'loading') {
    return <DashboardShell title="API Keys"><PageLoading /></DashboardShell>;
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', background: C.SURFACE,
    border: `1px solid ${C.BORDER}`, borderRadius: 10, fontSize: 13.5,
    color: C.TEXT, fontFamily: '"DM Sans",system-ui,sans-serif', outline: 'none',
  };

  return (
    <DashboardShell title="API Keys">
      <div style={{ marginBottom: 24 }}>
        <Link href="/dashboard/integrations" style={{ color: C.TEXT_MUTED, fontSize: 13, textDecoration: 'none' }}>
          &larr; Back to Integrations
        </Link>
      </div>
      <PageHeader title="API Keys" subtitle="Manage API keys for Zapier and other third-party integrations" />

      {newKey && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: '#4ade80', fontSize: 14, fontWeight: 700 }}>Your new API key</div>
            <div style={{ fontSize: 12.5, color: C.TEXT_MUTED }}>Copy this key now. You will not be able to see it again.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '12px 16px', border: `1px solid ${C.BORDER}` }}>
              <code style={{ flex: 1, fontSize: 13, color: C.TEXT, fontFamily: 'ui-monospace,monospace', wordBreak: 'break-all' }}>{newKey}</code>
              <GhostButton onClick={() => copyKey(newKey)}>{copied ? 'Copied!' : 'Copy'}</GhostButton>
            </div>
            <div><GhostButton onClick={() => setNewKey(null)}>Dismiss</GhostButton></div>
          </div>
        </Card>
      )}

      {loading ? <PageLoading /> : (
        <div style={{ display: 'grid', gap: 20 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.TEXT }}>Active keys ({activeKeys.length})</h2>
              {!showCreate && <PrimaryButton onClick={() => setShowCreate(true)}>+ Create key</PrimaryButton>}
            </div>

            {showCreate && (
              <div style={{ padding: 18, border: `1px solid ${C.BORDER}`, borderRadius: 12, background: C.SURFACE, marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.TEXT_MUTED, marginBottom: 8 }}>Key name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zapier production" style={{ ...inputStyle, marginBottom: 12 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <PrimaryButton onClick={createKey} disabled={creating}>{creating ? 'Creating...' : 'Generate key'}</PrimaryButton>
                  <GhostButton onClick={() => { setShowCreate(false); setName(''); }}>Cancel</GhostButton>
                </div>
              </div>
            )}

            {activeKeys.length === 0 && !showCreate ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: C.TEXT_MUTED, fontSize: 13.5 }}>
                No API keys yet. Create one to connect Zapier or other tools.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {activeKeys.map((k) => (
                  <div key={k.id} style={{ padding: '14px 18px', border: `1px solid ${C.BORDER}`, borderRadius: 12, background: C.SURFACE, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, marginBottom: 3 }}>{k.name}</div>
                      <div style={{ fontSize: 12, color: C.TEXT_MUTED, fontFamily: 'ui-monospace,monospace' }}>
                        {k.key_prefix}........
                        <span style={{ marginLeft: 12, fontFamily: '"DM Sans",system-ui,sans-serif' }}>
                          Created {new Date(k.created_at).toLocaleDateString()}
                          {k.last_used_at && ` | Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>
                    <GhostButton onClick={() => revokeKey(k.id)}>Revoke</GhostButton>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {revokedKeys.length > 0 && (
            <Card>
              <h2 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: C.TEXT_MUTED }}>Revoked keys</h2>
              <div style={{ display: 'grid', gap: 8 }}>
                {revokedKeys.map((k) => (
                  <div key={k.id} style={{ padding: '12px 18px', border: `1px solid ${C.BORDER}`, borderRadius: 12, opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.TEXT_MUTED }}>{k.name}</div>
                      <div style={{ fontSize: 11.5, color: C.TEXT_MUTED, fontFamily: 'ui-monospace,monospace' }}>
                        {k.key_prefix}.... | Revoked {new Date(k.revoked_at!).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h2 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600, color: C.TEXT }}>Using API keys</h2>
            <div style={{ fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 8px 0' }}>
                API keys authenticate requests from Zapier and other third-party tools.
                Include the key in the <code style={{ background: C.SURFACE, padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>X-API-Key</code> header.
              </p>
              <p style={{ margin: 0 }}>
                Each key is hashed on our end. We only store a prefix for identification.
                If you lose a key, revoke it and create a new one.
              </p>
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}

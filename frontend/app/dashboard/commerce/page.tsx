'use client';

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageHeader, Card, EmptyState, PrimaryButton, PageLoading } from '../_components/PageShell';

type Connection = {
  id: string;
  site_id: string;
  site_url: string;
  site_title: string;
  sync_status: string;
  last_synced_at: string | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  url: string;
  image_url: string;
  price_cents: number;
  currency: string;
  is_available: boolean;
};

export default function CommercePage() {
  var { token, status } = useDashboardAuth();
  var [connections, setConnections] = useState<Connection[]>([]);
  var [products, setProducts] = useState<Product[]>([]);
  var [loading, setLoading] = useState(true);
  var [tab, setTab] = useState<'connections' | 'products'>('connections');
  var [connectForm, setConnectForm] = useState({ site_id: '', api_key: '' });
  var [connecting, setConnecting] = useState(false);
  var [connectError, setConnectError] = useState('');

  var apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

  useEffect(function() {
    if (!token) return;
    var cancelled = false;
    (async function() {
      try {
        var headers = { Authorization: 'Bearer ' + token };
        var [connRes, prodRes] = await Promise.all([
          fetch(apiBase + '/api/commerce/connections', { headers: headers }),
          fetch(apiBase + '/api/commerce/products', { headers: headers }),
        ]);
        if (!cancelled) {
          if (connRes.ok) { var cd = await connRes.json(); setConnections(cd.connections || cd || []); }
          if (prodRes.ok) { var pd = await prodRes.json(); setProducts(pd.products || pd || []); }
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return function() { cancelled = true; };
  }, [token]);

  async function connectSite() {
    if (!connectForm.site_id || !connectForm.api_key || !token) return;
    setConnecting(true);
    setConnectError('');
    try {
      var res = await fetch(apiBase + '/api/commerce/connect', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: connectForm.site_id, api_key: connectForm.api_key }),
      });
      var data = await res.json();
      if (res.ok) {
        setConnections(function(prev) { return [data.connection || data, ...prev]; });
        setConnectForm({ site_id: '', api_key: '' });
      } else {
        setConnectError(data.error || 'Connection failed');
      }
    } catch {
      setConnectError('Network error');
    }
    setConnecting(false);
  }

  async function syncConnection(id: string) {
    if (!token) return;
    await fetch(apiBase + '/api/commerce/connections/' + id + '/sync', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    });
    // Refresh products
    var res = await fetch(apiBase + '/api/commerce/products', { headers: { Authorization: 'Bearer ' + token } });
    if (res.ok) { var pd = await res.json(); setProducts(pd.products || pd || []); }
  }

  if (status === 'loading') return <DashboardShell title="Commerce"><PageLoading /></DashboardShell>;

  var tabStyle = function(active: boolean): React.CSSProperties {
    return {
      padding: '8px 16px', fontSize: 14, fontWeight: active ? 600 : 500,
      color: active ? C.ACCENT : C.GRAY_500, background: active ? C.ACCENT_LIGHT : 'transparent',
      border: '1px solid ' + (active ? C.ACCENT : C.GRAY_200), borderRadius: 8,
      cursor: 'pointer', fontFamily: C.FONT, transition: 'all 0.15s',
    };
  };

  var inputStyle: React.CSSProperties = {
    padding: '8px 12px', border: '1px solid ' + C.GRAY_300, borderRadius: 8,
    fontSize: 14, fontFamily: C.FONT, color: C.GRAY_900, outline: 'none', flex: 1,
  };

  function formatPrice(cents: number, currency: string) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(cents / 100);
  }

  return (
    <DashboardShell title="Commerce">
      <PageHeader
        title="Commerce"
        subtitle="Connect your Squarespace store and map products to quiz outcomes"
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button type="button" style={tabStyle(tab === 'connections')} onClick={function() { setTab('connections'); }}>Connections</button>
        <button type="button" style={tabStyle(tab === 'products')} onClick={function() { setTab('products'); }}>Products ({products.length})</button>
      </div>

      {loading ? <PageLoading /> : tab === 'connections' ? (
        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 16 }}>
            Connect Squarespace Store
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <input
              type="text" placeholder="Site ID" value={connectForm.site_id}
              onChange={function(e) { setConnectForm(function(f) { return Object.assign({}, f, { site_id: e.target.value }); }); }}
              style={inputStyle}
            />
            <input
              type="password" placeholder="API Key" value={connectForm.api_key}
              onChange={function(e) { setConnectForm(function(f) { return Object.assign({}, f, { api_key: e.target.value }); }); }}
              style={inputStyle}
            />
            <PrimaryButton onClick={connectSite} disabled={connecting}>
              {connecting ? 'Connecting...' : 'Connect'}
            </PrimaryButton>
          </div>
          {connectError && <div style={{ color: C.DANGER, fontSize: 13, marginBottom: 12, fontFamily: C.FONT }}>{connectError}</div>}

          {connections.length === 0 ? (
            <EmptyState
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_300} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                </svg>
              }
              title="No stores connected"
              body="Connect your Squarespace store to sync products and map them to quiz outcomes."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {connections.map(function(conn) {
                return (
                  <div key={conn.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, border: '1px solid ' + C.GRAY_200, borderRadius: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>{conn.site_title || conn.site_id}</div>
                      <div style={{ fontSize: 12, color: C.GRAY_500, fontFamily: C.FONT }}>
                        {conn.site_url || 'No URL'} &middot; {conn.sync_status}
                        {conn.last_synced_at ? ' \u00b7 Synced ' + new Date(conn.last_synced_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={function() { syncConnection(conn.id); }}
                      style={{ padding: '6px 14px', border: '1px solid ' + C.GRAY_200, borderRadius: 8, background: C.SURFACE, color: C.GRAY_600, fontSize: 13, fontFamily: C.FONT, cursor: 'pointer' }}
                    >
                      Sync now
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : (
        <Card>
          {products.length === 0 ? (
            <EmptyState
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_300} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 00-8 0v2"/>
                </svg>
              }
              title="No products synced"
              body="Connect a Squarespace store and sync to see your product catalog here."
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {products.map(function(prod) {
                return (
                  <div key={prod.id} style={{ border: '1px solid ' + C.GRAY_200, borderRadius: 10, overflow: 'hidden' }}>
                    {prod.image_url && (
                      <div style={{ width: '100%', height: 140, background: C.GRAY_50, overflow: 'hidden' }}>
                        <img src={prod.image_url} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ padding: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>{prod.name}</div>
                      <div style={{ fontSize: 13, color: C.ACCENT, fontWeight: 600, marginTop: 4, fontFamily: C.FONT }}>
                        {prod.price_cents ? formatPrice(prod.price_cents, prod.currency) : 'No price'}
                      </div>
                      <div style={{ fontSize: 12, color: prod.is_available ? C.SUCCESS : C.GRAY_400, marginTop: 4, fontFamily: C.FONT }}>
                        {prod.is_available ? 'Available' : 'Unavailable'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </DashboardShell>
  );
}

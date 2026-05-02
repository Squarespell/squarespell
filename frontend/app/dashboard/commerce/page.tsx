'use client';

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';

/* ─── types ─── */
type Connection = {
  id: string; site_id: string; site_url: string;
  site_title: string; sync_status: string; last_synced_at: string | null;
};
type Product = {
  id: string; name: string; slug: string; url: string;
  image_url: string; price_cents: number; currency: string; is_available: boolean;
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(cents / 100);
}

/* ─── page ─── */
export default function CommercePage() {
  var { token, status } = useDashboardAuth();
  var [connections, setConnections] = useState<Connection[]>([]);
  var [products, setProducts] = useState<Product[]>([]);
  var [loading, setLoading] = useState(true);
  var [tab, setTab] = useState<'connections' | 'products'>('connections');
  var [connectForm, setConnectForm] = useState({ site_id: '', api_key: '' });
  var [showKey, setShowKey] = useState(false);
  var [connecting, setConnecting] = useState(false);
  var [connectError, setConnectError] = useState('');

  var apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

  useEffect(function () {
    if (!token) return;
    var cancelled = false;
    (async function () {
      try {
        var headers = { Authorization: 'Bearer ' + token };
        var [connRes, prodRes] = await Promise.all([
          fetch(apiBase + '/api/commerce/connections', { headers }),
          fetch(apiBase + '/api/commerce/products', { headers }),
        ]);
        if (!cancelled) {
          if (connRes.ok) { var cd = await connRes.json(); setConnections(cd.connections || cd || []); }
          if (prodRes.ok) { var pd = await prodRes.json(); setProducts(pd.products || pd || []); }
          setLoading(false);
        }
      } catch { if (!cancelled) setLoading(false); }
    })();
    return function () { cancelled = true; };
  }, [token]);

  async function connectSite() {
    if (!connectForm.site_id || !connectForm.api_key || !token) return;
    setConnecting(true); setConnectError('');
    try {
      var res = await fetch(apiBase + '/api/commerce/connect', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: connectForm.site_id, api_key: connectForm.api_key }),
      });
      var data = await res.json();
      if (res.ok) {
        setConnections(function (prev) { return [data.connection || data, ...prev]; });
        setConnectForm({ site_id: '', api_key: '' });
      } else { setConnectError(data.error || 'Connection failed'); }
    } catch { setConnectError('Network error'); }
    setConnecting(false);
  }

  async function syncConnection(id: string) {
    if (!token) return;
    await fetch(apiBase + '/api/commerce/connections/' + id + '/sync', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token },
    });
    var res = await fetch(apiBase + '/api/commerce/products', { headers: { Authorization: 'Bearer ' + token } });
    if (res.ok) { var pd = await res.json(); setProducts(pd.products || pd || []); }
  }

  async function disconnectSite(id: string) {
    if (!token) return;
    await fetch(apiBase + '/api/commerce/connections/' + id, {
      method: 'DELETE', headers: { Authorization: 'Bearer ' + token },
    });
    setConnections(function (prev) { return prev.filter(function (c) { return c.id !== id; }); });
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardShell title="Commerce">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, fontFamily: C.FONT, color: C.GRAY_400, fontSize: 14 }}>Loading...</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Commerce">
      <style>{`
        .com-tab:hover { opacity: 0.85; }
        .com-input:focus { border-color: ${C.ACCENT} !important; box-shadow: ${C.FOCUS_RING} !important; }
        .com-card:hover { box-shadow: ${C.SHADOW_MD}; }
        .com-info:hover { box-shadow: ${C.SHADOW_MD}; }
        .com-connect-btn:hover { background: ${C.ACCENT_HOVER} !important; }
        .com-action:hover { background: ${C.GRAY_50} !important; }
      `}</style>

      {/* ─── Header with illustration ─── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, position: 'relative' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, lineHeight: 1.3 }}>
            Commerce
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.5 }}>
            Connect your Squarespace store and map products to quiz outcomes.
          </p>
        </div>

        {/* Shopping illustration */}
        <div style={{ position: 'relative', width: 260, height: 120, flexShrink: 0 }}>
          {/* Cart icon */}
          <div style={{
            position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)',
            width: 64, height: 64, borderRadius: 16, background: C.GRAY_100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_400} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
          </div>
          {/* Floating icons */}
          <div style={{
            position: 'absolute', top: 10, right: 20,
            width: 40, height: 40, borderRadius: 10, background: '#FEF0C7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC6803" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
          </div>
          <div style={{
            position: 'absolute', top: 5, left: 40,
            width: 36, height: 36, borderRadius: 10, background: C.GRAY_100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <div style={{
            position: 'absolute', bottom: 15, right: 10,
            width: 36, height: 36, borderRadius: 10, background: '#F4EBFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </div>
          {/* Sparkles */}
          <svg width="10" height="10" viewBox="0 0 14 14" style={{ position: 'absolute', top: 0, left: 80 }}>
            <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill={C.GRAY_300} />
          </svg>
          <svg width="8" height="8" viewBox="0 0 14 14" style={{ position: 'absolute', top: 45, right: 0 }}>
            <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill={C.GRAY_300} />
          </svg>
          <svg width="6" height="6" viewBox="0 0 14 14" style={{ position: 'absolute', bottom: 40, left: 20 }}>
            <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill={C.GRAY_300} />
          </svg>
          {/* Dots */}
          {[{ t: 60, l: 25 }, { t: 80, r: 50 }, { t: 100, l: 90 }, { t: 95, r: 70 }].map(function (d, i) {
            return <div key={i} style={{
              position: 'absolute', width: 6, height: 6, borderRadius: '50%',
              background: C.GRAY_200, ...(d as any),
            }} />;
          })}
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['connections', 'products'] as const).map(function (t) {
          var active = tab === t;
          var label = t === 'products' ? 'Products (' + products.length + ')' : 'Connections';
          return (
            <button
              key={t}
              type="button"
              className="com-tab"
              onClick={function () { setTab(t); }}
              style={{
                padding: '8px 20px', fontSize: 14, fontWeight: 600,
                color: active ? '#fff' : C.GRAY_500,
                background: active ? C.ACCENT : '#fff',
                border: '1px solid ' + (active ? C.ACCENT : C.GRAY_200),
                borderRadius: 10, cursor: 'pointer', fontFamily: C.FONT,
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ─── Connections Tab ─── */}
      {tab === 'connections' && (
        <>
          {/* Connect store card */}
          <div style={{
            background: '#fff', border: '1px solid ' + C.GRAY_200,
            borderRadius: 16, padding: 28, marginBottom: 20,
            display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap',
          }}>
            {/* Left: icon + text */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', minWidth: 240 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, background: C.GRAY_50,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                border: '1px solid ' + C.GRAY_200,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_500} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 7V5a4 4 0 00-8 0v2" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 4 }}>
                  Connect your Squarespace Store
                </div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.5 }}>
                  Enter your Squarespace Site ID and API Key to get started.
                </div>
              </div>
            </div>

            {/* Right: form fields */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flex: 1, minWidth: 300 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.GRAY_700, fontFamily: C.FONT, marginBottom: 6 }}>
                  Site ID
                </label>
                <input
                  type="text"
                  className="com-input"
                  placeholder="e.g. abc123"
                  value={connectForm.site_id}
                  onChange={function (e) { setConnectForm(function (f) { return Object.assign({}, f, { site_id: e.target.value }); }); }}
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid ' + C.GRAY_300,
                    borderRadius: 10, fontSize: 14, fontFamily: C.FONT, color: C.GRAY_900,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.GRAY_700, fontFamily: C.FONT, marginBottom: 6 }}>
                  API Key
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    className="com-input"
                    placeholder="e.g. ••••••••••••••••"
                    value={connectForm.api_key}
                    onChange={function (e) { setConnectForm(function (f) { return Object.assign({}, f, { api_key: e.target.value }); }); }}
                    style={{
                      width: '100%', padding: '10px 40px 10px 14px', border: '1px solid ' + C.GRAY_300,
                      borderRadius: 10, fontSize: 14, fontFamily: C.FONT, color: C.GRAY_900,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={function () { setShowKey(!showKey); }}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: C.GRAY_400,
                      display: 'flex', padding: 4,
                    }}
                  >
                    {showKey ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="com-connect-btn"
                onClick={connectSite}
                disabled={connecting || !connectForm.site_id || !connectForm.api_key}
                style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: connecting || !connectForm.site_id || !connectForm.api_key ? C.GRAY_200 : C.ACCENT,
                  color: connecting || !connectForm.site_id || !connectForm.api_key ? C.GRAY_400 : '#fff',
                  fontSize: 14, fontWeight: 600, fontFamily: C.FONT,
                  cursor: connecting || !connectForm.site_id || !connectForm.api_key ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>

          {/* Security note */}
          {connectError ? (
            <div style={{
              padding: '10px 16px', background: C.DANGER_LIGHT,
              border: '1px solid #FEE4E2', borderRadius: 10,
              color: C.DANGER, fontSize: 13, fontFamily: C.FONT, marginBottom: 16,
              marginTop: -12,
            }}>
              {connectError}
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: C.GRAY_400, fontFamily: C.FONT,
              marginTop: -12, marginBottom: 20, paddingLeft: 4,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Your credentials are encrypted and secure
            </div>
          )}

          {/* Connected stores or empty state */}
          {connections.length === 0 ? (
            <div style={{
              background: '#fff', border: '1px solid ' + C.GRAY_200,
              borderRadius: 16, padding: '56px 20px 48px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              marginBottom: 20,
            }}>
              {/* Shopping bag illustration */}
              <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 20 }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'radial-gradient(circle, ' + C.BRAND_50 + ' 0%, transparent 70%)',
                }} />
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 64, height: 64, borderRadius: 16,
                  background: C.BRAND_50, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 7V5a4 4 0 00-8 0v2" />
                  </svg>
                </div>
                {/* Sparkles */}
                <svg width="14" height="14" viewBox="0 0 14 14" style={{ position: 'absolute', top: 8, right: 8 }}>
                  <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill={C.ACCENT} opacity="0.3" />
                </svg>
                <svg width="10" height="10" viewBox="0 0 14 14" style={{ position: 'absolute', top: 2, right: 24 }}>
                  <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill={C.ACCENT} opacity="0.5" />
                </svg>
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, margin: '0 0 8px' }}>
                No stores connected yet
              </h3>
              <p style={{ fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT, margin: '0 0 24px', textAlign: 'center', maxWidth: 380, lineHeight: 1.5 }}>
                Connect your Squarespace store to sync products and map them to quiz outcomes.
              </p>

              <button
                type="button"
                className="com-connect-btn"
                onClick={function () {
                  var el = document.querySelector<HTMLInputElement>('input[placeholder="e.g. abc123"]');
                  if (el) el.focus();
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '12px 28px', borderRadius: 10, border: 'none',
                  background: C.ACCENT, color: '#fff', fontSize: 15, fontWeight: 600,
                  fontFamily: C.FONT, cursor: 'pointer', boxShadow: C.SHADOW_XS,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3.333v9.334M3.333 8h9.334" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
                Connect your store
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {connections.map(function (conn) {
                return (
                  <div key={conn.id} className="com-card" style={{
                    background: '#fff', border: '1px solid ' + C.GRAY_200,
                    borderRadius: 14, padding: 20, transition: 'box-shadow 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: C.BRAND_50, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                          <path d="M16 7V5a4 4 0 00-8 0v2" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>{conn.site_title || conn.site_id}</div>
                        <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, marginTop: 2 }}>
                          {conn.site_url || 'No URL'}
                          <span style={{ color: C.GRAY_300, margin: '0 6px' }}>&middot;</span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            color: conn.sync_status === 'synced' ? '#12B76A' : C.GRAY_500,
                          }}>
                            {conn.sync_status === 'synced' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#12B76A' }} />}
                            {conn.sync_status}
                          </span>
                          {conn.last_synced_at && (
                            <span style={{ color: C.GRAY_400, marginLeft: 6 }}>
                              &middot; Synced {new Date(conn.last_synced_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button type="button" className="com-action" onClick={function () { syncConnection(conn.id); }}
                        style={{
                          padding: '8px 16px', border: '1px solid ' + C.GRAY_200, borderRadius: 8,
                          background: '#fff', color: C.GRAY_600, fontSize: 13, fontWeight: 500,
                          fontFamily: C.FONT, cursor: 'pointer',
                        }}>Sync now</button>
                      <button type="button" className="com-action" onClick={function () { disconnectSite(conn.id); }}
                        style={{
                          padding: '8px 16px', border: '1px solid ' + C.GRAY_200, borderRadius: 8,
                          background: '#fff', color: '#F04438', fontSize: 13, fontWeight: 500,
                          fontFamily: C.FONT, cursor: 'pointer',
                        }}>Disconnect</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Bottom info cards ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {/* Sync products */}
            <div className="com-info" style={{
              background: '#fff', border: '1px solid ' + C.GRAY_200,
              borderRadius: 14, padding: 24, transition: 'box-shadow 0.2s',
              display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: C.BRAND_50, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 4 }}>Sync products instantly</div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.5 }}>Automatically import and keep your products up to date.</div>
              </div>
            </div>

            {/* Map to outcomes */}
            <div className="com-info" style={{
              background: '#fff', border: '1px solid ' + C.GRAY_200,
              borderRadius: 14, padding: 24, transition: 'box-shadow 0.2s',
              display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#ECFDF3', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#12B76A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 3v18" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 4 }}>Map to quiz outcomes</div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.5 }}>Show the right products based on quiz results.</div>
              </div>
            </div>

            {/* Boost conversions */}
            <div className="com-info" style={{
              background: '#fff', border: '1px solid ' + C.GRAY_200,
              borderRadius: 14, padding: 24, transition: 'box-shadow 0.2s',
              display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#FEF0C7', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC6803" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 4 }}>Boost conversions</div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.5 }}>Recommend the perfect products and increase sales.</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Products Tab ─── */}
      {tab === 'products' && (
        <>
          {products.length === 0 ? (
            <div style={{
              background: '#fff', border: '1px solid ' + C.GRAY_200,
              borderRadius: 16, padding: '56px 20px 48px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 20 }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'radial-gradient(circle, #F4EBFF 0%, transparent 70%)',
                }} />
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 56, height: 56, borderRadius: 14,
                  background: '#F4EBFF', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 7V5a4 4 0 00-8 0v2" />
                  </svg>
                </div>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, margin: '0 0 6px' }}>No products synced</h3>
              <p style={{ fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT, margin: '0 0 20px', textAlign: 'center', maxWidth: 340 }}>
                Connect a Squarespace store and sync to see your product catalog here.
              </p>
              <button type="button" className="com-connect-btn" onClick={function () { setTab('connections'); }}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600,
                  fontFamily: C.FONT, cursor: 'pointer',
                }}>
                Connect a store first
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {products.map(function (prod) {
                return (
                  <div key={prod.id} className="com-card" style={{
                    background: '#fff', border: '1px solid ' + C.GRAY_200,
                    borderRadius: 14, overflow: 'hidden', transition: 'box-shadow 0.2s',
                  }}>
                    {prod.image_url ? (
                      <div style={{ width: '100%', height: 160, background: C.GRAY_50, overflow: 'hidden' }}>
                        <img src={prod.image_url} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{
                        width: '100%', height: 120, background: C.GRAY_50,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_300} strokeWidth="1.5">
                          <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 00-8 0v2" />
                        </svg>
                      </div>
                    )}
                    <div style={{ padding: 16 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 4 }}>{prod.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 15, color: C.ACCENT, fontWeight: 700, fontFamily: C.FONT }}>
                          {prod.price_cents ? formatPrice(prod.price_cents, prod.currency) : 'No price'}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 600, fontFamily: C.FONT,
                          padding: '2px 8px', borderRadius: 6,
                          background: prod.is_available ? '#ECFDF3' : C.GRAY_100,
                          color: prod.is_available ? '#027A48' : C.GRAY_500,
                        }}>
                          {prod.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}

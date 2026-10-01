'use client';

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { DisplayTitle, PageLoading } from '../_components/PageShell';

/* ─── types ─── */
type Connection = {
  id: string; site_id: string; site_url: string;
  site_title: string; sync_status: string; last_synced_at: string | null;
};
type Product = {
  id: string; name: string; slug: string; url: string;
  image_url: string; price_cents: number; currency: string; is_available: boolean;
};

function normalizeUrl(u: string): string {
  var t = u.trim();
  if (!t) return t;
  return /^https?:\/\//i.test(t) ? t : 'https://' + t;
}

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
  var [connectForm, setConnectForm] = useState({ site_url: '', api_key: '' });
  var [showKey, setShowKey] = useState(false);
  var [connecting, setConnecting] = useState(false);
  var [connectError, setConnectError] = useState('');

  var apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.squarespellquiz.com';

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
          if (connRes.ok) { var cd = await connRes.json(); var cl = Array.isArray(cd) ? cd : cd && cd.connections; setConnections(Array.isArray(cl) ? cl : []); }
          if (prodRes.ok) { var pd = await prodRes.json(); var pl = Array.isArray(pd) ? pd : pd && pd.products; setProducts(Array.isArray(pl) ? pl : []); }
          setLoading(false);
        }
      } catch { if (!cancelled) setLoading(false); }
    })();
    return function () { cancelled = true; };
  }, [token]);

  async function connectSite() {
    if (!connectForm.site_url.trim() || !connectForm.api_key.trim() || !token) return;
    setConnecting(true); setConnectError('');
    try {
      var res = await fetch(apiBase + '/api/commerce/connect', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: connectForm.api_key.trim(), site_url: normalizeUrl(connectForm.site_url) }),
      });
      var data = await res.json();
      if (res.ok) {
        setConnections(function (prev) { return [data.connection || data, ...prev]; });
        setConnectForm({ site_url: '', api_key: '' });
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
    if (res.ok) { var pd = await res.json(); var pl = Array.isArray(pd) ? pd : pd && pd.products; setProducts(Array.isArray(pl) ? pl : []); }
  }

  async function disconnectSite(id: string) {
    if (!token) return;
    await fetch(apiBase + '/api/commerce/connections/' + id, {
      method: 'DELETE', headers: { Authorization: 'Bearer ' + token },
    });
    setConnections(function (prev) { return prev.filter(function (c) { return c.id !== id; }); });
  }

  if (status === 'loading' || loading) {
    return <DashboardShell title="Products"><PageLoading /></DashboardShell>;
  }

  var inputStyle: React.CSSProperties = { width: '100%', height: 46, padding: '0 14px', borderRadius: 6, border: '1px solid ' + C.BORDER, fontSize: 15, fontFamily: C.FONT, color: C.INK, background: '#fff' };
  var canConnect = connectForm.site_url.trim() !== '' && connectForm.api_key.trim() !== '';
  var steps = [
    { n: 1, t: 'Sync products', b: 'Connect your store', done: connections.length > 0 },
    { n: 2, t: 'Map outcomes', b: 'Link products to results', done: false },
    { n: 3, t: 'Recommend products', b: 'Show the right products', done: false },
  ];
  var currentStep = connections.length > 0 ? 2 : 1;

  function Tab({ v, label }: { v: 'connections' | 'products'; label: string }) {
    var active = tab === v;
    return (
      <button type="button" role="tab" aria-selected={active} onClick={function () { setTab(v); }}
        style={{ height: 46, padding: '0 24px', borderRadius: 6, border: '1px solid ' + (active ? C.ACCENT : C.BORDER), background: active ? C.ACCENT : '#fff', color: active ? '#fff' : C.INK, fontSize: 15, fontFamily: C.FONT, cursor: 'pointer' }}>
        {label}
      </button>
    );
  }

  return (
    <DashboardShell title="Products">
      <style dangerouslySetInnerHTML={{ __html: `
        .co-hero { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 32px; align-items: start; margin-bottom: 30px; }
        .co-main { display: grid; grid-template-columns: minmax(360px, 0.75fr) minmax(0, 1.2fr); gap: 20px; margin-bottom: 20px; }
        .co-prod { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        @media (max-width: 1200px) { .co-hero, .co-main { grid-template-columns: 1fr; } .co-prod { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      ` }} />

      {/* Header */}
      <div className="co-hero">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 500, letterSpacing: '0.02em', color: C.ACCENT, background: C.GRAY_50, border: '1px solid ' + C.BORDER, padding: '6px 13px', borderRadius: 999, marginBottom: 16 }}><i style={{ width: 6, height: 6, borderRadius: '50%', background: C.ACCENT, display: 'inline-block' }} />Commerce</div>
          <DisplayTitle size="xl">Match every result to the right product.</DisplayTitle>
          <p style={{ margin: '16px 0 0', fontSize: 'clamp(17px, 1.5vw, 21px)', color: C.GRAY_600 }}>Connect your Squarespace store and map products to quiz outcomes.</p>
        </div>
        <ol aria-label="Setup steps" style={{ listStyle: 'none', margin: 0, padding: '28px 0 0', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {steps.map(function (st, i) {
            var active = st.n === currentStep;
            return (
              <li key={st.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{ width: 44, height: 44, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: st.done ? C.INK : active ? C.ACCENT : C.PERIWINKLE_SOFT, color: st.done || active ? '#fff' : C.INK, border: active || st.done ? 'none' : '1px solid ' + C.PERIWINKLE }}>{st.done ? '✓' : st.n}</span>
                <div><div style={{ fontSize: 15, fontWeight: 600, color: C.INK }}>{st.t}</div><div style={{ fontSize: 13, color: C.GRAY_500, marginTop: 2 }}>{st.b}</div></div>
                {i < steps.length - 1 && <span aria-hidden="true" style={{ width: 40, borderTop: '1px solid ' + C.GRAY_300, marginTop: 22 }} />}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="co-main">
        <div>
          <div role="tablist" aria-label="Commerce" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <Tab v="connections" label="Connections" />
            <Tab v="products" label={'Products (' + products.length + ')'} />
          </div>

          {tab === 'connections' ? (
            <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: '26px 28px' }}>
              <div style={{ display: 'flex', gap: 22, marginBottom: 24 }}>
                <span style={{ width: 64, height: 64, borderRadius: 8, background: C.GRAY_50, border: '1px solid ' + C.BORDER_LIGHT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><use href="/platforms/sprite.svg#squarespace" /></svg>
                </span>
                <div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.INK }}>Connect your Squarespace store</h2><p style={{ margin: '6px 0 0', fontSize: 15, color: C.GRAY_600 }}>Enter your store address and a Squarespace Commerce API key.</p></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr)', gap: '16px 20px', alignItems: 'center' }}>
                <label htmlFor="co-url" style={{ fontSize: 16, color: C.INK }}>Store URL</label>
                <input id="co-url" type="text" inputMode="url" autoComplete="off" placeholder="e.g. yourstore.com" value={connectForm.site_url} onChange={function (e) { setConnectForm({ ...connectForm, site_url: e.target.value }); }} style={inputStyle} />
                <label htmlFor="co-key" style={{ fontSize: 16, color: C.INK }}>API key</label>
                <div style={{ position: 'relative' }}>
                  <input id="co-key" type={showKey ? 'text' : 'password'} autoComplete="off" placeholder="Paste your API key" value={connectForm.api_key} onChange={function (e) { setConnectForm({ ...connectForm, api_key: e.target.value }); }} onKeyDown={function (e) { if (e.key === 'Enter' && canConnect) connectSite(); }} style={{ ...inputStyle, paddingRight: 48 }} />
                  <button type="button" aria-label={showKey ? 'Hide API key' : 'Show API key'} onClick={function () { setShowKey(!showKey); }} style={{ position: 'absolute', right: 8, top: 7, width: 32, height: 32, border: 'none', background: 'none', color: C.GRAY_600, cursor: 'pointer' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />{showKey && <path d="M3 3l18 18" />}</svg>
                  </button>
                </div>
              </div>
              {connectError && <div role="alert" style={{ marginTop: 14, fontSize: 14, color: C.DANGER }}>{connectError}</div>}
              <button type="button" onClick={connectSite} disabled={!canConnect || connecting}
                style={{ width: '100%', height: 48, marginTop: 22, borderRadius: 6, border: 'none', fontSize: 16, fontWeight: 500, fontFamily: C.FONT, background: !canConnect || connecting ? C.GRAY_100 : C.ACCENT, color: !canConnect || connecting ? C.GRAY_400 : '#fff', cursor: !canConnect || connecting ? 'default' : 'pointer' }}>
                {connecting ? 'Connecting...' : 'Connect store'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 14, color: C.GRAY_500 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
                Your API key is stored encrypted.
              </div>
              <details style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid ' + C.BORDER }}>
                <summary style={{ cursor: 'pointer', fontSize: 15, color: C.ACCENT }}>Where to find your API key</summary>
                <p style={{ margin: '10px 0 0', fontSize: 14, color: C.GRAY_600, lineHeight: 1.55 }}>In Squarespace, open your site settings and find Developer API Keys (under Advanced or Developer Tools). Create a key with read access to Products, then paste it here. Commerce API access depends on your Squarespace plan.</p>
              </details>
            </section>
          ) : (
            <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: 20 }}>
              {products.length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: C.INK }}>No products synced yet</div>
                  <p style={{ margin: '6px 0 0', fontSize: 15, color: C.GRAY_600 }}>Connect a store, then sync to bring in your products.</p>
                </div>
              ) : (
                <div className="co-prod" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  {products.map(function (p) {
                    return (
                      <a key={p.id} href={p.url || undefined} target="_blank" rel="noopener noreferrer" style={{ border: '1px solid ' + C.BORDER, borderRadius: 6, overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ height: 120, background: C.GRAY_50 }}>
                          {p.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </div>
                        <div style={{ padding: 12 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: C.INK }}>{p.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 14, color: C.GRAY_600 }}>
                            <span>{formatPrice(p.price_cents, p.currency)}</span>
                            <span style={{ color: p.is_available ? C.SUCCESS : C.GRAY_500 }}>{p.is_available ? 'In stock' : 'Unavailable'}</span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Illustrative preview */}
        <section aria-label="Preview of product recommendations" style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, background: C.GRAY_50, border: '1px solid ' + C.BORDER, padding: '40px 36px', minHeight: 420 }}>
          <svg aria-hidden="true" width="260" height="140" viewBox="0 0 260 140" style={{ position: 'absolute', left: 0, bottom: 0 }}><path d="M0 0 A 220 220 0 0 1 220 140 L 0 140 Z" fill={C.ACID_SOFT} /></svg>
          <svg aria-hidden="true" width="260" height="180" viewBox="0 0 260 180" style={{ position: 'absolute', right: 0, top: 0 }}><path d="M0 0 H 260 V 180 C 140 170, 40 100, 0 0 Z" fill={C.PERIWINKLE} /></svg>
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)', gap: 28, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', color: C.GRAY_600, marginBottom: 16 }}>QUIZ RESULTS REAL PRODUCTS</div>
              <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 'clamp(34px, 3.4vw, 50px)', fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 1, color: C.INK }}>Turn insights into sales<span style={{ color: C.ACCENT }}>.</span></div>
              <p style={{ margin: '18px 0 0', fontSize: 17, color: C.GRAY_600, lineHeight: 1.5 }}>Sync your products from Squarespace and map them to quiz outcomes, so every result can show a relevant product.</p>
            </div>
            <div style={{ display: 'grid', gap: 18 }}>
              {[
                { type: 'Skin type', result: 'Dry skin', bg: C.PERIWINKLE, product: 'Nourishing cleanser', price: '$28.00' },
                { type: 'Skin type', result: 'Oily skin', bg: C.ACID_SOFT, product: 'Clarifying moisturizer', price: '$32.00' },
              ].map(function (r) {
                return (
                  <div key={r.result} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 30px minmax(0,1fr)', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: r.bg, borderRadius: 6, padding: '16px 16px' }}>
                      <div style={{ fontSize: 11, color: C.GRAY_600 }}>{r.type}</div>
                      <div style={{ fontFamily: C.SERIF_FONT, fontSize: 24, color: C.INK, margin: '4px 0 10px' }}>{r.result}</div>
                      <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, background: '#fff', color: C.GRAY_600 }}>Quiz result</span>
                    </div>
                    <span aria-hidden="true" style={{ textAlign: 'center', fontSize: 20, color: C.INK }}></span>
                    <div style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ position: 'relative', height: 70, background: 'linear-gradient(135deg, #EBEFFF, #DCE3FF)' }}>
                        <svg aria-hidden="true" width="100%" height="70" viewBox="0 0 160 70"><rect x="68" y="14" width="22" height="46" rx="6" fill="#F5F7FF" stroke="#CDD6FF" /><rect x="74" y="6" width="10" height="10" fill="#CDD6FF" /></svg>
                        <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 11, padding: '2px 8px', borderRadius: 4, background: C.ACID, color: C.INK }}>Preview</span>
                      </div>
                      <div style={{ padding: '8px 10px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.INK }}>{r.product}</div>
                        <div style={{ fontSize: 13, color: C.GRAY_600 }}>{r.price}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: 12, color: C.GRAY_500 }}>Example only. Your own products appear after syncing.</div>
            </div>
          </div>
        </section>
      </div>

      {/* Connected stores */}
      <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: '22px 26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div><h2 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: C.INK }}>Connected stores</h2><p style={{ margin: '4px 0 0', fontSize: 15, color: C.GRAY_600 }}>Manage your Squarespace store connections.</p></div>
        </div>
        {connections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '10px 0 8px' }}>
            <span style={{ width: 60, height: 60, borderRadius: 8, background: C.PERIWINKLE_SOFT, color: C.INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l1.5-5h15L21 9M3 9h18v11H3zM3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3" /></svg>
            </span>
            <div style={{ fontSize: 18, fontWeight: 600, color: C.INK, marginTop: 12 }}>No stores connected yet</div>
            <p style={{ margin: '4px 0 0', fontSize: 15, color: C.GRAY_600 }}>Connect your Squarespace store to sync products and start mapping them to quiz outcomes.</p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0 }}>
            {connections.map(function (c, i) {
              return (
                <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid ' + C.BORDER_LIGHT, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 500, color: C.INK }}>{c.site_title || c.site_url || c.site_id}</div>
                    <div style={{ fontSize: 14, color: C.GRAY_500 }}>{c.site_url} · {c.sync_status || 'not synced'}{c.last_synced_at ? ' · last synced ' + new Date(c.last_synced_at).toLocaleString() : ''}</div>
                  </div>
                  <button type="button" onClick={function () { syncConnection(c.id); }} style={{ height: 40, padding: '0 16px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, fontSize: 14, fontFamily: C.FONT, cursor: 'pointer' }}>Sync products</button>
                  <button type="button" onClick={function () { if (confirm('Disconnect this store?')) disconnectSite(c.id); }} style={{ height: 40, padding: '0 16px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.DANGER, fontSize: 14, fontFamily: C.FONT, cursor: 'pointer' }}>Disconnect</button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </DashboardShell>
  );
}

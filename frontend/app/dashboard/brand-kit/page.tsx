'use client';

/**
 * /dashboard/brand-kit - User-level brand kit, shared across quiz, email, and popup.
 *
 * Persists to users.brand_kit JSONB via GET/PUT /api/user/brand-kit.
 * Can be populated by scraping a URL or editing fields directly.
 * Falls back into quizzes and emails when per-quiz branding is missing.
 */

import { useEffect, useState, useCallback } from 'react';

import { DashboardShell } from '../_components/DashboardShell';
import { DASHBOARD_COLORS as C } from '../_components/dashboardColors';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import {
  DisplayTitle,
  PrimaryButton,
  PageLoading,
  SettingsTabs,
} from '../_components/PageShell';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type ColorMode = 'light' | 'dark';

type BrandKit = {
  colors?: Record<string, string>;
  dark_colors?: Record<string, string>;   // alternate palette
  color_mode?: ColorMode;                 // which palette is active
  font_family?: string;
  site_name?: string;
  favicon_url?: string;
  logo_url?: string;
};

const COLOR_KEYS = ['primary', 'background', 'text', 'accent'] as const;

// -----------------------------------------------------------------------
// Palette inversion helpers
// -----------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isDark(hex: string): boolean {
  return luminance(hex) < 0.2;
}

/** Auto-generate a complementary palette for the opposite color mode */
function generateAltPalette(colors: Record<string, string>): Record<string, string> {
  const bg = colors.background || '#ffffff';
  const bgIsDark = isDark(bg);
  if (bgIsDark) {
    // Dark bg -> generate light variant
    return {
      primary: colors.primary || '#333333',
      background: '#f7f7f8',
      text: '#1a1a1a',
      accent: colors.accent || colors.primary || '#333333',
    };
  }
  // Light bg -> generate dark variant
  return {
    primary: colors.primary || '#3154FF',
    background: '#F7F7F5',
    text: '#1A1A1A',
    accent: colors.accent || colors.primary || '#3154FF',
  };
}

const inputStyle: React.CSSProperties = {
  height: 46,
  padding: '0 14px',
  background: C.SURFACE,
  border: `1px solid ${C.BORDER}`,
  borderRadius: 6,
  fontSize: 15,
  color: C.TEXT,
  fontFamily: '"Inter",system-ui,sans-serif',
  outline: 'none',
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 400,
  color: C.INK,
  marginBottom: 8,
  display: 'block',
};

// -----------------------------------------------------------------------
// Editable color swatch
// -----------------------------------------------------------------------

function EditableColor({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  var id = 'bk-color-' + label.toLowerCase();
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 500, color: C.INK, marginBottom: 8, textTransform: 'capitalize' }}>{label}</div>
      <label style={{ display: 'block', height: 56, borderRadius: 6, background: value || '#FFFFFF', border: `1px solid ${C.BORDER}`, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
        <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Pick {label} colour</span>
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value || '') ? value : '#333333'} onChange={(e) => onChange(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
      </label>
      <input id={id} aria-label={label + ' hex value'} type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="#000000"
        style={{ ...inputStyle, height: 42, marginTop: 8, fontFamily: C.MONO_FONT, fontSize: 14, textTransform: 'uppercase' }} />
      <div style={{ fontSize: 13, color: C.GRAY_500, marginTop: 6 }}>{hint}</div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Scrape-from-URL input
// -----------------------------------------------------------------------

function ScrapeUrlInput({
  onResult,
  loading,
  onLoadingChange,
  token,
}: {
  onResult: (brand: any) => void;
  loading: boolean;
  onLoadingChange: (v: boolean) => void;
  token: string | null;
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  async function handleScrape() {
    const trimmed = url.trim();
    if (!trimmed || !token) return;
    setError('');
    onLoadingChange(true);
    try {
      const res = await fetch(`${API}/api/scrape-brand`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Scrape failed (${res.status})`);
      }
      const data = await res.json();
      onResult(data);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      onLoadingChange(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleScrape(); }}
          placeholder="https://your-squarespace-site.com"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="button" onClick={handleScrape} disabled={loading || !url.trim()}
          style={{ height: 46, padding: '0 22px', borderRadius: 6, border: `1px solid ${C.BORDER}`, background: C.GRAY_50, color: C.INK, fontSize: 15, fontWeight: 500, fontFamily: C.FONT, cursor: loading || !url.trim() ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
          {loading ? 'Scanning...' : 'Import brand'}
        </button>
      </div>
      {error && (
        <div role="alert" style={{ fontSize: 13, color: C.DANGER, lineHeight: 1.4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default function BrandKitPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [previewType, setPreviewType] = useState<'quiz' | 'email'>('quiz');
  var [dirty, setDirty] = useState(false);
  var [loadError, setLoadError] = useState(false);

  var loadKit = useCallback(function() {
    if (!token) return;
    setLoading(true);
    setLoadError(false);
    api.getBrandKit()
      .then(function(data: any) {
        setKit(data || {});
        setLoading(false);
      })
      .catch(function() {
        setLoadError(true);
        setLoading(false);
      });
  }, [token]);

  useEffect(function() { loadKit(); }, [loadKit]);

  async function save() {
    if (!kit) return;
    setSaving(true);
    try {
      await api.saveBrandKit(kit);
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function updateKit(patch: Partial<BrandKit>) {
    setKit((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }

  function updateColor(key: string, value: string) {
    setKit((prev) => ({
      ...prev,
      colors: { ...(prev?.colors || {}), [key]: value },
    }));
    setDirty(true);
  }

  function applyScrapedBrand(data: any) {
    const scrapedColors = data.colors || {};
    const bgIsDark = isDark(scrapedColors.background || '#ffffff');
    const altColors = generateAltPalette(scrapedColors);
    const incoming: BrandKit = {
      colors: scrapedColors,
      dark_colors: altColors,
      color_mode: bgIsDark ? 'dark' : 'light',
      font_family: data.font_family || '',
      site_name: data.site_name || '',
      favicon_url: data.favicon_url || '',
    };
    setKit(incoming);
    setDirty(true);
  }

  if (authStatus === 'loading' || loading) {
    return (
      <DashboardShell title="Brand kit">
        <PageLoading />
      </DashboardShell>
    );
  }

  if (loadError) {
    return (
      <DashboardShell title="Brand kit">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED}
            strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ margin: '0 auto 14px', display: 'block' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.TEXT, marginBottom: 6 }}>
            Could not load brand kit
          </div>
          <div style={{ fontSize: 13, color: C.TEXT_MUTED, marginBottom: 18 }}>
            The server may be starting up. Please try again.
          </div>
          <PrimaryButton onClick={function() { loadKit(); }}>Retry</PrimaryButton>
        </div>
      </DashboardShell>
    );
  }

  var hasKit = kit && (kit.site_name || kit.font_family || (kit.colors && Object.values(kit.colors).some(Boolean)));
  var colors = kit?.colors || {};
  var mode = kit?.color_mode || 'dark';
  var brandPrimary = colors.primary || '#3154FF';
  var brandBg = colors.background || '#FFFFFF';
  var brandText = colors.text || '#0B1233';
  var brandAccent = colors.accent || brandPrimary;
  var brandFont = kit?.font_family || 'inherit';
  var onPrimary = isDark(brandPrimary) ? '#FFFFFF' : '#0B1233';
  var HINTS: Record<string, string> = { primary: 'Buttons, links, highlights', background: 'Page and card backgrounds', text: 'Headings and body text', accent: 'Secondary elements' };

  function switchMode(m: ColorMode) {
    if (mode === m) return;
    const currentColors = kit?.colors || {};
    const altColors = kit?.dark_colors || generateAltPalette(currentColors);
    updateKit({ color_mode: m, colors: altColors, dark_colors: currentColors });
  }

  var card: React.CSSProperties = { background: '#fff', border: `1px solid ${C.BORDER}`, borderRadius: 8, padding: '24px 26px', marginBottom: 16 };

  return (
    <DashboardShell title="Brand kit">
      <style dangerouslySetInnerHTML={{ __html: `
        .bk-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 0.95fr); gap: 20px; align-items: start; }
        .bk-two { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .bk-four { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        @media (max-width: 1100px) { .bk-grid { grid-template-columns: 1fr; } .bk-four { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 600px) { .bk-two { grid-template-columns: 1fr; } }
      ` }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.GRAY_500, marginBottom: 14 }}>Brand kit</div>
          <DisplayTitle size="xl">Make every quiz feel like you.</DisplayTitle>
          <p style={{ margin: '14px 0 0', fontSize: 'clamp(17px, 1.5vw, 21px)', color: C.GRAY_600 }}>Set your brand defaults for quizzes, emails and popups.</p>
        </div>
        <div style={{ textAlign: 'right', paddingTop: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
            {saved && <span role="status" style={{ fontSize: 14, color: C.SUCCESS }}>Saved</span>}
            <PrimaryButton size="lg" onClick={save} disabled={saving || !dirty}>{saving ? 'Saving...' : 'Save brand kit'}</PrimaryButton>
          </div>
          <div style={{ fontSize: 14, color: C.GRAY_500, marginTop: 10, maxWidth: 440 }}>{hasKit ? 'Changes apply to new quizzes and emails that don’t have per-quiz branding.' : 'Import from your site or fill in the fields below.'}</div>
        </div>
      </div>

      <SettingsTabs />

      <div className="bk-grid">
        <div>
          <section style={card}>
            <h2 style={{ margin: '0 0 4px', fontSize: 21, fontWeight: 600, color: C.INK }}>Import from URL</h2>
            <p style={{ margin: '0 0 16px', fontSize: 15, color: C.GRAY_600 }}>Paste your website address to detect palette, fonts and brand name.</p>
            <ScrapeUrlInput token={token} loading={scraping} onLoadingChange={setScraping} onResult={applyScrapedBrand} />
          </section>

          <section style={card}>
            <h2 style={{ margin: '0 0 16px', fontSize: 21, fontWeight: 600, color: C.INK }}>Identity</h2>
            <div className="bk-two">
              <div><label htmlFor="bk-name" style={labelStyle}>Site / brand name</label><input id="bk-name" type="text" value={kit?.site_name || ''} onChange={(e) => updateKit({ site_name: e.target.value })} placeholder="My brand" style={inputStyle} /></div>
              <div><label htmlFor="bk-font" style={labelStyle}>Font family</label><input id="bk-font" type="text" value={kit?.font_family || ''} onChange={(e) => updateKit({ font_family: e.target.value })} placeholder="Poppins, system-ui, sans-serif" style={inputStyle} /></div>
              <div><label htmlFor="bk-logo" style={labelStyle}>Logo URL</label><input id="bk-logo" type="url" value={kit?.logo_url || ''} onChange={(e) => updateKit({ logo_url: e.target.value })} placeholder="https://..." style={inputStyle} /><div style={{ fontSize: 13, color: C.GRAY_500, marginTop: 6 }}>PNG, SVG or JPG hosted on your site</div></div>
              <div><label htmlFor="bk-fav" style={labelStyle}>Favicon URL</label><input id="bk-fav" type="url" value={kit?.favicon_url || ''} onChange={(e) => updateKit({ favicon_url: e.target.value })} placeholder="https://..." style={inputStyle} /><div style={{ fontSize: 13, color: C.GRAY_500, marginTop: 6 }}>PNG or ICO</div></div>
            </div>
          </section>

          <section style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: C.INK }}>Palette</h2>
              <div role="group" aria-label="Palette variant" style={{ display: 'flex', padding: 3, borderRadius: 6, background: C.GRAY_100 }}>
                {(['light', 'dark'] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => switchMode(m)}
                    style={{ height: 36, padding: '0 20px', borderRadius: 5, border: 'none', background: mode === m ? C.ACCENT : 'transparent', color: mode === m ? '#fff' : C.INK, fontSize: 14, fontFamily: C.FONT, cursor: 'pointer' }}>
                    {m === 'light' ? 'Light' : 'Dark'}
                  </button>
                ))}
              </div>
            </div>
            <div className="bk-four">
              {COLOR_KEYS.map((key) => (
                <EditableColor key={key} label={key} hint={HINTS[key]} value={colors[key] || ''} onChange={(v) => updateColor(key, v)} />
              ))}
            </div>
            <p style={{ margin: '16px 0 0', fontSize: 13, color: C.GRAY_500 }}>Both light and dark variants are saved, so you can switch per campaign.</p>
          </section>
        </div>

        {/* Live preview in the customer's own brand */}
        <section style={{ ...card, position: 'sticky', top: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: C.INK }}>Live preview</h2>
              <p style={{ margin: '4px 0 0', fontSize: 15, color: C.GRAY_600 }}>How your brand looks in quizzes and emails.</p>
            </div>
            <div role="group" aria-label="Preview type" style={{ display: 'flex', padding: 3, borderRadius: 6, border: `1px solid ${C.BORDER}` }}>
              {(['quiz', 'email'] as const).map((v) => (
                <button key={v} type="button" aria-pressed={previewType === v} onClick={() => setPreviewType(v)}
                  style={{ height: 36, padding: '0 18px', borderRadius: 5, border: 'none', background: previewType === v ? C.ACCENT : 'transparent', color: previewType === v ? '#fff' : C.INK, fontSize: 14, fontFamily: C.FONT, cursor: 'pointer' }}>
                  {v === 'quiz' ? 'Quiz' : 'Email'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ border: `1px solid ${C.BORDER}`, borderRadius: 8, background: brandBg, color: brandText, fontFamily: brandFont, padding: 24, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              {kit?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={kit.logo_url} alt="" style={{ height: 24, maxWidth: 160, objectFit: 'contain' }} />
              ) : (
                <span style={{ fontWeight: 800, letterSpacing: '0.02em', fontSize: 15 }}>{(kit?.site_name || 'Your brand').toUpperCase()}</span>
              )}
              {previewType === 'quiz' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, opacity: 0.7 }}>
                  <span style={{ width: 110, height: 6, borderRadius: 3, background: 'rgba(128,128,128,0.2)', overflow: 'hidden' }}><span style={{ display: 'block', width: '20%', height: '100%', background: brandPrimary }} /></span>1 / 5
                </span>
              )}
            </div>
            {previewType === 'quiz' ? (
              <>
                <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 8 }}>What’s your perfect next move?</div>
                <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 20 }}>Answer a few questions to get a personalized recommendation.</div>
                <div style={{ border: '1px solid rgba(128,128,128,0.25)', borderRadius: 8, padding: 18 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>1. What best describes your goal right now?</div>
                  {['Grow my audience', 'Improve my existing content', 'Launch something new', 'I’m just exploring'].map((o, i) => (
                    <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 8, borderRadius: 6, border: '1px solid ' + (i === 0 ? brandAccent : 'rgba(128,128,128,0.25)'), fontSize: 14 }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid ' + (i === 0 ? brandPrimary : 'rgba(128,128,128,0.5)'), background: i === 0 ? brandPrimary : 'transparent' }} />{o}
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 22px', borderRadius: 6, background: brandPrimary, color: onPrimary, fontWeight: 600, fontSize: 15 }}>Next question →</span>
                    <span style={{ fontSize: 11, opacity: 0.6 }}>Powered by SQUARESPELL</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 6 }}>Subject: Your quiz result is in</div>
                <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.15, marginBottom: 12 }}>Hi {'{{first_name}}'}, here’s your result.</div>
                <div style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.85, marginBottom: 20 }}>Thanks for taking our quiz. Based on your answers, we picked a few next steps that fit where you are right now.</div>
                <span style={{ display: 'inline-flex', alignItems: 'center', height: 44, padding: '0 24px', borderRadius: 6, background: brandPrimary, color: onPrimary, fontWeight: 600, fontSize: 15 }}>See my recommendation</span>
                <div style={{ borderTop: '1px solid rgba(128,128,128,0.25)', marginTop: 24, paddingTop: 14, fontSize: 12, opacity: 0.6 }}>{kit?.site_name || 'Your brand'} · You received this because you took our quiz.</div>
              </>
            )}
          </div>
          <div style={{ fontSize: 13, color: C.GRAY_500, marginTop: 12 }}>Preview uses your brand colours and font{kit?.font_family ? ' (' + kit.font_family + ')' : ''}; sample text is illustrative.</div>
        </section>
      </div>
    </DashboardShell>
  );
}

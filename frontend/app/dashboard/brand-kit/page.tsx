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
  PageHeader,
  Card,
  EmptyState,
  PrimaryButton,
  PageLoading,
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
    primary: colors.primary || '#0D7377',
    background: '#0b0b0c',
    text: '#ececec',
    accent: colors.accent || colors.primary || '#0D7377',
  };
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
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: C.TEXT_MUTED,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginBottom: 6,
  display: 'block',
};

// -----------------------------------------------------------------------
// Editable color swatch
// -----------------------------------------------------------------------

function EditableColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <label
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: value || '#333',
          border: `1px solid ${C.BORDER}`,
          flexShrink: 0,
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <input
          type="color"
          value={value || '#333333'}
          onChange={(e) => onChange(e.target.value)}
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
        <div style={labelStyle}>{label}</div>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          style={{ ...inputStyle, fontFamily: 'ui-monospace,monospace', fontSize: 13 }}
        />
      </div>
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
        <PrimaryButton
          onClick={handleScrape}
          disabled={loading || !url.trim()}
        >
          {loading ? 'Scanning...' : 'Import brand'}
        </PrimaryButton>
      </div>
      {error && (
        <div style={{ fontSize: 12.5, color: '#ef4444', lineHeight: 1.4 }}>
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
  const [dirty, setDirty] = useState(false);

  const loadKit = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.getBrandKit();
      setKit(data || {});
    } catch {
      setKit({});
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadKit(); }, [loadKit]);

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

  const hasKit = kit && (kit.site_name || kit.font_family || (kit.colors && Object.values(kit.colors).some(Boolean)));

  return (
    <DashboardShell title="Brand kit">
      <PageHeader
        title="Brand kit"
        subtitle="Your brand defaults for quizzes, emails, and popups"
      />

      {/* Save bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ fontSize: 13, color: C.TEXT_MUTED }}>
          {hasKit
            ? 'Changes apply to new quizzes and emails that don\'t have per-quiz branding.'
            : 'Import from your site or fill in manually below.'}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {saved && (
            <span style={{ fontSize: 12, color: C.SUCCESS, fontWeight: 600 }}>
              Saved
            </span>
          )}
          <PrimaryButton onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving...' : 'Save brand kit'}
          </PrimaryButton>
        </div>
      </div>

      {/* Import from URL */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 10 }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 700, color: C.TEXT }}>
            Import from URL
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.5 }}>
            Paste any Squarespace site URL to auto-detect palette, fonts, and brand name.
          </p>
        </div>
        <ScrapeUrlInput
          token={token}
          loading={scraping}
          onLoadingChange={setScraping}
          onResult={applyScrapedBrand}
        />
      </Card>

      {/* Identity */}
      <Card style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
          Identity
        </h2>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={labelStyle}>Site / brand name</label>
            <input
              type="text"
              value={kit?.site_name || ''}
              onChange={(e) => updateKit({ site_name: e.target.value })}
              placeholder="My Squarespace Site"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Font family</label>
            <input
              type="text"
              value={kit?.font_family || ''}
              onChange={(e) => updateKit({ font_family: e.target.value })}
              placeholder="Montserrat, system-ui, sans-serif"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Favicon URL</label>
            <input
              type="url"
              value={kit?.favicon_url || ''}
              onChange={(e) => updateKit({ favicon_url: e.target.value })}
              placeholder="https://..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Logo URL</label>
            <input
              type="url"
              value={kit?.logo_url || ''}
              onChange={(e) => updateKit({ logo_url: e.target.value })}
              placeholder="https://..."
              style={inputStyle}
            />
          </div>
        </div>
      </Card>

      {/* Colors */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.TEXT }}>
            Palette
          </h2>
          <div style={{ display: 'flex', gap: 4, background: C.ELEVATED, borderRadius: 8, padding: 3 }}>
            {(['light', 'dark'] as const).map((m) => {
              const active = (kit?.color_mode || 'dark') === m;
              return (
                <button
                  key={m}
                  onClick={() => {
                    if (active) return;
                    // Swap active and alternate palettes
                    const currentColors = kit?.colors || {};
                    const altColors = kit?.dark_colors || generateAltPalette(currentColors);
                    updateKit({
                      color_mode: m,
                      colors: altColors,
                      dark_colors: currentColors,
                    });
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: active ? C.ACCENT : 'transparent',
                    color: active ? '#FFFFFF' : C.TEXT_MUTED,
                    border: 'none', padding: '5px 12px', borderRadius: 6,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {m === 'light' ? (
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  ) : (
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  )}
                  {m === 'light' ? 'Light' : 'Dark'}
                </button>
              );
            })}
          </div>
        </div>
        <p style={{ margin: '0 0 14px 0', fontSize: 12.5, color: C.TEXT_MUTED, lineHeight: 1.5 }}>
          Active palette: <strong style={{ color: C.TEXT }}>{(kit?.color_mode || 'dark') === 'dark' ? 'Dark' : 'Light'}</strong>.
          Toggle to edit the alternate variant. Both are saved so you can switch per campaign.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {COLOR_KEYS.map((key) => (
            <EditableColor
              key={key}
              label={key}
              value={(kit?.colors || {})[key] || ''}
              onChange={(v) => updateColor(key, v)}
            />
          ))}
        </div>
      </Card>

      {/* Preview */}
      {hasKit && (
        <Card>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
            Preview
          </h2>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
            padding: 20,
            background: kit?.colors?.background || C.SURFACE,
            border: `1px solid ${C.BORDER}`,
            borderRadius: 12,
          }}>
            {kit?.favicon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={kit.favicon_url}
                alt=""
                style={{
                  width: 48, height: 48, borderRadius: 10,
                  objectFit: 'contain', background: C.BG,
                  padding: 6, border: `1px solid ${C.BORDER}`,
                }}
              />
            ) : (
              <div style={{
                width: 48, height: 48, borderRadius: 10,
                background: kit?.colors?.primary || C.ACCENT,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 20, fontWeight: 800,
              }}>
                {(kit?.site_name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{
                fontSize: 20, fontWeight: 700,
                color: kit?.colors?.text || C.TEXT,
                fontFamily: kit?.font_family || 'inherit',
                marginBottom: 4,
              }}>
                {kit?.site_name || 'Your Brand'}
              </div>
              <div style={{ fontSize: 13, color: C.TEXT_MUTED }}>
                {kit?.font_family || 'Default font'}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {COLOR_KEYS.map((key) => {
                var c = (kit?.colors || {})[key];
                return c ? (
                  <div key={key} title={key} style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: c, border: `1px solid ${C.BORDER}`,
                  }} />
                ) : null;
              })}
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: 13,
              background: kit?.colors?.primary || C.ACCENT,
              color: '#FFFFFF',
            }}>
              Sample CTA button
            </div>
            <div style={{
              fontSize: 26, lineHeight: 1.2,
              fontFamily: kit?.font_family || 'inherit',
              color: kit?.colors?.text || C.TEXT,
            }}>
              The quick brown fox
            </div>
          </div>
        </Card>
      )}

      {!hasKit && !scraping && (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r="2.5" />
              <circle cx="19" cy="13" r="2.5" />
              <circle cx="6" cy="12" r="2.5" />
              <circle cx="10" cy="20" r="2.5" />
              <path d="M12 2a10 10 0 1 0 10 10" />
            </svg>
          }
          title="No brand kit yet"
          body="Paste a URL above to import your brand, or fill in the fields manually."
        />
      )}
    </DashboardShell>
  );
}

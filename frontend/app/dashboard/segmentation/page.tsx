'use client';

import { useEffect, useState, useRef } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';

/* ─── types ─── */
type Tag = { id: string; name: string; color: string; created_at: string };
type Segment = {
  id: string; name: string; description: string;
  rules: any[]; cached_count: number; created_at: string;
};

/* ─── color presets ─── */
var TAG_COLORS = [
  '#0D7377', '#2E90FA', '#7F56D9', '#EE46BC',
  '#F04438', '#F79009', '#17B26A', '#475467',
];

/* ─── main ─── */
export default function SegmentationPage() {
  var { token, status } = useDashboardAuth();
  var [tags, setTags] = useState<Tag[]>([]);
  var [segments, setSegments] = useState<Segment[]>([]);
  var [loading, setLoading] = useState(true);
  var [tab, setTab] = useState<'tags' | 'segments'>('tags');

  /* tag creation */
  var [newTagName, setNewTagName] = useState('');
  var [newTagColor, setNewTagColor] = useState('#0D7377');
  var [colorOpen, setColorOpen] = useState(false);
  var colorRef = useRef<HTMLDivElement>(null);

  /* segment creation */
  var [newSegName, setNewSegName] = useState('');
  var [newSegDesc, setNewSegDesc] = useState('');

  var [creating, setCreating] = useState(false);
  var [error, setError] = useState('');

  var apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

  /* close color picker on outside click */
  useEffect(function () {
    function handler(e: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setColorOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return function () { document.removeEventListener('mousedown', handler); };
  }, []);

  /* fetch data */
  useEffect(function () {
    if (!token) return;
    var cancelled = false;
    (async function () {
      try {
        var headers = { Authorization: 'Bearer ' + token };
        var [tagRes, segRes] = await Promise.all([
          fetch(apiBase + '/api/tags', { headers }),
          fetch(apiBase + '/api/segments', { headers }),
        ]);
        if (!cancelled) {
          if (tagRes.ok) { var td = await tagRes.json(); setTags(td.tags || td || []); }
          if (segRes.ok) { var sd = await segRes.json(); setSegments(sd.segments || sd || []); }
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return function () { cancelled = true; };
  }, [token]);

  /* CRUD */
  async function createTag() {
    if (!newTagName.trim() || !token) return;
    setCreating(true); setError('');
    try {
      var res = await fetch(apiBase + '/api/tags', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });
      if (res.ok) {
        var data = await res.json();
        setTags(function (prev) { return [data.tag || data, ...prev]; });
        setNewTagName('');
      } else {
        var errData = await res.json().catch(function () { return { error: 'Failed to create tag' }; });
        setError(errData.error || 'Failed to create tag');
      }
    } catch (e: any) { setError(e.message || 'Network error'); }
    setCreating(false);
  }

  async function createSegment() {
    if (!newSegName.trim() || !token) return;
    setCreating(true); setError('');
    try {
      var res = await fetch(apiBase + '/api/segments', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSegName.trim(), description: newSegDesc, rules: [] }),
      });
      if (res.ok) {
        var data = await res.json();
        setSegments(function (prev) { return [data.segment || data, ...prev]; });
        setNewSegName(''); setNewSegDesc('');
      } else {
        var errData = await res.json().catch(function () { return { error: 'Failed to create segment' }; });
        setError(errData.error || 'Failed to create segment');
      }
    } catch (e: any) { setError(e.message || 'Network error'); }
    setCreating(false);
  }

  async function deleteTag(id: string) {
    if (!token) return;
    await fetch(apiBase + '/api/tags/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    setTags(function (prev) { return prev.filter(function (t) { return t.id !== id; }); });
  }

  async function deleteSegment(id: string) {
    if (!token) return;
    await fetch(apiBase + '/api/segments/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    setSegments(function (prev) { return prev.filter(function (s) { return s.id !== id; }); });
  }

  /* ─── loading state ─── */
  if (status === 'loading' || loading) {
    return (
      <DashboardShell title="Segmentation">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, fontFamily: C.FONT, color: C.GRAY_400, fontSize: 14 }}>
          Loading...
        </div>
      </DashboardShell>
    );
  }

  /* ─── render ─── */
  return (
    <DashboardShell title="Segmentation">
      <style>{`
        .seg-input:focus { border-color: ${C.ACCENT} !important; box-shadow: ${C.FOCUS_RING} !important; }
        .seg-tab { transition: all 0.15s ease; }
        .seg-tab:hover { opacity: 0.85; }
        .seg-tag-chip:hover .seg-tag-x { opacity: 1; }
        .seg-color-opt:hover { transform: scale(1.2); }
        .seg-cta-outline:hover { background: ${C.ACCENT_LIGHT} !important; border-color: ${C.ACCENT} !important; color: ${C.ACCENT} !important; }
        .seg-info-card:hover { box-shadow: ${C.SHADOW_MD}; }
        .seg-new-btn:hover { background: ${C.ACCENT_HOVER} !important; }
      `}</style>

      {/* ─── Header row ─── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, margin: 0, lineHeight: 1.3 }}>
            Segmentation
          </h1>
          <p style={{ fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT, margin: '4px 0 0', lineHeight: 1.5 }}>
            Organize leads with tags and dynamic segments
          </p>
        </div>
        <button
          type="button"
          className="seg-new-btn"
          onClick={function () {
            setTab('tags');
            setNewTagName('');
            /* focus input after render */
            setTimeout(function () {
              var el = document.getElementById('seg-tag-input');
              if (el) el.focus();
            }, 50);
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: 10, border: 'none',
            background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600,
            fontFamily: C.FONT, cursor: 'pointer', boxShadow: C.SHADOW_XS,
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3.333v9.334M3.333 8h9.334" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
          New tag
        </button>
      </div>

      {/* ─── Tabs ─── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['tags', 'segments'] as const).map(function (t) {
          var active = tab === t;
          return (
            <button
              key={t}
              type="button"
              className="seg-tab"
              onClick={function () { setTab(t); }}
              style={{
                padding: '8px 20px', fontSize: 14, fontWeight: 600,
                color: active ? '#fff' : C.GRAY_500,
                background: active ? C.ACCENT : '#fff',
                border: '1px solid ' + (active ? C.ACCENT : C.GRAY_200),
                borderRadius: 10, cursor: 'pointer', fontFamily: C.FONT,
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          );
        })}
      </div>

      {/* ─── Error banner ─── */}
      {error && (
        <div style={{
          padding: '10px 16px', background: C.DANGER_LIGHT,
          border: '1px solid #FEE4E2', borderRadius: 10,
          color: C.DANGER, fontSize: 13, fontFamily: C.FONT, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* ─── Tags tab ─── */}
      {tab === 'tags' && (
        <>
          {/* Main card */}
          <div style={{
            background: '#fff', border: '1px solid ' + C.GRAY_200,
            borderRadius: 16, padding: 28, boxShadow: C.SHADOW_XS,
            minHeight: 360,
          }}>
            {/* Creation row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 32 }}>
              <input
                id="seg-tag-input"
                type="text"
                className="seg-input"
                placeholder="Enter new tag name..."
                value={newTagName}
                onChange={function (e) { setNewTagName(e.target.value); }}
                onKeyDown={function (e) { if (e.key === 'Enter') createTag(); }}
                style={{
                  flex: 1, padding: '10px 14px', border: '1px solid ' + C.GRAY_300,
                  borderRadius: 10, fontSize: 14, fontFamily: C.FONT,
                  color: C.GRAY_900, outline: 'none', background: '#fff',
                }}
              />

              {/* Color picker dropdown */}
              <div ref={colorRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={function () { setColorOpen(!colorOpen); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 12px', border: '1px solid ' + C.GRAY_300,
                    borderRadius: 10, background: '#fff', cursor: 'pointer',
                  }}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: newTagColor, flexShrink: 0,
                  }} />
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6l4 4 4-4" stroke={C.GRAY_400} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {colorOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                    background: '#fff', border: '1px solid ' + C.GRAY_200,
                    borderRadius: 12, padding: 12, boxShadow: C.SHADOW_LG,
                    zIndex: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 8, minWidth: 140,
                  }}>
                    {TAG_COLORS.map(function (c) {
                      return (
                        <button
                          key={c}
                          type="button"
                          className="seg-color-opt"
                          onClick={function () { setNewTagColor(c); setColorOpen(false); }}
                          style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: c, border: newTagColor === c ? '2px solid ' + C.GRAY_900 : '2px solid transparent',
                            cursor: 'pointer', transition: 'transform 0.15s',
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add tag button */}
              <button
                type="button"
                className="seg-new-btn"
                onClick={createTag}
                disabled={creating || !newTagName.trim()}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: creating || !newTagName.trim() ? C.GRAY_200 : C.ACCENT,
                  color: creating || !newTagName.trim() ? C.GRAY_400 : '#fff',
                  fontSize: 14, fontWeight: 600, fontFamily: C.FONT,
                  cursor: creating || !newTagName.trim() ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {creating ? 'Adding...' : 'Add tag'}
              </button>
            </div>

            {/* Tag list or empty state */}
            {tags.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0 32px' }}>
                {/* Illustration */}
                <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 20 }}>
                  {/* Soft circle bg */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'radial-gradient(circle, ' + C.BRAND_50 + ' 0%, transparent 70%)',
                  }} />
                  {/* Tag icon */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 56, height: 56, borderRadius: 14,
                    background: C.BRAND_50, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                  </div>
                  {/* Sparkles */}
                  <svg width="14" height="14" viewBox="0 0 14 14" style={{ position: 'absolute', top: 10, right: 8 }}>
                    <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill={C.ACCENT} opacity="0.3" />
                  </svg>
                  <svg width="10" height="10" viewBox="0 0 14 14" style={{ position: 'absolute', top: 4, right: 22 }}>
                    <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill={C.ACCENT} opacity="0.5" />
                  </svg>
                  <svg width="8" height="8" viewBox="0 0 14 14" style={{ position: 'absolute', top: 22, right: 2 }}>
                    <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill={C.ACCENT} opacity="0.2" />
                  </svg>
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, margin: '0 0 6px' }}>
                  No tags yet
                </h3>
                <p style={{ fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT, margin: '0 0 20px', textAlign: 'center' }}>
                  Create tags to categorize and organize your leads.
                </p>
                <button
                  type="button"
                  className="seg-cta-outline"
                  onClick={function () {
                    var el = document.getElementById('seg-tag-input');
                    if (el) el.focus();
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 20px', borderRadius: 10,
                    border: '1px solid ' + C.GRAY_200, background: '#fff',
                    color: C.GRAY_700, fontSize: 14, fontWeight: 600,
                    fontFamily: C.FONT, cursor: 'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3.333v9.334M3.333 8h9.334" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  Create your first tag
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {tags.map(function (tag) {
                  return (
                    <div
                      key={tag.id}
                      className="seg-tag-chip"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '7px 14px', borderRadius: 20,
                        background: tag.color + '12', border: '1px solid ' + tag.color + '25',
                        fontSize: 13, fontWeight: 500, color: C.GRAY_700, fontFamily: C.FONT,
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
                      {tag.name}
                      <button
                        type="button"
                        className="seg-tag-x"
                        onClick={function () { deleteTag(tag.id); }}
                        style={{
                          background: 'none', border: 'none', color: C.GRAY_400,
                          cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1,
                          opacity: 0.5, transition: 'opacity 0.15s',
                        }}
                        title="Remove tag"
                      >
                        &times;
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Bottom info cards ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20 }}>
            {/* Organize leads */}
            <div className="seg-info-card" style={{
              background: '#fff', border: '1px solid ' + C.GRAY_200,
              borderRadius: 14, padding: 24, transition: 'box-shadow 0.2s',
              display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: C.BRAND_50, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 4 }}>
                  Organize leads
                </div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.5 }}>
                  Use tags to group leads based on interests, behavior, or quiz responses.
                </div>
              </div>
            </div>

            {/* Create segments */}
            <div className="seg-info-card" style={{
              background: '#fff', border: '1px solid ' + C.GRAY_200,
              borderRadius: 14, padding: 24, transition: 'box-shadow 0.2s',
              display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#F4EBFF', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.PURPLE_500} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 4 }}>
                  Create segments
                </div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.5 }}>
                  Build dynamic segments for targeted campaigns and automations.
                </div>
              </div>
            </div>

            {/* Power automations */}
            <div className="seg-info-card" style={{
              background: '#fff', border: '1px solid ' + C.GRAY_200,
              borderRadius: 14, padding: 24, transition: 'box-shadow 0.2s',
              display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: C.GRAY_100, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_600} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 4 }}>
                  Power automations
                </div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.5 }}>
                  Use tags and segments to trigger personalized workflows.
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Segments tab ─── */}
      {tab === 'segments' && (
        <>
          <div style={{
            background: '#fff', border: '1px solid ' + C.GRAY_200,
            borderRadius: 16, padding: 28, boxShadow: C.SHADOW_XS,
            minHeight: 360,
          }}>
            {/* Creation row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 32 }}>
              <input
                type="text"
                className="seg-input"
                placeholder="Enter segment name..."
                value={newSegName}
                onChange={function (e) { setNewSegName(e.target.value); }}
                style={{
                  flex: 1, padding: '10px 14px', border: '1px solid ' + C.GRAY_300,
                  borderRadius: 10, fontSize: 14, fontFamily: C.FONT,
                  color: C.GRAY_900, outline: 'none', background: '#fff',
                }}
              />
              <input
                type="text"
                className="seg-input"
                placeholder="Description (optional)"
                value={newSegDesc}
                onChange={function (e) { setNewSegDesc(e.target.value); }}
                onKeyDown={function (e) { if (e.key === 'Enter') createSegment(); }}
                style={{
                  flex: 1, padding: '10px 14px', border: '1px solid ' + C.GRAY_300,
                  borderRadius: 10, fontSize: 14, fontFamily: C.FONT,
                  color: C.GRAY_900, outline: 'none', background: '#fff',
                }}
              />
              <button
                type="button"
                className="seg-new-btn"
                onClick={createSegment}
                disabled={creating || !newSegName.trim()}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: creating || !newSegName.trim() ? C.GRAY_200 : C.ACCENT,
                  color: creating || !newSegName.trim() ? C.GRAY_400 : '#fff',
                  fontSize: 14, fontWeight: 600, fontFamily: C.FONT,
                  cursor: creating || !newSegName.trim() ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {creating ? 'Adding...' : 'Add segment'}
              </button>
            </div>

            {/* Segment list or empty state */}
            {segments.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0 32px' }}>
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
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.PURPLE_500} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" style={{ position: 'absolute', top: 10, right: 8 }}>
                    <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill={C.PURPLE_500} opacity="0.3" />
                  </svg>
                  <svg width="10" height="10" viewBox="0 0 14 14" style={{ position: 'absolute', top: 4, right: 22 }}>
                    <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill={C.PURPLE_500} opacity="0.5" />
                  </svg>
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, margin: '0 0 6px' }}>
                  No segments yet
                </h3>
                <p style={{ fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT, margin: '0 0 20px', textAlign: 'center', maxWidth: 340 }}>
                  Create segments to group leads by shared criteria like quiz score, outcome, or tags.
                </p>
                <button
                  type="button"
                  className="seg-cta-outline"
                  onClick={function () {
                    var el = document.querySelector<HTMLInputElement>('input[placeholder="Enter segment name..."]');
                    if (el) el.focus();
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 20px', borderRadius: 10,
                    border: '1px solid ' + C.GRAY_200, background: '#fff',
                    color: C.GRAY_700, fontSize: 14, fontWeight: 600,
                    fontFamily: C.FONT, cursor: 'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3.333v9.334M3.333 8h9.334" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  Create your first segment
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {segments.map(function (seg) {
                  return (
                    <div
                      key={seg.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: 16, border: '1px solid ' + C.GRAY_200, borderRadius: 12,
                        background: C.SURFACE, transition: 'box-shadow 0.15s',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>{seg.name}</div>
                        {seg.description && <div style={{ fontSize: 13, color: C.GRAY_500, marginTop: 2, fontFamily: C.FONT }}>{seg.description}</div>}
                        <div style={{ fontSize: 12, color: C.GRAY_400, marginTop: 4, fontFamily: C.FONT }}>
                          {seg.rules.length} rule{seg.rules.length !== 1 ? 's' : ''} &middot; {seg.cached_count} lead{seg.cached_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="seg-cta-outline"
                        onClick={function () { deleteSegment(seg.id); }}
                        style={{
                          background: '#fff', border: '1px solid ' + C.GRAY_200,
                          borderRadius: 8, color: C.GRAY_500, cursor: 'pointer',
                          padding: '6px 14px', fontSize: 13, fontFamily: C.FONT,
                          fontWeight: 500,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom info cards (same as tags tab) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20 }}>
            <div className="seg-info-card" style={{
              background: '#fff', border: '1px solid ' + C.GRAY_200,
              borderRadius: 14, padding: 24, transition: 'box-shadow 0.2s',
              display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: C.BRAND_50, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 4 }}>Organize leads</div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.5 }}>Use tags to group leads based on interests, behavior, or quiz responses.</div>
              </div>
            </div>
            <div className="seg-info-card" style={{
              background: '#fff', border: '1px solid ' + C.GRAY_200,
              borderRadius: 14, padding: 24, transition: 'box-shadow 0.2s',
              display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#F4EBFF', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.PURPLE_500} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 4 }}>Create segments</div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.5 }}>Build dynamic segments for targeted campaigns and automations.</div>
              </div>
            </div>
            <div className="seg-info-card" style={{
              background: '#fff', border: '1px solid ' + C.GRAY_200,
              borderRadius: 14, padding: 24, transition: 'box-shadow 0.2s',
              display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: C.GRAY_100, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_600} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 4 }}>Power automations</div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.5 }}>Use tags and segments to trigger personalized workflows.</div>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

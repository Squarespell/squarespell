'use client';

import { useEffect, useState, useRef } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { DisplayTitle, UnderlineTabs, PageLoading } from '../_components/PageShell';

/* ─── types ─── */
type Tag = { id: string; name: string; color: string; created_at: string };
type Segment = {
  id: string; name: string; description: string;
  rules: any[]; cached_count: number; created_at: string;
};

/* ─── color presets ─── */
var TAG_COLORS = [
  '#3154FF', '#8FA2FF', '#0B1233', '#646D8F',
  '#C9D93F', '#1F9D57', '#E09B1A', '#C0271B',
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
  var [newTagColor, setNewTagColor] = useState('#3154FF');
  var tagInputRef = useRef<HTMLInputElement>(null);
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
    return <DashboardShell title="Segmentation"><PageLoading /></DashboardShell>;
  }

  var card: React.CSSProperties = { background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8 };
  var label: React.CSSProperties = { display: 'block', fontSize: 15, color: C.INK, marginBottom: 8 };
  var input: React.CSSProperties = { width: '100%', height: 46, padding: '0 14px', borderRadius: 6, border: '1px solid ' + C.BORDER, fontSize: 15, fontFamily: C.FONT, color: C.INK, background: '#fff' };
  var tint = function (hex: string) { return hex + '26'; };

  function addButton(onClick: () => void, disabled: boolean, text: string) {
    return (
      <button type="button" onClick={onClick} disabled={disabled}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 44, padding: '0 20px', borderRadius: 6, border: 'none', fontSize: 16, fontFamily: C.FONT, cursor: disabled ? 'default' : 'pointer', background: disabled ? C.GRAY_100 : C.ACCENT, color: disabled ? C.GRAY_400 : '#fff' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        {text}
      </button>
    );
  }

  var TIPS = [
    { n: '1. Tag your leads', b: 'Use tags to group leads by interest, intent, source or any custom category.', bg: C.PERIWINKLE_SOFT, icon: 'M20.6 13.4 13.4 20.6a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8zM7.5 7.5h.01' },
    { n: '2. Create segments', b: 'Combine tags and rules to build dynamic segments of your audience.', bg: C.ACID_SOFT, icon: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5M17 11a3 3 0 100-6M22 21c0-3-1.8-5-4.5-5.7' },
    { n: '3. Automate engagement', b: 'Use segments to send targeted email campaigns and automations.', bg: C.PERIWINKLE_SOFT, icon: 'M13 2 4 14h7l-1 8 9-12h-7z' },
  ];

  return (
    <DashboardShell title="Segmentation">
      <style dangerouslySetInnerHTML={{ __html: `
        .sq-seg-top { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 20px; margin-bottom: 20px; }
        .sq-seg-tips { display: grid; grid-template-columns: 240px repeat(3, minmax(0, 1fr)); }
        .sq-seg-tips > div + div { border-left: 1px solid ${C.BORDER}; }
        @media (max-width: 1100px) { .sq-seg-top { grid-template-columns: 1fr; } .sq-seg-tips { grid-template-columns: 1fr; } .sq-seg-tips > div + div { border-left: none; border-top: 1px solid ${C.BORDER}; } }
      ` }} />

      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.GRAY_500, marginBottom: 14 }}>Segmentation</div>
      <DisplayTitle size="xl">Know your audience better.</DisplayTitle>
      <p style={{ margin: '14px 0 24px', fontSize: 'clamp(17px, 1.5vw, 21px)', color: C.GRAY_600 }}>Organize leads with tags and dynamic segments.</p>

      <div style={{ marginBottom: 24 }}>
        <UnderlineTabs
          tabs={[{ value: 'tags', label: 'Tags (' + tags.length + ')' }, { value: 'segments', label: 'Segments (' + segments.length + ')' }]}
          value={tab}
          onChange={function (v) { setTab(v as 'tags' | 'segments'); setError(''); }}
        />
      </div>

      {error && <div role="alert" style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 6, background: C.DANGER_LIGHT, color: C.DANGER, fontSize: 14 }}>{error}</div>}

      {tab === 'tags' ? (
        <>
          <div className="sq-seg-top">
            <section style={{ ...card, padding: '28px 28px 30px' }}>
              <h2 style={{ margin: 0, fontFamily: C.DISPLAY_FONT, fontSize: 30, fontWeight: 500, letterSpacing: '-0.025em', color: C.INK }}>Create a tag</h2>
              <p style={{ margin: '6px 0 22px', fontSize: 16, color: C.GRAY_600 }}>Add a tag to categorize and organize your leads.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: 20, alignItems: 'end' }}>
                <div>
                  <label htmlFor="sq-tag-name" style={label}>Tag name</label>
                  <input id="sq-tag-name" ref={tagInputRef} value={newTagName} onChange={function (e) { setNewTagName(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') createTag(); }} placeholder="Enter tag name..." maxLength={40} style={input} />
                </div>
                <div ref={colorRef} style={{ position: 'relative' }}>
                  <span style={label}>Color</span>
                  <button type="button" aria-haspopup="listbox" aria-expanded={colorOpen} aria-label="Tag color" onClick={function () { setColorOpen(!colorOpen); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, height: 46, padding: '0 14px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', cursor: 'pointer' }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: newTagColor }} />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.INK} strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                  {colorOpen && (
                    <div role="listbox" aria-label="Tag colors" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 28px)', gap: 10, padding: 12, background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, boxShadow: C.SHADOW_LG }}>
                      {TAG_COLORS.map(function (c) {
                        return <button key={c} type="button" role="option" aria-selected={newTagColor === c} aria-label={'Color ' + c} onClick={function () { setNewTagColor(c); setColorOpen(false); }}
                          style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', boxShadow: newTagColor === c ? '0 0 0 2px #fff, 0 0 0 4px ' + C.INK : 'none' }} />;
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <span style={label}>Preview</span>
                  <span style={{ height: 46, display: 'flex', alignItems: 'center' }}><span style={{ display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 20px', borderRadius: 999, background: tint(newTagColor), color: newTagColor === '#C9D93F' ? C.INK : newTagColor, fontSize: 15, fontWeight: 500, maxWidth: 220, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{newTagName.trim() || 'Tag name'}</span></span>
                </div>
              </div>
              <div style={{ marginTop: 24 }}>{addButton(createTag, !newTagName.trim() || creating, creating ? 'Adding...' : 'Add tag')}</div>
            </section>

            <section aria-label="Example tags" style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, background: C.PERIWINKLE, padding: '28px 30px' }}>
              <svg aria-hidden="true" width="200" height="200" viewBox="0 0 200 200" style={{ position: 'absolute', right: -30, bottom: -40 }}>
                <circle cx="130" cy="130" r="110" fill={C.BRAND_300} opacity="0.6" />
                <path d="M20 200 A 80 80 0 0 1 100 120 L 100 200 Z" fill={C.ACID} />
              </svg>
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', color: C.GRAY_600, marginBottom: 18 }}>EXAMPLES</div>
                  <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 36, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 1.05, color: C.INK }}>Simple tags<span style={{ color: C.ACCENT }}>.</span><br />Bigger insights<span style={{ color: C.ACCENT }}>.</span></div>
                  <p style={{ margin: '16px 0 0', fontSize: 16, color: C.GRAY_700, lineHeight: 1.5, maxWidth: 340 }}>Use tags to group leads by interest, intent or source. Later, turn them into dynamic segments for targeted campaigns.</p>
                </div>
                <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
                  {[['Interest: Design', C.ACID], ['High intent', C.ACCENT], ['New lead', C.BRAND_300]].map(function (t) {
                    return <span key={t[0]} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 42, padding: '0 18px 0 14px', borderRadius: 999, background: '#fff', fontSize: 15, color: C.INK, whiteSpace: 'nowrap' }}><span style={{ width: 18, height: 18, borderRadius: '50%', background: t[1] }} />{t[0]}</span>;
                  })}
                </div>
              </div>
            </section>
          </div>

          <section style={{ ...card, marginBottom: 20 }}>
            {tags.length === 0 ? (
              <div style={{ padding: '44px 20px', textAlign: 'center' }}>
                <span style={{ width: 76, height: 76, borderRadius: '50%', background: C.PERIWINKLE_SOFT, color: C.BRAND_700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.6 13.4 13.4 20.6a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8zM7.5 7.5h.01" /></svg>
                </span>
                <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 24, fontWeight: 500, color: C.INK }}>No tags yet</div>
                <p style={{ margin: '6px 0 18px', fontSize: 16, color: C.GRAY_600 }}>Create tags to categorize and organize your leads.</p>
                <button type="button" onClick={function () { tagInputRef.current?.focus(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 44, padding: '0 20px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, fontSize: 16, fontFamily: C.FONT, cursor: 'pointer' }}>+ Create your first tag</button>
              </div>
            ) : (
              <div style={{ padding: '20px 24px' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 600, color: C.INK }}>Your tags</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {tags.map(function (t) {
                    return (
                      <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 6px 0 16px', borderRadius: 999, background: tint(t.color || C.ACCENT), color: t.color === '#C9D93F' ? C.INK : (t.color || C.ACCENT), fontSize: 15, fontWeight: 500 }}>
                        {t.name}
                        <button type="button" aria-label={'Remove tag ' + t.name} title="Remove tag" onClick={function () { deleteTag(t.id); }}
                          style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.7)', color: C.GRAY_600, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <section style={{ ...card, padding: '28px', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontFamily: C.DISPLAY_FONT, fontSize: 30, fontWeight: 500, letterSpacing: '-0.025em', color: C.INK }}>Create a segment</h2>
            <p style={{ margin: '6px 0 22px', fontSize: 16, color: C.GRAY_600 }}>Group leads for targeted campaigns and automations.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr) auto', gap: 16, alignItems: 'end' }}>
              <div><label htmlFor="sq-seg-name" style={label}>Segment name</label><input id="sq-seg-name" value={newSegName} onChange={function (e) { setNewSegName(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') createSegment(); }} placeholder="Enter segment name..." style={input} /></div>
              <div><label htmlFor="sq-seg-desc" style={label}>Description (optional)</label><input id="sq-seg-desc" value={newSegDesc} onChange={function (e) { setNewSegDesc(e.target.value); }} placeholder="Who belongs in this segment?" style={input} /></div>
              {addButton(createSegment, !newSegName.trim() || creating, creating ? 'Adding...' : 'Add segment')}
            </div>
          </section>
          <section style={{ ...card, marginBottom: 20 }}>
            {segments.length === 0 ? (
              <div style={{ padding: '44px 20px', textAlign: 'center' }}>
                <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 24, fontWeight: 500, color: C.INK }}>No segments yet</div>
                <p style={{ margin: '6px 0 0', fontSize: 16, color: C.GRAY_600 }}>Create a segment to target a group of leads in campaigns and automations.</p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {segments.map(function (sg, i) {
                  return (
                    <li key={sg.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderTop: i === 0 ? 'none' : '1px solid ' + C.BORDER_LIGHT }}>
                      <span style={{ width: 40, height: 40, borderRadius: 6, background: C.PERIWINKLE_SOFT, color: C.ACCENT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5" /></svg>
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: C.INK }}>{sg.name}</div>
                        {sg.description && <div style={{ fontSize: 14, color: C.GRAY_600, marginTop: 2 }}>{sg.description}</div>}
                      </div>
                      <span style={{ fontSize: 14, color: C.GRAY_600, whiteSpace: 'nowrap' }}>{(sg.cached_count || 0).toLocaleString()} {sg.cached_count === 1 ? 'lead' : 'leads'}</span>
                      <button type="button" onClick={function () { deleteSegment(sg.id); }} style={{ height: 36, padding: '0 14px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.DANGER, fontSize: 14, fontFamily: C.FONT, cursor: 'pointer' }}>Delete</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Tips */}
      <section className="sq-seg-tips" style={{ ...card, padding: '26px 0' }}>
        <div style={{ padding: '0 28px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', color: C.GRAY_600, marginBottom: 10 }}>TIPS</div>
          <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 28, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.05, color: C.INK }}>Get more from segmentation<span style={{ color: C.ACCENT }}>.</span></div>
        </div>
        {TIPS.map(function (t) {
          return (
            <div key={t.n} style={{ display: 'flex', gap: 18, padding: '0 28px' }}>
              <span style={{ width: 62, height: 62, borderRadius: 8, background: t.bg, color: C.INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon} /></svg>
              </span>
              <div><div style={{ fontSize: 17, fontWeight: 600, color: C.INK }}>{t.n}</div><div style={{ fontSize: 15, color: C.GRAY_600, lineHeight: 1.45, marginTop: 4 }}>{t.b}</div></div>
            </div>
          );
        })}
      </section>
    </DashboardShell>
  );
}

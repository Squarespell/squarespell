'use client';

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageHeader, Card, EmptyState, PrimaryButton, PageLoading, Pill } from '../_components/PageShell';

type Tag = { id: string; name: string; color: string; created_at: string };
type Segment = { id: string; name: string; description: string; rules: any[]; cached_count: number; created_at: string };

export default function SegmentationPage() {
  var { token, status } = useDashboardAuth();
  var [tags, setTags] = useState<Tag[]>([]);
  var [segments, setSegments] = useState<Segment[]>([]);
  var [loading, setLoading] = useState(true);
  var [tab, setTab] = useState<'tags' | 'segments'>('tags');
  var [newTagName, setNewTagName] = useState('');
  var [newTagColor, setNewTagColor] = useState('#0D7377');
  var [newSegName, setNewSegName] = useState('');
  var [newSegDesc, setNewSegDesc] = useState('');
  var [creating, setCreating] = useState(false);

  var apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

  useEffect(function() {
    if (!token) return;
    var cancelled = false;
    (async function() {
      try {
        var headers = { Authorization: 'Bearer ' + token };
        var [tagRes, segRes] = await Promise.all([
          fetch(apiBase + '/api/tags', { headers: headers }),
          fetch(apiBase + '/api/segments', { headers: headers }),
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
    return function() { cancelled = true; };
  }, [token]);

  async function createTag() {
    if (!newTagName.trim() || !token) return;
    setCreating(true);
    try {
      var res = await fetch(apiBase + '/api/tags', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });
      if (res.ok) {
        var data = await res.json();
        setTags(function(prev) { return [data.tag || data, ...prev]; });
        setNewTagName('');
      }
    } catch {}
    setCreating(false);
  }

  async function createSegment() {
    if (!newSegName.trim() || !token) return;
    setCreating(true);
    try {
      var res = await fetch(apiBase + '/api/segments', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSegName.trim(), description: newSegDesc, rules: [] }),
      });
      if (res.ok) {
        var data = await res.json();
        setSegments(function(prev) { return [data.segment || data, ...prev]; });
        setNewSegName('');
        setNewSegDesc('');
      }
    } catch {}
    setCreating(false);
  }

  async function deleteTag(id: string) {
    if (!token) return;
    await fetch(apiBase + '/api/tags/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    setTags(function(prev) { return prev.filter(function(t) { return t.id !== id; }); });
  }

  async function deleteSegment(id: string) {
    if (!token) return;
    await fetch(apiBase + '/api/segments/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    setSegments(function(prev) { return prev.filter(function(s) { return s.id !== id; }); });
  }

  if (status === 'loading') return <DashboardShell title="Segmentation"><PageLoading /></DashboardShell>;

  var tabStyle = function(active: boolean): React.CSSProperties {
    return {
      padding: '8px 16px',
      fontSize: 14,
      fontWeight: active ? 600 : 500,
      color: active ? C.ACCENT : C.GRAY_500,
      background: active ? C.ACCENT_LIGHT : 'transparent',
      border: '1px solid ' + (active ? C.ACCENT : C.GRAY_200),
      borderRadius: 8,
      cursor: 'pointer',
      fontFamily: C.FONT,
      transition: 'all 0.15s',
    };
  };

  var inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid ' + C.GRAY_300,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: C.FONT,
    color: C.GRAY_900,
    outline: 'none',
    flex: 1,
  };

  return (
    <DashboardShell title="Segmentation">
      <PageHeader
        title="Segmentation"
        subtitle="Organize leads with tags and dynamic segments"
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button type="button" style={tabStyle(tab === 'tags')} onClick={function() { setTab('tags'); }}>Tags</button>
        <button type="button" style={tabStyle(tab === 'segments')} onClick={function() { setTab('segments'); }}>Segments</button>
      </div>

      {loading ? (
        <PageLoading />
      ) : tab === 'tags' ? (
        <Card>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="New tag name..."
              value={newTagName}
              onChange={function(e) { setNewTagName(e.target.value); }}
              onKeyDown={function(e) { if (e.key === 'Enter') createTag(); }}
              style={inputStyle}
            />
            <input
              type="color"
              value={newTagColor}
              onChange={function(e) { setNewTagColor(e.target.value); }}
              style={{ width: 36, height: 36, border: '1px solid ' + C.GRAY_300, borderRadius: 8, cursor: 'pointer', padding: 2 }}
            />
            <PrimaryButton onClick={createTag} disabled={creating || !newTagName.trim()}>
              {creating ? 'Creating...' : 'Add tag'}
            </PrimaryButton>
          </div>

          {tags.length === 0 ? (
            <EmptyState
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_300} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
              }
              title="No tags yet"
              body="Create tags to categorize and organize your leads."
            />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tags.map(function(tag) {
                return (
                  <div
                    key={tag.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px',
                      borderRadius: 20,
                      background: tag.color + '15',
                      border: '1px solid ' + tag.color + '30',
                      fontSize: 13,
                      fontWeight: 500,
                      color: C.GRAY_700,
                      fontFamily: C.FONT,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
                    {tag.name}
                    <button
                      type="button"
                      onClick={function() { deleteTag(tag.id); }}
                      style={{ background: 'none', border: 'none', color: C.GRAY_400, cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1 }}
                      title="Remove tag"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Segment name..."
              value={newSegName}
              onChange={function(e) { setNewSegName(e.target.value); }}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newSegDesc}
              onChange={function(e) { setNewSegDesc(e.target.value); }}
              style={inputStyle}
            />
            <PrimaryButton onClick={createSegment} disabled={creating || !newSegName.trim()}>
              {creating ? 'Creating...' : 'Add segment'}
            </PrimaryButton>
          </div>

          {segments.length === 0 ? (
            <EmptyState
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_300} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
              }
              title="No segments yet"
              body="Create segments to group leads by shared criteria like quiz score, outcome, or tags."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {segments.map(function(seg) {
                return (
                  <div
                    key={seg.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      border: '1px solid ' + C.GRAY_200,
                      borderRadius: 10,
                      background: C.SURFACE,
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
                      onClick={function() { deleteSegment(seg.id); }}
                      style={{ background: 'none', border: '1px solid ' + C.GRAY_200, borderRadius: 8, color: C.GRAY_400, cursor: 'pointer', padding: '6px 12px', fontSize: 13, fontFamily: C.FONT }}
                    >
                      Delete
                    </button>
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

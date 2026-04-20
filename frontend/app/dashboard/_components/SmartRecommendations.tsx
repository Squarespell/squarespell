'use client';

/**
 * SmartRecommendations - fetches personalized tips from /api/user/recommendations
 * and displays them as actionable cards on the dashboard.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DASHBOARD_COLORS as C } from './DashboardShell';
import { useDashboardAuth } from './useDashboardAuth';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type Rec = {
  type: string;
  priority: number;
  title: string;
  body: string;
  actionUrl: string;
  actionLabel: string;
};

var ICONS: Record<string, string> = {
  create_quiz: 'M12 5v14M5 12h14',
  publish_draft: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  low_views: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
  low_conversion: 'M23 6l-9.5 9.5-5-5L1 18',
  brand_kit: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  add_sequence: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
  send_campaign: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  upgrade: 'M13 2L3 14h9l-1 8 10-12h-9l1-8',
};

export function SmartRecommendations() {
  var { token } = useDashboardAuth();
  var [recs, setRecs] = useState<Rec[]>([]);
  var [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(function() {
    if (!token) return;
    fetch(API + '/api/user/recommendations', { headers: { Authorization: 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (Array.isArray(data)) setRecs(data);
      })
      .catch(function() {});
  }, [token]);

  var visible = recs.filter(function(r) { return !dismissed.has(r.type); });
  if (visible.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.TEXT, letterSpacing: '-0.01em' }}>
          Recommended for you
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.slice(0, 3).map(function(rec) {
          var iconPath = ICONS[rec.type] || ICONS.create_quiz;
          return (
            <div
              key={rec.type}
              style={{
                background: C.ELEVATED,
                border: '1px solid ' + C.HAIRLINE,
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(13,115,119,0.06)',
                border: '1px solid rgba(13,115,119,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={iconPath} />
                </svg>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.TEXT, marginBottom: 3, letterSpacing: '-0.01em' }}>
                  {rec.title}
                </div>
                <div style={{ fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.5, marginBottom: 10 }}>
                  {rec.body}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Link
                    href={rec.actionUrl}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 16px',
                      borderRadius: 8,
                      background: C.ACCENT,
                      color: '#FFFFFF',
                      fontSize: 12.5,
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    {rec.actionLabel}
                  </Link>
                  <button
                    onClick={function() {
                      setDismissed(function(prev) { var next = new Set(prev); next.add(rec.type); return next; });
                    }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, color: C.TEXT_SUBTLE, fontFamily: 'inherit',
                      padding: '4px 8px',
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

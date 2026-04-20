'use client';

/**
 * LiveLeadFeed - polls /api/leads?since=... every 30s and shows new leads
 * with a subtle slide-in animation. Displays the 15 most recent leads.
 * Untitled UI-inspired styling.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { DASHBOARD_COLORS as C } from './DashboardShell';
import { useDashboardAuth } from './useDashboardAuth';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';
var POLL_INTERVAL_MS = 30000; // 30 seconds
var MAX_VISIBLE = 15;

type Lead = {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
  quiz_id: string;
  metadata?: Record<string, any> | null;
  quizzes?: { id: string; title: string; slug: string } | null;
};

function initialsFrom(lead: Lead): string {
  var source = lead.name || lead.email || '';
  var parts = source.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return 'SQ';
}

function timeAgo(dateStr: string): string {
  var d = new Date(dateStr);
  var now = new Date();
  var diffMs = now.getTime() - d.getTime();
  var mins = Math.floor(diffMs / 60000);
  var hrs = Math.floor(diffMs / 3600000);
  var days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  if (hrs < 24) return hrs + 'h ago';
  if (days < 7) return days + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function leadScore(lead: Lead): { label: string; variant: 'hot' | 'warm' | 'cold' } {
  var age = Date.now() - new Date(lead.created_at).getTime();
  var hourMs = 3600000;
  if (age < hourMs * 2) return { label: 'Hot', variant: 'hot' };
  if (age < hourMs * 24) return { label: 'Warm', variant: 'warm' };
  return { label: 'Cold', variant: 'cold' };
}

var scoreStyles: Record<string, { bg: string; fg: string; border: string }> = {
  hot: { bg: C.SUCCESS_LIGHT, fg: C.SUCCESS_700, border: 'rgba(18,183,106,0.15)' },
  warm: { bg: C.WARNING_LIGHT, fg: '#B54708', border: 'rgba(247,144,9,0.15)' },
  cold: { bg: C.GRAY_100, fg: C.GRAY_600, border: C.GRAY_200 },
};

export function LiveLeadFeed() {
  var { token } = useDashboardAuth();
  var [leads, setLeads] = useState<Lead[]>([]);
  var [newIds, setNewIds] = useState<Set<string>>(new Set());
  var latestTimestampRef = useRef<string | null>(null);
  var initialLoadDoneRef = useRef(false);

  // Initial load
  useEffect(function() {
    if (!token) return;
    fetch(API + '/api/leads?limit=15', { headers: { Authorization: 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (Array.isArray(data) && data.length > 0) {
          setLeads(data);
          latestTimestampRef.current = data[0].created_at;
        }
        initialLoadDoneRef.current = true;
      })
      .catch(function() { initialLoadDoneRef.current = true; });
  }, [token]);

  // Polling for new leads
  useEffect(function() {
    if (!token || !initialLoadDoneRef.current) return;

    var interval = setInterval(function() {
      var since = latestTimestampRef.current;
      if (!since) return;
      var url = API + '/api/leads?limit=10&since=' + encodeURIComponent(since);
      fetch(url, { headers: { Authorization: 'Bearer ' + token } })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!Array.isArray(data) || data.length === 0) return;
          latestTimestampRef.current = data[0].created_at;

          var ids = new Set<string>();
          for (var i = 0; i < data.length; i++) { ids.add(data[i].id); }
          setNewIds(ids);

          setLeads(function(prev) {
            var merged = data.concat(prev);
            return merged.slice(0, MAX_VISIBLE);
          });

          setTimeout(function() { setNewIds(new Set()); }, 3000);
        })
        .catch(function() {});
    }, POLL_INTERVAL_MS);

    return function() { clearInterval(interval); };
  }, [token]);

  if (leads.length === 0) {
    return (
      <div style={{
        padding: '32px 20px',
        textAlign: 'center',
        color: C.GRAY_500,
        fontSize: 14,
        fontFamily: C.FONT,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_400} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10, display: 'block', margin: '0 auto 10px' }}>
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
        Waiting for your first lead. They will appear here in real time.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.GRAY_900, letterSpacing: '-0.01em', fontFamily: C.FONT }}>
            Recent leads
          </span>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: C.SUCCESS_500,
            display: 'inline-block',
            boxShadow: '0 0 0 3px rgba(18,183,106,0.15)',
          }} />
        </div>
        <Link href="/dashboard/leads" style={{ fontSize: 14, fontWeight: 600, color: C.ACCENT, textDecoration: 'none', fontFamily: C.FONT }}>
          View all
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {leads.slice(0, 5).map(function(lead) {
          var isNew = newIds.has(lead.id);
          var score = leadScore(lead);
          var sc = scoreStyles[score.variant];
          return (
            <div
              key={lead.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderTop: '1px solid ' + C.GRAY_100,
                background: isNew ? 'rgba(13,115,119,0.02)' : 'transparent',
                transition: 'all 0.5s ease',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: C.BRAND_50, color: C.ACCENT,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, flexShrink: 0, fontFamily: C.FONT,
              }}>
                {initialsFrom(lead)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 500, color: C.GRAY_900,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  fontFamily: C.FONT,
                }}>
                  {lead.name || lead.email}
                </div>
                <div style={{
                  fontSize: 13, color: C.GRAY_500, marginTop: 1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  fontFamily: C.FONT,
                }}>
                  {lead.name ? lead.email : (lead.quizzes?.title || 'Quiz')}
                </div>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 500,
                padding: '2px 10px', borderRadius: 16,
                whiteSpace: 'nowrap',
                background: sc.bg, color: sc.fg,
                border: '1px solid ' + sc.border,
                fontFamily: C.FONT,
              }}>
                {score.label}
              </span>
              <span style={{ fontSize: 13, color: C.GRAY_400, fontVariantNumeric: 'tabular-nums', flexShrink: 0, minWidth: 50, textAlign: 'right', fontFamily: C.FONT }}>
                {timeAgo(lead.created_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

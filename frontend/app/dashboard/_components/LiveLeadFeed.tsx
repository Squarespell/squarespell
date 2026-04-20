'use client';

/**
 * LiveLeadFeed - polls /api/leads?since=... every 30s and shows new leads
 * with a subtle slide-in animation. Displays the 15 most recent leads.
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

          // Track new IDs for animation
          var ids = new Set<string>();
          for (var i = 0; i < data.length; i++) { ids.add(data[i].id); }
          setNewIds(ids);

          // Prepend new leads, keep max visible
          setLeads(function(prev) {
            var merged = data.concat(prev);
            return merged.slice(0, MAX_VISIBLE);
          });

          // Clear "new" highlight after animation
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
        color: C.TEXT_MUTED,
        fontSize: 13.5,
        border: '1px dashed ' + C.HAIRLINE,
        borderRadius: 12,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.TEXT_SUBTLE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10, display: 'block', margin: '0 auto 10px' }}>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: C.TEXT, letterSpacing: '-0.02em' }}>
            Live lead feed
          </h3>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#4cd964',
            display: 'inline-block',
            boxShadow: '0 0 0 3px rgba(76,217,100,0.15)',
          }} />
        </div>
        <Link href="/dashboard/leads" style={{ fontSize: 12, color: C.TEXT_MUTED, textDecoration: 'none', fontWeight: 500 }}>
          View all leads
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {leads.map(function(lead) {
          var isNew = newIds.has(lead.id);
          return (
            <div
              key={lead.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 12px',
                borderRadius: 10,
                background: isNew ? 'rgba(13,115,119,0.04)' : 'transparent',
                borderLeft: isNew ? '3px solid ' + C.ACCENT : '3px solid transparent',
                transition: 'all 0.5s ease',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: C.SIDEBAR, border: '1px solid ' + C.BORDER,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11.5, fontWeight: 600, color: C.TEXT, flexShrink: 0,
              }}>
                {initialsFrom(lead)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: C.TEXT,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {lead.name || lead.email}
                </div>
                <div style={{
                  fontSize: 11.5, color: C.TEXT_MUTED, marginTop: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {lead.quizzes?.title || 'Quiz'}
                  {lead.metadata?.device_type ? ' - ' + lead.metadata.device_type : ''}
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.TEXT_SUBTLE, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {timeAgo(lead.created_at)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

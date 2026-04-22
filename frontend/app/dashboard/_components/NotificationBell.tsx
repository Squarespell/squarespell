'use client';

/**
 * NotificationBell - topbar bell icon with unread count badge and dropdown.
 *
 * Polls /api/user/notifications/unread-count every 30 seconds.
 * On click, opens a dropdown showing recent notifications.
 * Supports mark-as-read (individual) and mark-all-as-read.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { DASHBOARD_COLORS as C } from './DashboardShell';
import { useDashboardAuth } from './useDashboardAuth';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';
var POLL_INTERVAL = 30000;

type NotifItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  read: boolean;
  metadata: Record<string, any>;
  created_at: string;
};

var ICON_PATHS: Record<string, string> = {
  new_lead: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM22 8l-4 4-2-2',
  lead_milestone: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  quiz_published: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  campaign_sent: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
  system: 'M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zM18 16v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.93 6 11v5l-2 2v1h16v-1l-2-2z',
};

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

function notifColor(type: string): string {
  switch (type) {
    case 'new_lead': return C.ACCENT;
    case 'lead_milestone': return '#ff9500';
    case 'quiz_published': return '#4cd964';
    case 'campaign_sent': return '#5856d6';
    default: return C.TEXT_MUTED;
  }
}

export function NotificationBell() {
  var { token } = useDashboardAuth();
  var [unreadCount, setUnreadCount] = useState(0);
  var [open, setOpen] = useState(false);
  var [notifications, setNotifications] = useState<NotifItem[]>([]);
  var [loading, setLoading] = useState(false);
  var dropdownRef = useRef<HTMLDivElement>(null);

  // Poll unread count
  var fetchCount = useCallback(function() {
    if (!token) return;
    fetch(API + '/api/user/notifications/unread-count', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (typeof data.unread_count === 'number') setUnreadCount(data.unread_count);
      })
      .catch(function() {});
  }, [token]);

  useEffect(function() {
    fetchCount();
    var interval = setInterval(fetchCount, POLL_INTERVAL);
    return function() { clearInterval(interval); };
  }, [fetchCount]);

  // Fetch full list when dropdown opens
  function fetchNotifications() {
    if (!token) return;
    setLoading(true);
    fetch(API + '/api/user/notifications/list?limit=20', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var items = Array.isArray(data.notifications) ? data.notifications : [];
        setNotifications(items);
        // Always derive unread count from actual items to avoid badge/content mismatch
        var unread = items.filter(function(n: NotifItem) { return !n.read; }).length;
        setUnreadCount(unread);
      })
      .catch(function() {})
      .finally(function() { setLoading(false); });
  }

  function handleToggle() {
    if (!open) fetchNotifications();
    setOpen(!open);
  }

  function handleMarkRead(id: string) {
    if (!token) return;
    fetch(API + '/api/user/notifications/' + id + '/read', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    }).catch(function() {});
    setNotifications(function(prev) {
      return prev.map(function(n) { return n.id === id ? Object.assign({}, n, { read: true }) : n; });
    });
    setUnreadCount(function(prev) { return Math.max(prev - 1, 0); });
  }

  function handleMarkAllRead() {
    if (!token) return;
    fetch(API + '/api/user/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    }).catch(function() {});
    setNotifications(function(prev) {
      return prev.map(function(n) { return Object.assign({}, n, { read: true }); });
    });
    setUnreadCount(0);
  }

  // Close dropdown on outside click
  useEffect(function() {
    function handleClick(e: MouseEvent) {
      if (open && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, [open]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        type="button"
        onClick={handleToggle}
        style={{
          width: 36, height: 36, borderRadius: 10,
          background: open ? C.ACCENT_LIGHT : 'transparent',
          border: '1px solid ' + (open ? 'rgba(13,115,119,0.25)' : 'transparent'),
          color: open ? C.ACCENT : C.TEXT_MUTED,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.15s ease',
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: unreadCount > 9 ? 18 : 16,
            height: 16,
            borderRadius: 10,
            background: '#ff3b30',
            color: '#FFFFFF',
            fontSize: 9,
            fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 42, right: 0,
          width: 380, maxHeight: 480,
          background: C.ELEVATED,
          border: '1px solid ' + C.BORDER,
          borderRadius: 14,
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          zIndex: 50,
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid ' + C.HAIRLINE,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.TEXT }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 8, fontSize: 11, fontWeight: 600,
                  padding: '2px 8px', borderRadius: 10,
                  background: 'rgba(255,59,48,0.1)', color: '#ff3b30',
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: C.ACCENT, fontWeight: 600,
                  fontFamily: '"DM Sans",system-ui,sans-serif',
                  padding: '4px 8px',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && notifications.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: C.TEXT_MUTED, fontSize: 13 }}>
                Loading...
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: C.TEXT_MUTED, fontSize: 13 }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_SUBTLE}
                  strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
                  style={{ margin: '0 auto 10px', display: 'block' }}>
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                No notifications yet
              </div>
            )}

            {notifications.map(function(notif) {
              var iconPath = ICON_PATHS[notif.type] || ICON_PATHS.system;
              var color = notifColor(notif.type);

              var content = (
                <div
                  key={notif.id}
                  onClick={function() { if (!notif.read) handleMarkRead(notif.id); }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 16px',
                    background: notif.read ? 'transparent' : 'rgba(13,115,119,0.03)',
                    borderBottom: '1px solid ' + C.HAIRLINE,
                    cursor: notif.action_url ? 'pointer' : 'default',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={function(e) { e.currentTarget.style.background = C.SIDEBAR; }}
                  onMouseLeave={function(e) { e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(13,115,119,0.03)'; }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: color + '12',
                    border: '1px solid ' + color + '25',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color}
                      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d={iconPath} />
                    </svg>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: notif.read ? 500 : 700, color: C.TEXT,
                      marginBottom: 2,
                    }}>
                      {notif.title}
                    </div>
                    {notif.body && (
                      <div style={{
                        fontSize: 12, color: C.TEXT_MUTED, lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                      }}>
                        {notif.body}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: C.TEXT_SUBTLE, marginTop: 4 }}>
                      {timeAgo(notif.created_at)}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!notif.read && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: C.ACCENT, flexShrink: 0, marginTop: 4,
                    }} />
                  )}
                </div>
              );

              if (notif.action_url) {
                return (
                  <Link
                    key={notif.id}
                    href={notif.action_url}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                    onClick={function() { if (!notif.read) handleMarkRead(notif.id); setOpen(false); }}
                  >
                    {content}
                  </Link>
                );
              }
              return content;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

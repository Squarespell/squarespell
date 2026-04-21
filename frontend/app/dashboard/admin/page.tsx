'use client';

/**
 * /dashboard/admin - Redirect to standalone admin dashboard
 *
 * The admin dashboard now lives at admin.squarespell.com.
 * This page exists only as a redirect for anyone who bookmarked the old URL.
 */

import { useEffect } from 'react';

export default function AdminRedirect() {
  useEffect(function() {
    window.location.href = 'https://admin.squarespell.com';
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <p style={{ fontSize: 14, color: '#667085' }}>Redirecting to admin dashboard...</p>
    </div>
  );
}

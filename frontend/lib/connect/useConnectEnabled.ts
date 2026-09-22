'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

/**
 * True when the one-button connect feature is enabled on the server (CONNECT_ENABLED). Asked once per page load and cached.
 * Anything unexpected (network error, signed out, feature off) is false, so the original interface is shown.
 */
let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

export function useConnectEnabled(): boolean {
  const { getToken } = useAuth();
  const [enabled, setEnabled] = useState<boolean>(cached === true);
  useEffect(() => {
    if (cached !== null) { setEnabled(cached); return; }
    let cancelled = false;
    inflight ||= (async () => {
      try {
        const token = await getToken();
        if (!token) return false;
        const base = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';
        const r = await fetch(base + '/api/connect/config', { headers: { Authorization: 'Bearer ' + token } });
        const d = r.ok ? await r.json() : { enabled: false };
        cached = !!(d && d.enabled);
      } catch { cached = false; }
      return cached === true;
    })();
    inflight.then((v) => { if (!cancelled) setEnabled(v); });
    return () => { cancelled = true; };
  }, [getToken]);
  return enabled;
}

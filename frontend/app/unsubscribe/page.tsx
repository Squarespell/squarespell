'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'subscribed' | 'unsubscribed' | 'error'>('loading');
  const [working, setWorking] = useState(false);
  const [resolvedEmail, setResolvedEmail] = useState(email);

  useEffect(() => {
    // Decode token if present
    let e = email;
    if (token && !email) {
      try {
        const decoded = JSON.parse(atob(token.replace(/-/g, '+').replace(/_/g, '/')));
        e = decoded.email || '';
        setResolvedEmail(e);
      } catch {
        setStatus('error');
        return;
      }
    }
    if (!e) {
      setStatus('error');
      return;
    }
    // Check current status
    fetch(`${API}/api/public/unsubscribe/status?email=${encodeURIComponent(e)}`)
      .then(r => r.json())
      .then(data => setStatus(data.unsubscribed ? 'unsubscribed' : 'subscribed'))
      .catch(() => setStatus('error'));
  }, [email, token]);

  async function handleUnsubscribe() {
    setWorking(true);
    try {
      const res = await fetch(`${API}/api/public/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resolvedEmail }),
      });
      if (res.ok) setStatus('unsubscribed');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
    setWorking(false);
  }

  async function handleResubscribe() {
    setWorking(true);
    try {
      const res = await fetch(`${API}/api/public/resubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resolvedEmail }),
      });
      if (res.ok) setStatus('subscribed');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
    setWorking(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07090c',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: '24px',
    }}>
      <div style={{
        background: '#0f1219',
        borderRadius: '16px',
        padding: '48px 40px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ color: '#D2FF1D', fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase' as const, marginBottom: '24px', fontWeight: 700 }}>
          Squarespell
        </div>

        {status === 'loading' && (
          <p style={{ color: '#888', fontSize: '15px' }}>Loading preferences...</p>
        )}

        {status === 'error' && (
          <>
            <h1 style={{ color: '#f0f2f5', fontSize: '24px', marginBottom: '16px' }}>Invalid Link</h1>
            <p style={{ color: '#888', fontSize: '15px' }}>This unsubscribe link is invalid or expired.</p>
          </>
        )}

        {status === 'subscribed' && (
          <>
            <h1 style={{ color: '#f0f2f5', fontSize: '24px', marginBottom: '16px' }}>Email Preferences</h1>
            <p style={{ color: '#a0a0b0', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
              Unsubscribe <strong style={{ color: '#f0f2f5' }}>{resolvedEmail}</strong> from all Squarespell emails?
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={working}
              style={{
                padding: '14px 32px',
                background: '#D2FF1D',
                color: '#07090c',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '16px',
                cursor: working ? 'wait' : 'pointer',
                opacity: working ? 0.7 : 1,
              }}
            >
              {working ? 'Processing...' : 'Confirm Unsubscribe'}
            </button>
          </>
        )}

        {status === 'unsubscribed' && (
          <>
            <h1 style={{ color: '#f0f2f5', fontSize: '24px', marginBottom: '16px' }}>Unsubscribed</h1>
            <p style={{ color: '#a0a0b0', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
              <strong style={{ color: '#f0f2f5' }}>{resolvedEmail}</strong> has been unsubscribed from all Squarespell emails.
            </p>
            <p style={{ color: '#666', fontSize: '13px', marginBottom: '24px' }}>
              Changed your mind?
            </p>
            <button
              onClick={handleResubscribe}
              disabled={working}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: '#D2FF1D',
                border: '1px solid #D2FF1D',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: working ? 'wait' : 'pointer',
                opacity: working ? 0.7 : 1,
              }}
            >
              {working ? 'Processing...' : 'Resubscribe'}
            </button>
          </>
        )}

        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #1a1f2e', fontSize: '12px', color: '#666' }}>
          <a href="https://squarespell.com" style={{ color: '#D2FF1D', textDecoration: 'none' }}>squarespell.com</a>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#07090c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888', fontFamily: 'sans-serif' }}>Loading...</p>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}

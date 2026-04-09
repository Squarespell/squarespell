'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';
const ACC = '#D2FF1D';
const BG = '#07090c';

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function clearCookie(name: string) {
  document.cookie = `${name}=;path=/;max-age=0`;
}

function DashboardInner() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [src, setSrc] = useState('');
  const [status, setStatus] = useState<'loading' | 'trial' | 'active' | 'expired'>('loading');
  const [daysLeft, setDaysLeft] = useState(0);
  const [loadMsg, setLoadMsg] = useState('Loading your dashboard...');

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    let attempts = 0;

    async function init() {
      // Retry token acquisition — Clerk may need a moment after SSO callback
      let token: string | null = null;
      while (!token && attempts < 8 && !cancelled) {
        attempts++;
        try {
          token = await getToken();
        } catch {}
        if (!token) {
          setLoadMsg(attempts > 2 ? 'Connecting to server...' : 'Loading your dashboard...');
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      if (cancelled || !token) {
        if (!cancelled) {
          const reloadCount = parseInt(sessionStorage.getItem('sq_reload_count') || '0');
          if (reloadCount < 2) {
            sessionStorage.setItem('sq_reload_count', String(reloadCount + 1));
            setLoadMsg('Having trouble loading. Refreshing...');
            await new Promise(r => setTimeout(r, 1000));
            window.location.reload();
          } else {
            sessionStorage.removeItem('sq_reload_count');
            setLoadMsg('Could not connect. Please try signing out and back in.');
          }
        }
        return;
      }
      try { sessionStorage.removeItem('sq_reload_count'); } catch {}

      // ── Claim preview quiz if coming from /try → sign-up flow ──────────
      let quizClaimed = false;
      try {
        // Strategy 1: Claim token from URL param (most reliable)
        let claimToken = searchParams.get('claim') || '';

        // Strategy 2: Claim token from cookie (survives OAuth redirects)
        if (!claimToken) {
          claimToken = getCookie('sq_claim');
        }

        // Strategy 3: Claim token from sessionStorage
        if (!claimToken) {
          claimToken = sessionStorage.getItem('sq_claim_token') || '';
        }

        // Strategy 4: From localStorage preview data
        if (!claimToken) {
          try {
            const raw = localStorage.getItem('squarespell_preview');
            if (raw) {
              const preview = JSON.parse(raw);
              claimToken = preview.claim_token || '';
            }
          } catch {}
        }

        console.log('[Squarespell] Claim token found:', !!claimToken);

        if (claimToken) {
          setLoadMsg('Publishing your quiz...');
          console.log('[Squarespell] Claiming quiz with token:', claimToken.slice(0, 8) + '...');

          const claimRes = await fetch(`${API}/api/claim-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ claim_token: claimToken }),
          });
          const claimData = await claimRes.json();
          console.log('[Squarespell] Claim response:', claimRes.status, claimData);

          if (claimRes.ok && claimData.claimed) {
            quizClaimed = true;
            setLoadMsg('Quiz published! Loading dashboard...');
          }

          // Clean up all claim token storage
          clearCookie('sq_claim');
          try { sessionStorage.removeItem('sq_claim_token'); } catch {}
          try { localStorage.removeItem('squarespell_preview'); } catch {}
        } else {
          // Fallback: try the old localStorage save-preview approach
          const raw = localStorage.getItem('squarespell_preview') || sessionStorage.getItem('squarespell_preview');
          if (raw) {
            const preview = JSON.parse(raw);
            if (preview.quiz && preview.url && Date.now() - preview.createdAt < 14400000) {
              setLoadMsg('Publishing your quiz...');
              const saveRes = await fetch(`${API}/api/save-preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ quiz: preview.quiz, brand: preview.brand, url: preview.url }),
              });
              const saveData = await saveRes.json();
              if (saveRes.ok && saveData.saved) {
                quizClaimed = true;
                setLoadMsg('Quiz published! Loading dashboard...');
              }
            }
            localStorage.removeItem('squarespell_preview');
            sessionStorage.removeItem('squarespell_preview');
          }
        }
      } catch (e) {
        console.error('[Squarespell] Claim/save failed:', e);
      }

      // Wait for DB to propagate
      if (quizClaimed) {
        await new Promise(r => setTimeout(r, 1500));
      }

      // Fetch plan info with retry
      for (let i = 0; i < 3 && !cancelled; i++) {
        try {
          const ctrl = new AbortController();
          const timeout = setTimeout(() => ctrl.abort(), 15000);
          const res = await fetch(`${API}/api/user/plan`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: ctrl.signal,
          });
          clearTimeout(timeout);

          if (!res.ok) throw new Error(`${res.status}`);
          const data = await res.json();
          if (cancelled) return;

          const plan = data.plan || 'trial';
          const trialEnds = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
          const now = new Date();

          if (plan !== 'trial') {
            setStatus('active');
          } else if (trialEnds && now > trialEnds) {
            setStatus('expired');
          } else {
            const days = trialEnds ? Math.ceil((trialEnds.getTime() - now.getTime()) / 86400000) : 7;
            setDaysLeft(days);
            setStatus('trial');
          }

          setSrc(`/squarespell-app.html?t=${encodeURIComponent(token)}`);
          return;
        } catch {
          if (i < 2) {
            setLoadMsg('Connecting to server...');
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      }

      if (!cancelled) {
        setStatus('trial');
        setDaysLeft(7);
        setSrc(`/squarespell-app.html?t=${encodeURIComponent(token)}`);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken, searchParams]);

  // Loading state
  if (status === 'loading') return (
    <div style={{ background: BG, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', fontFamily: 'DM Sans,system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <div style={{ width: '32px', height: '32px', background: ACC, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#07090c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <span style={{ fontSize: '18px', fontWeight: 700, color: '#f0f2f5', letterSpacing: '-0.03em' }}>Squarespell</span>
      </div>
      <div style={{ width: '32px', height: '32px', border: '2.5px solid rgba(210,255,29,.15)', borderTopColor: ACC, borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
      <p style={{ fontSize: '14px', color: 'rgba(240,242,245,.45)', margin: 0 }}>{loadMsg}</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // Trial expired
  if (status === 'expired') return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans",system-ui,sans-serif' }}>
      <div style={{ maxWidth: '440px', width: '100%', padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '40px' }}>
          <div style={{ width: '32px', height: '32px', background: ACC, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#07090c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#f0f2f5', letterSpacing: '-0.03em' }}>Squarespell</span>
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.04em', marginBottom: '12px' }}>Your free trial has ended</h1>
        <p style={{ fontSize: '15px', color: 'rgba(240,242,245,0.5)', lineHeight: 1.6, marginBottom: '36px' }}>Upgrade to keep access to your quizzes, leads, and analytics. Your data is safe.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
          <a href="/pricing" style={{ display: 'block', padding: '16px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#f0f2f5', textDecoration: 'none', fontSize: '15px', fontWeight: 600 }}>Starter — $19/mo</a>
          <a href="/pricing" style={{ display: 'block', padding: '16px', background: ACC, border: 'none', borderRadius: '12px', color: BG, textDecoration: 'none', fontSize: '15px', fontWeight: 700 }}>Pro — $39/mo — Recommended</a>
          <a href="/pricing" style={{ display: 'block', padding: '16px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#f0f2f5', textDecoration: 'none', fontSize: '15px', fontWeight: 600 }}>Agency — $79/mo</a>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(240,242,245,0.25)' }}>Questions? <a href="mailto:info@squarespell.com" style={{ color: 'rgba(240,242,245,0.4)', textDecoration: 'none' }}>info@squarespell.com</a></p>
      </div>
    </div>
  );

  // Dashboard with trial/active banner
  return (
    <>
      {status === 'trial' && (
        <div style={{
          background: daysLeft <= 3 ? 'rgba(210,255,29,0.06)' : '#111623',
          borderBottom: `1px solid ${daysLeft <= 3 ? 'rgba(210,255,29,0.15)' : 'rgba(255,255,255,0.06)'}`,
          padding: '10px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'DM Sans,system-ui,sans-serif', flexWrap: 'wrap', gap: '8px',
        }}>
          <span style={{ fontSize: '14px', color: 'rgba(240,242,245,0.7)' }}>
            {daysLeft <= 3
              ? <><span style={{ color: ACC, fontWeight: 700 }}>⚡ {daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span> on your free trial</>
              : <>Free trial · <strong style={{ color: '#f0f2f5' }}>{daysLeft} days</strong> remaining</>
            }
          </span>
          <button onClick={() => router.push('/pricing')} style={{
            background: daysLeft <= 3 ? ACC : 'rgba(255,255,255,0.08)',
            color: daysLeft <= 3 ? BG : '#f0f2f5',
            border: 'none', borderRadius: '8px', padding: '7px 18px',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            fontFamily: 'DM Sans,system-ui,sans-serif',
          }}>
            {daysLeft <= 3 ? 'Upgrade now' : 'View plans'}
          </button>
        </div>
      )}
      {src && (
        <iframe
          src={src}
          style={{
            width: '100%',
            height: status === 'trial' ? 'calc(100vh - 42px)' : '100vh',
            border: 'none', display: 'block',
          }}
          title="Squarespell Dashboard"
        />
      )}
    </>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div style={{ background: '#07090c', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2.5px solid rgba(210,255,29,.15)', borderTopColor: '#D2FF1D', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}

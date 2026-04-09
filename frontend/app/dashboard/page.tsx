'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';
const ACC = '#D2FF1D';
const BG = '#07090c';

export default function Dashboard() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [src, setSrc] = useState('');
  const [status, setStatus] = useState<'loading' | 'trial' | 'active' | 'expired'>('loading');
  const [daysLeft, setDaysLeft] = useState(0);
  const [loadMsg, setLoadMsg] = useState('Loading your dashboard...');

  // Redirect to sign-in if not authenticated (after Clerk finishes loading)
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
          // Check if we already tried reloading (prevent infinite loop)
          const reloadCount = parseInt(sessionStorage.getItem('sq_reload_count') || '0');
          if (reloadCount < 2) {
            sessionStorage.setItem('sq_reload_count', String(reloadCount + 1));
            setLoadMsg('Having trouble loading. Refreshing...');
            await new Promise(r => setTimeout(r, 1000));
            window.location.reload();
          } else {
            // Give up on auto-reload, show manual option
            sessionStorage.removeItem('sq_reload_count');
            setLoadMsg('Could not connect. Please try signing out and back in.');
          }
        }
        return;
      }
      // Clear reload counter on success
      try { sessionStorage.removeItem('sq_reload_count'); } catch {}

      // Auto-save preview quiz if coming from /try → sign-up flow
      let previewSaved = false;
      try {
        // Check both localStorage and sessionStorage (belt and suspenders)
        const raw = localStorage.getItem('squarespell_preview') || sessionStorage.getItem('squarespell_preview');
        console.log('[Squarespell] Preview data found:', !!raw);
        if (raw) {
          const preview = JSON.parse(raw);
          // Only save if created within the last 4 hours
          if (preview.quiz && preview.url && Date.now() - preview.createdAt < 14400000) {
            setLoadMsg('Publishing your quiz...');
            console.log('[Squarespell] Saving preview quiz for:', preview.url);
            const saveRes = await fetch(`${API}/api/save-preview`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ quiz: preview.quiz, brand: preview.brand, url: preview.url }),
            });
            const saveData = await saveRes.json();
            console.log('[Squarespell] Save response:', saveRes.status, saveData);
            if (saveRes.ok) {
              previewSaved = saveData.saved === true;
              if (previewSaved) setLoadMsg('Quiz published! Loading dashboard...');
            }
          } else {
            console.log('[Squarespell] Preview data too old or missing quiz/url');
          }
          // Only remove AFTER successful save
          if (previewSaved) {
            localStorage.removeItem('squarespell_preview');
            sessionStorage.removeItem('squarespell_preview');
          }
        }
      } catch (e) {
        console.error('[Squarespell] Preview save failed:', e);
      }

      // Wait for DB write to propagate before iframe fetches quizzes
      if (previewSaved) {
        await new Promise(r => setTimeout(r, 1200));
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
          return; // Success
        } catch {
          if (i < 2) {
            setLoadMsg('Connecting to server...');
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      }

      // All retries failed — still show the dashboard, just default to trial
      if (!cancelled) {
        setStatus('trial');
        setDaysLeft(7);
        setSrc(`/squarespell-app.html?t=${encodeURIComponent(token)}`);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken]);

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

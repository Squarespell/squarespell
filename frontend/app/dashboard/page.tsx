'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useClerk } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';
const COLORS = {
  BG: '#07090c',
  SURFACE: '#0d1117',
  ELEVATED: '#161b22',
  BORDER: '#1b1f27',
  TEXT: '#f0f2f5',
  TEXT_MUTED: '#8b919a',
  ACCENT: '#D2FF1D',
};

type Quiz = {
  id: string;
  title: string;
  status: 'live' | 'draft';
  slug: string;
  lead_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
};

type UserPlan = {
  plan: 'trial' | 'starter' | 'pro' | 'agency';
  quiz_count: number;
  limits: Record<string, number>;
  trial_ends_at: string | null;
  email: string;
};

type Analytics = {
  views: number;
  completions: number;
  leads: number;
  completion_rate: number;
  lead_rate: number;
};

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;path=/;max-age=0`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', height: '100%' }}>
      <div style={{ width: '32px', height: '32px', border: `2.5px solid rgba(210,255,29,0.15)`, borderTopColor: COLORS.ACCENT, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      padding: '20px',
      borderRadius: '12px',
      background: COLORS.ELEVATED,
      border: `1px solid ${COLORS.BORDER}`,
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    }}>
      <div style={{ height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '12px' }} />
      <div style={{ height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', width: '60%' }} />
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}

function EmbedModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const embedCode = `<script src="https://app.squarespell.com/embed.js" data-quiz="${slug}"><\/script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      fontFamily: '"DM Sans",system-ui,sans-serif',
    }}>
      <div style={{
        background: COLORS.ELEVATED,
        border: `1px solid ${COLORS.BORDER}`,
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 700, color: COLORS.TEXT }}>Embed this quiz</h2>
        <p style={{ fontSize: '14px', color: COLORS.TEXT_MUTED, marginBottom: '20px' }}>Copy and paste this snippet into your website</p>
        <div style={{
          background: COLORS.SURFACE,
          border: `1px solid ${COLORS.BORDER}`,
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '20px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: COLORS.TEXT_MUTED,
          overflowX: 'auto',
          wordBreak: 'break-all',
        }}>
          {embedCode}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: COLORS.ACCENT,
              color: COLORS.BG,
              border: 'none',
              borderRadius: 100,
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: '"DM Sans",system-ui,sans-serif',
            }}
          >
            {copied ? 'Copied!' : 'Copy code'}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: COLORS.SURFACE,
              color: COLORS.TEXT,
              border: `1px solid ${COLORS.BORDER}`,
              borderRadius: 100,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: '"DM Sans",system-ui,sans-serif',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'trial' | 'active' | 'expired'>('loading');
  const [daysLeft, setDaysLeft] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({ views: 0, completions: 0, leads: 0, completion_rate: 0, lead_rate: 0 });
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [activeTab, setActiveTab] = useState<'quizzes' | 'analytics' | 'settings'>('quizzes');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [embedSlug, setEmbedSlug] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    async function init() {
      let retrievedToken: string | null = null;
      let attempts = 0;

      while (!retrievedToken && attempts < 8 && !cancelled) {
        attempts++;
        try {
          retrievedToken = await getToken();
        } catch {}
        if (!retrievedToken) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      if (cancelled || !retrievedToken) {
        if (!cancelled) {
          const reloadCount = parseInt(sessionStorage.getItem('sq_reload_count') || '0');
          if (reloadCount < 2) {
            sessionStorage.setItem('sq_reload_count', String(reloadCount + 1));
            await new Promise(r => setTimeout(r, 1000));
            window.location.reload();
          }
        }
        return;
      }

      try { sessionStorage.removeItem('sq_reload_count'); } catch {}
      setToken(retrievedToken);

      let quizClaimed = false;
      let claimedQuizId = '';
      try {
        let claimToken = searchParams.get('claim') || '';
        if (!claimToken) claimToken = getCookie('sq_claim');
        if (!claimToken) claimToken = sessionStorage.getItem('sq_claim_token') || '';

        // Always read full preview payload as a fallback in case cache is gone on the backend
        let previewPayload: any = null;
        try {
          const raw = localStorage.getItem('squarespell_preview') || sessionStorage.getItem('squarespell_preview');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.quiz && parsed?.url && Date.now() - (parsed.createdAt || 0) < 14400000) {
              previewPayload = parsed;
              if (!claimToken) claimToken = parsed.claim_token || '';
            }
          }
        } catch {}

        if (claimToken || previewPayload) {
          console.log('[Squarespell] Attempting claim-quiz', { hasToken: !!claimToken, hasPayload: !!previewPayload });
          const claimRes = await fetch(`${API}/api/claim-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${retrievedToken}` },
            body: JSON.stringify({
              claim_token: claimToken,
              quiz: previewPayload?.quiz,
              brand: previewPayload?.brand,
              url: previewPayload?.url,
            }),
          });
          const claimData = await claimRes.json().catch(() => ({}));
          console.log('[Squarespell] Claim response', claimRes.status, claimData);
          if (claimRes.ok && claimData.claimed) {
            quizClaimed = true;
            claimedQuizId = claimData.quiz_id || '';
          } else if (previewPayload) {
            // Last-ditch fallback: save-preview endpoint
            const saveRes = await fetch(`${API}/api/save-preview`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${retrievedToken}` },
              body: JSON.stringify({ quiz: previewPayload.quiz, brand: previewPayload.brand, url: previewPayload.url }),
            });
            const saveData = await saveRes.json().catch(() => ({}));
            console.log('[Squarespell] Save-preview response', saveRes.status, saveData);
            if (saveRes.ok && saveData.saved) {
              quizClaimed = true;
              claimedQuizId = saveData.quiz_id || '';
            }
          }

          clearCookie('sq_claim');
          try { sessionStorage.removeItem('sq_claim_token'); } catch {}
          try { localStorage.removeItem('squarespell_preview'); sessionStorage.removeItem('squarespell_preview'); } catch {}
        }
      } catch (e) {
        console.error('[Squarespell] Claim/save failed:', e);
      }

      if (quizClaimed) {
        // Stage 6: route the user straight into the editor for publishing.
        if (claimedQuizId) {
          router.replace(`/dashboard/${claimedQuizId}?justClaimed=1`);
          return;
        }
        await new Promise(r => setTimeout(r, 1500));
      }

      for (let i = 0; i < 3 && !cancelled; i++) {
        try {
          const ctrl = new AbortController();
          const timeout = setTimeout(() => ctrl.abort(), 15000);
          const res = await fetch(`${API}/api/user/plan`, {
            headers: { Authorization: `Bearer ${retrievedToken}` },
            signal: ctrl.signal,
          });
          clearTimeout(timeout);

          if (!res.ok) throw new Error(`${res.status}`);
          const data: UserPlan = await res.json();
          if (cancelled) return;

          setUserEmail(data.email);
          const plan = data.plan;
          const trialEnds = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
          const now = new Date();

          if (plan !== 'trial') {
            setStatus('active');
          } else if (trialEnds && now > trialEnds) {
            setStatus('expired');
          } else {
            const days = trialEnds ? Math.ceil((trialEnds.getTime() - now.getTime()) / 86400000) : 7;
            setDaysLeft(Math.max(days, 0));
            setStatus('trial');
          }
          return;
        } catch {
          if (i < 2) {
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      }

      if (!cancelled) {
        setStatus('trial');
        setDaysLeft(7);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken, searchParams]);

  useEffect(() => {
    if (!token || status === 'expired' || status === 'loading') return;

    setLoadingQuizzes(true);
    let cancelled = false;

    async function fetchData() {
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 15000);

        const quizzesRes = await fetch(`${API}/api/quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
        clearTimeout(timeout);

        if (!quizzesRes.ok) throw new Error('Failed to fetch quizzes');
        const quizzesData: Quiz[] = await quizzesRes.json();

        if (cancelled) return;
        setQuizzes(quizzesData);

        if (quizzesData.length > 0) {
          let totalViews = 0;
          let totalLeads = 0;
          let totalCompletions = 0;

          for (const quiz of quizzesData) {
            try {
              const analyticsRes = await fetch(`${API}/api/analytics/${quiz.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (analyticsRes.ok) {
                const analyticsData: Analytics = await analyticsRes.json();
                totalViews += analyticsData.views;
                totalLeads += analyticsData.leads;
                totalCompletions += analyticsData.completions;
              }
            } catch {}
          }

          if (!cancelled) {
            const completionRate = totalViews > 0 ? (totalCompletions / totalViews) * 100 : 0;
            setAnalytics({
              views: totalViews,
              completions: totalCompletions,
              leads: totalLeads,
              completion_rate: completionRate,
              lead_rate: totalViews > 0 ? (totalLeads / totalViews) * 100 : 0,
            });
          }
        }
      } catch (e) {
        console.error('Error fetching data:', e);
      } finally {
        if (!cancelled) setLoadingQuizzes(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [token, status]);

  if (status === 'loading') {
    return (
      <div style={{ background: COLORS.BG, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', fontFamily: '"DM Sans",system-ui,sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: '32px', height: '32px', background: COLORS.ACCENT, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.BG} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: COLORS.TEXT, letterSpacing: '-0.03em' }}>Squarespell</span>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans",system-ui,sans-serif' }}>
        <div style={{ maxWidth: '440px', width: '100%', padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '40px' }}>
            <div style={{ width: '32px', height: '32px', background: COLORS.ACCENT, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.BG} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            </div>
            <span style={{ fontSize: '18px', fontWeight: 700, color: COLORS.TEXT, letterSpacing: '-0.03em' }}>Squarespell</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: COLORS.TEXT, letterSpacing: '-0.04em', marginBottom: '12px' }}>Your free trial has ended</h1>
          <p style={{ fontSize: '15px', color: 'rgba(240,242,245,0.5)', lineHeight: 1.6, marginBottom: '36px' }}>Upgrade to keep access to your quizzes, leads, and analytics. Your data is safe.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            <a href="/pricing" style={{ display: 'block', padding: '16px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: COLORS.TEXT, textDecoration: 'none', fontSize: '15px', fontWeight: 600 }}>Starter · $19/mo</a>
            <a href="/pricing" style={{ display: 'block', padding: '16px', background: COLORS.ACCENT, border: 'none', borderRadius: '12px', color: COLORS.BG, textDecoration: 'none', fontSize: '15px', fontWeight: 700 }}>Pro · $39/mo · Recommended</a>
            <a href="/pricing" style={{ display: 'block', padding: '16px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: COLORS.TEXT, textDecoration: 'none', fontSize: '15px', fontWeight: 600 }}>Agency · $79/mo</a>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(240,242,245,0.25)' }}>Questions? <a href="mailto:info@squarespell.com" style={{ color: 'rgba(240,242,245,0.4)', textDecoration: 'none' }}>info@squarespell.com</a></p>
        </div>
      </div>
    );
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div style={{ background: COLORS.BG, minHeight: '100vh', display: 'flex', fontFamily: '"DM Sans",system-ui,sans-serif' }}>
      {embedSlug && <EmbedModal slug={embedSlug} onClose={() => setEmbedSlug(null)} />}

      <div style={{
        width: isMobile ? (sidebarOpen ? '100%' : '0') : '240px',
        background: COLORS.SURFACE,
        borderRight: `1px solid ${COLORS.BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        position: isMobile ? 'absolute' : 'relative',
        height: '100vh',
        zIndex: sidebarOpen ? 40 : 0,
        transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ padding: '20px 16px', borderBottom: `1px solid ${COLORS.BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', background: COLORS.ACCENT, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.BG} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: COLORS.TEXT, letterSpacing: '-0.02em' }}>Squarespell</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {['quizzes', 'analytics', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab as any); if (isMobile) setSidebarOpen(false); }}
              style={{
                padding: '12px 16px',
                background: activeTab === tab ? 'rgba(210,255,29,0.1)' : 'transparent',
                color: activeTab === tab ? COLORS.ACCENT : COLORS.TEXT_MUTED,
                border: 'none',
                borderLeft: activeTab === tab ? `3px solid ${COLORS.ACCENT}` : '3px solid transparent',
                fontSize: '14px',
                fontWeight: activeTab === tab ? 700 : 600,
                cursor: 'pointer',
                fontFamily: '"DM Sans",system-ui,sans-serif',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div style={{
          padding: '16px',
          borderTop: `1px solid ${COLORS.BORDER}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{
            padding: '12px',
            background: COLORS.ELEVATED,
            borderRadius: '8px',
            border: `1px solid ${COLORS.BORDER}`,
          }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 700, color: COLORS.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account</p>
            <p style={{ margin: 0, fontSize: '13px', color: COLORS.TEXT, wordBreak: 'break-word' }}>{userEmail}</p>
          </div>
          <button
            onClick={() => signOut()}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              color: COLORS.TEXT_MUTED,
              border: `1px solid ${COLORS.BORDER}`,
              borderRadius: 100,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: '"DM Sans",system-ui,sans-serif',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(210,255,29,0.08)';
              e.currentTarget.style.color = COLORS.ACCENT;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = COLORS.TEXT_MUTED;
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!isMobile && <div style={{ height: '0' }} />}
        {isMobile && (
          <div style={{
            padding: '12px 16px',
            background: COLORS.ELEVATED,
            borderBottom: `1px solid ${COLORS.BORDER}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: COLORS.TEXT, textTransform: 'capitalize' }}>{activeTab}</span>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                color: COLORS.TEXT,
                cursor: 'pointer',
                fontSize: '24px',
                padding: '0',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.TEXT} strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        )}

        {status === 'trial' && (
          <div style={{
            background: daysLeft <= 3 ? 'rgba(210,255,29,0.06)' : COLORS.ELEVATED,
            borderBottom: `1px solid ${daysLeft <= 3 ? 'rgba(210,255,29,0.15)' : COLORS.BORDER}`,
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <span style={{ fontSize: '14px', color: 'rgba(240,242,245,0.7)' }}>
              Free trial {daysLeft <= 3 ? <span style={{ color: COLORS.ACCENT, fontWeight: 700 }}>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span> : <><strong style={{ color: COLORS.TEXT }}>{daysLeft} days</strong> remaining</>}
            </span>
            <button
              onClick={() => router.push('/pricing')}
              style={{
                background: daysLeft <= 3 ? COLORS.ACCENT : 'rgba(255,255,255,0.08)',
                color: daysLeft <= 3 ? COLORS.BG : COLORS.TEXT,
                border: 'none',
                borderRadius: 100,
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: '"DM Sans",system-ui,sans-serif',
                transition: 'all 0.2s ease',
              }}
            >
              {daysLeft <= 3 ? 'Upgrade now' : 'View plans'}
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
          {activeTab === 'quizzes' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div>
                  <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: 800, color: COLORS.TEXT, letterSpacing: '-0.02em' }}>Quizzes</h1>
                  <p style={{ margin: 0, fontSize: '14px', color: COLORS.TEXT_MUTED }}>Create and manage your AI quizzes</p>
                </div>
                <a
                  href="/try"
                  style={{
                    padding: '12px 28px',
                    background: COLORS.ACCENT,
                    color: COLORS.BG,
                    border: 'none',
                    borderRadius: 100,
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    fontFamily: '"DM Sans",system-ui,sans-serif',
                    display: 'inline-block',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  Create quiz
                </a>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                {loadingQuizzes ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : (
                  <>
                    <div style={{ padding: '20px', borderRadius: '12px', background: COLORS.ELEVATED, border: `1px solid ${COLORS.BORDER}` }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, color: COLORS.TEXT_MUTED, textTransform: 'uppercase' }}>Total Views</p>
                      <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: COLORS.TEXT }}>{formatNumber(analytics.views)}</p>
                    </div>
                    <div style={{ padding: '20px', borderRadius: '12px', background: COLORS.ELEVATED, border: `1px solid ${COLORS.BORDER}` }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, color: COLORS.TEXT_MUTED, textTransform: 'uppercase' }}>Total Leads</p>
                      <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: COLORS.TEXT }}>{formatNumber(analytics.leads)}</p>
                    </div>
                    <div style={{ padding: '20px', borderRadius: '12px', background: COLORS.ELEVATED, border: `1px solid ${COLORS.BORDER}` }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, color: COLORS.TEXT_MUTED, textTransform: 'uppercase' }}>Conv. Rate</p>
                      <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: COLORS.TEXT }}>{analytics.completion_rate.toFixed(1)}%</p>
                    </div>
                  </>
                )}
              </div>

              {quizzes.length === 0 && !loadingQuizzes && (
                <div style={{
                  padding: '60px 32px',
                  background: COLORS.ELEVATED,
                  borderRadius: '16px',
                  border: `1px solid ${COLORS.BORDER}`,
                  textAlign: 'center',
                }}>
                  <div style={{ width: '56px', height: '56px', background: 'rgba(210,255,29,0.08)', border: `1px solid rgba(210,255,29,0.15)`, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                  </div>
                  <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 700, color: COLORS.TEXT }}>Create your first quiz</h2>
                  <p style={{ margin: '0 0 32px 0', fontSize: '15px', color: COLORS.TEXT_MUTED, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>Get started building AI-powered quizzes that capture leads and engage your audience.</p>
                  <a
                    href="/try"
                    style={{
                      padding: '12px 28px',
                      background: COLORS.ACCENT,
                      color: COLORS.BG,
                      border: 'none',
                      borderRadius: 100,
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'none',
                      fontFamily: '"DM Sans",system-ui,sans-serif',
                      display: 'inline-block',
                    }}
                  >
                    Build your first quiz
                  </a>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    style={{
                      padding: '20px',
                      borderRadius: '12px',
                      background: COLORS.ELEVATED,
                      border: `1px solid ${COLORS.BORDER}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = COLORS.ACCENT;
                      e.currentTarget.style.background = 'rgba(210,255,29,0.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = COLORS.BORDER;
                      e.currentTarget.style.background = COLORS.ELEVATED;
                    }}
                  >
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: COLORS.TEXT }}>{quiz.title}</h3>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: 100,
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          background: quiz.status === 'live' ? 'rgba(76,175,80,0.15)' : 'rgba(156,163,175,0.15)',
                          color: quiz.status === 'live' ? '#4cb150' : '#9ca3af',
                        }}>
                          {quiz.status}
                        </span>
                        <span style={{ fontSize: '12px', color: COLORS.TEXT_MUTED }}>{formatDate(quiz.created_at)}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ padding: '12px', background: COLORS.SURFACE, borderRadius: '8px', border: `1px solid ${COLORS.BORDER}` }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 700, color: COLORS.TEXT_MUTED, textTransform: 'uppercase' }}>Views</p>
                        <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: COLORS.TEXT }}>{formatNumber(quiz.view_count)}</p>
                      </div>
                      <div style={{ padding: '12px', background: COLORS.SURFACE, borderRadius: '8px', border: `1px solid ${COLORS.BORDER}` }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 700, color: COLORS.TEXT_MUTED, textTransform: 'uppercase' }}>Leads</p>
                        <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: COLORS.TEXT }}>{formatNumber(quiz.lead_count)}</p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      <a
                        href={`/dashboard/${quiz.id}`}
                        style={{
                          padding: '10px 16px',
                          background: COLORS.SURFACE,
                          color: COLORS.TEXT,
                          border: `1px solid ${COLORS.BORDER}`,
                          borderRadius: 100,
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'none',
                          textAlign: 'center',
                          fontFamily: '"DM Sans",system-ui,sans-serif',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(210,255,29,0.1)';
                          e.currentTarget.style.borderColor = COLORS.ACCENT;
                          e.currentTarget.style.color = COLORS.ACCENT;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = COLORS.SURFACE;
                          e.currentTarget.style.borderColor = COLORS.BORDER;
                          e.currentTarget.style.color = COLORS.TEXT;
                        }}
                      >
                        Edit
                      </a>
                      <a
                        href={`/quiz/${quiz.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '10px 16px',
                          background: COLORS.SURFACE,
                          color: COLORS.TEXT,
                          border: `1px solid ${COLORS.BORDER}`,
                          borderRadius: 100,
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'none',
                          textAlign: 'center',
                          fontFamily: '"DM Sans",system-ui,sans-serif',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(210,255,29,0.1)';
                          e.currentTarget.style.borderColor = COLORS.ACCENT;
                          e.currentTarget.style.color = COLORS.ACCENT;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = COLORS.SURFACE;
                          e.currentTarget.style.borderColor = COLORS.BORDER;
                          e.currentTarget.style.color = COLORS.TEXT;
                        }}
                      >
                        View live
                      </a>
                      <button
                        onClick={() => setEmbedSlug(quiz.slug)}
                        style={{
                          padding: '10px 16px',
                          background: COLORS.SURFACE,
                          color: COLORS.TEXT,
                          border: `1px solid ${COLORS.BORDER}`,
                          borderRadius: 100,
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: '"DM Sans",system-ui,sans-serif',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(210,255,29,0.1)';
                          e.currentTarget.style.borderColor = COLORS.ACCENT;
                          e.currentTarget.style.color = COLORS.ACCENT;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = COLORS.SURFACE;
                          e.currentTarget.style.borderColor = COLORS.BORDER;
                          e.currentTarget.style.color = COLORS.TEXT;
                        }}
                      >
                        Embed
                      </button>
                      <button
                        onClick={async () => {
                          if (!token || !confirm('Delete this quiz? This action cannot be undone.')) return;
                          try {
                            const res = await fetch(`${API}/api/quizzes/${quiz.id}`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (res.ok) {
                              setQuizzes(quizzes.filter(q => q.id !== quiz.id));
                            }
                          } catch (e) {
                            console.error('Delete failed:', e);
                          }
                        }}
                        style={{
                          padding: '10px 16px',
                          background: COLORS.SURFACE,
                          color: '#ef4444',
                          border: `1px solid ${COLORS.BORDER}`,
                          borderRadius: 100,
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: '"DM Sans",system-ui,sans-serif',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                          e.currentTarget.style.borderColor = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = COLORS.SURFACE;
                          e.currentTarget.style.borderColor = COLORS.BORDER;
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h1 style={{ margin: '0 0 24px 0', fontSize: '32px', fontWeight: 800, color: COLORS.TEXT, letterSpacing: '-0.02em' }}>Analytics</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '24px', borderRadius: '12px', background: COLORS.ELEVATED, border: `1px solid ${COLORS.BORDER}` }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, color: COLORS.TEXT_MUTED, textTransform: 'uppercase' }}>Total Views</p>
                  <p style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: COLORS.TEXT }}>{formatNumber(analytics.views)}</p>
                </div>
                <div style={{ padding: '24px', borderRadius: '12px', background: COLORS.ELEVATED, border: `1px solid ${COLORS.BORDER}` }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, color: COLORS.TEXT_MUTED, textTransform: 'uppercase' }}>Total Completions</p>
                  <p style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: COLORS.TEXT }}>{formatNumber(analytics.completions)}</p>
                </div>
                <div style={{ padding: '24px', borderRadius: '12px', background: COLORS.ELEVATED, border: `1px solid ${COLORS.BORDER}` }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, color: COLORS.TEXT_MUTED, textTransform: 'uppercase' }}>Total Leads</p>
                  <p style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: COLORS.TEXT }}>{formatNumber(analytics.leads)}</p>
                </div>
                <div style={{ padding: '24px', borderRadius: '12px', background: COLORS.ELEVATED, border: `1px solid ${COLORS.BORDER}` }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, color: COLORS.TEXT_MUTED, textTransform: 'uppercase' }}>Completion Rate</p>
                  <p style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: COLORS.ACCENT }}>{analytics.completion_rate.toFixed(1)}%</p>
                </div>
                <div style={{ padding: '24px', borderRadius: '12px', background: COLORS.ELEVATED, border: `1px solid ${COLORS.BORDER}` }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, color: COLORS.TEXT_MUTED, textTransform: 'uppercase' }}>Lead Rate</p>
                  <p style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: COLORS.ACCENT }}>{analytics.lead_rate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h1 style={{ margin: '0 0 24px 0', fontSize: '32px', fontWeight: 800, color: COLORS.TEXT, letterSpacing: '-0.02em' }}>Settings</h1>
              <div style={{ maxWidth: '500px' }}>
                <div style={{ padding: '20px', borderRadius: '12px', background: COLORS.ELEVATED, border: `1px solid ${COLORS.BORDER}` }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700, color: COLORS.TEXT }}>Account</h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: COLORS.TEXT_MUTED }}>Email: {userEmail}</p>
                  <button
                    onClick={() => signOut()}
                    style={{
                      padding: '10px 20px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: 100,
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: '"DM Sans",system-ui,sans-serif',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ef4444';
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div style={{ background: COLORS.BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans",system-ui,sans-serif' }}>
        <LoadingSpinner />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

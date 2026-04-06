'use client';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { setAuthToken } from '../lib/api';
import { startKeepAlive } from '../lib/keepAlive';
import './globals.css';

function AuthTokenSync() {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    if (isSignedIn) {
      getToken().then(t => setAuthToken(t));
    } else {
      setAuthToken(null);
    }
  }, [isSignedIn, getToken]);
  return null;
}

function KeepAlive() {
  useEffect(() => { startKeepAlive(); }, []);
  return null;
}

const fc = {
  footer: { background:'#07090c', borderTop:'1px solid rgba(255,255,255,0.08)', padding:'48px 40px 0', fontFamily:'"DM Sans",system-ui,sans-serif' } as React.CSSProperties,
  inner: { maxWidth:'1120px', margin:'0 auto' } as React.CSSProperties,
  top: { display:'flex', justifyContent:'space-between', gap:'48px', flexWrap:'wrap', paddingBottom:'40px' } as React.CSSProperties,
  brand: { maxWidth:'260px' } as React.CSSProperties,
  logo: { display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px', textDecoration:'none' } as React.CSSProperties,
  logoIcon: { width:'28px', height:'28px', background:'#D2FF1D', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center' } as React.CSSProperties,
  logoText: { fontSize:'18px', fontWeight:700, color:'#f0f2f5', letterSpacing:'-0.03em' } as React.CSSProperties,
  tagline: { fontSize:'14px', color:'rgba(240,242,245,0.4)', lineHeight:'1.6' } as React.CSSProperties,
  cols: { display:'flex', gap:'64px', flexWrap:'wrap' } as React.CSSProperties,
  colTitle: { fontSize:'13px', fontWeight:700, color:'rgba(240,242,245,0.3)', textTransform:'uppercase' as const, letterSpacing:'0.08em', marginBottom:'14px' } as React.CSSProperties,
  colLink: { display:'block', fontSize:'14px', color:'rgba(240,242,245,0.5)', marginBottom:'10px', textDecoration:'none', transition:'color .15s' } as React.CSSProperties,
  bar: { borderTop:'1px solid rgba(255,255,255,0.08)', padding:'20px 0', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' } as React.CSSProperties,
  copy: { fontSize:'13px', color:'rgba(240,242,245,0.3)' } as React.CSSProperties,
  barLinks: { display:'flex', gap:'20px' } as React.CSSProperties,
  barLink: { fontSize:'13px', color:'rgba(240,242,245,0.35)', textDecoration:'none', transition:'color .15s' } as React.CSSProperties,
};

function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard')) return null;

  return (
    <footer style={fc.footer}>
      <div style={fc.inner}>
        <div style={fc.top}>
          <div style={fc.brand}>
            <div style={fc.logo}>
              <div style={fc.logoIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#07090c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <span style={fc.logoText}>Squarespell</span>
            </div>
            <p style={fc.tagline}>AI-powered quiz funnels for Squarespace. Turn visitors into leads in minutes.</p>
          </div>
          <div style={fc.cols}>
            <div>
              <p style={fc.colTitle}>Product</p>
              <Link href="/#features" style={fc.colLink} onMouseEnter={e=>(e.currentTarget.style.color='#f0f2f5')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,242,245,0.5)')}>Features</Link>
              <Link href="/pricing" style={fc.colLink} onMouseEnter={e=>(e.currentTarget.style.color='#f0f2f5')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,242,245,0.5)')}>Pricing</Link>
              <Link href="/#analytics" style={fc.colLink} onMouseEnter={e=>(e.currentTarget.style.color='#f0f2f5')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,242,245,0.5)')}>Analytics</Link>
              <Link href="/#changelog" style={fc.colLink} onMouseEnter={e=>(e.currentTarget.style.color='#f0f2f5')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,242,245,0.5)')}>Changelog</Link>
            </div>
            <div>
              <p style={fc.colTitle}>Support</p>
              <Link href="/#docs" style={fc.colLink} onMouseEnter={e=>(e.currentTarget.style.color='#f0f2f5')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,242,245,0.5)')}>Documentation</Link>
              <Link href="/#community" style={fc.colLink} onMouseEnter={e=>(e.currentTarget.style.color='#f0f2f5')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,242,245,0.5)')}>Community</Link>
              <Link href="/#contact" style={fc.colLink} onMouseEnter={e=>(e.currentTarget.style.color='#f0f2f5')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,242,245,0.5)')}>Contact</Link>
              <Link href="/#status" style={fc.colLink} onMouseEnter={e=>(e.currentTarget.style.color='#f0f2f5')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,242,245,0.5)')}>Status</Link>
            </div>
            <div>
              <p style={fc.colTitle}>Company</p>
              <Link href="/#about" style={fc.colLink} onMouseEnter={e=>(e.currentTarget.style.color='#f0f2f5')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,242,245,0.5)')}>About</Link>
              <Link href="/#blog" style={fc.colLink} onMouseEnter={e=>(e.currentTarget.style.color='#f0f2f5')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,242,245,0.5)')}>Blog</Link>
              <Link href="/privacy" style={fc.colLink} onMouseEnter={e=>(e.currentTarget.style.color='#f0f2f5')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,242,245,0.5)')}>Privacy</Link>
              <Link href="/terms" style={fc.colLink} onMouseEnter={e=>(e.currentTarget.style.color='#f0f2f5')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,242,245,0.5)')}>Terms</Link>
            </div>
          </div>
        </div>
        <div style={fc.bar}>
          <span style={fc.copy}>&copy; 2025 Squarespell. Powered by Cloudflare.</span>
          <div style={fc.barLinks}>
            <Link href="/privacy" style={fc.barLink} onMouseEnter={e=>(e.currentTarget.style.color='#f0f2f5')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,242,245,0.35)')}>Privacy</Link>
            <Link href="/terms" style={fc.barLink} onMouseEnter={e=>(e.currentTarget.style.color='#f0f2f5')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,242,245,0.35)')}>Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head><link rel="preconnect" href="https://fonts.googleapis.com" /><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" /></head>
        <body>
          <AuthTokenSync />
          <KeepAlive />
          {children}
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}

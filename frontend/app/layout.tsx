'use client';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { setAuthToken } from '../lib/api';
import { startKeepAlive } from '../lib/keepAlive';
import { ToastProvider } from '../lib/toast';
import './globals.css';

function AuthTokenSync() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      // Pass the getToken *function* so every API call fetches a fresh token
      // instead of caching a single string that goes stale on rotation.
      setAuthToken(
        () => getToken().then(t => t || ''),
        () => getToken({ skipCache: true } as any).then(t => t || '')
      );
    } else {
      // Grace period: when Clerk rotates the session token, isSignedIn can
      // briefly flip to false. Do NOT nuke the token immediately — wait 12s
      // to see if Clerk recovers (matches the useDashboardAuth grace window).
      const timer = setTimeout(() => {
        // Re-check: if still not signed in after the grace period, clear it.
        getToken().then(t => {
          if (!t) setAuthToken(null);
        }).catch(() => setAuthToken(null));
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, isSignedIn, getToken]);
  return null;
}

function KeepAlive() {
  useEffect(() => { startKeepAlive(); }, []);
  return null;
}

const LINK_COLOR = 'rgba(26,26,26,0.6)';
const HOVER_COLOR = '#1A1A1A';
const BAR_COLOR = 'rgba(26,26,26,0.4)';
const hover = (c: string) => ({
  onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = HOVER_COLOR; },
  onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = c; },
});

function Footer() {
  // No footer on app domain  -  marketing site (squarespell.com) has its own footer
  return null;
  const pathname = usePathname();

  return (
    <footer style={{width:'100%',background:'#F7F7F5',borderTop:'1px solid #E4E3E0',marginTop:'80px',fontFamily:'"Poppins",system-ui,sans-serif'}}>
      <style>{`
        @media(max-width:768px){
          .ft-top{flex-direction:column!important;gap:48px!important}
          .ft-inner{padding:40px 20px 32px!important}
        }
      `}</style>
      <div className="ft-inner" style={{maxWidth:'1400px',margin:'0 auto',padding:'64px 48px 40px'}}>
        <div className="ft-top" style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap'}}>
          <div style={{width:'280px',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
              <div style={{width:'32px',height:'32px',background:'#0f7377',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="2" fill="#FFFFFF"/><line x1="12" y1="6" x2="12" y2="11"/><line x1="12" y1="11" x2="7" y2="16"/><line x1="12" y1="11" x2="17" y2="16"/><circle cx="7" cy="18" r="2" fill="#FFFFFF"/><circle cx="17" cy="18" r="2" fill="#FFFFFF"/></svg>
              </div>
              <span style={{fontSize: '14px',fontWeight:700,color:'#1A1A1A',letterSpacing:'-0.03em'}}>Squarespell Quiz</span>
            </div>
            <p style={{fontSize:'15px',color:'#6B6B6B',lineHeight:'1.6',marginTop:'12px'}}>AI-powered quiz funnels for Squarespace. Turn visitors into leads in minutes.</p>
          </div>
          <div style={{display:'flex',gap:'64px',flexWrap:'wrap'}}>
            <div>
              <p style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B6B6B',marginBottom:'16px'}}>Product</p>
              <Link href="/#features" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Features</Link>
              <Link href="/pricing" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Pricing</Link>
              <Link href="/#analytics" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Analytics</Link>
              <Link href="/#changelog" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Changelog</Link>
            </div>
            <div>
              <p style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B6B6B',marginBottom:'16px'}}>Support</p>
              <Link href="/#docs" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Documentation</Link>
              <Link href="/#community" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Community</Link>
              <Link href="/#contact" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Contact</Link>
              <Link href="/#status" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Status</Link>
            </div>
            <div>
              <p style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6B6B6B',marginBottom:'16px'}}>Company</p>
              <Link href="/#about" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>About</Link>
              <Link href="/#blog" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Blog</Link>
              <Link href="/privacy" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Privacy</Link>
              <Link href="/terms" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Terms</Link>
            </div>
          </div>
        </div>
        <div style={{marginTop:'48px',paddingTop:'24px',borderTop:'1px solid #E4E3E0',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
          <span style={{fontSize:'14px',color:BAR_COLOR}}>&copy; 2026 Squarespell Quiz. Powered by Cloudflare.</span>
          <div style={{display:'flex',gap:'20px'}}>
            <Link href="/privacy" style={{fontSize:'14px',color:BAR_COLOR,textDecoration:'none',transition:'color .15s'}} {...hover(BAR_COLOR)}>Privacy</Link>
            <Link href="/terms" style={{fontSize:'14px',color:BAR_COLOR,textDecoration:'none',transition:'color .15s'}} {...hover(BAR_COLOR)}>Terms</Link>
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
        <head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" /></head>
        <body>
          <ToastProvider>
          <AuthTokenSync />
          <KeepAlive />
          {children}
          <Footer />
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

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

const LINK_COLOR = 'rgba(240,242,245,0.6)';
const HOVER_COLOR = '#f0f2f5';
const BAR_COLOR = 'rgba(240,242,245,0.4)';
const hover = (c: string) => ({
  onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = HOVER_COLOR; },
  onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = c; },
});

function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up') || pathname?.startsWith('/try')) return null;

  return (
    <footer style={{width:'100%',background:'#07090c',borderTop:'1px solid rgba(255,255,255,0.08)',marginTop:'80px',fontFamily:'"DM Sans",system-ui,sans-serif'}}>
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
              <div style={{width:'32px',height:'32px',background:'#D2FF1D',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07090c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <span style={{fontSize: '14px',fontWeight:700,color:'#f0f2f5',letterSpacing:'-0.03em'}}>Squarespell</span>
            </div>
            <p style={{fontSize:'15px',color:'rgba(240,242,245,0.5)',lineHeight:'1.6',marginTop:'12px'}}>AI-powered quiz funnels for Squarespace. Turn visitors into leads in minutes.</p>
          </div>
          <div style={{display:'flex',gap:'64px',flexWrap:'wrap'}}>
            <div>
              <p style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'rgba(240,242,245,0.4)',marginBottom:'16px'}}>Product</p>
              <Link href="/#features" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Features</Link>
              <Link href="/pricing" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Pricing</Link>
              <Link href="/#analytics" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Analytics</Link>
              <Link href="/#changelog" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Changelog</Link>
            </div>
            <div>
              <p style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'rgba(240,242,245,0.4)',marginBottom:'16px'}}>Support</p>
              <Link href="/#docs" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Documentation</Link>
              <Link href="/#community" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Community</Link>
              <Link href="/#contact" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Contact</Link>
              <Link href="/#status" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Status</Link>
            </div>
            <div>
              <p style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'rgba(240,242,245,0.4)',marginBottom:'16px'}}>Company</p>
              <Link href="/#about" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>About</Link>
              <Link href="/#blog" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Blog</Link>
              <Link href="/privacy" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Privacy</Link>
              <Link href="/terms" style={{display:'block',fontSize:'15px',color:LINK_COLOR,lineHeight:'2',textDecoration:'none',transition:'color .15s'}} {...hover(LINK_COLOR)}>Terms</Link>
            </div>
          </div>
        </div>
        <div style={{marginTop:'48px',paddingTop:'24px',borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
          <span style={{fontSize:'14px',color:BAR_COLOR}}>&copy; 2025 Squarespell. Powered by Cloudflare.</span>
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

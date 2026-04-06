'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';
const ACC = '#D2FF1D';

export default function Dashboard() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [src, setSrc] = useState('');
  const [status, setStatus] = useState<'loading'|'trial'|'active'|'expired'>('loading');
  const [daysLeft, setDaysLeft] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    async function fetchMe(token: string, isRetry = false) {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 30000);
      try {
        const res = await fetch(`${API}/api/user/plan`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal
        });
        clearTimeout(timeout);
        const data = await res.json();
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
        setRetrying(false);
        setSrc(`/squarespell-app.html?t=${encodeURIComponent(token)}`);
      } catch {
        clearTimeout(timeout);
        if (!isRetry) {
          setRetrying(true);
          await new Promise(r => setTimeout(r, 5000));
          fetchMe(token, true);
        } else {
          setRetrying(false);
          setStatus('expired');
        }
      }
    }

    getToken().then(token => {
      if (token) fetchMe(token);
    });
  }, []);

  if (status === 'loading') return (
    <div style={{background:'#07090c',height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',fontFamily:'DM Sans,system-ui,sans-serif'}}>
      <div style={{width:'32px',height:'32px',border:'2px solid rgba(210,255,29,.2)',borderTopColor:ACC,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      {retrying && <p style={{fontSize:'14px',color:'rgba(240,242,245,.5)',margin:0}}>Connecting to server...</p>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (status === 'expired') return (
    <div style={{background:'#07090c',minHeight:'100vh',fontFamily:'DM Sans,system-ui,sans-serif',padding:'24px'}}>
      {/* Logo */}
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'16px 8px 0'}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <span style={{fontSize:'18px',fontWeight:800,color:'#f0f2f5',letterSpacing:'-0.03em'}}>Squarespell</span>
      </div>
      <div style={{maxWidth:'900px',margin:'0 auto',textAlign:'center',paddingTop:'80px'}}>
        <h1 style={{fontSize:'clamp(32px,5vw,40px)',fontWeight:800,letterSpacing:'-.04em',color:'#f0f2f5',marginBottom:'16px',lineHeight:1.1}}>Your free trial has ended</h1>
        <p style={{fontSize:'17px',color:'rgba(240,242,245,.5)',lineHeight:1.65,marginBottom:'48px',maxWidth:'480px',marginLeft:'auto',marginRight:'auto'}}>You captured leads during your trial. Upgrade to keep access and never lose a lead.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',marginBottom:'48px',textAlign:'left'}}>
          {[
            {name:'Starter',price:'$19',desc:'5 quizzes · 500 leads/mo · CSV export'},
            {name:'Pro',price:'$39',desc:'20 quizzes · 5,000 leads/mo · Lead scoring · Zapier',pop:true},
            {name:'Agency',price:'$79',desc:'Unlimited quizzes · Unlimited leads · White-label'},
          ].map((p,i) => (
            <div key={i} style={{background:p.pop?'rgba(210,255,29,.06)':'rgba(255,255,255,.04)',border:`1px solid ${p.pop?'rgba(210,255,29,.2)':'rgba(255,255,255,.08)'}`,borderRadius:'14px',padding:'28px 24px',position:'relative'}}>
              {p.pop && <div style={{position:'absolute',top:'-10px',left:'50%',transform:'translateX(-50%)',background:ACC,color:'#07090c',fontSize:'11px',fontWeight:800,padding:'2px 12px',borderRadius:'20px',letterSpacing:'.06em',textTransform:'uppercase'}}>Most Popular</div>}
              <p style={{fontSize:'14px',fontWeight:700,color:'rgba(240,242,245,.5)',marginBottom:'8px'}}>{p.name}</p>
              <p style={{fontSize:'36px',fontWeight:800,color:'#f0f2f5',letterSpacing:'-.04em',marginBottom:'4px'}}>{p.price}<span style={{fontSize:'15px',fontWeight:500,color:'rgba(240,242,245,.4)'}}>/mo</span></p>
              <p style={{fontSize:'14px',color:'rgba(240,242,245,.4)',lineHeight:1.5,marginBottom:'20px'}}>{p.desc}</p>
              <button onClick={()=>router.push('/pricing')} style={{width:'100%',background:p.pop?ACC:'rgba(255,255,255,.06)',color:p.pop?'#07090c':'#f0f2f5',border:p.pop?'none':'1px solid rgba(255,255,255,.08)',borderRadius:'10px',padding:'12px',fontSize:'15px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Choose plan</button>
            </div>
          ))}
        </div>
        <p style={{fontSize:'13px',color:'rgba(240,242,245,.3)'}}>Questions? Email us at hello@squarespell.com</p>
      </div>
    </div>
  );

  return (
    <>
      {status === 'trial' && daysLeft > 3 && daysLeft <= 10 && (
        <div style={{background:'#1a1f2e',borderBottom:'1px solid rgba(255,255,255,0.1)',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',fontFamily:'DM Sans,system-ui,sans-serif',flexWrap:'wrap',gap:'12px'}}>
          <span style={{fontSize:'15px',color:'rgba(240,242,245,0.85)'}}>
            Your trial expires in <strong style={{color:'#f0f2f5'}}>{ daysLeft} days</strong>. Add a payment method to ensure uninterrupted service when your trial expires.
          </span>
          <button
            onClick={() => router.push('/pricing')}
            style={{background:'#f0f2f5',color:'#07090c',border:'none',borderRadius:'8px',padding:'10px 20px',fontSize:'14px',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}
          >
            Add a Card
          </button>
        </div>
      )}
      {status === 'trial' && daysLeft <= 3 && (
        <div style={{background:'rgba(210,255,29,.08)',borderBottom:'1px solid rgba(210,255,29,.2)',padding:'10px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',fontFamily:'DM Sans,system-ui,sans-serif',flexWrap:'wrap',gap:'8px'}}>
          <span style={{fontSize:'14px',color:'rgba(240,242,245,.75)'}}>
            ⚡ <strong style={{color:ACC}}>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</strong> on your free trial
          </span>
          <button
            onClick={() => router.push('/pricing')}
            style={{background:ACC,color:'#07090c',border:'none',borderRadius:'8px',padding:'7px 18px',fontSize:'13px',fontWeight:700,cursor:'pointer'}}
          >
            Upgrade now
          </button>
        </div>
      )}
      {src && (
        <iframe
          src={src}
          style={{width:'100%',height:status==='trial'&&daysLeft<=3?'calc(100vh - 45px)':'100vh',border:'none',display:'block'}}
          title="Squarespell"
        />
      )}
    </>
  );
}

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

  useEffect(() => {
    getToken().then(async token => {
      if (!token) return;
      try {
        const res = await fetch(`${API}/api/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
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
        setSrc(`/squarespell-app.html?t=${encodeURIComponent(token)}`);
      } catch {
        setSrc('');
      }
    });
  }, []);

  if (status === 'loading') return (
    <div style={{background:'#07090c',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:'32px',height:'32px',border:'2px solid rgba(210,255,29,.2)',borderTopColor:ACC,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (status === 'expired') return (
    <div style={{background:'#07090c',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,system-ui,sans-serif',padding:'24px'}}>
      <div style={{textAlign:'center',maxWidth:'480px'}}>
        <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'rgba(210,255,29,.1)',border:'1px solid rgba(210,255,29,.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 32px',fontSize:'28px'}}>⏱</div>
        <h1 style={{fontSize:'36px',fontWeight:800,letterSpacing:'-.03em',color:'#f0f2f5',marginBottom:'16px',lineHeight:1.1}}>Your trial has ended</h1>
        <p style={{fontSize:'17px',color:'rgba(240,242,245,.5)',lineHeight:1.65,marginBottom:'36px'}}>Choose a plan to keep capturing leads. Your quiz and all leads collected are saved and ready.</p>
        <button
          onClick={() => router.push('/pricing')}
          style={{background:ACC,color:'#07090c',border:'none',borderRadius:'12px',padding:'16px 40px',fontSize:'17px',fontWeight:700,cursor:'pointer',width:'100%',marginBottom:'12px'}}
        >
          See plans & pricing
        </button>
        <p style={{fontSize:'13px',color:'rgba(240,242,245,.3)'}}>No credit card required to start · Cancel anytime</p>
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

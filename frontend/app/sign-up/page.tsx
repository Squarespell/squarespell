'use client';
import { SignUp } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignUpInner() {
  const params = useSearchParams();
  const fromTry = params.get('from') === 'try';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#07090c', fontFamily: '"DM Sans",system-ui,sans-serif', padding: '24px' }}>
      {fromTry && (
        <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '420px', width: '100%' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span style={{ fontSize: '14px', color: '#4ade80', fontWeight: 600 }}>Your quiz is ready — create your free account to publish it</span>
        </div>
      )}
      <SignUp afterSignUpUrl={fromTry ? '/dashboard?new=true' : '/dashboard'} />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#07090c' }} />}>
      <SignUpInner />
    </Suspense>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function Dashboard() {
  const { getToken } = useAuth();
  const [src, setSrc] = useState('');

  useEffect(() => {
    getToken().then(token => {
      if (token) {
        setSrc(`/squarespell-app.html?t=${encodeURIComponent(token)}`);
      }
    });
  }, []);

  if (!src) return (
    <div style={{background:'#07090c',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:'32px',height:'32px',border:'2px solid rgba(210,255,29,.2)',borderTopColor:'#D2FF1D',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <iframe
      src={src}
      style={{width:'100%',height:'100vh',border:'none',display:'block'}}
      title="Squarespell"
    />
  );
}

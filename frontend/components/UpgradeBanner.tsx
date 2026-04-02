'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './UpgradeBanner.module.css';
export default function UpgradeBanner() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      setShow(true);
      window.history.replaceState({}, '', '/dashboard');
      const t = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);
  if (!show) return null;
  return (
    <div className={styles.banner}>
      <span className={styles.icon}>🎉</span>
      <span className={styles.text}>You&apos;re upgraded! Your new plan is active.</span>
      <button className={styles.dismiss} onClick={() => setShow(false)}>✕</button>
    </div>
  );
}

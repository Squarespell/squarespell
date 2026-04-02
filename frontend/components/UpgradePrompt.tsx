'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import styles from './UpgradePrompt.module.css';
const MESSAGES = { quiz_limit: { icon: '✦', title: "You've hit your quiz limit", sub: "Upgrade to create more quizzes and capture more leads." }, lead_limit: { icon: '📬', title: "You've hit your lead limit this month", sub: "Upgrade to keep collecting leads without interruption." } };
const UPGRADE_PLANS: Record<string,{id:string;name:string;price:number}[]> = { free:[{id:'starter',name:'Starter',price:19},{id:'pro',name:'Pro',price:39}], starter:[{id:'pro',name:'Pro',price:39},{id:'agency',name:'Agency',price:79}], pro:[{id:'agency',name:'Agency',price:79}], agency:[] };
export default function UpgradePrompt({ reason, currentPlan, onDismiss }: { reason: 'quiz_limit'|'lead_limit'; currentPlan: string; onDismiss?: () => void }) {
  const [loading, setLoading] = useState<string|null>(null);
  const msg = MESSAGES[reason]; const plans = UPGRADE_PLANS[currentPlan] ?? [];
  async function upgrade(planId: string) { setLoading(planId); try { const { url } = await api.createCheckout(planId); window.location.href = url; } catch { setLoading(null); } }
  if (plans.length === 0) return null;
  return (
    <div className={styles.overlay}><div className={styles.modal}>
      {onDismiss && <button className={styles.close} onClick={onDismiss}>✕</button>}
      <div className={styles.icon}>{msg.icon}</div>
      <h2 className={styles.title}>{msg.title}</h2>
      <p className={styles.sub}>{msg.sub}</p>
      <div className={styles.plans}>{plans.map(plan => <div key={plan.id} className={styles.planCard}><div className={styles.planName}>{plan.name}</div><div className={styles.planPrice}><span className={styles.planCurrency}>$</span>{plan.price}<span className={styles.planPeriod}>/mo</span></div><button className={styles.upgradeBtn} onClick={() => upgrade(plan.id)} disabled={loading===plan.id}>{loading===plan.id?'Redirecting...':`Upgrade to ${plan.name}`}</button></div>)}</div>
      <p className={styles.note}>Secured by Stripe · Cancel anytime</p>
    </div></div>
  );
}

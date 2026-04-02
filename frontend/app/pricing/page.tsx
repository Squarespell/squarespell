'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { api } from '@/lib/api';
import styles from './pricing.module.css';

const PLANS = [
  { id: 'free',    name: 'Free',    price: 0,  period: '',    tagline: 'Try it out',          features: ['1 quiz','50 leads / month','Hosted quiz link','Basic analytics'],                                          cta: 'Get started free',  highlight: false },
  { id: 'starter', name: 'Starter', price: 19, period: '/mo', tagline: 'For growing businesses', features: ['5 quizzes','500 leads / month','Hosted link + embed','AI brand detection','Full quiz editor'],         cta: 'Start Starter',     highlight: false },
  { id: 'pro',     name: 'Pro',     price: 39, period: '/mo', tagline: 'Most popular',           features: ['20 quizzes','5,000 leads / month','Everything in Starter','AI "Other" processing','Priority support'], cta: 'Start Pro',         highlight: true  },
  { id: 'agency',  name: 'Agency',  price: 79, period: '/mo', tagline: 'For power users',        features: ['Unlimited quizzes','Unlimited leads','Everything in Pro','White-label ready','Dedicated support'],     cta: 'Start Agency',      highlight: false },
];

export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSelect(planId: string) {
    if (planId === 'free') { router.push(isSignedIn ? '/dashboard' : '/sign-up'); return; }
    if (!isSignedIn) { router.push('/sign-up?redirect=/pricing'); return; }
    setLoading(planId);
    try { const { url } = await api.createCheckout(planId); window.location.href = url; }
    catch (e) { console.error(e); setLoading(null); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.badge}>Simple pricing</div>
        <h1 className={styles.title}>One tool. Every quiz.<br />No Squarespace expertise needed.</h1>
        <p className={styles.sub}>Start free. Upgrade when you're ready. Cancel anytime.</p>
      </div>
      <div className={styles.grid}>
        {PLANS.map(plan => (
          <div key={plan.id} className={`${styles.card} ${plan.highlight ? styles.highlight : ''}`}>
            {plan.highlight && <div className={styles.popularBadge}>Most popular</div>}
            <div className={styles.planName}>{plan.name}</div>
            <div className={styles.planTagline}>{plan.tagline}</div>
            <div className={styles.priceRow}>
              {plan.price === 0 ? <span className={styles.price}>Free</span> : <><span className={styles.currency}>$</span><span className={styles.price}>{plan.price}</span><span className={styles.period}>{plan.period}</span></>}
            </div>
            <ul className={styles.features}>{plan.features.map(f => <li key={f}><span className={styles.check}>✓</span> {f}</li>)}</ul>
            <button className={`${styles.cta} ${plan.highlight ? styles.ctaAccent : styles.ctaOutline}`} onClick={() => handleSelect(plan.id)} disabled={loading === plan.id}>
              {loading === plan.id ? 'Redirecting...' : plan.cta}
            </button>
          </div>
        ))}
      </div>
      <div className={styles.guarantee}>🔒 Payments secured by Stripe. Cancel anytime from your dashboard.</div>
      <div className={styles.faq}>
        <h2>Common questions</h2>
        <div className={styles.faqGrid}>
          {[
            { q: 'Can I change plans later?', a: 'Yes. Upgrade or downgrade anytime from your dashboard. Changes take effect immediately.' },
            { q: 'What counts as a lead?', a: 'Every unique email address submitted through your quiz lead capture gate counts as one lead.' },
            { q: 'Will the quiz slow down my Squarespace site?', a: 'No. The embed script loads asynchronously and the quiz runs in an isolated iframe — zero impact on your page speed.' },
            { q: 'Do you offer refunds?', a: "Yes — if you're not happy within 7 days of your first payment, email us for a full refund. No questions asked." },
          ].map(item => (
            <div key={item.q} className={styles.faqItem}>
              <div className={styles.faqQ}>{item.q}</div>
              <div className={styles.faqA}>{item.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import styles from './UpgradePrompt.module.css';

const MESSAGES: Record<string, { icon: string; title: string; sub: string }> = {
  quiz_limit: { icon: '✦', title: "You've hit your quiz limit", sub: "Upgrade to create more quizzes and capture more leads." },
  lead_limit: { icon: '📬', title: "You've hit your lead limit this month", sub: "Add more leads to your plan or upgrade for higher limits." },
  email_limit: { icon: '📧', title: "You've hit your email limit this month", sub: "Add more emails to your plan or upgrade for higher limits." },
};

const UPGRADE_PLANS: Record<string, { id: string; name: string; price: number }[]> = {
  trial: [{ id: 'core', name: 'Core', price: 9 }, { id: 'pro', name: 'Pro', price: 16 }, { id: 'business', name: 'Business', price: 29 }],
  free: [{ id: 'core', name: 'Core', price: 9 }, { id: 'pro', name: 'Pro', price: 16 }, { id: 'business', name: 'Business', price: 29 }],
  core: [{ id: 'pro', name: 'Pro', price: 16 }, { id: 'business', name: 'Business', price: 29 }],
  starter: [{ id: 'pro', name: 'Pro', price: 16 }, { id: 'business', name: 'Business', price: 29 }],
  growth: [{ id: 'pro', name: 'Pro', price: 16 }, { id: 'business', name: 'Business', price: 29 }],
  pro: [{ id: 'business', name: 'Business', price: 29 }],
  business: [],
  agency: [],
};

const LEAD_ADDONS = [
  { key: 'lead_500', label: '+500 leads/mo', price: 3 },
  { key: 'lead_1500', label: '+1,500 leads/mo', price: 7 },
  { key: 'lead_3000', label: '+3,000 leads/mo', price: 12 },
];

const EMAIL_ADDONS = [
  { key: 'email_1000', label: '+1,000 emails/mo', price: 3 },
  { key: 'email_5000', label: '+5,000 emails/mo', price: 7 },
  { key: 'email_10000', label: '+10,000 emails/mo', price: 12 },
];

export default function UpgradePrompt({
  reason,
  currentPlan,
  onDismiss,
}: {
  reason: 'quiz_limit' | 'lead_limit' | 'email_limit';
  currentPlan: string;
  onDismiss?: () => void;
}) {
  var [loading, setLoading] = useState<string | null>(null);
  var msg = MESSAGES[reason] || MESSAGES.lead_limit;
  var plans = UPGRADE_PLANS[currentPlan] ?? [];
  var isPaid = ['core', 'starter', 'growth', 'pro', 'business', 'agency'].includes(currentPlan);
  var showAddons = isPaid && (reason === 'lead_limit' || reason === 'email_limit');
  var addons = reason === 'email_limit' ? EMAIL_ADDONS : LEAD_ADDONS;

  async function upgrade(planId: string) {
    setLoading(planId);
    try {
      var data = await api.createCheckout(planId);
      window.location.href = data.url;
    } catch {
      setLoading(null);
    }
  }

  async function purchaseAddon(addonKey: string) {
    setLoading(addonKey);
    try {
      var data = await api.createAddonCheckout(addonKey);
      window.location.href = data.url;
    } catch {
      setLoading(null);
    }
  }

  if (plans.length === 0 && !showAddons) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {onDismiss && (
          <button className={styles.close} onClick={onDismiss}>
            ✕
          </button>
        )}
        <div className={styles.icon}>{msg.icon}</div>
        <h2 className={styles.title}>{msg.title}</h2>
        <p className={styles.sub}>{msg.sub}</p>

        {/* Add-on packs section — shown for paid users hitting lead/email limits */}
        {showAddons && (
          <div style={{ marginBottom: plans.length > 0 ? 24 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4a6020', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Quick fix — add extra capacity
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {addons.map(function(a) {
                return (
                  <button
                    key={a.key}
                    onClick={function() { purchaseAddon(a.key); }}
                    disabled={loading === a.key}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '14px 18px',
                      background: '#141f0a',
                      border: '1px solid #2a3e14',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                      minWidth: 130,
                      fontFamily: '"DM Sans",system-ui,sans-serif',
                    }}
                    onMouseEnter={function(e) { e.currentTarget.style.borderColor = '#0D7377'; }}
                    onMouseLeave={function(e) { e.currentTarget.style.borderColor = '#2a3e14'; }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e8f5c8' }}>{a.label}</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#0D7377' }}>
                      {loading === a.key ? '...' : '$' + a.price + '/mo'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Upgrade plans — shown when there are higher plans to upgrade to */}
        {plans.length > 0 && (
          <>
            {showAddons && (
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4a6020', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Or upgrade your plan
              </div>
            )}
            <div className={styles.plans}>
              {plans.map(function(plan) {
                return (
                  <div key={plan.id} className={styles.planCard}>
                    <div className={styles.planName}>{plan.name}</div>
                    <div className={styles.planPrice}>
                      <span className={styles.planCurrency}>$</span>
                      {plan.price}
                      <span className={styles.planPeriod}>/mo</span>
                    </div>
                    <button
                      className={styles.upgradeBtn}
                      onClick={function() { upgrade(plan.id); }}
                      disabled={loading === plan.id}
                    >
                      {loading === plan.id ? 'Redirecting...' : 'Upgrade to ' + plan.name}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className={styles.note}>Secured by Stripe · Cancel anytime</p>
      </div>
    </div>
  );
}

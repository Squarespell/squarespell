'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PLANS } from '@/lib/planCatalog';
import type { Plan } from '@/lib/planCatalog';
import { EMAIL_ADDONS, LEAD_ADDONS, TRIAL_DAYS } from '@/lib/plans';
import { ROUTES } from './routes';

type Billing = 'monthly' | 'yearly';

// Presentation-only labels. Every price, limit and feature on this section is
// read from lib/planCatalog.ts and lib/plans.ts. Nothing is duplicated here.
const TAGS: Record<string, string> = {
  core: 'For a focused funnel',
  pro: 'For serious lead generation',
  business: 'For teams and scale',
};
const BUSINESS_HIGHLIGHTS = /white-label|custom domain|team seats|api access|priority support|onboarding/i;

// Catalog wording is reused as written, with two display rules: no claim of
// automatic page insertion ("one-click connect" reads "connect") and no em dashes.
function clean(text: string): string {
  return text.replace('one-click connect', 'connect').replace(/\s\u2014\s/g, ': ');
}

function features(plan: Plan): string[] {
  if (plan.key === 'business') {
    return ['Everything in Pro', ...plan.included.filter((f) => BUSINESS_HIGHLIGHTS.test(f))].slice(0, 6).map(clean);
  }
  return plan.included.slice(0, 6).map(clean);
}

function addonLine(packs: { price: number; amount: number }[]): string {
  return packs.map((p) => '+' + p.amount.toLocaleString('en-US') + ' for $' + p.price).join(' \u00b7 ') + ' per month';
}

export function PricingSection() {
  const [billing, setBilling] = useState<Billing>('monthly');
  const leadPacks = LEAD_ADDONS.map((a) => ({ amount: a.leads, price: a.price }));
  const emailPacks = EMAIL_ADDONS.map((a) => ({ amount: a.emails, price: a.price }));

  return (
    <section className="pricing section" id="pricing">
      <div className="shell">
        <div className="kicker reveal">Current product pricing</div>
        <div className="section-head reveal">
          <h2>Three plans. Every one starts with Pro.</h2>
          <p>Try the full Pro feature set for {TRIAL_DAYS} days. No credit card. Then choose the plan that fits your traffic and workflow.</p>
        </div>
        <div className="billing-switch reveal" role="group" aria-label="Billing period">
          <button type="button" data-billing="monthly" aria-pressed={billing === 'monthly'} onClick={() => setBilling('monthly')}>Pay monthly</button>
          <button type="button" data-billing="yearly" aria-pressed={billing === 'yearly'} onClick={() => setBilling('yearly')}>Pay yearly and save</button>
        </div>
        <div className="pricing-grid">
          {PLANS.map((plan) => {
            const price = billing === 'monthly' ? plan.monthly : plan.yearly;
            const note = billing === 'monthly' ? 'Billed monthly' : '$' + plan.yearlyTotal + ' billed yearly \u00b7 save $' + plan.yearlySave;
            return (
              <article key={plan.key} className={'plan reveal' + (plan.featured ? ' featured' : '')}>
                {plan.featured && <span className="plan-badge">Most popular</span>}
                <span className="tag">{TAGS[plan.key]}</span>
                <h3>{plan.name}</h3>
                <p className="plan-desc">{clean(plan.desc)}</p>
                <div className="plan-price">
                  <sup>$</sup>
                  <span data-price={plan.key}>{price}</span>
                  <small>/ month</small>
                </div>
                <p className="plan-billing" data-billing-note={plan.key}>{note}</p>
                <div className="plan-limits">
                  <div><strong>{plan.limits.quizzes}</strong>quizzes</div>
                  <div><strong>{plan.limits.leads}</strong>leads</div>
                  <div><strong>{plan.limits.emails}</strong>emails</div>
                </div>
                <ul>
                  {features(plan).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link href={ROUTES.trial} className={'button ' + (plan.featured ? 'teal' : 'ghost')}>
                  Start {TRIAL_DAYS}-day trial <span className="arr">↗</span>
                </Link>
              </article>
            );
          })}
        </div>
        <div className="price-addons reveal">
          <div className="addon">
            <strong>Lead add-ons</strong>
            <span>{addonLine(leadPacks)}</span>
            <span className="tag">Core + Pro</span>
          </div>
          <div className="addon">
            <strong>Email add-ons</strong>
            <span>{addonLine(emailPacks)}</span>
            <span className="tag">Core + Pro</span>
          </div>
        </div>
        <p className="trial-note"><strong>{TRIAL_DAYS} days of Pro included.</strong> No card required. Cancel a paid plan any time.</p>
      </div>
    </section>
  );
}

import { describe, it, expect } from 'vitest';
import { computeBanners } from '../../app/dashboard/_components/TopBanner';
import { shouldShowPublishCard } from '../../app/dashboard/_components/PublishUpgradeCard';
import { checkoutHref, daysUntil, isUnpaid, monthlyPrice, planName } from '../billing';

const DAY = 86400000;
const NOW = Date.UTC(2026, 9, 5, 12);
const iso = (ms: number) => new Date(ms).toISOString();

describe('dashboard banner', () => {
  it('shows the trial countdown for accounts stored as "free" during their trial (it only looked for "trial" before)', () => {
    const b = computeBanners({ plan: 'free', trial_ends_at: iso(NOW + 9 * DAY), trial_active: true, total_leads: 0 }, { now: NOW });
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ variant: 'trial', placement: 'banner_trial', ctaLabel: 'Choose a plan' });
    expect(b[0].message).toBe('9 days left in your free trial. Plans start at $9/mo.');
  });

  it('leads the countdown with the leads collected so far', () => {
    const b = computeBanners({ plan: 'free', trial_ends_at: iso(NOW + 2 * DAY), trial_active: true, total_leads: 12 }, { now: NOW });
    expect(b[0].message).toBe('2 days left in your trial. Your quizzes have collected 12 leads so far. Choose a plan to keep them coming.');
    expect(b[0].placement).toBe('banner_trial_urgent');
  });

  it('after the trial: the waiting leads and the win-back offer, linking straight to checkout', () => {
    const b = computeBanners({ plan: 'free', trial_ends_at: iso(NOW - 3 * DAY), trial_active: false, held_leads: { count: 8 }, offer: 'winback' }, { now: NOW });
    expect(b[0].message).toBe('Your trial has ended. 8 new leads are waiting, kept for 30 days. Come back with 20% off your first 3 months.');
    expect(b[0].ctaLabel).toBe('Get 20% off');
    expect(b[0].ctaHref).toBe('/dashboard/billing?plan=pro&billing=monthly&checkout=1&offer=winback&from=banner');
    expect(b[0].dismissKey).toBe('trial_ended_8');
  });

  it('after the trial with nothing waiting and no offer: says what happens to new leads', () => {
    const b = computeBanners({ plan: 'free', trial_ends_at: iso(NOW - 60 * DAY), trial_active: false, held_leads: { count: 0 }, offer: null }, { now: NOW });
    expect(b[0].message).toBe('Your trial has ended. Your quizzes are still live, but new leads are held until you choose a plan.');
    expect(b[0].ctaLabel).toBe('Choose a plan');
  });

  it('paying accounts get a heads-up at 80% of their monthly leads, and nothing below it', () => {
    expect(computeBanners({ plan: 'core', limits: { leads: 1000 }, leads_this_month: 790 }, { now: NOW })).toHaveLength(0);
    const b = computeBanners({ plan: 'core', limits: { leads: 1000 }, leads_this_month: 820 }, { now: NOW });
    expect(b[0]).toMatchObject({ message: 'You have used 820 of 1,000 leads this month.', ctaHref: '/dashboard/billing?tab=addons', placement: 'banner_usage' });
    expect(computeBanners({ plan: 'business', limits: { leads: null }, leads_this_month: 99999 }, { now: NOW })).toHaveLength(0);
  });

  it('after checkout: a payment confirmation, or "being activated" while the webhook is on its way', () => {
    expect(computeBanners({ plan: 'pro' }, { now: NOW, upgraded: 'true' })[0].message).toMatch(/^Payment received\. You’re on Pro\./);
    expect(computeBanners({ plan: 'free', trial_ends_at: iso(NOW + 5 * DAY), trial_active: true }, { now: NOW, upgraded: 'true' })[0].message).toMatch(/being activated/);
  });
});

describe('publish card', () => {
  const trial = (days: number) => ({ plan: 'free', trial_active: true, trial_ends_at: iso(NOW + days * DAY) });
  it('shows on the first publish of a trial account, and again in the last 3 days', () => {
    expect(shouldShowPublishCard(trial(10), false, NOW)).toBe(true);
    expect(shouldShowPublishCard(trial(10), true, NOW)).toBe(false);
    expect(shouldShowPublishCard(trial(3), true, NOW)).toBe(true);
  });
  it('never shows to paying accounts, after the trial, or without plan data', () => {
    expect(shouldShowPublishCard({ plan: 'pro', trial_ends_at: null }, false, NOW)).toBe(false);
    expect(shouldShowPublishCard({ plan: 'free', trial_active: false, trial_ends_at: iso(NOW - DAY) }, false, NOW)).toBe(false);
    expect(shouldShowPublishCard(null, false, NOW)).toBe(false);
  });
});

describe('billing helpers', () => {
  it('treats free and trial as unpaid', () => {
    expect(isUnpaid('free')).toBe(true);
    expect(isUnpaid('trial')).toBe(true);
    expect(isUnpaid(undefined)).toBe(true);
    expect(isUnpaid('core')).toBe(false);
  });
  it('prices and names come from the plan catalog', () => {
    expect(monthlyPrice('pro', 'yearly')).toBe(16);
    expect(monthlyPrice('pro', 'monthly')).toBe(19);
    expect(planName('business')).toBe('Business');
  });
  it('builds the one-click checkout link and counts days left', () => {
    expect(checkoutHref()).toBe('/dashboard/billing?plan=pro&billing=yearly&checkout=1');
    expect(daysUntil(iso(NOW + 1.2 * DAY), NOW)).toBe(2);
    expect(daysUntil(iso(NOW - DAY), NOW)).toBe(0);
  });
});

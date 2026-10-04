/**
 * App analytics helpers (lib/analytics.ts): consent off by default, Google's script only after "Accept", and no
 * analytics on quiz-taker pages. SEO plan Segment 4, tasks 4.1 and 4.2.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function fresh() {
  vi.resetModules();
  return import('../analytics');
}

const googleScripts = () =>
  Array.from(document.querySelectorAll('script')).filter((s) => (s.getAttribute('src') || '').includes('googletagmanager.com'));
const commands = () => ((window as any).dataLayer as any[]).map((a) => Array.from(a));

beforeEach(() => {
  delete (window as any).__sqsAnalytics;
  delete (window as any).gtag;
  (window as any).dataLayer = [];
  document.head.innerHTML = '';
  document.cookie = 'sqs_consent=; path=/; max-age=0';
});
afterEach(() => {
  document.cookie = 'sqs_consent=; path=/; max-age=0';
});

describe('isAnalyticsPage', () => {
  it('skips quiz-taker pages and pop-up helpers', async () => {
    const { isAnalyticsPage } = await fresh();
    for (const p of ['/q/abc', '/quiz/abc', '/embed/abc', '/pricing-embed', '/sso-popup-done', '/unsubscribe']) {
      expect(isAnalyticsPage(p)).toBe(false);
    }
    for (const p of ['/', '/tools/quiz-funnel/build', '/templates', '/sign-up', '/dashboard/quizzes', '/quizzes']) {
      expect(isAnalyticsPage(p)).toBe(true);
    }
  });
});

describe('readConsent', () => {
  it('reads the choice cookie shared with squarespellquiz.com', async () => {
    const { readConsent } = await fresh();
    expect(readConsent('a=1; sqs_consent=granted; b=2')).toBe('granted');
    expect(readConsent('sqs_consent=denied')).toBe('denied');
    expect(readConsent('sqs_consent=maybe')).toBe('');
    expect(readConsent('')).toBe('');
  });
});

describe('initAnalytics', () => {
  it('queues consent "denied" before the config and fetches nothing until the visitor chooses', async () => {
    const { initAnalytics, GA_ID } = await fresh();
    initAnalytics();
    const c = commands();
    expect(c[0]).toEqual(['consent', 'default', expect.objectContaining({ analytics_storage: 'denied', ad_storage: 'denied' })]);
    expect(c.findIndex((x) => x[0] === 'config' && x[1] === GA_ID)).toBeGreaterThan(0);
    expect(googleScripts()).toHaveLength(0);
  });

  it('loads Google\'s script straight away when the visitor already accepted', async () => {
    document.cookie = 'sqs_consent=granted; path=/';
    const { initAnalytics } = await fresh();
    initAnalytics();
    expect(commands()).toContainEqual(['consent', 'update', { analytics_storage: 'granted' }]);
    expect(googleScripts()).toHaveLength(1);
  });
});

describe('setConsent and track', () => {
  it('"Reject" never loads Google\'s script; "Accept" loads it once', async () => {
    const { initAnalytics, setConsent } = await fresh();
    initAnalytics();
    setConsent('denied');
    expect(commands()).toContainEqual(['consent', 'update', { analytics_storage: 'denied' }]);
    expect(googleScripts()).toHaveLength(0);
    setConsent('granted');
    setConsent('granted');
    expect(commands()).toContainEqual(['consent', 'update', { analytics_storage: 'granted' }]);
    expect(googleScripts()).toHaveLength(1);
  });

  it('queues events, and does nothing where analytics never started', async () => {
    const { initAnalytics, track } = await fresh();
    track('sign_up', { method: 'email' });
    expect(commands()).toHaveLength(0);
    initAnalytics();
    track('sign_up', { method: 'email' });
    expect(commands()).toContainEqual(['event', 'sign_up', { method: 'email' }]);
  });
});

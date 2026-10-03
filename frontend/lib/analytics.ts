/**
 * Google Analytics for the app, sharing the visitor's choice with squarespellquiz.com (SEO plan Segment 4, tasks 4.1
 * and 4.2). Analytics stays off until the visitor accepts: consent defaults to "denied", and Google's script is only
 * fetched after "Accept". The choice is the first-party cookie "sqs_consent" on .squarespellquiz.com, kept 180 days,
 * so a choice made on either host applies on both.
 *
 * Never on quiz-taker pages (published quizzes, embeds): those visitors belong to our customers. Events never carry an
 * email address, a name or a website address someone typed.
 */

// The squarespellquiz.com property, so site and app visits are counted in one place. A measurement ID is public.
export const GA_ID = 'G-GQ7K3MYJBL';
export const CONSENT_COOKIE = 'sqs_consent';
const KEEP_SECONDS = 180 * 24 * 60 * 60;

export type Consent = 'granted' | 'denied' | '';
type Params = Record<string, string | number | boolean>;

/** Quiz-taker pages and pop-up helpers never load analytics. */
const NO_ANALYTICS = /^\/(embed|pricing-embed|q|quiz|sso-popup-done|sso-callback|oauth-popup|unsubscribe)(\/|$)/;

export function isAnalyticsPage(pathname: string): boolean {
  return !NO_ANALYTICS.test(pathname || '/');
}

export function readConsent(cookie: string = typeof document !== 'undefined' ? document.cookie : ''): Consent {
  const m = /(?:^|;\s*)sqs_consent=(granted|denied)(?:;|$)/.exec(cookie);
  return m ? (m[1] as Consent) : '';
}

function win(): any {
  return typeof window !== 'undefined' ? window : null;
}

let scriptAdded = false;
function loadGoogleScript() {
  if (scriptAdded || typeof document === 'undefined') return;
  scriptAdded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
}

/** Queues the consent default and the config once per page. Fetches Google's script only if the visitor accepted. */
export function initAnalytics() {
  const w = win();
  if (!w || w.__sqsAnalytics) return;
  w.__sqsAnalytics = true;
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== 'function') w.gtag = function () { w.dataLayer.push(arguments); };
  w.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  w.gtag('js', new Date());
  w.gtag('config', GA_ID);
  if (readConsent() === 'granted') {
    w.gtag('consent', 'update', { analytics_storage: 'granted' });
    loadGoogleScript();
  }
}

// Rejecting after an earlier "Accept" also removes the analytics cookies already set.
function dropGoogleCookies() {
  document.cookie.split(';').forEach(function (c) {
    const name = c.split('=')[0].trim();
    if (name.indexOf('_ga') !== 0) return;
    ['', '; domain=.squarespellquiz.com', '; domain=squarespellquiz.com'].forEach(function (d) {
      document.cookie = name + '=; path=/; max-age=0' + d;
    });
  });
}

export function setConsent(choice: 'granted' | 'denied') {
  const w = win();
  if (!w) return;
  const shared = /(^|\.)squarespellquiz\.com$/.test(w.location.hostname) ? '; domain=.squarespellquiz.com' : '';
  document.cookie = CONSENT_COOKIE + '=' + choice + '; path=/; max-age=' + KEEP_SECONDS + '; SameSite=Lax; Secure' + shared;
  if (typeof w.gtag !== 'function') return;
  if (choice === 'granted') {
    w.gtag('consent', 'update', { analytics_storage: 'granted' });
    loadGoogleScript();
  } else {
    w.gtag('consent', 'update', { analytics_storage: 'denied' });
    dropGoogleCookies();
  }
}

/** Queues an event. It reaches Google only after the visitor accepts, and does nothing where analytics never starts. */
export function track(name: string, params?: Params) {
  const w = win();
  if (!w || typeof w.gtag !== 'function') return;
  try { w.gtag('event', name, params || {}); } catch { /* analytics must never break the page */ }
}

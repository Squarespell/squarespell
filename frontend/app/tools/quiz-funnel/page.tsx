'use client';

/**
 * /tools/quiz-funnel - Public marketing landing page for Squarespell
 *
 * Design reference: Typeset-style clean layout
 *   - White background, teal accent (#0D7377)
 *   - Hero: left text + right quiz mockup with URL input
 *   - How It Works: 3 numbered steps
 *   - Features: left text list + right dashboard mockup
 *   - Social proof: stats + logo bar
 *   - Pricing: 3 cards with monthly/annual toggle
 *   - Templates: category tabs + cards
 *   - FAQ: accordion
 *   - Final CTA: dark teal background
 *   - Footer: multi-column links
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QUIZ_BUILDER_PATH } from '@/lib/urls';
import { QUIZ_TEMPLATE_CATALOG } from '@/lib/quiz/templates';

var TRY_URL = QUIZ_BUILDER_PATH;
var SIGN_IN_URL = '/sign-in';

function normalizeUrl(raw: string): string {
  var u = raw.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

type Plan = {
  name: string;
  monthly: number;
  yearly: number;
  desc: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
};

var PLANS: Plan[] = [
  {
    name: 'Starter',
    monthly: 19,
    yearly: 15,
    desc: 'Perfect for trying out Squarespell.',
    features: [
      '1 website',
      'Unlimited quizzes',
      '500 leads / month',
      'Basic analytics',
    ],
    cta: 'Start free',
    href: TRY_URL,
  },
  {
    name: 'Pro',
    monthly: 39,
    yearly: 31,
    desc: 'Everything you need to grow.',
    features: [
      '3 websites',
      'Unlimited quizzes',
      'Unlimited leads',
      'Advanced logic',
      'Remove Squarespell branding',
      'Priority support',
    ],
    cta: 'Start free',
    href: TRY_URL,
    featured: true,
  },
  {
    name: 'Business',
    monthly: 79,
    yearly: 63,
    desc: 'For scaling teams and brands.',
    features: [
      '10 websites',
      'Unlimited quizzes',
      'Unlimited leads',
      'Advanced analytics',
      'Custom CSS',
      'Priority support',
    ],
    cta: 'Start free',
    href: TRY_URL,
  },
];

var FAQS = [
  {
    q: 'How does Squarespell work with Squarespace?',
    a: 'Squarespell is built specifically for Squarespace 7.1. You embed quizzes via code injection — one snippet in a Code Block. No plugins to install, no iframes. Your quiz loads natively inside your site.',
  },
  {
    q: 'Do I need coding skills?',
    a: 'No. Paste your URL, our AI generates a branded quiz. Edit anything in the visual editor. Copy one snippet to embed. The entire process takes under 5 minutes.',
  },
  {
    q: 'Can I customize the design?',
    a: 'Yes. Colors, fonts, and tone are pulled from your site automatically. You can override everything in the brand kit — including separate light and dark mode palettes.',
  },
  {
    q: 'What about my leads and data?',
    a: 'Leads land in your dashboard instantly. Export to CSV anytime, or connect Mailchimp, Klaviyo, ConvertKit, Google Sheets, Zapier, or custom webhooks. Your data is always yours.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrade, downgrade, or cancel anytime. All plans include a 14-day free trial. No credit card required to start.',
  },
];

var TEMPLATE_CATEGORIES = ['All', 'Lead Generation', 'Recommendation', 'Survey', 'Assessment'];

export default function LandingPage() {
  var router = useRouter();
  var [openFaq, setOpenFaq] = useState<number | null>(null);
  var [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  var [heroUrl, setHeroUrl] = useState('');
  var [heroSubmitting, setHeroSubmitting] = useState(false);
  var [activeTemplateCat, setActiveTemplateCat] = useState('All');

  var handleGenerate = function(e: React.FormEvent) {
    e.preventDefault();
    var normalized = normalizeUrl(heroUrl);
    if (!normalized) return;
    setHeroSubmitting(true);
    router.push(QUIZ_BUILDER_PATH + '?url=' + encodeURIComponent(normalized));
  };

  var filteredTemplates = useMemo(function() {
    var all = QUIZ_TEMPLATE_CATALOG || [];
    if (activeTemplateCat === 'All') return all.slice(0, 4);
    return all.filter(function(t: any) {
      return t.category === activeTemplateCat;
    }).slice(0, 4);
  }, [activeTemplateCat]);

  return (
    <div className="ss-landing">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ========== NAV ========== */}
      <header className="ss-nav">
        <div className="ss-nav-inner">
          <Link href="/" className="ss-logo">
            <span className="ss-logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="4" fill="#0D7377" />
                <path d="M8 12.5l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Squarespell
          </Link>
          <nav className="ss-nav-links">
            <a href="#features">Features</a>
            <Link href="/templates">Templates</Link>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="ss-nav-right">
            <Link href={SIGN_IN_URL} className="ss-nav-signin">Log in</Link>
            <Link href={TRY_URL} className="ss-btn ss-btn-primary ss-btn-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ========== HERO ========== */}
      <section className="ss-hero">
        <div className="ss-hero-inner">
          <div className="ss-hero-left">
            <div className="ss-hero-badge">
              <span className="ss-hero-badge-dot" />
              Live quiz in minutes, not hours
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </div>
            <h1 className="ss-hero-title">
              Turn Squarespace{'\n'}visitors into{'\n'}
              <span className="ss-hero-accent">qualified leads.</span>
            </h1>
            <p className="ss-hero-sub">
              Create beautiful, high-converting quizzes that engage your audience, capture the right leads, and grow your business &mdash; all from your Squarespace website.
            </p>
            <form className="ss-hero-form" onSubmit={handleGenerate}>
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="Enter your website URL"
                value={heroUrl}
                onChange={function(e) { setHeroUrl(e.target.value.replace(/^https?:\/\//i, '')); }}
                className="ss-hero-input"
                disabled={heroSubmitting}
              />
              <button
                type="submit"
                className="ss-btn ss-btn-primary ss-hero-cta"
                disabled={heroSubmitting || !heroUrl.trim()}
              >
                {heroSubmitting ? 'Creating...' : 'Create my quiz'}
              </button>
            </form>
            <div className="ss-hero-trust">
              <span className="ss-trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                No credit card required
              </span>
              <span className="ss-trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                Free forever plan
              </span>
            </div>
            <div className="ss-hero-loved">
              <div className="ss-hero-avatars">
                <span className="ss-avatar" style={{ background: '#0D7377' }}>S</span>
                <span className="ss-avatar" style={{ background: '#6366f1' }}>M</span>
                <span className="ss-avatar" style={{ background: '#ec4899' }}>J</span>
                <span className="ss-avatar" style={{ background: '#f59e0b' }}>A</span>
                <span className="ss-avatar" style={{ background: '#10b981' }}>K</span>
              </div>
              <span className="ss-hero-loved-text">
                Loved by <strong>2,000+</strong> creators and businesses
              </span>
              <span className="ss-hero-stars">★★★★★ 4.9/5</span>
            </div>
          </div>
          <div className="ss-hero-right">
            <div className="ss-mockup">
              <div className="ss-mockup-browser">
                <div className="ss-mockup-dots"><span /><span /><span /></div>
              </div>
              <div className="ss-mockup-body">
                <div className="ss-mockup-q-label">
                  <span className="ss-mockup-q-icon">Q</span>
                  What&apos;s your biggest challenge right now?
                </div>
                <p className="ss-mockup-q-help">This helps us personalize your results.</p>
                <div className="ss-mockup-options">
                  <div className="ss-mockup-opt">
                    <span className="ss-mockup-letter">A</span>
                    Getting more leads
                  </div>
                  <div className="ss-mockup-opt ss-mockup-opt-selected">
                    <span className="ss-mockup-letter ss-mockup-letter-active">B</span>
                    Increasing sales
                  </div>
                  <div className="ss-mockup-opt">
                    <span className="ss-mockup-letter">C</span>
                    Building an audience
                  </div>
                  <div className="ss-mockup-opt">
                    <span className="ss-mockup-letter">D</span>
                    All of the above
                  </div>
                </div>
                <button className="ss-mockup-next">Next →</button>
              </div>
              {/* Floating labels */}
              <div className="ss-mockup-float ss-mockup-float-brand">
                Beautiful<br />on-brand design
              </div>
              <div className="ss-mockup-float ss-mockup-float-logic">
                Smart logic<br />better results
              </div>
              <div className="ss-mockup-float ss-mockup-float-powered">
                Powered by Squarespell
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how" className="ss-section">
        <div className="ss-container">
          <div className="ss-section-label">HOW IT WORKS</div>
          <h2 className="ss-h2">From URL to live quiz in three steps.</h2>
          <div className="ss-steps">
            <div className="ss-step">
              <div className="ss-step-num">1</div>
              <h3 className="ss-step-title">Add your URL</h3>
              <p className="ss-step-body">Enter your Squarespace site URL and we&apos;ll import your branding automatically.</p>
            </div>
            <div className="ss-step">
              <div className="ss-step-num">2</div>
              <h3 className="ss-step-title">Build your quiz</h3>
              <p className="ss-step-body">Use our no-code builder to create engaging questions and logic in minutes.</p>
            </div>
            <div className="ss-step">
              <div className="ss-step-num">3</div>
              <h3 className="ss-step-title">Publish &amp; grow</h3>
              <p className="ss-step-body">Embed your quiz, start collecting leads, and get insights that help you grow.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section id="features" className="ss-section ss-section-alt">
        <div className="ss-container">
          <div className="ss-features-layout">
            <div className="ss-features-left">
              <div className="ss-section-label">BUILT FOR SQUARESPACE. NOT RETROFITTED.</div>
              <h2 className="ss-h2" style={{ textAlign: 'left' }}>Everything you need.<br />Designed to convert.</h2>
              <div className="ss-feature-list">
                <div className="ss-feat-item">
                  <div className="ss-feat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
                  </div>
                  <div>
                    <div className="ss-feat-title">Seamless integration</div>
                    <div className="ss-feat-desc">Works beautifully inside your Squarespace site.</div>
                  </div>
                </div>
                <div className="ss-feat-item">
                  <div className="ss-feat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" /></svg>
                  </div>
                  <div>
                    <div className="ss-feat-title">Advanced logic jumps</div>
                    <div className="ss-feat-desc">Show the right questions to the right people.</div>
                  </div>
                </div>
                <div className="ss-feat-item">
                  <div className="ss-feat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  </div>
                  <div>
                    <div className="ss-feat-title">Lead capture that converts</div>
                    <div className="ss-feat-desc">Collect emails with smart forms and incentives.</div>
                  </div>
                </div>
                <div className="ss-feat-item">
                  <div className="ss-feat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  </div>
                  <div>
                    <div className="ss-feat-title">Actionable analytics</div>
                    <div className="ss-feat-desc">See what&apos;s working and optimize for more leads.</div>
                  </div>
                </div>
              </div>
              <a href="#pricing" className="ss-link-arrow">
                Explore all features →
              </a>
            </div>
            <div className="ss-features-right">
              <div className="ss-dash-mockup">
                <div className="ss-dash-header">
                  <div className="ss-dash-nav">
                    <span className="ss-dash-nav-item ss-dash-nav-active">Overview</span>
                    <span className="ss-dash-nav-item">Quizzes</span>
                    <span className="ss-dash-nav-item">Leads</span>
                    <span className="ss-dash-nav-item">Analytics</span>
                    <span className="ss-dash-nav-item">Integrations</span>
                    <span className="ss-dash-nav-item">Settings</span>
                  </div>
                </div>
                <div className="ss-dash-stats">
                  <div className="ss-dash-stat">
                    <div className="ss-dash-stat-label">Total Leads</div>
                    <div className="ss-dash-stat-value">2,847</div>
                    <div className="ss-dash-stat-trend ss-trend-up">+24.9%</div>
                  </div>
                  <div className="ss-dash-stat">
                    <div className="ss-dash-stat-label">Completion Rate</div>
                    <div className="ss-dash-stat-value">67%</div>
                    <div className="ss-dash-stat-trend ss-trend-up">+12.3%</div>
                  </div>
                  <div className="ss-dash-stat">
                    <div className="ss-dash-stat-label">Engagement Score</div>
                    <div className="ss-dash-stat-value">8.7/10</div>
                    <div className="ss-dash-stat-trend ss-trend-up">+18.2%</div>
                  </div>
                </div>
                <div className="ss-dash-chart">
                  <div className="ss-dash-chart-title">Leads over time</div>
                  <svg viewBox="0 0 400 120" width="100%" height="120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#0D7377" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#0D7377" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0 100 L50 90 L100 85 L150 70 L200 60 L250 45 L300 35 L350 20 L400 10 L400 120 L0 120 Z" fill="url(#chartGrad)" />
                    <path d="M0 100 L50 90 L100 85 L150 70 L200 60 L250 45 L300 35 L350 20 L400 10" stroke="#0D7377" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <circle cx="350" cy="20" r="4" fill="#0D7377" />
                  </svg>
                  <div className="ss-dash-chart-labels">
                    <span>May 12</span><span>May 17</span><span>Jun 28</span>
                  </div>
                  <div className="ss-dash-chart-badge">412 leads</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SOCIAL PROOF ========== */}
      <section className="ss-social-proof">
        <div className="ss-container">
          <div className="ss-proof-label">TRUSTED BY CREATORS &amp; BUSINESSES WORLDWIDE</div>
          <h2 className="ss-proof-title">Join thousands of people turning quizzes into growth.</h2>
          <div className="ss-proof-stats">
            <div className="ss-proof-stat">
              <div className="ss-proof-stat-num">2,000+</div>
              <div className="ss-proof-stat-label">Active users</div>
            </div>
            <div className="ss-proof-stat">
              <div className="ss-proof-stat-num">15K+</div>
              <div className="ss-proof-stat-label">Quizzes created</div>
            </div>
            <div className="ss-proof-stat">
              <div className="ss-proof-stat-num">3.2M+</div>
              <div className="ss-proof-stat-label">Leads generated</div>
            </div>
            <div className="ss-proof-stat">
              <div className="ss-proof-stat-num">4.9/5</div>
              <div className="ss-proof-stat-label">Average rating</div>
            </div>
          </div>
          <div className="ss-proof-logos">
            <span className="ss-proof-logo">Later</span>
            <span className="ss-proof-logo ss-proof-logo-bold">INKED</span>
            <span className="ss-proof-logo">CULTIVATE</span>
            <span className="ss-proof-logo ss-proof-logo-bold">NICHE</span>
            <span className="ss-proof-logo ss-proof-logo-script">studio milo.</span>
            <span className="ss-proof-logo ss-proof-logo-serif">THE POSH PAPERIE</span>
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="pricing" className="ss-section">
        <div className="ss-container">
          <h2 className="ss-h2">Simple pricing. Unbeatable value.</h2>
          <div className="ss-billing-toggle">
            <button
              className={'ss-toggle-btn ' + (billing === 'monthly' ? 'ss-toggle-active' : '')}
              onClick={function() { setBilling('monthly'); }}
              type="button"
            >
              Monthly
            </button>
            <button
              className={'ss-toggle-btn ' + (billing === 'yearly' ? 'ss-toggle-active' : '')}
              onClick={function() { setBilling('yearly'); }}
              type="button"
            >
              Annual
              <span className="ss-toggle-save">Save 20%</span>
            </button>
          </div>
          <div className="ss-plans">
            {PLANS.map(function(p) {
              var price = billing === 'yearly' ? p.yearly : p.monthly;
              return (
                <div key={p.name} className={'ss-plan ' + (p.featured ? 'ss-plan-featured' : '')}>
                  {p.featured && <div className="ss-plan-badge">Most popular</div>}
                  <div className="ss-plan-name">{p.name}</div>
                  <div className="ss-plan-desc">{p.desc}</div>
                  <div className="ss-plan-price">
                    <span className="ss-plan-amount">${price}</span>
                    <span className="ss-plan-per">/month</span>
                  </div>
                  <div className="ss-plan-billed">
                    {billing === 'yearly' ? 'Billed annually' : 'Billed monthly'}
                  </div>
                  <ul className="ss-plan-features">
                    {p.features.map(function(f) {
                      return (
                        <li key={f}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                          {f}
                        </li>
                      );
                    })}
                  </ul>
                  <Link
                    href={p.href}
                    className={'ss-btn ss-plan-cta ' + (p.featured ? 'ss-btn-primary' : 'ss-btn-outline')}
                  >
                    {p.cta}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="ss-plans-note">All plans include a 14-day free trial. Cancel anytime.</p>
        </div>
      </section>

      {/* ========== TEMPLATES ========== */}
      <section id="templates" className="ss-section ss-section-alt">
        <div className="ss-container">
          <h2 className="ss-h2">Start fast with proven templates.</h2>
          <p className="ss-section-sub">Beautiful, high-converting quiz templates you can customize in minutes.</p>
          <div className="ss-tpl-tabs">
            {TEMPLATE_CATEGORIES.map(function(cat) {
              return (
                <button
                  key={cat}
                  className={'ss-tpl-tab ' + (activeTemplateCat === cat ? 'ss-tpl-tab-active' : '')}
                  onClick={function() { setActiveTemplateCat(cat); }}
                  type="button"
                >
                  {cat}
                </button>
              );
            })}
          </div>
          <div className="ss-tpl-grid">
            {filteredTemplates.map(function(tpl: any) {
              return (
                <Link
                  key={tpl.id}
                  href={'/templates/' + tpl.id + '/preview'}
                  className="ss-tpl-card"
                >
                  <div className="ss-tpl-thumb">
                    <div className="ss-tpl-thumb-inner" style={{ background: 'linear-gradient(135deg, #0D7377 0%, #0a5c5f 100%)' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={tpl.iconPath || 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'} />
                      </svg>
                    </div>
                  </div>
                  <h3 className="ss-tpl-name">{tpl.name}</h3>
                  <p className="ss-tpl-desc">{tpl.description}</p>
                  <span className="ss-tpl-preview">Preview →</span>
                </Link>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link href="/templates" className="ss-link-arrow">
              View all templates →
            </Link>
          </div>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section id="faq" className="ss-section">
        <div className="ss-container ss-faq-container">
          <div className="ss-faq-label">QUESTIONS? WE&apos;VE GOT ANSWERS.</div>
          <h2 className="ss-h2">Frequently asked questions</h2>
          <div className="ss-faq">
            {FAQS.map(function(f, i) {
              return (
                <button
                  key={f.q}
                  className={'ss-faq-item ' + (openFaq === i ? 'ss-faq-open' : '')}
                  onClick={function() { setOpenFaq(openFaq === i ? null : i); }}
                  type="button"
                >
                  <div className="ss-faq-q">
                    {f.q}
                    <svg className="ss-faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </div>
                  {openFaq === i && <div className="ss-faq-a">{f.a}</div>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="ss-final">
        <div className="ss-final-inner">
          <h2 className="ss-final-title">Your next lead is one quiz away.</h2>
          <p className="ss-final-sub">Join thousands of creators and businesses growing with Squarespell.</p>
          <Link href={TRY_URL} className="ss-btn ss-btn-white ss-btn-lg">
            Create my quiz free
          </Link>
          <div className="ss-final-note">No credit card required. Free forever plan.</div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="ss-footer">
        <div className="ss-footer-inner">
          <div className="ss-footer-brand">
            <div className="ss-logo">
              <span className="ss-logo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="4" fill="#0D7377" />
                  <path d="M8 12.5l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Squarespell
            </div>
            <p className="ss-footer-tag">The leading quiz platform for Squarespace websites.</p>
            <div className="ss-footer-social">
              <a href="https://instagram.com/squarespell" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
              </a>
              <a href="https://youtube.com/@squarespell" aria-label="YouTube">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>
              </a>
              <a href="https://x.com/squarespell" aria-label="X">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
            </div>
          </div>
          <div className="ss-footer-cols">
            <div className="ss-footer-col">
              <div className="ss-footer-col-title">Product</div>
              <a href="#features">Features</a>
              <Link href="/templates">Templates</Link>
              <a href="#pricing">Pricing</a>
              <a href="#">Changelog</a>
            </div>
            <div className="ss-footer-col">
              <div className="ss-footer-col-title">Resources</div>
              <a href="#">Documentation</a>
              <a href="#">Help center</a>
              <a href="#">Blog</a>
              <a href="#">Community</a>
            </div>
            <div className="ss-footer-col">
              <div className="ss-footer-col-title">Company</div>
              <a href="#">About</a>
              <a href="#">Careers</a>
              <a href="mailto:hello@squarespell.com">Contact</a>
              <a href="#">Partners</a>
            </div>
            <div className="ss-footer-col">
              <div className="ss-footer-col-title">Legal</div>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="#">Cookies</a>
            </div>
          </div>
        </div>
        <div className="ss-footer-bottom">
          &copy; {new Date().getFullYear()} Squarespell. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

/* ========== INLINE CSS ========== */

var CSS = `
/* ---- Reset & Base ---- */
.ss-landing {
  --accent: #0D7377;
  --accent-light: rgba(13,115,119,0.08);
  --accent-hover: #0a5c5f;
  --bg: #FFFFFF;
  --bg-alt: #F9FAFB;
  --text: #101828;
  --text-secondary: #475467;
  --text-muted: #667085;
  --border: #EAECF0;
  --border-strong: #D0D5DD;

  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  line-height: 1.6;
}
.ss-landing * { box-sizing: border-box; }
.ss-landing a { color: inherit; text-decoration: none; }

/* ---- Nav ---- */
.ss-nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
}
.ss-nav-inner {
  max-width: 1200px; margin: 0 auto; padding: 14px 32px;
  display: flex; align-items: center; justify-content: space-between;
}
.ss-logo {
  display: flex; align-items: center; gap: 8px;
  font-weight: 600; font-size: 16px; letter-spacing: -0.01em; color: var(--text);
}
.ss-logo-icon { display: flex; align-items: center; }
.ss-nav-links {
  display: flex; gap: 32px; font-size: 14px; color: var(--text-secondary); font-weight: 500;
}
.ss-nav-links a:hover { color: var(--text); }
.ss-nav-right { display: flex; align-items: center; gap: 16px; }
.ss-nav-signin { font-size: 14px; color: var(--text-secondary); font-weight: 500; }
.ss-nav-signin:hover { color: var(--text); }

@media (max-width: 768px) {
  .ss-nav-links { display: none; }
  .ss-nav-inner { padding: 12px 20px; }
}

/* ---- Buttons ---- */
.ss-btn {
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 14px; border-radius: 8px;
  border: none; cursor: pointer; transition: all 0.2s;
  text-decoration: none; white-space: nowrap;
}
.ss-btn-sm { padding: 8px 16px; font-size: 14px; }
.ss-btn-lg { padding: 14px 28px; font-size: 16px; border-radius: 10px; }
.ss-btn-primary {
  background: var(--accent); color: #fff;
}
.ss-btn-primary:hover { background: var(--accent-hover); }
.ss-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.ss-btn-outline {
  background: #fff; color: var(--text); border: 1px solid var(--border-strong);
}
.ss-btn-outline:hover { background: var(--bg-alt); }
.ss-btn-white {
  background: #fff; color: var(--accent); font-weight: 600;
}
.ss-btn-white:hover { background: #f0fafa; }

/* ---- Hero ---- */
.ss-hero {
  padding: 60px 32px 80px;
  max-width: 1200px; margin: 0 auto;
}
.ss-hero-inner {
  display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;
}
.ss-hero-badge {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--accent-light); color: var(--accent);
  font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 20px;
  margin-bottom: 24px;
}
.ss-hero-badge-dot {
  width: 7px; height: 7px; border-radius: 50%; background: var(--accent);
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.ss-hero-title {
  font-size: 52px; font-weight: 700; line-height: 1.1; letter-spacing: -0.03em;
  margin: 0 0 20px; white-space: pre-line;
}
.ss-hero-accent { color: var(--accent); }
.ss-hero-sub {
  font-size: 17px; color: var(--text-secondary); line-height: 1.65; margin: 0 0 28px;
  max-width: 480px;
}
.ss-hero-form {
  display: flex; gap: 0; margin-bottom: 16px;
  background: var(--bg-alt); border: 1px solid var(--border);
  border-radius: 10px; overflow: hidden; max-width: 480px;
}
.ss-hero-input {
  flex: 1; border: none; background: transparent; padding: 14px 16px;
  font-size: 15px; color: var(--text); outline: none; min-width: 0;
  font-family: inherit;
}
.ss-hero-input::placeholder { color: var(--text-muted); }
.ss-hero-cta {
  border-radius: 8px; margin: 4px; padding: 10px 20px;
}
.ss-hero-trust {
  display: flex; gap: 20px; margin-bottom: 32px;
}
.ss-trust-item {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--text-muted);
}
.ss-hero-loved {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.ss-hero-avatars { display: flex; }
.ss-avatar {
  width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-size: 11px; font-weight: 700; color: #fff;
  margin-right: -6px; border: 2px solid #fff;
}
.ss-hero-loved-text { font-size: 13px; color: var(--text-secondary); }
.ss-hero-stars { font-size: 13px; color: #f59e0b; }

/* Hero Mockup */
.ss-hero-right { position: relative; }
.ss-mockup {
  background: #fff; border-radius: 16px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05);
  border: 1px solid var(--border);
  position: relative;
}
.ss-mockup-browser {
  padding: 12px 16px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center;
}
.ss-mockup-dots { display: flex; gap: 6px; }
.ss-mockup-dots span {
  width: 10px; height: 10px; border-radius: 50%;
}
.ss-mockup-dots span:nth-child(1) { background: #FF5F57; }
.ss-mockup-dots span:nth-child(2) { background: #FFBD2E; }
.ss-mockup-dots span:nth-child(3) { background: #28CA42; }
.ss-mockup-body { padding: 28px 24px; }
.ss-mockup-q-label {
  display: flex; align-items: center; gap: 10px;
  font-weight: 600; font-size: 16px; margin-bottom: 6px;
}
.ss-mockup-q-icon {
  width: 24px; height: 24px; border-radius: 6px; background: var(--accent);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.ss-mockup-q-help {
  font-size: 13px; color: var(--text-muted); margin: 0 0 20px;
}
.ss-mockup-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.ss-mockup-opt {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px; border-radius: 10px; font-size: 14px;
  border: 1px solid var(--border); cursor: default; transition: all 0.15s;
}
.ss-mockup-opt-selected {
  border-color: var(--accent); background: var(--accent-light);
}
.ss-mockup-letter {
  width: 28px; height: 28px; border-radius: 7px; background: var(--bg-alt);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: var(--text-secondary);
  flex-shrink: 0;
}
.ss-mockup-letter-active {
  background: var(--accent); color: #fff;
}
.ss-mockup-next {
  background: var(--accent); color: #fff; border: none; border-radius: 8px;
  padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: default;
  display: inline-block;
}
.ss-mockup-float {
  position: absolute; background: #fff; border-radius: 10px; padding: 10px 14px;
  font-size: 11px; color: var(--text-secondary); line-height: 1.4;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1); border: 1px solid var(--border);
  font-weight: 500;
}
.ss-mockup-float-brand { top: 80px; right: -30px; }
.ss-mockup-float-logic { bottom: 60px; right: -30px; }
.ss-mockup-float-powered { bottom: -10px; left: 20px; font-size: 10px; color: var(--text-muted); }

@media (max-width: 860px) {
  .ss-hero { padding: 40px 20px 60px; }
  .ss-hero-inner { grid-template-columns: 1fr; gap: 40px; }
  .ss-hero-title { font-size: 36px; }
  .ss-hero-form { max-width: 100%; }
  .ss-hero-right { max-width: 420px; margin: 0 auto; }
  .ss-mockup-float { display: none; }
}

/* ---- Sections ---- */
.ss-section { padding: 80px 32px; }
.ss-section-alt { background: var(--bg-alt); }
.ss-container { max-width: 1100px; margin: 0 auto; }
.ss-section-label {
  font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
  color: var(--text-muted); text-transform: uppercase; text-align: center; margin-bottom: 12px;
}
.ss-h2 {
  font-size: 36px; font-weight: 700; letter-spacing: -0.02em;
  text-align: center; margin: 0 0 16px; line-height: 1.2;
}
.ss-section-sub {
  font-size: 16px; color: var(--text-secondary); text-align: center;
  max-width: 560px; margin: 0 auto 40px;
}
.ss-link-arrow {
  font-size: 14px; font-weight: 600; color: var(--accent);
  display: inline-flex; align-items: center; gap: 4px;
}
.ss-link-arrow:hover { text-decoration: underline; }

/* ---- How It Works ---- */
.ss-steps {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px;
  margin-top: 48px;
}
.ss-step { text-align: center; }
.ss-step-num {
  width: 40px; height: 40px; border-radius: 10px; background: var(--bg-alt);
  border: 1px solid var(--border); display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; color: var(--text); margin: 0 auto 20px;
}
.ss-step-title {
  font-size: 18px; font-weight: 600; margin: 0 0 8px;
}
.ss-step-body {
  font-size: 14px; color: var(--text-secondary); line-height: 1.6;
}

@media (max-width: 640px) {
  .ss-steps { grid-template-columns: 1fr; gap: 32px; }
}

/* ---- Features ---- */
.ss-features-layout {
  display: grid; grid-template-columns: 1fr 1.2fr; gap: 60px; align-items: start;
}
.ss-features-left .ss-section-label { text-align: left; }
.ss-features-left .ss-h2 { text-align: left; }
.ss-feature-list { display: flex; flex-direction: column; gap: 24px; margin: 32px 0; }
.ss-feat-item {
  display: flex; gap: 14px; align-items: flex-start;
}
.ss-feat-icon {
  width: 40px; height: 40px; border-radius: 10px; background: var(--accent-light);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ss-feat-title { font-size: 15px; font-weight: 600; margin-bottom: 2px; }
.ss-feat-desc { font-size: 13px; color: var(--text-secondary); }

/* Dashboard Mockup */
.ss-dash-mockup {
  background: #fff; border-radius: 14px; border: 1px solid var(--border);
  box-shadow: 0 8px 32px rgba(0,0,0,0.06); overflow: hidden;
}
.ss-dash-header { border-bottom: 1px solid var(--border); padding: 0; }
.ss-dash-nav {
  display: flex; gap: 0; overflow-x: auto; padding: 0 8px;
}
.ss-dash-nav-item {
  padding: 12px 14px; font-size: 12px; color: var(--text-muted); font-weight: 500;
  white-space: nowrap; border-bottom: 2px solid transparent;
}
.ss-dash-nav-active { color: var(--text); border-bottom-color: var(--accent); font-weight: 600; }
.ss-dash-stats {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
  padding: 16px; border-bottom: 1px solid var(--border);
}
.ss-dash-stat { padding: 8px 12px; }
.ss-dash-stat-label { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.ss-dash-stat-value { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
.ss-dash-stat-trend { font-size: 11px; font-weight: 600; margin-top: 2px; }
.ss-trend-up { color: #12B76A; }
.ss-dash-chart { padding: 16px; position: relative; }
.ss-dash-chart-title { font-size: 13px; font-weight: 600; margin-bottom: 12px; }
.ss-dash-chart-labels {
  display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted);
  margin-top: 6px;
}
.ss-dash-chart-badge {
  position: absolute; top: 16px; right: 16px;
  background: var(--accent-light); color: var(--accent); font-size: 11px;
  font-weight: 600; padding: 4px 10px; border-radius: 6px;
}

@media (max-width: 860px) {
  .ss-features-layout { grid-template-columns: 1fr; gap: 40px; }
  .ss-dash-mockup { max-width: 500px; margin: 0 auto; }
}

/* ---- Social Proof ---- */
.ss-social-proof {
  padding: 64px 32px; border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.ss-proof-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
  color: var(--text-muted); text-align: center; margin-bottom: 8px;
}
.ss-proof-title {
  font-size: 24px; font-weight: 700; text-align: center; margin: 0 0 36px;
  letter-spacing: -0.02em;
}
.ss-proof-stats {
  display: flex; justify-content: center; gap: 60px; margin-bottom: 40px;
}
.ss-proof-stat { text-align: center; }
.ss-proof-stat-num {
  font-size: 32px; font-weight: 700; color: var(--accent); letter-spacing: -0.03em;
}
.ss-proof-stat-label { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
.ss-proof-logos {
  display: flex; justify-content: center; align-items: center;
  gap: 48px; flex-wrap: wrap; opacity: 0.5;
}
.ss-proof-logo {
  font-size: 16px; font-weight: 500; letter-spacing: 0.02em; color: var(--text);
}
.ss-proof-logo-bold { font-weight: 800; letter-spacing: 0.08em; }
.ss-proof-logo-script { font-style: italic; font-weight: 400; }
.ss-proof-logo-serif { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; letter-spacing: 0.06em; }

@media (max-width: 640px) {
  .ss-proof-stats { gap: 24px; flex-wrap: wrap; }
  .ss-proof-stat-num { font-size: 24px; }
  .ss-proof-logos { gap: 24px; }
}

/* ---- Pricing ---- */
.ss-billing-toggle {
  display: flex; justify-content: center; gap: 4px; margin-bottom: 40px;
  background: var(--bg-alt); border-radius: 10px; padding: 4px;
  width: fit-content; margin-left: auto; margin-right: auto;
  border: 1px solid var(--border);
}
.ss-toggle-btn {
  padding: 8px 18px; border-radius: 8px; border: none; cursor: pointer;
  font-size: 14px; font-weight: 500; background: transparent; color: var(--text-secondary);
  display: flex; align-items: center; gap: 6px; transition: all 0.2s;
  font-family: inherit;
}
.ss-toggle-active {
  background: #fff; color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  font-weight: 600;
}
.ss-toggle-save {
  background: var(--accent); color: #fff; font-size: 11px; font-weight: 700;
  padding: 2px 8px; border-radius: 4px;
}
.ss-plans {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
  max-width: 960px; margin: 0 auto;
}
.ss-plan {
  background: #fff; border: 1px solid var(--border); border-radius: 14px;
  padding: 32px 28px; position: relative; display: flex; flex-direction: column;
}
.ss-plan-featured {
  border-color: var(--accent); box-shadow: 0 4px 24px rgba(13,115,119,0.12);
}
.ss-plan-badge {
  position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
  background: var(--accent); color: #fff; font-size: 12px; font-weight: 700;
  padding: 4px 14px; border-radius: 6px; white-space: nowrap;
}
.ss-plan-name { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.ss-plan-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; }
.ss-plan-price { display: flex; align-items: baseline; gap: 2px; margin-bottom: 4px; }
.ss-plan-amount { font-size: 40px; font-weight: 700; letter-spacing: -0.03em; }
.ss-plan-per { font-size: 14px; color: var(--text-muted); }
.ss-plan-billed { font-size: 12px; color: var(--text-muted); margin-bottom: 24px; }
.ss-plan-features {
  list-style: none; padding: 0; margin: 0 0 28px; display: flex;
  flex-direction: column; gap: 10px; flex: 1;
}
.ss-plan-features li {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px; color: var(--text-secondary);
}
.ss-plan-cta { width: 100%; padding: 12px; text-align: center; }
.ss-plans-note {
  text-align: center; font-size: 13px; color: var(--text-muted); margin-top: 20px;
}

@media (max-width: 768px) {
  .ss-plans { grid-template-columns: 1fr; max-width: 380px; }
}

/* ---- Templates ---- */
.ss-tpl-tabs {
  display: flex; justify-content: center; gap: 8px; margin-bottom: 32px; flex-wrap: wrap;
}
.ss-tpl-tab {
  padding: 8px 18px; border-radius: 8px; border: 1px solid var(--border);
  background: #fff; font-size: 13px; font-weight: 500; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.ss-tpl-tab:hover { border-color: var(--border-strong); }
.ss-tpl-tab-active {
  background: var(--accent); color: #fff; border-color: var(--accent);
}
.ss-tpl-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
}
.ss-tpl-card {
  background: #fff; border: 1px solid var(--border); border-radius: 12px;
  overflow: hidden; transition: all 0.2s; display: flex; flex-direction: column;
}
.ss-tpl-card:hover {
  border-color: var(--border-strong); box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}
.ss-tpl-thumb { padding: 0; }
.ss-tpl-thumb-inner {
  height: 140px; display: flex; align-items: center; justify-content: center;
  border-radius: 0;
}
.ss-tpl-name {
  font-size: 15px; font-weight: 600; margin: 16px 16px 4px; line-height: 1.3;
}
.ss-tpl-desc {
  font-size: 12px; color: var(--text-muted); margin: 0 16px 12px; line-height: 1.5;
  flex: 1;
}
.ss-tpl-preview {
  font-size: 13px; font-weight: 600; color: var(--accent);
  padding: 0 16px 16px; display: inline-flex; align-items: center; gap: 4px;
}

@media (max-width: 860px) {
  .ss-tpl-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .ss-tpl-grid { grid-template-columns: 1fr; }
}

/* ---- FAQ ---- */
.ss-faq-container { max-width: 700px; }
.ss-faq-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
  color: var(--text-muted); text-align: center; margin-bottom: 8px;
}
.ss-faq {
  margin-top: 40px; display: flex; flex-direction: column;
}
.ss-faq-item {
  display: block; width: 100%; text-align: left; background: none; border: none;
  border-bottom: 1px solid var(--border); padding: 20px 0; cursor: pointer;
  font-family: inherit;
}
.ss-faq-q {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 16px; font-weight: 500; color: var(--text); gap: 16px;
}
.ss-faq-chevron { flex-shrink: 0; transition: transform 0.2s; }
.ss-faq-open .ss-faq-chevron { transform: rotate(180deg); }
.ss-faq-a {
  font-size: 14px; color: var(--text-secondary); line-height: 1.7;
  margin-top: 12px; padding-right: 40px;
}

/* ---- Final CTA ---- */
.ss-final {
  background: var(--accent); color: #fff; padding: 80px 32px;
  text-align: center; position: relative; overflow: hidden;
}
.ss-final-inner {
  max-width: 600px; margin: 0 auto; position: relative; z-index: 1;
}
.ss-final-title {
  font-size: 36px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 12px;
}
.ss-final-sub {
  font-size: 16px; opacity: 0.85; margin: 0 0 28px;
}
.ss-final-note {
  font-size: 13px; opacity: 0.7; margin-top: 16px;
}

/* ---- Footer ---- */
.ss-footer {
  background: #fff; border-top: 1px solid var(--border); padding: 0 32px;
}
.ss-footer-inner {
  max-width: 1100px; margin: 0 auto; padding: 48px 0 32px;
  display: grid; grid-template-columns: 1.2fr 2fr; gap: 60px;
}
.ss-footer-brand .ss-logo { margin-bottom: 12px; }
.ss-footer-tag { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
.ss-footer-social { display: flex; gap: 12px; }
.ss-footer-social a {
  color: var(--text-muted); transition: color 0.15s;
}
.ss-footer-social a:hover { color: var(--text); }
.ss-footer-cols {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px;
}
.ss-footer-col {
  display: flex; flex-direction: column; gap: 10px;
}
.ss-footer-col-title {
  font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px;
}
.ss-footer-col a {
  font-size: 13px; color: var(--text-muted); transition: color 0.15s;
}
.ss-footer-col a:hover { color: var(--text); }
.ss-footer-bottom {
  max-width: 1100px; margin: 0 auto;
  padding: 20px 0; border-top: 1px solid var(--border);
  font-size: 12px; color: var(--text-muted); text-align: center;
}

@media (max-width: 768px) {
  .ss-footer-inner { grid-template-columns: 1fr; gap: 32px; }
  .ss-footer-cols { grid-template-columns: repeat(2, 1fr); }
  .ss-section { padding: 60px 20px; }
  .ss-h2 { font-size: 28px; }
}
`;

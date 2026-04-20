'use client';

/**
 * /tools/quiz-funnel - Public marketing landing page for Squarespell's
 * AI Quiz Funnel product. Lives inside the /tools hub.
 *
 * Standalone, shareable URL designed to be linked from the Squarespace
 * marketing site. Hosted at:
 *   - https://squarespell.com/tools/quiz-funnel
 *   - https://app.squarespell.com/tools/quiz-funnel
 *
 * Site structure:
 *   squarespell.com/                  main site (plugins, templates, services)
 *   squarespell.com/tools              tools hub
 *   squarespell.com/tools/quiz-funnel  this page
 *   quiz.squarespell.com               public quiz builder (Stage 1 → 6)
 *   app.squarespell.com/dashboard      authenticated dashboard
 *
 * Design direction (user-requested mix of Framer templates):
 *   1. Hero structure   → saasta-pro.framer.website/home-02
 *   2. Hero animation   → bombon.framer.website (floating tilted mockup)
 *   3. Analytics strip  → plat-form.framer.ai (gauges + response-time deltas)
 *   4. Pricing section  → najaf.framer.ai#pricing (clean 3-card grid)
 *
 * Color tokens kept consistent with the rest of the app:
 *   - bg:    #F7F7F5
 *   - panel: #FFFFFF
 *   - accent: #0D7377 (Squarespell teal)
 *   - text:  #1A1A1A
 *   - muted: #6B6B6B
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QUIZ_BUILDER_PATH } from '@/lib/urls';
import { QUIZ_TEMPLATE_CATALOG } from '@/lib/quiz/templates';

const TRY_URL = QUIZ_BUILDER_PATH;
const SIGN_IN_URL = '/sign-in';
const TEMPLATE_SHOWCASE_COUNT = 6; // Show top 6 on landing page

/** Normalize a user-typed URL (tolerates "acme.com", "www.acme.com", etc.). */
function normalizeUrl(raw: string): string {
  let u = raw.trim();
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

const PLANS: Plan[] = [
  {
    name: 'Starter',
    monthly: 19,
    yearly: 15,
    desc: 'Perfect for coaches and consultants capturing their first leads.',
    features: [
      '5 live quizzes',
      '500 leads / month',
      'AI quiz generation from your URL',
      'Squarespace one-click embed',
      'Lead dashboard + CSV export',
      'Email notifications',
    ],
    cta: 'Start free',
    href: TRY_URL,
  },
  {
    name: 'Pro',
    monthly: 39,
    yearly: 31,
    desc: 'For growing businesses serious about turning visitors into clients.',
    features: [
      '20 live quizzes',
      '5,000 leads / month',
      'Everything in Starter',
      'Remove Squarespell branding',
      'Conversion insights + lead scoring',
      'Zapier + webhooks',
      'Priority support',
    ],
    cta: 'Start free',
    href: TRY_URL,
    featured: true,
  },
  {
    name: 'Agency',
    monthly: 79,
    yearly: 63,
    desc: 'For agencies managing quiz funnels across multiple clients.',
    features: [
      'Unlimited quizzes',
      'Unlimited leads',
      'White-label (your brand)',
      'Multi-site management',
      'Client reporting dashboard',
      'Dedicated account manager',
    ],
    cta: 'Contact us',
    href: 'mailto:hello@squarespell.com?subject=Agency%20plan',
  },
];

const FAQS = [
  {
    q: 'Do I need to be a developer to embed a quiz?',
    a: "No. You paste one snippet into a Squarespace Code Block. That's it. We handle layout, responsiveness, and styling automatically.",
  },
  {
    q: 'How does the AI generate the quiz?',
    a: "Paste your Squarespace URL. Our AI reads your copy, offers, and positioning, then drafts a quiz that qualifies visitors based on what you actually sell. You edit anything you don't like.",
  },
  {
    q: 'Will it match my brand?',
    a: "Yes. Colors, fonts, and tone are pulled from your site on generation. You can override everything in the editor - or just ship what the AI proposes.",
  },
  {
    q: 'What happens to leads I collect?',
    a: "Leads land in your dashboard instantly. Export to CSV any time, or pipe them into Zapier on Pro+. Email notifications on every new lead are on by default.",
  },
  {
    q: 'Can I try it without signing up?',
    a: "Yes - the whole generator is free to use without an account. You only sign in if you want to save, publish, and start collecting leads.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrollY, setScrollY] = useState(0);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [heroUrl, setHeroUrl] = useState('');
  const [heroSubmitting, setHeroSubmitting] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeUrl(heroUrl);
    if (!normalized) return;
    setHeroSubmitting(true);
    // Same-host client-side push - the builder lives at
    // /tools/quiz-funnel/build on the same app.squarespell.com origin.
    // TryFlowInner reads `?url=` and skips Stage 1 entirely, dropping the
    // visitor straight onto the questions page.
    router.push(`${QUIZ_BUILDER_PATH}?url=${encodeURIComponent(normalized)}`);
  };

  // Parallax on the floating mockup
  const mockupOffset = useMemo(() => Math.min(scrollY * 0.08, 40), [scrollY]);

  return (
    <div className="ssp-landing">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ---------- NAV ---------- */}
      <header className="ssp-nav">
        <div className="ssp-nav-inner">
          <Link href="/" className="ssp-logo">
            <span className="ssp-logo-dot" />
            Squarespell
          </Link>
          <nav className="ssp-nav-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#metrics">Results</a>
            <a href="#pricing">Pricing</a>
            <a href="#templates">Templates</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="ssp-nav-cta">
            <Link href={SIGN_IN_URL} className="ssp-nav-link">Sign in</Link>
            <Link href={TRY_URL} className="ssp-btn ssp-btn-primary ssp-btn-sm">
              Try it free
            </Link>
          </div>
        </div>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="ssp-hero">
        <div className="ssp-hero-glow" />
        <div className="ssp-hero-inner">
          <div className="ssp-hero-eyebrow">
            <span className="ssp-hero-eyebrow-dot" />
            AI QUIZ FUNNEL · BUILT FOR SQUARESPACE
          </div>
          <h1 className="ssp-hero-title">
            Turn Squarespace visitors into
            <br />
            <span className="ssp-hero-title-accent">qualified leads.</span>
          </h1>
          <p className="ssp-hero-sub">
            Paste your website URL. Squarespell generates a branded quiz in 30 seconds,
            captures email, and drops leads straight into your dashboard. No designer.
            No developer. No friction.
          </p>

          {/* Inline URL generator - mirrors the /try Stage 1 hook widget. */}
          <form className="ssp-hero-gen" onSubmit={handleGenerate}>
            <div className="ssp-hero-gen-field">
              <span className="ssp-hero-gen-prefix">https://</span>
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="yoursite.com"
                value={heroUrl}
                onChange={(e) => setHeroUrl(e.target.value.replace(/^https?:\/\//i, ''))}
                className="ssp-hero-gen-input"
                disabled={heroSubmitting}
                aria-label="Your website URL"
              />
              <button
                type="submit"
                className="ssp-hero-gen-btn"
                disabled={heroSubmitting || !heroUrl.trim()}
              >
                {heroSubmitting ? 'Generating…' : 'Generate →'}
              </button>
            </div>
            <div className="ssp-hero-gen-hint">
              Drops into your Squarespace site as{' '}
              <code>&lt;script src=&quot;/embed/squarespell-hook.js&quot;&gt;&lt;/script&gt;</code>
            </div>
          </form>

          <div className="ssp-hero-trust">
            <span className="ssp-hero-trust-check">✓</span> No credit card
            <span className="ssp-hero-trust-dot" />
            <span className="ssp-hero-trust-check">✓</span> Ready in 30 seconds
            <span className="ssp-hero-trust-dot" />
            <span className="ssp-hero-trust-check">✓</span> Free forever tier
          </div>
          <a href="#how" className="ssp-hero-secondary">See how it works ↓</a>
        </div>

        {/* Animated floating mockup (bombon-inspired) */}
        <div
          className="ssp-mockup-wrap"
          style={{ transform: `translateY(${mockupOffset}px)` }}
        >
          <div className="ssp-mockup-orbit ssp-mockup-orbit-1" />
          <div className="ssp-mockup-orbit ssp-mockup-orbit-2" />

          <div className="ssp-mockup-card ssp-mockup-card-main">
            <div className="ssp-mockup-browser">
              <div className="ssp-mockup-browser-dots">
                <span /><span /><span />
              </div>
              <div className="ssp-mockup-browser-url">squarespell.com/q/demo</div>
            </div>
            <div className="ssp-mockup-body">
              <div className="ssp-mockup-q-label">Question 2 of 5</div>
              <div className="ssp-mockup-q-text">
                What's the biggest bottleneck in your sales funnel right now?
              </div>
              <div className="ssp-mockup-progress">
                <div className="ssp-mockup-progress-fill" />
              </div>
              <div className="ssp-mockup-options">
                <div className="ssp-mockup-option">
                  <span className="ssp-mockup-radio" />
                  Not enough qualified leads
                </div>
                <div className="ssp-mockup-option ssp-mockup-option-selected">
                  <span className="ssp-mockup-radio ssp-mockup-radio-on" />
                  Leads aren't the right fit
                </div>
                <div className="ssp-mockup-option">
                  <span className="ssp-mockup-radio" />
                  Conversion rate is low
                </div>
                <div className="ssp-mockup-option">
                  <span className="ssp-mockup-radio" />
                  Long sales cycle
                </div>
              </div>
              <div className="ssp-mockup-next">Next →</div>
            </div>
          </div>

          {/* Floating side cards */}
          <div className="ssp-mockup-card ssp-mockup-card-float-1">
            <div className="ssp-mockup-stat-label">New lead</div>
            <div className="ssp-mockup-stat-value">sarah@acme.co</div>
            <div className="ssp-mockup-stat-sub">Quiz: "Find your growth plan"</div>
            <span className="ssp-mockup-pulse" />
          </div>
          <div className="ssp-mockup-card ssp-mockup-card-float-2">
            <div className="ssp-mockup-stat-label">Conversion rate</div>
            <div className="ssp-mockup-stat-value">
              34% <span className="ssp-mockup-trend">↑ 18%</span>
            </div>
            <div className="ssp-mockup-stat-sub">vs. contact form</div>
          </div>
        </div>
      </section>

      {/* ---------- LOGO STRIP ---------- */}
      <section className="ssp-logos">
        <div className="ssp-logos-label">Trusted by Squarespace creators building real funnels</div>
        <div className="ssp-logos-row">
          {['COACH CO', 'BRIGHT LABS', 'STUDIO NORTH', 'LUXE FIT', 'MONO AGENCY', 'FIELD & CO'].map((l) => (
            <span key={l} className="ssp-logo-mark">{l}</span>
          ))}
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section id="how" className="ssp-section">
        <div className="ssp-section-header">
          <div className="ssp-eyebrow">HOW IT WORKS</div>
          <h2 className="ssp-h2">From URL to live quiz in three steps.</h2>
          <p className="ssp-sub">
            No templates to pick. No drag-and-drop maze. Just paste, tweak, embed.
          </p>
        </div>
        <div className="ssp-steps">
          {[
            {
              n: '01',
              title: 'Paste your Squarespace URL',
              body: 'Our AI reads your homepage copy, offers, and voice. Takes about 20 seconds.',
            },
            {
              n: '02',
              title: 'Review your generated quiz',
              body: 'Rewrite any question, reorder answers, tweak the lead form. Everything inline.',
            },
            {
              n: '03',
              title: 'Paste one snippet on Squarespace',
              body: 'Drop the embed in a Code Block. The quiz shows up on your site, matching your brand.',
            },
          ].map((s) => (
            <div key={s.n} className="ssp-step">
              <div className="ssp-step-n">{s.n}</div>
              <div className="ssp-step-title">{s.title}</div>
              <div className="ssp-step-body">{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FEATURES GRID ---------- */}
      <section id="features" className="ssp-section">
        <div className="ssp-section-header">
          <div className="ssp-eyebrow">FEATURES</div>
          <h2 className="ssp-h2">
            Built for Squarespace. <span className="ssp-h2-muted">Not retrofitted for it.</span>
          </h2>
          <p className="ssp-sub">
            Every decision - from the embed snippet to the brand-matching AI - was made
            with Squarespace in mind. Not a generic form builder bolted on.
          </p>
        </div>
        <div className="ssp-features">
          <FeatureCard
            span={2}
            title="One-click Squarespace embed"
            body="Drop a single Code Block on your page. Quiz inherits site fonts and spacing. No iframe weirdness, no style bleed."
            visual={
              <div className="ssp-feature-code">
                <div className="ssp-feature-code-line"><span className="cm-tag">&lt;div</span> <span className="cm-attr">id</span>=<span className="cm-str">"squarespell"</span> <span className="cm-attr">data-quiz</span>=<span className="cm-str">"demo"</span><span className="cm-tag">&gt;&lt;/div&gt;</span></div>
                <div className="ssp-feature-code-line"><span className="cm-tag">&lt;script</span> <span className="cm-attr">src</span>=<span className="cm-str">"https://squarespell.com/embed.js"</span><span className="cm-tag">&gt;&lt;/script&gt;</span></div>
              </div>
            }
          />
          <FeatureCard
            title="Brand-matched, always"
            body="Colors, type, and copy pulled from your site automatically. It looks like you built it."
            visual={
              <div className="ssp-feature-swatches">
                <span className="ssp-swatch" style={{ background: '#0D7377' }} />
                <span className="ssp-swatch" style={{ background: '#FFFFFF' }} />
                <span className="ssp-swatch" style={{ background: '#6366f1' }} />
                <span className="ssp-swatch" style={{ background: '#ec4899' }} />
              </div>
            }
          />
          <FeatureCard
            title="Smart lead gate"
            body="Collect email when intent is highest - after they've answered, before they see results."
            visual={
              <div className="ssp-feature-pill">
                <span className="ssp-feature-pill-dot" />
                email@company.com
              </div>
            }
          />
          <FeatureCard
            title="Live lead dashboard"
            body="Every new lead in real time. Filter by quiz, score, outcome. Export to CSV."
            visual={
              <div className="ssp-feature-rows">
                <div className="ssp-feature-row"><span className="cm-cell">sarah@acme.co</span><span className="cm-cell-muted">Growth plan</span></div>
                <div className="ssp-feature-row"><span className="cm-cell">mark@luxe.fit</span><span className="cm-cell-muted">Starter plan</span></div>
                <div className="ssp-feature-row"><span className="cm-cell">jen@studio.co</span><span className="cm-cell-muted">Pro plan</span></div>
              </div>
            }
          />
          <FeatureCard
            span={2}
            title="No branding. No limits."
            body="On Pro, every trace of Squarespell is gone. Looks like native product, because from your visitors' perspective - it is."
            visual={
              <div className="ssp-feature-toggle">
                <div className="ssp-feature-toggle-track">
                  <div className="ssp-feature-toggle-thumb" />
                </div>
                <span className="ssp-feature-toggle-label">Remove Squarespell badge</span>
              </div>
            }
          />
        </div>
      </section>

      {/* ---------- METRICS / ANALYTICS (plat-form inspired) ---------- */}
      <section id="metrics" className="ssp-section ssp-metrics">
        <div className="ssp-section-header">
          <div className="ssp-eyebrow">RESULTS</div>
          <h2 className="ssp-h2">The numbers our creators are seeing.</h2>
          <p className="ssp-sub">
            Quizzes beat static contact forms every time. Here's what that looks like
            across real Squarespell accounts.
          </p>
        </div>

        <div className="ssp-metrics-grid">
          <div className="ssp-metrics-card ssp-metrics-card-gauge">
            <div className="ssp-metrics-label">Visitor → Lead conversion</div>
            <div className="ssp-gauge">
              <svg viewBox="0 0 120 70" width="100%" height="100%">
                <path d="M10 60 A50 50 0 0 1 110 60" stroke="rgba(0,0,0,0.08)" strokeWidth="10" fill="none" strokeLinecap="round" />
                <path
                  d="M10 60 A50 50 0 0 1 110 60"
                  stroke="#0D7377"
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="157"
                  strokeDashoffset="52"
                  className="ssp-gauge-arc"
                />
              </svg>
              <div className="ssp-gauge-value">34%</div>
            </div>
            <div className="ssp-metrics-sub">
              <span className="ssp-trend-up">↑ 2000%</span> vs. 2% contact form baseline
            </div>
          </div>

          <div className="ssp-metrics-card ssp-metrics-card-line">
            <div className="ssp-metrics-label">Average leads per month</div>
            <div className="ssp-metrics-value">
              412 <span className="ssp-trend-up">↑ 18%</span>
            </div>
            <div className="ssp-line-chart">
              <svg viewBox="0 0 300 80" width="100%" height="80" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lg1" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0D7377" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#0D7377" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 65 L30 60 L60 55 L90 58 L120 45 L150 40 L180 32 L210 28 L240 18 L270 14 L300 8 L300 80 L0 80 Z"
                  fill="url(#lg1)"
                />
                <path
                  d="M0 65 L30 60 L60 55 L90 58 L120 45 L150 40 L180 32 L210 28 L240 18 L270 14 L300 8"
                  stroke="#0D7377"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  className="ssp-line-path"
                />
              </svg>
            </div>
            <div className="ssp-line-axis">
              <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
            </div>
          </div>

          <div className="ssp-metrics-card ssp-metrics-card-stat">
            <div className="ssp-metrics-label">Time to live quiz</div>
            <div className="ssp-stat-row">
              <div className="ssp-stat-before">14 days</div>
              <div className="ssp-stat-arrow">→</div>
              <div className="ssp-stat-after">
                <span className="ssp-stat-big">3</span>
                <span className="ssp-stat-unit">min</span>
              </div>
            </div>
            <div className="ssp-metrics-sub">Agency build time vs. Squarespell</div>
          </div>

          <div className="ssp-metrics-card ssp-metrics-card-bars">
            <div className="ssp-metrics-label">Lead quality score</div>
            <div className="ssp-bars">
              <div className="ssp-bar"><span style={{ height: '35%' }} /><label>Contact form</label></div>
              <div className="ssp-bar"><span style={{ height: '55%' }} /><label>Newsletter</label></div>
              <div className="ssp-bar"><span style={{ height: '72%' }} /><label>Lead magnet</label></div>
              <div className="ssp-bar ssp-bar-accent"><span style={{ height: '94%' }} /><label>Quiz</label></div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- PRICING (najaf inspired) ---------- */}
      <section id="pricing" className="ssp-section">
        <div className="ssp-section-header">
          <div className="ssp-eyebrow">PRICING</div>
          <h2 className="ssp-h2">Affordable plans to help you launch faster.</h2>
          <p className="ssp-sub">
            Start free forever. Upgrade when you're ready to remove branding and scale.
          </p>
        </div>
        <div className="ssp-billing-toggle">
          <button
            className={`ssp-toggle-btn ${billing === 'monthly' ? 'ssp-toggle-active' : ''}`}
            onClick={() => setBilling('monthly')}
            type="button"
          >
            Monthly
          </button>
          <button
            className={`ssp-toggle-btn ${billing === 'yearly' ? 'ssp-toggle-active' : ''}`}
            onClick={() => setBilling('yearly')}
            type="button"
          >
            Yearly
            <span className="ssp-toggle-save">Save 20%</span>
          </button>
        </div>
        <div className="ssp-plans">
          {PLANS.map((p) => {
            const price = billing === 'yearly' ? p.yearly : p.monthly;
            return (
              <div key={p.name} className={`ssp-plan ${p.featured ? 'ssp-plan-featured' : ''}`}>
                {p.featured && <div className="ssp-plan-badge">Most popular</div>}
                <div className="ssp-plan-name">{p.name}</div>
                <div className="ssp-plan-desc">{p.desc}</div>
                <div className="ssp-plan-price">
                  {billing === 'yearly' && (
                    <span className="ssp-plan-price-old">${p.monthly}</span>
                  )}
                  <span className="ssp-plan-price-num">${price}</span>
                  <span className="ssp-plan-price-per">/month</span>
                </div>
                {billing === 'yearly' && (
                  <div className="ssp-plan-billed">Billed ${price * 12}/year</div>
                )}
                <ul className="ssp-plan-features">
                  {p.features.map((f) => (
                    <li key={f}>
                      <span className="ssp-plan-check">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className={`ssp-btn ssp-plan-cta ${p.featured ? 'ssp-btn-primary' : 'ssp-btn-ghost'}`}
                >
                  {p.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- TEMPLATES ---------- */}
      <section id="templates" className="ssp-section">
        <div className="ssp-section-header">
          <div className="ssp-eyebrow">Templates</div>
          <h2 className="ssp-h2">Start with a proven template</h2>
          <p className="ssp-section-sub">
            Every template is designed for real Squarespace businesses. Pick one, take it for a test drive, then customize it in minutes.
          </p>
        </div>
        <div className="ssp-tpl-grid">
          {QUIZ_TEMPLATE_CATALOG.slice(0, TEMPLATE_SHOWCASE_COUNT).map((tpl) => (
            <Link
              key={tpl.id}
              href={'/templates/' + tpl.id + '/preview'}
              className="ssp-tpl-card"
            >
              <div className="ssp-tpl-top">
                <div className="ssp-tpl-icon-wrap">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d={tpl.iconPath} />
                  </svg>
                </div>
                <span className="ssp-tpl-cat">{tpl.category}</span>
              </div>
              <h3 className="ssp-tpl-name">{tpl.name}</h3>
              <p className="ssp-tpl-desc">{tpl.description}</p>
              <span className="ssp-tpl-try">
                Try this quiz
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </span>
            </Link>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link href="/templates" className="ssp-btn ssp-btn-outline">
            Browse all {QUIZ_TEMPLATE_CATALOG.length} templates
          </Link>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="ssp-section">
        <div className="ssp-section-header">
          <div className="ssp-eyebrow">FAQ</div>
          <h2 className="ssp-h2">Questions, answered.</h2>
        </div>
        <div className="ssp-faq">
          {FAQS.map((f, i) => (
            <button
              key={f.q}
              className={`ssp-faq-item ${openFaq === i ? 'ssp-faq-open' : ''}`}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              type="button"
            >
              <div className="ssp-faq-q">
                {f.q}
                <span className="ssp-faq-icon">{openFaq === i ? '−' : '+'}</span>
              </div>
              {openFaq === i && <div className="ssp-faq-a">{f.a}</div>}
            </button>
          ))}
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="ssp-final">
        <div className="ssp-final-inner">
          <h2 className="ssp-final-title">
            Your next lead is one quiz away.
          </h2>
          <p className="ssp-final-sub">
            Paste your URL. Squarespell does the rest. Ship before your coffee cools.
          </p>
          <Link href={TRY_URL} className="ssp-btn ssp-btn-primary ssp-btn-lg">
            Generate my quiz free →
          </Link>
          <div className="ssp-hero-trust">
            <span className="ssp-hero-trust-check">✓</span> No credit card
            <span className="ssp-hero-trust-dot" />
            <span className="ssp-hero-trust-check">✓</span> Free forever tier
          </div>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="ssp-footer">
        <div className="ssp-footer-inner">
          <div className="ssp-footer-brand">
            <div className="ssp-logo">
              <span className="ssp-logo-dot" />
              Squarespell
            </div>
            <div className="ssp-footer-tag">
              The AI quiz funnel built for Squarespace.
            </div>
          </div>
          <div className="ssp-footer-cols">
            <div className="ssp-footer-col">
              <div className="ssp-footer-col-title">Product</div>
              <Link href={TRY_URL}>Try it free</Link>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#how">How it works</a>
            </div>
            <div className="ssp-footer-col">
              <div className="ssp-footer-col-title">Company</div>
              <a href="mailto:hello@squarespell.com">Contact</a>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </div>
            <div className="ssp-footer-col">
              <div className="ssp-footer-col-title">Get started</div>
              <Link href={SIGN_IN_URL}>Sign in</Link>
              <Link href={TRY_URL}>Create account</Link>
            </div>
          </div>
        </div>
        <div className="ssp-footer-bottom">
          © {new Date().getFullYear()} Squarespell. Not affiliated with Squarespace Inc.
        </div>
      </footer>
    </div>
  );
}

/* ---------- small components ---------- */

function FeatureCard({
  title,
  body,
  visual,
  span,
}: {
  title: string;
  body: string;
  visual: React.ReactNode;
  span?: 1 | 2;
}) {
  return (
    <div className={`ssp-feature ${span === 2 ? 'ssp-feature-wide' : ''}`}>
      <div className="ssp-feature-visual">{visual}</div>
      <div className="ssp-feature-title">{title}</div>
      <div className="ssp-feature-body">{body}</div>
    </div>
  );
}

/* ---------- inline CSS ---------- */

const CSS = `
.ssp-landing {
  --bg: #F7F7F5;
  --panel: #FFFFFF;
  --panel-2: #F5F5F3;
  --border: rgba(0,0,0,0.08);
  --border-strong: rgba(0,0,0,0.14);
  --text: #1A1A1A;
  --muted: #6B6B6B;
  --dim: #9A9A9A;
  --accent: #0D7377;
  --accent-dim: rgba(13,115,119,0.12);

  background: var(--bg);
  color: var(--text);
  font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

.ssp-landing * { box-sizing: border-box; }
.ssp-landing a { color: inherit; text-decoration: none; }

/* ----- nav ----- */
.ssp-nav {
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  background: rgba(247,247,245,0.72);
  border-bottom: 1px solid #E4E3E0;
}
.ssp-nav-inner {
  max-width: 1200px; margin: 0 auto; padding: 16px 32px;
  display: flex; align-items: center; justify-content: space-between; gap: 32px;
}
.ssp-logo {
  display: inline-flex; align-items: center; gap: 10px;
  font-weight: 700; font-size: 17px; letter-spacing: -0.01em;
}
.ssp-logo-dot {
  width: 10px; height: 10px; border-radius: 3px;
  background: var(--accent);
  box-shadow: 0 0 16px rgba(13,115,119,0.6);
}
.ssp-nav-links {
  display: flex; gap: 28px; font-size: 14px; color: var(--muted);
}
.ssp-nav-links a { transition: color 0.2s; }
.ssp-nav-links a:hover { color: var(--text); }
.ssp-nav-cta { display: flex; align-items: center; gap: 16px; }
.ssp-nav-link { font-size: 14px; color: var(--muted); }
.ssp-nav-link:hover { color: var(--text); }

@media (max-width: 860px) {
  .ssp-nav-links { display: none; }
}

/* ----- buttons ----- */
.ssp-btn {
  display: inline-flex; align-items: center; justify-content: center;
  font-family: inherit; font-weight: 600; letter-spacing: -0.01em;
  border-radius: 10px; cursor: pointer; transition: all 0.18s;
  border: 1px solid transparent; white-space: nowrap;
}
.ssp-btn-sm { padding: 9px 16px; font-size: 13px; }
.ssp-btn-lg { padding: 15px 26px; font-size: 15px; }
.ssp-btn-primary {
  background: var(--accent); color: #FFFFFF;
  box-shadow: 0 8px 26px -10px rgba(13,115,119,0.6);
}
.ssp-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px -10px rgba(13,115,119,0.8);
}
.ssp-btn-ghost {
  background: transparent; color: var(--text);
  border-color: #E4E3E0;
}
.ssp-btn-ghost:hover {
  background: rgba(0,0,0,0.04);
  border-color: rgba(0,0,0,0.12);
}
.ssp-btn-outline {
  background: transparent; color: var(--accent);
  border-color: var(--accent);
}
.ssp-btn-outline:hover {
  background: rgba(13,115,119,0.06);
}

/* ----- hero ----- */
.ssp-hero {
  position: relative;
  padding: 80px 32px 40px;
  max-width: 1200px; margin: 0 auto;
  text-align: center;
}
.ssp-hero-glow {
  position: absolute; top: -100px; left: 50%;
  width: 900px; height: 500px;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at center, rgba(13,115,119,0.08) 0%, rgba(13,115,119,0) 55%);
  pointer-events: none;
  filter: blur(20px);
}
.ssp-hero-inner {
  position: relative; z-index: 2;
  max-width: 820px; margin: 0 auto;
}
.ssp-hero-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 14px; border-radius: 999px;
  background: var(--accent-dim);
  border: 1px solid rgba(13,115,119,0.28);
  color: var(--accent);
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.08em;
  margin-bottom: 28px;
}
.ssp-hero-eyebrow-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.7); }
}
.ssp-hero-title {
  font-size: clamp(40px, 6.4vw, 74px);
  line-height: 1.02;
  letter-spacing: -0.035em;
  font-weight: 700;
  margin: 0 0 24px;
}
.ssp-hero-title-accent {
  background: linear-gradient(180deg, #0D7377 0%, #0a5a5e 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}
.ssp-hero-sub {
  font-size: 18px; line-height: 1.55;
  color: var(--muted);
  max-width: 640px; margin: 0 auto 36px;
}
.ssp-hero-ctas {
  display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;
  margin-bottom: 28px;
}

/* Inline URL generator form (mirrors /try Stage 1 hook widget) */
.ssp-hero-gen {
  max-width: 620px;
  margin: 0 auto 22px;
}
.ssp-hero-gen-field {
  display: flex; align-items: center;
  background: #FFFFFF;
  border: 1px solid #E4E3E0;
  border-radius: 14px;
  padding: 8px 8px 8px 22px;
  gap: 6px;
  transition: all 0.22s;
  box-shadow:
    0 20px 50px -20px rgba(0,0,0,0.04),
    0 0 0 0 rgba(13,115,119,0);
}
.ssp-hero-gen-field:focus-within {
  border-color: rgba(13,115,119,0.45);
  box-shadow:
    0 20px 50px -20px rgba(0,0,0,0.04),
    0 0 0 4px rgba(13,115,119,0.12);
}
.ssp-hero-gen-prefix {
  color: var(--dim);
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 15px;
  user-select: none;
  flex-shrink: 0;
}
.ssp-hero-gen-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0; outline: 0;
  color: var(--text);
  font-family: inherit;
  font-size: 16px;
  font-weight: 500;
  padding: 16px 10px;
  letter-spacing: -0.005em;
}
.ssp-hero-gen-input::placeholder { color: var(--dim); }
.ssp-hero-gen-input:disabled { opacity: 0.6; }
.ssp-hero-gen-btn {
  background: var(--accent);
  color: #FFFFFF;
  border: 0;
  font-family: inherit;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: -0.005em;
  padding: 14px 22px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s;
  flex-shrink: 0;
  box-shadow: 0 6px 18px -8px rgba(13,115,119,0.6);
}
.ssp-hero-gen-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -8px rgba(13,115,119,0.8);
}
.ssp-hero-gen-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}
.ssp-hero-gen-hint {
  margin-top: 14px;
  font-size: 12.5px;
  color: var(--dim);
  text-align: center;
}
.ssp-hero-gen-hint code {
  background: rgba(0,0,0,0.04);
  border: 1px solid #E4E3E0;
  padding: 3px 8px;
  border-radius: 6px;
  color: var(--muted);
  font-size: 11.5px;
  font-family: ui-monospace, 'SF Mono', monospace;
  margin-left: 4px;
}
.ssp-hero-secondary {
  display: inline-block;
  margin-top: 14px;
  font-size: 13px;
  color: var(--muted);
  transition: color 0.2s;
}
.ssp-hero-secondary:hover { color: var(--accent); }

@media (max-width: 640px) {
  .ssp-hero-gen-field {
    flex-wrap: wrap;
    padding: 14px;
  }
  .ssp-hero-gen-prefix { padding-left: 8px; }
  .ssp-hero-gen-input {
    width: 100%;
    padding: 10px 8px 14px;
    border-bottom: 1px solid var(--border);
  }
  .ssp-hero-gen-btn {
    width: 100%;
    margin-top: 10px;
  }
  .ssp-hero-gen-hint code {
    display: block;
    margin: 8px auto 0;
    width: fit-content;
    word-break: break-all;
  }
}

.ssp-hero-trust {
  display: flex; justify-content: center; align-items: center;
  gap: 10px; flex-wrap: wrap;
  font-size: 13px; color: var(--dim);
}
.ssp-hero-trust-check { color: var(--accent); font-weight: 700; margin-right: 4px; }
.ssp-hero-trust-dot {
  width: 3px; height: 3px; border-radius: 50%;
  background: var(--dim); margin: 0 4px;
}

/* ----- mockup (bombon-inspired) ----- */
.ssp-mockup-wrap {
  position: relative;
  max-width: 900px; margin: 70px auto 0;
  perspective: 1800px;
  transition: transform 0.1s linear;
}
.ssp-mockup-orbit {
  position: absolute; left: 50%; top: 50%;
  border-radius: 50%;
  border: 1px dashed rgba(13,115,119,0.15);
  pointer-events: none;
  transform: translate(-50%, -50%);
}
.ssp-mockup-orbit-1 { width: 720px; height: 720px; animation: spin 60s linear infinite; }
.ssp-mockup-orbit-2 { width: 520px; height: 520px; animation: spin 40s linear infinite reverse; border-color: rgba(13,115,119,0.08); }
@keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }

.ssp-mockup-card {
  background: var(--panel);
  border: 1px solid #E4E3E0;
  border-radius: 16px;
  box-shadow:
    0 40px 80px -24px rgba(0,0,0,0.04),
    0 0 0 1px rgba(0,0,0,0.04),
    0 0 60px -20px rgba(13,115,119,0.08);
  position: relative;
}
.ssp-mockup-card-main {
  width: 560px; max-width: 100%;
  margin: 0 auto;
  transform: rotateX(8deg) rotateY(-4deg);
  animation: float 7s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: rotateX(8deg) rotateY(-4deg) translateY(0); }
  50% { transform: rotateX(6deg) rotateY(-3deg) translateY(-10px); }
}
.ssp-mockup-browser {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 18px; border-bottom: 1px solid #E4E3E0;
}
.ssp-mockup-browser-dots { display: flex; gap: 6px; }
.ssp-mockup-browser-dots span {
  width: 10px; height: 10px; border-radius: 50%;
  background: rgba(0,0,0,0.12);
}
.ssp-mockup-browser-dots span:first-child { background: #ff5f56; }
.ssp-mockup-browser-dots span:nth-child(2) { background: #ffbd2e; }
.ssp-mockup-browser-dots span:nth-child(3) { background: #27c93f; }
.ssp-mockup-browser-url {
  flex: 1; text-align: center; font-size: 12px;
  color: var(--dim); font-family: ui-monospace, monospace;
  background: rgba(0,0,0,0.25);
  padding: 5px 12px; border-radius: 6px;
}
.ssp-mockup-body { padding: 28px 32px 26px; }
.ssp-mockup-q-label {
  font-size: 11px; color: var(--dim);
  text-transform: uppercase; letter-spacing: 0.12em;
  margin-bottom: 12px;
}
.ssp-mockup-q-text {
  font-size: 19px; font-weight: 600;
  letter-spacing: -0.01em; line-height: 1.3;
  margin-bottom: 18px;
}
.ssp-mockup-progress {
  height: 3px; background: rgba(0,0,0,0.08);
  border-radius: 2px; margin-bottom: 22px; overflow: hidden;
}
.ssp-mockup-progress-fill {
  height: 100%; width: 40%;
  background: var(--accent);
  border-radius: 2px;
  animation: progress 4s ease-in-out infinite;
}
@keyframes progress {
  0%, 100% { width: 40%; }
  50% { width: 60%; }
}
.ssp-mockup-options { display: flex; flex-direction: column; gap: 10px; }
.ssp-mockup-option {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 16px; border-radius: 10px;
  border: 1px solid #E4E3E0;
  font-size: 14px; color: var(--muted);
  transition: all 0.25s;
}
.ssp-mockup-option-selected {
  border-color: rgba(13,115,119,0.5);
  background: rgba(13,115,119,0.06);
  color: var(--text);
}
.ssp-mockup-radio {
  width: 16px; height: 16px; border-radius: 50%;
  border: 1.5px solid var(--dim);
  flex-shrink: 0;
}
.ssp-mockup-radio-on {
  border-color: var(--accent);
  background: var(--accent);
  box-shadow: inset 0 0 0 3px #FFFFFF;
}
.ssp-mockup-next {
  margin-top: 20px; padding: 12px 22px;
  display: inline-block;
  background: var(--accent); color: #FFFFFF;
  border-radius: 8px; font-weight: 600; font-size: 13px;
}

/* Floating side cards */
.ssp-mockup-card-float-1, .ssp-mockup-card-float-2 {
  position: absolute;
  padding: 16px 20px;
  min-width: 200px;
  background: var(--panel-2);
  animation: float-side 6s ease-in-out infinite;
}
.ssp-mockup-card-float-1 {
  top: 18%; left: -12px;
  transform: rotate(-4deg);
  animation-delay: 0.5s;
}
.ssp-mockup-card-float-2 {
  bottom: 16%; right: -12px;
  transform: rotate(3deg);
  animation-delay: 1.5s;
}
@keyframes float-side {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50% { transform: translateY(-14px) rotate(-4deg); }
}
.ssp-mockup-card-float-2 {
  animation-name: float-side-2;
}
@keyframes float-side-2 {
  0%, 100% { transform: translateY(0) rotate(3deg); }
  50% { transform: translateY(-14px) rotate(3deg); }
}
.ssp-mockup-stat-label {
  font-size: 10px; color: var(--dim);
  text-transform: uppercase; letter-spacing: 0.1em;
  margin-bottom: 6px;
}
.ssp-mockup-stat-value {
  font-size: 18px; font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: 4px;
}
.ssp-mockup-stat-sub { font-size: 12px; color: var(--muted); }
.ssp-mockup-trend {
  font-size: 12px; color: var(--accent); font-weight: 600;
  margin-left: 6px;
}
.ssp-mockup-pulse {
  position: absolute; top: 18px; right: 18px;
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 0 rgba(13,115,119,0.5);
  animation: pulse-ring 2s infinite;
}
@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(13,115,119,0.6); }
  70% { box-shadow: 0 0 0 10px rgba(13,115,119,0); }
  100% { box-shadow: 0 0 0 0 rgba(13,115,119,0); }
}

@media (max-width: 720px) {
  .ssp-hero { padding: 56px 20px 20px; }
  .ssp-mockup-card-main { width: 92%; }
  .ssp-mockup-card-float-1, .ssp-mockup-card-float-2 { display: none; }
  .ssp-mockup-wrap { margin-top: 44px; }
}

/* ----- logos strip ----- */
.ssp-logos {
  max-width: 1100px; margin: 80px auto 0;
  padding: 0 32px;
  text-align: center;
}
.ssp-logos-label {
  font-size: 12px; color: var(--dim);
  text-transform: uppercase; letter-spacing: 0.12em;
  margin-bottom: 26px;
}
.ssp-logos-row {
  display: flex; justify-content: space-around;
  flex-wrap: wrap; gap: 40px;
  opacity: 0.55;
}
.ssp-logo-mark {
  font-weight: 700; font-size: 14px;
  letter-spacing: 0.18em; color: var(--muted);
}

/* ----- section scaffolding ----- */
.ssp-section {
  max-width: 1200px; margin: 0 auto;
  padding: 120px 32px 0;
}
.ssp-section-header {
  text-align: center; margin-bottom: 64px;
  max-width: 720px; margin-left: auto; margin-right: auto;
}
.ssp-eyebrow {
  display: inline-block;
  padding: 6px 12px; border-radius: 999px;
  background: rgba(0,0,0,0.04);
  border: 1px solid #E4E3E0;
  color: var(--accent);
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.1em;
  margin-bottom: 22px;
}
.ssp-h2 {
  font-size: clamp(30px, 4vw, 46px);
  line-height: 1.08;
  letter-spacing: -0.025em;
  font-weight: 700;
  margin: 0 0 18px;
}
.ssp-h2-muted { color: var(--muted); font-weight: 700; }
.ssp-sub {
  font-size: 17px; color: var(--muted);
  line-height: 1.55; margin: 0;
}

/* ----- how it works ----- */
.ssp-steps {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.ssp-step {
  padding: 36px 28px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  transition: all 0.2s;
}
.ssp-step:hover {
  border-color: var(--border-strong);
  transform: translateY(-3px);
}
.ssp-step-n {
  font-size: 13px; font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.1em;
  margin-bottom: 22px;
}
.ssp-step-title {
  font-size: 21px; font-weight: 600;
  letter-spacing: -0.015em;
  margin-bottom: 10px;
}
.ssp-step-body {
  font-size: 15px; color: var(--muted); line-height: 1.55;
}
@media (max-width: 820px) {
  .ssp-steps { grid-template-columns: 1fr; }
}

/* ----- features grid ----- */
.ssp-features {
  display: grid; grid-template-columns: repeat(6, 1fr);
  gap: 20px;
}
.ssp-feature {
  grid-column: span 3;
  padding: 32px 30px;
  background: var(--panel);
  border: 1px solid #E4E3E0;
  border-radius: 18px;
  transition: all 0.25s;
  min-height: 280px;
  display: flex; flex-direction: column;
}
.ssp-feature-wide { grid-column: span 6; }
.ssp-feature:hover {
  border-color: rgba(0,0,0,0.12);
  transform: translateY(-3px);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.ssp-feature-visual {
  flex: 1; min-height: 120px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 22px;
  background: rgba(0,0,0,0.02);
  border-radius: 12px;
  padding: 24px;
}
.ssp-feature-title {
  font-size: 19px; font-weight: 600;
  letter-spacing: -0.012em; margin-bottom: 8px;
}
.ssp-feature-body {
  font-size: 14.5px; color: var(--muted); line-height: 1.55;
}

/* feature visuals */
.ssp-feature-code {
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 13px; line-height: 1.6;
  text-align: left; width: 100%;
}
.ssp-feature-code-line { white-space: nowrap; overflow-x: auto; color: var(--muted); }
.cm-tag { color: #ec4899; }
.cm-attr { color: #6366f1; }
.cm-str { color: var(--accent); }

.ssp-feature-swatches { display: flex; gap: 14px; }
.ssp-swatch {
  width: 44px; height: 44px; border-radius: 12px;
  border: 1px solid #E4E3E0;
  animation: swatch-pop 3s ease-in-out infinite;
}
.ssp-swatch:nth-child(2) { animation-delay: 0.3s; }
.ssp-swatch:nth-child(3) { animation-delay: 0.6s; }
.ssp-swatch:nth-child(4) { animation-delay: 0.9s; }
@keyframes swatch-pop {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.ssp-feature-pill {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 14px 22px; border-radius: 10px;
  background: rgba(0,0,0,0.03);
  border: 1px solid #E4E3E0;
  font-size: 15px; color: var(--text);
}
.ssp-feature-pill-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
  animation: pulse 2s infinite;
}

.ssp-feature-rows { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.ssp-feature-row {
  display: flex; justify-content: space-between;
  padding: 10px 14px;
  background: rgba(0,0,0,0.03);
  border: 1px solid #E4E3E0;
  border-radius: 8px;
  font-size: 13px; font-family: ui-monospace, monospace;
}
.cm-cell { color: var(--text); }
.cm-cell-muted { color: var(--dim); }

.ssp-feature-toggle {
  display: flex; align-items: center; gap: 14px;
}
.ssp-feature-toggle-track {
  width: 48px; height: 26px;
  background: var(--accent);
  border-radius: 999px; position: relative;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12);
}
.ssp-feature-toggle-thumb {
  position: absolute; top: 3px; right: 3px;
  width: 20px; height: 20px; border-radius: 50%;
  background: #FFFFFF;
  animation: toggle 3s ease-in-out infinite;
}
@keyframes toggle {
  0%, 100% { right: 3px; }
  50% { right: 25px; }
}
.ssp-feature-toggle-label {
  font-size: 14px; color: var(--muted);
}

@media (max-width: 900px) {
  .ssp-features { grid-template-columns: 1fr; }
  .ssp-feature, .ssp-feature-wide { grid-column: span 1; }
}

/* ----- metrics / analytics ----- */
.ssp-metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  grid-template-rows: 1fr 1fr;
  gap: 20px;
  min-height: 460px;
}
.ssp-metrics-card {
  padding: 28px 30px;
  background: var(--panel);
  border: 1px solid #E4E3E0;
  border-radius: 18px;
  display: flex; flex-direction: column;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}
.ssp-metrics-card:hover {
  border-color: rgba(0,0,0,0.12);
}
.ssp-metrics-label {
  font-size: 12px; color: var(--dim);
  text-transform: uppercase; letter-spacing: 0.1em;
  margin-bottom: 18px;
}
.ssp-metrics-value {
  font-size: 36px; font-weight: 700;
  letter-spacing: -0.025em;
  margin-bottom: 18px;
}
.ssp-metrics-sub {
  font-size: 13px; color: var(--muted);
  margin-top: auto; padding-top: 16px;
}
.ssp-trend-up { color: var(--accent); font-weight: 600; font-size: 14px; }

/* gauge card */
.ssp-metrics-card-gauge {
  grid-row: span 2;
  align-items: center; text-align: center;
  justify-content: center;
}
.ssp-gauge {
  position: relative;
  width: 240px; height: 140px;
  margin: 20px 0;
}
.ssp-gauge-arc {
  animation: gauge-draw 1.8s ease-out forwards;
  transform-origin: center;
}
@keyframes gauge-draw {
  from { stroke-dashoffset: 157; }
  to { stroke-dashoffset: 52; }
}
.ssp-gauge-value {
  position: absolute;
  bottom: 8px; left: 50%;
  transform: translateX(-50%);
  font-size: 48px; font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--accent);
}

/* line chart card */
.ssp-line-chart {
  width: 100%;
  margin-top: auto;
}
.ssp-line-path {
  stroke-dasharray: 600;
  stroke-dashoffset: 600;
  animation: line-draw 2.2s ease-out 0.3s forwards;
}
@keyframes line-draw {
  to { stroke-dashoffset: 0; }
}
.ssp-line-axis {
  display: flex; justify-content: space-between;
  font-size: 11px; color: var(--dim);
  margin-top: 8px;
}

/* stat card */
.ssp-metrics-card-stat .ssp-stat-row {
  display: flex; align-items: center; gap: 18px;
  margin: 20px 0 auto;
}
.ssp-stat-before {
  font-size: 18px; color: var(--dim);
  text-decoration: line-through;
}
.ssp-stat-arrow { font-size: 20px; color: var(--muted); }
.ssp-stat-after {
  display: flex; align-items: baseline; gap: 6px;
  color: var(--accent);
}
.ssp-stat-big { font-size: 56px; font-weight: 700; letter-spacing: -0.03em; line-height: 1; }
.ssp-stat-unit { font-size: 18px; font-weight: 600; }

/* bar chart card */
.ssp-bars {
  display: flex; align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex: 1; margin-top: 14px;
}
.ssp-bar {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; gap: 10px;
  height: 100%;
}
.ssp-bar span {
  width: 100%;
  background: rgba(0,0,0,0.08);
  border-radius: 6px 6px 0 0;
  min-height: 0;
  transition: height 1.5s ease-out;
}
.ssp-bar-accent span {
  background: var(--accent);
  box-shadow: 0 0 20px -4px rgba(13,115,119,0.5);
}
.ssp-bar label {
  font-size: 11px; color: var(--dim);
  text-align: center;
}

@media (max-width: 900px) {
  .ssp-metrics-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
  .ssp-metrics-card-gauge { grid-row: auto; }
}

/* ----- pricing (najaf style) ----- */
.ssp-billing-toggle {
  display: flex; justify-content: center; align-items: center; gap: 4px;
  margin-bottom: 48px;
  background: var(--panel); border: 1px solid #E4E3E0;
  border-radius: 12px; padding: 4px; width: fit-content; margin-left: auto; margin-right: auto;
}
.ssp-toggle-btn {
  padding: 10px 28px; border-radius: 9px; border: none;
  font-size: 15px; font-weight: 600; cursor: pointer;
  background: transparent; color: var(--muted);
  transition: all 0.15s; display: flex; align-items: center; gap: 8px;
  font-family: inherit;
}
.ssp-toggle-btn.ssp-toggle-active {
  background: var(--accent); color: #FFFFFF;
}
.ssp-toggle-save {
  background: rgba(74,222,128,0.15); color: #4ade80;
  font-size: 11px; font-weight: 700; padding: 2px 8px;
  border-radius: 100px; border: 1px solid rgba(74,222,128,0.3);
}
.ssp-plan-price-old {
  font-size: 20px; color: var(--muted); text-decoration: line-through;
  margin-right: 8px; font-weight: 500;
}
.ssp-plan-billed {
  font-size: 13px; color: var(--muted); margin-top: -22px; margin-bottom: 24px;
}
.ssp-plans {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.ssp-plan {
  padding: 38px 32px 32px;
  background: var(--panel);
  border: 1px solid #E4E3E0;
  border-radius: 18px;
  display: flex; flex-direction: column;
  position: relative;
  transition: all 0.2s;
}
.ssp-plan:hover {
  border-color: rgba(0,0,0,0.12);
  transform: translateY(-3px);
}
.ssp-plan-featured {
  border-color: rgba(13,115,119,0.45);
  background: linear-gradient(180deg, rgba(13,115,119,0.04) 0%, var(--panel) 50%);
  box-shadow: 0 26px 70px -30px rgba(13,115,119,0.12);
}
.ssp-plan-badge {
  position: absolute; top: 18px; right: 18px;
  padding: 5px 12px; border-radius: 999px;
  background: var(--accent); color: #FFFFFF;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.04em;
}
.ssp-plan-name {
  font-size: 14px; font-weight: 600;
  color: var(--accent);
  text-transform: uppercase; letter-spacing: 0.1em;
  margin-bottom: 10px;
}
.ssp-plan-desc {
  font-size: 14px; color: var(--muted);
  line-height: 1.5; min-height: 42px;
  margin-bottom: 24px;
}
.ssp-plan-price {
  display: flex; align-items: baseline; gap: 4px;
  margin-bottom: 30px;
  padding-bottom: 30px;
  border-bottom: 1px solid #E4E3E0;
}
.ssp-plan-price-num {
  font-size: 52px; font-weight: 700;
  letter-spacing: -0.03em; line-height: 1;
}
.ssp-plan-price-per {
  font-size: 15px; color: var(--muted);
}
.ssp-plan-features {
  list-style: none; padding: 0; margin: 0 0 30px;
  display: flex; flex-direction: column; gap: 12px;
  flex: 1;
}
.ssp-plan-features li {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px; color: var(--text);
}
.ssp-plan-check {
  color: var(--accent); font-weight: 700;
  width: 18px; height: 18px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: rgba(13,115,119,0.12);
  font-size: 10px;
  flex-shrink: 0;
}
.ssp-plan-cta {
  width: 100%;
  padding: 14px 20px; font-size: 14px;
  border-radius: 10px;
}

@media (max-width: 900px) {
  .ssp-plans { grid-template-columns: 1fr; }
}

/* ----- FAQ ----- */
.ssp-faq {
  max-width: 760px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 12px;
}
.ssp-faq-item {
  background: var(--panel);
  border: 1px solid #E4E3E0;
  border-radius: 14px;
  padding: 22px 26px;
  text-align: left; cursor: pointer;
  font-family: inherit; color: inherit;
  transition: all 0.2s;
}
.ssp-faq-item:hover { border-color: rgba(0,0,0,0.12); }
.ssp-faq-open { border-color: rgba(13,115,119,0.3); }
.ssp-faq-q {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 16px; font-weight: 600;
  letter-spacing: -0.01em;
}
.ssp-faq-icon {
  font-size: 22px; color: var(--accent);
  font-weight: 400; line-height: 1;
}
.ssp-faq-a {
  margin-top: 14px;
  font-size: 14.5px; color: var(--muted);
  line-height: 1.6;
}

/* ----- final CTA ----- */
.ssp-final {
  max-width: 1200px; margin: 140px auto 0;
  padding: 0 32px;
}
.ssp-final-inner {
  position: relative;
  padding: 90px 40px;
  background: radial-gradient(ellipse at top, rgba(13,115,119,0.06) 0%, var(--panel) 60%);
  border: 1px solid rgba(13,115,119,0.2);
  border-radius: 24px;
  text-align: center;
  overflow: hidden;
}
.ssp-final-inner::before {
  content: ''; position: absolute; inset: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(13,115,119,0.04), transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(13,115,119,0.02), transparent 50%);
  pointer-events: none;
}
.ssp-final-title {
  position: relative;
  font-size: clamp(32px, 4.6vw, 54px);
  line-height: 1.05;
  letter-spacing: -0.03em;
  font-weight: 700;
  margin: 0 0 18px;
}
.ssp-final-sub {
  position: relative;
  font-size: 18px; color: var(--muted);
  margin: 0 0 32px;
}
.ssp-final .ssp-btn { position: relative; margin-bottom: 20px; }
.ssp-final .ssp-hero-trust { position: relative; }

/* ----- footer ----- */
.ssp-footer {
  margin-top: 120px;
  border-top: 1px solid #E4E3E0;
  padding: 60px 32px 30px;
}
.ssp-footer-inner {
  max-width: 1200px; margin: 0 auto;
  display: grid;
  grid-template-columns: 1.4fr 2fr;
  gap: 60px;
}
.ssp-footer-brand { display: flex; flex-direction: column; gap: 14px; }
.ssp-footer-tag {
  font-size: 14px; color: var(--muted);
  max-width: 280px; line-height: 1.5;
}
.ssp-footer-cols {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px;
}
.ssp-footer-col { display: flex; flex-direction: column; gap: 12px; }
.ssp-footer-col-title {
  font-size: 12px; color: var(--dim);
  text-transform: uppercase; letter-spacing: 0.1em;
  margin-bottom: 4px;
}
.ssp-footer-col a {
  font-size: 14px; color: var(--muted);
  transition: color 0.2s;
}
.ssp-footer-col a:hover { color: var(--text); }
.ssp-footer-bottom {
  max-width: 1200px; margin: 50px auto 0;
  padding-top: 24px;
  border-top: 1px solid #E4E3E0;
  font-size: 12px; color: var(--dim);
  text-align: center;
}
@media (max-width: 820px) {
  .ssp-footer-inner { grid-template-columns: 1fr; gap: 40px; }
  .ssp-footer-cols { grid-template-columns: repeat(2, 1fr); gap: 30px; }
}

/* ----- template showcase ----- */
.ssp-tpl-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  max-width: 1080px;
  margin: 0 auto;
}
.ssp-tpl-card {
  display: flex; flex-direction: column;
  background: #fff; border-radius: 16px; padding: 24px;
  border: 1px solid #E4E3E0;
  text-decoration: none; color: inherit;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.ssp-tpl-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.07);
  transform: translateY(-2px);
}
.ssp-tpl-top {
  display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
}
.ssp-tpl-icon-wrap {
  width: 36px; height: 36px; border-radius: 9px;
  background: rgba(13,115,119,0.08);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
}
.ssp-tpl-cat {
  font-size: 11px; font-weight: 600;
  color: var(--accent); background: rgba(13,115,119,0.06);
  padding: 3px 8px; border-radius: 4px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.ssp-tpl-name {
  font-size: 16px; font-weight: 700; margin: 0 0 6px;
  color: var(--fg);
}
.ssp-tpl-desc {
  font-size: 13px; color: var(--muted); line-height: 1.5;
  margin: 0 0 14px; flex: 1;
}
.ssp-tpl-try {
  display: flex; align-items: center; gap: 5px;
  font-size: 13px; font-weight: 600; color: var(--accent);
}
@media (max-width: 820px) {
  .ssp-tpl-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 540px) {
  .ssp-tpl-grid { grid-template-columns: 1fr; }
}
`;

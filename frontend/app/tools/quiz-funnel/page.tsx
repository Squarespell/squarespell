'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QUIZ_BUILDER_PATH } from '@/lib/urls';
import { QUIZ_TEMPLATE_CATALOG } from '@/lib/quiz/templates';

export default function LandingPage() {
  var router = useRouter();
  var [heroUrl, setHeroUrl] = useState('');
  var [selectedPlan, setSelectedPlan] = useState('monthly');
  var [selectedCategory, setSelectedCategory] = useState('All');
  var [expandedFaq, setExpandedFaq] = useState(null);

  useEffect(function() {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    var animateItems = document.querySelectorAll('[data-animate]');
    animateItems.forEach(function(item) {
      observer.observe(item);
    });

    return function() { observer.disconnect(); };
  }, []);

  var filteredTemplates = useMemo(function() {
    if (selectedCategory === 'All') return QUIZ_TEMPLATE_CATALOG.slice(0, 4);
    var filtered = QUIZ_TEMPLATE_CATALOG.filter(function(t) {
      return t.category === selectedCategory;
    });
    return filtered.slice(0, 4);
  }, [selectedCategory]);

  function handleHeroSubmit() {
    if (heroUrl.trim()) {
      router.push(QUIZ_BUILDER_PATH + '?url=' + encodeURIComponent(heroUrl));
    }
  }

  function toggleFaq(index) {
    setExpandedFaq(expandedFaq === index ? null : index);
  }

  var plans = [
    {
      name: 'Core',
      monthlyPrice: 12,
      yearlyPrice: 9,
      description: 'Build real quiz funnels with branching logic and scoring.',
      features: [
        '5 live quizzes',
        '1,000 leads/mo',
        '1,000 emails/mo',
        'AI quiz generation from your URL',
        'Squarespace one-click connect',
        'Remove Squarespell branding',
        'Branching logic & weighted scoring',
        'Quiz scheduling',
        'Standard analytics',
        'Lead dashboard + CSV export',
      ],
      excluded: [
        'A/B testing',
        'Email sequences',
        'Integrations (Zapier, Mailchimp, etc.)',
        'Advanced analytics',
        'Custom CSS',
        'White-label / Custom domain',
      ]
    },
    {
      name: 'Pro',
      monthlyPrice: 19,
      yearlyPrice: 16,
      description: 'Full power — unlimited quizzes, integrations, A/B testing.',
      features: [
        'Unlimited quizzes',
        '3,000 leads/mo',
        '3,000 emails/mo',
        'Everything in Core, plus:',
        'A/B testing',
        'Email sequences',
        'All integrations (Zapier, Mailchimp, Klaviyo, HubSpot)',
        'Advanced analytics & drop-off',
        'Custom CSS',
        'Priority email support',
      ],
      excluded: [
        'White-label (your brand)',
        'Custom domain for quizzes',
        'Team seats',
        'API access',
      ],
      highlight: true
    },
    {
      name: 'Business',
      monthlyPrice: 35,
      yearlyPrice: 29,
      description: 'Unlimited everything with white-label and team seats.',
      features: [
        'Unlimited quizzes, leads & emails',
        'Everything in Pro, plus:',
        'White-label (your brand on everything)',
        'Custom domain for quizzes',
        'Team seats (3 included)',
        'API access',
        'Priority support (email + chat)',
        'Dedicated onboarding call',
      ],
      excluded: []
    }
  ];

  var faqs = [
    {
      q: 'How does Squarespell work with Squarespace?',
      a: 'Squarespell is built as a native Squarespace integration. Paste your Squarespace URL, our AI reads your site\'s design and content, generates a branded quiz, and you embed it with a single line of code. The quiz lives on your Squarespace site and captures leads directly into your dashboard.'
    },
    {
      q: 'Do I need coding skills to create a quiz?',
      a: 'No. Squarespell is designed for non-technical users. You paste your URL, click "Generate," and the AI creates a branded quiz in 60 seconds. Our editor is visual and intuitive—no coding required.'
    },
    {
      q: 'Will the quiz match my website\'s design?',
      a: 'Yes. Our brand auto-detection pulls your site\'s colors, fonts, and visual style automatically. The quiz will look like a native part of your Squarespace site, not an external embed.'
    },
    {
      q: 'What happens with the leads I capture?',
      a: 'All leads are stored in your Squarespell dashboard and available for export, integration with email platforms (Mailchimp, Klaviyo, HubSpot), or direct webhook delivery. You own your data.'
    },
    {
      q: 'Can I customize the quiz after AI generates it?',
      a: 'Absolutely. The AI-generated quiz is a starting point. Edit questions, answers, scoring, outcomes, messaging—everything is fully customizable without touching code.'
    },
    {
      q: 'Does the quiz work on mobile?',
      a: 'Yes. All Squarespell quizzes are fully responsive and optimized for mobile, tablet, and desktop. We optimize for conversion on every device.'
    },
    {
      q: 'What if I don\'t have a Squarespace site?',
      a: 'Squarespell is built for Squarespace users. If you use another platform (WordPress, Shopify, etc.), we recommend Typeform or Interact for those platforms.'
    },
    {
      q: 'Can I try Squarespell before signing up?',
      a: 'Yes. We offer a 14-day free trial of the Pro plan. No credit card required. You get full access to AI generation, unlimited quizzes, and all Pro features.'
    },
    {
      q: 'How is Squarespell different from Typeform or Interact?',
      a: 'Squarespell is built exclusively for Squarespace with native brand auto-detection, instant embedding, and lead capture optimized for Squarespace workflows. Typeform and Interact are general-purpose quiz tools without Squarespace-specific optimizations.'
    },
    {
      q: 'What exactly counts as a lead?',
      a: 'A lead is counted when a visitor completes your quiz and provides their email address before viewing results. Partial completions and results views don\'t consume your lead quota.'
    },
    {
      q: 'Can I connect my email marketing tool?',
      a: 'Yes. Pro and Business plans include integrations with Mailchimp, Klaviyo, HubSpot, ConvertKit, and 20+ other tools via Zapier. Business plan includes API access for custom integrations.'
    },
    {
      q: 'Is there a free plan?',
      a: 'No permanent free plan, but we offer a 14-day free trial of the Pro plan. After trial, you choose Core ($12/mo), Pro ($19/mo), or Business ($35/mo) plans.'
    },
    {
      q: 'How do quiz funnels improve SEO?',
      a: 'Quizzes increase time-on-site, reduce bounce rates, and improve engagement metrics that Google values. They also generate internal links and increase pages per session, all positive SEO signals.'
    },
    {
      q: 'What is a quiz funnel and why does it convert better?',
      a: 'A quiz funnel is a multi-step conversion experience where visitors engage with interactive questions before revealing results. Quizzes convert 4-10x better than contact forms because they\'re engaging, gather intent data, and create a personalized experience.'
    }
  ];

  var features = [
    {
      icon: 'wand',
      title: 'AI Quiz Generation',
      desc: 'Paste your Squarespace URL. Our AI reads your content, brand, and business type—then generates a fully branded quiz in 60 seconds.'
    },
    {
      icon: 'palette',
      title: 'Brand Auto-Detection',
      desc: 'Colors, fonts, and design style are pulled automatically from your site. Your quiz looks native to your brand, not like an external tool.'
    },
    {
      icon: 'mail',
      title: 'Smart Lead Capture',
      desc: 'Email gate before results drives 60%+ lead capture rates. Segment leads by answers for personalized follow-up.'
    },
    {
      icon: 'chart',
      title: 'Real-Time Analytics',
      desc: 'See views, completions, drop-off points, and conversion funnels in real time. Understand exactly where visitors engage or bounce.'
    },
    {
      icon: 'beaker',
      title: 'A/B Testing',
      desc: 'Test quiz variants, questions, and outcomes. Auto-detect winners at 97% statistical confidence.'
    },
    {
      icon: 'code',
      title: 'One-Line Embed',
      desc: 'Single script tag embeds your quiz on any Squarespace page. Responsive, fast, and zero impact on site performance.'
    }
  ];

  var integrations = [
    'Mailchimp', 'Klaviyo', 'HubSpot', 'Google Sheets', 'Zapier', 'Slack',
    'ConvertKit', 'Webhooks', 'Shopify', 'Facebook', 'Segment', 'Amplitude'
  ];

  var templateCategories = ['All', 'Lead Gen', 'E-commerce', 'Recommendation', 'Personality', 'Survey'];

  var embedModes = [
    {
      name: 'Inline',
      desc: 'Embed directly on your page'
    },
    {
      name: 'Popup',
      desc: 'Trigger on scroll or click'
    },
    {
      name: 'Side Tab',
      desc: 'Sticky sidebar drawer'
    }
  ];

  var skins = [
    { name: 'Light/Editorial', primary: '#0F7377', background: '#F7F7F5' },
    { name: 'Dark/Modern', primary: '#0F7377', background: '#1a1a1a' },
    { name: 'Brand/Saturated', primary: '#FF6B35', background: '#FFF8E7' }
  ];

  function renderIcon(iconName) {
    var size = '24';
    var strokeWidth = '2';
    var baseAttrs = { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

    switch(iconName) {
      case 'wand':
        return <svg {...baseAttrs}><path d="M15 4V2m0 2a10 10 0 0 1 7.07 2.93M15 4a10 10 0 0 0-7.07 2.93M22 9h2m-2 0a10 10 0 0 1-2.93 7.07M22 9a10 10 0 0 0-7.07-2.93M9 22v2m0-2a10 10 0 0 1-7.07-2.93m7.07 2.93a10 10 0 0 0 7.07-2.93M2 9h-2m2 0a10 10 0 0 0 2.93 7.07M2 9a10 10 0 0 1 2.93-7.07M4 4l2.121 2.121m10.758 0L20 4m0 16l-2.121-2.121M6.121 6.121L4 4m0 16l2.121-2.121M20 20l-2.121-2.121" /></svg>;
      case 'palette':
        return <svg {...baseAttrs}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /><path d="M7.2 7.2A10 10 0 0 0 2 12m0 0a10 10 0 0 0 5.2 4.8m10-9.6A10 10 0 0 0 22 12m0 0a10 10 0 0 0-5.2 4.8" /></svg>;
      case 'mail':
        return <svg {...baseAttrs}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 6l10 7.5L22 6" /></svg>;
      case 'chart':
        return <svg {...baseAttrs}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="14" /><rect x="14" y="17" width="7" height="3" /><rect x="3" y="11" width="7" height="9" /></svg>;
      case 'beaker':
        return <svg {...baseAttrs}><path d="M4.5 3h15v8c0 3-2.24 5.5-5 6.5v3.5h-5v-3.5c-2.76-1-5-3.5-5-6.5V3z" /><line x1="9" y1="21" x2="15" y2="21" /></svg>;
      case 'code':
        return <svg {...baseAttrs}><path d="M8 6l-6 6 6 6M16 6l6 6-6 6" /></svg>;
      case 'link':
        return <svg {...baseAttrs}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
      case 'zap':
        return <svg {...baseAttrs}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
      case 'star':
        return <svg {...baseAttrs}><polygon points="12 2 15.09 10.26 23.77 11.27 17.88 17.07 19.24 25.72 12 21.77 4.76 25.72 6.12 17.07 0.23 11.27 8.91 10.26 12 2" /></svg>;
      case 'check':
        return <svg {...baseAttrs}><polyline points="20 6 9 17 4 12" /></svg>;
      case 'x':
        return <svg {...baseAttrs}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
      case 'arrow-right':
        return <svg {...baseAttrs}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
      default:
        return null;
    }
  }

  return (
    <div className="lp">
      <div className="announcement-bar">
        <div className="container">
          <p className="announcement-text">New: AI generates your quiz from any URL in 60 seconds → <Link href={QUIZ_BUILDER_PATH}>Try it free</Link></p>
        </div>
      </div>

      <header className="nav">
        <div className="nav-container">
          <div className="nav-logo">
            <div className="logo-mark">S</div>
            <span className="logo-text">Squarespell</span>
          </div>
          <nav className="nav-links">
            <a href="#how" className="nav-link">How it Works</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="#faq" className="nav-link">FAQ</a>
          </nav>
          <div className="nav-actions">
            <Link href="/sign-in" className="btn-text">Log in</Link>
            <Link href={QUIZ_BUILDER_PATH} className="btn-pill">Start 14-day trial</Link>
          </div>
        </div>
      </header>

      <section className="hero" id="hero">
        <div className="container">
          <div className="hero-content" data-animate>
            <h1 className="h1">
              AI Quiz Funnels <span className="accent-word">for Squarespace</span>
            </h1>
            <p className="h-sub">
              Paste your URL. AI builds a branded quiz in 60 seconds. Embed it on your site and capture 4x more leads than a contact form.
            </p>

            <div className="hero-form">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="https://yoursite.squarespace.com"
                  value={heroUrl}
                  onChange={function(e) { setHeroUrl(e.target.value); }}
                  onKeyDown={function(e) { if (e.key === 'Enter') handleHeroSubmit(); }}
                  className="form-input"
                />
                <button onClick={handleHeroSubmit} className="btn-pill btn-large">
                  Generate quiz
                </button>
              </div>
              <div className="trust-badges">
                <span className="badge">✓ No credit card</span>
                <span className="badge">✓ Live in 60 seconds</span>
                <span className="badge">✓ Cancel anytime</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" data-animate>
            <div className="quiz-mockup-wrapper">
              <div className="quiz-glow"></div>
              <div className="quiz-mockup">
                <div className="quiz-card">
                  <div className="quiz-header">
                    <div className="ai-tag">AI-generated</div>
                  </div>
                  <div className="quiz-question">Which describes you best?</div>
                  <div className="quiz-options">
                    <div className="option">Mobile-first</div>
                    <div className="option">Enterprise</div>
                    <div className="option">Startup</div>
                  </div>
                  <div className="live-indicator">● Live</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="social-proof">
        <div className="container">
          <p className="proof-text">Trusted by 2,400+ Squarespace site owners</p>
          <div className="proof-badges">
            <div className="proof-badge" data-animate>
              <span className="badge-icon">✓</span>
              <span>GDPR Compliant</span>
            </div>
            <div className="proof-badge" data-animate>
              <span className="badge-icon">✓</span>
              <span>Squarespace Native</span>
            </div>
            <div className="proof-badge" data-animate>
              <span className="badge-icon">✓</span>
              <span>Powered by AI</span>
            </div>
            <div className="proof-badge" data-animate>
              <span className="badge-icon">✓</span>
              <span>SOC 2 Ready</span>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works" id="how">
        <div className="container">
          <h2 className="h2" data-animate>How It Works</h2>
          <div className="steps">
            <article className="step" data-animate>
              <div className="step-icon">
                {renderIcon('link')}
              </div>
              <h3 className="h3">Paste Your URL</h3>
              <p>Our AI reads your Squarespace site, detects your colors, fonts, business type, and audience.</p>
            </article>
            <article className="step" data-animate>
              <div className="step-icon">
                {renderIcon('zap')}
              </div>
              <h3 className="h3">AI Builds Your Quiz</h3>
              <p>Branded questions, smart scoring, and personalized outcomes—all generated in 60 seconds.</p>
            </article>
            <article className="step" data-animate>
              <div className="step-icon">
                {renderIcon('arrow-right')}
              </div>
              <h3 className="h3">Embed & Capture Leads</h3>
              <p>One line of code. Goes live instantly. Leads flow to your dashboard in real time.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="comparison" id="comparison">
        <div className="container">
          <h2 className="h2" data-animate>Contact Forms Are Killing Your Conversions</h2>
          <div className="comparison-table">
            <div className="comp-row header">
              <div className="comp-col">Contact Form</div>
              <div className="comp-col">Squarespell Quiz Funnel</div>
            </div>
            <div className="comp-row" data-animate>
              <div className="comp-col">2-3% conversion</div>
              <div className="comp-col accent">10-15% conversion</div>
            </div>
            <div className="comp-row" data-animate>
              <div className="comp-col">No engagement</div>
              <div className="comp-col accent">Interactive & personalized</div>
            </div>
            <div className="comp-row" data-animate>
              <div className="comp-col">Name + email only</div>
              <div className="comp-col accent">Name, email, preferences, intent</div>
            </div>
            <div className="comp-row" data-animate>
              <div className="comp-col">Generic follow-up</div>
              <div className="comp-col accent">Personalized recommendations</div>
            </div>
            <div className="comp-row" data-animate>
              <div className="comp-col">Zero insights</div>
              <div className="comp-col accent">Full analytics dashboard</div>
            </div>
            <div className="comp-row" data-animate>
              <div className="comp-col">Visitors bounce</div>
              <div className="comp-col accent">Visitors complete and share</div>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2 className="h2" data-animate>Everything You Need</h2>
          <div className="features-grid">
            {features.map(function(f, i) {
              return (
                <article key={i} className="feature-card" data-animate style={{transitionDelay: (i * 0.1) + 's'}}>
                  <div className="feature-icon-wrapper">
                    {renderIcon(f.icon)}
                  </div>
                  <h3 className="h3">{f.title}</h3>
                  <p>{f.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="ai-flow">
        <div className="container">
          <h2 className="h2" data-animate>AI-Powered Generation</h2>
          <div className="flow-diagram">
            <div className="flow-step input" data-animate>
              <div className="flow-title">Input</div>
              <p>Paste URL</p>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-step extract" data-animate>
              <div className="flow-title">Extract</div>
              <p>Brand, Product,<br/>Audience</p>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-step output" data-animate>
              <div className="flow-title">Output</div>
              <p>Generated Quiz<br/>with Questions</p>
            </div>
          </div>
        </div>
      </section>

      <section className="analytics">
        <div className="container">
          <h2 className="h2" data-animate>Measure What Matters</h2>
          <div className="analytics-grid">
            <div className="analytics-card" data-animate>
              <h3 className="h3">Lead Capture Trend</h3>
              <svg className="chart" viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">
                <line x1="0" y1="120" x2="300" y2="120" stroke="var(--line)" strokeWidth="1"/>
                <line x1="10" y1="130" x2="10" y2="120" stroke="var(--line)" strokeWidth="1"/>
                <text x="10" y="145" fontSize="10" textAnchor="middle" fill="#999">Day 1</text>
                <line x1="250" y1="130" x2="250" y2="120" stroke="var(--line)" strokeWidth="1"/>
                <text x="250" y="145" fontSize="10" textAnchor="middle" fill="#999">Day 30</text>
                <polyline
                  points="10,120 40,100 70,80 100,60 130,40 160,30 190,25 220,20 250,15"
                  fill="none"
                  stroke="var(--t)"
                  strokeWidth="3"
                />
                <circle cx="250" cy="15" r="5" fill="var(--t)"/>
              </svg>
            </div>
            <div className="analytics-card" data-animate>
              <h3 className="h3">Question Drop-off</h3>
              <div className="bars">
                <div className="bar-wrapper">
                  <div className="bar" style={{height: '100%'}}></div>
                  <span className="bar-label">Q1</span>
                </div>
                <div className="bar-wrapper">
                  <div className="bar" style={{height: '85%'}}></div>
                  <span className="bar-label">Q2</span>
                </div>
                <div className="bar-wrapper">
                  <div className="bar" style={{height: '72%'}}></div>
                  <span className="bar-label">Q3</span>
                </div>
                <div className="bar-wrapper">
                  <div className="bar" style={{height: '65%'}}></div>
                  <span className="bar-label">Q4</span>
                </div>
                <div className="bar-wrapper">
                  <div className="bar" style={{height: '58%'}}></div>
                  <span className="bar-label">Q5</span>
                </div>
              </div>
            </div>
            <div className="analytics-card" data-animate>
              <h3 className="h3">A/B Test Winner</h3>
              <div className="ab-test">
                <div className="variant">
                  <span className="variant-label">Variant A</span>
                  <div className="variant-bar" style={{width: '45%'}}>45%</div>
                </div>
                <div className="variant winner">
                  <span className="variant-label">Variant B</span>
                  <div className="variant-bar" style={{width: '68%'}}>
                    68% <span className="winner-badge">WINNER</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="integrations">
        <div className="container">
          <h2 className="h2" data-animate>Connect Everything</h2>
          <div className="integrations-hub">
            <div className="hub-center">Squarespell</div>
            <div className="hub-items">
              {integrations.slice(0, 9).map(function(int, i) {
                return (
                  <div key={i} className="hub-item" data-animate style={{transitionDelay: (i * 0.05) + 's'}}>
                    {int}
                  </div>
                );
              })}
              <div className="hub-item more" data-animate>
                +{integrations.length - 9} more
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="templates">
        <div className="container">
          <h2 className="h2" data-animate>Browse Templates</h2>
          <div className="template-categories">
            {templateCategories.map(function(cat) {
              return (
                <button
                  key={cat}
                  onClick={function() { setSelectedCategory(cat); }}
                  className={'category-btn ' + (selectedCategory === cat ? 'active' : '')}
                >
                  {cat}
                </button>
              );
            })}
          </div>
          <div className="templates-grid">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map(function(tmpl, i) {
                return (
                  <article key={i} className="template-card" data-animate style={{transitionDelay: (i * 0.1) + 's'}}>
                    <div className="template-header">
                      <h3 className="h3">{tmpl.name}</h3>
                    </div>
                    <p>{tmpl.description}</p>
                    <div className="template-meta">
                      <span>{tmpl.category}</span>
                    </div>
                    <Link href={QUIZ_BUILDER_PATH + '?template=' + tmpl.id} className="btn-text-sm">
                      Use template →
                    </Link>
                  </article>
                );
              })
            ) : (
              <p>No templates in this category yet.</p>
            )}
          </div>
          <div className="template-cta">
            <a href="#" className="btn-text">Browse all templates →</a>
          </div>
        </div>
      </section>

      <section className="embed-modes">
        <div className="container">
          <h2 className="h2" data-animate>Choose Your Embed</h2>
          <div className="embed-grid">
            {embedModes.map(function(mode, i) {
              return (
                <article key={i} className="embed-card" data-animate style={{transitionDelay: (i * 0.1) + 's'}}>
                  <div className="embed-mockup">
                    {mode.name === 'Inline' && (
                      <div className="mockup-inline">
                        <div className="page-content">
                          <p>Page content</p>
                          <div className="quiz-embed">Quiz here</div>
                          <p>More content</p>
                        </div>
                      </div>
                    )}
                    {mode.name === 'Popup' && (
                      <div className="mockup-popup">
                        <div className="page-content">Page</div>
                        <div className="popup">
                          <div className="popup-close">×</div>
                          <div className="popup-content">Quiz</div>
                        </div>
                      </div>
                    )}
                    {mode.name === 'Side Tab' && (
                      <div className="mockup-tab">
                        <div className="page-content">Page</div>
                        <div className="side-tab">Tab</div>
                      </div>
                    )}
                  </div>
                  <h3 className="h3">{mode.name}</h3>
                  <p>{mode.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="brand-kit">
        <div className="container">
          <h2 className="h2" data-animate>Choose Your Skin</h2>
          <div className="skins-grid">
            {skins.map(function(skin, i) {
              return (
                <article key={i} className="skin-card" data-animate style={{transitionDelay: (i * 0.1) + 's'}}>
                  <div className="skin-preview">
                    <svg viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg">
                      <rect width="200" height="250" fill={skin.background}/>
                      <rect x="20" y="20" width="160" height="60" fill={skin.primary} rx="4"/>
                      <text x="100" y="55" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Quiz Title</text>
                      <rect x="20" y="100" width="160" height="40" fill="none" stroke={skin.primary} strokeWidth="2" rx="4"/>
                      <text x="100" y="128" textAnchor="middle" fill={skin.primary} fontSize="12">Answer Option</text>
                      <rect x="20" y="155" width="160" height="40" fill="none" stroke={skin.primary} strokeWidth="2" rx="4"/>
                      <text x="100" y="183" textAnchor="middle" fill={skin.primary} fontSize="12">Answer Option</text>
                    </svg>
                  </div>
                  <h3 className="h3">{skin.name}</h3>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pricing" id="pricing">
        <div className="container">
          <h2 className="h2" data-animate>Simple, Transparent Pricing</h2>

          <div className="billing-toggle">
            <button
              onClick={function() { setSelectedPlan('monthly'); }}
              className={'toggle-btn ' + (selectedPlan === 'monthly' ? 'active' : '')}
            >
              Monthly
            </button>
            <button
              onClick={function() { setSelectedPlan('yearly'); }}
              className={'toggle-btn ' + (selectedPlan === 'yearly' ? 'active' : '')}
            >
              Yearly
              <span className="savings">Save 25%</span>
            </button>
          </div>

          <div className="pricing-grid">
            {plans.map(function(plan, i) {
              var price = selectedPlan === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
              return (
                <article key={i} className={'pricing-card ' + (plan.highlight ? 'highlight' : '')} data-animate style={{transitionDelay: (i * 0.1) + 's'}}>
                  {plan.highlight && <div className="popular-badge">Most Popular</div>}
                  <h3 className="h3">{plan.name}</h3>
                  <p className="plan-desc">{plan.description}</p>
                  <div className="price">
                    {selectedPlan === 'yearly' && <span className="price-old">${plan.monthlyPrice}</span>}
                    <span className="amount">${price}</span>
                    <span className="period">/mo</span>
                  </div>
                  <div className="price-sub">
                    {selectedPlan === 'yearly' ? 'Billed $' + (plan.yearlyPrice * 12) + '/year' : 'Billed monthly'}
                  </div>
                  <Link href={QUIZ_BUILDER_PATH} className="btn-pill btn-full">
                    Start free trial
                  </Link>
                  <div className="divider"></div>
                  <div className="included-label">Included</div>
                  <ul className="features-list">
                    {plan.features.map(function(feat, fi) {
                      return (
                        <li key={fi}>
                          <span className="check-icon">{renderIcon('check')}</span>
                          {feat}
                        </li>
                      );
                    })}
                  </ul>
                  {plan.excluded && plan.excluded.length > 0 && (
                    <ul className="features-list excluded-list">
                      {plan.excluded.map(function(feat, fi) {
                        return (
                          <li key={fi} className="excluded-item">
                            <span className="cross-icon">{renderIcon('x')}</span>
                            {feat}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>

          <p className="pricing-note">
            All plans include 14-day Pro trial · No credit card · Cancel anytime
          </p>
        </div>
      </section>

      <section className="testimonials">
        <div className="container">
          <h2 className="h2" data-animate>What Squarespace Owners Are Saying</h2>
          <div className="testimonials-grid">
            <article className="testimonial-card" data-animate>
              <div className="testimonial-stars">
                {renderIcon('star')} {renderIcon('star')} {renderIcon('star')} {renderIcon('star')} {renderIcon('star')}
              </div>
              <p className="testimonial-text">
                "We switched from a contact form to Squarespell and immediately saw a 4x jump in qualified leads. The quiz captures exactly what we need to know about each prospect."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">S</div>
                <div>
                  <div className="author-name">Sarah Chen</div>
                  <div className="author-role">Design Studio Owner</div>
                </div>
              </div>
            </article>
            <article className="testimonial-card" data-animate>
              <div className="testimonial-stars">
                {renderIcon('star')} {renderIcon('star')} {renderIcon('star')} {renderIcon('star')} {renderIcon('star')}
              </div>
              <p className="testimonial-text">
                "The AI generation is insanely fast. We had our quiz live in under a minute. No design work, no writing—just paste our URL and it was done. Best $19/month we spend."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">M</div>
                <div>
                  <div className="author-name">Marcus Rodriguez</div>
                  <div className="author-role">E-commerce Brand Founder</div>
                </div>
              </div>
            </article>
            <article className="testimonial-card" data-animate>
              <div className="testimonial-stars">
                {renderIcon('star')} {renderIcon('star')} {renderIcon('star')} {renderIcon('star')} {renderIcon('star')}
              </div>
              <p className="testimonial-text">
                "The analytics show us exactly which questions are confusing visitors. We A/B tested two variants and the winner has 28% better completion. This is powerful stuff."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">J</div>
                <div>
                  <div className="author-name">Jennifer Walsh</div>
                  <div className="author-role">Coaching Business Owner</div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="faq" id="faq">
        <div className="container">
          <h2 className="h2" data-animate>Frequently Asked Questions</h2>
          <div className="faq-list">
            {faqs.map(function(item, i) {
              return (
                <article key={i} className="faq-item" data-animate style={{transitionDelay: (i * 0.05) + 's'}}>
                  <button
                    className="faq-question"
                    onClick={function() { toggleFaq(i); }}
                  >
                    <span>{item.q}</span>
                    <span className="faq-toggle">{expandedFaq === i ? '−' : '+'}</span>
                  </button>
                  {expandedFaq === i && (
                    <div className="faq-answer">
                      <p>{item.a}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="container" data-animate>
          <h2 className="h2">Your next lead is one quiz away.</h2>
          <Link href={QUIZ_BUILDER_PATH} className="btn-pill btn-large">
            Start 14-day trial
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="footer-logo">
                <div className="logo-mark">S</div>
                <span className="logo-text">Squarespell</span>
              </div>
              <p>AI-powered quiz funnels for Squarespace.</p>
              <div className="footer-social">
                <a href="#" aria-label="Twitter">𝕏</a>
                <a href="#" aria-label="LinkedIn">in</a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li><a href="#how">How it Works</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#faq">FAQ</a></li>
                <li><a href="#">Templates</a></li>
                <li><a href="#">Integrations</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <ul>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Guides</a></li>
                <li><a href="#">Case Studies</a></li>
                <li><a href="#">API Docs</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Status</a></li>
                <li><a href="#">Contact</a></li>
                <li><a href="#">Careers</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="#">Privacy</a></li>
                <li><a href="#">Terms</a></li>
                <li><a href="#">Security</a></li>
                <li><a href="#">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 Squarespell. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Squarespell',
            description: 'AI-powered quiz funnels for Squarespace',
            url: 'https://squarespell.com',
            applicationCategory: 'SalesApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '12',
              priceCurrency: 'USD'
            }
          })
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Squarespell',
            url: 'https://squarespell.com',
            logo: 'https://squarespell.com/logo.png',
            sameAs: [
              'https://twitter.com/squarespell',
              'https://linkedin.com/company/squarespell'
            ]
          })
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map(function(faq) {
              return {
                '@type': 'Question',
                name: faq.q,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: faq.a
                }
              };
            })
          })
        }}
      />

      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </div>
  );
}

var CSS = `
:root {
  --t: #0F7377;
  --p: #F7F7F5;
  --ink: #1a1a1a;
  --line: color-mix(in srgb, var(--ink) 12%, transparent);
  --tint: color-mix(in srgb, var(--t) 8%, var(--p));
  --accent: var(--t);
}

.lp {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  color: var(--ink);
  background: var(--p);
  line-height: 1.6;
}

* {
  box-sizing: border-box;
}

.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 40px;
}

h1, h2, h3 {
  margin: 0;
  font-weight: 700;
  line-height: 1.2;
}

.h1 {
  font-size: 56px;
  margin-bottom: 24px;
}

.h1 .accent-word {
  color: var(--t);
  font-style: italic;
}

.h2 {
  font-size: 42px;
  margin-bottom: 48px;
  text-align: center;
}

.h3 {
  font-size: 24px;
  margin-bottom: 12px;
}

.h-sub {
  font-size: 20px;
  color: var(--ink);
  margin-bottom: 32px;
  line-height: 1.5;
  max-width: 600px;
}

p {
  margin: 0 0 16px 0;
  font-size: 16px;
}

a {
  color: var(--t);
  text-decoration: none;
  transition: opacity 0.2s;
}

a:hover {
  opacity: 0.8;
}

button, input {
  font-family: inherit;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.05);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

[data-animate] {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

[data-animate].visible {
  opacity: 1;
  transform: translateY(0);
}

.announcement-bar {
  background: #0F7377;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.announcement-bar .container {
  width: 100%;
}

.announcement-text {
  color: white;
  font-size: 13px;
  text-align: center;
  margin: 0;
  font-weight: 500;
}

.announcement-text a {
  color: white;
  text-decoration: underline;
  font-weight: 600;
}

.nav {
  position: sticky;
  top: 40px;
  z-index: 100;
  background: rgba(247, 247, 245, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
  padding: 16px 0;
}

.nav-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 18px;
  color: var(--ink);
}

.logo-mark {
  width: 32px;
  height: 32px;
  background: var(--t);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 700;
  font-size: 18px;
}

.nav-links {
  display: flex;
  gap: 40px;
  flex: 1;
  margin-left: 60px;
}

.nav-link {
  font-size: 14px;
  color: var(--ink);
  font-weight: 500;
  border-bottom: 2px solid transparent;
  padding-bottom: 4px;
  transition: border-color 0.2s;
}

.nav-link:hover {
  border-bottom-color: var(--t);
}

.nav-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.btn-text {
  font-size: 14px;
  color: var(--ink);
  font-weight: 500;
  padding: 8px 16px;
}

.btn-pill {
  display: inline-block;
  background: var(--t);
  color: white;
  padding: 10px 24px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-pill:hover {
  opacity: 0.9;
}

.btn-large {
  padding: 14px 32px;
  font-size: 16px;
}

.btn-full {
  width: 100%;
}

.btn-text-sm {
  font-size: 14px;
  color: var(--t);
  font-weight: 500;
}

.hero {
  background: var(--p);
  padding: 140px 0 100px;
}

.hero .container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.hero-content {
  max-width: 550px;
}

.hero-form {
  margin-top: 40px;
}

.form-group {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.form-input {
  flex: 1;
  padding: 14px 20px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--t);
}

.trust-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  font-size: 14px;
  color: var(--ink);
}

.badge {
  display: inline-block;
  font-weight: 500;
}

.hero-visual {
  display: flex;
  justify-content: center;
  position: relative;
}

.quiz-mockup-wrapper {
  position: relative;
  width: 100%;
  max-width: 320px;
}

.quiz-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, rgba(15, 115, 119, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  animation: pulse-glow 3s ease-in-out infinite;
  pointer-events: none;
}

.quiz-mockup {
  width: 100%;
  max-width: 320px;
  animation: float 3s ease-in-out infinite;
  position: relative;
  z-index: 2;
}

.quiz-card {
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 32px 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  position: relative;
}

.quiz-header {
  margin-bottom: 24px;
}

.ai-tag {
  display: inline-block;
  background: rgba(15, 115, 119, 0.1);
  color: var(--t);
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  animation: pulse-glow 2s ease-in-out infinite;
}

.quiz-question {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--ink);
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.option {
  padding: 12px 16px;
  border: 2px solid var(--line);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.option:hover {
  border-color: var(--t);
  background: rgba(15, 115, 119, 0.05);
}

.live-indicator {
  font-size: 12px;
  color: #22c55e;
  font-weight: 600;
}

.social-proof {
  background: var(--tint);
  padding: 60px 0;
  text-align: center;
}

.proof-text {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 40px;
}

.proof-badges {
  display: flex;
  justify-content: center;
  gap: 40px;
  flex-wrap: wrap;
}

.proof-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.badge-icon {
  color: var(--t);
  font-size: 16px;
}

.how-it-works {
  background: var(--p);
  padding: 140px 0;
}

.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}

.step {
  text-align: center;
}

.step-icon {
  width: 60px;
  height: 60px;
  background: rgba(15, 115, 119, 0.1);
  border: 2px solid rgba(15, 115, 119, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  color: var(--t);
  transition: all 0.3s;
}

.step:hover .step-icon {
  background: rgba(15, 115, 119, 0.15);
  border-color: var(--t);
  transform: translateY(-4px);
}

.step-icon svg {
  width: 28px;
  height: 28px;
}

.comparison {
  background: var(--tint);
  padding: 140px 0;
}

.comparison-table {
  max-width: 800px;
  margin: 0 auto;
}

.comp-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
}

.comp-row.header {
  font-weight: 700;
  padding: 0 0 20px 0;
  border-bottom: 2px solid var(--line);
}

.comp-col {
  font-size: 15px;
  padding: 16px;
}

.comp-col.accent {
  color: var(--t);
  font-weight: 600;
}

.features {
  background: var(--p);
  padding: 140px 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}

.feature-card {
  padding: 40px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
}

.feature-card:hover {
  box-shadow: 0 20px 50px rgba(15, 115, 119, 0.12);
  border-color: var(--t);
  transform: translateY(-4px);
}

.feature-icon-wrapper {
  width: 44px;
  height: 44px;
  background: rgba(15, 115, 119, 0.08);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: var(--t);
  transition: all 0.3s;
}

.feature-card:hover .feature-icon-wrapper {
  background: rgba(15, 115, 119, 0.15);
  transform: scale(1.1);
}

.feature-icon-wrapper svg {
  width: 24px;
  height: 24px;
}

.feature-card p {
  font-size: 15px;
  color: #666;
}

.ai-flow {
  background: var(--tint);
  padding: 140px 0;
}

.flow-diagram {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
  flex-wrap: wrap;
}

.flow-step {
  padding: 32px 40px;
  background: white;
  border-radius: 12px;
  border: 2px solid var(--line);
  text-align: center;
  min-width: 160px;
  transition: all 0.3s;
}

.flow-step:hover {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  transform: translateY(-4px);
}

.flow-step.input {
  border-color: var(--t);
}

.flow-step.extract {
  border-color: #f59e0b;
}

.flow-step.output {
  border-color: #10b981;
}

.flow-title {
  font-weight: 700;
  margin-bottom: 8px;
  font-size: 16px;
}

.flow-step p {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.flow-arrow {
  font-size: 24px;
  color: var(--line);
}

.analytics {
  background: var(--p);
  padding: 140px 0;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}

.analytics-card {
  padding: 40px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  transition: all 0.3s;
}

.analytics-card:hover {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  border-color: var(--t);
}

.chart {
  width: 100%;
  height: 150px;
  margin-bottom: 24px;
}

.bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 150px;
  gap: 8px;
  margin-bottom: 24px;
}

.bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.bar {
  width: 100%;
  background: var(--t);
  border-radius: 4px 4px 0 0;
  transition: all 0.3s;
  min-width: 28px;
}

.bar:hover {
  background: rgba(15, 115, 119, 0.8);
}

.bar-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.ab-test {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.variant {
  display: flex;
  align-items: center;
  gap: 12px;
}

.variant-label {
  font-size: 14px;
  font-weight: 600;
  min-width: 80px;
}

.variant-bar {
  background: var(--tint);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--t);
  display: flex;
  align-items: center;
  gap: 8px;
}

.variant.winner .variant-bar {
  background: var(--t);
  color: white;
}

.winner-badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 10px;
  font-weight: 700;
}

.integrations {
  background: var(--tint);
  padding: 140px 0;
}

.integrations-hub {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 40px;
}

.hub-center {
  font-weight: 700;
  font-size: 20px;
  padding: 20px 30px;
  background: white;
  border: 2px solid var(--t);
  border-radius: 8px;
  z-index: 10;
}

.hub-items {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  width: 100%;
  max-width: 600px;
}

.hub-item {
  padding: 12px 16px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  transition: all 0.3s;
}

.hub-item:hover {
  border-color: var(--t);
  box-shadow: 0 4px 12px rgba(15, 115, 119, 0.1);
  transform: translateY(-2px);
}

.hub-item.more {
  background: rgba(15, 115, 119, 0.1);
  color: var(--t);
}

.templates {
  background: var(--p);
  padding: 140px 0;
}

.template-categories {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 48px;
  flex-wrap: wrap;
}

.category-btn {
  padding: 8px 20px;
  border: 1px solid var(--line);
  background: transparent;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.category-btn:hover {
  border-color: var(--t);
  color: var(--t);
}

.category-btn.active {
  background: var(--t);
  color: white;
  border-color: var(--t);
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 40px;
}

.template-card {
  padding: 24px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  transition: all 0.3s;
}

.template-card:hover {
  border-color: var(--t);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  transform: translateY(-4px);
}

.template-header {
  margin-bottom: 12px;
}

.template-card h3 {
  font-size: 18px;
}

.template-card p {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}

.template-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid var(--line);
  margin-bottom: 12px;
  font-size: 13px;
  color: #666;
}

.template-cta {
  text-align: center;
}

.embed-modes {
  background: var(--tint);
  padding: 140px 0;
}

.embed-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}

.embed-card {
  padding: 40px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  transition: all 0.3s;
}

.embed-card:hover {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  border-color: var(--t);
}

.embed-mockup {
  margin-bottom: 24px;
  padding: 20px;
  background: var(--tint);
  border-radius: 8px;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #666;
}

.mockup-inline .page-content,
.mockup-popup .page-content,
.mockup-tab .page-content {
  font-size: 12px;
  color: #999;
}

.quiz-embed {
  background: var(--t);
  color: white;
  padding: 12px;
  border-radius: 4px;
  margin: 12px 0;
}

.popup {
  position: absolute;
  width: 200px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.popup-close {
  position: absolute;
  top: 8px;
  right: 8px;
  cursor: pointer;
  font-weight: bold;
  color: #999;
}

.popup-content {
  padding-top: 12px;
  font-size: 12px;
  color: #999;
}

.side-tab {
  position: absolute;
  right: 0;
  background: var(--t);
  color: white;
  padding: 12px;
  border-radius: 4px 0 0 4px;
  font-size: 12px;
}

.brand-kit {
  background: var(--p);
  padding: 140px 0;
}

.skins-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}

.skin-card {
  text-align: center;
  transition: all 0.3s;
}

.skin-card:hover {
  transform: translateY(-4px);
}

.skin-preview {
  margin-bottom: 24px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s;
}

.skin-card:hover .skin-preview {
  border-color: var(--t);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}

.skin-preview svg {
  width: 100%;
  height: auto;
  max-width: 200px;
  margin: 0 auto;
  display: block;
}

.pricing {
  background: var(--tint);
  padding: 140px 0;
}

.billing-toggle {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 60px;
}

.toggle-btn {
  padding: 12px 24px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.toggle-btn:hover {
  border-color: var(--t);
}

.toggle-btn.active {
  background: var(--t);
  color: white;
  border-color: var(--t);
}

.savings {
  display: inline-block;
  margin-left: 8px;
  font-size: 12px;
  background: rgba(15, 115, 119, 0.2);
  color: var(--t);
  padding: 2px 6px;
  border-radius: 3px;
}

.toggle-btn.active .savings {
  background: rgba(255, 255, 255, 0.3);
  color: white;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  margin-bottom: 40px;
}

.pricing-card {
  padding: 40px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  position: relative;
  transition: all 0.3s;
}

.pricing-card:hover {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}

.pricing-card.highlight {
  border: 2px solid var(--t);
  transform: scale(1.05);
  box-shadow: 0 20px 60px rgba(15, 115, 119, 0.15);
}

.popular-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--t);
  color: white;
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.price {
  margin-bottom: 4px;
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.price-old {
  font-size: 18px;
  color: #999;
  text-decoration: line-through;
  margin-right: 4px;
}

.amount {
  font-size: 42px;
  font-weight: 700;
  color: var(--ink);
}

.period {
  color: #666;
  font-size: 14px;
  margin-left: 4px;
}

.price-sub {
  font-size: 13px;
  color: #999;
  margin-bottom: 24px;
}

.plan-desc {
  color: #666;
  font-size: 14px;
  margin-bottom: 24px;
  min-height: 44px;
}

.divider {
  height: 1px;
  background: var(--line);
  margin: 24px 0 16px;
}

.included-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--t);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(15, 115, 119, .15);
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 14px;
}

.features-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  color: #444;
  line-height: 1.4;
}

.check-icon, .cross-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.check-icon {
  color: var(--t);
  stroke-width: 3;
}

.check-icon svg {
  width: 16px;
  height: 16px;
}

.cross-icon {
  color: #ccc;
}

.cross-icon svg {
  width: 16px;
  height: 16px;
}

.excluded-list {
  margin-top: 12px;
}

.excluded-item {
  color: #bbb !important;
}

.pricing-note {
  text-align: center;
  font-size: 14px;
  color: #666;
}

.testimonials {
  background: var(--p);
  padding: 140px 0;
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.testimonial-card {
  padding: 32px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  transition: all 0.3s;
}

.testimonial-card:hover {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  border-color: var(--t);
  transform: translateY(-4px);
}

.testimonial-stars {
  font-size: 14px;
  margin-bottom: 16px;
  color: #fbbf24;
  display: flex;
  gap: 4px;
}

.testimonial-stars svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
  stroke: none;
}

.testimonial-text {
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 24px;
  color: #333;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  width: 40px;
  height: 40px;
  background: var(--t);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.author-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--ink);
}

.author-role {
  font-size: 13px;
  color: #666;
}

.faq {
  background: var(--tint);
  padding: 140px 0;
}

.faq-list {
  max-width: 800px;
  margin: 0 auto;
}

.faq-item {
  border-bottom: 1px solid var(--line);
  padding: 24px 0;
}

.faq-item:last-child {
  border-bottom: none;
}

.faq-question {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  text-align: left;
  transition: color 0.2s;
}

.faq-question:hover {
  color: var(--t);
}

.faq-toggle {
  font-size: 24px;
  color: var(--t);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.faq-answer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
  font-size: 15px;
  color: #666;
  line-height: 1.6;
  animation: fadeInUp 0.3s ease;
}

.faq-answer p {
  margin: 0;
}

.final-cta {
  background: var(--p);
  padding: 140px 0;
  text-align: center;
}

.final-cta h2 {
  margin-bottom: 40px;
}

.footer {
  background: var(--ink);
  color: rgba(255, 255, 255, 0.8);
  padding: 80px 0 40px;
}

.footer .container {
  padding: 0 40px;
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 40px;
  margin-bottom: 60px;
}

.footer-col h4 {
  color: white;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 20px;
  text-transform: uppercase;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: white;
  font-weight: 700;
}

.footer-col p {
  font-size: 14px;
  margin-bottom: 20px;
  color: rgba(255, 255, 255, 0.7);
}

.footer-social {
  display: flex;
  gap: 16px;
}

.footer-social a {
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  transition: color 0.2s;
}

.footer-social a:hover {
  color: white;
}

.footer-col ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-col ul li {
  margin-bottom: 12px;
}

.footer-col ul li a {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  transition: color 0.2s;
}

.footer-col ul li a:hover {
  color: white;
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 40px;
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

@media (max-width: 1024px) {
  .container {
    padding: 0 32px;
  }

  .h1 {
    font-size: 42px;
  }

  .h2 {
    font-size: 32px;
  }

  .announcement-bar {
    height: auto;
    padding: 12px 20px;
  }

  .announcement-text {
    font-size: 12px;
  }

  .nav {
    top: auto;
  }

  .hero {
    padding: 100px 0 80px;
  }

  .hero .container {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .nav-links {
    display: none;
  }

  .steps {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .pricing-grid {
    grid-template-columns: 1fr;
  }

  .pricing-card.highlight {
    transform: scale(1);
  }

  .embed-grid,
  .templates-grid,
  .skins-grid,
  .testimonials-grid,
  .analytics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .hub-items {
    grid-template-columns: repeat(3, 1fr);
  }

  .footer-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .container {
    padding: 0 20px;
  }

  .h1 {
    font-size: 32px;
  }

  .h2 {
    font-size: 24px;
    margin-bottom: 32px;
  }

  .h-sub {
    font-size: 16px;
  }

  .announcement-bar {
    padding: 10px 16px;
  }

  .announcement-text {
    font-size: 11px;
  }

  .nav {
    padding: 12px 0;
  }

  .nav-container {
    padding: 0 20px;
    flex-direction: column;
    gap: 16px;
  }

  .nav-actions {
    width: 100%;
    flex-direction: column;
  }

  .btn-pill {
    width: 100%;
    text-align: center;
  }

  .hero {
    padding: 80px 0 60px;
  }

  .form-group {
    flex-direction: column;
  }

  .form-input {
    width: 100%;
  }

  .trust-badges {
    gap: 12px;
    font-size: 12px;
  }

  .steps,
  .features-grid,
  .embed-grid,
  .templates-grid,
  .skins-grid,
  .testimonials-grid,
  .analytics-grid,
  .proof-badges,
  .pricing-grid {
    grid-template-columns: 1fr;
  }

  .comp-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .flow-diagram {
    flex-direction: column;
    gap: 20px;
  }

  .flow-arrow {
    display: none;
  }

  .hub-items {
    grid-template-columns: repeat(2, 1fr);
  }

  .footer-grid {
    grid-template-columns: 1fr;
  }

  .billing-toggle {
    flex-direction: column;
    width: 100%;
  }

  .toggle-btn {
    width: 100%;
  }

  .template-categories {
    flex-wrap: wrap;
  }

  .category-btn {
    flex: 1;
    min-width: 100px;
  }

  .faq-question {
    font-size: 14px;
  }
}
`;

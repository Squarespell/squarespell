'use client';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DARK_BG = '#07090c';
const ACCENT = '#D2FF1D';
const TEXT_PRIMARY = '#f0f2f5';
const TEXT_SECONDARY = 'rgba(240,242,245,0.45)';
const TEXT_MUTED = 'rgba(240,242,245,0.35)';
const BORDER_COLOR = 'rgba(255,255,255,0.08)';
const GLASS_BG = 'rgba(255,255,255,0.055)';
const GLASS_BORDER = 'rgba(255,255,255,0.09)';

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) {
    return null;
  }

  const handleGeneratePreview = () => {
    if (!urlInput.trim()) {
      alert('Please enter a Squarespace URL');
      return;
    }
    setLoading(true);
    const encoded = encodeURIComponent(urlInput);
    router.push(`/try?url=${encoded}`);
  };

  return (
    <div style={{ background: DARK_BG, color: TEXT_PRIMARY, fontFamily: '"DM Sans", system-ui, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${DARK_BG}; }
        input:focus { outline: none; }
        input::placeholder { color: ${TEXT_MUTED}; }
        ::selection { background: ${ACCENT}; color: ${DARK_BG}; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(210, 255, 29, 0.15); } 50% { box-shadow: 0 0 40px rgba(210, 255, 29, 0.25); } }
        .fade-in { animation: fadeIn 0.6s ease-out; }
        .glow { animation: glow 3s ease-in-out infinite; }
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .hero-headline { font-size: 32px !important; }
          .hero-subheadline { font-size: 16px !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .comparison-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .faq-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* NAV BAR */}
      <nav style={{ borderBottom: `1px solid ${BORDER_COLOR}`, position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(10px)', background: 'rgba(7,9,12,0.8)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '32px', height: '32px', background: ACCENT, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={DARK_BG} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.03em' }}>Squarespell</span>
          </div>

          {/* Nav Links */}
          <div className="nav-links" style={{ display: 'flex', gap: '40px' }}>
            <a href="#features" style={{ fontSize: '14px', color: TEXT_SECONDARY, textDecoration: 'none', transition: 'color 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.color = TEXT_PRIMARY} onMouseLeave={(e) => e.currentTarget.style.color = TEXT_SECONDARY}>Features</a>
            <a href="#pricing" style={{ fontSize: '14px', color: TEXT_SECONDARY, textDecoration: 'none', transition: 'color 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.color = TEXT_PRIMARY} onMouseLeave={(e) => e.currentTarget.style.color = TEXT_SECONDARY}>Pricing</a>
            <a href="#how-it-works" style={{ fontSize: '14px', color: TEXT_SECONDARY, textDecoration: 'none', transition: 'color 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.color = TEXT_PRIMARY} onMouseLeave={(e) => e.currentTarget.style.color = TEXT_SECONDARY}>How it works</a>
          </div>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link href="/sign-in" style={{ fontSize: '14px', fontWeight: 600, color: TEXT_SECONDARY, textDecoration: 'none', transition: 'color 0.2s', cursor: 'pointer', padding: '8px 16px' }} onMouseEnter={(e) => e.currentTarget.style.color = TEXT_PRIMARY} onMouseLeave={(e) => e.currentTarget.style.color = TEXT_SECONDARY}>Sign in</Link>
            <Link href="/sign-up" style={{ fontSize: '14px', fontWeight: 600, background: ACCENT, color: DARK_BG, padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', transition: 'all 0.2s', display: 'inline-block' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>Start free trial</Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section style={{ background: DARK_BG, padding: '80px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Gradient background elements */}
        <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(210,255,29,0.1) 0%, transparent 70%)', borderRadius: '50%', top: '-100px', left: '-100px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(210,255,29,0.08) 0%, transparent 70%)', borderRadius: '50%', bottom: '-50px', right: '-50px', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="fade-in" style={{ animationDelay: '0s' }}>
            <h1 className="hero-headline" style={{ fontSize: '52px', fontWeight: 800, lineHeight: '1.2', marginBottom: '16px', letterSpacing: '-0.02em' }}>
              AI Quiz Funnels for Squarespace
            </h1>
          </div>

          <div className="fade-in" style={{ animationDelay: '0.1s' }}>
            <p className="hero-subheadline" style={{ fontSize: '18px', color: TEXT_SECONDARY, lineHeight: '1.6', marginBottom: '48px' }}>
              Paste your URL. Get a branded quiz in 30 seconds. Capture 4x more leads.
            </p>
          </div>

          {/* URL Input */}
          <div className="fade-in" style={{ animationDelay: '0.2s', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', maxWidth: '500px', margin: '0 auto' }}>
              <input
                type="text"
                placeholder="Paste your Squarespace URL"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGeneratePreview()}
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  background: GLASS_BG,
                  border: `1px solid ${GLASS_BORDER}`,
                  borderRadius: '10px',
                  color: TEXT_PRIMARY,
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = ACCENT}
                onBlur={(e) => e.currentTarget.style.borderColor = GLASS_BORDER}
              />
              <button
                onClick={handleGeneratePreview}
                disabled={loading}
                style={{
                  padding: '14px 24px',
                  background: ACCENT,
                  color: DARK_BG,
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {loading ? 'Generating...' : 'Generate free preview →'}
              </button>
            </div>
          </div>

          {/* Trust badges */}
          <div className="fade-in" style={{ animationDelay: '0.3s', marginBottom: '36px' }}>
            <p style={{ fontSize: '13px', color: TEXT_MUTED, letterSpacing: '0.02em' }}>
              ✓ No signup required · ✓ Free preview · ✓ 30 seconds
            </p>
          </div>

          {/* Social proof */}
          <div className="fade-in" style={{ animationDelay: '0.4s' }}>
            <p style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '12px' }}>Trusted by 500+ Squarespace owners</p>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '-8px' }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: `hsl(${200 + i * 30}, 70%, 50%)`,
                    border: `2px solid ${DARK_BG}`,
                    marginLeft: i === 0 ? 0 : '-12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '80px 24px', background: DARK_BG, borderTop: `1px solid ${BORDER_COLOR}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, textAlign: 'center', marginBottom: '60px', letterSpacing: '-0.02em' }}>How it works</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '48px' }}>
            {[
              { num: '01', title: 'Paste your URL', desc: 'Our AI reads your brand colors, fonts, and content in seconds.' },
              { num: '02', title: 'Get a branded quiz', desc: 'Beautiful, fully-branded quiz generated from your Squarespace site.' },
              { num: '03', title: 'Embed & capture', desc: 'Add to your site and start capturing leads immediately.' },
            ].map((step, i) => (
              <div
                key={i}
                className="fade-in"
                style={{
                  padding: '32px',
                  background: GLASS_BG,
                  border: `1px solid ${GLASS_BORDER}`,
                  borderRadius: '12px',
                  transition: 'all 0.3s',
                  animationDelay: `${0.1 * i}s`,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = ACCENT;
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = GLASS_BG;
                  e.currentTarget.style.borderColor = GLASS_BORDER;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '48px', fontWeight: 800, color: ACCENT, marginBottom: '16px' }}>{step.num}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{step.title}</h3>
                <p style={{ fontSize: '14px', color: TEXT_SECONDARY, lineHeight: '1.6' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" style={{ padding: '80px 24px', background: DARK_BG, borderTop: `1px solid ${BORDER_COLOR}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, textAlign: 'center', marginBottom: '60px', letterSpacing: '-0.02em' }}>Powerful features</h2>

          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
            {[
              { icon: '⚡', title: 'AI Quiz Generation', desc: 'Instantly create branded quizzes from your Squarespace content.' },
              { icon: '🎨', title: 'Brand Auto-Detection', desc: 'Colors, fonts, and branding applied automatically.' },
              { icon: '📧', title: 'Lead Capture', desc: 'Collect emails, phone numbers, and custom data.' },
              { icon: '📊', title: 'Analytics Dashboard', desc: 'Track conversions, completion rates, and insights.' },
              { icon: '🔗', title: 'Squarespace Native', desc: 'Seamless integration with your Squarespace site.' },
              { icon: '🔔', title: 'Email Notifications', desc: 'Real-time alerts for new leads and sign-ups.' },
            ].map((feature, i) => (
              <div
                key={i}
                className="fade-in"
                style={{
                  padding: '28px',
                  background: GLASS_BG,
                  border: `1px solid ${GLASS_BORDER}`,
                  borderRadius: '12px',
                  transition: 'all 0.3s',
                  animationDelay: `${0.05 * i}s`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = ACCENT;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = GLASS_BG;
                  e.currentTarget.style.borderColor = GLASS_BORDER;
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{feature.title}</h3>
                <p style={{ fontSize: '14px', color: TEXT_SECONDARY, lineHeight: '1.6' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON SECTION */}
      <section style={{ padding: '80px 24px', background: DARK_BG, borderTop: `1px solid ${BORDER_COLOR}` }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-0.02em' }}>Why quiz funnels win</h2>
            <p style={{ fontSize: '16px', color: TEXT_SECONDARY }}>Quiz funnels out-convert traditional contact forms by 4.7x</p>
          </div>

          <div className="comparison-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px' }}>
            {[
              { title: 'Contact Forms', items: ['3% conversion rate', 'Boring & generic', 'No engagement', 'Basic analytics', 'Abandonment at 85%'] },
              { title: 'Quiz Funnels (Ours)', items: ['14% conversion rate', '2x engagement time', 'Leads pre-qualified', 'Deep insights', '3x lead quality'] },
            ].map((section, i) => (
              <div
                key={i}
                style={{
                  padding: '32px',
                  background: i === 0 ? GLASS_BG : `rgba(210, 255, 29, 0.08)`,
                  border: `1px solid ${i === 0 ? GLASS_BORDER : 'rgba(210, 255, 29, 0.3)'}`,
                  borderRadius: '12px',
                }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: i === 0 ? TEXT_PRIMARY : ACCENT }}>
                  {section.title}
                </h3>
                {section.items.map((item, j) => (
                  <div key={j} style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '15px', color: TEXT_SECONDARY }}>
                    <span style={{ color: i === 0 ? 'rgba(240,242,245,0.35)' : ACCENT, fontWeight: 700 }}>
                      {i === 0 ? '✗' : '✓'}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" style={{ padding: '80px 24px', background: DARK_BG, borderTop: `1px solid ${BORDER_COLOR}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-0.02em' }}>Simple pricing</h2>
            <p style={{ fontSize: '16px', color: TEXT_SECONDARY }}>All plans include 14-day free trial. No credit card required.</p>
          </div>

          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { name: 'Starter', price: '19', desc: 'Perfect to start', features: ['Up to 100 leads/mo', 'Basic analytics', 'Email support', '1 quiz'] },
              { name: 'Pro', price: '39', desc: 'Most popular', features: ['Unlimited leads', 'Advanced analytics', 'Priority support', '10 quizzes', 'Custom branding'], highlight: true },
              { name: 'Agency', price: '79', desc: 'For agencies', features: ['Unlimited everything', 'White-label', '24/7 support', 'Unlimited quizzes', 'Custom integrations'] },
            ].map((plan, i) => (
              <div
                key={i}
                className="fade-in"
                style={{
                  padding: '40px 32px',
                  background: plan.highlight ? `rgba(210, 255, 29, 0.1)` : GLASS_BG,
                  border: `2px solid ${plan.highlight ? 'rgba(210, 255, 29, 0.4)' : GLASS_BORDER}`,
                  borderRadius: '12px',
                  position: 'relative',
                  transition: 'all 0.3s',
                  animationDelay: `${0.1 * i}s`,
                  transform: plan.highlight ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={(e) => !plan.highlight && (e.currentTarget.style.borderColor = ACCENT)}
                onMouseLeave={(e) => !plan.highlight && (e.currentTarget.style.borderColor = GLASS_BORDER)}
              >
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: ACCENT, color: DARK_BG, padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
                    MOST POPULAR
                  </div>
                )}
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{plan.name}</h3>
                <p style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '20px' }}>{plan.desc}</p>
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '36px', fontWeight: 800, color: ACCENT }}>${plan.price}</span>
                  <span style={{ fontSize: '14px', color: TEXT_MUTED }}>/month</span>
                </div>
                <button
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: plan.highlight ? ACCENT : 'transparent',
                    color: plan.highlight ? DARK_BG : ACCENT,
                    border: `2px solid ${ACCENT}`,
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                    marginBottom: '24px',
                  }}
                  onMouseEnter={(e) => {
                    if (plan.highlight) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 8px 20px rgba(210, 255, 29, 0.2)`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  Start free trial
                </button>
                {plan.features.map((feature, j) => (
                  <div key={j} style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '14px', color: TEXT_SECONDARY }}>
                    <span style={{ color: ACCENT, marginTop: '2px' }}>✓</span>
                    {feature}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section style={{ padding: '80px 24px', background: DARK_BG, borderTop: `1px solid ${BORDER_COLOR}` }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, textAlign: 'center', marginBottom: '60px', letterSpacing: '-0.02em' }}>Frequently asked</h2>

          <div className="faq-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            {[
              { q: 'How does AI understand my brand?', a: 'We analyze your Squarespace site\'s design, colors, fonts, and content to create perfectly branded quizzes that feel like a natural extension of your site.' },
              { q: 'Can I customize the quiz questions?', a: 'Yes! You can edit every aspect of your quiz - questions, answers, scoring logic, and results pages.' },
              { q: 'How do I embed the quiz on my site?', a: 'We provide embed codes and full Squarespace integration. Just paste the code into a code block on your page.' },
              { q: 'What happens to the leads I capture?', a: 'Leads are stored in your dashboard, exported to CSV, or integrated with email platforms like Mailchimp, Zapier, and more.' },
              { q: 'Do you offer a refund if I don\'t like it?', a: 'Yes, we offer a 30-day money-back guarantee on all plans. No questions asked.' },
              { q: 'Can I use this for multiple sites?', a: 'Yes! The Pro and Agency plans support unlimited quizzes across multiple sites.' },
            ].map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: '80px 24px', background: DARK_BG, borderTop: `1px solid ${BORDER_COLOR}`, textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-0.02em' }}>Ready to grow?</h2>
          <p style={{ fontSize: '16px', color: TEXT_SECONDARY, marginBottom: '32px' }}>Join 500+ Squarespace owners using Squarespell to capture 4x more leads.</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleGeneratePreview}
              style={{
                padding: '14px 32px',
                background: ACCENT,
                color: DARK_BG,
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(210, 255, 29, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Get free preview
            </button>
            <Link
              href="/sign-in"
              style={{
                padding: '14px 32px',
                background: 'transparent',
                color: TEXT_SECONDARY,
                border: `2px solid ${BORDER_COLOR}`,
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '15px',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = TEXT_PRIMARY;
                e.currentTarget.style.color = TEXT_PRIMARY;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = BORDER_COLOR;
                e.currentTarget.style.color = TEXT_SECONDARY;
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: DARK_BG, borderTop: `1px solid ${BORDER_COLOR}`, padding: '48px 24px 32px', marginTop: '80px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '48px', marginBottom: '48px' }}>
            {[
              {
                title: 'Product',
                links: [
                  { label: 'Features', href: '#features' },
                  { label: 'Pricing', href: '#pricing' },
                  { label: 'How it works', href: '#how-it-works' },
                ],
              },
              {
                title: 'Company',
                links: [
                  { label: 'About', href: '#' },
                  { label: 'Blog', href: '#' },
                  { label: 'Careers', href: '#' },
                ],
              },
              {
                title: 'Legal',
                links: [
                  { label: 'Privacy', href: '/privacy' },
                  { label: 'Terms', href: '/terms' },
                  { label: 'Contact', href: '#' },
                ],
              },
              {
                title: 'Social',
                links: [
                  { label: 'Twitter', href: '#' },
                  { label: 'LinkedIn', href: '#' },
                  { label: 'Discord', href: '#' },
                ],
              },
            ].map((col, i) => (
              <div key={i}>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TEXT_MUTED, marginBottom: '16px' }}>
                  {col.title}
                </p>
                {col.links.map((link, j) => (
                  <Link
                    key={j}
                    href={link.href}
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      color: TEXT_SECONDARY,
                      textDecoration: 'none',
                      marginBottom: '12px',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = TEXT_PRIMARY)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_SECONDARY)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>

          <div style={{ paddingTop: '24px', borderTop: `1px solid ${BORDER_COLOR}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <p style={{ fontSize: '14px', color: TEXT_MUTED }}>&copy; 2026 Squarespell. All rights reserved.</p>
            <p style={{ fontSize: '14px', color: TEXT_MUTED }}>Powered by Cloudflare</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        padding: '24px',
        background: open ? `rgba(210, 255, 29, 0.05)` : GLASS_BG,
        border: `1px solid ${open ? 'rgba(210, 255, 29, 0.3)' : GLASS_BORDER}`,
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onClick={() => setOpen(!open)}
      onMouseEnter={(e) => !open && (e.currentTarget.style.borderColor = ACCENT)}
      onMouseLeave={(e) => !open && (e.currentTarget.style.borderColor = GLASS_BORDER)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: TEXT_PRIMARY }}>{q}</h3>
        <span style={{ fontSize: '18px', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
      </div>
      {open && (
        <p style={{ fontSize: '14px', color: TEXT_SECONDARY, marginTop: '12px', lineHeight: '1.6' }}>{a}</p>
      )}
    </div>
  );
}

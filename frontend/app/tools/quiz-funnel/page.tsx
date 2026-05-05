'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QUIZ_BUILDER_PATH } from '@/lib/urls'
import { QUIZ_TEMPLATE_CATALOG } from '@/lib/quiz/templates'

var LandingPage = function() {
  var router = useRouter()
  var [url, setUrl] = useState('')
  var [loading, setLoading] = useState(false)
  var [isYearly, setIsYearly] = useState(false)
  var [openFaq, setOpenFaq] = useState<number | null>(null)
  var [visibleItems, setVisibleItems] = useState<Set<string>>(new Set())
  var observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(function() {
    observerRef.current = new IntersectionObserver(
      function(entries) {
        var newVisible = new Set(visibleItems)
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            newVisible.add(entry.target.id)
          }
        })
        setVisibleItems(newVisible)
      },
      { threshold: 0.1 }
    )

    return function() {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  useEffect(function() {
    if (observerRef.current) {
      document.querySelectorAll('[data-animate]').forEach(function(el) {
        observerRef.current?.observe(el)
      })
    }
  }, [])

  useEffect(function() {
    if (visibleItems.size > 0) {
      document.querySelectorAll('[data-animate]').forEach(function(el) {
        if (visibleItems.has(el.id)) {
          el.classList.add('visible')
        }
      })
    }
  }, [visibleItems])

  var handleSubmitUrl = function(e: React.FormEvent) {
    e.preventDefault()
    if (url.trim()) {
      setLoading(true)
      setTimeout(function() {
        router.push(QUIZ_BUILDER_PATH + '?url=' + encodeURIComponent(url))
      }, 300)
    }
  }

  var faqItems = [
    {
      question: 'How does Squarespell work with Squarespace?',
      answer: 'Squarespell generates a quiz embed code that you paste directly into your Squarespace site. No technical knowledge required. The quiz automatically inherits your site\'s fonts and colors, then you can customize further.'
    },
    {
      question: 'Do I need coding skills?',
      answer: 'Not at all. Squarespell is built for creators and marketers with no coding experience. Our AI handles the heavy lifting, and our visual editor is drag-and-drop simple.'
    },
    {
      question: 'Will the quiz match my design?',
      answer: 'Yes. Our AI analyzes your Squarespace site\'s colors, typography, and style, then generates a quiz that looks like it was built for you. You can further customize every detail.'
    },
    {
      question: 'What happens with captured leads?',
      answer: 'Leads are stored securely in your Squarespell dashboard. You can export them, connect email tools, or set up automations to nurture them automatically.'
    },
    {
      question: 'Can I customize after AI generates?',
      answer: 'Absolutely. The AI is just a starting point. Edit questions, answers, branching logic, colors, fonts, and scoring rules. Full creative control is yours.'
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes. Start free with up to 5 quizzes and 1,000 leads captured. No credit card required. Upgrade anytime to unlock more features.'
    },
    {
      question: 'How is Squarespell different from Typeform?',
      answer: 'Squarespell is built specifically for Squarespace creators. We focus on quiz funnels that generate leads and sales, with tighter Squarespace integration and lower pricing.'
    },
    {
      question: 'What counts as a lead?',
      answer: 'A lead is counted when someone completes your quiz and you capture their email (or other contact info). Partial completions don\'t count.'
    },
    {
      question: 'Can I connect my email marketing tools?',
      answer: 'Yes. We integrate with Mailchimp, ConvertKit, Klaviyo, HubSpot, and 20+ other tools via Zapier. Leads automatically sync to your email list.'
    },
    {
      question: 'How do quiz funnels improve SEO?',
      answer: 'Quizzes increase time on page, reduce bounce rate, and generate backlinks through sharing. They also boost engagement metrics that Google considers.'
    }
  ]

  var integrationPartners = [
    { name: 'Zapier', icon: '⚡' },
    { name: 'Mailchimp', icon: '📧' },
    { name: 'Klaviyo', icon: '🎯' },
    { name: 'ConvertKit', icon: '✍️' },
    { name: 'Google Sheets', icon: '📊' },
    { name: 'HubSpot', icon: '🔄' },
    { name: 'Squarespace Commerce', icon: '🛒' },
    { name: 'Calendly', icon: '📅' }
  ]

  var useCases = [
    {
      title: 'Creators & Influencers',
      description: 'Grow your email list with engaging quizzes. Segment audiences by interests and send personalized content.'
    },
    {
      title: 'Marketers & Agencies',
      description: 'Use quiz funnels to qualify leads before passing to sales. Track conversion at every stage.'
    },
    {
      title: 'Educators & Coaches',
      description: 'Assess student knowledge, deliver personalized learning paths, and book consultations based on results.'
    }
  ]

  var pricingPlans = [
    {
      name: 'Core',
      monthlyPrice: 12,
      yearlyPrice: 9,
      description: 'For creators just getting started',
      features: [
        '5 quizzes',
        '1,000 leads per month',
        'AI quiz generation',
        'Basic branding',
        'Logic & branching',
        'Email integration (basic)',
        'Community support'
      ],
      highlighted: false
    },
    {
      name: 'Pro',
      monthlyPrice: 19,
      yearlyPrice: 16,
      description: 'For serious growth',
      features: [
        'Unlimited quizzes',
        '3,000 leads per month',
        'AI quiz generation',
        'Advanced branding',
        'Full logic & branching',
        'A/B testing',
        'Email sequences',
        'All integrations',
        'Custom CSS',
        'Priority support'
      ],
      highlighted: true
    },
    {
      name: 'Business',
      monthlyPrice: 35,
      yearlyPrice: 29,
      description: 'For agencies & teams',
      features: [
        'Unlimited everything',
        'White-label option',
        'Custom domain',
        'Team seats (up to 5)',
        'Advanced analytics',
        'API access',
        'Dedicated support',
        'Custom integrations'
      ],
      highlighted: false
    }
  ]

  var templates = QUIZ_TEMPLATE_CATALOG.slice(0, 4)

  return (
    <div style={{
      backgroundColor: '#050505',
      color: '#FFFFFF',
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      minHeight: '100vh',
      overflow: 'hidden'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        html, body {
          margin: 0;
          padding: 0;
        }

        * {
          box-sizing: border-box;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(45, 212, 191, 0.2);
          }
          50% {
            box-shadow: 0 0 40px rgba(45, 212, 191, 0.4);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        [data-animate] {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }

        [data-animate].visible {
          animation: fadeInUp 0.6s ease-out forwards;
        }

        .float-animation {
          animation: float 3s ease-in-out infinite;
        }

        .glow-animation {
          animation: glow 3s ease-in-out infinite;
        }

        input::placeholder {
          color: #666;
        }

        input:focus {
          outline: none;
        }

        .gradient-text {
          background: linear-gradient(135deg, #2DD4BF 0%, #0D7377 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .glass-morphic {
          background: rgba(15, 15, 15, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(26, 26, 26, 0.8);
        }

        button:hover {
          transform: translateY(-2px);
          transition: all 0.2s ease;
        }

        button:active {
          transform: translateY(0);
        }

        a {
          text-decoration: none;
          color: inherit;
        }

        .accordion-item {
          transition: all 0.3s ease;
        }
      `}
      </style>

      {/* STICKY NAVIGATION */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        background: 'rgba(5, 5, 5, 0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(26, 26, 26, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 60px',
        zIndex: 1000,
        fontWeight: 600
      }}>
        <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>
          Squarespell
        </div>
        <div style={{
          display: 'flex',
          gap: '40px',
          alignItems: 'center',
          fontSize: '14px',
          color: '#999'
        }}>
          <a href="#features" style={{ cursor: 'pointer', transition: 'color 0.2s' }}>Features</a>
          <a href="#how-it-works" style={{ cursor: 'pointer', transition: 'color 0.2s' }}>How It Works</a>
          <a href="#pricing" style={{ cursor: 'pointer', transition: 'color 0.2s' }}>Pricing</a>
          <a href="#templates" style={{ cursor: 'pointer', transition: 'color 0.2s' }}>Templates</a>
        </div>
        <button
          onClick={function() {
            var heroInput = document.querySelector('input[type="text"]') as HTMLInputElement
            if (heroInput) heroInput.focus()
          }}
          style={{
            padding: '10px 24px',
            background: '#0D7377',
            color: '#FFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Start Free Trial
        </button>
      </nav>

      {/* HERO SECTION */}
      <section style={{
        paddingTop: '160px',
        paddingBottom: '80px',
        paddingLeft: '60px',
        paddingRight: '60px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(13, 115, 119, 0.05) 0%, rgba(5, 5, 5, 0) 100%)'
      }}>
        <div data-animate="" style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: 'rgba(45, 212, 191, 0.1)',
            border: '1px solid rgba(45, 212, 191, 0.3)',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#2DD4BF',
            marginBottom: '24px'
          }}>
            ✨ AI-Powered Quiz Funnels for Squarespace
          </div>

          <h1 style={{
            fontSize: '64px',
            fontWeight: 700,
            lineHeight: '1.2',
            marginBottom: '24px',
            letterSpacing: '-1px'
          }}>
            Turn Visitors Into Leads With{' '}
            <span className="gradient-text">Interactive Quiz Funnels</span>
          </h1>

          <p style={{
            fontSize: '20px',
            color: '#999',
            marginBottom: '48px',
            lineHeight: '1.6',
            maxWidth: '700px',
            margin: '0 auto 48px'
          }}>
            Paste your Squarespace URL. AI generates a branded quiz in 60 seconds. Embed it. Capture leads on autopilot.
          </p>

          <form onSubmit={handleSubmitUrl} style={{
            display: 'flex',
            gap: '12px',
            maxWidth: '600px',
            margin: '0 auto 32px',
            alignItems: 'stretch'
          }}>
            <input
              type="text"
              value={url}
              onChange={function(e) { setUrl(e.target.value) }}
              placeholder="https://yoursite.squarespace.com"
              style={{
                flex: 1,
                padding: '14px 20px',
                background: '#0F0F0F',
                border: '1px solid #1A1A1A',
                borderRadius: '10px',
                color: '#FFF',
                fontSize: '14px',
                fontFamily: "'DM Sans'",
                transition: 'border-color 0.2s'
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px 32px',
                background: '#0D7377',
                color: '#FFF',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading ? 0.8 : 1
              }}
            >
              {loading ? 'Generating...' : 'Generate My Quiz →'}
            </button>
          </form>

          <p style={{
            fontSize: '13px',
            color: '#666',
            marginBottom: '64px'
          }}>
            No credit card required • 14-day free trial • Cancel anytime
          </p>

          {/* Animated product mockup */}
          <div
            id="hero-mockup"
            data-animate=""
            style={{
              maxWidth: '900px',
              margin: '0 auto',
              position: 'relative',
              perspective: '1000px'
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #1A1A1A 0%, #0F0F0F 100%)',
              border: '1px solid #2A2A2A',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(45, 212, 191, 0.1)',
              animation: 'float 4s ease-in-out infinite'
            }}>
              {/* Quiz Editor Mockup */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr 180px',
                gap: '20px',
                minHeight: '400px'
              }}>
                {/* Left sidebar - Questions list */}
                <div style={{
                  background: '#0A0A0A',
                  border: '1px solid #1A1A1A',
                  borderRadius: '12px',
                  padding: '16px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#666',
                    marginBottom: '12px'
                  }}>
                    QUESTIONS
                  </div>
                  {[1, 2, 3].map(function(i) {
                    return (
                      <div
                        key={i}
                        style={{
                          padding: '8px 10px',
                          background: i === 1 ? '#0D7377' : '#1A1A1A',
                          borderRadius: '6px',
                          fontSize: '12px',
                          marginBottom: '8px',
                          color: i === 1 ? '#FFF' : '#666',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Q{i}: Question text
                      </div>
                    )
                  })}
                </div>

                {/* Center - Question editor */}
                <div style={{
                  background: '#0A0A0A',
                  border: '1px solid #1A1A1A',
                  borderRadius: '12px',
                  padding: '24px'
                }}>
                  <div style={{
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#666',
                      marginBottom: '8px'
                    }}>
                      Question
                    </div>
                    <div style={{
                      padding: '12px 16px',
                      background: '#1A1A1A',
                      borderRadius: '8px',
                      color: '#999',
                      fontSize: '13px'
                    }}>
                      Which type of content resonates most?
                    </div>
                  </div>

                  <div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#666',
                      marginBottom: '8px'
                    }}>
                      Answers
                    </div>
                    {['Educational', 'Entertaining', 'Inspirational'].map(function(ans, i) {
                      return (
                        <div
                          key={i}
                          style={{
                            padding: '12px 16px',
                            background: '#1A1A1A',
                            borderRadius: '8px',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '13px',
                            color: '#999'
                          }}
                        >
                          <span>{ans}</span>
                          <span style={{ color: '#666' }}>+</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Right sidebar - Logic panel */}
                <div style={{
                  background: '#0A0A0A',
                  border: '1px solid #1A1A1A',
                  borderRadius: '12px',
                  padding: '16px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#666',
                    marginBottom: '12px'
                  }}>
                    LOGIC
                  </div>
                  <div style={{
                    padding: '12px',
                    background: '#1A1A1A',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#666',
                    lineHeight: '1.6'
                  }}>
                    <div>Answer: Educational</div>
                    <div style={{ color: '#0D7377', margin: '4px 0' }}>→ Score +10</div>
                    <div style={{ color: '#2DD4BF' }}>→ Show slide 3</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{
        padding: '60px',
        textAlign: 'center',
        borderTop: '1px solid rgba(26, 26, 26, 0.8)',
        borderBottom: '1px solid rgba(26, 26, 26, 0.8)'
      }}>
        <p style={{
          fontSize: '14px',
          color: '#999',
          marginBottom: '24px'
        }}>
          Trusted by 2,000+ Squarespace creators
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          flexWrap: 'wrap',
          opacity: 0.5
        }}>
          {['Creator Co', 'Growth Labs', 'Commerce Plus', 'Design Hub', 'Funnel Pros'].map(function(brand) {
            return (
              <div key={brand} style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#666'
              }}>
                {brand}
              </div>
            )
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        data-animate=""
        style={{
          padding: '160px 60px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}
      >
        <div style={{
          marginBottom: '40px'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#0D7377',
            marginBottom: '12px',
            letterSpacing: '1px'
          }}>
            + HOW IT WORKS
          </div>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 700,
            marginBottom: '16px'
          }}>
            From URL to leads in 5 minutes
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#999'
          }}>
            See how simple it is to create a quiz that converts
          </p>
        </div>

        {/* 5-Step walkthrough */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '60px',
          marginTop: '80px'
        }}>
          {/* Step 1 */}
          <div data-animate="" style={{}}>
            <div style={{
              background: '#0F0F0F',
              border: '1px solid #1A1A1A',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #2DD4BF 0%, #0D7377 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '20px',
                color: '#FFF'
              }}>
                1
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
                Paste Your URL
              </h3>
              <p style={{ fontSize: '14px', color: '#999', marginBottom: '24px' }}>
                Enter your Squarespace site URL. We scan it instantly to understand your design.
              </p>
              <div style={{
                background: '#0A0A0A',
                border: '1px solid #1A1A1A',
                borderRadius: '10px',
                padding: '20px',
                fontSize: '12px',
                color: '#666'
              }}>
                <div style={{ marginBottom: '12px' }}>URL Input Field</div>
                <div style={{ color: '#2DD4BF' }}>✓ Scanning your site...</div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div data-animate="" style={{}}>
            <div style={{
              background: '#0F0F0F',
              border: '1px solid #1A1A1A',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #2DD4BF 0%, #0D7377 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '20px',
                color: '#FFF'
              }}>
                2
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
                AI Generates Your Quiz
              </h3>
              <p style={{ fontSize: '14px', color: '#999', marginBottom: '24px' }}>
                Our AI instantly creates a branded, high-converting quiz based on your site.
              </p>
              <div style={{
                background: '#0A0A0A',
                border: '1px solid #1A1A1A',
                borderRadius: '10px',
                padding: '20px',
                fontSize: '12px',
                color: '#666'
              }}>
                <div>AI generating quiz...</div>
                <div style={{
                  marginTop: '12px',
                  background: '#1A1A1A',
                  height: '4px',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#0D7377',
                    height: '100%',
                    width: '75%',
                    animation: 'shimmer 2s ease-in-out infinite'
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div data-animate="" style={{}}>
            <div style={{
              background: '#0F0F0F',
              border: '1px solid #1A1A1A',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #2DD4BF 0%, #0D7377 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '20px',
                color: '#FFF'
              }}>
                3
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
                Customize & Brand
              </h3>
              <p style={{ fontSize: '14px', color: '#999', marginBottom: '24px' }}>
                Adjust colors, fonts, logic, and flows. Full creative control.
              </p>
              <div style={{
                background: '#0A0A0A',
                border: '1px solid #1A1A1A',
                borderRadius: '10px',
                padding: '20px',
                fontSize: '12px'
              }}>
                <div style={{ marginBottom: '8px', color: '#666' }}>Color Picker</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: '#0D7377',
                    borderRadius: '4px'
                  }} />
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: '#2DD4BF',
                    borderRadius: '4px'
                  }} />
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: '#1A1A1A',
                    border: '1px solid #333',
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div data-animate="" style={{}}>
            <div style={{
              background: '#0F0F0F',
              border: '1px solid #1A1A1A',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #2DD4BF 0%, #0D7377 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '20px',
                color: '#FFF'
              }}>
                4
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
                Embed on Squarespace
              </h3>
              <p style={{ fontSize: '14px', color: '#999', marginBottom: '24px' }}>
                Copy the embed code. Paste it into your Squarespace page. Done.
              </p>
              <div style={{
                background: '#0A0A0A',
                border: '1px solid #1A1A1A',
                borderRadius: '10px',
                padding: '16px',
                fontSize: '11px',
                color: '#666',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                &lt;iframe src="..."&gt;&lt;/iframe&gt;
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div data-animate="" style={{}}>
            <div style={{
              background: '#0F0F0F',
              border: '1px solid #1A1A1A',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '24px',
              gridColumn: '1 / -1'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #2DD4BF 0%, #0D7377 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '20px',
                color: '#FFF'
              }}>
                5
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
                Collect Leads & Grow
              </h3>
              <p style={{ fontSize: '14px', color: '#999', marginBottom: '24px' }}>
                Watch leads stream in. See real-time analytics. Export or connect to your email tool.
              </p>
              <div style={{
                background: '#0A0A0A',
                border: '1px solid #1A1A1A',
                borderRadius: '10px',
                padding: '20px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Leads Today</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#2DD4BF' }}>47</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Completion Rate</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>72%</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Avg Time</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>2m 15s</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUIZ EDITOR DEEP DIVE */}
      <section
        id="features"
        data-animate=""
        style={{
          padding: '160px 60px',
          borderTop: '1px solid rgba(26, 26, 26, 0.8)',
          background: 'linear-gradient(180deg, rgba(13, 115, 119, 0.03) 0%, rgba(5, 5, 5, 0) 100%)'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 700,
            marginBottom: '60px'
          }}>
            Full-Featured Quiz Editor
          </h2>

          {/* Full width editor mockup */}
          <div style={{
            background: 'linear-gradient(135deg, #1A1A1A 0%, #0F0F0F 100%)',
            border: '1px solid #2A2A2A',
            borderRadius: '24px',
            padding: '32px',
            marginBottom: '80px',
            boxShadow: '0 30px 80px rgba(45, 212, 191, 0.05)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '220px 1fr 200px',
              gap: '24px',
              minHeight: '500px'
            }}>
              {/* Left sidebar */}
              <div style={{
                background: '#0A0A0A',
                border: '1px solid #1A1A1A',
                borderRadius: '16px',
                padding: '20px',
                overflowY: 'auto'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#666',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Questions
                </div>
                {[1, 2, 3, 4].map(function(i) {
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '12px',
                        background: i === 1 ? '#0D7377' : '#1A1A1A',
                        borderRadius: '8px',
                        fontSize: '12px',
                        marginBottom: '8px',
                        color: i === 1 ? '#FFF' : '#999',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Q{i}: Question
                    </div>
                  )
                })}
                <button style={{
                  width: '100%',
                  padding: '10px',
                  background: '#0D7377',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginTop: '16px',
                  cursor: 'pointer'
                }}>
                  + Add Question
                </button>
              </div>

              {/* Center - Question editor */}
              <div style={{
                background: '#0A0A0A',
                border: '1px solid #1A1A1A',
                borderRadius: '16px',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#666',
                    marginBottom: '8px'
                  }}>
                    Question Text
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your question here"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: '#1A1A1A',
                      border: '1px solid #2A2A2A',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '14px',
                      marginBottom: '24px',
                      fontFamily: "'DM Sans'"
                    }}
                  />

                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#666',
                    marginBottom: '12px'
                  }}>
                    Answer Options
                  </label>
                  {['Option A', 'Option B', 'Option C', 'Option D'].map(function(opt, i) {
                    return (
                      <div key={i} style={{
                        display: 'flex',
                        gap: '12px',
                        marginBottom: '8px',
                        alignItems: 'center'
                      }}>
                        <input
                          type="text"
                          placeholder={opt}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            background: '#1A1A1A',
                            border: '1px solid #2A2A2A',
                            borderRadius: '6px',
                            color: '#FFF',
                            fontSize: '13px',
                            fontFamily: "'DM Sans'"
                          }}
                        />
                        <button style={{
                          padding: '8px 12px',
                          background: 'transparent',
                          border: '1px solid #333',
                          borderRadius: '6px',
                          color: '#666',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}>
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right sidebar - Logic */}
              <div style={{
                background: '#0A0A0A',
                border: '1px solid #1A1A1A',
                borderRadius: '16px',
                padding: '20px'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#666',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Branching Logic
                </div>
                <div style={{
                  padding: '12px',
                  background: '#1A1A1A',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#666',
                  lineHeight: '1.8'
                }}>
                  <div>If Option A:</div>
                  <div style={{ color: '#2DD4BF', marginLeft: '8px', marginTop: '4px' }}>
                    → Score +10
                  </div>
                  <div style={{ color: '#0D7377', marginLeft: '8px', marginTop: '2px' }}>
                    → Go to Q2
                  </div>
                  <div style={{ marginTop: '12px' }}>If Option B:</div>
                  <div style={{ color: '#2DD4BF', marginLeft: '8px', marginTop: '4px' }}>
                    → Score +5
                  </div>
                  <div style={{ color: '#0D7377', marginLeft: '8px', marginTop: '2px' }}>
                    → Go to Q3
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: '24px'
          }}>
            {[
              { icon: '❓', title: 'Question Types', desc: 'Multiple choice, ranking, matrix, open-ended, and more' },
              { icon: '🌳', title: 'Branching Logic', desc: 'Create conditional paths based on answers' },
              { icon: '🎨', title: 'Brand Customization', desc: 'Colors, fonts, logos, and custom CSS' },
              { icon: '👁️', title: 'Preview & Test', desc: 'Test your quiz before publishing' }
            ].map(function(feature, i) {
              return (
                <div
                  key={i}
                  data-animate=""
                  style={{
                    background: '#0F0F0F',
                    border: '1px solid #1A1A1A',
                    borderRadius: '16px',
                    padding: '24px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{
                    fontSize: '32px',
                    marginBottom: '12px'
                  }}>
                    {feature.icon}
                  </div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    marginBottom: '8px'
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    fontSize: '13px',
                    color: '#999'
                  }}>
                    {feature.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ANALYTICS */}
      <section
        data-animate=""
        style={{
          padding: '160px 60px',
          borderTop: '1px solid rgba(26, 26, 26, 0.8)',
          background: 'linear-gradient(180deg, rgba(13, 115, 119, 0.05) 0%, rgba(5, 5, 5, 0) 100%)'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 700,
            marginBottom: '60px'
          }}>
            Real-Time Analytics Dashboard
          </h2>

          <div style={{
            background: 'linear-gradient(135deg, #1A1A1A 0%, #0F0F0F 100%)',
            border: '1px solid #2A2A2A',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 30px 80px rgba(45, 212, 191, 0.05)'
          }}>
            {/* Stats row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: '20px',
              marginBottom: '40px'
            }}>
              {[
                { label: 'Total Responses', value: '12,847' },
                { label: 'Completion Rate', value: '68%' },
                { label: 'Avg Time', value: '2m 24s' },
                { label: 'Leads Captured', value: '8,736' }
              ].map(function(stat, i) {
                return (
                  <div
                    key={i}
                    style={{
                      background: '#0A0A0A',
                      border: '1px solid #1A1A1A',
                      borderRadius: '12px',
                      padding: '20px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '8px'
                    }}>
                      {stat.label}
                    </div>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      color: '#2DD4BF'
                    }}>
                      {stat.value}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Charts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '20px'
            }}>
              {/* Line chart mockup */}
              <div style={{
                background: '#0A0A0A',
                border: '1px solid #1A1A1A',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '16px',
                  color: '#FFF'
                }}>
                  Responses Over Time
                </div>
                <div style={{
                  height: '200px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-around',
                  gap: '8px'
                }}>
                  {[40, 65, 50, 80, 75, 90, 85].map(function(height, i) {
                    return (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: height + '%',
                          background: 'linear-gradient(180deg, #2DD4BF 0%, #0D7377 100%)',
                          borderRadius: '4px',
                          opacity: 0.8
                        }}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Funnel mockup */}
              <div style={{
                background: '#0A0A0A',
                border: '1px solid #1A1A1A',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '16px',
                  color: '#FFF'
                }}>
                  Funnel
                </div>
                {[
                  { label: 'Visited', value: '5,234', width: '100%' },
                  { label: 'Started', value: '3,891', width: '74%' },
                  { label: 'Completed', value: '2,847', width: '54%' }
                ].map(function(step, i) {
                  return (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <div style={{
                        fontSize: '11px',
                        color: '#666',
                        marginBottom: '4px'
                      }}>
                        {step.label} - {step.value}
                      </div>
                      <div style={{
                        width: step.width,
                        height: '8px',
                        background: 'linear-gradient(90deg, #2DD4BF 0%, #0D7377 100%)',
                        borderRadius: '4px'
                      }} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EMAIL AUTOMATION */}
      <section
        data-animate=""
        style={{
          padding: '160px 60px',
          borderTop: '1px solid rgba(26, 26, 26, 0.8)'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 700,
            marginBottom: '60px'
          }}>
            Email Automation Workflows
          </h2>

          <div style={{
            background: 'linear-gradient(135deg, #1A1A1A 0%, #0F0F0F 100%)',
            border: '1px solid #2A2A2A',
            borderRadius: '24px',
            padding: '40px',
            minHeight: '300px',
            position: 'relative',
            boxShadow: '0 30px 80px rgba(45, 212, 191, 0.05)'
          }}>
            {/* Workflow nodes */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              minHeight: '200px',
              position: 'relative'
            }}>
              {/* Trigger node */}
              <div style={{
                background: '#0A0A0A',
                border: '2px solid #0D7377',
                borderRadius: '12px',
                padding: '20px 24px',
                textAlign: 'center',
                width: '140px',
                zIndex: 2
              }}>
                <div style={{
                  fontSize: '28px',
                  marginBottom: '8px'
                }}>
                  🎯
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  Quiz Completed
                </div>
              </div>

              {/* Arrow */}
              <div style={{
                flex: 1,
                height: '2px',
                background: 'linear-gradient(90deg, #0D7377 0%, transparent 100%)',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  right: '-8px',
                  top: '-4px',
                  width: '0',
                  height: '0',
                  borderLeft: '8px solid #0D7377',
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent'
                }} />
              </div>

              {/* Filter node */}
              <div style={{
                background: '#0A0A0A',
                border: '2px solid #0D7377',
                borderRadius: '12px',
                padding: '20px 24px',
                textAlign: 'center',
                width: '140px',
                zIndex: 2
              }}>
                <div style={{
                  fontSize: '28px',
                  marginBottom: '8px'
                }}>
                  🔄
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  Filter by Score
                </div>
              </div>

              {/* Arrow */}
              <div style={{
                flex: 1,
                height: '2px',
                background: 'linear-gradient(90deg, #0D7377 0%, transparent 100%)',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  right: '-8px',
                  top: '-4px',
                  width: '0',
                  height: '0',
                  borderLeft: '8px solid #0D7377',
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent'
                }} />
              </div>

              {/* Action node */}
              <div style={{
                background: '#0A0A0A',
                border: '2px solid #2DD4BF',
                borderRadius: '12px',
                padding: '20px 24px',
                textAlign: 'center',
                width: '140px',
                zIndex: 2
              }}>
                <div style={{
                  fontSize: '28px',
                  marginBottom: '8px'
                }}>
                  📧
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  Send Email
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section
        data-animate=""
        style={{
          padding: '160px 60px',
          borderTop: '1px solid rgba(26, 26, 26, 0.8)',
          background: 'linear-gradient(180deg, rgba(13, 115, 119, 0.05) 0%, rgba(5, 5, 5, 0) 100%)'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 700,
            marginBottom: '16px'
          }}>
            Integrations
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#999',
            marginBottom: '60px'
          }}>
            Connect to 50+ tools. Leads automatically sync to your favorite platforms.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px'
          }}>
            {integrationPartners.map(function(partner, i) {
              return (
                <div
                  key={i}
                  data-animate=""
                  style={{
                    background: '#0F0F0F',
                    border: '1px solid #1A1A1A',
                    borderRadius: '16px',
                    padding: '32px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    fontSize: '40px',
                    marginBottom: '12px'
                  }}>
                    {partner.icon}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    {partner.name}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* TEMPLATES */}
      <section
        id="templates"
        data-animate=""
        style={{
          padding: '160px 60px',
          borderTop: '1px solid rgba(26, 26, 26, 0.8)'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 700,
            marginBottom: '60px'
          }}>
            Quiz Templates
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px'
          }}>
            {templates.map(function(template, i) {
              return (
                <div
                  key={i}
                  data-animate=""
                  style={{
                    background: '#0F0F0F',
                    border: '1px solid #1A1A1A',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{
                    background: 'linear-gradient(135deg, #0D7377 0%, #2DD4BF 100%)',
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px'
                  }}>
                    {'📋'}
                  </div>
                  <div style={{
                    padding: '20px'
                  }}>
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      marginBottom: '4px'
                    }}>
                      {template.name}
                    </h3>
                    <p style={{
                      fontSize: '12px',
                      color: '#999',
                      marginBottom: '16px'
                    }}>
                      {template.description || 'Pre-built quiz template'}
                    </p>
                    <button style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#0D7377',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}>
                      Use Template
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section
        data-animate=""
        style={{
          padding: '160px 60px',
          borderTop: '1px solid rgba(26, 26, 26, 0.8)',
          background: 'linear-gradient(180deg, rgba(13, 115, 119, 0.05) 0%, rgba(5, 5, 5, 0) 100%)'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 700,
            marginBottom: '60px'
          }}>
            Built for Different Goals
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '40px'
          }}>
            {useCases.map(function(useCase, i) {
              return (
                <div
                  key={i}
                  data-animate=""
                  style={{}}
                >
                  <div style={{
                    background: '#0F0F0F',
                    border: '1px solid #1A1A1A',
                    borderRadius: '16px',
                    padding: '32px',
                    marginBottom: '20px',
                    minHeight: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '60px'
                  }}>
                    {i === 0 ? '👥' : i === 1 ? '📊' : '🎓'}
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    marginBottom: '12px'
                  }}>
                    {useCase.title}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#999',
                    lineHeight: '1.6'
                  }}>
                    {useCase.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        data-animate=""
        style={{
          padding: '160px 60px',
          borderTop: '1px solid rgba(26, 26, 26, 0.8)'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '60px'
          }}>
            <h2 style={{
              fontSize: '48px',
              fontWeight: 700,
              marginBottom: '24px'
            }}>
              Simple, Transparent Pricing
            </h2>
            <p style={{
              fontSize: '18px',
              color: '#999',
              marginBottom: '32px'
            }}>
              Start free. Scale with us. Cancel anytime.
            </p>

            {/* Toggle */}
            <div style={{
              display: 'inline-flex',
              background: '#0F0F0F',
              border: '1px solid #1A1A1A',
              borderRadius: '10px',
              padding: '4px'
            }}>
              <button
                onClick={function() { setIsYearly(false) }}
                style={{
                  padding: '10px 24px',
                  background: !isYearly ? '#0D7377' : 'transparent',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Monthly
              </button>
              <button
                onClick={function() { setIsYearly(true) }}
                style={{
                  padding: '10px 24px',
                  background: isYearly ? '#0D7377' : 'transparent',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Yearly (Save 33%)
              </button>
            </div>
          </div>

          {/* Plans */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '24px'
          }}>
            {pricingPlans.map(function(plan, i) {
              var price = isYearly ? plan.yearlyPrice : plan.monthlyPrice
              return (
                <div
                  key={i}
                  data-animate=""
                  style={{
                    background: plan.highlighted ? 'linear-gradient(135deg, #0D7377 0%, #1A4D4D 100%)' : '#0F0F0F',
                    border: plan.highlighted ? '1px solid #2DD4BF' : '1px solid #1A1A1A',
                    borderRadius: '20px',
                    padding: '32px',
                    position: 'relative',
                    transform: plan.highlighted ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.3s'
                  }}
                >
                  {plan.highlighted && (
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#2DD4BF',
                      color: '#050505',
                      padding: '4px 16px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>
                      MOST POPULAR
                    </div>
                  )}

                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    marginBottom: '8px'
                  }}>
                    {plan.name}
                  </h3>
                  <p style={{
                    fontSize: '13px',
                    color: plan.highlighted ? '#FFFFFF' : '#999',
                    marginBottom: '24px'
                  }}>
                    {plan.description}
                  </p>

                  <div style={{
                    marginBottom: '28px'
                  }}>
                    <div style={{
                      fontSize: '40px',
                      fontWeight: 700,
                      marginBottom: '4px'
                    }}>
                      ${price}<span style={{
                        fontSize: '16px',
                        color: plan.highlighted ? '#FFFFFF' : '#999',
                        fontWeight: 400
                      }}>/mo</span>
                    </div>
                    {isYearly && (
                      <div style={{
                        fontSize: '12px',
                        color: plan.highlighted ? 'rgba(255,255,255,0.7)' : '#666'
                      }}>
                        Billed annually
                      </div>
                    )}
                  </div>

                  <button style={{
                    width: '100%',
                    padding: '12px 24px',
                    background: plan.highlighted ? '#2DD4BF' : '#0D7377',
                    color: plan.highlighted ? '#050505' : '#FFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: '28px',
                    transition: 'all 0.2s'
                  }}>
                    Get Started
                  </button>

                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    {plan.features.map(function(feature, j) {
                      return (
                        <li
                          key={j}
                          style={{
                            fontSize: '13px',
                            color: plan.highlighted ? 'rgba(255,255,255,0.8)' : '#999',
                            marginBottom: '12px',
                            paddingLeft: '24px',
                            position: 'relative'
                          }}
                        >
                          <span style={{
                            position: 'absolute',
                            left: 0,
                            color: plan.highlighted ? '#FFF' : '#2DD4BF'
                          }}>✓</span>
                          {feature}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        data-animate=""
        style={{
          padding: '160px 60px',
          borderTop: '1px solid rgba(26, 26, 26, 0.8)',
          background: 'linear-gradient(180deg, rgba(13, 115, 119, 0.05) 0%, rgba(5, 5, 5, 0) 100%)'
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 700,
            marginBottom: '60px',
            textAlign: 'center'
          }}>
            Frequently Asked Questions
          </h2>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {faqItems.map(function(item, i) {
              var isOpen = openFaq === i
              return (
                <div
                  key={i}
                  className="accordion-item"
                  style={{
                    background: '#0F0F0F',
                    border: '1px solid #1A1A1A',
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={function() {
                      setOpenFaq(isOpen ? null : i)
                    }}
                    style={{
                      width: '100%',
                      padding: '20px 24px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>{item.question}</span>
                    <span style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s',
                      fontSize: '18px'
                    }}>
                      ↓
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{
                      padding: '0 24px 20px',
                      borderTop: '1px solid #1A1A1A',
                      color: '#999',
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}>
                      {item.answer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        data-animate=""
        style={{
          padding: '120px 60px',
          background: 'linear-gradient(135deg, rgba(13, 115, 119, 0.2) 0%, rgba(45, 212, 191, 0.1) 100%)',
          borderTop: '1px solid rgba(26, 26, 26, 0.8)',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 700,
            marginBottom: '24px'
          }}>
            Ready to capture leads?
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#999',
            marginBottom: '48px'
          }}>
            Start building your quiz funnel right now. No credit card required.
          </p>

          <form onSubmit={handleSubmitUrl} style={{
            display: 'flex',
            gap: '12px',
            maxWidth: '500px',
            margin: '0 auto',
            marginBottom: '24px'
          }}>
            <input
              type="text"
              value={url}
              onChange={function(e) { setUrl(e.target.value) }}
              placeholder="https://yoursite.squarespace.com"
              style={{
                flex: 1,
                padding: '14px 20px',
                background: '#0F0F0F',
                border: '1px solid #1A1A1A',
                borderRadius: '10px',
                color: '#FFF',
                fontSize: '14px',
                fontFamily: "'DM Sans'"
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px 32px',
                background: '#2DD4BF',
                color: '#050505',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer'
              }}
            >
              {loading ? 'Generating...' : 'Get Started Free →'}
            </button>
          </form>

          <p style={{
            fontSize: '13px',
            color: '#666'
          }}>
            14-day free trial. Cancel anytime.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: '80px 60px',
        borderTop: '1px solid rgba(26, 26, 26, 0.8)',
        background: 'rgba(5, 5, 5, 0.5)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: '60px',
            marginBottom: '60px'
          }}>
            <div>
              <div style={{
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '12px'
              }}>
                Squarespell
              </div>
              <p style={{
                fontSize: '13px',
                color: '#666',
                lineHeight: '1.8'
              }}>
                The easiest way to build AI-powered quiz funnels on Squarespace. Capture leads. Convert visitors. Grow your business.
              </p>
            </div>

            <div>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#666'
              }}>
                Product
              </div>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {['Features', 'Templates', 'Pricing', 'Security'].map(function(link) {
                  return (
                    <li key={link} style={{
                      fontSize: '13px',
                      color: '#999'
                    }}>
                      <a href="#" style={{ cursor: 'pointer' }}>{link}</a>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#666'
              }}>
                Company
              </div>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {['About', 'Blog', 'Help Center', 'Contact'].map(function(link) {
                  return (
                    <li key={link} style={{
                      fontSize: '13px',
                      color: '#999'
                    }}>
                      <a href="#" style={{ cursor: 'pointer' }}>{link}</a>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#666'
              }}>
                Legal
              </div>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {['Privacy', 'Terms', 'Cookies', 'Compliance'].map(function(link) {
                  return (
                    <li key={link} style={{
                      fontSize: '13px',
                      color: '#999'
                    }}>
                      <a href="#" style={{ cursor: 'pointer' }}>{link}</a>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid rgba(26, 26, 26, 0.8)',
            paddingTop: '40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <p style={{
              fontSize: '13px',
              color: '#666',
              margin: 0
            }}>
              © 2026 Squarespell. All rights reserved.
            </p>
            <div style={{
              display: 'flex',
              gap: '20px'
            }}>
              {['Twitter', 'LinkedIn', 'Instagram'].map(function(social) {
                return (
                  <a
                    key={social}
                    href="#"
                    style={{
                      fontSize: '13px',
                      color: '#666',
                      cursor: 'pointer'
                    }}
                  >
                    {social}
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage


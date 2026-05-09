'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QUIZ_BUILDER_PATH } from '@/lib/urls'
import { QUIZ_TEMPLATE_CATALOG, getTemplateThumbnail, getTemplateQuestionCount } from '@/lib/quiz/templates'

/* ─────────────────────────────────────────────
   Color tokens — matching dashboardColors.ts
   ───────────────────────────────────────────── */
const C = {
  BG: '#FFFFFF',
  SURFACE: '#FFFFFF',
  GRAY_25: '#FCFCFD',
  GRAY_50: '#F9FAFB',
  GRAY_100: '#F2F4F7',
  GRAY_200: '#EAECF0',
  GRAY_300: '#D0D5DD',
  GRAY_400: '#98A2B3',
  GRAY_500: '#667085',
  GRAY_600: '#475467',
  GRAY_700: '#344054',
  GRAY_800: '#182230',
  GRAY_900: '#101828',
  BORDER: '#EAECF0',
  ACCENT: '#0D7377',
  ACCENT_HOVER: '#0B6165',
  ACCENT_LIGHT: '#F0FAFB',
  BRAND_50: '#E0F5F6',
  BRAND_100: '#B3E6E8',
  BRAND_300: '#4DC2C6',
  BRAND_500: '#0D7377',
  BRAND_700: '#094F53',
  SUCCESS: '#027A48',
  SUCCESS_LIGHT: '#ECFDF3',
  SUCCESS_500: '#12B76A',
  WARNING: '#B54708',
  WARNING_LIGHT: '#FFFAEB',
  WARNING_500: '#F79009',
  DANGER: '#B42318',
  ERROR_500: '#F04438',
  PURPLE_500: '#7F56D9',
  PURPLE_100: '#F4EBFF',
  FONT: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  SHADOW_XS: '0px 1px 2px rgba(16, 24, 40, 0.05)',
  SHADOW_SM: '0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)',
  SHADOW_MD: '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)',
  SHADOW_LG: '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
}

/* ─────────────────────────────────────────────
   SVG Icons — matching real app sidebar icons
   ───────────────────────────────────────────── */
const Icons = {
  home: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  analytics: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  ),
  quiz: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
  ),
  templates: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  ),
  edit: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  ),
  leads: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  mail: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  ),
  automation: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  ),
  eye: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  ),
  target: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
  ),
  check: (color = C.ACCENT, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  checkCircle: (color = C.SUCCESS, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ),
  arrowRight: (color = C.ACCENT, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
  ),
  sparkles: (color = C.ACCENT, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>
  ),
  globe: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  ),
  search: (color = C.GRAY_400, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  ),
  bell: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  ),
  send: (color = C.ACCENT, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
  ),
  trendUp: (color = C.SUCCESS, size = 16) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
  ),
  chevronDown: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  ),
  play: (color = C.ACCENT, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill={color}/></svg>
  ),
  layer: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
  ),
  shield: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
  zap: (color = C.ACCENT, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  ),
  link: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
  ),
  users: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  pieChart: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
  ),
  fileText: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  ),
  clock: (color = C.GRAY_500, size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
}

/* ─────────────────────────────────────────────
   Squarespell Logo (matches sidebar icon)
   ───────────────────────────────────────────── */
const Logo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill={C.ACCENT}/>
    <path d="M10 16l4-6 4 6-4 6z" fill="#fff" opacity="0.9"/>
    <path d="M16 10l4 6-4 6" stroke="#fff" strokeWidth="1.5" fill="none"/>
  </svg>
)

export default function LandingPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [isYearly, setIsYearly] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [navScrolled, setNavScrolled] = useState(false)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const newVisible = new Set(visibleItems)
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            newVisible.add(entry.target.id)
            observerRef.current?.unobserve(entry.target)
          }
        })
        setVisibleItems(newVisible)
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    return () => { if (observerRef.current) observerRef.current.disconnect() }
  }, [])

  useEffect(() => {
    if (observerRef.current) {
      document.querySelectorAll('[data-animate]').forEach((el) => {
        observerRef.current?.observe(el)
      })
    }
  }, [])

  useEffect(() => {
    if (visibleItems.size > 0) {
      document.querySelectorAll('[data-animate]').forEach((el) => {
        if (visibleItems.has(el.id)) el.classList.add('visible')
      })
    }
  }, [visibleItems])

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      setLoading(true)
      setTimeout(() => {
        router.push(QUIZ_BUILDER_PATH + '?url=' + encodeURIComponent(url))
      }, 300)
    }
  }

  const faqItems = [
    { question: 'How does Squarespell work with Squarespace?', answer: 'Squarespell generates a quiz embed code that you paste directly into your Squarespace site. No technical knowledge required. The quiz automatically matches your site\'s design, then you can customize every detail.' },
    { question: 'Do I need coding skills?', answer: 'Not at all. Squarespell is built for creators and marketers with no coding experience. Our AI handles the heavy lifting, and our visual editor is drag-and-drop simple.' },
    { question: 'Will the quiz match my design?', answer: 'Yes. Our AI analyzes your Squarespace site\'s colors, typography, and style, then generates a quiz that looks like it was built for you. You can further customize every detail.' },
    { question: 'What happens with captured leads?', answer: 'Leads are stored securely in your Squarespell dashboard. You can export them, connect email tools, or set up automations to nurture them automatically.' },
    { question: 'Can I customize after AI generates?', answer: 'Absolutely. The AI is just a starting point. Edit questions, answers, branching logic, colors, fonts, and scoring rules. Full creative control is yours.' },
    { question: 'Is there a free trial?', answer: 'Yes — 14-day free trial with full Pro features. No credit card required. Your quizzes stay visible after trial, but lead capture pauses until you subscribe.' },
    { question: 'What if I need more leads but not a higher plan?', answer: 'Add-on packs let you buy extra capacity on any paid plan. Lead packs start at $3/mo for 500 extra leads. Email packs start at $3/mo for 1,000 extra emails. No need to upgrade.' },
    { question: 'How is Squarespell different from other quiz tools?', answer: 'Other quiz tools charge $27–75/mo for entry plans with fewer leads. Squarespell starts at $9/mo annual with 1,000 leads, branching logic, and native Squarespace integration. Our AI generates a fully branded quiz from your website URL in under 60 seconds.' },
    { question: 'What integrations are included with Pro?', answer: 'Pro includes Zapier, Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets, and webhooks. Connect your existing marketing stack with zero setup friction.' },
    { question: 'I run an agency. Can I manage multiple client sites?', answer: 'Yes. The Business plan at $29/mo annual includes unlimited quizzes and leads, white-label branding, custom domains, team seats, API access, and a dedicated onboarding call.' },
  ]

  const templates = QUIZ_TEMPLATE_CATALOG.slice(0, 6)

  const pricingPlans = [
    {
      name: 'Core',
      monthlyPrice: 12,
      yearlyPrice: 9,
      description: 'Build real quiz funnels with branching logic, scoring, and scheduling.',
      limits: { quizzes: '5', leads: '1,000/mo', emails: '1,000/mo' },
      features: [
        'AI quiz generation from your URL',
        'Squarespace one-click connect',
        'Remove Squarespell branding',
        'Branching logic & weighted scoring',
        'Quiz scheduling',
        'Standard analytics',
        'Lead dashboard + CSV export',
        'Lead & email add-on packs',
      ],
      cta: 'Start free trial',
    },
    {
      name: 'Pro',
      monthlyPrice: 19,
      yearlyPrice: 16,
      description: 'Full power for serious lead generation — unlimited quizzes, integrations, and A/B testing.',
      limits: { quizzes: 'Unlimited', leads: '3,000/mo', emails: '3,000/mo' },
      features: [
        'Everything in Core',
        'A/B testing',
        'Email sequences',
        'All integrations (Zapier, Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets)',
        'Webhooks',
        'Advanced analytics & drop-off analysis',
        'Custom CSS',
        'Priority email support',
      ],
      cta: 'Start free trial',
      featured: true,
    },
    {
      name: 'Business',
      monthlyPrice: 35,
      yearlyPrice: 29,
      description: 'Unlimited everything with white-label, custom domains, team seats, and API access.',
      limits: { quizzes: 'Unlimited', leads: 'Unlimited', emails: 'Unlimited' },
      features: [
        'Everything in Pro',
        'White-label (your brand on everything)',
        'Custom domain for quizzes',
        'Team seats (3 included, $5/seat extra)',
        'API access',
        'Priority support (email + chat)',
        'Dedicated onboarding call',
        'Unlimited leads & emails',
      ],
      cta: 'Start free trial',
    },
  ]

  const features = [
    { icon: Icons.sparkles(C.ACCENT, 22), title: 'AI Quiz Generation', desc: 'Paste your Squarespace URL — AI analyzes your site and generates a branded quiz in under 60 seconds.' },
    { icon: Icons.globe(C.ACCENT, 22), title: 'Squarespace Native', desc: 'One-click embed that works with every Squarespace template. No plugins, no custom code, no friction.' },
    { icon: Icons.target(C.ACCENT, 22), title: 'Branching Logic', desc: 'Show different questions based on previous answers. Create personalized paths that qualify leads automatically.' },
    { icon: Icons.leads(C.ACCENT, 22), title: 'Lead Scoring', desc: 'Weighted scoring assigns intent labels — high, new, or low. Know exactly which leads to prioritize.' },
    { icon: Icons.mail(C.ACCENT, 22), title: 'Email Campaigns', desc: 'Send broadcasts, automated sequences, and quiz-result emails. Track opens, clicks, and conversions.' },
    { icon: Icons.automation(C.ACCENT, 22), title: 'Smart Automations', desc: 'Trigger emails, tags, and sequences when leads complete quizzes, reach scores, or get tagged.' },
    { icon: Icons.analytics(C.ACCENT, 22), title: 'Deep Analytics', desc: 'Conversion funnels, question drop-off, lead sources, per-quiz performance — all in real time.' },
    { icon: Icons.link(C.ACCENT, 22), title: 'Integrations', desc: 'Zapier, Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets, and webhooks. Connect everything.' },
    { icon: Icons.shield(C.ACCENT, 22), title: 'White-Label & Custom Domains', desc: 'Remove all Squarespell branding. Use your own domain for quizzes. Full agency-ready setup.' },
  ]

  /* ── Reusable Mockup shell (matches real app window) ── */
  const MockupWindow = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: C.BG, border: `1px solid ${C.BORDER}`, borderRadius: 12, overflow: 'hidden', boxShadow: C.SHADOW_LG }}>
      <div style={{ height: 40, background: C.GRAY_50, borderBottom: `1px solid ${C.BORDER}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
        <span style={{ flex: 1, textAlign: 'center', fontSize: 12, color: C.GRAY_500, fontFamily: C.FONT }}>{title}</span>
      </div>
      <div style={{ display: 'flex' }}>
        {children}
      </div>
    </div>
  )

  /* ── Mini sidebar for mockups (matches real app) ── */
  const MockupSidebar = ({ active }: { active: string }) => {
    const items = [
      { label: 'Dashboard', icon: Icons.home, section: 'OVERVIEW' },
      { label: 'Analytics', icon: Icons.analytics, section: null },
      { label: 'All quizzes', icon: Icons.quiz, section: 'QUIZZES' },
      { label: 'Templates', icon: Icons.templates, section: null },
      { label: 'Quiz editor', icon: Icons.edit, section: null },
      { label: 'All leads', icon: Icons.leads, section: 'LEADS' },
      { label: 'Segmentation', icon: Icons.target, section: null },
      { label: 'Email Campaigns', icon: Icons.mail, section: 'ENGAGE' },
      { label: 'Automations', icon: Icons.automation, section: null },
    ]
    return (
      <div style={{ width: 170, borderRight: `1px solid ${C.BORDER}`, padding: '12px 0', flexShrink: 0, background: C.BG }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px 14px', borderBottom: `1px solid ${C.BORDER}`, marginBottom: 8 }}>
          <Logo size={22} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.GRAY_900 }}>Squarespell</span>
        </div>
        {items.map((item, i) => (
          <div key={i}>
            {item.section && <div style={{ fontSize: 10, fontWeight: 600, color: C.GRAY_400, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 14px 4px', marginTop: i > 0 ? 4 : 0 }}>{item.section}</div>}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', margin: '1px 6px', borderRadius: 6,
              background: item.label === active ? C.GRAY_50 : 'transparent',
              cursor: 'pointer',
            }}>
              {item.icon(item.label === active ? C.ACCENT : C.GRAY_500, 15)}
              <span style={{ fontSize: 12, color: item.label === active ? C.GRAY_900 : C.GRAY_600, fontWeight: item.label === active ? 600 : 400 }}>{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  /* ── Stat Card (matches real app) ── */
  const StatCard = ({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) => (
    <div style={{ border: `1px solid ${C.BORDER}`, borderRadius: 10, padding: '14px 16px', background: C.BG, flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: C.GRAY_500, fontWeight: 500 }}>{label}</span>
        <span style={{ opacity: 0.7 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ? C.ACCENT : C.GRAY_900 }}>{value}</div>
    </div>
  )

  return (
    <div style={{ fontFamily: C.FONT, background: C.BG, color: C.GRAY_900, overflowX: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        html { scroll-behavior: smooth; }
        [data-animate] { opacity: 0; transform: translateY(24px); transition: opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1); }
        [data-animate].visible { opacity: 1 !important; transform: translateY(0) !important; }
        .card-hover { transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
        .card-hover:hover { transform: translateY(-3px); box-shadow: ${C.SHADOW_LG}; border-color: ${C.GRAY_300} !important; }
        @media (max-width: 900px) {
          .grid-3 { grid-template-columns: 1fr !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
          .hero-input-row { flex-direction: column !important; }
          .nav-links { display: none !important; }
          .showcase-row { flex-direction: column !important; }
          .showcase-row-reverse { flex-direction: column !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .mockup-sidebar-hide { display: none !important; }
        }
        @media (max-width: 600px) {
          .stats-row { grid-template-columns: 1fr 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ─── NAV ─── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: navScrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(12px)' : 'none',
        borderBottom: navScrolled ? `1px solid ${C.BORDER}` : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px', maxWidth: 1200, margin: '0 auto', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={30} />
            <span style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900 }}>Squarespell</span>
          </div>
          <div className="nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <a href="#product" style={{ textDecoration: 'none', color: C.GRAY_600, fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = C.GRAY_900} onMouseLeave={e => e.currentTarget.style.color = C.GRAY_600}>Product</a>
            <a href="#features" style={{ textDecoration: 'none', color: C.GRAY_600, fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = C.GRAY_900} onMouseLeave={e => e.currentTarget.style.color = C.GRAY_600}>Features</a>
            <a href="#templates" style={{ textDecoration: 'none', color: C.GRAY_600, fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = C.GRAY_900} onMouseLeave={e => e.currentTarget.style.color = C.GRAY_600}>Templates</a>
            <a href="#pricing" style={{ textDecoration: 'none', color: C.GRAY_600, fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = C.GRAY_900} onMouseLeave={e => e.currentTarget.style.color = C.GRAY_600}>Pricing</a>
            <Link href="/sign-in" style={{ textDecoration: 'none', color: C.GRAY_600, fontSize: 14, fontWeight: 500 }}>Log in</Link>
            <Link href="/sign-up" style={{ textDecoration: 'none', background: C.ACCENT, color: '#fff', padding: '9px 22px', borderRadius: 8, fontWeight: 600, fontSize: 14, transition: 'background 0.2s' }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = C.ACCENT_HOVER)}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = C.ACCENT)}>Start Free</Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '130px 40px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: C.ACCENT_LIGHT, border: `1px solid ${C.BRAND_50}`, borderRadius: 100, fontSize: 13, color: C.ACCENT, fontWeight: 600, marginBottom: 28 }}>
          {Icons.sparkles(C.ACCENT, 16)}
          Built for Squarespace creators
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 54px)', lineHeight: 1.15, marginBottom: 20, fontWeight: 700, letterSpacing: '-0.02em', color: C.GRAY_900 }}>
          Turn Your Squarespace Site<br />Into a <span style={{ color: C.ACCENT }}>Lead Machine</span>
        </h1>
        <p style={{ fontSize: 'clamp(16px, 2vw, 18px)', color: C.GRAY_500, marginBottom: 40, maxWidth: 580, margin: '0 auto 40px', lineHeight: 1.65 }}>
          AI-powered quizzes that match your brand perfectly. Generate leads, qualify visitors, and sell more — all without leaving Squarespace.
        </p>
        <form onSubmit={handleSubmitUrl} style={{ maxWidth: 520, margin: '0 auto 16px' }}>
          <div className="hero-input-row" style={{ display: 'flex', gap: 10 }}>
            <input
              type="url" placeholder="Paste your Squarespace URL..." value={url} onChange={e => setUrl(e.target.value)}
              style={{ flex: 1, padding: '14px 16px', background: C.BG, border: `1px solid ${C.GRAY_300}`, borderRadius: 8, color: C.GRAY_900, fontSize: 15, outline: 'none', transition: 'border-color 0.2s', fontFamily: C.FONT }}
              onFocus={e => e.currentTarget.style.borderColor = C.ACCENT}
              onBlur={e => e.currentTarget.style.borderColor = C.GRAY_300}
            />
            <button type="submit" disabled={loading} style={{ padding: '14px 28px', background: C.ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap', transition: 'background 0.2s', fontFamily: C.FONT }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = C.ACCENT_HOVER)}
              onMouseLeave={e => (e.currentTarget.style.background = C.ACCENT)}>
              {loading ? 'Creating...' : 'Create Quiz →'}
            </button>
          </div>
        </form>
        <p style={{ fontSize: 13, color: C.GRAY_400 }}>14-day free trial · No credit card required</p>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 60px' }}>
        <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, borderTop: `1px solid ${C.BORDER}`, borderBottom: `1px solid ${C.BORDER}`, padding: '32px 0' }}>
          {[
            { val: '45K+', label: 'Quizzes created' },
            { val: '2.3M', label: 'Leads captured' },
            { val: '24.4%', label: 'Avg conversion rate' },
            { val: '<60s', label: 'AI quiz generation' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.GRAY_900, marginBottom: 4 }}>{s.val}</div>
              <div style={{ color: C.GRAY_500, fontSize: 13 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PRODUCT SHOWCASE: 6 REAL APP MOCKUPS ─── */}
      <section id="product" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 700, marginBottom: 14, letterSpacing: '-0.02em', color: C.GRAY_900 }}>Your complete quiz funnel platform</h2>
          <p style={{ color: C.GRAY_500, fontSize: 17, maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>From AI generation to lead nurturing — everything you need in one dashboard</p>
        </div>

        {/* ── Mockup 1: Dashboard Overview ── */}
        <div data-animate id="mockup-dashboard" style={{ marginBottom: 80 }}>
          <div className="showcase-row" style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ color: C.ACCENT, fontSize: 13, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dashboard</div>
              <h3 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14, color: C.GRAY_900 }}>Real-time performance at a glance</h3>
              <p style={{ color: C.GRAY_500, lineHeight: 1.7, fontSize: 15, marginBottom: 20 }}>5 KPI stat cards, conversion funnel, lead sources, per-quiz breakdown, and recent activity — all powered by live data with date-range filtering.</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Views, starts, completions & leads', 'Conversion funnel visualization', 'Lead source attribution', 'Question drop-off analysis'].map((t, i) => (
                  <li key={i} style={{ padding: '6px 0', color: C.GRAY_700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {Icons.check(C.ACCENT, 18)} {t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 560px' }}>
              <MockupWindow title="app.squarespell.com/dashboard">
                <div className="mockup-sidebar-hide"><MockupSidebar active="Dashboard" /></div>
                <div style={{ flex: 1, padding: 18, background: C.GRAY_25, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900 }}>Welcome back</div>
                      <div style={{ fontSize: 11, color: C.GRAY_500 }}>Here&apos;s what&apos;s happening with your quizzes today.</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['7d', '30d', '90d'].map(d => (
                        <span key={d} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: d === '30d' ? C.ACCENT : C.BG, color: d === '30d' ? '#fff' : C.GRAY_500, border: `1px solid ${d === '30d' ? C.ACCENT : C.BORDER}`, cursor: 'pointer' }}>{d}</span>
                      ))}
                    </div>
                  </div>
                  {/* Stat cards row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
                    {[
                      { l: 'Total views', v: '8,432', icon: Icons.eye(C.ACCENT, 14) },
                      { l: 'Leads captured', v: '1,841', icon: Icons.leads(C.ACCENT, 14) },
                      { l: 'Completion rate', v: '55.6%', icon: Icons.checkCircle(C.SUCCESS, 14) },
                      { l: 'Lead rate', v: '24.4%', icon: Icons.trendUp(C.ACCENT, 14) },
                      { l: 'Active quizzes', v: '3', icon: Icons.zap(C.ACCENT, 14) },
                    ].map((s, i) => (
                      <div key={i} style={{ border: `1px solid ${C.BORDER}`, borderRadius: 8, padding: '10px 10px', background: C.BG }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: C.GRAY_500 }}>{s.l}</span>
                          {s.icon}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900 }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Bottom row: Chart area + funnel + lead sources */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 8 }}>
                    {/* Mini chart area */}
                    <div style={{ border: `1px solid ${C.BORDER}`, borderRadius: 8, padding: 12, background: C.BG }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.GRAY_700 }}>Performance overview</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span style={{ fontSize: 9, color: C.ACCENT, display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ACCENT, display: 'inline-block' }}></span> Views</span>
                          <span style={{ fontSize: 9, color: C.GRAY_400, display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.GRAY_300, display: 'inline-block' }}></span> Leads</span>
                        </div>
                      </div>
                      <svg viewBox="0 0 200 60" style={{ width: '100%', height: 48 }}>
                        <polyline points="0,50 30,35 60,20 90,15 120,25 150,30 200,35" fill="none" stroke={C.ACCENT} strokeWidth="2" />
                        <polyline points="0,55 30,52 60,48 90,50 120,52 150,53 200,54" fill="none" stroke={C.GRAY_300} strokeWidth="1.5" strokeDasharray="3,3" />
                        {[{ x: 0, y: 50 }, { x: 30, y: 35 }, { x: 60, y: 20 }, { x: 90, y: 15 }, { x: 120, y: 25 }, { x: 150, y: 30 }, { x: 200, y: 35 }].map((p, i) => (
                          <circle key={i} cx={p.x} cy={p.y} r="3" fill={C.ACCENT} />
                        ))}
                      </svg>
                    </div>
                    {/* Conversion funnel */}
                    <div style={{ border: `1px solid ${C.BORDER}`, borderRadius: 8, padding: 12, background: C.BG }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.GRAY_700, marginBottom: 8 }}>Conversion funnel</div>
                      {[
                        { l: 'Views', v: '8,432', w: '100%', c: C.ACCENT },
                        { l: 'Started', v: '4,694', w: '56%', c: C.BRAND_300 },
                        { l: 'Completed', v: '4,688', w: '55%', c: '#F79009' },
                        { l: 'Leads', v: '1,841', w: '22%', c: C.SUCCESS_500 },
                      ].map((f, i) => (
                        <div key={i} style={{ marginBottom: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.GRAY_500, marginBottom: 2 }}>
                            <span>{f.l}</span><span style={{ fontWeight: 600, color: C.GRAY_700 }}>{f.v}</span>
                          </div>
                          <div style={{ height: 6, background: C.GRAY_100, borderRadius: 3 }}>
                            <div style={{ height: '100%', width: f.w, background: f.c, borderRadius: 3, transition: 'width 1s ease' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Lead sources */}
                    <div style={{ border: `1px solid ${C.BORDER}`, borderRadius: 8, padding: 12, background: C.BG }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.GRAY_700, marginBottom: 8 }}>Lead sources</div>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                        <svg viewBox="0 0 80 80" width={56} height={56}>
                          <circle cx="40" cy="40" r="30" fill="none" stroke={C.GRAY_100} strokeWidth="8" />
                          <circle cx="40" cy="40" r="30" fill="none" stroke={C.ACCENT} strokeWidth="8" strokeDasharray="85 189" strokeDashoffset="0" transform="rotate(-90 40 40)" />
                          <circle cx="40" cy="40" r="30" fill="none" stroke={C.BRAND_300} strokeWidth="8" strokeDasharray="47 189" strokeDashoffset="-85" transform="rotate(-90 40 40)" />
                          <circle cx="40" cy="40" r="30" fill="none" stroke={C.WARNING_500} strokeWidth="8" strokeDasharray="38 189" strokeDashoffset="-132" transform="rotate(-90 40 40)" />
                          <text x="40" y="38" textAnchor="middle" fontSize="12" fontWeight="700" fill={C.GRAY_900}>1,841</text>
                          <text x="40" y="48" textAnchor="middle" fontSize="7" fill={C.GRAY_500}>Total</text>
                        </svg>
                      </div>
                      {[
                        { label: 'Direct', pct: '45%', color: C.ACCENT },
                        { label: 'Social', pct: '25%', color: C.BRAND_300 },
                        { label: 'Organic', pct: '20%', color: C.WARNING_500 },
                      ].map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, fontSize: 10 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                          <span style={{ color: C.GRAY_600, flex: 1 }}>{s.label}</span>
                          <span style={{ color: C.GRAY_500, fontWeight: 600 }}>{s.pct}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </MockupWindow>
            </div>
          </div>
        </div>

        {/* ── Mockup 2: Quiz Editor ── */}
        <div data-animate id="mockup-editor" style={{ marginBottom: 80 }}>
          <div className="showcase-row-reverse" style={{ display: 'flex', gap: 48, alignItems: 'center', flexDirection: 'row-reverse' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ color: C.ACCENT, fontSize: 13, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quiz Editor</div>
              <h3 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14, color: C.GRAY_900 }}>Visual drag-and-drop builder</h3>
              <p style={{ color: C.GRAY_500, lineHeight: 1.7, fontSize: 15, marginBottom: 20 }}>Image choices, branching logic, weighted scoring, and lead gates. Build quizzes that feel native to your brand with real-time preview.</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Image choice questions with Unsplash', 'Branching logic paths', 'Weighted scoring per answer', 'Lead capture gate before results'].map((t, i) => (
                  <li key={i} style={{ padding: '6px 0', color: C.GRAY_700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {Icons.check(C.ACCENT, 18)} {t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 560px' }}>
              <MockupWindow title="Quiz Editor — Photography Style Quiz">
                <div className="mockup-sidebar-hide"><MockupSidebar active="Quiz editor" /></div>
                <div style={{ flex: 1, padding: 18, background: C.GRAY_25, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {/* Question area */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.GRAY_900, marginBottom: 12 }}>What&apos;s your photography style?</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { label: 'Light & Airy', bg: '#E8F0FE', border: C.ACCENT },
                          { label: 'Bold & Dramatic', bg: '#FEE8E8', border: 'transparent' },
                          { label: 'Warm & Vintage', bg: '#FEF3E0', border: 'transparent' },
                          { label: 'Classic & Timeless', bg: '#E8FEE8', border: 'transparent' },
                        ].map((opt, i) => (
                          <div key={i} style={{ background: opt.bg, border: i === 0 ? `2px solid ${C.ACCENT}` : `1px solid ${C.BORDER}`, borderRadius: 8, padding: '20px 10px', textAlign: 'center', cursor: 'pointer' }}>
                            <div style={{ width: '100%', height: 32, background: `linear-gradient(135deg, ${opt.bg}, ${C.GRAY_100})`, borderRadius: 4, marginBottom: 6 }} />
                            <div style={{ fontSize: 11, fontWeight: 600, color: C.GRAY_700 }}>{opt.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Settings panel */}
                    <div style={{ width: 130, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.GRAY_500, marginBottom: 8 }}>Question Settings</div>
                      {[
                        { l: 'Type', v: 'Image Choice', c: C.GRAY_700 },
                        { l: 'Logic', v: 'Branching ON', c: C.ACCENT },
                        { l: 'Scoring', v: 'Weighted', c: '#F79009' },
                        { l: 'Required', v: 'Yes', c: C.SUCCESS },
                      ].map((s, i) => (
                        <div key={i} style={{ background: C.BG, border: `1px solid ${C.BORDER}`, borderRadius: 6, padding: '6px 8px', fontSize: 10, marginBottom: 5 }}>
                          <div style={{ color: C.GRAY_400, marginBottom: 1 }}>{s.l}</div>
                          <div style={{ color: s.c, fontWeight: 600 }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Question tabs at bottom */}
                  <div style={{ display: 'flex', gap: 5, marginTop: 12, fontSize: 10 }}>
                    {['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Lead Gate', 'Results'].map((q, i) => (
                      <div key={i} style={{ padding: '4px 10px', borderRadius: 5, background: i === 0 ? C.ACCENT : C.BG, color: i === 0 ? '#fff' : C.GRAY_500, fontWeight: 600, border: `1px solid ${i === 0 ? C.ACCENT : C.BORDER}` }}>{q}</div>
                    ))}
                  </div>
                </div>
              </MockupWindow>
            </div>
          </div>
        </div>

        {/* ── Mockup 3: Leads Dashboard ── */}
        <div data-animate id="mockup-leads" style={{ marginBottom: 80 }}>
          <div className="showcase-row" style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ color: C.ACCENT, fontSize: 13, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads</div>
              <h3 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14, color: C.GRAY_900 }}>Every lead, scored and segmented</h3>
              <p style={{ color: C.GRAY_500, lineHeight: 1.7, fontSize: 15, marginBottom: 20 }}>See every quiz response with lead scores, intent labels, and full answer history. Filter by quiz, search by name or email, export to CSV.</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Lead scoring with intent labels', 'Full answer history per lead', 'Filter by quiz, date, intent', 'One-click CSV export'].map((t, i) => (
                  <li key={i} style={{ padding: '6px 0', color: C.GRAY_700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {Icons.check(C.ACCENT, 18)} {t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 560px' }}>
              <MockupWindow title="app.squarespell.com/dashboard/leads">
                <div className="mockup-sidebar-hide"><MockupSidebar active="All leads" /></div>
                <div style={{ flex: 1, padding: 18, background: C.GRAY_25, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900 }}>Leads</div>
                      <div style={{ fontSize: 11, color: C.GRAY_500 }}>Track and manage people who completed your quizzes</div>
                    </div>
                    <div style={{ background: C.BG, border: `1px solid ${C.BORDER}`, padding: '5px 12px', borderRadius: 6, fontSize: 11, color: C.GRAY_600, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {Icons.fileText(C.GRAY_400, 13)} Export CSV
                    </div>
                  </div>
                  {/* Stat cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                    {[
                      { l: 'Total Leads', v: '1,841', icon: Icons.leads(C.ACCENT, 14) },
                      { l: 'New This Week', v: '47', icon: Icons.trendUp(C.ACCENT, 12) },
                      { l: 'Quizzes with Leads', v: '3', icon: Icons.quiz(C.ACCENT, 14) },
                      { l: 'High Intent Leads', v: '842', icon: Icons.target(C.ERROR_500, 14) },
                    ].map((s, i) => (
                      <div key={i} style={{ border: `1px solid ${C.BORDER}`, borderRadius: 8, padding: '8px 10px', background: C.BG }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: C.GRAY_500 }}>{s.l}</span>
                          {s.icon}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900 }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Filter pills */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    {[
                      { l: 'All', n: '1,841', active: true },
                      { l: 'High intent', n: '842', active: false },
                      { l: 'New', n: '47', active: false },
                      { l: 'Low score', n: '203', active: false },
                    ].map((f, i) => (
                      <div key={i} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: f.active ? C.ACCENT : C.BG, color: f.active ? '#fff' : C.GRAY_600, border: `1px solid ${f.active ? C.ACCENT : C.BORDER}` }}>{f.l} {f.n}</div>
                    ))}
                  </div>
                  {/* Lead cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { name: 'Sarah Chen', email: 'sarah@design.com', score: 88, intent: 'High intent', color: '#0D7377' },
                      { name: 'Mark Rivera', email: 'mark@studio.co', score: 65, intent: 'New', color: '#6366f1' },
                      { name: 'Ali Hassan', email: 'ali@photo.io', score: 78, intent: 'High intent', color: '#ec4899' },
                    ].map((lead, i) => (
                      <div key={i} style={{ border: `1px solid ${C.BORDER}`, borderRadius: 8, padding: 10, background: C.BG }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: lead.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{lead.name.split(' ').map(n => n[0]).join('')}</div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: C.GRAY_900 }}>{lead.name}</div>
                            <div style={{ fontSize: 9, color: C.GRAY_400 }}>{lead.email}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.GRAY_900 }}>{lead.score}/100</span>
                          <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: lead.intent === 'High intent' ? '#FEF3F2' : C.SUCCESS_LIGHT, color: lead.intent === 'High intent' ? C.ERROR_500 : C.SUCCESS }}>{lead.intent === 'High intent' ? '● High intent' : '● New'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </MockupWindow>
            </div>
          </div>
        </div>

        {/* ── Mockup 4: Email Campaigns ── */}
        <div data-animate id="mockup-emails" style={{ marginBottom: 80 }}>
          <div className="showcase-row-reverse" style={{ display: 'flex', gap: 48, alignItems: 'center', flexDirection: 'row-reverse' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ color: C.ACCENT, fontSize: 13, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Campaigns</div>
              <h3 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14, color: C.GRAY_900 }}>Send emails that convert</h3>
              <p style={{ color: C.GRAY_500, lineHeight: 1.7, fontSize: 15, marginBottom: 20 }}>Broadcast campaigns, automated sequences, and quiz-result emails. Track opens, clicks, and conversions with built-in analytics.</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Broadcast & automated sequences', 'Quiz-result triggered emails', 'Open & click tracking', 'Per-recipient engagement timeline'].map((t, i) => (
                  <li key={i} style={{ padding: '6px 0', color: C.GRAY_700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {Icons.check(C.ACCENT, 18)} {t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 560px' }}>
              <MockupWindow title="app.squarespell.com/dashboard/emails">
                <div className="mockup-sidebar-hide"><MockupSidebar active="Email Campaigns" /></div>
                <div style={{ flex: 1, padding: 18, background: C.GRAY_25, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900 }}>Email Campaigns</div>
                      <div style={{ fontSize: 11, color: C.GRAY_500 }}>Send campaigns and automations to your leads.</div>
                    </div>
                    <div style={{ background: C.ACCENT, color: '#fff', padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>+ Create Campaign</div>
                  </div>
                  {/* Stat cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                    {[
                      { l: 'Emails Sent', v: '2,340', icon: Icons.send(C.ACCENT, 14) },
                      { l: 'Average Open Rate', v: '68%', icon: Icons.mail(C.WARNING_500, 14) },
                      { l: 'Best Performing', v: 'Welcome Seq.', icon: Icons.target('#F04438', 14) },
                    ].map((s, i) => (
                      <div key={i} style={{ border: `1px solid ${C.BORDER}`, borderRadius: 8, padding: '10px 10px', background: C.BG }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: C.GRAY_500 }}>{s.l}</span>
                          {s.icon}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900 }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Filter tabs */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                    {['All', 'Draft', 'Live', 'Automations'].map((t, i) => (
                      <span key={t} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: i === 0 ? C.ACCENT : C.BG, color: i === 0 ? '#fff' : C.GRAY_500, border: `1px solid ${i === 0 ? C.ACCENT : C.BORDER}` }}>{t}</span>
                    ))}
                  </div>
                  {/* Campaign cards */}
                  {[
                    { name: 'Welcome Sequence', type: 'Automation', status: 'Live', sent: 1240, opens: '68%', color: C.PURPLE_500 },
                    { name: 'Photography Results', type: 'Quiz Result Email', status: 'Live', sent: 891, opens: '72%', color: C.ACCENT },
                    { name: 'Spring Promo', type: 'Broadcast', status: 'Draft', sent: 0, opens: '—', color: '#DC6803' },
                  ].map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 2 ? `1px solid ${C.BORDER}` : 'none' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: c.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {c.type === 'Automation' ? Icons.automation(c.color, 14) : c.type === 'Quiz Result Email' ? Icons.pieChart(c.color, 14) : Icons.send(c.color, 14)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.GRAY_900 }}>{c.name}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: c.color + '15', color: c.color, fontWeight: 600 }}>{c.type}</span>
                          <span style={{ fontSize: 9, color: c.status === 'Live' ? C.SUCCESS : C.GRAY_400 }}>● {c.status}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: C.GRAY_500, textAlign: 'right' }}>
                        <div>{c.sent > 0 ? `${c.sent} sent` : '—'}</div>
                        <div style={{ color: C.ACCENT }}>{c.opens} opens</div>
                      </div>
                    </div>
                  ))}
                </div>
              </MockupWindow>
            </div>
          </div>
        </div>

        {/* ── Mockup 5: Automations ── */}
        <div data-animate id="mockup-automations" style={{ marginBottom: 80 }}>
          <div className="showcase-row" style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ color: C.ACCENT, fontSize: 13, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Automations</div>
              <h3 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14, color: C.GRAY_900 }}>Automate your lead nurturing</h3>
              <p style={{ color: C.GRAY_500, lineHeight: 1.7, fontSize: 15, marginBottom: 20 }}>Trigger actions automatically when leads complete quizzes, reach scores, or get tagged. Send emails, add tags, start sequences — all hands-free.</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Quiz completion triggers', 'Score-based automations', 'Tag and segment automatically', 'Email sequence triggers'].map((t, i) => (
                  <li key={i} style={{ padding: '6px 0', color: C.GRAY_700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {Icons.check(C.ACCENT, 18)} {t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 560px' }}>
              <MockupWindow title="app.squarespell.com/dashboard/automations">
                <div className="mockup-sidebar-hide"><MockupSidebar active="Automations" /></div>
                <div style={{ flex: 1, padding: 18, background: C.GRAY_25, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, marginBottom: 4 }}>Automations</div>
                  <div style={{ fontSize: 11, color: C.GRAY_500, marginBottom: 14 }}>Trigger actions automatically when leads complete quizzes, reach scores, or get tagged.</div>
                  {/* Stat cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
                    {[
                      { l: 'Active automations', v: '4', icon: Icons.play(C.PURPLE_500, 14) },
                      { l: 'Emails sent', v: '1,892', icon: Icons.mail(C.ACCENT, 14) },
                      { l: 'Leads in automation', v: '567', icon: Icons.users(C.ACCENT, 14) },
                      { l: 'Time saved', v: '24h', icon: Icons.clock(C.SUCCESS, 14) },
                    ].map((s, i) => (
                      <div key={i} style={{ border: `1px solid ${C.BORDER}`, borderRadius: 8, padding: '8px 10px', background: C.BG }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: C.GRAY_500 }}>{s.l}</span>
                          {s.icon}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900 }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Automation rules */}
                  {[
                    { trigger: 'Quiz completed', action: 'Send welcome email', fires: '1,240', active: true },
                    { trigger: 'Score ≥ 70', action: 'Tag as "High Intent"', fires: '842', active: true },
                    { trigger: 'Lead created', action: 'Start nurture sequence', fires: '567', active: true },
                    { trigger: 'Tag added: VIP', action: 'Notify team via webhook', fires: '89', active: false },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 3 ? `1px solid ${C.BORDER}` : 'none' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: r.active ? C.ACCENT_LIGHT : C.GRAY_50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {Icons.automation(r.active ? C.ACCENT : C.GRAY_400, 14)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.GRAY_900 }}>When: {r.trigger}</div>
                        <div style={{ fontSize: 10, color: C.GRAY_500 }}>Then: {r.action}</div>
                      </div>
                      <div style={{ fontSize: 10, color: C.GRAY_400 }}>{r.fires} fires</div>
                      <div style={{ width: 28, height: 15, borderRadius: 8, background: r.active ? C.ACCENT : C.GRAY_200, position: 'relative', cursor: 'pointer' }}>
                        <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: r.active ? 15 : 2, transition: 'left 0.2s', boxShadow: C.SHADOW_XS }} />
                      </div>
                    </div>
                  ))}
                </div>
              </MockupWindow>
            </div>
          </div>
        </div>

        {/* ── Mockup 6: Analytics ── */}
        <div data-animate id="mockup-analytics" style={{ marginBottom: 80 }}>
          <div className="showcase-row-reverse" style={{ display: 'flex', gap: 48, alignItems: 'center', flexDirection: 'row-reverse' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ color: C.ACCENT, fontSize: 13, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analytics</div>
              <h3 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14, color: C.GRAY_900 }}>Deep insights, zero guesswork</h3>
              <p style={{ color: C.GRAY_500, lineHeight: 1.7, fontSize: 15, marginBottom: 20 }}>Date-range filtering, per-quiz performance tables, completion rates, lead rates, and question drop-off analysis. Know exactly what&apos;s working.</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Per-quiz performance table', 'Date range presets (7d, 30d, 90d, All time)', 'Completion & lead rate tracking', 'View details with drop-off analysis'].map((t, i) => (
                  <li key={i} style={{ padding: '6px 0', color: C.GRAY_700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {Icons.check(C.ACCENT, 18)} {t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 560px' }}>
              <MockupWindow title="app.squarespell.com/dashboard/analytics">
                <div className="mockup-sidebar-hide"><MockupSidebar active="Analytics" /></div>
                <div style={{ flex: 1, padding: 18, background: C.GRAY_25, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900 }}>Analytics</div>
                      <div style={{ fontSize: 11, color: C.GRAY_500 }}>Performance across every quiz you&apos;ve published</div>
                    </div>
                  </div>
                  {/* Date tabs */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                    {['Today', '7 days', '30 days', '90 days', 'All time', 'Custom'].map((d, i) => (
                      <span key={d} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: i === 2 ? C.ACCENT : C.BG, color: i === 2 ? '#fff' : C.GRAY_500, border: `1px solid ${i === 2 ? C.ACCENT : C.BORDER}` }}>{d}</span>
                    ))}
                  </div>
                  {/* Stat cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 12 }}>
                    {[
                      { l: 'Total views', v: '8,432' },
                      { l: 'Completions', v: '4,688' },
                      { l: 'Leads captured', v: '1,841' },
                      { l: 'Completion rate', v: '56%' },
                      { l: 'Lead rate', v: '24%' },
                    ].map((s, i) => (
                      <div key={i} style={{ border: `1px solid ${C.BORDER}`, borderRadius: 6, padding: '8px 8px', background: C.BG }}>
                        <div style={{ fontSize: 9, color: C.GRAY_500, marginBottom: 3 }}>{s.l}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900 }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Quiz table */}
                  <div style={{ border: `1px solid ${C.BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.6fr 0.8fr 0.8fr 0.6fr 1fr 0.8fr', padding: '6px 10px', background: C.GRAY_50, fontSize: 9, fontWeight: 600, color: C.GRAY_500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      <span>Quiz</span><span>Status</span><span>Views</span><span>Completions</span><span>Leads</span><span>Completion Rate</span><span></span>
                    </div>
                    {[
                      { name: 'Photography Style Quiz', status: 'live', views: '6,230', comp: '3,485', leads: '1,523', rate: '57%' },
                      { name: 'Fitness Match Quiz', status: 'live', views: '1,891', comp: '1,052', leads: '284', rate: '56%' },
                      { name: 'Interior Design Quiz', status: 'live', views: '311', comp: '151', leads: '34', rate: '49%' },
                    ].map((q, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 0.6fr 0.8fr 0.8fr 0.6fr 1fr 0.8fr', padding: '8px 10px', borderTop: `1px solid ${C.BORDER}`, fontSize: 11, alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, color: C.GRAY_900 }}>{q.name}</span>
                        <span><span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: C.ACCENT_LIGHT, color: C.ACCENT, fontWeight: 600 }}>{q.status}</span></span>
                        <span style={{ color: C.GRAY_600 }}>{q.views}</span>
                        <span style={{ color: C.GRAY_600 }}>{q.comp}</span>
                        <span style={{ color: C.ACCENT, fontWeight: 600 }}>{q.leads}</span>
                        <span style={{ color: C.GRAY_600 }}>{q.rate}</span>
                        <span style={{ color: C.ACCENT, fontSize: 10, fontWeight: 500, cursor: 'pointer' }}>View details →</span>
                      </div>
                    ))}
                  </div>
                </div>
              </MockupWindow>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 80px' }}>
        <div data-animate id="how-it-works" style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 700, marginBottom: 14, color: C.GRAY_900 }}>Live in 3 steps</h2>
          <p style={{ color: C.GRAY_500, fontSize: 17 }}>From URL to published quiz in under 60 seconds</p>
        </div>
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
          {[
            { step: '1', title: 'Paste your URL', desc: 'Drop your Squarespace site URL. Our AI analyzes your design, colors, typography, and content.', icon: Icons.globe(C.ACCENT, 28) },
            { step: '2', title: 'AI generates your quiz', desc: 'In under 60 seconds, get a fully branded quiz with smart questions, scoring logic, and lead capture.', icon: Icons.sparkles(C.ACCENT, 28) },
            { step: '3', title: 'Embed & collect leads', desc: 'Copy one line of code into Squarespace. Start capturing scored, segmented leads immediately.', icon: Icons.zap(C.ACCENT, 28) },
          ].map((s, i) => (
            <div key={i} data-animate id={`step-${i}`} style={{ textAlign: 'center', padding: 32, borderRadius: 12, border: `1px solid ${C.BORDER}`, background: C.BG }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                {s.icon}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.ACCENT, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step {s.step}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: C.GRAY_900 }}>{s.title}</h3>
              <p style={{ color: C.GRAY_500, fontSize: 14, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section id="features" style={{ background: C.GRAY_50, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 700, marginBottom: 14, color: C.GRAY_900 }}>Everything you need to convert visitors into leads</h2>
            <p style={{ color: C.GRAY_500, fontSize: 17, maxWidth: 540, margin: '0 auto' }}>Quiz creation, lead management, email marketing, automations, and analytics — all in one platform.</p>
          </div>
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {features.map((f, i) => (
              <div key={i} data-animate id={`feat-${i}`} className="card-hover" style={{ padding: 28, borderRadius: 12, border: `1px solid ${C.BORDER}`, background: C.BG, cursor: 'default' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: C.GRAY_900 }}>{f.title}</h3>
                <p style={{ color: C.GRAY_500, fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TEMPLATES ─── */}
      <section id="templates" style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 700, marginBottom: 14, color: C.GRAY_900 }}>Start with a template, make it yours</h2>
          <p style={{ color: C.GRAY_500, fontSize: 17, maxWidth: 540, margin: '0 auto' }}>16 industry-specific templates, all customizable. Pick one and launch in minutes.</p>
        </div>
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {templates.map((t, i) => {
            const thumb = getTemplateThumbnail(t.id)
            const qCount = getTemplateQuestionCount(t.id)
            return (
              <Link key={i} href={QUIZ_BUILDER_PATH + '?template=' + t.id} style={{ textDecoration: 'none' }}>
                <div data-animate id={`tmpl-${i}`} className="card-hover" style={{ borderRadius: 12, border: `1px solid ${C.BORDER}`, overflow: 'hidden', background: C.BG, cursor: 'pointer' }}>
                  <div style={{ height: 160, background: `url(${thumb}) center/cover no-repeat`, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.95)', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: C.GRAY_700, backdropFilter: 'blur(4px)' }}>
                      {t.category}
                    </div>
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: C.GRAY_900 }}>{t.name}</h4>
                    <p style={{ fontSize: 13, color: C.GRAY_500, marginBottom: 10, lineHeight: 1.5 }}>{t.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: C.GRAY_400 }}>{qCount} questions</span>
                      <span style={{ fontSize: 12, color: C.ACCENT, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>Use template {Icons.arrowRight(C.ACCENT, 14)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link href={QUIZ_BUILDER_PATH} style={{ textDecoration: 'none', color: C.ACCENT, fontSize: 15, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            View all 16 templates {Icons.arrowRight(C.ACCENT, 18)}
          </Link>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" style={{ background: C.GRAY_50, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: C.ACCENT_LIGHT, border: `1px solid ${C.BRAND_50}`, borderRadius: 100, fontSize: 12, color: C.ACCENT, fontWeight: 600, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              14-day Pro trial · No credit card
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, marginBottom: 14, color: C.GRAY_900 }}>
              Quiz funnels that fit your<br /><span style={{ color: C.ACCENT }}>Squarespace budget.</span>
            </h2>
            <p style={{ color: C.GRAY_500, fontSize: 17, marginBottom: 8 }}>Full quiz funnels from $9/mo. Competitors charge $27–75 for less.</p>
          </div>
          {/* Trust badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
            {['2,400+ Squarespace owners', 'No credit card required', 'Cancel anytime'].map((b, i) => (
              <span key={i} style={{ fontSize: 14, color: C.GRAY_500, display: 'flex', alignItems: 'center', gap: 6 }}>
                {Icons.check(C.ACCENT, 16)} {b}
              </span>
            ))}
          </div>
          {/* Toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 40 }}>
            <div style={{ display: 'flex', background: C.BG, border: `1px solid ${C.BORDER}`, borderRadius: 10, padding: 4 }}>
              <button onClick={() => setIsYearly(false)} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', background: !isYearly ? C.GRAY_900 : 'transparent', color: !isYearly ? '#fff' : C.GRAY_500, fontFamily: C.FONT, transition: 'all 0.2s' }}>Monthly</button>
              <button onClick={() => setIsYearly(true)} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', background: isYearly ? C.GRAY_900 : 'transparent', color: isYearly ? '#fff' : C.GRAY_500, fontFamily: C.FONT, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
                Annual
                <span style={{ background: C.ACCENT, color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>Save up to 25%</span>
              </button>
            </div>
            {isYearly && <span style={{ color: C.ACCENT, fontSize: 14, fontWeight: 600 }}>Save up to $72/year</span>}
          </div>
          {/* Plan cards */}
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, alignItems: 'start' }}>
            {pricingPlans.map((plan, i) => (
              <div key={i} data-animate id={`plan-${i}`} style={{
                borderRadius: 12, border: plan.featured ? `2px solid ${C.ACCENT}` : `1px solid ${C.BORDER}`,
                background: C.BG, padding: 0, overflow: 'hidden', position: 'relative',
              }}>
                {plan.featured && (
                  <div style={{ background: C.ACCENT, color: '#fff', textAlign: 'center', padding: '8px 0', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Most Popular
                  </div>
                )}
                <div style={{ padding: '28px 28px 24px' }}>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: plan.featured ? C.ACCENT : C.GRAY_900 }}>{plan.name}</h3>
                  <p style={{ fontSize: 14, color: C.GRAY_500, marginBottom: 20, lineHeight: 1.5, minHeight: 42 }}>{plan.description}</p>
                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, color: C.GRAY_400, textDecoration: 'line-through' }}>${isYearly ? plan.monthlyPrice : ''}</span>
                    <span style={{ fontSize: 42, fontWeight: 700, color: C.GRAY_900, letterSpacing: '-0.02em' }}>${isYearly ? plan.yearlyPrice : plan.monthlyPrice}</span>
                    <span style={{ fontSize: 15, color: C.GRAY_500 }}>/mo</span>
                  </div>
                  {isYearly && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: C.GRAY_500 }}>Billed ${isYearly ? plan.yearlyPrice * 12 : plan.monthlyPrice * 12}/year</span>
                    </div>
                  )}
                  {isYearly && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                      {Icons.check(C.ACCENT, 14)}
                      <span style={{ fontSize: 13, color: C.ACCENT, fontWeight: 600 }}>Save ${(plan.monthlyPrice - plan.yearlyPrice) * 12}/year</span>
                    </div>
                  )}
                  {!isYearly && <div style={{ marginBottom: 24 }} />}
                  {/* Limits bar */}
                  <div style={{ display: 'flex', background: C.GRAY_50, borderRadius: 8, padding: '12px 0', marginBottom: 20, border: `1px solid ${C.BORDER}` }}>
                    {Object.entries(plan.limits).map(([key, val], j) => (
                      <div key={j} style={{ flex: 1, textAlign: 'center', borderLeft: j > 0 ? `1px solid ${C.BORDER}` : 'none' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900 }}>{val}</div>
                        <div style={{ fontSize: 10, color: C.GRAY_500, textTransform: 'uppercase', fontWeight: 600 }}>{key}</div>
                      </div>
                    ))}
                  </div>
                  {/* CTA */}
                  <Link href="/sign-up" style={{
                    display: 'block', textAlign: 'center', padding: '13px 0', borderRadius: 8, fontWeight: 600, fontSize: 15, textDecoration: 'none', transition: 'background 0.2s',
                    background: plan.featured ? C.ACCENT : C.BG, color: plan.featured ? '#fff' : C.GRAY_700,
                    border: plan.featured ? 'none' : `1px solid ${C.GRAY_300}`,
                    fontFamily: C.FONT,
                  }}>
                    {plan.cta}
                  </Link>
                  {/* Features */}
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Included</div>
                    {plan.features.map((f, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                        {Icons.check(C.ACCENT, 16)}
                        <span style={{ fontSize: 14, color: C.GRAY_600, lineHeight: 1.4 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '80px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 700, marginBottom: 14, color: C.GRAY_900 }}>Frequently asked questions</h2>
          <p style={{ color: C.GRAY_500, fontSize: 17 }}>Everything you need to know about Squarespell</p>
        </div>
        <div>
          {faqItems.map((faq, i) => (
            <div key={i} data-animate id={`faq-${i}`} style={{ borderBottom: `1px solid ${C.BORDER}` }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', textAlign: 'left', padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: C.FONT,
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 600, color: C.GRAY_900, paddingRight: 24 }}>{faq.question}</span>
                <span style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease', flexShrink: 0 }}>
                  {Icons.chevronDown(C.GRAY_400, 20)}
                </span>
              </button>
              <div style={{
                maxHeight: openFaq === i ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease',
              }}>
                <p style={{ fontSize: 15, color: C.GRAY_500, lineHeight: 1.7, paddingBottom: 20 }}>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section style={{ background: C.GRAY_900, padding: '80px 40px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 700, marginBottom: 16, color: '#fff' }}>Ready to turn visitors into leads?</h2>
          <p style={{ color: C.GRAY_400, fontSize: 17, marginBottom: 32, lineHeight: 1.6 }}>
            Join 2,400+ Squarespace creators using Squarespell to grow their businesses with AI-powered quiz funnels.
          </p>
          <form onSubmit={handleSubmitUrl} style={{ maxWidth: 520, margin: '0 auto 16px' }}>
            <div className="hero-input-row" style={{ display: 'flex', gap: 10 }}>
              <input
                type="url" placeholder="Paste your Squarespace URL..." value={url} onChange={e => setUrl(e.target.value)}
                style={{ flex: 1, padding: '14px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 15, outline: 'none', fontFamily: C.FONT }}
                onFocus={e => e.currentTarget.style.borderColor = C.ACCENT}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
              />
              <button type="submit" disabled={loading} style={{ padding: '14px 28px', background: C.ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap', fontFamily: C.FONT, transition: 'background 0.2s' }}
                onMouseEnter={e => !loading && (e.currentTarget.style.background = C.ACCENT_HOVER)}
                onMouseLeave={e => (e.currentTarget.style.background = C.ACCENT)}>
                {loading ? 'Creating...' : 'Create Quiz →'}
              </button>
            </div>
          </form>
          <p style={{ fontSize: 13, color: C.GRAY_500 }}>14-day free trial · No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: `1px solid ${C.BORDER}`, padding: '48px 40px 32px', background: C.BG }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 40 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Logo size={28} />
                <span style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900 }}>Squarespell</span>
              </div>
              <p style={{ color: C.GRAY_500, fontSize: 14, lineHeight: 1.6, maxWidth: 300 }}>AI-powered quiz funnels built specifically for Squarespace. Generate leads, qualify visitors, and grow your business.</p>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_400, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Product</h4>
              {['Features', 'Templates', 'Pricing', 'Integrations', 'API'].map((l, i) => (
                <a key={i} href={l === 'Features' ? '#features' : l === 'Templates' ? '#templates' : l === 'Pricing' ? '#pricing' : '#'} style={{ display: 'block', color: C.GRAY_600, fontSize: 14, textDecoration: 'none', marginBottom: 10, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = C.GRAY_900} onMouseLeave={e => e.currentTarget.style.color = C.GRAY_600}>{l}</a>
              ))}
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_400, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Resources</h4>
              {['Help Center', 'Blog', 'Changelog', 'Status'].map((l, i) => (
                <a key={i} href="#" style={{ display: 'block', color: C.GRAY_600, fontSize: 14, textDecoration: 'none', marginBottom: 10, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = C.GRAY_900} onMouseLeave={e => e.currentTarget.style.color = C.GRAY_600}>{l}</a>
              ))}
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_400, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Company</h4>
              {['About', 'Privacy', 'Terms', 'Contact'].map((l, i) => (
                <a key={i} href="#" style={{ display: 'block', color: C.GRAY_600, fontSize: 14, textDecoration: 'none', marginBottom: 10, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = C.GRAY_900} onMouseLeave={e => e.currentTarget.style.color = C.GRAY_600}>{l}</a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.BORDER}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ color: C.GRAY_400, fontSize: 13 }}>© {new Date().getFullYear()} Squarespell. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 20 }}>
              <a href="#" style={{ color: C.GRAY_400, fontSize: 13, textDecoration: 'none' }}>Privacy Policy</a>
              <a href="#" style={{ color: C.GRAY_400, fontSize: 13, textDecoration: 'none' }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QUIZ_BUILDER_PATH } from '@/lib/urls'
import { QUIZ_TEMPLATE_CATALOG, getTemplateThumbnail, getTemplateQuestionCount } from '@/lib/quiz/templates'

/* ─────────────────────────────────────────────
   Color tokens (matching dashboardColors.ts)
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
   SVG Icons (stroke-based, consistent style)
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
   Squarespell Logo
   ───────────────────────────────────────────── */
const Logo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill={C.ACCENT}/>
    <path d="M10 16l4-6 4 6-4 6z" fill="#fff" opacity="0.9"/>
    <path d="M16 10l4 6-4 6" stroke="#fff" strokeWidth="1.5" fill="none"/>
  </svg>
)

/* ═════════════════════════════════════════════
   MAIN LANDING PAGE COMPONENT
   ═════════════════════════════════════════════ */
export default function LandingPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [isYearly, setIsYearly] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [navScrolled, setNavScrolled] = useState(false)

  /* Intersection Observer for scroll animations */
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

  /* ── FAQ Data ── */
  const faqItems = [
    { question: 'How does Squarespell work with Squarespace?', answer: 'Squarespell generates a quiz embed code that you paste directly into your Squarespace site. No coding needed. The quiz matches your site design automatically, and you can customize every detail from there.' },
    { question: 'Do I need coding skills?', answer: 'Not at all. Squarespell is built for creators and marketers with no technical background. Our AI does the heavy lifting, and the drag-and-drop editor makes customization simple.' },
    { question: 'Will the quiz match my design?', answer: 'Yes. Our AI analyzes your Squarespace site\'s colors, typography, and style, then generates a quiz that looks like it was built just for your brand. You can further customize every detail.' },
    { question: 'What happens with captured leads?', answer: 'Leads are stored securely in your Squarespell dashboard. You can export them as CSV, connect your favorite email tools, or set up automations to nurture them automatically.' },
    { question: 'Can I customize after AI generates?', answer: 'Absolutely. The AI gives you a strong starting point. From there, edit questions, answers, branching logic, colors, fonts, and scoring rules. You have full creative control.' },
    { question: 'Is there a free trial?', answer: 'Yes. You get a 14-day free trial with full Pro features, no credit card required. Your quizzes stay visible after the trial ends, but lead capture pauses until you subscribe.' },
    { question: 'What if I need more leads but not a higher plan?', answer: 'Add-on packs let you buy extra capacity on any paid plan. Lead packs start at $3/mo for 500 extra leads. Email packs start at $3/mo for 1,000 extra emails. No upgrade required.' },
    { question: 'How is Squarespell different from other quiz tools?', answer: 'Other quiz tools charge $27 to $75/mo for entry plans with fewer leads. Squarespell starts at $9/mo annual with 1,000 leads, branching logic, and native Squarespace integration. Our AI generates a fully branded quiz from your website URL in under 60 seconds.' },
    { question: 'What integrations are included with Pro?', answer: 'Pro includes Zapier, Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets, and webhooks. Connect your existing marketing stack with zero setup friction.' },
    { question: 'I run an agency. Can I manage multiple client sites?', answer: 'Yes. The Business plan at $29/mo annual includes unlimited quizzes and leads, white-label branding, custom domains, team seats, API access, and a dedicated onboarding call.' },
  ]

  const templates = QUIZ_TEMPLATE_CATALOG.slice(0, 6)

  /* ── Pricing Plans ── */
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
      description: 'Full power for serious lead generation. Unlimited quizzes, integrations, and A/B testing.',
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

  /* ── Features Grid Data ── */
  const features = [
    { icon: Icons.sparkles(C.ACCENT, 22), title: 'AI Quiz Generation', desc: 'Paste your Squarespace URL and AI analyzes your site, then generates a branded quiz in under 60 seconds.' },
    { icon: Icons.globe(C.ACCENT, 22), title: 'Squarespace Native', desc: 'One-click embed that works with every Squarespace template. No plugins, no custom code, no friction.' },
    { icon: Icons.target(C.ACCENT, 22), title: 'Branching Logic', desc: 'Show different questions based on previous answers. Create personalized paths that qualify leads automatically.' },
    { icon: Icons.leads(C.ACCENT, 22), title: 'Lead Scoring', desc: 'Weighted scoring assigns intent labels (high, new, or low). Know exactly which leads to prioritize.' },
    { icon: Icons.mail(C.ACCENT, 22), title: 'Email Campaigns', desc: 'Send broadcasts, automated sequences, and quiz-result emails. Track opens, clicks, and conversions.' },
    { icon: Icons.automation(C.ACCENT, 22), title: 'Smart Automations', desc: 'Trigger emails, tags, and sequences when leads complete quizzes, reach scores, or get tagged.' },
    { icon: Icons.analytics(C.ACCENT, 22), title: 'Deep Analytics', desc: 'Conversion funnels, question drop-off, lead sources, per-quiz performance, all in real time.' },
    { icon: Icons.link(C.ACCENT, 22), title: 'Integrations', desc: 'Zapier, Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets, and webhooks. Connect everything.' },
    { icon: Icons.shield(C.ACCENT, 22), title: 'White-Label & Custom Domains', desc: 'Remove all Squarespell branding. Use your own domain for quizzes. Full agency-ready setup.' },
  ]

  /* ── Showcase sections data ── */
  const showcaseSections = [
    {
      badge: 'Command Center',
      heading: 'Your entire quiz funnel at a glance',
      description: 'Real-time stats, performance charts, and conversion funnels. See exactly how your quizzes drive leads and revenue.',
      active: 'Dashboard',
      mockupId: 'dashboard',
    },
    {
      badge: 'Visual Editor',
      heading: 'Build quizzes that feel native to your brand',
      description: 'Image choices, branching logic, weighted scoring, and a live preview. Every question is fully customizable.',
      active: 'Quiz editor',
      mockupId: 'editor',
    },
    {
      badge: 'Lead Management',
      heading: 'Every lead, scored and segmented',
      description: 'See who completed your quiz, their answers, intent scores, and contact info. Filter, sort, and export in one click.',
      active: 'All leads',
      mockupId: 'leads',
    },
    {
      badge: 'Email Campaigns',
      heading: 'Turn quiz takers into paying customers',
      description: 'Send targeted emails based on quiz results. Build welcome sequences, nurture flows, and broadcast campaigns.',
      active: 'Email Campaigns',
      mockupId: 'email',
    },
    {
      badge: 'Automations',
      heading: 'Set it and forget it',
      description: 'Trigger emails and tags automatically when leads take specific actions. Save hours every week on manual follow-up.',
      active: 'Automations',
      mockupId: 'automations',
    },
    {
      badge: 'Analytics',
      heading: 'Data-driven decisions for every quiz',
      description: 'Completion rates, drop-off analysis, lead source tracking, and per-quiz performance breakdowns.',
      active: 'Analytics',
      mockupId: 'analytics',
    },
  ]

  /* ── Reusable: Browser Chrome Mockup Window ── */
  const MockupWindow = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: C.BG, border: `1px solid ${C.GRAY_200}`, borderRadius: 16, overflow: 'hidden', boxShadow: C.SHADOW_LG }}>
      <div style={{ height: 44, background: C.GRAY_50, borderBottom: `1px solid ${C.GRAY_200}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, marginRight: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: C.BG, border: `1px solid ${C.GRAY_200}`, borderRadius: 6, padding: '4px 32px', fontSize: 11, color: C.GRAY_400, fontFamily: C.FONT }}>{title}</div>
        </div>
        <div style={{ width: 60 }} />
      </div>
      <div style={{ display: 'flex', minHeight: 420 }}>
        {children}
      </div>
    </div>
  )

  /* ── Mini sidebar for mockups ── */
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
      <div className="mockup-sidebar-hide" style={{ width: 180, borderRight: `1px solid ${C.GRAY_200}`, padding: '12px 0', flexShrink: 0, background: C.BG }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px 14px', borderBottom: `1px solid ${C.GRAY_200}`, marginBottom: 8 }}>
          <Logo size={22} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.GRAY_900 }}>Squarespell</span>
        </div>
        {items.map((item, i) => (
          <div key={i}>
            {item.section && <div style={{ fontSize: 10, fontWeight: 600, color: C.GRAY_400, textTransform: 'uppercase' as const, letterSpacing: '0.05em', padding: '8px 14px 4px', marginTop: i > 0 ? 4 : 0 }}>{item.section}</div>}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', margin: '1px 6px', borderRadius: 6,
              background: item.label === active ? C.ACCENT_LIGHT : 'transparent',
            }}>
              {item.icon(item.label === active ? C.ACCENT : C.GRAY_500, 15)}
              <span style={{ fontSize: 12, color: item.label === active ? C.ACCENT : C.GRAY_600, fontWeight: item.label === active ? 600 : 400 }}>{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  /* ── Mini Stat Card for mockups ── */
  const MiniStat = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
    <div style={{ border: `1px solid ${C.GRAY_200}`, borderRadius: 10, padding: '12px 14px', background: C.BG, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: C.GRAY_500, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || C.GRAY_900 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.SUCCESS, fontWeight: 500, marginTop: 2 }}>{sub}</div>}
    </div>
  )

  /* ═══════════════════════════════════════════
     MOCKUP CONTENT RENDERERS
     ═══════════════════════════════════════════ */

  const renderDashboardMockup = () => (
    <div style={{ flex: 1, padding: 20, overflow: 'hidden', background: C.GRAY_25 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900 }}>Welcome back</div>
          <div style={{ fontSize: 11, color: C.GRAY_500 }}>May 1 - May 9, 2026</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {Icons.bell(C.GRAY_400, 16)}
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 600 }}>SQ</div>
        </div>
      </div>
      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <MiniStat label="Total views" value="8,432" sub="+12.3%" />
        <MiniStat label="Leads captured" value="1,841" sub="+8.7%" />
        <MiniStat label="Completion rate" value="55.6%" />
        <MiniStat label="Lead rate" value="24.4%" color={C.ACCENT} />
        <MiniStat label="Active quizzes" value="3" />
      </div>
      {/* Charts row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {/* Performance overview (line chart) */}
        <div style={{ flex: 2, border: `1px solid ${C.GRAY_200}`, borderRadius: 10, padding: 14, background: C.BG }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.GRAY_800, marginBottom: 12 }}>Performance overview</div>
          <svg width="100%" height="90" viewBox="0 0 400 90" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.ACCENT} stopOpacity="0.15"/>
                <stop offset="100%" stopColor={C.ACCENT} stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0,70 Q50,55 100,45 T200,30 T300,20 T400,10" fill="none" stroke={C.ACCENT} strokeWidth="2"/>
            <path d="M0,70 Q50,55 100,45 T200,30 T300,20 T400,10 L400,90 L0,90Z" fill="url(#lg)"/>
            <path d="M0,75 Q50,68 100,60 T200,50 T300,42 T400,38" fill="none" stroke={C.BRAND_300} strokeWidth="1.5" strokeDasharray="4 3"/>
          </svg>
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 2, background: C.ACCENT, borderRadius: 1 }}/><span style={{ fontSize: 9, color: C.GRAY_500 }}>Views</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 2, background: C.BRAND_300, borderRadius: 1 }}/><span style={{ fontSize: 9, color: C.GRAY_500 }}>Leads</span></div>
          </div>
        </div>
        {/* Conversion funnel (bars) */}
        <div style={{ flex: 1, border: `1px solid ${C.GRAY_200}`, borderRadius: 10, padding: 14, background: C.BG }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.GRAY_800, marginBottom: 10 }}>Conversion funnel</div>
          {[
            { label: 'Views', val: 100, color: C.GRAY_300 },
            { label: 'Started', val: 72, color: C.BRAND_300 },
            { label: 'Completed', val: 56, color: C.ACCENT },
            { label: 'Leads', val: 24, color: C.SUCCESS_500 },
          ].map((b, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.GRAY_500, marginBottom: 2 }}>
                <span>{b.label}</span><span>{b.val}%</span>
              </div>
              <div style={{ height: 6, background: C.GRAY_100, borderRadius: 3 }}>
                <div style={{ height: 6, background: b.color, borderRadius: 3, width: `${b.val}%` }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Bottom row */}
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Lead sources donut */}
        <div style={{ flex: 1, border: `1px solid ${C.GRAY_200}`, borderRadius: 10, padding: 14, background: C.BG }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.GRAY_800, marginBottom: 8 }}>Lead sources</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="24" fill="none" stroke={C.GRAY_100} strokeWidth="8"/>
              <circle cx="32" cy="32" r="24" fill="none" stroke={C.ACCENT} strokeWidth="8" strokeDasharray="90 150.8" strokeDashoffset="0" transform="rotate(-90 32 32)"/>
              <circle cx="32" cy="32" r="24" fill="none" stroke={C.BRAND_300} strokeWidth="8" strokeDasharray="37.7 203.1" strokeDashoffset="-90" transform="rotate(-90 32 32)"/>
              <circle cx="32" cy="32" r="24" fill="none" stroke={C.WARNING_500} strokeWidth="8" strokeDasharray="22.6 218.2" strokeDashoffset="-127.7" transform="rotate(-90 32 32)"/>
            </svg>
            <div>
              {[
                { label: 'Direct embed', color: C.ACCENT, pct: '60%' },
                { label: 'Social', color: C.BRAND_300, pct: '25%' },
                { label: 'Email', color: C.WARNING_500, pct: '15%' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 2, background: s.color }}/>
                  <span style={{ fontSize: 9, color: C.GRAY_600 }}>{s.label}</span>
                  <span style={{ fontSize: 9, color: C.GRAY_400, marginLeft: 'auto' }}>{s.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Top quizzes */}
        <div style={{ flex: 2, border: `1px solid ${C.GRAY_200}`, borderRadius: 10, padding: 14, background: C.BG }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.GRAY_800, marginBottom: 8 }}>Top quizzes</div>
          {[
            { name: 'Photography Style Quiz', views: '3,291', leads: '814', rate: '24.7%' },
            { name: 'Product Finder Quiz', views: '2,847', leads: '612', rate: '21.5%' },
            { name: 'Wedding Style Quiz', views: '2,294', leads: '415', rate: '18.1%' },
          ].map((q, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 2 ? `1px solid ${C.GRAY_100}` : 'none' }}>
              <span style={{ fontSize: 11, color: C.GRAY_800, fontWeight: 500 }}>{q.name}</span>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 10, color: C.GRAY_500 }}>{q.views} views</span>
                <span style={{ fontSize: 10, color: C.GRAY_500 }}>{q.leads} leads</span>
                <span style={{ fontSize: 10, color: C.ACCENT, fontWeight: 600 }}>{q.rate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderEditorMockup = () => (
    <div style={{ flex: 1, padding: 20, overflow: 'hidden', background: C.GRAY_25 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900 }}>Quiz Editor</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ padding: '5px 14px', border: `1px solid ${C.GRAY_300}`, borderRadius: 6, fontSize: 11, color: C.GRAY_600, fontWeight: 500, background: C.BG }}>Preview</div>
          <div style={{ padding: '5px 14px', background: C.ACCENT, borderRadius: 6, fontSize: 11, color: '#fff', fontWeight: 600 }}>Publish</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        {/* Question area */}
        <div style={{ flex: 2, border: `1px solid ${C.GRAY_200}`, borderRadius: 10, padding: 18, background: C.BG }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.GRAY_400, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }}>Question 1 of 5</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900, marginBottom: 16 }}>What&apos;s your photography style?</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Light & Airy', color: '#E8F4FD', accent: '#5BA4CF' },
              { label: 'Bold & Dramatic', color: '#2D2D2D', accent: '#E85D5D', dark: true },
              { label: 'Warm & Vintage', color: '#FDF0E2', accent: '#D4915E' },
              { label: 'Classic & Timeless', color: '#F0EDE8', accent: '#7C7267' },
            ].map((opt, i) => (
              <div key={i} style={{ border: `2px solid ${i === 0 ? C.ACCENT : C.GRAY_200}`, borderRadius: 10, overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ height: 64, background: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={opt.dark ? '#fff' : opt.accent} strokeWidth="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, color: C.GRAY_800, textAlign: 'center' }}>{opt.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Settings panel */}
        <div style={{ flex: 1, border: `1px solid ${C.GRAY_200}`, borderRadius: 10, padding: 14, background: C.BG }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.GRAY_800, marginBottom: 12 }}>Settings</div>
          {[
            { label: 'Type', value: 'Image Choice' },
            { label: 'Logic', value: 'Branching ON' },
            { label: 'Scoring', value: 'Weighted' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.GRAY_100}` }}>
              <span style={{ fontSize: 11, color: C.GRAY_500 }}>{s.label}</span>
              <span style={{ fontSize: 11, color: C.GRAY_900, fontWeight: 600 }}>{s.value}</span>
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.GRAY_500, marginBottom: 6 }}>Required</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <div style={{ width: 32, height: 18, borderRadius: 9, background: C.ACCENT, padding: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff' }}/>
              </div>
              <span style={{ fontSize: 10, color: C.GRAY_600 }}>Yes</span>
            </div>
          </div>
        </div>
      </div>
      {/* Question tabs at bottom */}
      <div style={{ display: 'flex', gap: 6, marginTop: 14, padding: '10px 0', borderTop: `1px solid ${C.GRAY_200}` }}>
        {['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Lead Gate', 'Results'].map((tab, i) => (
          <div key={i} style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            background: i === 0 ? C.ACCENT : C.GRAY_100,
            color: i === 0 ? '#fff' : C.GRAY_600,
          }}>{tab}</div>
        ))}
      </div>
    </div>
  )

  const renderLeadsMockup = () => (
    <div style={{ flex: 1, padding: 20, overflow: 'hidden', background: C.GRAY_25 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900 }}>Leads</div>
        <div style={{ padding: '6px 14px', border: `1px solid ${C.GRAY_300}`, borderRadius: 6, fontSize: 11, color: C.GRAY_700, fontWeight: 500, background: C.BG }}>Export CSV</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <MiniStat label="Total Leads" value="1,841" sub="+8.7%" />
        <MiniStat label="New This Week" value="47" sub="+23%" />
        <MiniStat label="Quizzes with Leads" value="3" />
        <MiniStat label="High Intent Leads" value="842" color={C.ACCENT} />
      </div>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['All', 'High intent', 'New', 'Low score'].map((f, i) => (
          <div key={i} style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
            background: i === 0 ? C.ACCENT : C.GRAY_100,
            color: i === 0 ? '#fff' : C.GRAY_600,
          }}>{f}</div>
        ))}
      </div>
      {/* Lead cards */}
      {[
        { name: 'Sarah Chen', email: 'sarah@example.com', score: 92, intent: 'High', initials: 'SC', bg: '#E8F4FD' },
        { name: 'Mike Rodriguez', email: 'mike@example.com', score: 87, intent: 'High', initials: 'MR', bg: '#ECFDF3' },
        { name: 'Emily Park', email: 'emily@example.com', score: 74, intent: 'New', initials: 'EP', bg: '#F4EBFF' },
        { name: 'Jake Thompson', email: 'jake@example.com', score: 45, intent: 'Low', initials: 'JT', bg: '#FFF6ED' },
        { name: 'Lisa Wang', email: 'lisa@example.com', score: 91, intent: 'High', initials: 'LW', bg: '#F0FAFB' },
      ].map((l, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: `1px solid ${C.GRAY_200}`, borderRadius: 8, marginBottom: 6, background: C.BG }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: l.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: C.GRAY_700, flexShrink: 0 }}>{l.initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.GRAY_800 }}>{l.name}</div>
            <div style={{ fontSize: 10, color: C.GRAY_500 }}>{l.email}</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.GRAY_900 }}>{l.score}<span style={{ fontSize: 10, fontWeight: 400, color: C.GRAY_400 }}>/100</span></div>
          <div style={{
            padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
            background: l.intent === 'High' ? C.SUCCESS_LIGHT : l.intent === 'New' ? C.PURPLE_100 : C.WARNING_LIGHT,
            color: l.intent === 'High' ? C.SUCCESS : l.intent === 'New' ? C.PURPLE_500 : C.WARNING,
          }}>{l.intent}</div>
        </div>
      ))}
    </div>
  )

  const renderEmailMockup = () => (
    <div style={{ flex: 1, padding: 20, overflow: 'hidden', background: C.GRAY_25 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900 }}>Email Campaigns</div>
        <div style={{ padding: '6px 14px', background: C.ACCENT, borderRadius: 6, fontSize: 11, color: '#fff', fontWeight: 600 }}>+ Create Campaign</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <MiniStat label="Emails Sent" value="2,340" sub="+18%" />
        <MiniStat label="Average Open Rate" value="68%" color={C.ACCENT} />
        <MiniStat label="Best Performing" value="Welcome Seq." />
      </div>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderBottom: `1px solid ${C.GRAY_200}` }}>
        {['All', 'Draft', 'Live', 'Automations'].map((f, i) => (
          <div key={i} style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 500,
            color: i === 0 ? C.ACCENT : C.GRAY_500,
            borderBottom: i === 0 ? `2px solid ${C.ACCENT}` : '2px solid transparent',
          }}>{f}</div>
        ))}
      </div>
      {/* Campaign list */}
      {[
        { name: 'Welcome Sequence', type: 'Automation', status: 'Live', sent: '1,240', open: '72%', typeColor: C.PURPLE_500, typeBg: C.PURPLE_100 },
        { name: 'Quiz Results Follow-up', type: 'Sequence', status: 'Live', sent: '680', open: '65%', typeColor: C.ACCENT, typeBg: C.ACCENT_LIGHT },
        { name: 'Monthly Newsletter', type: 'Broadcast', status: 'Draft', sent: '420', open: '58%', typeColor: C.WARNING_500, typeBg: C.WARNING_LIGHT },
        { name: 'Re-engagement Flow', type: 'Automation', status: 'Live', sent: '312', open: '44%', typeColor: C.PURPLE_500, typeBg: C.PURPLE_100 },
      ].map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px solid ${C.GRAY_200}`, borderRadius: 8, marginBottom: 6, background: C.BG }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_800 }}>{c.name}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, background: c.typeBg, color: c.typeColor }}>{c.type}</span>
              <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, background: c.status === 'Live' ? C.SUCCESS_LIGHT : C.GRAY_100, color: c.status === 'Live' ? C.SUCCESS : C.GRAY_500 }}>{c.status}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.GRAY_800 }}>{c.sent} sent</div>
            <div style={{ fontSize: 10, color: C.GRAY_500 }}>{c.open} open rate</div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderAutomationsMockup = () => (
    <div style={{ flex: 1, padding: 20, overflow: 'hidden', background: C.GRAY_25 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900 }}>Automations</div>
        <div style={{ padding: '6px 14px', background: C.ACCENT, borderRadius: 6, fontSize: 11, color: '#fff', fontWeight: 600 }}>+ New Rule</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <MiniStat label="Active automations" value="4" />
        <MiniStat label="Emails sent" value="1,892" sub="+15%" />
        <MiniStat label="Leads in automation" value="567" />
        <MiniStat label="Time saved" value="24h" color={C.ACCENT} />
      </div>
      {/* Automation rules */}
      {[
        { trigger: 'Quiz completed', action: 'Send welcome email', active: true },
        { trigger: 'High intent score (80+)', action: 'Tag as hot lead + notify', active: true },
        { trigger: 'Lead gate submitted', action: 'Add to nurture sequence', active: true },
        { trigger: 'Quiz abandoned (>50%)', action: 'Send reminder email', active: false },
        { trigger: 'Score changes to high', action: 'Move to priority segment', active: true },
      ].map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px solid ${C.GRAY_200}`, borderRadius: 8, marginBottom: 6, background: C.BG }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {Icons.zap(C.ACCENT, 14)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.GRAY_800 }}>{r.trigger}</div>
            <div style={{ fontSize: 10, color: C.GRAY_500, marginTop: 1 }}>Then: {r.action}</div>
          </div>
          {/* Toggle */}
          <div style={{
            width: 34, height: 18, borderRadius: 9, padding: 2,
            background: r.active ? C.ACCENT : C.GRAY_300,
            display: 'flex', justifyContent: r.active ? 'flex-end' : 'flex-start',
          }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff' }}/>
          </div>
        </div>
      ))}
    </div>
  )

  const renderAnalyticsMockup = () => (
    <div style={{ flex: 1, padding: 20, overflow: 'hidden', background: C.GRAY_25 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900 }}>Analytics</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {Icons.bell(C.GRAY_400, 16)}
        </div>
      </div>
      {/* Date tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 14 }}>
        {['Today', '7d', '30d', '90d', 'All time', 'Custom'].map((d, i) => (
          <div key={i} style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500,
            background: i === 2 ? C.ACCENT : 'transparent',
            color: i === 2 ? '#fff' : C.GRAY_500,
          }}>{d}</div>
        ))}
      </div>
      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <MiniStat label="Total views" value="8,432" sub="+12%" />
        <MiniStat label="Completions" value="4,689" sub="+9%" />
        <MiniStat label="Leads" value="1,841" sub="+8%" />
        <MiniStat label="Completion rate" value="55.6%" />
        <MiniStat label="Avg. time" value="2m 14s" />
      </div>
      {/* Quiz performance table */}
      <div style={{ border: `1px solid ${C.GRAY_200}`, borderRadius: 10, overflow: 'hidden', background: C.BG }}>
        <div style={{ display: 'flex', padding: '10px 14px', background: C.GRAY_50, borderBottom: `1px solid ${C.GRAY_200}` }}>
          {['Quiz', 'Status', 'Views', 'Completions', 'Leads', 'Comp. Rate', ''].map((h, i) => (
            <div key={i} style={{ flex: i === 0 ? 2 : 1, fontSize: 10, fontWeight: 600, color: C.GRAY_500, textTransform: 'uppercase' as const }}>{h}</div>
          ))}
        </div>
        {[
          { name: 'Photography Style Quiz', status: 'Live', views: '3,291', comp: '1,892', leads: '814', rate: '57.5%' },
          { name: 'Product Finder Quiz', status: 'Live', views: '2,847', comp: '1,526', leads: '612', rate: '53.6%' },
          { name: 'Wedding Style Quiz', status: 'Live', views: '2,294', comp: '1,271', leads: '415', rate: '55.4%' },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: i < 2 ? `1px solid ${C.GRAY_100}` : 'none' }}>
            <div style={{ flex: 2, fontSize: 12, fontWeight: 600, color: C.GRAY_800 }}>{row.name}</div>
            <div style={{ flex: 1 }}><span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, background: C.SUCCESS_LIGHT, color: C.SUCCESS }}>{row.status}</span></div>
            <div style={{ flex: 1, fontSize: 11, color: C.GRAY_600 }}>{row.views}</div>
            <div style={{ flex: 1, fontSize: 11, color: C.GRAY_600 }}>{row.comp}</div>
            <div style={{ flex: 1, fontSize: 11, color: C.GRAY_600 }}>{row.leads}</div>
            <div style={{ flex: 1, fontSize: 11, color: C.ACCENT, fontWeight: 600 }}>{row.rate}</div>
            <div style={{ flex: 1, fontSize: 10, color: C.ACCENT, fontWeight: 500, cursor: 'pointer' }}>View details</div>
          </div>
        ))}
      </div>
    </div>
  )

  const mockupRenderers: Record<string, () => React.ReactNode> = {
    dashboard: renderDashboardMockup,
    editor: renderEditorMockup,
    leads: renderLeadsMockup,
    email: renderEmailMockup,
    automations: renderAutomationsMockup,
    analytics: renderAnalyticsMockup,
  }

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div style={{ fontFamily: C.FONT, background: C.BG, color: C.GRAY_900, overflowX: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        html { scroll-behavior: smooth; }
        [data-animate] { opacity: 0; transform: translateY(24px); transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1); }
        [data-animate].visible { opacity: 1 !important; transform: translateY(0) !important; }
        .card-hover { transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: ${C.SHADOW_LG}; border-color: ${C.GRAY_300} !important; }
        .btn-hover:hover { opacity: 0.92; }
        @media (max-width: 900px) {
          .grid-3 { grid-template-columns: 1fr !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
          .hero-input-row { flex-direction: column !important; }
          .nav-links { display: none !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .mockup-sidebar-hide { display: none !important; }
          .stats-row-4 { grid-template-columns: 1fr 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .addon-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .stats-row-4 { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ═══ STICKY NAV ═══ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: navScrolled ? 'rgba(255,255,255,0.96)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: navScrolled ? 'blur(16px)' : 'none',
        borderBottom: navScrolled ? `1px solid ${C.GRAY_200}` : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px', maxWidth: 1200, margin: '0 auto', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={30} />
            <span style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, letterSpacing: '-0.01em' }}>Squarespell</span>
          </div>
          <div className="nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {[
              { href: '#product', label: 'Product' },
              { href: '#features', label: 'Features' },
              { href: '#templates', label: 'Templates' },
              { href: '#pricing', label: 'Pricing' },
            ].map(link => (
              <a key={link.href} href={link.href} style={{ textDecoration: 'none', color: C.GRAY_600, fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = C.GRAY_900}
                onMouseLeave={e => e.currentTarget.style.color = C.GRAY_600}>{link.label}</a>
            ))}
            <Link href="/sign-in" style={{ textDecoration: 'none', color: C.GRAY_600, fontSize: 14, fontWeight: 500 }}>Log in</Link>
            <Link href="/sign-up" style={{
              textDecoration: 'none', background: C.ACCENT, color: '#fff', padding: '9px 22px', borderRadius: 8,
              fontWeight: 600, fontSize: 14, transition: 'background 0.2s',
            }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = C.ACCENT_HOVER)}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = C.ACCENT)}>
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '140px 40px 70px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 18px', background: C.ACCENT_LIGHT, border: `1px solid ${C.BRAND_50}`, borderRadius: 100, fontSize: 13, color: C.ACCENT, fontWeight: 600, marginBottom: 32 }}>
          {Icons.sparkles(C.ACCENT, 16)}
          Built for Squarespace creators
        </div>
        <h1 style={{ fontSize: 'clamp(38px, 5.2vw, 58px)', lineHeight: 1.12, marginBottom: 24, fontWeight: 800, letterSpacing: '-0.025em', color: C.GRAY_900 }}>
          Turn Your Squarespace Site<br />Into a <span style={{ color: C.ACCENT }}>Lead Machine</span>
        </h1>
        <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: C.GRAY_500, marginBottom: 44, maxWidth: 600, margin: '0 auto 44px', lineHeight: 1.65 }}>
          AI-powered quiz funnels that match your brand perfectly. Generate leads, qualify visitors, and grow revenue. All without leaving Squarespace.
        </p>
        <form onSubmit={handleSubmitUrl} style={{ maxWidth: 540, margin: '0 auto 18px' }}>
          <div className="hero-input-row" style={{ display: 'flex', gap: 10 }}>
            <input
              type="url" placeholder="Paste your Squarespace URL..." value={url} onChange={e => setUrl(e.target.value)}
              style={{
                flex: 1, padding: '15px 18px', background: C.BG, border: `1.5px solid ${C.GRAY_300}`, borderRadius: 10,
                color: C.GRAY_900, fontSize: 15, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', fontFamily: C.FONT,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = C.ACCENT; e.currentTarget.style.boxShadow = `0 0 0 3px ${C.BRAND_50}` }}
              onBlur={e => { e.currentTarget.style.borderColor = C.GRAY_300; e.currentTarget.style.boxShadow = 'none' }}
            />
            <button type="submit" disabled={loading} style={{
              padding: '15px 30px', background: C.ACCENT, color: '#fff', border: 'none', borderRadius: 10,
              fontWeight: 600, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              whiteSpace: 'nowrap', transition: 'background 0.2s', fontFamily: C.FONT,
            }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = C.ACCENT_HOVER)}
              onMouseLeave={e => (e.currentTarget.style.background = C.ACCENT)}>
              {loading ? 'Creating...' : 'Create Quiz'}
            </button>
          </div>
        </form>
        <p style={{ fontSize: 13, color: C.GRAY_400 }}>14-day free trial · No credit card required</p>
      </section>

      {/* ═══ SOCIAL PROOF STATS ═══ */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 80px' }}>
        <div id="stats" data-animate className="stats-row-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, border: `1px solid ${C.GRAY_200}`, borderRadius: 16, overflow: 'hidden', background: C.BG }}>
          {[
            { value: '45K+', label: 'Quizzes created', icon: Icons.quiz(C.ACCENT, 20) },
            { value: '2.3M', label: 'Leads captured', icon: Icons.leads(C.ACCENT, 20) },
            { value: '24.4%', label: 'Avg. conversion rate', icon: Icons.target(C.ACCENT, 20) },
            { value: '<60s', label: 'Quiz generation time', icon: Icons.clock(C.ACCENT, 20) },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: '32px 28px', textAlign: 'center',
              borderRight: i < 3 ? `1px solid ${C.GRAY_200}` : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>{stat.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.GRAY_900, letterSpacing: '-0.02em' }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: C.GRAY_500, fontWeight: 500, marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PRODUCT SHOWCASE ═══ */}
      <section id="product" style={{ padding: '40px 0 80px' }}>
        {showcaseSections.map((section, idx) => (
          <div key={idx} id={`showcase-${idx}`} data-animate style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 40px' }}>
            {/* Centered text above */}
            <div style={{ textAlign: 'center', marginBottom: 40, maxWidth: 640, margin: '0 auto 40px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px',
                background: C.ACCENT_LIGHT, borderRadius: 100, fontSize: 12, color: C.ACCENT, fontWeight: 600, marginBottom: 16,
              }}>
                {section.badge}
              </div>
              <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, color: C.GRAY_900, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 14 }}>
                {section.heading}
              </h2>
              <p style={{ fontSize: 17, color: C.GRAY_500, lineHeight: 1.6 }}>
                {section.description}
              </p>
            </div>
            {/* FULL-WIDTH MOCKUP */}
            <div style={{ background: C.GRAY_50, borderRadius: 20, padding: '24px 24px 0', border: `1px solid ${C.GRAY_100}` }}>
              <MockupWindow title={`app.squarespell.com/${section.mockupId}`}>
                <MockupSidebar active={section.active} />
                {mockupRenderers[section.mockupId]()}
              </MockupWindow>
            </div>
          </div>
        ))}
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" style={{ background: C.GRAY_50, padding: '100px 40px', borderTop: `1px solid ${C.GRAY_100}`, borderBottom: `1px solid ${C.GRAY_100}` }}>
        <div id="hiw" data-animate style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', background: C.ACCENT_LIGHT, borderRadius: 100, fontSize: 12, color: C.ACCENT, fontWeight: 600, marginBottom: 16 }}>
            3 Simple Steps
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, color: C.GRAY_900, letterSpacing: '-0.02em', marginBottom: 16 }}>
            From URL to leads in under 60 seconds
          </h2>
          <p style={{ fontSize: 17, color: C.GRAY_500, marginBottom: 56, maxWidth: 560, margin: '0 auto 56px', lineHeight: 1.6 }}>
            No signup forms, no templates to customize from scratch. Just paste your URL and let AI do the work.
          </p>
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { step: '1', icon: Icons.globe(C.ACCENT, 28), title: 'Paste your URL', desc: 'Enter your Squarespace site URL. Our AI analyzes your brand colors, typography, and content in seconds.' },
              { step: '2', icon: Icons.sparkles(C.ACCENT, 28), title: 'AI generates your quiz', desc: 'Get a fully branded quiz funnel with questions, scoring, lead gates, and result pages. Ready to publish.' },
              { step: '3', icon: Icons.send(C.ACCENT, 28), title: 'Embed and collect leads', desc: 'Copy the embed code into Squarespace. Start capturing qualified leads and growing your email list instantly.' },
            ].map((s, i) => (
              <div key={i} style={{
                background: C.BG, border: `1px solid ${C.GRAY_200}`, borderRadius: 16, padding: '40px 28px',
                textAlign: 'center', position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                  width: 28, height: 28, borderRadius: '50%', background: C.ACCENT, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
                }}>{s.step}</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, marginTop: 8 }}>{s.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: C.GRAY_500, lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES GRID ═══ */}
      <section id="features" style={{ padding: '100px 40px' }}>
        <div id="feat" data-animate style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', background: C.ACCENT_LIGHT, borderRadius: 100, fontSize: 12, color: C.ACCENT, fontWeight: 600, marginBottom: 16 }}>
              Everything you need
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, color: C.GRAY_900, letterSpacing: '-0.02em', marginBottom: 14 }}>
              Built for serious lead generation
            </h2>
            <p style={{ fontSize: 17, color: C.GRAY_500, maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
              Every feature is designed to help Squarespace creators convert more visitors into qualified leads.
            </p>
          </div>
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {features.map((f, i) => (
              <div key={i} className="card-hover" style={{
                border: `1px solid ${C.GRAY_200}`, borderRadius: 14, padding: '28px 24px', background: C.BG,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, background: C.ACCENT_LIGHT,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                }}>{f.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 14, color: C.GRAY_500, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TEMPLATES ═══ */}
      <section id="templates" style={{ background: C.GRAY_50, padding: '100px 40px', borderTop: `1px solid ${C.GRAY_100}`, borderBottom: `1px solid ${C.GRAY_100}` }}>
        <div id="tpl" data-animate style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', background: C.ACCENT_LIGHT, borderRadius: 100, fontSize: 12, color: C.ACCENT, fontWeight: 600, marginBottom: 16 }}>
              Ready-to-use
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, color: C.GRAY_900, letterSpacing: '-0.02em', marginBottom: 14 }}>
              Start with a proven template
            </h2>
            <p style={{ fontSize: 17, color: C.GRAY_500, maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
              Industry-specific quiz funnels, pre-built with questions, scoring logic, and result pages. Customize everything.
            </p>
          </div>
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {templates.map((t) => {
              const thumb = getTemplateThumbnail(t.id)
              const qCount = getTemplateQuestionCount(t.id)
              return (
                <Link key={t.id} href={QUIZ_BUILDER_PATH + '?template=' + t.id} style={{ textDecoration: 'none' }}>
                  <div className="card-hover" style={{
                    border: `1px solid ${C.GRAY_200}`, borderRadius: 14, overflow: 'hidden', background: C.BG, cursor: 'pointer',
                  }}>
                    <div style={{
                      height: 180, background: thumb ? `url(${thumb}) center/cover` : `linear-gradient(135deg, ${C.ACCENT_LIGHT}, ${C.BRAND_50})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                    }}>
                      {!thumb && (
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d={t.iconPath || 'M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z'} />
                        </svg>
                      )}
                      <div style={{ position: 'absolute', top: 10, right: 10, padding: '3px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', fontSize: 11, fontWeight: 600, color: C.GRAY_700 }}>
                        {t.category}
                      </div>
                    </div>
                    <div style={{ padding: '18px 20px' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, marginBottom: 6 }}>{t.name}</div>
                      <div style={{ fontSize: 13, color: C.GRAY_500, lineHeight: 1.55, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                        {t.description}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: C.GRAY_400 }}>{qCount} questions</span>
                        <span style={{ fontSize: 13, color: C.ACCENT, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          Use template {Icons.arrowRight(C.ACCENT, 14)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" style={{ padding: '100px 40px' }}>
        <div id="price" data-animate style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', background: C.ACCENT_LIGHT, borderRadius: 100, fontSize: 12, color: C.ACCENT, fontWeight: 600, marginBottom: 16 }}>
              14-DAY PRO TRIAL · NO CREDIT CARD
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, color: C.GRAY_900, letterSpacing: '-0.02em', marginBottom: 14 }}>
              Quiz funnels that fit your Squarespace budget.
            </h2>
            {/* Trust badges */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
              {[
                { icon: Icons.users(C.ACCENT, 16), text: '2,400+ Squarespace owners' },
                { icon: Icons.shield(C.ACCENT, 16), text: 'No credit card required' },
                { icon: Icons.check(C.ACCENT, 16), text: 'Cancel anytime' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.GRAY_500 }}>
                  {b.icon}
                  {b.text}
                </div>
              ))}
            </div>
            {/* Billing toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: isYearly ? 400 : 600, color: isYearly ? C.GRAY_400 : C.GRAY_900 }}>Monthly</span>
              <button onClick={() => setIsYearly(!isYearly)} style={{
                width: 48, height: 26, borderRadius: 13, border: 'none', padding: 3, cursor: 'pointer',
                background: isYearly ? C.ACCENT : C.GRAY_300, transition: 'background 0.2s', position: 'relative',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  transform: isYearly ? 'translateX(22px)' : 'translateX(0)',
                  transition: 'transform 0.2s',
                }}/>
              </button>
              <span style={{ fontSize: 14, fontWeight: isYearly ? 600 : 400, color: isYearly ? C.GRAY_900 : C.GRAY_400 }}>Annual</span>
              {isYearly && (
                <span style={{ padding: '3px 10px', borderRadius: 100, background: C.SUCCESS_LIGHT, color: C.SUCCESS, fontSize: 12, fontWeight: 600 }}>
                  Save up to 25%
                </span>
              )}
            </div>
          </div>

          {/* Plan Cards */}
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
            {pricingPlans.map((plan, i) => {
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice
              const origPrice = plan.monthlyPrice
              const savePct = Math.round((1 - plan.yearlyPrice / plan.monthlyPrice) * 100)
              return (
                <div key={i} style={{
                  border: plan.featured ? `2px solid ${C.ACCENT}` : `1px solid ${C.GRAY_200}`,
                  borderRadius: 16, padding: '32px 28px', background: C.BG, position: 'relative',
                  boxShadow: plan.featured ? C.SHADOW_MD : 'none',
                }}>
                  {plan.featured && (
                    <div style={{
                      position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                      padding: '4px 16px', borderRadius: 100, background: C.ACCENT, color: '#fff',
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                    }}>MOST POPULAR</div>
                  )}
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.GRAY_900, marginBottom: 4 }}>{plan.name}</div>
                  <div style={{ fontSize: 13, color: C.GRAY_500, lineHeight: 1.5, marginBottom: 20, minHeight: 40 }}>{plan.description}</div>
                  <div style={{ marginBottom: 6 }}>
                    {isYearly && <span style={{ fontSize: 16, color: C.GRAY_400, textDecoration: 'line-through', marginRight: 8 }}>${origPrice}</span>}
                    <span style={{ fontSize: 42, fontWeight: 800, color: C.GRAY_900, letterSpacing: '-0.02em' }}>${price}</span>
                    <span style={{ fontSize: 15, color: C.GRAY_500 }}>/mo</span>
                  </div>
                  {isYearly && (
                    <div style={{ fontSize: 12, color: C.SUCCESS, fontWeight: 600, marginBottom: 6 }}>
                      Billed yearly · Save {savePct}%
                    </div>
                  )}
                  {/* Limits bar */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 20, padding: '12px 14px', background: C.GRAY_50, borderRadius: 10 }}>
                    {Object.entries(plan.limits).map(([k, v], j) => (
                      <div key={j} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.GRAY_900 }}>{v}</div>
                        <div style={{ fontSize: 10, color: C.GRAY_500, textTransform: 'capitalize' as const }}>{k}</div>
                      </div>
                    ))}
                  </div>
                  {/* CTA */}
                  <Link href="/sign-up" style={{
                    display: 'block', textAlign: 'center', textDecoration: 'none',
                    padding: '12px 0', borderRadius: 10, fontWeight: 600, fontSize: 14,
                    background: plan.featured ? C.ACCENT : 'transparent',
                    color: plan.featured ? '#fff' : C.ACCENT,
                    border: plan.featured ? 'none' : `1.5px solid ${C.ACCENT}`,
                    transition: 'background 0.2s, opacity 0.2s',
                    marginBottom: 24,
                  }}
                    onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                      if (plan.featured) e.currentTarget.style.background = C.ACCENT_HOVER
                      else e.currentTarget.style.background = C.ACCENT_LIGHT
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                      if (plan.featured) e.currentTarget.style.background = C.ACCENT
                      else e.currentTarget.style.background = 'transparent'
                    }}>
                    {plan.cta}
                  </Link>
                  {/* Feature list */}
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.GRAY_400, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 12 }}>INCLUDED</div>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                      <div style={{ flexShrink: 0, marginTop: 1 }}>{Icons.check(C.ACCENT, 16)}</div>
                      <span style={{ fontSize: 13, color: C.GRAY_600, lineHeight: 1.4 }}>{f}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* ADD-ON PACKS */}
          <div id="addons" data-animate style={{ marginTop: 64, textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', background: C.GRAY_100, borderRadius: 100, fontSize: 12, color: C.GRAY_600, fontWeight: 600, marginBottom: 16 }}>
              ADD-ON PACKS
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: C.GRAY_900, marginBottom: 8 }}>Need more capacity? Add it on.</h3>
            <p style={{ fontSize: 15, color: C.GRAY_500, marginBottom: 36 }}>Available on any paid plan. No upgrade required.</p>
            <div className="addon-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 800, margin: '0 auto' }}>
              {/* Lead Packs */}
              <div style={{ border: `1px solid ${C.GRAY_200}`, borderRadius: 14, padding: '24px', background: C.BG }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, marginBottom: 16 }}>Lead Packs</div>
                {[
                  { amount: '+500 leads', price: '$3/mo' },
                  { amount: '+1,500 leads', price: '$7/mo' },
                  { amount: '+3,000 leads', price: '$12/mo' },
                ].map((p, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: j < 2 ? `1px solid ${C.GRAY_100}` : 'none' }}>
                    <span style={{ fontSize: 14, color: C.GRAY_700 }}>{p.amount}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.ACCENT }}>{p.price}</span>
                  </div>
                ))}
              </div>
              {/* Email Packs */}
              <div style={{ border: `1px solid ${C.GRAY_200}`, borderRadius: 14, padding: '24px', background: C.BG }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, marginBottom: 16 }}>Email Packs</div>
                {[
                  { amount: '+1,000 emails', price: '$3/mo' },
                  { amount: '+5,000 emails', price: '$7/mo' },
                  { amount: '+10,000 emails', price: '$12/mo' },
                ].map((p, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: j < 2 ? `1px solid ${C.GRAY_100}` : 'none' }}>
                    <span style={{ fontSize: 14, color: C.GRAY_700 }}>{p.amount}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.ACCENT }}>{p.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" style={{ background: C.GRAY_50, padding: '100px 40px', borderTop: `1px solid ${C.GRAY_100}` }}>
        <div id="faqsec" data-animate style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 38px)', fontWeight: 800, color: C.GRAY_900, letterSpacing: '-0.02em', marginBottom: 14 }}>
              Frequently asked questions
            </h2>
            <p style={{ fontSize: 16, color: C.GRAY_500 }}>Everything you need to know about Squarespell.</p>
          </div>
          {faqItems.map((faq, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${C.GRAY_200}`, background: C.BG, marginBottom: 0 }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: C.FONT,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color: C.GRAY_900, paddingRight: 16 }}>{faq.question}</span>
                <span style={{
                  flexShrink: 0, transition: 'transform 0.25s',
                  transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>
                  {Icons.chevronDown(C.GRAY_400, 20)}
                </span>
              </button>
              <div style={{
                maxHeight: openFaq === i ? 300 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.3s ease',
              }}>
                <div style={{ padding: '0 24px 20px', fontSize: 14, color: C.GRAY_500, lineHeight: 1.7 }}>
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section style={{ background: C.GRAY_900, padding: '100px 40px' }}>
        <div id="cta" data-animate style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 16 }}>
            Ready to turn visitors into leads?
          </h2>
          <p style={{ fontSize: 17, color: C.GRAY_400, marginBottom: 40, lineHeight: 1.6 }}>
            Paste your Squarespace URL below. Your first quiz is ready in under 60 seconds.
          </p>
          <form onSubmit={handleSubmitUrl} style={{ maxWidth: 520, margin: '0 auto 16px' }}>
            <div className="hero-input-row" style={{ display: 'flex', gap: 10 }}>
              <input
                type="url" placeholder="yoursite.squarespace.com" value={url} onChange={e => setUrl(e.target.value)}
                style={{
                  flex: 1, padding: '15px 18px', background: C.GRAY_800, border: `1.5px solid ${C.GRAY_700}`, borderRadius: 10,
                  color: '#fff', fontSize: 15, outline: 'none', transition: 'border-color 0.2s', fontFamily: C.FONT,
                }}
                onFocus={e => e.currentTarget.style.borderColor = C.ACCENT}
                onBlur={e => e.currentTarget.style.borderColor = C.GRAY_700}
              />
              <button type="submit" disabled={loading} style={{
                padding: '15px 30px', background: C.ACCENT, color: '#fff', border: 'none', borderRadius: 10,
                fontWeight: 600, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                whiteSpace: 'nowrap', transition: 'background 0.2s', fontFamily: C.FONT,
              }}
                onMouseEnter={e => !loading && (e.currentTarget.style.background = C.ACCENT_HOVER)}
                onMouseLeave={e => (e.currentTarget.style.background = C.ACCENT)}>
                {loading ? 'Creating...' : 'Create Quiz'}
              </button>
            </div>
          </form>
          <p style={{ fontSize: 13, color: C.GRAY_500 }}>14-day free trial · No credit card required</p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: `1px solid ${C.GRAY_200}`, padding: '64px 40px 40px', background: C.BG }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Logo size={28} />
                <span style={{ fontSize: 17, fontWeight: 700, color: C.GRAY_900 }}>Squarespell</span>
              </div>
              <p style={{ fontSize: 14, color: C.GRAY_500, lineHeight: 1.6, maxWidth: 280 }}>
                AI-powered quiz funnels built for Squarespace. Generate leads, qualify visitors, and grow your business.
              </p>
            </div>
            {/* Product */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.GRAY_900, marginBottom: 16 }}>Product</div>
              {['Quiz Builder', 'Templates', 'Analytics', 'Integrations', 'Pricing'].map(l => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <a href={l === 'Pricing' ? '#pricing' : l === 'Templates' ? '#templates' : '#product'} style={{ textDecoration: 'none', fontSize: 14, color: C.GRAY_500, transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = C.GRAY_900}
                    onMouseLeave={e => e.currentTarget.style.color = C.GRAY_500}>{l}</a>
                </div>
              ))}
            </div>
            {/* Resources */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.GRAY_900, marginBottom: 16 }}>Resources</div>
              {['Blog', 'Help Center', 'API Docs', 'Changelog', 'Status'].map(l => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <a href="#" style={{ textDecoration: 'none', fontSize: 14, color: C.GRAY_500, transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = C.GRAY_900}
                    onMouseLeave={e => e.currentTarget.style.color = C.GRAY_500}>{l}</a>
                </div>
              ))}
            </div>
            {/* Company */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.GRAY_900, marginBottom: 16 }}>Company</div>
              {['About', 'Privacy', 'Terms', 'Contact'].map(l => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <a href="#" style={{ textDecoration: 'none', fontSize: 14, color: C.GRAY_500, transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = C.GRAY_900}
                    onMouseLeave={e => e.currentTarget.style.color = C.GRAY_500}>{l}</a>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.GRAY_200}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontSize: 13, color: C.GRAY_400 }}>&copy; {new Date().getFullYear()} Squarespell. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 20 }}>
              <a href="#" style={{ textDecoration: 'none', fontSize: 13, color: C.GRAY_400 }}>Privacy</a>
              <a href="#" style={{ textDecoration: 'none', fontSize: 13, color: C.GRAY_400 }}>Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

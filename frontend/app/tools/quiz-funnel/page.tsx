'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QUIZ_BUILDER_PATH } from '@/lib/urls'
import { QUIZ_TEMPLATE_CATALOG, getTemplateThumbnail, getTemplateQuestionCount } from '@/lib/quiz/templates'

/* ================================================================
   COLOR TOKENS - Squarespell brand (light theme)
   ================================================================ */
const C = {
  BG: '#FFFFFF',
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
  ACCENT: '#0D7377',
  ACCENT_HOVER: '#0B6165',
  ACCENT_LIGHT: '#F0FAFB',
  BRAND_50: '#E0F5F6',
  SUCCESS: '#027A48',
  SUCCESS_LIGHT: '#ECFDF3',
  SUCCESS_500: '#12B76A',
  WARNING_500: '#F79009',
  ERROR_500: '#F04438',
  FONT: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  SHADOW_XS: '0px 1px 2px rgba(16, 24, 40, 0.05)',
  SHADOW_SM: '0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)',
  SHADOW_MD: '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)',
  SHADOW_LG: '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
}

/* ================================================================
   LAYOUT CONSTANTS - exact match to reference (saasta.framer.ai)
   Outer wrapper: max-width 1600px, padding 0 135px => content 1170px
   ================================================================ */
const L = {
  MAX_OUTER: 1600,
  PAD_LR: 135,
  CONTENT: 1170,
  NAV_MAX: 1200,
  NAV_H: 80,
  SECTION_PAD: 135,
  SECTION_GAP: 80,
  FEATURE_GAP: 100,
  FEATURE_ROW_GAP: 160,
  CTA_WIDTH: 960,
  CARD_RADIUS: 9,
  CARD_PAD: 24,
}

/* ================================================================
   SIDEBAR + MOCK COMPONENTS for dashboard screenshots
   ================================================================ */
const sidebarSections = [
  { label: 'OVERVIEW', items: ['Dashboard', 'Analytics'] },
  { label: 'QUIZZES', items: ['All quizzes', 'Templates'] },
  { label: 'LEADS', items: ['All leads', 'Segmentation'] },
  { label: 'ENGAGE', items: ['Email Campaigns', 'Automations'] },
]

function MockSidebar({ active }: { active: string }) {
  return (
    <div style={{ width: 190, minWidth: 190, borderRight: `1px solid ${C.GRAY_200}`, padding: '14px 0', background: C.BG, display: 'flex', flexDirection: 'column', fontSize: 11, fontFamily: C.FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px 16px' }}>
        <div style={{ width: 22, height: 22, borderRadius: 5, background: C.ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
        </div>
        <span style={{ fontWeight: 700, color: C.GRAY_900, fontSize: 12 }}>Squarespell</span>
      </div>
      {sidebarSections.map(s => (
        <div key={s.label} style={{ marginBottom: 10 }}>
          <div style={{ padding: '0 14px', marginBottom: 3, fontSize: 9, fontWeight: 600, color: C.GRAY_400, letterSpacing: '0.05em' }}>{s.label}</div>
          {s.items.map(item => (
            <div key={item} style={{ padding: '5px 14px', fontSize: 11, fontWeight: item === active ? 600 : 400, color: item === active ? C.ACCENT : C.GRAY_600, borderLeft: item === active ? `2px solid ${C.ACCENT}` : '2px solid transparent', background: item === active ? C.ACCENT_LIGHT : 'transparent' }}>{item}</div>
          ))}
        </div>
      ))}
    </div>
  )
}

function MockTopBar({ title }: { title?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', borderBottom: `1px solid ${C.GRAY_200}`, background: C.BG }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: `1px solid ${C.GRAY_200}`, fontSize: 11, color: C.GRAY_400, minWidth: 170 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_400} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Search...
      </div>
      {title && <span style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>{title}</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 13, background: C.ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#fff' }}>S</div>
      </div>
    </div>
  )
}

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${C.GRAY_200}`, overflow: 'hidden', background: C.BG, boxShadow: C.SHADOW_LG }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', background: C.GRAY_50, borderBottom: `1px solid ${C.GRAY_200}` }}>
        <div style={{ width: 8, height: 8, borderRadius: 4, background: '#FF5F57' }} />
        <div style={{ width: 8, height: 8, borderRadius: 4, background: '#FFBD2E' }} />
        <div style={{ width: 8, height: 8, borderRadius: 4, background: '#28C840' }} />
        <div style={{ flex: 1, margin: '0 40px', height: 20, borderRadius: 4, background: C.GRAY_100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: C.GRAY_400 }}>app.squarespell.com</div>
      </div>
      {children}
    </div>
  )
}

/* ---- Stat card helper ---- */
function StatCard({ label, value, trend, color }: { label: string; value: string; trend?: string; color?: string }) {
  return (
    <div style={{ flex: 1, padding: '12px 14px', borderRadius: 8, border: `1px solid ${C.GRAY_200}`, background: C.BG }}>
      <div style={{ fontSize: 10, color: C.GRAY_500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900 }}>{value}</div>
      {trend && <div style={{ fontSize: 9, color: color || C.SUCCESS, marginTop: 2 }}>{trend}</div>}
    </div>
  )
}

/* ================================================================
   MOCKUP 1: DASHBOARD
   ================================================================ */
function DashboardMockup() {
  return (
    <BrowserFrame>
      <div style={{ display: 'flex', minHeight: 380, fontFamily: C.FONT }}>
        <MockSidebar active="Dashboard" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MockTopBar />
          <div style={{ padding: 18, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900, marginBottom: 14 }}>Dashboard</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <StatCard label="Total Responses" value="2,847" trend="+12.3% this month" />
              <StatCard label="Completion Rate" value="73.2%" trend="+4.1% vs last month" />
              <StatCard label="Leads Captured" value="1,203" trend="+18.7% this month" />
              <StatCard label="Avg Score" value="68.5" trend="+2.3 pts" />
            </div>
            {/* Chart area */}
            <div style={{ border: `1px solid ${C.GRAY_200}`, borderRadius: 8, padding: '14px', height: 160 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.GRAY_700, marginBottom: 10 }}>Responses Over Time</div>
              <svg width="100%" height="110" viewBox="0 0 500 110" preserveAspectRatio="none">
                <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.ACCENT} stopOpacity="0.15"/><stop offset="100%" stopColor={C.ACCENT} stopOpacity="0"/></linearGradient></defs>
                <path d="M0,90 Q50,80 100,70 T200,50 T300,35 T400,25 T500,10" fill="none" stroke={C.ACCENT} strokeWidth="2"/>
                <path d="M0,90 Q50,80 100,70 T200,50 T300,35 T400,25 T500,10 L500,110 L0,110 Z" fill="url(#cg)"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ================================================================
   MOCKUP 2: QUIZZES LIST
   ================================================================ */
function QuizzesMockup() {
  const quizzes = [
    { name: 'Photography Style Quiz', status: 'Active', responses: 847, rate: '78%', date: 'Mar 15' },
    { name: 'Wedding Planning Quiz', status: 'Active', responses: 623, rate: '71%', date: 'Mar 12' },
    { name: 'Fitness Goal Finder', status: 'Draft', responses: 0, rate: '-', date: 'Mar 20' },
    { name: 'Restaurant Menu Quiz', status: 'Paused', responses: 412, rate: '65%', date: 'Feb 28' },
  ]
  return (
    <BrowserFrame>
      <div style={{ display: 'flex', minHeight: 350, fontFamily: C.FONT }}>
        <MockSidebar active="All quizzes" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MockTopBar />
          <div style={{ padding: 18, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900 }}>All Quizzes</div>
              <div style={{ padding: '6px 14px', borderRadius: 7, background: C.ACCENT, color: '#fff', fontSize: 11, fontWeight: 600 }}>+ Create Quiz</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {['All', 'Active', 'Draft', 'Paused'].map((tab, i) => (
                <div key={tab} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: i === 0 ? 600 : 400, background: i === 0 ? C.ACCENT_LIGHT : 'transparent', color: i === 0 ? C.ACCENT : C.GRAY_500, border: i === 0 ? 'none' : `1px solid ${C.GRAY_200}` }}>{tab}</div>
              ))}
            </div>
            <div style={{ border: `1px solid ${C.GRAY_200}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '8px 14px', background: C.GRAY_50, fontSize: 10, fontWeight: 600, color: C.GRAY_500 }}>
                <span>Quiz Name</span><span>Status</span><span>Responses</span><span>Rate</span><span>Created</span>
              </div>
              {quizzes.map((q, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '10px 14px', borderTop: `1px solid ${C.GRAY_100}`, fontSize: 11, color: C.GRAY_700, alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>{q.name}</span>
                  <span><span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 500, background: q.status === 'Active' ? C.SUCCESS_LIGHT : q.status === 'Draft' ? C.GRAY_100 : '#FFF6ED', color: q.status === 'Active' ? C.SUCCESS : q.status === 'Draft' ? C.GRAY_500 : C.WARNING_500 }}>{q.status}</span></span>
                  <span>{q.responses}</span>
                  <span>{q.rate}</span>
                  <span style={{ color: C.GRAY_400 }}>{q.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ================================================================
   MOCKUP 3: LEADS
   ================================================================ */
function LeadsMockup() {
  const leads = [
    { name: 'Sarah Miller', email: 'sarah@email.com', quiz: 'Photography Style', score: 85, date: 'Today' },
    { name: 'James Wilson', email: 'james@company.co', quiz: 'Wedding Planning', score: 72, date: 'Today' },
    { name: 'Emily Chen', email: 'emily@studio.com', quiz: 'Photography Style', score: 91, date: 'Yesterday' },
    { name: 'Mike Brown', email: 'mike@agency.io', quiz: 'Fitness Goal', score: 68, date: 'Yesterday' },
  ]
  return (
    <BrowserFrame>
      <div style={{ display: 'flex', minHeight: 350, fontFamily: C.FONT }}>
        <MockSidebar active="All leads" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MockTopBar />
          <div style={{ padding: 18, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900, marginBottom: 14 }}>Leads</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <StatCard label="Total Leads" value="1,203" trend="+18.7% this month" />
              <StatCard label="New This Month" value="342" trend="+24.1% vs last" />
              <StatCard label="Avg Score" value="72" trend="+3.2 pts" />
            </div>
            <div style={{ border: `1px solid ${C.GRAY_200}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr 0.7fr 0.8fr', padding: '8px 14px', background: C.GRAY_50, fontSize: 10, fontWeight: 600, color: C.GRAY_500 }}>
                <span>Name</span><span>Email</span><span>Quiz</span><span>Score</span><span>Date</span>
              </div>
              {leads.map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr 0.7fr 0.8fr', padding: '10px 14px', borderTop: `1px solid ${C.GRAY_100}`, fontSize: 11, color: C.GRAY_700, alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>{l.name}</span>
                  <span style={{ color: C.GRAY_500 }}>{l.email}</span>
                  <span>{l.quiz}</span>
                  <span style={{ fontWeight: 600, color: l.score >= 80 ? C.SUCCESS : C.GRAY_700 }}>{l.score}</span>
                  <span style={{ color: C.GRAY_400 }}>{l.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ================================================================
   MOCKUP 4: EMAIL CAMPAIGNS
   ================================================================ */
function EmailMockup() {
  const campaigns = [
    { name: 'Welcome Sequence', status: 'Active', sent: 1243, open: '42.3%', click: '12.8%' },
    { name: 'Photography Tips Series', status: 'Active', sent: 856, open: '38.7%', click: '9.4%' },
    { name: 'Re-engagement Campaign', status: 'Draft', sent: 0, open: '-', click: '-' },
  ]
  return (
    <BrowserFrame>
      <div style={{ display: 'flex', minHeight: 320, fontFamily: C.FONT }}>
        <MockSidebar active="Email Campaigns" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MockTopBar />
          <div style={{ padding: 18, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900 }}>Email Campaigns</div>
              <div style={{ padding: '6px 14px', borderRadius: 7, background: C.ACCENT, color: '#fff', fontSize: 11, fontWeight: 600 }}>+ New Campaign</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <StatCard label="Total Campaigns" value="8" />
              <StatCard label="Avg Open Rate" value="42.3%" trend="+5.2% vs avg" />
              <StatCard label="Avg Click Rate" value="12.8%" trend="+3.1% vs avg" />
            </div>
            <div style={{ border: `1px solid ${C.GRAY_200}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '8px 14px', background: C.GRAY_50, fontSize: 10, fontWeight: 600, color: C.GRAY_500 }}>
                <span>Campaign</span><span>Status</span><span>Sent</span><span>Opens</span><span>Clicks</span>
              </div>
              {campaigns.map((c, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '10px 14px', borderTop: `1px solid ${C.GRAY_100}`, fontSize: 11, color: C.GRAY_700, alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  <span><span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 500, background: c.status === 'Active' ? C.SUCCESS_LIGHT : C.GRAY_100, color: c.status === 'Active' ? C.SUCCESS : C.GRAY_500 }}>{c.status}</span></span>
                  <span>{c.sent}</span>
                  <span>{c.open}</span>
                  <span>{c.click}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ================================================================
   PRICING DATA - matches real pricing page exactly
   ================================================================ */
const PLANS = [
  {
    key: 'core', name: 'Core', featured: false,
    desc: 'Build real quiz funnels with branching logic, scoring, and scheduling.',
    monthly: 12, yearly: 9, yearlySave: 36,
    limits: { quizzes: '5', leads: '1,000', emails: '1,000' },
    included: ['AI quiz generation from your URL', 'Squarespace one-click connect', 'Remove Squarespell branding', 'Branching logic', 'Weighted scoring', 'Quiz scheduling', 'Standard analytics', 'Lead dashboard + CSV export'],
    excluded: ['A/B testing', 'Email sequences', 'Integrations (Zapier, Mailchimp, etc.)', 'Advanced analytics', 'Custom CSS', 'White-label / Custom domain'],
    upgrade: 'Need A/B testing or integrations?',
  },
  {
    key: 'pro', name: 'Pro', featured: true,
    desc: 'Full power for serious lead generation with unlimited quizzes and integrations.',
    monthly: 19, yearly: 16, yearlySave: 36,
    limits: { quizzes: 'Unlimited', leads: '3,000', emails: '3,000' },
    included: ['Everything in Core', 'A/B testing', 'Email sequences', 'All integrations (Zapier, Mailchimp, Klaviyo, HubSpot)', 'Webhooks', 'Advanced analytics', 'Per-question drop-off analysis', 'Custom CSS', 'Priority email support'],
    excluded: ['White-label (your brand)', 'Custom domain for quizzes', 'Team seats', 'API access'],
    upgrade: 'Need white-label or unlimited leads?',
  },
  {
    key: 'business', name: 'Business', featured: false,
    desc: 'Unlimited everything with white-label, custom domains, team seats, and API access.',
    monthly: 35, yearly: 29, yearlySave: 72,
    limits: { quizzes: 'Unlimited', leads: 'Unlimited', emails: 'Unlimited' },
    included: ['Everything in Pro', 'White-label (your brand)', 'Custom domain for quizzes', 'Team seats (3 included)', 'API access', 'Priority support (email + chat)', 'Dedicated onboarding call', 'Unlimited leads and emails'],
    excluded: [],
    upgrade: '',
  },
]

/* ================================================================
   FAQ DATA
   ================================================================ */
const FAQS = [
  { q: 'How does the 14-day free trial work?', a: 'You get full access to all Pro features for 14 days with no credit card required. Build quizzes, capture leads, and test integrations. Pick a plan when you are ready.' },
  { q: 'Can I change plans later?', a: 'Yes, you can upgrade or downgrade at any time. Changes take effect immediately and billing is prorated.' },
  { q: 'What counts as a lead?', a: 'A lead is counted when someone completes your quiz and submits their information. Partial completions and page views never count against your monthly limit.' },
  { q: 'Does it work with any Squarespace template?', a: 'Yes. Squarespell works with every Squarespace template version (7.0, 7.1, and Fluid). Just paste the embed code or use our one-click connect.' },
  { q: 'What integrations are included with Pro?', a: 'Pro includes Zapier, Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets, and webhooks. Connect your existing marketing stack with zero setup friction.' },
  { q: 'Can I cancel anytime?', a: 'Absolutely. No long-term contracts. Cancel from your billing page and your plan stays active until the end of the current billing period.' },
]

/* ================================================================
   HOW IT WORKS DATA
   ================================================================ */
const STEPS = [
  { icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', title: 'Paste Your URL', desc: 'Enter your Squarespace site URL and our AI analyzes your brand, content, and audience to generate a quiz in seconds.' },
  { icon: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7', title: 'Customize and Publish', desc: 'Fine-tune questions, scoring, branching logic, and result pages. Then embed on your site with one click.' },
  { icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', title: 'Capture and Convert', desc: 'Collect leads automatically, segment by quiz results, and trigger personalized email sequences to convert.' },
]

/* ================================================================
   FEATURE SHOWCASE DATA (3 alternating rows)
   ================================================================ */
const FEATURES = [
  {
    badge: 'ANALYTICS',
    title: 'Real-time performance dashboard',
    desc: 'Track every response, completion rate, lead capture, and score in real time. See exactly how your quizzes perform with detailed analytics and trend charts.',
    cta: 'Start tracking',
    mockup: 'dashboard',
  },
  {
    badge: 'QUIZ BUILDER',
    title: 'Build quizzes that convert visitors into leads',
    desc: 'Drag-and-drop quiz builder with branching logic, weighted scoring, image choices, and AI generation. Create professional quiz funnels in minutes, not hours.',
    cta: 'Try the builder',
    mockup: 'quizzes',
  },
  {
    badge: 'LEAD MANAGEMENT',
    title: 'Capture, score, and segment every lead',
    desc: 'Every quiz completion becomes a scored lead. Filter by quiz, segment by results, export to CSV, or sync with your CRM through native integrations.',
    cta: 'See lead tools',
    mockup: 'leads',
  },
]

/* ================================================================
   SCROLL ANIMATION HOOK
   ================================================================ */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, style: { opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)', transition: 'opacity 0.6s ease, transform 0.6s ease' } as React.CSSProperties }
}

/* ================================================================
   SECTION BADGE COMPONENT (pill with star icon)
   ================================================================ */
function SectionBadge({ text }: { text: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 20, border: `1px solid ${C.GRAY_200}`, background: C.BG, fontSize: 12, fontWeight: 600, color: C.GRAY_700, letterSpacing: '0.03em' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill={C.ACCENT} stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      {text}
    </div>
  )
}

/* ================================================================
   MAIN PAGE COMPONENT
   ================================================================ */
export default function QuizFunnelLandingPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const heroReveal = useScrollReveal()
  const logoReveal = useScrollReveal()
  const howReveal = useScrollReveal()
  const feat1Reveal = useScrollReveal()
  const feat2Reveal = useScrollReveal()
  const feat3Reveal = useScrollReveal()
  const testimonialsReveal = useScrollReveal()
  const ctaReveal = useScrollReveal()
  const templatesReveal = useScrollReveal()
  const pricingReveal = useScrollReveal()
  const faqReveal = useScrollReveal()

  function handleGo() {
    if (url.trim()) router.push(QUIZ_BUILDER_PATH + '?url=' + encodeURIComponent(url.trim()))
    else router.push(QUIZ_BUILDER_PATH)
  }

  /* ---- Outer wrapper matches reference: max-width 1600, padding 0 135 ---- */
  const outerStyle: React.CSSProperties = {
    maxWidth: L.MAX_OUTER,
    margin: '0 auto',
    fontFamily: C.FONT,
    background: C.BG,
    color: C.GRAY_900,
    overflowX: 'hidden',
  }

  /* ---- Section wrapper: applies the 135px side padding ---- */
  const sectionPad = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: `${L.SECTION_PAD}px ${L.PAD_LR}px`,
    ...extra,
  })

  /* ---- Content container (1170px centered) ---- */
  const contentStyle: React.CSSProperties = {
    maxWidth: L.CONTENT,
    margin: '0 auto',
    width: '100%',
  }

  return (
    <div style={outerStyle}>
      {/* ============================================================
          SECTION 1: NAV BAR - pill shape, max 1200px, sticky
          ============================================================ */}
      <nav style={{
        position: 'sticky', top: 20, zIndex: 100,
        maxWidth: L.NAV_MAX, margin: '0 auto',
        height: L.NAV_H,
        padding: '16px 80px',
        borderRadius: 50,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${C.GRAY_200}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: C.FONT,
        boxShadow: C.SHADOW_SM,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: C.ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: C.GRAY_900 }}>Squarespell</span>
        </Link>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {['Features', 'Pricing', 'Templates'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{ fontSize: 14, color: C.GRAY_600, textDecoration: 'none', fontWeight: 500 }}>{item}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/sign-in" style={{ fontSize: 14, color: C.GRAY_700, textDecoration: 'none', fontWeight: 500, padding: '8px 16px' }}>Sign in</Link>
          <Link href="/sign-up" style={{ fontSize: 14, color: '#fff', textDecoration: 'none', fontWeight: 600, padding: '8px 20px', borderRadius: 8, background: C.ACCENT }}>Get Started Free</Link>
        </div>
      </nav>

      {/* ============================================================
          SECTION 2: HERO - centered text + input bar
          ============================================================ */}
      <div style={sectionPad({ paddingBottom: 0, paddingTop: 160 })} ref={heroReveal.ref}>
        <div style={{ ...contentStyle, ...heroReveal.style, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, textAlign: 'center' }}>
          <SectionBadge text="QUIZ FUNNEL BUILDER" />
          <h1 style={{ fontSize: 70, fontWeight: 500, lineHeight: '84px', margin: 0, color: C.GRAY_900, maxWidth: 900 }}>
            Turn Your <span style={{ color: C.ACCENT }}>Squarespace</span> Site Into a Lead Machine
          </h1>
          <p style={{ fontSize: 18, lineHeight: '28px', color: C.GRAY_500, maxWidth: 590, margin: 0 }}>
            Build AI-powered quiz funnels that capture leads, segment your audience, and automate follow-up emails. Built specifically for Squarespace.
          </p>
          {/* Email/URL input bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 8px 8px 24px',
            borderRadius: 50, border: `1px solid ${C.GRAY_300}`,
            background: C.BG, boxShadow: C.SHADOW_SM,
            width: '100%', maxWidth: 520,
          }}>
            <input
              type="text" placeholder="Enter your Squarespace URL..."
              value={url} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGo()}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: C.GRAY_900, background: 'transparent', fontFamily: C.FONT }}
            />
            <button onClick={handleGo} style={{
              padding: '12px 28px', borderRadius: 50, border: 'none',
              background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: C.FONT, whiteSpace: 'nowrap',
            }}>
              Get Started
            </button>
          </div>
          {/* Trust badges */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', fontSize: 13, color: C.GRAY_500 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.SUCCESS_500} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              No credit card required
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.SUCCESS_500} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              14-day free trial
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION 3: HERO IMAGE - full 1170px dashboard screenshot
          ============================================================ */}
      <div style={{ padding: `${L.SECTION_GAP}px ${L.PAD_LR}px 0` }}>
        <div style={contentStyle}>
          <DashboardMockup />
        </div>
      </div>

      {/* ============================================================
          SECTION 4: LOGO BAR - integration partners
          ============================================================ */}
      <div style={sectionPad()} ref={logoReveal.ref}>
        <div style={{ ...contentStyle, ...logoReveal.style, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60 }}>
          {['Squarespace', 'Mailchimp', 'Zapier', 'Google Sheets', 'HubSpot'].map(name => (
            <div key={name} style={{ fontSize: 16, fontWeight: 600, color: C.GRAY_300, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_300} strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>
              {name}
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          SECTION 5: HOW IT WORKS - badge + title + 3 cards
          ============================================================ */}
      <div style={sectionPad({ paddingTop: L.SECTION_PAD })} ref={howReveal.ref} id="features">
        <div style={{ ...contentStyle, ...howReveal.style }}>
          <div style={{ textAlign: 'center', marginBottom: L.SECTION_GAP }}>
            <SectionBadge text="HOW IT WORKS" />
            <h2 style={{ fontSize: 44, fontWeight: 500, lineHeight: '52px', margin: '24px 0 0', color: C.GRAY_900 }}>Three steps to more leads</h2>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{
                flex: 1, padding: L.CARD_PAD, borderRadius: L.CARD_RADIUS,
                border: `1px solid ${C.GRAY_200}`, background: C.GRAY_50,
                display: 'flex', flexDirection: 'column', gap: 16,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.75"><path d={step.icon}/></svg>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.GRAY_900 }}>{step.title}</div>
                <div style={{ fontSize: 14, lineHeight: '22px', color: C.GRAY_500 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION 6: FEATURES - 3 alternating side-by-side rows
          Row 1: Text LEFT / Mockup RIGHT
          Row 2: Mockup LEFT / Text RIGHT
          Row 3: Text LEFT / Mockup RIGHT
          ============================================================ */}
      <div style={sectionPad({ paddingTop: 160, paddingBottom: 160 })}>
        <div style={{ ...contentStyle, display: 'flex', flexDirection: 'column', gap: L.FEATURE_ROW_GAP }}>
          {FEATURES.map((feat, i) => {
            const reveal = i === 0 ? feat1Reveal : i === 1 ? feat2Reveal : feat3Reveal
            const imageFirst = i % 2 === 1
            const textSide = (
              <div style={{ flex: '1 0 0px', display: 'flex', flexDirection: 'column', gap: 32, justifyContent: 'center', alignItems: 'flex-start' }}>
                <SectionBadge text={feat.badge} />
                <h2 style={{ fontSize: 36, fontWeight: 500, lineHeight: '44px', margin: 0, color: C.GRAY_900 }}>{feat.title}</h2>
                <p style={{ fontSize: 16, lineHeight: '26px', color: C.GRAY_500, margin: 0 }}>{feat.desc}</p>
                <button onClick={() => router.push(QUIZ_BUILDER_PATH)} style={{
                  padding: '12px 24px', borderRadius: 8, border: 'none',
                  background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: C.FONT,
                }}>
                  {feat.cta}
                </button>
              </div>
            )
            const mockupSide = (
              <div style={{ flex: '1 0 0px' }}>
                {feat.mockup === 'dashboard' && <DashboardMockup />}
                {feat.mockup === 'quizzes' && <QuizzesMockup />}
                {feat.mockup === 'leads' && <LeadsMockup />}
              </div>
            )
            return (
              <div key={i} ref={reveal.ref} style={{ ...reveal.style, display: 'flex', gap: L.FEATURE_GAP, alignItems: 'center' }}>
                {imageFirst ? <>{mockupSide}{textSide}</> : <>{textSide}{mockupSide}</>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ============================================================
          SECTION 7: TESTIMONIALS - badge + title + 3x2 grid
          ============================================================ */}
      <div style={sectionPad()} ref={testimonialsReveal.ref}>
        <div style={{ ...contentStyle, ...testimonialsReveal.style }}>
          <div style={{ textAlign: 'center', marginBottom: L.SECTION_GAP }}>
            <SectionBadge text="TESTIMONIALS" />
            <h2 style={{ fontSize: 44, fontWeight: 500, lineHeight: '52px', margin: '24px 0 0', color: C.GRAY_900 }}>What our customers say</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { quote: 'Squarespell transformed how we capture leads on our photography site. The quiz funnels feel native to our Squarespace design and conversions went up 3x.', name: 'Sarah Mitchell', role: 'Photographer, Mitchell Studios' },
              { quote: 'Setting up a quiz funnel used to take days with other tools. With Squarespell, I had one live in under 10 minutes. The AI generation is incredibly accurate.', name: 'James Rivera', role: 'Fitness Coach, FitPath' },
              { quote: 'The email sequences triggered by quiz results are a game changer. Our follow-up is now personalized based on what clients actually need.', name: 'Emily Chen', role: 'Wedding Planner, Bloom Events' },
              { quote: 'We switched from Typeform and saved both money and time. The Squarespace integration is seamless and the analytics are exactly what we needed.', name: 'David Park', role: 'Owner, Park Dental' },
              { quote: 'Our lead quality improved dramatically. Quiz scoring helps us prioritize the right prospects and the segmentation makes our emails way more relevant.', name: 'Lisa Thompson', role: 'Marketing Director, Artisan Co.' },
              { quote: 'Best investment for our online store. The product recommendation quiz drives 22% of our monthly revenue now. Setup was effortless.', name: 'Michael Brown', role: 'Founder, Craft Goods Co.' },
            ].map((t, i) => (
              <div key={i} style={{
                padding: 24, borderRadius: 12,
                border: `1px solid ${C.GRAY_200}`, background: C.BG,
                display: 'flex', flexDirection: 'column', gap: 16,
              }}>
                <p style={{ fontSize: 14, lineHeight: '22px', color: C.GRAY_600, margin: 0, flex: 1 }}>"{t.quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: C.ACCENT }}>{t.name[0]}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: C.GRAY_500 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION 8: CTA BANNER - 960px, 80px pad, 16px radius
          ============================================================ */}
      <div style={sectionPad()} ref={ctaReveal.ref}>
        <div style={{
          ...ctaReveal.style,
          maxWidth: L.CTA_WIDTH, margin: '0 auto',
          padding: 80, borderRadius: 16,
          background: C.ACCENT, textAlign: 'center',
        }}>
          <h2 style={{ fontSize: 36, fontWeight: 500, lineHeight: '44px', margin: '0 0 16px', color: '#fff' }}>Ready to turn visitors into leads?</h2>
          <p style={{ fontSize: 16, lineHeight: '26px', color: 'rgba(255,255,255,0.8)', margin: '0 0 32px', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>Join thousands of Squarespace site owners who use Squarespell to build quiz funnels that convert.</p>
          <button onClick={() => router.push('/sign-up')} style={{
            padding: '14px 32px', borderRadius: 50, border: 'none',
            background: '#fff', color: C.ACCENT, fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: C.FONT,
          }}>
            Get Started Free
          </button>
        </div>
      </div>

      {/* ============================================================
          SECTION 9: TEMPLATES - badge + title + 6 template cards
          ============================================================ */}
      <div style={sectionPad()} ref={templatesReveal.ref} id="templates">
        <div style={{ ...contentStyle, ...templatesReveal.style }}>
          <div style={{ textAlign: 'center', marginBottom: L.SECTION_GAP }}>
            <SectionBadge text="READY-MADE TEMPLATES" />
            <h2 style={{ fontSize: 44, fontWeight: 500, lineHeight: '52px', margin: '24px 0 0', color: C.GRAY_900 }}>Launch faster with proven templates</h2>
            <p style={{ fontSize: 16, lineHeight: '26px', color: C.GRAY_500, margin: '16px auto 0', maxWidth: 590 }}>
              Pick a template built for your industry. Customize it in minutes and start capturing leads today.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {QUIZ_TEMPLATE_CATALOG.slice(0, 6).map(t => (
              <Link key={String(t.id)} href={QUIZ_BUILDER_PATH + '?template=' + t.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  borderRadius: 12, overflow: 'hidden',
                  border: `1px solid ${C.GRAY_200}`, background: C.BG,
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  cursor: 'pointer',
                }}>
                  <div style={{ height: 160, background: C.GRAY_100, position: 'relative', overflow: 'hidden' }}>
                    <img src={getTemplateThumbnail(String(t.id))} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.GRAY_900, marginBottom: 4 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: C.GRAY_500, marginBottom: 8, lineHeight: '18px' }}>{t.description}</div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 10, background: C.ACCENT_LIGHT, color: C.ACCENT, fontWeight: 500 }}>{t.category}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 10, background: C.GRAY_100, color: C.GRAY_500, fontWeight: 500 }}>{getTemplateQuestionCount(String(t.id))} questions</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION 10: PRICING - toggle + 3 plan cards
          ============================================================ */}
      <div style={sectionPad()} ref={pricingReveal.ref} id="pricing">
        <div style={{ ...contentStyle, ...pricingReveal.style }}>
          <div style={{ textAlign: 'center', marginBottom: L.SECTION_GAP }}>
            <SectionBadge text="PRICING" />
            <h2 style={{ fontSize: 44, fontWeight: 500, lineHeight: '52px', margin: '24px 0 0', color: C.GRAY_900 }}>Simple, transparent pricing</h2>
            <p style={{ fontSize: 16, color: C.GRAY_500, margin: '16px 0 0' }}>14-day Pro trial. No credit card required.</p>
            {/* Billing toggle */}
            <div style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 10, background: C.GRAY_100, marginTop: 24 }}>
              {(['monthly', 'yearly'] as const).map(b => (
                <button key={b} onClick={() => setBilling(b)} style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: billing === b ? C.BG : 'transparent',
                  color: billing === b ? C.GRAY_900 : C.GRAY_500,
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: C.FONT,
                  boxShadow: billing === b ? C.SHADOW_XS : 'none',
                }}>
                  {b === 'monthly' ? 'Monthly' : 'Yearly'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {PLANS.map(plan => {
              const price = billing === 'monthly' ? plan.monthly : plan.yearly
              const showSave = billing === 'yearly'
              return (
                <div key={plan.key} style={{
                  borderRadius: 12, padding: 28,
                  border: plan.featured ? `2px solid ${C.ACCENT}` : `1px solid ${C.GRAY_200}`,
                  background: C.BG, display: 'flex', flexDirection: 'column',
                  position: 'relative',
                }}>
                  {plan.featured && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 14px', borderRadius: 10, background: C.ACCENT, color: '#fff', fontSize: 11, fontWeight: 600 }}>Most Popular</div>}
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, marginBottom: 4 }}>{plan.name}</div>
                  <div style={{ fontSize: 13, color: C.GRAY_500, marginBottom: 16, lineHeight: '20px' }}>{plan.desc}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    {showSave && <span style={{ fontSize: 18, color: C.GRAY_400, textDecoration: 'line-through' }}>${plan.monthly}</span>}
                    <span style={{ fontSize: 40, fontWeight: 700, color: C.GRAY_900 }}>${price}</span>
                    <span style={{ fontSize: 14, color: C.GRAY_500 }}>/mo</span>
                  </div>
                  {showSave && (
                    <div style={{ fontSize: 12, color: C.GRAY_500, marginBottom: 4 }}>Billed ${plan.yearly * 12}/year</div>
                  )}
                  {showSave && plan.yearlySave > 0 && (
                    <div style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '3px 10px', borderRadius: 10, background: C.SUCCESS_LIGHT, color: C.SUCCESS, fontSize: 11, fontWeight: 600, marginBottom: 16 }}>Save ${plan.yearlySave}/year</div>
                  )}
                  {!showSave && <div style={{ height: 16 }} />}
                  {/* Limits */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {Object.entries(plan.limits).map(([k, v]) => (
                      <div key={k} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 6, background: C.GRAY_50, border: `1px solid ${C.GRAY_100}` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.GRAY_900 }}>{v}</div>
                        <div style={{ fontSize: 9, color: C.GRAY_500, textTransform: 'uppercase', fontWeight: 600 }}>{k}</div>
                      </div>
                    ))}
                  </div>
                  {/* CTA */}
                  <button onClick={() => router.push('/sign-up')} style={{
                    width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                    background: plan.featured ? C.ACCENT : C.GRAY_900,
                    color: '#fff', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: C.FONT, marginBottom: 20,
                  }}>
                    Start Free Trial
                  </button>
                  {/* Included */}
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.GRAY_400, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Included</div>
                  {plan.included.map((f, fi) => (
                    <div key={fi} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6, fontSize: 13, color: C.GRAY_700 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.SUCCESS_500} strokeWidth="2.5" style={{ marginTop: 2, flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </div>
                  ))}
                  {/* Excluded */}
                  {plan.excluded.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.GRAY_400, marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Not included</div>
                      {plan.excluded.map((f, fi) => (
                        <div key={fi} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6, fontSize: 13, color: C.GRAY_400 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_300} strokeWidth="2" style={{ marginTop: 2, flexShrink: 0 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          {f}
                        </div>
                      ))}
                    </>
                  )}
                  {/* Upgrade nudge */}
                  {plan.upgrade && (
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.GRAY_100}`, fontSize: 12, color: C.ACCENT, fontWeight: 500 }}>
                      {plan.upgrade}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION 11: FAQ
          ============================================================ */}
      <div style={sectionPad()} ref={faqReveal.ref}>
        <div style={{ ...contentStyle, ...faqReveal.style, maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: L.SECTION_GAP }}>
            <h2 style={{ fontSize: 36, fontWeight: 500, lineHeight: '44px', margin: 0, color: C.GRAY_900 }}>Frequently asked questions</h2>
          </div>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${C.GRAY_200}` }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', padding: '20px 0', border: 'none', background: 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', fontFamily: C.FONT,
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 500, color: C.GRAY_900, textAlign: 'left' }}>{faq.q}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_400} strokeWidth="2" style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {openFaq === i && (
                <div style={{ paddingBottom: 20, fontSize: 14, lineHeight: '22px', color: C.GRAY_500 }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          SECTION 12: FOOTER - 3 column layout
          ============================================================ */}
      <footer style={sectionPad({ borderTop: `1px solid ${C.GRAY_200}` })}>
        <div style={{ ...contentStyle, display: 'flex', gap: 80 }}>
          {/* Brand column */}
          <div style={{ flex: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: C.ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: 16, color: C.GRAY_900 }}>Squarespell</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: '22px', color: C.GRAY_500, maxWidth: 300, margin: 0 }}>
              The quiz funnel platform built for Squarespace. Capture leads, segment audiences, and automate follow-ups.
            </p>
          </div>
          {/* Links columns */}
          {[
            { title: 'Product', links: ['Features', 'Templates', 'Pricing', 'Changelog'] },
            { title: 'Resources', links: ['Documentation', 'Blog', 'Help Center', 'API'] },
            { title: 'Company', links: ['About', 'Contact', 'Privacy', 'Terms'] },
          ].map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900, marginBottom: 16 }}>{col.title}</div>
              {col.links.map(link => (
                <div key={link} style={{ fontSize: 14, color: C.GRAY_500, marginBottom: 10, cursor: 'pointer' }}>{link}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ maxWidth: L.CONTENT, margin: '40px auto 0', paddingTop: 24, borderTop: `1px solid ${C.GRAY_200}`, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.GRAY_400 }}>
          <span>&#169; 2024 Squarespell. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
            <span style={{ cursor: 'pointer' }}>Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

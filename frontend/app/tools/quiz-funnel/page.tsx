'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QUIZ_BUILDER_PATH } from '@/lib/urls'
import { QUIZ_TEMPLATE_CATALOG, getTemplateThumbnail, getTemplateQuestionCount } from '@/lib/quiz/templates'

const C = {
  BG: '#FFFFFF',
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
  SHADOW_XL: '0px 20px 24px -4px rgba(16, 24, 40, 0.08), 0px 8px 8px -4px rgba(16, 24, 40, 0.03)',
}

/* ---- Sidebar items for mockups ---- */
const sidebarSections = [
  { label: 'OVERVIEW', items: ['Dashboard', 'Analytics'] },
  { label: 'QUIZZES', items: ['All quizzes', 'Templates', 'Quiz editor'] },
  { label: 'LEADS', items: ['All leads', 'Segmentation'] },
  { label: 'ENGAGE', items: ['Email Campaigns', 'Automations'] },
]

function MockSidebar({ active }: { active: string }) {
  return (
    <div style={{ width: 200, minWidth: 200, borderRight: `1px solid ${C.GRAY_200}`, padding: '16px 0', background: C.BG, display: 'flex', flexDirection: 'column', fontSize: 12, fontFamily: C.FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 20px' }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: C.ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
        </div>
        <span style={{ fontWeight: 700, color: C.GRAY_900, fontSize: 13 }}>Squarespell</span>
      </div>
      {sidebarSections.map(s => (
        <div key={s.label} style={{ marginBottom: 12 }}>
          <div style={{ padding: '0 16px', marginBottom: 4, fontSize: 10, fontWeight: 600, color: C.GRAY_400, letterSpacing: '0.05em' }}>{s.label}</div>
          {s.items.map(item => (
            <div key={item} style={{ padding: '6px 16px', fontSize: 12, fontWeight: item === active ? 600 : 400, color: item === active ? C.ACCENT : C.GRAY_600, borderLeft: item === active ? `2px solid ${C.ACCENT}` : '2px solid transparent', background: item === active ? C.ACCENT_LIGHT : 'transparent', cursor: 'default' }}>{item}</div>
          ))}
        </div>
      ))}
      <div style={{ marginTop: 'auto', padding: '0 16px', marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.GRAY_400, letterSpacing: '0.05em', marginBottom: 4 }}>COMMERCE</div>
        <div style={{ fontSize: 12, color: C.GRAY_600, padding: '6px 0' }}>Products</div>
      </div>
    </div>
  )
}

function MockTopBar() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: `1px solid ${C.GRAY_200}`, background: C.BG }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.GRAY_200}`, fontSize: 12, color: C.GRAY_400, minWidth: 200 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_400} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Search anything... <span style={{ marginLeft: 'auto', fontSize: 10, color: C.GRAY_300, border: `1px solid ${C.GRAY_200}`, borderRadius: 4, padding: '1px 5px' }}>Cmd+K</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_400} strokeWidth="1.75"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>J</div>
      </div>
    </div>
  )
}

function BrowserFrame({ children, url }: { children: React.ReactNode; url: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.GRAY_200}`, boxShadow: C.SHADOW_LG, background: C.BG }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: C.GRAY_50, borderBottom: `1px solid ${C.GRAY_200}` }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: C.GRAY_400, fontFamily: C.FONT }}>{url}</div>
      </div>
      {children}
    </div>
  )
}

/* ---- Dashboard Mockup ---- */
function DashboardMockup() {
  return (
    <BrowserFrame url="app.squarespell.com/dashboard">
      <div style={{ display: 'flex', minHeight: 520 }}>
        <MockSidebar active="Dashboard" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MockTopBar />
          <div style={{ padding: 20, background: C.GRAY_50, flex: 1, fontFamily: C.FONT }}>
            {/* Welcome */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900 }}>Welcome back, Jessica &#128075;</div>
                <div style={{ fontSize: 11, color: C.GRAY_500 }}>Here&apos;s what&apos;s happening with your quizzes today.</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.GRAY_200}`, fontSize: 11, color: C.GRAY_700, background: C.BG }}>Last 30 days</div>
                <div style={{ padding: '6px 12px', borderRadius: 8, background: C.ACCENT, color: '#fff', fontSize: 11, fontWeight: 600 }}>+ Create quiz</div>
              </div>
            </div>
            {/* Stat Cards */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'TOTAL VIEWS', value: '45' },
                { label: 'LEADS CAPTURED', value: '11' },
                { label: 'COMPLETION RATE', value: '55.6%' },
                { label: 'LEAD RATE', value: '24.4%' },
                { label: 'ACTIVE QUIZZES', value: '3/20' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, padding: '14px 12px', borderRadius: 10, border: `1px solid ${C.GRAY_200}`, background: C.BG }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.GRAY_500, marginBottom: 4, letterSpacing: '0.03em' }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.GRAY_900 }}>{s.value}</div>
                </div>
              ))}
            </div>
            {/* Performance Chart */}
            <div style={{ background: C.BG, borderRadius: 10, border: `1px solid ${C.GRAY_200}`, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.GRAY_900 }}>Performance overview</div>
                <div style={{ display: 'flex', gap: 0 }}>
                  {['Daily', 'Weekly', 'Monthly'].map((t, i) => (
                    <div key={t} style={{ padding: '4px 10px', fontSize: 10, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? C.ACCENT : C.GRAY_500, borderBottom: i === 0 ? `2px solid ${C.ACCENT}` : 'none', cursor: 'default' }}>{t}</div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, fontSize: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 2, background: C.ACCENT, borderRadius: 1 }} /> Views</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 2, background: C.GRAY_300, borderRadius: 1, borderStyle: 'dashed' }} /> Leads</span>
              </div>
              {/* SVG Chart */}
              <svg width="100%" height="120" viewBox="0 0 600 120" preserveAspectRatio="none">
                <polyline points="0,90 80,70 160,50 240,30 320,40 400,55 480,60 560,65 600,70" fill="none" stroke={C.ACCENT} strokeWidth="2.5" />
                <polyline points="0,100 80,95 160,85 240,75 320,80 400,90 480,95 560,98 600,100" fill="none" stroke={C.GRAY_300} strokeWidth="1.5" strokeDasharray="6 3" />
              </svg>
            </div>
            {/* Bottom 3 cards */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, background: C.BG, borderRadius: 10, border: `1px solid ${C.GRAY_200}`, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.GRAY_900, marginBottom: 10 }}>Top quizzes</div>
                {['Find Your Perfect...', 'Photography Style', 'Fitness Goal Quiz'].map((q, i) => (
                  <div key={q} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11, color: C.GRAY_700 }}>
                    <span>{i + 1}. {q}</span>
                    <span style={{ color: C.ACCENT, fontWeight: 600 }}>{['32.5%', '28.1%', '18.7%'][i]}</span>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, background: C.BG, borderRadius: 10, border: `1px solid ${C.GRAY_200}`, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.GRAY_900, marginBottom: 10 }}>Conversion funnel</div>
                {[{ l: 'Views', v: 45, w: '100%' }, { l: 'Started', v: 25, w: '55%' }, { l: 'Completed', v: 25, w: '55%' }, { l: 'Leads', v: 11, w: '24%' }].map(f => (
                  <div key={f.l} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.GRAY_600, marginBottom: 2 }}>
                      <span>{f.l}</span><span>{f.v}</span>
                    </div>
                    <div style={{ height: 6, background: C.GRAY_100, borderRadius: 3 }}>
                      <div style={{ height: 6, background: C.ACCENT, borderRadius: 3, width: f.w }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, background: C.BG, borderRadius: 10, border: `1px solid ${C.GRAY_200}`, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.GRAY_900, marginBottom: 10 }}>Lead sources</div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="30" fill="none" stroke={C.GRAY_100} strokeWidth="10" />
                    <circle cx="40" cy="40" r="30" fill="none" stroke={C.ACCENT} strokeWidth="10" strokeDasharray="120 68.5" strokeDashoffset="0" transform="rotate(-90 40 40)" />
                    <circle cx="40" cy="40" r="30" fill="none" stroke="#7F56D9" strokeWidth="10" strokeDasharray="40 148.5" strokeDashoffset="-120" transform="rotate(-90 40 40)" />
                    <circle cx="40" cy="40" r="30" fill="none" stroke={C.WARNING_500} strokeWidth="10" strokeDasharray="28.5 160" strokeDashoffset="-160" transform="rotate(-90 40 40)" />
                  </svg>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 9 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ACCENT }} />Direct</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7F56D9' }} />Social</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.WARNING_500 }} />Email</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ---- Quiz List Mockup ---- */
function QuizzesMockup() {
  return (
    <BrowserFrame url="app.squarespell.com/dashboard/quizzes">
      <div style={{ display: 'flex', minHeight: 420 }}>
        <MockSidebar active="All quizzes" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MockTopBar />
          <div style={{ padding: 20, background: C.GRAY_50, flex: 1, fontFamily: C.FONT }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900 }}>All quizzes</div>
                <div style={{ fontSize: 11, color: C.GRAY_500 }}>Create, edit, and publish your AI-powered quiz funnels.</div>
              </div>
              <div style={{ padding: '6px 14px', borderRadius: 8, background: C.ACCENT, color: '#fff', fontSize: 11, fontWeight: 600 }}>+ New quiz</div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {[{ l: 'TOTAL QUIZZES', v: '3' }, { l: 'LIVE QUIZZES', v: '3' }, { l: 'DRAFTS', v: '0' }, { l: 'TOTAL VIEWS', v: '45' }].map(s => (
                <div key={s.l} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${C.GRAY_200}`, background: C.BG }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.GRAY_500, marginBottom: 2 }}>{s.l}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.GRAY_900 }}>{s.v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['All', 'Live', 'Draft', 'Archived'].map((t, i) => (
                <div key={t} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: i === 0 ? 600 : 400, background: i === 0 ? C.ACCENT : 'transparent', color: i === 0 ? '#fff' : C.GRAY_500 }}>{t}</div>
              ))}
            </div>
            {[
              { letter: 'D', color: '#7F56D9', name: 'Discover Your Ideal Squarespace Enhancement', stats: '1 view - 0 leads - 0% conversion', time: '2w ago' },
              { letter: 'F', color: C.ACCENT, name: 'Find Your Perfect Squarespace Plugin or Template', stats: '44 views - 11 leads - 25% conversion', time: '3w ago' },
              { letter: 'F', color: C.ERROR_500, name: 'Find Your Ideal Squarespace Solution', stats: '0 views - 0 leads - 0% conversion', time: '3w ago' },
            ].map(q => (
              <div key={q.name} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.GRAY_200}`, background: C.BG, marginBottom: 8, gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: q.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>{q.letter}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.GRAY_900 }}>{q.name}</div>
                  <div style={{ fontSize: 10, color: C.GRAY_500 }}>{q.stats}</div>
                </div>
                <div style={{ padding: '3px 8px', borderRadius: 10, background: C.SUCCESS_LIGHT, color: C.SUCCESS, fontSize: 10, fontWeight: 600 }}>live</div>
                <div style={{ fontSize: 10, color: C.GRAY_400 }}>{q.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ---- Leads Mockup ---- */
function LeadsMockup() {
  return (
    <BrowserFrame url="app.squarespell.com/dashboard/leads">
      <div style={{ display: 'flex', minHeight: 420 }}>
        <MockSidebar active="All leads" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MockTopBar />
          <div style={{ padding: 20, background: C.GRAY_50, flex: 1, fontFamily: C.FONT }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900 }}>Leads</div>
                <div style={{ fontSize: 11, color: C.GRAY_500 }}>Track and manage people who completed your quizzes</div>
              </div>
              <div style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.GRAY_200}`, background: C.BG, fontSize: 11, color: C.GRAY_700, fontWeight: 500 }}>Export CSV</div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {[{ l: 'Total Leads', v: '5' }, { l: 'New This Week', v: '0' }, { l: 'Quizzes with Leads', v: '1' }, { l: 'High Intent Leads', v: '3' }].map(s => (
                <div key={s.l} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${C.GRAY_200}`, background: C.BG }}>
                  <div style={{ fontSize: 10, color: C.GRAY_500, marginBottom: 2 }}>{s.l}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.GRAY_900 }}>{s.v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[{ l: 'All', c: '5' }, { l: 'High intent', c: '3' }, { l: 'New', c: '2' }, { l: 'Low score', c: '0' }].map((t, i) => (
                <div key={t.l} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: i === 0 ? 600 : 400, background: i === 0 ? C.ACCENT : C.BG, color: i === 0 ? '#fff' : C.GRAY_600, border: i === 0 ? 'none' : `1px solid ${C.GRAY_200}` }}>{t.l} {t.c}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { initials: 'CO', name: 'contact.velushe', email: 'contact.velushe@gmail.com', score: 88, badge: 'High intent', badgeColor: C.ERROR_500, bg: C.ACCENT },
                { initials: 'SA', name: 'Sara Ahmed', email: 'squarespell@gmail.com', score: 65, badge: 'New', badgeColor: C.SUCCESS, bg: C.WARNING_500 },
                { initials: 'AH', name: 'Ali Hassan', email: 'hasnain.upwork700@gmail.com', score: 78, badge: 'High intent', badgeColor: C.ERROR_500, bg: '#7F56D9' },
              ].map(l => (
                <div key={l.name} style={{ padding: 14, borderRadius: 10, border: `1px solid ${C.GRAY_200}`, background: C.BG }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: l.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{l.initials}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.GRAY_900 }}>{l.name}</div>
                      <div style={{ fontSize: 9, color: C.GRAY_500 }}>{l.email}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: C.GRAY_400, marginBottom: 4 }}>QUIZ: Find Your Perfect Squarespace Plugin</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.GRAY_900 }}>{l.score}/100</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, color: l.badgeColor }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: l.badgeColor }} />{l.badge}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ---- Email & Automation Mockup ---- */
function EmailMockup() {
  return (
    <BrowserFrame url="app.squarespell.com/dashboard/emails">
      <div style={{ display: 'flex', minHeight: 420 }}>
        <MockSidebar active="Email Campaigns" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MockTopBar />
          <div style={{ padding: 20, background: C.GRAY_50, flex: 1, fontFamily: C.FONT }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, marginBottom: 4 }}>Email Campaigns</div>
            <div style={{ fontSize: 11, color: C.GRAY_500, marginBottom: 16 }}>Create and send targeted campaigns to your quiz leads</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {[{ l: 'Campaigns', v: '2' }, { l: 'Avg Open Rate', v: '34.2%' }, { l: 'Avg Click Rate', v: '8.1%' }].map(s => (
                <div key={s.l} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${C.GRAY_200}`, background: C.BG }}>
                  <div style={{ fontSize: 10, color: C.GRAY_500, marginBottom: 2 }}>{s.l}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.GRAY_900 }}>{s.v}</div>
                </div>
              ))}
            </div>
            {/* Campaign rows */}
            <div style={{ background: C.BG, borderRadius: 10, border: `1px solid ${C.GRAY_200}`, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '8px 14px', borderBottom: `1px solid ${C.GRAY_100}`, fontSize: 10, color: C.GRAY_500, fontWeight: 600 }}>
                <span>Campaign</span><span>Status</span><span>Open Rate</span><span>Click Rate</span>
              </div>
              {[
                { name: 'Welcome Series', status: 'Active', open: '34.2%', click: '8.1%', statusColor: C.SUCCESS },
                { name: 'Product Quiz Follow-up', status: 'Draft', open: '-', click: '-', statusColor: C.GRAY_400 },
              ].map(c => (
                <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 14px', borderBottom: `1px solid ${C.GRAY_100}`, fontSize: 12, color: C.GRAY_700, alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span><span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: c.statusColor === C.SUCCESS ? C.SUCCESS_LIGHT : C.GRAY_100, color: c.statusColor }}>{c.status}</span></span>
                  <span>{c.open}</span>
                  <span>{c.click}</span>
                </div>
              ))}
            </div>
            {/* Automation flow preview */}
            <div style={{ fontSize: 12, fontWeight: 700, color: C.GRAY_900, marginBottom: 10 }}>Automation: Welcome Flow</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: C.GRAY_600 }}>
              <div style={{ padding: '4px 10px', borderRadius: 6, background: C.ACCENT_LIGHT, color: C.ACCENT, fontWeight: 600, fontSize: 10 }}>Quiz completed</div>
              <span style={{ color: C.GRAY_300 }}>&#8594;</span>
              <div style={{ padding: '4px 10px', borderRadius: 6, background: C.GRAY_100, fontSize: 10 }}>Wait 1 hour</div>
              <span style={{ color: C.GRAY_300 }}>&#8594;</span>
              <div style={{ padding: '4px 10px', borderRadius: 6, background: C.ACCENT_LIGHT, color: C.ACCENT, fontWeight: 600, fontSize: 10 }}>Send welcome email</div>
              <span style={{ color: C.GRAY_300 }}>&#8594;</span>
              <div style={{ padding: '4px 10px', borderRadius: 6, background: C.GRAY_100, fontSize: 10 }}>Wait 3 days</div>
              <span style={{ color: C.GRAY_300 }}>&#8594;</span>
              <div style={{ padding: '4px 10px', borderRadius: 6, background: C.ACCENT_LIGHT, color: C.ACCENT, fontWeight: 600, fontSize: 10 }}>Send follow-up</div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ============================================= */
/*   MAIN LANDING PAGE                           */
/* ============================================= */
export default function LandingPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [isYearly, setIsYearly] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())
  const [navScrolled, setNavScrolled] = useState(false)
  const sectionRefs = useRef<HTMLDivElement[]>([])

  const addRef = (el: HTMLDivElement | null) => {
    if (el && !sectionRefs.current.includes(el)) sectionRefs.current.push(el)
  }

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && e.target.id) {
          setVisibleSections(prev => new Set(prev).add(e.target.id))
          obs.unobserve(e.target)
        }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' })
    sectionRefs.current.forEach(el => { if (el.id) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) router.push(QUIZ_BUILDER_PATH + '?url=' + encodeURIComponent(url))
  }

  const animStyle = (id: string): React.CSSProperties => ({
    opacity: visibleSections.has(id) ? 1 : 0,
    transform: visibleSections.has(id) ? 'translateY(0)' : 'translateY(30px)',
    transition: 'opacity 0.6s ease, transform 0.6s ease',
  })

  const templates = QUIZ_TEMPLATE_CATALOG.slice(0, 6)

  const plans = [
    {
      name: 'Core', price: isYearly ? 9 : 12, originalPrice: isYearly ? 12 : null, desc: 'Build real quiz funnels with branching logic, scoring, and scheduling.',
      billedText: isYearly ? 'Billed $108/year' : 'Billed monthly', savings: isYearly ? 'Save $36/year' : null,
      limits: [{ v: '5', l: 'QUIZZES' }, { v: '1,000', l: 'LEADS/MO' }, { v: '1,000', l: 'EMAILS/MO' }],
      included: ['AI quiz generation from your URL', 'Squarespace one-click connect', 'Remove Squarespell branding', 'Branching logic & weighted scoring', 'Quiz scheduling', 'Standard analytics', 'Lead dashboard + CSV export', 'Lead & email add-on packs'],
      excluded: ['A/B testing', 'Email sequences', 'Integrations (Zapier, Mailchimp, etc.)', 'Advanced analytics', 'Custom CSS', 'White-label / Custom domain', 'Team seats'],
      nudge: 'Need A/B testing or integrations? Upgrade to Pro', featured: false,
    },
    {
      name: 'Pro', price: isYearly ? 16 : 19, originalPrice: isYearly ? 19 : null, desc: 'Full power for serious lead generation - unlimited quizzes, integrations, and A/B testing.',
      billedText: isYearly ? 'Billed $192/year' : 'Billed monthly', savings: isYearly ? 'Save $36/year' : null,
      limits: [{ v: 'Unlimited', l: 'QUIZZES' }, { v: '3,000', l: 'LEADS/MO' }, { v: '3,000', l: 'EMAILS/MO' }],
      included: ['Everything in Core', 'A/B testing', 'Email sequences', 'All integrations (Zapier, Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets)', 'Webhooks', 'Advanced analytics & drop-off analysis', 'Custom CSS', 'Priority email support', 'Lead & email add-on packs'],
      excluded: ['White-label (your brand)', 'Custom domain for quizzes', 'Team seats', 'API access', 'Dedicated onboarding call'],
      nudge: 'Need white-label or unlimited leads? Upgrade to Business', featured: true,
    },
    {
      name: 'Business', price: isYearly ? 29 : 35, originalPrice: isYearly ? 35 : null, desc: 'Unlimited everything with white-label, custom domains, team seats, and API access.',
      billedText: isYearly ? 'Billed $348/year' : 'Billed monthly', savings: isYearly ? 'Save $72/year' : null,
      limits: [{ v: 'Unlimited', l: 'QUIZZES' }, { v: 'Unlimited', l: 'LEADS/MO' }, { v: 'Unlimited', l: 'EMAILS/MO' }],
      included: ['Everything in Pro', 'White-label (your brand on everything)', 'Custom domain for quizzes', 'Team seats (3 included, $5/seat extra)', 'API access', 'Priority support (email + chat)', 'Dedicated onboarding call', 'Unlimited leads & emails'],
      excluded: [], nudge: null, featured: false,
    },
  ]

  const faqs = [
    { q: 'How does Squarespell integrate with Squarespace?', a: 'Squarespell embeds directly into your Squarespace site via a simple code snippet. No plugins, no complicated setup. Just paste one line of code into your site header and your quizzes appear right on your pages.' },
    { q: 'Can I customize the quiz design to match my brand?', a: 'Absolutely. Every quiz automatically inherits your Squarespace site fonts, colors, and styling. You can also fine-tune individual elements like button colors, backgrounds, and typography.' },
    { q: 'What happens when someone completes a quiz?', a: 'Their responses are captured as a lead in your dashboard with a score based on their answers. You can trigger automated welcome emails, segment them by intent level, and export them as CSV for your own tools.' },
    { q: 'Do I need coding experience?', a: 'Not at all. The quiz builder is entirely visual with drag-and-drop blocks. You can also use our AI assistant to generate a complete quiz from a simple text prompt.' },
    { q: 'Is there a free trial?', a: 'Yes. Every plan includes a 14-day free trial with full access to all features. No credit card required to start.' },
    { q: 'What if I need more leads but not a higher plan?', a: 'Add-on packs let you buy extra capacity on any paid plan. Lead packs start at $3/mo for 500 extra leads. Email packs start at $3/mo for 1,000 extra emails. No upgrade required.' },
    { q: 'Can I switch plans later?', a: 'Yes, you can upgrade or downgrade at any time. Changes take effect immediately, and billing is prorated.' },
    { q: 'How is Squarespell different from other quiz tools?', a: 'Other quiz tools charge $27 to $75/mo for entry plans with fewer leads. Squarespell starts at $9/mo with 1,000 leads, branching logic, and native Squarespace integration. AI generates a fully branded quiz from your website URL in under 60 seconds.' },
  ]

  const addOnPacks = [
    { category: 'Lead Packs', items: [{ label: '+500 leads/mo', price: '$3/mo' }, { label: '+1,500 leads/mo', price: '$7/mo' }, { label: '+3,000 leads/mo', price: '$12/mo' }] },
    { category: 'Email Packs', items: [{ label: '+1,000 emails/mo', price: '$3/mo' }, { label: '+5,000 emails/mo', price: '$7/mo' }, { label: '+10,000 emails/mo', price: '$12/mo' }] },
  ]

  const features = [
    { title: 'AI Quiz Builder', desc: 'Generate a complete quiz from a text prompt or URL. Add questions, logic branches, and result pages in minutes.' },
    { title: 'Brand-Matched Design', desc: 'Quizzes inherit your Squarespace fonts, colors, and styling automatically. No design work needed.' },
    { title: 'Real-time Analytics', desc: 'Track views, completions, lead rates, and conversion funnels with a dashboard built for clarity.' },
    { title: 'Lead Capture & Scoring', desc: 'Every quiz response is captured as a scored lead. Segment by intent level and prioritize follow-ups.' },
    { title: 'Email Campaigns', desc: 'Send targeted emails based on quiz results. Personalized recommendations that actually convert.' },
    { title: 'Automations', desc: 'Set up trigger-based workflows. Welcome emails, follow-ups, and reminders run on autopilot.' },
    { title: 'A/B Testing', desc: 'Test different questions, headlines, and result pages to find what converts best.' },
    { title: 'Squarespace Native', desc: 'Built specifically for Squarespace. One code snippet to embed. No third-party plugins or iframes.' },
    { title: 'Templates Library', desc: 'Start from industry-specific templates for photographers, fitness coaches, e-commerce, and more.' },
  ]

  const featureIcons = [
    'M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z',
    'M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2zM2 12h20',
    'M18 20V10M12 20V4M6 20v-6',
    'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z',
    'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
    'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  ]

  const WRAP: React.CSSProperties = { maxWidth: 1280, margin: '0 auto', padding: '0 32px' }

  return (
    <div style={{ background: C.BG, fontFamily: C.FONT, color: C.GRAY_900 }}>
      {/* =============== NAV =============== */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: navScrolled ? 'rgba(255,255,255,0.95)' : C.BG, backdropFilter: navScrolled ? 'blur(12px)' : 'none', borderBottom: navScrolled ? `1px solid ${C.GRAY_200}` : '1px solid transparent', transition: 'all 0.3s' }}>
        <div style={{ ...WRAP, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900 }}>Squarespell</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {['Features', 'Templates', 'Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} style={{ fontSize: 14, color: C.GRAY_600, textDecoration: 'none', fontWeight: 500 }}>{l}</a>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="https://app.squarespell.com/sign-in" style={{ fontSize: 14, color: C.GRAY_700, textDecoration: 'none', fontWeight: 500 }}>Log in</a>
            <a href={QUIZ_BUILDER_PATH} style={{ padding: '8px 20px', borderRadius: 8, background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Get Started Free</a>
          </div>
        </div>
      </nav>

      {/* =============== HERO =============== */}
      <section style={{ padding: '80px 32px 60px', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 20, background: C.ACCENT_LIGHT, color: C.ACCENT, fontSize: 13, fontWeight: 600, marginBottom: 24, letterSpacing: '0.03em' }}>QUIZ FUNNELS FOR SQUARESPACE</div>
          <h1 style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, margin: '0 0 20px', color: C.GRAY_900 }}>
            Turn Your Visitors Into{' '}
            <span style={{ color: C.ACCENT }}>Qualified Leads</span>
          </h1>
          <p style={{ fontSize: 18, color: C.GRAY_500, lineHeight: 1.6, margin: '0 0 40px', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
            AI-powered quiz funnels built for Squarespace. Paste your URL, get a branded quiz in 60 seconds, and start capturing leads that convert.
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', maxWidth: 520, margin: '0 auto 20px', borderRadius: 12, border: `1px solid ${C.GRAY_200}`, overflow: 'hidden', boxShadow: C.SHADOW_MD }}>
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter your Squarespace URL..." style={{ flex: 1, padding: '16px 20px', border: 'none', outline: 'none', fontSize: 15, fontFamily: C.FONT, color: C.GRAY_900, background: C.BG }} />
            <button type="submit" style={{ padding: '16px 28px', background: C.ACCENT, color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, fontFamily: C.FONT, cursor: 'pointer', whiteSpace: 'nowrap' }}>Get Started Free</button>
          </form>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 13, color: C.GRAY_500 }}>
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
      </section>

      {/* =============== HERO MOCKUP =============== */}
      <section style={{ padding: '0 32px 80px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <DashboardMockup />
        </div>
      </section>

      {/* =============== SOCIAL PROOF =============== */}
      <section style={{ padding: '60px 32px', borderTop: `1px solid ${C.GRAY_100}`, borderBottom: `1px solid ${C.GRAY_100}`, background: C.GRAY_50 }}>
        <div style={{ ...WRAP, display: 'flex', justifyContent: 'center', gap: 64, flexWrap: 'wrap' }}>
          {[{ v: '2,400+', l: 'Active users' }, { v: '180K+', l: 'Leads captured' }, { v: '12K+', l: 'Quizzes created' }, { v: '98%', l: 'Satisfaction rate' }].map(s => (
            <div key={s.v} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.GRAY_900 }}>{s.v}</div>
              <div style={{ fontSize: 14, color: C.GRAY_500 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* =============== HOW IT WORKS =============== */}
      <section style={{ padding: '100px 32px' }}>
        <div id="hiw" ref={addRef} style={{ ...WRAP, ...animStyle('hiw') }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 16, background: C.ACCENT_LIGHT, color: C.ACCENT, fontSize: 12, fontWeight: 600, marginBottom: 16, letterSpacing: '0.05em' }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.GRAY_900, margin: '0 0 12px' }}>Live in 3 simple steps</h2>
            <p style={{ fontSize: 16, color: C.GRAY_500, maxWidth: 560, margin: '0 auto' }}>No code, no plugins, no complicated setup. Just paste, publish, and start capturing leads.</p>
          </div>
          <div style={{ display: 'flex', gap: 32, maxWidth: 960, margin: '0 auto' }}>
            {[
              { n: '1', t: 'Build your quiz', d: 'Use AI to generate a quiz from your URL, or start from a template. Add questions, logic, and result pages in the visual editor.' },
              { n: '2', t: 'Embed on your site', d: 'Copy one line of code and paste it into your Squarespace site header. Your quiz appears instantly on any page.' },
              { n: '3', t: 'Capture and convert', d: 'Leads flow into your dashboard with scores and segments. Trigger emails and automations automatically.' },
            ].map(s => (
              <div key={s.n} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22, fontWeight: 800, color: C.ACCENT }}>{s.n}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, margin: '0 0 8px' }}>{s.t}</h3>
                <p style={{ fontSize: 14, color: C.GRAY_500, lineHeight: 1.6, margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =============== FEATURES GRID (3x3) =============== */}
      <section id="features" style={{ padding: '100px 32px', background: C.GRAY_50 }}>
        <div id="feat" ref={addRef} style={{ ...WRAP, ...animStyle('feat') }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 16, background: C.ACCENT_LIGHT, color: C.ACCENT, fontSize: 12, fontWeight: 600, marginBottom: 16, letterSpacing: '0.05em' }}>FEATURES</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.GRAY_900, margin: '0 0 12px' }}>Everything you need to grow</h2>
            <p style={{ fontSize: 16, color: C.GRAY_500, maxWidth: 560, margin: '0 auto' }}>A complete quiz funnel platform built for Squarespace creators and marketers.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {features.map((f, i) => (
              <div key={f.title} style={{ padding: 28, borderRadius: 12, border: `1px solid ${C.GRAY_200}`, background: C.BG }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={featureIcons[i]} /></svg>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900, margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: C.GRAY_500, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =============== SHOWCASE 1: DASHBOARD (text LEFT, mockup RIGHT) =============== */}
      <section style={{ padding: '100px 32px' }}>
        <div id="s1" ref={addRef} style={{ ...WRAP, ...animStyle('s1'), display: 'flex', alignItems: 'center', gap: 60 }}>
          <div style={{ flex: 1 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: C.GRAY_900, margin: '0 0 16px', lineHeight: 1.2 }}>Your command center for growth</h2>
            <p style={{ fontSize: 16, color: C.GRAY_500, lineHeight: 1.7, margin: '0 0 28px' }}>See your quiz performance at a glance. Track views, leads, completion rates, and conversion funnels all from one dashboard. Know exactly what is working and what to optimize.</p>
            <a href={QUIZ_BUILDER_PATH} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 8, background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Explore Dashboard
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          </div>
          <div style={{ flex: 1.3, minWidth: 0 }}>
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* =============== SHOWCASE 2: QUIZZES (mockup LEFT, text RIGHT) =============== */}
      <section style={{ padding: '100px 32px', background: C.GRAY_50 }}>
        <div id="s2" ref={addRef} style={{ ...WRAP, ...animStyle('s2'), display: 'flex', alignItems: 'center', gap: 60 }}>
          <div style={{ flex: 1.3, minWidth: 0 }}>
            <QuizzesMockup />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: C.GRAY_900, margin: '0 0 16px', lineHeight: 1.2 }}>Build and manage quiz funnels</h2>
            <p style={{ fontSize: 16, color: C.GRAY_500, lineHeight: 1.7, margin: '0 0 28px' }}>Create AI-powered quizzes in minutes. Track every quiz with live status, views, leads, and conversion rates. Filter by status, search by name, and manage everything from one place.</p>
            <a href={QUIZ_BUILDER_PATH} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 8, background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Create Your First Quiz
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          </div>
        </div>
      </section>

      {/* =============== SHOWCASE 3: LEADS (text LEFT, mockup RIGHT) =============== */}
      <section style={{ padding: '100px 32px' }}>
        <div id="s3" ref={addRef} style={{ ...WRAP, ...animStyle('s3'), display: 'flex', alignItems: 'center', gap: 60 }}>
          <div style={{ flex: 1 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: C.GRAY_900, margin: '0 0 16px', lineHeight: 1.2 }}>Know your leads before you talk to them</h2>
            <p style={{ fontSize: 16, color: C.GRAY_500, lineHeight: 1.7, margin: '0 0 28px' }}>Every quiz response is captured with a score and intent level. Filter by high intent, segment by answers, and export with one click. Prioritize the leads most likely to convert.</p>
            <a href={QUIZ_BUILDER_PATH} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 8, background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              View Lead Dashboard
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          </div>
          <div style={{ flex: 1.3, minWidth: 0 }}>
            <LeadsMockup />
          </div>
        </div>
      </section>

      {/* =============== SHOWCASE 4: EMAIL & AUTOMATIONS (mockup LEFT, text RIGHT) =============== */}
      <section style={{ padding: '100px 32px', background: C.GRAY_50 }}>
        <div id="s4" ref={addRef} style={{ ...WRAP, ...animStyle('s4'), display: 'flex', alignItems: 'center', gap: 60 }}>
          <div style={{ flex: 1.3, minWidth: 0 }}>
            <EmailMockup />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: C.GRAY_900, margin: '0 0 16px', lineHeight: 1.2 }}>Nurture leads on autopilot</h2>
            <p style={{ fontSize: 16, color: C.GRAY_500, lineHeight: 1.7, margin: '0 0 28px' }}>Send personalized emails based on quiz results. Set up automated welcome sequences, follow-ups, and product recommendations. Track open rates, clicks, and conversions all in one place.</p>
            <a href={QUIZ_BUILDER_PATH} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 8, background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Set Up Automations
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          </div>
        </div>
      </section>

      {/* =============== TEMPLATES =============== */}
      <section id="templates" style={{ padding: '100px 32px' }}>
        <div id="tmpl" ref={addRef} style={{ ...WRAP, ...animStyle('tmpl') }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 16, background: C.ACCENT_LIGHT, color: C.ACCENT, fontSize: 12, fontWeight: 600, marginBottom: 16, letterSpacing: '0.05em' }}>TEMPLATES</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.GRAY_900, margin: '0 0 12px' }}>Start with a proven template</h2>
            <p style={{ fontSize: 16, color: C.GRAY_500, maxWidth: 560, margin: '0 auto' }}>Industry-specific quiz templates ready to customize. Pick one and launch in minutes.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {templates.map(t => {
              const thumb = getTemplateThumbnail(t.id)
              const count = getTemplateQuestionCount(t.id)
              return (
                <Link key={t.id} href={QUIZ_BUILDER_PATH + '?template=' + t.id} style={{ textDecoration: 'none', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.GRAY_200}`, background: C.BG, transition: 'box-shadow 0.2s, transform 0.2s' }}>
                  <div style={{ height: 160, background: thumb ? `url(${thumb}) center/cover` : C.GRAY_100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!thumb && <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.5"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>}
                  </div>
                  <div style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: C.ACCENT, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.category}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.GRAY_900, marginBottom: 4 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: C.GRAY_500, lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{t.description}</div>
                    <div style={{ fontSize: 11, color: C.GRAY_400 }}>{count} questions</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* =============== PRICING =============== */}
      <section id="pricing" style={{ padding: '100px 32px', background: C.GRAY_50 }}>
        <div id="prc" ref={addRef} style={{ ...WRAP, ...animStyle('prc') }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 16, background: C.ACCENT_LIGHT, color: C.ACCENT, fontSize: 12, fontWeight: 600, marginBottom: 16, letterSpacing: '0.05em' }}>PRICING</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.GRAY_900, margin: '0 0 12px' }}>Simple, transparent pricing</h2>
            <p style={{ fontSize: 16, color: C.GRAY_500, maxWidth: 560, margin: '0 auto' }}>Start free, upgrade when you need to. Every plan includes a 14-day trial.</p>
          </div>
          {/* Toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 48 }}>
            <span onClick={() => setIsYearly(false)} style={{ fontSize: 14, fontWeight: isYearly ? 400 : 600, color: isYearly ? C.GRAY_500 : C.GRAY_900, padding: '8px 16px', borderRadius: 20, background: !isYearly ? C.GRAY_100 : 'transparent', cursor: 'pointer' }}>Monthly</span>
            <span onClick={() => setIsYearly(true)} style={{ fontSize: 14, fontWeight: isYearly ? 600 : 400, color: isYearly ? '#fff' : C.GRAY_500, padding: '8px 16px', borderRadius: 20, background: isYearly ? C.ACCENT : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              Annual {isYearly && <span style={{ padding: '2px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 600 }}>Save up to 25%</span>}
            </span>
            {isYearly && <span style={{ fontSize: 13, color: C.ACCENT, fontWeight: 500 }}>Save up to $72/year</span>}
          </div>
          {/* Plan Cards */}
          <div style={{ display: 'flex', gap: 24, maxWidth: 1080, margin: '0 auto 60px', alignItems: 'stretch' }}>
            {plans.map(p => (
              <div key={p.name} style={{ flex: 1, background: C.BG, borderRadius: 16, border: p.featured ? `2px solid ${C.ACCENT}` : `1px solid ${C.GRAY_200}`, padding: '32px 28px 28px', position: 'relative', boxShadow: p.featured ? C.SHADOW_LG : C.SHADOW_XS, display: 'flex', flexDirection: 'column' as const }}>
                {p.featured && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 14px', borderRadius: 12, background: C.ACCENT, color: '#fff', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
                <h3 style={{ fontSize: 22, fontWeight: 700, color: C.GRAY_900, margin: '0 0 6px' }}>{p.name}</h3>
                <p style={{ fontSize: 13, color: C.GRAY_500, margin: '0 0 20px', lineHeight: 1.5 }}>{p.desc}</p>
                <div style={{ marginBottom: 4 }}>
                  {p.originalPrice && <span style={{ fontSize: 14, color: C.GRAY_400, textDecoration: 'line-through', marginRight: 6 }}>${p.originalPrice}</span>}
                  <span style={{ fontSize: 48, fontWeight: 800, color: C.GRAY_900 }}>${p.price}</span>
                  <span style={{ fontSize: 15, color: C.GRAY_500 }}>/mo</span>
                </div>
                <div style={{ fontSize: 12, color: C.GRAY_500, marginBottom: 4 }}>{p.billedText}</div>
                {p.savings ? <div style={{ fontSize: 12, color: C.SUCCESS, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.SUCCESS} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {p.savings}
                </div> : <div style={{ height: 16, marginBottom: 16 }} />}
                <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: `1px solid ${C.GRAY_200}`, borderRadius: 10, overflow: 'hidden' }}>
                  {p.limits.map((lim, li) => (
                    <div key={li} style={{ flex: 1, padding: '12px 8px', textAlign: 'center', borderRight: li < 2 ? `1px solid ${C.GRAY_200}` : 'none', background: p.featured ? C.ACCENT_LIGHT : C.GRAY_50 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.GRAY_900 }}>{lim.v}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: C.GRAY_500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{lim.l}</div>
                    </div>
                  ))}
                </div>
                <a href={QUIZ_BUILDER_PATH} style={{ display: 'block', textAlign: 'center', padding: '12px 0', borderRadius: 8, background: p.featured ? C.ACCENT : 'transparent', color: p.featured ? '#fff' : C.GRAY_900, border: p.featured ? 'none' : `1px solid ${C.GRAY_300}`, fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 24 }}>Start free trial</a>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>INCLUDED</div>
                <div style={{ flex: 1 }}>
                  {p.included.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, fontSize: 13, color: C.GRAY_700 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.SUCCESS_500} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 16, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </div>
                  ))}
                </div>
                {p.excluded.length > 0 && <div style={{ borderTop: `1px solid ${C.GRAY_200}`, paddingTop: 16, marginTop: 12 }}>
                  {p.excluded.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, fontSize: 13, color: C.GRAY_400 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_300} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 14, marginTop: 2 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      {f}
                    </div>
                  ))}
                </div>}
                {p.nudge && <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: C.ACCENT_LIGHT, border: `1px solid ${C.BRAND_50}`, fontSize: 12, color: C.ACCENT, fontWeight: 500, textAlign: 'center' }}>{p.nudge} &#8594;</div>}
              </div>
            ))}
          </div>
          {/* Add-on Packs */}
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: C.GRAY_900, textAlign: 'center', margin: '0 0 24px' }}>Need more? Add extra capacity</h3>
            <div style={{ display: 'flex', gap: 24 }}>
              {addOnPacks.map(pack => (
                <div key={pack.category} style={{ flex: 1, background: C.BG, borderRadius: 12, border: `1px solid ${C.GRAY_200}`, padding: '20px 24px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.GRAY_900, marginBottom: 14 }}>{pack.category}</div>
                  {pack.items.map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.GRAY_100}`, fontSize: 13 }}>
                      <span style={{ color: C.GRAY_700 }}>{item.label}</span>
                      <span style={{ fontWeight: 600, color: C.GRAY_900 }}>{item.price}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =============== FAQ =============== */}
      <section style={{ padding: '100px 32px' }}>
        <div id="faq" ref={addRef} style={{ ...WRAP, ...animStyle('faq') }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 16, background: C.ACCENT_LIGHT, color: C.ACCENT, fontSize: 12, fontWeight: 600, marginBottom: 16, letterSpacing: '0.05em' }}>FAQ</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.GRAY_900, margin: '0 0 12px' }}>Frequently asked questions</h2>
          </div>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ borderBottom: `1px solid ${C.GRAY_200}` }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: C.FONT }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.GRAY_900, textAlign: 'left' }}>{faq.q}</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_400} strokeWidth="2" strokeLinecap="round" style={{ minWidth: 20, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {openFaq === i && <div style={{ paddingBottom: 20, fontSize: 14, color: C.GRAY_500, lineHeight: 1.7 }}>{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =============== CTA BANNER =============== */}
      <section style={{ padding: '100px 32px', background: C.GRAY_900 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: '#fff', margin: '0 0 16px', lineHeight: 1.15 }}>Ready to turn visitors into leads?</h2>
          <p style={{ fontSize: 18, color: C.GRAY_400, margin: '0 0 40px', lineHeight: 1.6 }}>Join 2,400+ Squarespace creators already using Squarespell to grow their business with quiz funnels.</p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', maxWidth: 520, margin: '0 auto 20px', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.GRAY_700}`, background: C.GRAY_800 }}>
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter your Squarespace URL..." style={{ flex: 1, padding: '14px 20px', border: 'none', outline: 'none', fontSize: 15, fontFamily: C.FONT, color: '#fff', background: 'transparent' }} />
            <button type="submit" style={{ padding: '14px 28px', background: C.ACCENT, color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, fontFamily: C.FONT, cursor: 'pointer' }}>Get Started Free</button>
          </form>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 13, color: C.GRAY_500 }}>
            <span>No credit card required</span>
            <span>14-day free trial</span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* =============== FOOTER =============== */}
      <footer style={{ padding: '60px 32px 40px', borderTop: `1px solid ${C.GRAY_200}` }}>
        <div style={{ ...WRAP }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 40 }}>
            <div style={{ maxWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: C.ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900 }}>Squarespell</span>
              </div>
              <p style={{ fontSize: 13, color: C.GRAY_500, lineHeight: 1.6 }}>The quiz funnel builder made for Squarespace. Capture leads, qualify prospects, and grow your business.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Templates', 'Pricing', 'Changelog'] },
              { title: 'Resources', links: ['Documentation', 'Blog', 'Help Center', 'API'] },
              { title: 'Company', links: ['About', 'Contact', 'Privacy', 'Terms'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900, marginBottom: 12 }}>{col.title}</div>
                {col.links.map(link => (
                  <div key={link} style={{ fontSize: 13, color: C.GRAY_500, marginBottom: 8, cursor: 'pointer' }}>{link}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${C.GRAY_200}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.GRAY_400 }}>
            <span>&copy; 2024 Squarespell. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
              <span style={{ cursor: 'pointer' }}>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

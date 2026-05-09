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
  PURPLE_500: '#7F56D9',
  FONT: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  SHADOW_XS: '0px 1px 2px rgba(16, 24, 40, 0.05)',
  SHADOW_SM: '0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)',
  SHADOW_MD: '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)',
  SHADOW_LG: '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
  SHADOW_XL: '0px 20px 24px -4px rgba(16, 24, 40, 0.08), 0px 8px 8px -4px rgba(16, 24, 40, 0.03)',
}

/* ─────────────────────────────────────────────
   Reusable sub-components
   ───────────────────────────────────────────── */

function BrowserChrome({ children, url }: { children: React.ReactNode; url: string }) {
  return (
    <div style={{
      background: C.GRAY_50,
      borderRadius: 16,
      border: `1px solid ${C.GRAY_100}`,
      padding: '0 0 0 0',
      boxShadow: C.SHADOW_XL,
      overflow: 'hidden',
    }}>
      <div style={{
        background: C.GRAY_100,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: `1px solid ${C.GRAY_200}`,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28CA41' }} />
        </div>
        <div style={{
          flex: 1,
          background: C.BG,
          borderRadius: 6,
          padding: '6px 12px',
          fontSize: 12,
          color: C.GRAY_500,
          fontFamily: C.FONT,
          marginLeft: 8,
        }}>
          {url}
        </div>
      </div>
      <div style={{ padding: '0' }}>
        {children}
      </div>
    </div>
  )
}

/* Sidebar used in all mockups */
function MockSidebar({ active }: { active: string }) {
  const sections = [
    { label: 'OVERVIEW', items: [{ name: 'Dashboard', icon: 'grid' }, { name: 'Analytics', icon: 'chart' }] },
    { label: 'QUIZZES', items: [{ name: 'All quizzes', icon: 'list' }, { name: 'Templates', icon: 'layout' }, { name: 'Quiz editor', icon: 'edit' }] },
    { label: 'LEADS', items: [{ name: 'All leads', icon: 'users' }, { name: 'Segmentation', icon: 'filter' }] },
    { label: 'ENGAGE', items: [{ name: 'Email Campaigns', icon: 'mail' }, { name: 'Automations', icon: 'zap' }] },
  ]
  return (
    <div style={{
      width: 220,
      minWidth: 220,
      background: C.BG,
      borderRight: `1px solid ${C.GRAY_200}`,
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 0',
      height: '100%',
    }}>
      <div style={{ padding: '0 16px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: C.ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
        </div>
        <span style={{ fontWeight: 600, fontSize: 14, color: C.GRAY_900, fontFamily: C.FONT }}>Squarespell</span>
      </div>
      {sections.map(s => (
        <div key={s.label} style={{ marginBottom: 16 }}>
          <div style={{ padding: '0 16px', fontSize: 11, fontWeight: 500, color: C.GRAY_400, marginBottom: 4, letterSpacing: '0.05em', fontFamily: C.FONT }}>{s.label}</div>
          {s.items.map(item => {
            const isActive = item.name === active
            return (
              <div key={item.name} style={{
                padding: '7px 16px',
                fontSize: 13,
                color: isActive ? C.ACCENT : C.GRAY_600,
                fontWeight: isActive ? 600 : 400,
                background: isActive ? C.ACCENT_LIGHT : 'transparent',
                borderRight: isActive ? `2px solid ${C.ACCENT}` : '2px solid transparent',
                fontFamily: C.FONT,
                cursor: 'default',
              }}>
                {item.name}
              </div>
            )
          })}
        </div>
      ))}
      <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: `1px solid ${C.GRAY_200}` }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: C.GRAY_400, marginBottom: 6, letterSpacing: '0.05em', fontFamily: C.FONT }}>COMMERCE</div>
        <div style={{ padding: '7px 0', fontSize: 13, color: C.GRAY_600, fontFamily: C.FONT }}>Products</div>
      </div>
    </div>
  )
}

function MockTopBar() {
  return (
    <div style={{
      height: 52,
      borderBottom: `1px solid ${C.GRAY_200}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: C.GRAY_50,
        borderRadius: 8,
        border: `1px solid ${C.GRAY_200}`,
        padding: '6px 12px',
        width: 240,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_400} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <span style={{ fontSize: 13, color: C.GRAY_400, fontFamily: C.FONT }}>Search anything...</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: C.GRAY_400, background: C.GRAY_100, borderRadius: 4, padding: '2px 6px', fontFamily: C.FONT }}>Cmd+K</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.GRAY_200}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_500} strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 600, fontFamily: C.FONT }}>J</div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      flex: 1,
      background: C.BG,
      borderRadius: 8,
      border: `1px solid ${C.GRAY_200}`,
      padding: '14px 16px',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: C.GRAY_500, fontWeight: 500, marginBottom: 4, fontFamily: C.FONT, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || C.GRAY_900, fontFamily: C.FONT }}>{value}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Dashboard Mockup
   ───────────────────────────────────────────── */
function DashboardMockup() {
  return (
    <BrowserChrome url="app.squarespell.com/dashboard">
      <div style={{ display: 'flex', height: 580, background: C.GRAY_50 }}>
        <MockSidebar active="Dashboard" />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <MockTopBar />
          <div style={{ flex: 1, padding: '20px 24px', overflow: 'hidden' }}>
            {/* Welcome header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>Welcome back, Jessica <span role="img" aria-label="wave">&#128075;</span></div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.GRAY_200}`, fontSize: 12, color: C.GRAY_600, fontFamily: C.FONT, background: C.BG }}>Last 30 days</div>
                <div style={{ padding: '6px 14px', borderRadius: 8, background: C.ACCENT, color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: C.FONT }}>+ Create quiz</div>
              </div>
            </div>
            {/* Stat cards */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <StatCard label="Total views" value="45" />
              <StatCard label="Leads captured" value="11" />
              <StatCard label="Completion rate" value="55.6%" />
              <StatCard label="Lead rate" value="24.4%" />
              <StatCard label="Active quizzes" value="3/20" />
            </div>
            {/* Performance chart */}
            <div style={{ background: C.BG, borderRadius: 8, border: `1px solid ${C.GRAY_200}`, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>Performance overview</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Daily', 'Weekly', 'Monthly'].map((t, i) => (
                    <div key={t} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, fontFamily: C.FONT, background: i === 0 ? C.ACCENT_LIGHT : 'transparent', color: i === 0 ? C.ACCENT : C.GRAY_500, cursor: 'default' }}>{t}</div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 2, background: C.ACCENT, borderRadius: 1 }} /><span style={{ fontSize: 11, color: C.GRAY_500, fontFamily: C.FONT }}>Views</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 2, background: C.GRAY_300, borderRadius: 1, borderTop: `1px dashed ${C.GRAY_400}` }} /><span style={{ fontSize: 11, color: C.GRAY_500, fontFamily: C.FONT }}>Leads</span></div>
              </div>
              {/* SVG chart */}
              <svg width="100%" height="120" viewBox="0 0 500 120" preserveAspectRatio="none" style={{ display: 'block' }}>
                <polyline fill="none" stroke={C.ACCENT} strokeWidth="2" points="0,100 50,90 100,70 150,80 200,50 250,60 300,40 350,45 400,30 450,35 500,20" />
                <polyline fill="none" stroke={C.GRAY_300} strokeWidth="1.5" strokeDasharray="4,3" points="0,110 50,105 100,95 150,100 200,85 250,90 300,80 350,82 400,75 450,78 500,70" />
              </svg>
            </div>
            {/* Bottom 3 cards */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, background: C.BG, borderRadius: 8, border: `1px solid ${C.GRAY_200}`, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900, marginBottom: 10, fontFamily: C.FONT }}>Top quizzes</div>
                {[{ n: 'Find Your Perfect...', c: '32.5%' }, { n: 'Photography Style', c: '28.1%' }, { n: 'Fitness Goal Quiz', c: '18.7%' }].map((q, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, fontFamily: C.FONT }}>
                    <span style={{ color: C.GRAY_700 }}>{i + 1}. {q.n}</span>
                    <span style={{ color: C.ACCENT, fontWeight: 600 }}>{q.c}</span>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, background: C.BG, borderRadius: 8, border: `1px solid ${C.GRAY_200}`, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900, marginBottom: 10, fontFamily: C.FONT }}>Conversion funnel</div>
                {[{ l: 'Views', v: 45, w: '100%' }, { l: 'Started', v: 25, w: '56%' }, { l: 'Completed', v: 25, w: '56%' }, { l: 'Leads', v: 11, w: '24%' }].map(b => (
                  <div key={b.l} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.GRAY_600, marginBottom: 2, fontFamily: C.FONT }}><span>{b.l}</span><span>{b.v}</span></div>
                    <div style={{ height: 6, background: C.GRAY_100, borderRadius: 3 }}><div style={{ height: 6, background: C.ACCENT, borderRadius: 3, width: b.w }} /></div>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, background: C.BG, borderRadius: 8, border: `1px solid ${C.GRAY_200}`, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900, marginBottom: 10, fontFamily: C.FONT, alignSelf: 'flex-start' }}>Lead sources</div>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke={C.ACCENT} strokeWidth="8" strokeDasharray="130 201" strokeDashoffset="0" />
                  <circle cx="40" cy="40" r="32" fill="none" stroke={C.PURPLE_500} strokeWidth="8" strokeDasharray="45 201" strokeDashoffset="-130" />
                  <circle cx="40" cy="40" r="32" fill="none" stroke={C.WARNING_500} strokeWidth="8" strokeDasharray="26 201" strokeDashoffset="-175" />
                </svg>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  {[{ c: C.ACCENT, l: 'Direct' }, { c: C.PURPLE_500, l: 'Social' }, { c: C.WARNING_500, l: 'Email' }].map(s => (
                    <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.GRAY_600, fontFamily: C.FONT }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: s.c }} />{s.l}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
}

/* ─────────────────────────────────────────────
   All Quizzes Mockup
   ───────────────────────────────────────────── */
function QuizzesMockup() {
  const quizzes = [
    { name: 'Find Your Perfect Product', views: 22, leads: 7, conv: '31.8%', color: '#7F56D9' },
    { name: 'Photography Style Quiz', views: 15, leads: 3, conv: '20.0%', color: '#F79009' },
    { name: 'Fitness Goal Quiz', views: 8, leads: 1, conv: '12.5%', color: '#12B76A' },
  ]
  return (
    <BrowserChrome url="app.squarespell.com/dashboard/quizzes">
      <div style={{ display: 'flex', height: 520, background: C.GRAY_50 }}>
        <MockSidebar active="All quizzes" />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <MockTopBar />
          <div style={{ flex: 1, padding: '20px 24px', overflow: 'hidden' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>All quizzes</div>
              <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>Create, edit, and publish your AI-powered quiz funnels.</div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <StatCard label="Total quizzes" value="3" />
              <StatCard label="Live quizzes" value="3" />
              <StatCard label="Drafts" value="0" />
              <StatCard label="Total views" value="45" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
              {['All', 'Live', 'Draft', 'Archived'].map((t, i) => (
                <div key={t} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: C.FONT, background: i === 0 ? C.GRAY_900 : 'transparent', color: i === 0 ? '#fff' : C.GRAY_500, cursor: 'default' }}>{t}</div>
              ))}
              <div style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 6, border: `1px solid ${C.GRAY_200}`, fontSize: 12, color: C.GRAY_600, fontFamily: C.FONT, background: C.BG }}>Recently updated</div>
            </div>
            <div style={{ background: C.BG, borderRadius: 8, border: `1px solid ${C.GRAY_200}` }}>
              {quizzes.map((q, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i < quizzes.length - 1 ? `1px solid ${C.GRAY_100}` : 'none', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: q.color, opacity: 0.15, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: q.color, fontFamily: C.FONT }}>{q.name[0]}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>{q.name}</div>
                    <div style={{ fontSize: 11, color: C.GRAY_500, fontFamily: C.FONT }}>{q.views} views - {q.leads} leads - {q.conv} conversion</div>
                  </div>
                  <div style={{ padding: '3px 8px', borderRadius: 10, background: C.SUCCESS_LIGHT, fontSize: 11, color: C.SUCCESS, fontWeight: 500, fontFamily: C.FONT }}>live</div>
                  <div style={{ fontSize: 11, color: C.GRAY_400, fontFamily: C.FONT }}>2w ago</div>
                  <div style={{ color: C.GRAY_400, cursor: 'default' }}>...</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
}

/* ─────────────────────────────────────────────
   Leads Mockup
   ───────────────────────────────────────────── */
function LeadsMockup() {
  const leads = [
    { name: 'Sarah Chen', email: 's.chen@email.com', quiz: 'Find Your Perfect...', score: '88/100', intent: 'High intent', color: '#7F56D9', dotColor: C.ERROR_500, time: '2 days ago' },
    { name: 'Mike Johnson', email: 'mike.j@company.co', quiz: 'Find Your Perfect...', score: '91/100', intent: 'High intent', color: '#F79009', dotColor: C.ERROR_500, time: '4 days ago' },
    { name: 'Emma Wilson', email: 'emma.w@mail.com', quiz: 'Find Your Perfect...', score: '72/100', intent: 'High intent', color: '#12B76A', dotColor: C.ERROR_500, time: '1 week ago' },
    { name: 'David Park', email: 'dpark@inbox.com', quiz: 'Photography Style', score: '45/100', intent: 'New', color: '#0D7377', dotColor: C.ACCENT, time: '1 week ago' },
    { name: 'Lisa Adams', email: 'l.adams@web.io', quiz: 'Photography Style', score: '38/100', intent: 'New', color: '#F04438', dotColor: C.ACCENT, time: '2 weeks ago' },
  ]
  return (
    <BrowserChrome url="app.squarespell.com/dashboard/leads">
      <div style={{ display: 'flex', height: 540, background: C.GRAY_50 }}>
        <MockSidebar active="All leads" />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <MockTopBar />
          <div style={{ flex: 1, padding: '20px 24px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>Leads</div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>Track and manage people who completed your quizzes</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.GRAY_200}`, fontSize: 12, color: C.GRAY_600, fontFamily: C.FONT, background: C.BG }}>Export CSV</div>
                <div style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.GRAY_200}`, fontSize: 12, color: C.GRAY_600, fontFamily: C.FONT, background: C.BG }}>This 30 days</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <StatCard label="Total Leads" value="5" />
              <StatCard label="New This Week" value="0" />
              <StatCard label="Quizzes with Leads" value="1" />
              <StatCard label="High Intent Leads" value="3" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[{ l: 'All 5', a: true }, { l: 'High intent 3', a: false }, { l: 'New 2', a: false }, { l: 'Low score 0', a: false }].map(t => (
                <div key={t.l} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: C.FONT, background: t.a ? C.GRAY_900 : 'transparent', color: t.a ? '#fff' : C.GRAY_500 }}>{t.l}</div>
              ))}
              <div style={{ marginLeft: 'auto', fontSize: 12, color: C.GRAY_500, fontFamily: C.FONT }}>Sort by: Newest</div>
            </div>
            <div style={{ background: C.BG, borderRadius: 8, border: `1px solid ${C.GRAY_200}` }}>
              {leads.map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: i < leads.length - 1 ? `1px solid ${C.GRAY_100}` : 'none', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: l.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 600, fontFamily: C.FONT }}>{l.name.split(' ').map(w => w[0]).join('')}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: C.GRAY_500, fontFamily: C.FONT }}>{l.email}</div>
                  </div>
                  <div style={{ fontSize: 11, color: C.GRAY_500, fontFamily: C.FONT }}>QUIZ: {l.quiz}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>{l.score}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 10, background: C.GRAY_50, fontSize: 11, color: C.GRAY_600, fontFamily: C.FONT }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: l.dotColor }} />{l.intent}
                  </div>
                  <div style={{ fontSize: 11, color: C.GRAY_400, fontFamily: C.FONT }}>{l.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
}

/* ─────────────────────────────────────────────
   Email Campaigns Mockup
   ───────────────────────────────────────────── */
function EmailMockup() {
  const campaigns = [
    { name: 'Welcome Series - New Leads', status: 'Sent', statusColor: C.SUCCESS, opens: '68%', clicks: '24%', subs: 11, time: '3 days ago' },
    { name: 'Product Recommendations', status: 'Scheduled', statusColor: C.WARNING_500, opens: '-', clicks: '-', subs: 5, time: 'Tomorrow' },
    { name: 'Re-engagement Campaign', status: 'Draft', statusColor: C.GRAY_400, opens: '-', clicks: '-', subs: 0, time: '1 week ago' },
  ]
  return (
    <BrowserChrome url="app.squarespell.com/dashboard/campaigns">
      <div style={{ display: 'flex', height: 480, background: C.GRAY_50 }}>
        <MockSidebar active="Email Campaigns" />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <MockTopBar />
          <div style={{ flex: 1, padding: '20px 24px', overflow: 'hidden' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>Email Campaigns</div>
              <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>Create and send targeted email campaigns to your leads</div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <StatCard label="Campaigns Sent" value="1" />
              <StatCard label="Avg Open Rate" value="68%" />
              <StatCard label="Avg Click Rate" value="24%" />
              <StatCard label="Total Subscribers" value="11" />
            </div>
            <div style={{ background: C.BG, borderRadius: 8, border: `1px solid ${C.GRAY_200}` }}>
              <div style={{ display: 'flex', padding: '10px 16px', borderBottom: `1px solid ${C.GRAY_200}`, fontSize: 11, fontWeight: 500, color: C.GRAY_500, fontFamily: C.FONT }}>
                <div style={{ flex: 2 }}>Campaign</div>
                <div style={{ width: 80, textAlign: 'center' }}>Status</div>
                <div style={{ width: 70, textAlign: 'center' }}>Opens</div>
                <div style={{ width: 70, textAlign: 'center' }}>Clicks</div>
                <div style={{ width: 60, textAlign: 'center' }}>Subs</div>
                <div style={{ width: 80, textAlign: 'right' }}>Date</div>
              </div>
              {campaigns.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i < campaigns.length - 1 ? `1px solid ${C.GRAY_100}` : 'none', fontSize: 13, fontFamily: C.FONT }}>
                  <div style={{ flex: 2, fontWeight: 600, color: C.GRAY_900 }}>{c.name}</div>
                  <div style={{ width: 80, textAlign: 'center' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 500, color: c.statusColor, background: c.status === 'Sent' ? C.SUCCESS_LIGHT : C.GRAY_50 }}>{c.status}</span>
                  </div>
                  <div style={{ width: 70, textAlign: 'center', color: C.GRAY_700 }}>{c.opens}</div>
                  <div style={{ width: 70, textAlign: 'center', color: C.GRAY_700 }}>{c.clicks}</div>
                  <div style={{ width: 60, textAlign: 'center', color: C.GRAY_700 }}>{c.subs}</div>
                  <div style={{ width: 80, textAlign: 'right', color: C.GRAY_400, fontSize: 11 }}>{c.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
}

/* ─────────────────────────────────────────────
   Automations Mockup
   ───────────────────────────────────────────── */
function AutomationsMockup() {
  const flows = [
    { name: 'Welcome Email on Lead Capture', trigger: 'New lead captured', action: 'Send welcome email + product recs', active: true },
    { name: 'High Intent Follow-up', trigger: 'Lead score > 80', action: 'Send personal offer + notify sales', active: true },
    { name: 'Quiz Abandonment Reminder', trigger: 'Quiz started but not completed', action: 'Send reminder email after 24h', active: false },
    { name: 'Weekly Digest', trigger: 'Every Monday 9 AM', action: 'Send performance summary email', active: true },
  ]
  return (
    <BrowserChrome url="app.squarespell.com/dashboard/automations">
      <div style={{ display: 'flex', height: 480, background: C.GRAY_50 }}>
        <MockSidebar active="Automations" />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <MockTopBar />
          <div style={{ flex: 1, padding: '20px 24px', overflow: 'hidden' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>Automations</div>
              <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>Set up automated workflows triggered by quiz events</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {flows.map((f, i) => (
                <div key={i} style={{ background: C.BG, borderRadius: 8, border: `1px solid ${C.GRAY_200}`, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>{f.name}</div>
                    <div style={{ width: 34, height: 18, borderRadius: 9, background: f.active ? C.ACCENT : C.GRAY_300, position: 'relative' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: f.active ? 18 : 2, transition: 'left 0.2s' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: C.FONT }}>
                    <div style={{ padding: '4px 8px', borderRadius: 6, background: C.ACCENT_LIGHT, color: C.ACCENT, fontWeight: 500 }}>{f.trigger}</div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_400} strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    <div style={{ padding: '4px 8px', borderRadius: 6, background: C.GRAY_50, color: C.GRAY_600, fontWeight: 500 }}>{f.action}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
}

/* ─────────────────────────────────────────────
   Analytics Mockup
   ───────────────────────────────────────────── */
function AnalyticsMockup() {
  return (
    <BrowserChrome url="app.squarespell.com/dashboard/analytics">
      <div style={{ display: 'flex', height: 500, background: C.GRAY_50 }}>
        <MockSidebar active="Analytics" />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <MockTopBar />
          <div style={{ flex: 1, padding: '20px 24px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>Analytics</div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>Detailed performance insights across all quizzes</div>
              </div>
              <div style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.GRAY_200}`, fontSize: 12, color: C.GRAY_600, fontFamily: C.FONT, background: C.BG }}>Last 30 days</div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <StatCard label="Total Views" value="45" />
              <StatCard label="Unique Visitors" value="38" />
              <StatCard label="Avg. Time" value="2m 34s" />
              <StatCard label="Bounce Rate" value="12.3%" />
            </div>
            {/* Quiz comparison chart */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 2, background: C.BG, borderRadius: 8, border: `1px solid ${C.GRAY_200}`, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900, marginBottom: 14, fontFamily: C.FONT }}>Quiz performance comparison</div>
                <div style={{ display: 'flex', gap: 16, height: 120 }}>
                  {[{ name: 'Product Finder', views: 22, leads: 7, h: 100 }, { name: 'Photo Style', views: 15, leads: 3, h: 68 }, { name: 'Fitness Goal', views: 8, leads: 1, h: 36 }].map(q => (
                    <div key={q.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                        <div style={{ width: '30%', height: q.h, background: C.ACCENT, borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
                        <div style={{ width: '30%', height: q.h * (q.leads / q.views), background: C.PURPLE_500, borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
                      </div>
                      <div style={{ fontSize: 10, color: C.GRAY_500, fontFamily: C.FONT, textAlign: 'center' }}>{q.name}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.GRAY_500, fontFamily: C.FONT }}><div style={{ width: 8, height: 8, borderRadius: 2, background: C.ACCENT, opacity: 0.8 }} />Views</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.GRAY_500, fontFamily: C.FONT }}><div style={{ width: 8, height: 8, borderRadius: 2, background: C.PURPLE_500, opacity: 0.8 }} />Leads</div>
                </div>
              </div>
              <div style={{ flex: 1, background: C.BG, borderRadius: 8, border: `1px solid ${C.GRAY_200}`, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900, marginBottom: 14, fontFamily: C.FONT }}>Drop-off analysis</div>
                {[{ step: 'Q1', rate: '95%', w: '95%' }, { step: 'Q2', rate: '82%', w: '82%' }, { step: 'Q3', rate: '71%', w: '71%' }, { step: 'Q4', rate: '62%', w: '62%' }, { step: 'Result', rate: '56%', w: '56%' }].map(s => (
                  <div key={s.step} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.GRAY_600, marginBottom: 2, fontFamily: C.FONT }}><span>{s.step}</span><span>{s.rate}</span></div>
                    <div style={{ height: 5, background: C.GRAY_100, borderRadius: 3 }}><div style={{ height: 5, background: C.ACCENT, borderRadius: 3, width: s.w, opacity: 0.7 }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
}

/* ─────────────────────────────────────────────
   Section heading component
   ───────────────────────────────────────────── */
function SectionHeading({ badge, title, subtitle }: { badge?: string; title: string; subtitle: string }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 48px' }}>
      {badge && (
        <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 20, background: C.ACCENT_LIGHT, color: C.ACCENT, fontSize: 13, fontWeight: 600, marginBottom: 16, fontFamily: C.FONT }}>{badge}</div>
      )}
      <h2 style={{ fontSize: 40, fontWeight: 800, color: C.GRAY_900, margin: '0 0 16px', lineHeight: 1.15, fontFamily: C.FONT }}>{title}</h2>
      <p style={{ fontSize: 18, color: C.GRAY_500, margin: 0, lineHeight: 1.6, fontFamily: C.FONT }}>{subtitle}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main Page
   ───────────────────────────────────────────── */
export default function QuizFunnelPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [isYearly, setIsYearly] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = '1';
            (entry.target as HTMLElement).style.transform = 'translateY(0)'
          }
        })
      },
      { threshold: 0.1 }
    )
    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })
    return () => observer.disconnect()
  }, [])

  const addRef = (el: HTMLDivElement | null) => {
    if (el && !sectionRefs.current.includes(el)) {
      sectionRefs.current.push(el)
    }
  }

  const animStyle: React.CSSProperties = {
    opacity: 0,
    transform: 'translateY(30px)',
    transition: 'opacity 0.7s ease, transform 0.7s ease',
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      router.push(QUIZ_BUILDER_PATH + '?url=' + encodeURIComponent(url.trim()))
    } else {
      router.push(QUIZ_BUILDER_PATH)
    }
  }

  const plans = [
    {
      name: 'Core',
      price: isYearly ? 9 : 12,
      originalPrice: isYearly ? 12 : null,
      period: '/mo',
      billedText: isYearly ? 'Billed $108/year' : 'Billed monthly',
      savings: isYearly ? 'Save $36/year' : null,
      desc: 'Build real quiz funnels with branching logic, scoring, and scheduling.',
      limits: [{ value: '5', label: 'QUIZZES' }, { value: '1,000', label: 'LEADS/MO' }, { value: '1,000', label: 'EMAILS/MO' }],
      included: [
        'AI quiz generation from your URL',
        'Squarespace one-click connect',
        'Remove Squarespell branding',
        'Branching logic',
        'Weighted scoring',
        'Quiz scheduling',
        'Standard analytics',
        'Lead dashboard + CSV export',
        'Lead & email add-on packs',
      ],
      excluded: [
        'A/B testing',
        'Email sequences',
        'Integrations (Zapier, Mailchimp, etc.)',
        'Advanced analytics',
        'Custom CSS',
        'White-label / Custom domain',
        'Team seats',
      ],
      nudge: 'Need A/B testing or integrations? Upgrade to Pro',
      featured: false,
    },
    {
      name: 'Pro',
      price: isYearly ? 16 : 19,
      originalPrice: isYearly ? 19 : null,
      period: '/mo',
      billedText: isYearly ? 'Billed $192/year' : 'Billed monthly',
      savings: isYearly ? 'Save $36/year' : null,
      desc: 'Full power for serious lead generation - unlimited quizzes, integrations, and A/B testing.',
      limits: [{ value: 'Unlimited', label: 'QUIZZES' }, { value: '3,000', label: 'LEADS/MO' }, { value: '3,000', label: 'EMAILS/MO' }],
      included: [
        'Everything in Core',
        'A/B testing',
        'Email sequences',
        'All integrations (Zapier, Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets)',
        'Webhooks',
        'Advanced analytics',
        'Per-question drop-off analysis',
        'Custom CSS',
        'Priority email support',
        'Lead & email add-on packs',
      ],
      excluded: [
        'White-label (your brand)',
        'Custom domain for quizzes',
        'Team seats',
        'API access',
        'Dedicated onboarding call',
      ],
      nudge: 'Need white-label or unlimited leads? Upgrade to Business',
      featured: true,
    },
    {
      name: 'Business',
      price: isYearly ? 29 : 35,
      originalPrice: isYearly ? 35 : null,
      period: '/mo',
      billedText: isYearly ? 'Billed $348/year' : 'Billed monthly',
      savings: isYearly ? 'Save $72/year' : null,
      desc: 'Unlimited everything with white-label, custom domains, team seats, and API access.',
      limits: [{ value: 'Unlimited', label: 'QUIZZES' }, { value: 'Unlimited', label: 'LEADS/MO' }, { value: 'Unlimited', label: 'EMAILS/MO' }],
      included: [
        'Everything in Pro',
        'White-label (your brand on everything)',
        'Custom domain for quizzes',
        'Team seats (3 included, $5/seat extra)',
        'API access',
        'Priority support (email + chat)',
        'Dedicated onboarding call',
        'Unlimited leads & emails',
        'Unlimited quizzes',
      ],
      excluded: [],
      nudge: null,
      featured: false,
    },
  ]

  const faqs = [
    { q: 'How does Squarespell integrate with Squarespace?', a: 'Squarespell embeds directly into your Squarespace site via a simple code snippet. No plugins, no complicated setup. Just paste one line of code into your site header and your quizzes appear right on your pages.' },
    { q: 'Can I customize the quiz design to match my brand?', a: 'Absolutely. Every quiz automatically inherits your Squarespace site fonts, colors, and styling. You can also fine-tune individual elements like button colors, backgrounds, and typography to create a pixel-perfect match.' },
    { q: 'What happens when someone completes a quiz?', a: 'Their responses are captured as a lead in your dashboard with a score based on their answers. You can trigger automated welcome emails, segment them by intent level, and export them as CSV for your own tools.' },
    { q: 'Do I need coding experience?', a: 'Not at all. The quiz builder is entirely visual with drag-and-drop blocks. You can also use our AI assistant to generate a complete quiz from a simple text prompt describing what you want.' },
    { q: 'Is there a free trial?', a: 'Yes. Every plan includes a 14-day free trial with full access to all features. No credit card required to start.' },
    { q: 'Can I switch plans later?', a: 'Yes, you can upgrade or downgrade at any time. Changes take effect immediately, and billing is prorated so you only pay for what you use.' },
  ]

  const features = [
    { icon: '&#9997;', title: 'AI Quiz Builder', desc: 'Generate a complete quiz from a text prompt. Add questions, logic branches, and result pages in minutes.' },
    { icon: '&#127912;', title: 'Brand-Matched Design', desc: 'Quizzes inherit your Squarespace fonts, colors, and styling automatically. No design work needed.' },
    { icon: '&#128202;', title: 'Real-time Analytics', desc: 'Track views, completions, lead rates, and conversion funnels with a dashboard built for clarity.' },
    { icon: '&#128274;', title: 'Lead Capture & Scoring', desc: 'Every quiz response is captured as a scored lead. Segment by intent level and prioritize follow-ups.' },
    { icon: '&#128231;', title: 'Email Campaigns', desc: 'Send targeted emails based on quiz results. Personalized recommendations that actually convert.' },
    { icon: '&#9889;', title: 'Automations', desc: 'Set up trigger-based workflows. Welcome emails, follow-ups, and reminders run on autopilot.' },
    { icon: '&#128256;', title: 'A/B Testing', desc: 'Test different questions, headlines, and result pages to find what converts best for your audience.' },
    { icon: '&#128268;', title: 'Squarespace Native', desc: 'Built specifically for Squarespace. One code snippet to embed. No third-party plugins or iframes.' },
    { icon: '&#128640;', title: 'Templates Library', desc: 'Start from industry-specific templates for photographers, fitness coaches, e-commerce, and more.' },
  ]

  const addOnPacks = [
    { category: 'Lead Packs', items: [{ label: '+500 leads/mo', price: '$3/mo' }, { label: '+1,500 leads/mo', price: '$7/mo' }, { label: '+3,000 leads/mo', price: '$12/mo' }] },
    { category: 'Email Packs', items: [{ label: '+1,000 emails/mo', price: '$3/mo' }, { label: '+5,000 emails/mo', price: '$7/mo' }, { label: '+10,000 emails/mo', price: '$12/mo' }] },
  ]

  return (
    <div style={{ fontFamily: C.FONT, background: C.BG, color: C.GRAY_900, minHeight: '100vh' }}>
      {/* ─── NAV ─── */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.GRAY_200}`,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900 }}>Squarespell</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {['Features', 'Templates', 'Pricing'].map(link => (
              <a key={link} href={`#${link.toLowerCase()}`} style={{ fontSize: 14, fontWeight: 500, color: C.GRAY_600, textDecoration: 'none' }}>{link}</a>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="https://app.squarespell.com" style={{ fontSize: 14, fontWeight: 500, color: C.GRAY_700, textDecoration: 'none' }}>Log in</a>
            <a href={QUIZ_BUILDER_PATH} style={{ padding: '8px 18px', borderRadius: 8, background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Get Started Free</a>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section style={{ padding: '100px 32px 60px', textAlign: 'center' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 20, background: C.ACCENT_LIGHT, color: C.ACCENT, fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
            Built for Squarespace
          </div>
          <h1 style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, color: C.GRAY_900, margin: '0 auto 20px', maxWidth: 780 }}>
            Turn visitors into leads with interactive quiz funnels
          </h1>
          <p style={{ fontSize: 20, color: C.GRAY_500, maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.6 }}>
            Build AI-powered quizzes that capture emails, qualify leads, and drive sales. Designed exclusively for Squarespace websites.
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', maxWidth: 520, margin: '0 auto 20px', gap: 0, background: C.BG, borderRadius: 12, border: `2px solid ${C.GRAY_200}`, overflow: 'hidden', boxShadow: C.SHADOW_MD }}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter your Squarespace URL..."
              style={{ flex: 1, padding: '14px 20px', border: 'none', outline: 'none', fontSize: 15, fontFamily: C.FONT, color: C.GRAY_900, background: 'transparent' }}
            />
            <button type="submit" style={{ padding: '14px 28px', background: C.ACCENT, color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, fontFamily: C.FONT, cursor: 'pointer' }}>
              Build My Quiz
            </button>
          </form>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 13, color: C.GRAY_500 }}>
            <span>No credit card required</span>
            <span>14-day free trial</span>
            <span>Setup in 2 minutes</span>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section style={{ padding: '60px 32px 80px', background: C.GRAY_50, borderTop: `1px solid ${C.GRAY_100}`, borderBottom: `1px solid ${C.GRAY_100}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: C.GRAY_400, marginBottom: 32, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Trusted by 2,400+ Squarespace creators worldwide</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 64, flexWrap: 'wrap' }}>
            {[
              { label: '2,400+', sub: 'Active users' },
              { label: '180K+', sub: 'Leads captured' },
              { label: '12K+', sub: 'Quizzes created' },
              { label: '98%', sub: 'Satisfaction rate' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 32, fontWeight: 800, color: C.GRAY_900, fontFamily: C.FONT }}>{s.label}</div>
                <div style={{ fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SHOWCASE 1: DASHBOARD ─── */}
      <section id="features" style={{ padding: '100px 32px' }}>
        <div ref={addRef} style={{ ...animStyle, maxWidth: 1280, margin: '0 auto' }}>
          <SectionHeading
            badge="Command Center"
            title="Everything you need, one dashboard"
            subtitle="See your quiz performance at a glance. Track views, leads, completion rates, and conversion funnels in real time."
          />
          <DashboardMockup />
        </div>
      </section>

      {/* ─── SHOWCASE 2: QUIZ EDITOR ─── */}
      <section style={{ padding: '100px 32px', background: C.GRAY_50 }}>
        <div ref={addRef} style={{ ...animStyle, maxWidth: 1280, margin: '0 auto' }}>
          <SectionHeading
            badge="Quiz Management"
            title="Build, manage, and publish quizzes"
            subtitle="Create AI-powered quizzes in minutes. Track every quiz with live status, views, leads, and conversion rates all in one place."
          />
          <QuizzesMockup />
        </div>
      </section>

      {/* ─── SHOWCASE 3: LEADS ─── */}
      <section style={{ padding: '100px 32px' }}>
        <div ref={addRef} style={{ ...animStyle, maxWidth: 1280, margin: '0 auto' }}>
          <SectionHeading
            badge="Lead Intelligence"
            title="Know your leads before you talk to them"
            subtitle="Every quiz response is captured with a score, intent level, and full answer history. Filter, segment, and export with one click."
          />
          <LeadsMockup />
        </div>
      </section>

      {/* ─── SHOWCASE 4: EMAIL ─── */}
      <section style={{ padding: '100px 32px', background: C.GRAY_50 }}>
        <div ref={addRef} style={{ ...animStyle, maxWidth: 1280, margin: '0 auto' }}>
          <SectionHeading
            badge="Email Campaigns"
            title="Send emails that match their answers"
            subtitle="Create targeted campaigns based on quiz results. Personalized product recommendations, welcome sequences, and follow-ups that convert."
          />
          <EmailMockup />
        </div>
      </section>

      {/* ─── SHOWCASE 5: AUTOMATIONS ─── */}
      <section style={{ padding: '100px 32px' }}>
        <div ref={addRef} style={{ ...animStyle, maxWidth: 1280, margin: '0 auto' }}>
          <SectionHeading
            badge="Automations"
            title="Set it up once, let it run forever"
            subtitle="Trigger automated workflows when leads are captured, scores are high, or quizzes are abandoned. Your marketing runs on autopilot."
          />
          <AutomationsMockup />
        </div>
      </section>

      {/* ─── SHOWCASE 6: ANALYTICS ─── */}
      <section style={{ padding: '100px 32px', background: C.GRAY_50 }}>
        <div ref={addRef} style={{ ...animStyle, maxWidth: 1280, margin: '0 auto' }}>
          <SectionHeading
            badge="Analytics"
            title="Data that tells you what to do next"
            subtitle="Compare quiz performance, identify drop-off points, and understand which questions drive the most conversions."
          />
          <AnalyticsMockup />
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ padding: '100px 32px' }}>
        <div ref={addRef} style={{ ...animStyle, maxWidth: 1280, margin: '0 auto' }}>
          <SectionHeading
            badge="How It Works"
            title="Live in 3 simple steps"
            subtitle="No code, no plugins, no complicated setup. Just paste, publish, and start capturing leads."
          />
          <div style={{ display: 'flex', gap: 32, maxWidth: 960, margin: '0 auto' }}>
            {[
              { step: '1', title: 'Build your quiz', desc: 'Use AI to generate a quiz from a prompt, or start from a template. Add questions, logic, and result pages in the visual editor.' },
              { step: '2', title: 'Embed on your site', desc: 'Copy one line of code and paste it into your Squarespace site header. Your quiz appears instantly on any page.' },
              { step: '3', title: 'Capture and convert', desc: 'Leads flow into your dashboard with scores and segments. Trigger emails and automations automatically.' },
            ].map(s => (
              <div key={s.step} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22, fontWeight: 800, color: C.ACCENT, fontFamily: C.FONT }}>{s.step}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, margin: '0 0 8px', fontFamily: C.FONT }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: C.GRAY_500, lineHeight: 1.6, margin: 0, fontFamily: C.FONT }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section style={{ padding: '100px 32px', background: C.GRAY_50 }}>
        <div ref={addRef} style={{ ...animStyle, maxWidth: 1280, margin: '0 auto' }}>
          <SectionHeading
            title="Everything you need to convert visitors"
            subtitle="A complete toolkit for quiz-based lead generation, built natively for Squarespace."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1080, margin: '0 auto' }}>
            {features.map((f, i) => (
              <div key={i} style={{ background: C.BG, borderRadius: 12, border: `1px solid ${C.GRAY_200}`, padding: '28px 24px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 20 }} dangerouslySetInnerHTML={{ __html: f.icon }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900, margin: '0 0 8px', fontFamily: C.FONT }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: C.GRAY_500, lineHeight: 1.6, margin: 0, fontFamily: C.FONT }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TEMPLATES ─── */}
      <section id="templates" style={{ padding: '100px 32px' }}>
        <div ref={addRef} style={{ ...animStyle, maxWidth: 1280, margin: '0 auto' }}>
          <SectionHeading
            badge="Templates"
            title="Start with a proven template"
            subtitle="Industry-specific quiz templates built to capture leads and drive conversions from day one."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1080, margin: '0 auto' }}>
            {QUIZ_TEMPLATE_CATALOG.slice(0, 6).map((t) => {
              const thumb = getTemplateThumbnail(t.id)
              const count = getTemplateQuestionCount(t.id)
              return (
                <Link
                  key={t.id}
                  href={QUIZ_BUILDER_PATH + '?template=' + t.id}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{
                    background: C.BG,
                    borderRadius: 12,
                    border: `1px solid ${C.GRAY_200}`,
                    overflow: 'hidden',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = C.SHADOW_LG; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
                  >
                    <div style={{
                      height: 160,
                      background: thumb ? `url(${thumb}) center/cover` : `linear-gradient(135deg, ${C.ACCENT_LIGHT}, ${C.BRAND_50})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {!thumb && (
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d={t.iconPath} />
                        </svg>
                      )}
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: C.ACCENT, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: C.FONT }}>{t.category}</div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, margin: '0 0 6px', fontFamily: C.FONT }}>{t.name}</h3>
                      <p style={{ fontSize: 13, color: C.GRAY_500, margin: '0 0 10px', lineHeight: 1.5, fontFamily: C.FONT, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.description}</p>
                      <div style={{ fontSize: 12, color: C.GRAY_400, fontFamily: C.FONT }}>{count} questions</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" style={{ padding: '100px 32px', background: C.GRAY_50 }}>
        <div ref={addRef} style={{ ...animStyle, maxWidth: 1280, margin: '0 auto' }}>
          <SectionHeading
            badge="Pricing"
            title="Simple, transparent pricing"
            subtitle="Start free, upgrade when you need to. Every plan includes a 14-day trial."
          />
          {/* Toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 48 }}>
            <span style={{ fontSize: 14, fontWeight: isYearly ? 400 : 600, color: isYearly ? C.GRAY_500 : C.GRAY_900, fontFamily: C.FONT, padding: '8px 16px', borderRadius: 20, background: !isYearly ? C.GRAY_100 : 'transparent', cursor: 'pointer' }} onClick={() => setIsYearly(false)}>Monthly</span>
            <span onClick={() => setIsYearly(true)} style={{ fontSize: 14, fontWeight: isYearly ? 600 : 400, color: isYearly ? '#fff' : C.GRAY_500, fontFamily: C.FONT, padding: '8px 16px', borderRadius: 20, background: isYearly ? C.ACCENT : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              Annual {isYearly && <span style={{ padding: '2px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 600 }}>Save up to 25%</span>}
            </span>
            {isYearly && <span style={{ fontSize: 13, color: C.ACCENT, fontWeight: 500, fontFamily: C.FONT }}>Save up to $72/year</span>}
          </div>
          {/* Plans */}
          <div style={{ display: 'flex', gap: 24, maxWidth: 1080, margin: '0 auto 60px', alignItems: 'stretch' }}>
            {plans.map(p => (
              <div key={p.name} style={{
                flex: 1,
                background: C.BG,
                borderRadius: 16,
                border: p.featured ? `2px solid ${C.ACCENT}` : `1px solid ${C.GRAY_200}`,
                padding: '32px 28px 28px',
                position: 'relative',
                boxShadow: p.featured ? C.SHADOW_LG : C.SHADOW_XS,
                display: 'flex',
                flexDirection: 'column' as const,
              }}>
                {p.featured && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 14px', borderRadius: 12, background: C.ACCENT, color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: C.FONT, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>MOST POPULAR</div>
                )}
                <h3 style={{ fontSize: 22, fontWeight: 700, color: C.GRAY_900, margin: '0 0 6px', fontFamily: C.FONT }}>{p.name}</h3>
                <p style={{ fontSize: 13, color: C.GRAY_500, margin: '0 0 20px', fontFamily: C.FONT, lineHeight: 1.5 }}>{p.desc}</p>
                {/* Price */}
                <div style={{ marginBottom: 4 }}>
                  {p.originalPrice && <span style={{ fontSize: 14, color: C.GRAY_400, textDecoration: 'line-through', marginRight: 6, fontFamily: C.FONT }}>${p.originalPrice}</span>}
                  <span style={{ fontSize: 48, fontWeight: 800, color: C.GRAY_900, fontFamily: C.FONT }}>${p.price}</span>
                  <span style={{ fontSize: 15, color: C.GRAY_500, fontFamily: C.FONT }}>{p.period}</span>
                </div>
                <div style={{ fontSize: 12, color: C.GRAY_500, fontFamily: C.FONT, marginBottom: 4 }}>{p.billedText}</div>
                {p.savings && <div style={{ fontSize: 12, color: C.SUCCESS, fontWeight: 500, fontFamily: C.FONT, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.SUCCESS} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {p.savings}
                </div>}
                {!p.savings && <div style={{ height: 16, marginBottom: 16 }} />}
                {/* Limits row */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: `1px solid ${C.GRAY_200}`, borderRadius: 10, overflow: 'hidden' }}>
                  {p.limits.map((lim, li) => (
                    <div key={li} style={{ flex: 1, padding: '12px 8px', textAlign: 'center', borderRight: li < 2 ? `1px solid ${C.GRAY_200}` : 'none', background: p.featured ? C.ACCENT_LIGHT : C.GRAY_50 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>{lim.value}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: C.GRAY_500, fontFamily: C.FONT, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{lim.label}</div>
                    </div>
                  ))}
                </div>
                {/* CTA */}
                <a href={QUIZ_BUILDER_PATH} style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px 0',
                  borderRadius: 8,
                  background: p.featured ? C.ACCENT : 'transparent',
                  color: p.featured ? '#fff' : C.GRAY_900,
                  border: p.featured ? 'none' : `1px solid ${C.GRAY_300}`,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontFamily: C.FONT,
                  marginBottom: 24,
                }}>
                  Start free trial
                </a>
                {/* Included features */}
                <div style={{ fontSize: 11, fontWeight: 600, color: C.ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, fontFamily: C.FONT }}>INCLUDED</div>
                <div style={{ flex: 1 }}>
                  {p.included.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, fontSize: 13, color: C.GRAY_700, fontFamily: C.FONT }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.SUCCESS_500} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 16, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </div>
                  ))}
                </div>
                {/* Excluded features */}
                {p.excluded.length > 0 && (
                  <div style={{ borderTop: `1px solid ${C.GRAY_200}`, paddingTop: 16, marginTop: 12 }}>
                    {p.excluded.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, fontSize: 13, color: C.GRAY_400, fontFamily: C.FONT }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_300} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 14, marginTop: 2 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        {f}
                      </div>
                    ))}
                  </div>
                )}
                {/* Upgrade nudge */}
                {p.nudge && (
                  <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: C.ACCENT_LIGHT, border: `1px solid ${C.BRAND_50}`, fontSize: 12, color: C.ACCENT, fontWeight: 500, fontFamily: C.FONT, textAlign: 'center' }}>
                    {p.nudge} &rarr;
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Add-on packs */}
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: C.GRAY_900, textAlign: 'center', margin: '0 0 24px', fontFamily: C.FONT }}>Need more? Add extra capacity</h3>
            <div style={{ display: 'flex', gap: 24 }}>
              {addOnPacks.map(pack => (
                <div key={pack.category} style={{ flex: 1, background: C.BG, borderRadius: 12, border: `1px solid ${C.GRAY_200}`, padding: '20px 24px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.GRAY_900, marginBottom: 14, fontFamily: C.FONT }}>{pack.category}</div>
                  {pack.items.map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.GRAY_100}`, fontSize: 13, fontFamily: C.FONT }}>
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

      {/* ─── FAQ ─── */}
      <section style={{ padding: '100px 32px' }}>
        <div ref={addRef} style={{ ...animStyle, maxWidth: 1280, margin: '0 auto' }}>
          <SectionHeading
            title="Frequently asked questions"
            subtitle="Everything you need to know about Squarespell quiz funnels."
          />
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ borderBottom: `1px solid ${C.GRAY_200}` }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    display: 'flex',
                    width: '100%',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: C.FONT,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.GRAY_900, textAlign: 'left' }}>{faq.q}</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_400} strokeWidth="2" strokeLinecap="round" style={{ minWidth: 20, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div style={{ paddingBottom: 20, fontSize: 14, color: C.GRAY_500, lineHeight: 1.7, fontFamily: C.FONT }}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section style={{ padding: '100px 32px', background: C.GRAY_900 }}>
        <div ref={addRef} style={{ ...animStyle, maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: '#fff', margin: '0 0 16px', lineHeight: 1.15, fontFamily: C.FONT }}>
            Ready to turn visitors into leads?
          </h2>
          <p style={{ fontSize: 18, color: C.GRAY_400, margin: '0 0 40px', lineHeight: 1.6, fontFamily: C.FONT }}>
            Join 2,400+ Squarespace creators already using Squarespell to grow their business with quiz funnels.
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', maxWidth: 520, margin: '0 auto 20px', gap: 0, background: C.GRAY_800, borderRadius: 12, border: `1px solid ${C.GRAY_700}`, overflow: 'hidden' }}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter your Squarespace URL..."
              style={{ flex: 1, padding: '14px 20px', border: 'none', outline: 'none', fontSize: 15, fontFamily: C.FONT, color: '#fff', background: 'transparent' }}
            />
            <button type="submit" style={{ padding: '14px 28px', background: C.ACCENT, color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, fontFamily: C.FONT, cursor: 'pointer' }}>
              Get Started Free
            </button>
          </form>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 13, color: C.GRAY_500 }}>
            <span>No credit card required</span>
            <span>14-day free trial</span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ padding: '60px 32px 40px', borderTop: `1px solid ${C.GRAY_200}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 40 }}>
            <div style={{ maxWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: C.ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>Squarespell</span>
              </div>
              <p style={{ fontSize: 13, color: C.GRAY_500, lineHeight: 1.6, fontFamily: C.FONT }}>The quiz funnel builder made for Squarespace. Capture leads, qualify prospects, and grow your business.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Templates', 'Pricing', 'Changelog'] },
              { title: 'Resources', links: ['Documentation', 'Blog', 'Help Center', 'API'] },
              { title: 'Company', links: ['About', 'Contact', 'Privacy', 'Terms'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900, marginBottom: 12, fontFamily: C.FONT }}>{col.title}</div>
                {col.links.map(link => (
                  <div key={link} style={{ fontSize: 13, color: C.GRAY_500, marginBottom: 8, fontFamily: C.FONT, cursor: 'pointer' }}>{link}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${C.GRAY_200}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: C.GRAY_400, fontFamily: C.FONT }}>2025 Squarespell. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 16 }}>
              {['Twitter', 'LinkedIn', 'YouTube'].map(s => (
                <span key={s} style={{ fontSize: 13, color: C.GRAY_400, fontFamily: C.FONT, cursor: 'pointer' }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

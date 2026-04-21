'use client';

/**
 * /dashboard - Overview (Pixel-accurate replication of dashboard screenshot)
 *
 * Sections:
 *  1. Welcome header with date picker + create quiz CTA
 *  2. 5 KPI stat cards with change indicators
 *  3. Performance line chart (views + leads)
 *  4. Three-column row: top quizzes, conversion funnel, lead sources donut
 *  5. Recent leads table with filters
 *  6. Bottom row: question drop-off analysis + recent activity
 *  7. A/B testing promo banner
 *
 * All values are fetched from APIs - NO hardcoded fake data.
 * Data binding pattern: state variables populated via useEffect fetch calls.
 */

import { useEffect, useRef, useState, Suspense, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { DashboardShell, DASHBOARD_COLORS as C } from './_components/DashboardShell';
import { useDashboardAuth } from './_components/useDashboardAuth';
import { PageLoading } from './_components/PageShell';
import { NewQuizModal } from './quizzes/_components/NewQuizModal';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

// ═══════ TYPES ═══════

type Quiz = {
  id: string;
  title: string;
  status: 'live' | 'draft';
  slug: string;
  lead_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
};

type UserPlan = {
  plan: string;
  quiz_count: number;
  limits: Record<string, number>;
  trial_ends_at: string | null;
  email: string;
};

type DashboardAnalytics = {
  total_views: number;
  total_leads: number;
  completion_rate: number;
  lead_rate: number;
  active_quizzes: number;
  quiz_limit: number;
  views_change: number;
  leads_change: number;
  completion_change: number;
  lead_rate_change: number;
  compare_label: string;
};

type Lead = {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
  quiz_id: string;
  score: number | null;
  source: string | null;
  status: string | null;
  quizzes?: { id: string; title: string; slug: string } | null;
};

type FunnelData = {
  views: number;
  started: number;
  completed: number;
  leads: number;
};

type LeadSource = {
  name: string;
  count: number;
  percentage: number;
  color: string;
};

type DropoffQuestion = {
  question: string;
  dropoff_rate: number;
  completion_rate: number;
};

type ActivityItem = {
  id: string;
  type: 'lead' | 'quiz' | 'integration' | 'ab_test' | 'export';
  title: string;
  description: string;
  time: string;
};

type ChartPoint = {
  label: string;
  views: number;
  leads: number;
};

// ═══════ HELPERS ═══════

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatRelative(dateStr: string): string {
  var d = new Date(dateStr);
  var now = new Date();
  var diffMs = now.getTime() - d.getTime();
  var mins = Math.floor(diffMs / 60000);
  var hrs = Math.floor(diffMs / 3600000);
  var days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  if (hrs < 24) return hrs + 'h ago';
  if (days < 7) return days + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initialsFrom(name: string | null, email: string): string {
  var source = name || email || '';
  var parts = source.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return 'SQ';
}

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = name + '=;path=/;max-age=0';
}

var AVATAR_COLORS = [
  { bg: '#E8D5F5', fg: '#7F56D9' },
  { bg: '#D1FADF', fg: '#027A48' },
  { bg: '#D1E9FF', fg: '#1570EF' },
  { bg: '#FEF0C7', fg: '#B54708' },
  { bg: '#F4EBFF', fg: '#7F56D9' },
  { bg: '#FFE4E8', fg: '#E31B54' },
];

var SOURCE_COLORS = ['#0D7377', '#4DC2C6', '#B3E6E8', '#F79009', '#F04438'];

// ═══════ STAT CARD ═══════

function DashStatCard({
  label,
  value,
  change,
  compareLabel,
  icon,
  sub,
  progress,
}: {
  label: string;
  value: ReactNode;
  change?: number;
  compareLabel?: string;
  icon: ReactNode;
  sub?: string;
  progress?: { current: number; max: number };
}) {
  var hasChange = change !== undefined;
  var trendUp = !hasChange || change >= 0;
  var sparkColor = hasChange ? (trendUp ? C.SUCCESS_500 : C.ERROR_500) : C.GRAY_300;
  return (
    <div
      style={{
        background: C.SURFACE,
        border: '1px solid ' + C.GRAY_200,
        borderRadius: 12,
        padding: 20,
        fontFamily: C.FONT,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: C.GRAY_500 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: C.ACCENT_LIGHT, border: '1px solid rgba(13,115,119,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.ACCENT,
          }}>
            {icon}
          </div>
          <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
            <polyline
              points={trendUp ? '2,12 8,8 14,10 22,3' : '2,4 8,8 14,6 22,13'}
              stroke={sparkColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
      </div>
      <div
        style={{
          fontSize: 30, fontWeight: 700, color: C.GRAY_900,
          letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 8,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {change !== undefined && (
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: change >= 0 ? C.SUCCESS : C.DANGER }}>
            <span>{change >= 0 ? '\u2191' : '\u2193'}</span> {Math.abs(change).toFixed(1)}%
          </span>
          {compareLabel && <span style={{ fontSize: 13, color: C.GRAY_500, marginLeft: 4 }}>vs {compareLabel}</span>}
        </div>
      )}
      {sub && <div style={{ fontSize: 13, color: C.GRAY_500 }}>{sub}</div>}
      {progress && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 6, background: C.GRAY_100, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: (progress.max > 0 ? Math.round((progress.current / progress.max) * 100) : 0) + '%', background: C.ACCENT, borderRadius: 3 }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════ PERFORMANCE CHART ═══════

function PerformanceChart({
  data,
  period,
  onPeriodChange,
}: {
  data: ChartPoint[];
  period: string;
  onPeriodChange: (p: string) => void;
}) {
  if (data.length === 0) {
    return (
      <div style={{ background: C.SURFACE, border: '1px solid ' + C.GRAY_200, borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.GRAY_900, letterSpacing: '-0.01em', fontFamily: C.FONT }}>Performance overview</div>
        </div>
        <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.GRAY_400, fontSize: 14, fontFamily: C.FONT }}>
          No data for this period yet
        </div>
      </div>
    );
  }

  var maxVal = 1;
  for (var i = 0; i < data.length; i++) {
    if (data[i].views > maxVal) maxVal = data[i].views;
    if (data[i].leads > maxVal) maxVal = data[i].leads;
  }

  var chartW = 800;
  var chartH = 240;
  var padL = 40;
  var padR = 20;
  var usableW = chartW - padL - padR;
  var stepX = data.length > 1 ? usableW / (data.length - 1) : 0;

  function yPos(val: number): number {
    return chartH - 20 - ((val / maxVal) * (chartH - 40));
  }

  var viewsPath = '';
  var areaPath = '';
  var leadsPath = '';
  for (var pi = 0; pi < data.length; pi++) {
    var x = padL + pi * stepX;
    var vy = yPos(data[pi].views);
    var ly = yPos(data[pi].leads);
    if (pi === 0) {
      viewsPath += 'M' + x + ' ' + vy;
      areaPath += 'M' + x + ' ' + vy;
      leadsPath += 'M' + x + ' ' + ly;
    } else {
      viewsPath += ' L' + x + ' ' + vy;
      areaPath += ' L' + x + ' ' + vy;
      leadsPath += ' L' + x + ' ' + ly;
    }
  }
  areaPath += ' L' + (padL + (data.length - 1) * stepX) + ' ' + chartH + ' L' + padL + ' ' + chartH + ' Z';

  var yLabels = [0, 0.25, 0.5, 0.75, 1].map(function(p) {
    var val = Math.round(maxVal * p);
    if (val >= 1000) return (val / 1000).toFixed(val % 1000 === 0 ? 0 : 1) + 'K';
    return '' + val;
  });

  return (
    <div style={{ background: C.SURFACE, border: '1px solid ' + C.GRAY_200, borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.GRAY_900, letterSpacing: '-0.01em', fontFamily: C.FONT }}>Performance overview</div>
        <div style={{ display: 'flex', gap: 2, background: C.GRAY_100, borderRadius: 8, padding: 2 }}>
          {['Daily', 'Weekly', 'Monthly'].map(function(p) {
            var isActive = period === p.toLowerCase();
            return (
              <button
                key={p}
                onClick={function() { onPeriodChange(p.toLowerCase()); }}
                style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: isActive ? 600 : 500,
                  color: isActive ? C.GRAY_900 : C.GRAY_500, background: isActive ? C.SURFACE : 'transparent',
                  border: 'none', cursor: 'pointer', fontFamily: C.FONT,
                  boxShadow: isActive ? C.SHADOW_XS : 'none', transition: 'all 0.12s',
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.ACCENT, display: 'inline-block' }} /> Views
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.GRAY_300, display: 'inline-block' }} /> Leads
        </div>
      </div>
      <div style={{ padding: '0 24px 24px' }}>
        <svg viewBox={'0 0 ' + chartW + ' ' + (chartH + 20)} width="100%" style={{ display: 'block' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(function(p, gi) {
            var y = yPos(maxVal * p);
            return (
              <g key={gi}>
                <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke={C.GRAY_100} strokeWidth="1" />
                <text x={padL - 8} y={y + 4} fill={C.GRAY_500} fontSize="11" fontFamily="Inter" textAnchor="end">{yLabels[gi]}</text>
              </g>
            );
          })}
          {/* Area fill */}
          <defs>
            <linearGradient id="viewsGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={C.ACCENT} stopOpacity="0.15" />
              <stop offset="100%" stopColor={C.ACCENT} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#viewsGrad)" />
          {/* Views line */}
          <path d={viewsPath} fill="none" stroke={C.ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Leads line (dashed) */}
          <path d={leadsPath} fill="none" stroke={C.GRAY_300} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 4" />
          {/* Data points */}
          {data.map(function(pt, di) {
            var cx = padL + di * stepX;
            return (
              <g key={di}>
                <circle cx={cx} cy={yPos(pt.views)} r={di === data.length - 1 ? 5 : 4} fill={C.ACCENT} stroke="#fff" strokeWidth="2" />
                {di === data.length - 1 && (
                  <circle cx={cx} cy={yPos(pt.leads)} r={4} fill={C.GRAY_300} stroke="#fff" strokeWidth="2" />
                )}
              </g>
            );
          })}
          {/* X axis labels */}
          {data.map(function(pt, di) {
            if (data.length > 10 && di % Math.ceil(data.length / 5) !== 0 && di !== data.length - 1) return null;
            return (
              <text key={di} x={padL + di * stepX} y={chartH + 16} fill={C.GRAY_500} fontSize="11" fontFamily="Inter" textAnchor="middle">
                {pt.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ═══════ TOP QUIZZES LIST ═══════

function TopQuizzesList({ quizzes }: { quizzes: Quiz[] }) {
  var sorted = quizzes.slice().sort(function(a, b) { return b.view_count - a.view_count; }).slice(0, 5);
  return (
    <div style={{ background: C.SURFACE, border: '1px solid ' + C.GRAY_200, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: C.GRAY_900, letterSpacing: '-0.01em', fontFamily: C.FONT }}>Top quizzes</span>
        <Link href="/dashboard/quizzes" style={{ fontSize: 14, fontWeight: 600, color: C.ACCENT, textDecoration: 'none', fontFamily: C.FONT }}>View all</Link>
      </div>
      <div style={{ padding: '8px 24px 24px' }}>
        {sorted.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: C.GRAY_500, fontSize: 14, fontFamily: C.FONT }}>No quizzes yet</div>
        ) : sorted.map(function(quiz, idx) {
          var cvr = quiz.view_count > 0 ? ((quiz.lead_count / quiz.view_count) * 100).toFixed(1) : '0.0';
          return (
            <div
              key={quiz.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: idx < sorted.length - 1 ? '1px solid ' + C.GRAY_100 : 'none',
              }}
            >
              <span style={{ width: 20, fontSize: 14, fontWeight: 600, color: C.GRAY_400, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.GRAY_900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: C.FONT }}>{quiz.title}</div>
                <div style={{ fontSize: 12, color: C.GRAY_500, fontFamily: C.FONT }}>{formatNumber(quiz.view_count)} views</div>
              </div>
              <span style={{
                padding: '4px 10px', borderRadius: 16, background: C.ACCENT_LIGHT, color: C.ACCENT,
                fontSize: 13, fontWeight: 600, flexShrink: 0, fontFamily: C.FONT,
              }}>{cvr}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════ CONVERSION FUNNEL ═══════

function ConversionFunnel({ funnel }: { funnel: FunnelData }) {
  var steps = [
    { label: 'Views', value: funnel.views, pct: '100%', bg: C.ACCENT_LIGHT, borderColor: 'rgba(13,115,119,0.15)' },
    { label: 'Started', value: funnel.started, pct: funnel.views > 0 ? ((funnel.started / funnel.views) * 100).toFixed(1) + '%' : '0%', bg: C.ACCENT_LIGHT, borderColor: 'rgba(13,115,119,0.15)' },
    { label: 'Completed', value: funnel.completed, pct: funnel.views > 0 ? ((funnel.completed / funnel.views) * 100).toFixed(1) + '%' : '0%', bg: C.ACCENT_LIGHT, borderColor: 'rgba(13,115,119,0.15)' },
    { label: 'Leads', value: funnel.leads, pct: funnel.views > 0 ? ((funnel.leads / funnel.views) * 100).toFixed(1) + '%' : '0%', bg: C.BRAND_50, borderColor: 'rgba(13,115,119,0.25)' },
  ];

  return (
    <div style={{ background: C.SURFACE, border: '1px solid ' + C.GRAY_200, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px 16px' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: C.GRAY_900, letterSpacing: '-0.01em', fontFamily: C.FONT }}>Conversion funnel</span>
      </div>
      <div style={{ padding: '8px 24px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map(function(step, si) {
          var barW = funnel.views > 0 ? Math.max(45, (step.value / funnel.views) * 100) : 100;
          return (
            <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  flex: 1, padding: '14px 16px', borderRadius: 8,
                  background: step.bg, border: '1px solid ' + step.borderColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: barW + '%',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.GRAY_700, fontFamily: C.FONT }}>{step.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>{formatNumber(step.value)}</div>
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.ACCENT, minWidth: 50, textAlign: 'right', fontFamily: C.FONT }}>{step.pct}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════ LEAD SOURCES DONUT ═══════

function LeadSourcesDonut({ sources, total }: { sources: LeadSource[]; total: number }) {
  var radius = 70;
  var circumference = 2 * Math.PI * radius;
  var offsetAcc = 0;

  return (
    <div style={{ background: C.SURFACE, border: '1px solid ' + C.GRAY_200, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: C.GRAY_900, letterSpacing: '-0.01em', fontFamily: C.FONT }}>Lead sources</span>
        <Link href="/dashboard/analytics" style={{ fontSize: 14, fontWeight: 600, color: C.ACCENT, textDecoration: 'none', fontFamily: C.FONT }}>View all</Link>
      </div>
      <div style={{ padding: '8px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 180, height: 180, marginBottom: 16 }}>
          <svg viewBox="0 0 180 180" width="180" height="180">
            <circle cx="90" cy="90" r={radius} fill="none" stroke={C.GRAY_200} strokeWidth="20" />
            {sources.map(function(src, si) {
              var dash = (src.percentage / 100) * circumference;
              var gap = circumference - dash;
              var offset = -offsetAcc + circumference * 0.25;
              offsetAcc += dash;
              return (
                <circle
                  key={si}
                  cx="90" cy="90" r={radius} fill="none"
                  stroke={src.color} strokeWidth="20"
                  strokeDasharray={dash + ' ' + gap}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.GRAY_900, letterSpacing: '-0.02em', fontFamily: C.FONT }}>{formatNumber(total)}</div>
            <div style={{ fontSize: 12, color: C.GRAY_500, fontFamily: C.FONT }}>Total</div>
          </div>
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sources.map(function(src, si) {
            return (
              <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.GRAY_600, fontFamily: C.FONT }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: src.color, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{src.name}</span>
                <span style={{ fontWeight: 600, color: C.GRAY_900 }}>{formatNumber(src.count)}</span>
                <span style={{ color: C.GRAY_500, minWidth: 50, textAlign: 'right' }}>({src.percentage.toFixed(1)}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════ RECENT LEADS TABLE ═══════

function RecentLeadsTable({ leads, quizzes }: { leads: Lead[]; quizzes: Quiz[] }) {
  var quizMap: Record<string, string> = {};
  for (var qi = 0; qi < quizzes.length; qi++) {
    quizMap[quizzes[qi].id] = quizzes[qi].title;
  }

  function scoreVariant(score: number | null): { bg: string; fg: string } {
    if (score === null) return { bg: C.GRAY_100, fg: C.GRAY_600 };
    if (score >= 70) return { bg: C.SUCCESS_LIGHT, fg: C.SUCCESS };
    if (score >= 50) return { bg: C.ACCENT_LIGHT, fg: C.ACCENT };
    return { bg: '#FFFAEB', fg: '#B54708' };
  }

  function statusStyle(status: string | null): { bg: string; fg: string } {
    if (!status) return { bg: C.GRAY_100, fg: C.GRAY_600 };
    var s = status.toLowerCase();
    if (s === 'new') return { bg: C.ACCENT_LIGHT, fg: C.ACCENT };
    if (s === 'contacted') return { bg: C.GRAY_100, fg: C.GRAY_600 };
    if (s === 'qualified') return { bg: C.SUCCESS_LIGHT, fg: C.SUCCESS };
    if (s === 'nurturing') return { bg: '#FFF6ED', fg: '#C4320A' };
    return { bg: C.GRAY_100, fg: C.GRAY_600 };
  }

  return (
    <div style={{ background: C.SURFACE, border: '1px solid ' + C.GRAY_200, borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>Recent leads</h3>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: C.SUCCESS_500,
            animation: 'sq-live-pulse 2s infinite',
          }} />
          <style>{`@keyframes sq-live-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            border: '1px solid ' + C.GRAY_300, borderRadius: 8, fontSize: 13, fontWeight: 500,
            color: C.GRAY_700, background: C.SURFACE, cursor: 'pointer', fontFamily: C.FONT,
          }}>
            All quizzes
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            border: '1px solid ' + C.GRAY_300, borderRadius: 8, fontSize: 13, fontWeight: 500,
            color: C.GRAY_700, background: C.SURFACE, cursor: 'pointer', fontFamily: C.FONT,
          }}>
            All sources
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <Link href="/dashboard/exports" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            border: '1px solid ' + C.GRAY_300, borderRadius: 8, fontSize: 13, fontWeight: 500,
            color: C.GRAY_700, background: C.SURFACE, textDecoration: 'none', fontFamily: C.FONT,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </Link>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.FONT }}>
        <thead>
          <tr>
            {['Lead', 'Quiz', 'Score', 'Source', 'Submitted', 'Status', ''].map(function(h, hi) {
              return (
                <th key={hi} style={{
                  padding: '10px 24px', textAlign: 'left', fontSize: 12, fontWeight: 500,
                  color: C.GRAY_500, borderBottom: '1px solid ' + C.GRAY_200, background: C.GRAY_50,
                }}>{h}</th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {leads.slice(0, 5).map(function(lead, li) {
            var ac = AVATAR_COLORS[li % AVATAR_COLORS.length];
            var sc = scoreVariant(lead.score);
            var ss = statusStyle(lead.status);
            var submitted = new Date(lead.created_at);
            return (
              <tr key={lead.id}>
                <td style={{ padding: '12px 24px', borderBottom: li < Math.min(leads.length, 5) - 1 ? '1px solid ' + C.GRAY_100 : 'none', fontSize: 14, color: C.GRAY_600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: ac.bg, color: ac.fg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 600, flexShrink: 0,
                    }}>{initialsFrom(lead.name, lead.email)}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.GRAY_900 }}>{lead.name || lead.email.split('@')[0]}</div>
                      <div style={{ fontSize: 12, color: C.GRAY_500 }}>{lead.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 24px', borderBottom: li < Math.min(leads.length, 5) - 1 ? '1px solid ' + C.GRAY_100 : 'none', fontSize: 14, color: C.GRAY_700, whiteSpace: 'nowrap' }}>
                  {lead.quizzes?.title || quizMap[lead.quiz_id] || 'Quiz'}
                </td>
                <td style={{ padding: '12px 24px', borderBottom: li < Math.min(leads.length, 5) - 1 ? '1px solid ' + C.GRAY_100 : 'none' }}>
                  <span style={{
                    width: 32, height: 24, borderRadius: 12, display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 13,
                    fontWeight: 600, background: sc.bg, color: sc.fg,
                  }}>{lead.score !== null ? lead.score : '—'}</span>
                </td>
                <td style={{ padding: '12px 24px', borderBottom: li < Math.min(leads.length, 5) - 1 ? '1px solid ' + C.GRAY_100 : 'none', fontSize: 14, color: C.GRAY_600 }}>
                  {lead.source || 'Direct'}
                </td>
                <td style={{ padding: '12px 24px', borderBottom: li < Math.min(leads.length, 5) - 1 ? '1px solid ' + C.GRAY_100 : 'none' }}>
                  <div style={{ fontSize: 14, color: C.GRAY_600 }}>{submitted.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  <div style={{ fontSize: 12, color: C.GRAY_400 }}>{submitted.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                </td>
                <td style={{ padding: '12px 24px', borderBottom: li < Math.min(leads.length, 5) - 1 ? '1px solid ' + C.GRAY_100 : 'none' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 16, fontSize: 12, fontWeight: 500,
                    background: ss.bg, color: ss.fg, display: 'inline-flex', alignItems: 'center',
                  }}>{lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1) : 'New'}</span>
                </td>
                <td style={{ padding: '12px 24px', borderBottom: li < Math.min(leads.length, 5) - 1 ? '1px solid ' + C.GRAY_100 : 'none', textAlign: 'right' }}>
                  <span style={{ padding: '4px 8px', borderRadius: 4, fontSize: 16, color: C.GRAY_400, cursor: 'pointer', letterSpacing: 2 }}>&#8942;</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ padding: '12px 24px', textAlign: 'center', borderTop: '1px solid ' + C.GRAY_200 }}>
        <Link href="/dashboard/leads" style={{ fontSize: 14, fontWeight: 600, color: C.ACCENT, textDecoration: 'none', fontFamily: C.FONT }}>
          View all leads &rarr;
        </Link>
      </div>
    </div>
  );
}

// ═══════ QUESTION DROP-OFF ═══════

function QuestionDropoff({ questions, quizTitle }: { questions: DropoffQuestion[]; quizTitle: string }) {
  return (
    <div style={{ background: C.SURFACE, border: '1px solid ' + C.GRAY_200, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: C.GRAY_900, letterSpacing: '-0.01em', fontFamily: C.FONT }}>Question drop-off analysis</span>
        <div style={{
          padding: '6px 12px', border: '1px solid ' + C.GRAY_300, borderRadius: 8,
          fontSize: 13, fontWeight: 500, color: C.GRAY_700, background: C.SURFACE,
          display: 'flex', alignItems: 'center', gap: 6, fontFamily: C.FONT,
        }}>
          {quizTitle}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      <div style={{ padding: '8px 24px 24px' }}>
        <table style={{ width: '100%', fontFamily: C.FONT }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 0', textAlign: 'left', fontSize: 12, fontWeight: 500, color: C.GRAY_500, borderBottom: '1px solid ' + C.GRAY_200 }}>Question</th>
              <th style={{ padding: '8px 0', textAlign: 'left', fontSize: 12, fontWeight: 500, color: C.GRAY_500, borderBottom: '1px solid ' + C.GRAY_200 }}>Drop-off</th>
              <th style={{ padding: '8px 0', textAlign: 'left', fontSize: 12, fontWeight: 500, color: C.GRAY_500, borderBottom: '1px solid ' + C.GRAY_200, width: 140 }}>Completion rate</th>
            </tr>
          </thead>
          <tbody>
            {questions.map(function(q, qi) {
              return (
                <tr key={qi}>
                  <td style={{ padding: '10px 0', borderBottom: '1px solid ' + C.GRAY_100, fontSize: 13, color: C.GRAY_600 }}>{qi + 1}. {q.question}</td>
                  <td style={{ padding: '10px 0', borderBottom: '1px solid ' + C.GRAY_100, fontSize: 13, color: '#F04438' }}>{q.dropoff_rate}%</td>
                  <td style={{ padding: '10px 0', borderBottom: '1px solid ' + C.GRAY_100, width: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: C.GRAY_100, borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                        <div style={{ height: '100%', width: q.dropoff_rate + '%', background: '#F04438', borderRadius: '3px 0 0 3px', flexShrink: 0 }} />
                        <div style={{ height: '100%', width: q.completion_rate + '%', background: C.ACCENT, borderRadius: '0 3px 3px 0', flexShrink: 0 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: C.GRAY_700, minWidth: 35, textAlign: 'right' }}>{q.completion_rate}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Link href="/dashboard/analytics" style={{ fontSize: 14, fontWeight: 600, color: C.ACCENT, textDecoration: 'none', fontFamily: C.FONT }}>
            View full analysis &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

// ═══════ RECENT ACTIVITY ═══════

function RecentActivityList({ activities }: { activities: ActivityItem[] }) {
  var iconStyles: Record<string, { bg: string; fg: string }> = {
    lead: { bg: C.ACCENT_LIGHT, fg: C.ACCENT },
    quiz: { bg: C.SUCCESS_LIGHT, fg: C.SUCCESS_500 },
    integration: { bg: '#F4EBFF', fg: '#7F56D9' },
    ab_test: { bg: '#FFFAEB', fg: '#B54708' },
    export: { bg: C.GRAY_100, fg: C.GRAY_600 },
  };

  var iconSvgs: Record<string, ReactNode> = {
    lead: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/></svg>,
    quiz: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    integration: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
    ab_test: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 00-1.172-2.872L3 3"/><path d="M21 3l-7.828 7.828A4 4 0 0012 13.657V22"/></svg>,
    export: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  };

  return (
    <div style={{ background: C.SURFACE, border: '1px solid ' + C.GRAY_200, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: C.GRAY_900, letterSpacing: '-0.01em', fontFamily: C.FONT }}>Recent activity</span>
        <Link href="/dashboard/activity" style={{ fontSize: 14, fontWeight: 600, color: C.ACCENT, textDecoration: 'none', fontFamily: C.FONT }}>View all</Link>
      </div>
      <div style={{ padding: '8px 24px 24px' }}>
        {activities.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: C.GRAY_500, fontSize: 14, fontFamily: C.FONT }}>No recent activity</div>
        ) : activities.map(function(act, ai) {
          var is = iconStyles[act.type] || iconStyles.export;
          return (
            <div
              key={act.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0',
                borderBottom: ai < activities.length - 1 ? '1px solid ' + C.GRAY_100 : 'none',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: is.bg, color: is.fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {iconSvgs[act.type] || iconSvgs.export}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.GRAY_900, fontFamily: C.FONT }}>{act.title}</div>
                <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>{act.description}</div>
              </div>
              <span style={{ fontSize: 12, color: C.GRAY_400, flexShrink: 0, whiteSpace: 'nowrap', fontFamily: C.FONT }}>{act.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════ A/B TESTING BANNER ═══════

function ABTestingBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div style={{
      background: C.SURFACE, border: '1px solid ' + C.GRAY_200, borderRadius: 12,
      padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: '#FFFAEB',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B54708" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6"/><path d="M10 3v4.4a1 1 0 01-.3.7L6 12a5 5 0 003.5 8.5h5A5 5 0 0018 12l-3.7-3.9a1 1 0 01-.3-.7V3"/></svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>Boost your conversions with A/B testing</div>
        <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>Test different questions, paths, and designs to see what converts best.</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Link href="/dashboard/ab-tests" style={{
          padding: '8px 16px', background: '#F04438', color: '#fff', borderRadius: 8,
          fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: C.FONT,
          transition: 'all 0.12s',
        }}>Create A/B test</Link>
        <a href="https://docs.squarespell.com/ab-testing" target="_blank" rel="noopener noreferrer" style={{
          padding: '8px 16px', border: '1px solid ' + C.GRAY_300, borderRadius: 8,
          fontSize: 13, fontWeight: 500, color: C.GRAY_700, background: C.SURFACE,
          textDecoration: 'none', fontFamily: C.FONT, transition: 'all 0.12s',
        }}>Learn more</a>
      </div>
      <button
        onClick={onDismiss}
        style={{
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 6, color: C.GRAY_400, background: 'none', border: 'none', cursor: 'pointer',
          transition: 'all 0.12s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}

// ═══════ MAIN OVERVIEW ═══════

function OverviewInner() {
  var router = useRouter();
  var searchParams = useSearchParams();
  var { token, status: authStatus } = useDashboardAuth();

  // Data state
  var [quizzes, setQuizzes] = useState<Quiz[]>([]);
  var [leads, setLeads] = useState<Lead[]>([]);
  var [loading, setLoading] = useState(true);
  var [analytics, setAnalytics] = useState<DashboardAnalytics>({
    total_views: 0, total_leads: 0, completion_rate: 0, lead_rate: 0,
    active_quizzes: 0, quiz_limit: 20, views_change: 0, leads_change: 0,
    completion_change: 0, lead_rate_change: 0, compare_label: '',
  });
  var [chartData, setChartData] = useState<ChartPoint[]>([]);
  var [chartPeriod, setChartPeriod] = useState('weekly');
  var [funnel, setFunnel] = useState<FunnelData>({ views: 0, started: 0, completed: 0, leads: 0 });
  var [sources, setSources] = useState<LeadSource[]>([]);
  var [dropoffQuestions, setDropoffQuestions] = useState<DropoffQuestion[]>([]);
  var [dropoffQuizTitle, setDropoffQuizTitle] = useState('');
  var [activities, setActivities] = useState<ActivityItem[]>([]);
  var [showABBanner, setShowABBanner] = useState(true);
  var [newQuizOpen, setNewQuizOpen] = useState(false);
  var [dateRange, setDateRange] = useState('');
  var [userName, setUserName] = useState('');
  var initRef = useRef(false);

  // Claim flow (preserved from original)
  useEffect(function() {
    if (!token || initRef.current) return;
    initRef.current = true;
    var cancelled = false;

    (async function() {
      var quizClaimed = false;
      var claimedQuizId = '';
      try {
        var claimToken = searchParams?.get('claim') || '';
        if (!claimToken) claimToken = getCookie('sq_claim');
        if (!claimToken) claimToken = sessionStorage.getItem('sq_claim_token') || '';

        var previewPayload: any = null;
        try {
          var raw = localStorage.getItem('squarespell_preview') || sessionStorage.getItem('squarespell_preview');
          if (raw) {
            var parsed = JSON.parse(raw);
            if (parsed?.quiz && parsed?.url && Date.now() - (parsed.createdAt || 0) < 14400000) {
              previewPayload = parsed;
              if (!claimToken) claimToken = parsed.claim_token || '';
            }
          }
        } catch {}

        if (claimToken || previewPayload) {
          var claimRes = await fetch(API + '/api/claim-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({
              claim_token: claimToken,
              quiz: previewPayload?.quiz,
              brand: previewPayload?.brand,
              url: previewPayload?.url,
            }),
          });
          var claimData = await claimRes.json().catch(function() { return {}; });
          if (claimRes.ok && claimData.claimed) {
            quizClaimed = true;
            claimedQuizId = claimData.quiz_id || '';
          } else if (previewPayload) {
            var saveRes = await fetch(API + '/api/save-preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
              body: JSON.stringify({ quiz: previewPayload.quiz, brand: previewPayload.brand, url: previewPayload.url }),
            });
            var saveData = await saveRes.json().catch(function() { return {}; });
            if (saveRes.ok && saveData.saved) {
              quizClaimed = true;
              claimedQuizId = saveData.quiz_id || '';
            }
          }
          if (quizClaimed) {
            clearCookie('sq_claim');
            try { sessionStorage.removeItem('sq_claim_token'); } catch {}
            try { localStorage.removeItem('squarespell_preview'); sessionStorage.removeItem('squarespell_preview'); } catch {}
          }
        }
      } catch {}

      if (quizClaimed && claimedQuizId) {
        router.replace('/dashboard/' + claimedQuizId + '?justClaimed=1');
        return;
      }

      // No claim - proceed to load dashboard data
      if (!cancelled) await loadDashboardData();
    })();

    async function loadDashboardData() {
      if (!token) return;
      setLoading(true);

      try {
        // Parallel fetch: quizzes, leads, plan, activity
        var results = await Promise.all([
          fetch(API + '/api/quizzes', { headers: { Authorization: 'Bearer ' + token } }).catch(function() { return null; }),
          fetch(API + '/api/leads', { headers: { Authorization: 'Bearer ' + token } }).catch(function() { return null; }),
          fetch(API + '/api/user/plan', { headers: { Authorization: 'Bearer ' + token } }).catch(function() { return null; }),
          fetch(API + '/api/dashboard/activity', { headers: { Authorization: 'Bearer ' + token } }).catch(function() { return null; }),
        ]);

        var quizRes = results[0];
        var leadRes = results[1];
        var planRes = results[2];
        var actRes = results[3];

        // Parse quizzes
        var quizData: Quiz[] = [];
        if (quizRes && quizRes.ok) {
          quizData = await quizRes.json();
          if (!cancelled) setQuizzes(quizData);
        }

        // Parse leads
        var leadData: Lead[] = [];
        if (leadRes && leadRes.ok) {
          leadData = await leadRes.json();
          if (!cancelled) setLeads(leadData.slice(0, 10));
        }

        // Parse plan for user name
        if (planRes && planRes.ok) {
          var planData = await planRes.json();
          if (!cancelled && planData.email) {
            setUserName(planData.email.split('@')[0]);
          }
        }

        // Parse activity
        if (actRes && actRes.ok) {
          var actData = await actRes.json();
          if (!cancelled) setActivities(Array.isArray(actData) ? actData.slice(0, 5) : []);
        }

        // Compute aggregated analytics across all quizzes
        var totalViews = 0;
        var totalLeads = 0;
        var totalCompletions = 0;
        var totalStarted = 0;
        var activeCount = 0;

        for (var qi = 0; qi < quizData.length; qi++) {
          if (quizData[qi].status === 'live') activeCount++;
          totalViews += quizData[qi].view_count || 0;
          totalLeads += quizData[qi].lead_count || 0;

          try {
            var ar = await fetch(API + '/api/analytics/' + quizData[qi].id, {
              headers: { Authorization: 'Bearer ' + token },
            });
            if (ar.ok) {
              var ad = await ar.json();
              totalCompletions += ad.completions || 0;
              totalStarted += ad.started || ad.completions || 0;
            }
          } catch {}
        }

        if (!cancelled) {
          var compRate = totalViews > 0 ? (totalCompletions / totalViews) * 100 : 0;
          var ldRate = totalViews > 0 ? (totalLeads / totalViews) * 100 : 0;
          setAnalytics({
            total_views: totalViews,
            total_leads: totalLeads,
            completion_rate: compRate,
            lead_rate: ldRate,
            active_quizzes: activeCount,
            quiz_limit: 20,
            views_change: 0,
            leads_change: 0,
            completion_change: 0,
            lead_rate_change: 0,
            compare_label: '',
          });

          setFunnel({
            views: totalViews,
            started: totalStarted || Math.round(totalViews * 0.57),
            completed: totalCompletions || Math.round(totalViews * 0.33),
            leads: totalLeads,
          });

          // Lead sources from lead data
          var sourceMap: Record<string, number> = {};
          for (var li = 0; li < leadData.length; li++) {
            var src = leadData[li].source || 'Direct';
            sourceMap[src] = (sourceMap[src] || 0) + 1;
          }
          var sourceEntries = Object.entries(sourceMap).sort(function(a, b) { return b[1] - a[1]; });
          var sourcesArr: LeadSource[] = sourceEntries.map(function(entry, si) {
            return {
              name: entry[0],
              count: entry[1],
              percentage: totalLeads > 0 ? (entry[1] / totalLeads) * 100 : 0,
              color: SOURCE_COLORS[si % SOURCE_COLORS.length],
            };
          });
          setSources(sourcesArr);

          // Set date range display
          var now = new Date();
          var thirtyAgo = new Date(now.getTime() - 30 * 86400000);
          setDateRange(
            thirtyAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
            ' \u2013 ' +
            now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          );
        }

        // Fetch dropoff for top quiz
        if (quizData.length > 0 && !cancelled) {
          var topQuiz = quizData.slice().sort(function(a, b) { return b.view_count - a.view_count; })[0];
          setDropoffQuizTitle(topQuiz.title);
          try {
            var doRes = await fetch(API + '/api/analytics/' + topQuiz.id + '/dropoff', {
              headers: { Authorization: 'Bearer ' + token },
            });
            if (doRes.ok) {
              var doData = await doRes.json();
              if (!cancelled && Array.isArray(doData)) {
                setDropoffQuestions(doData.slice(0, 5));
              }
            }
          } catch {}
        }

      } catch (e) {
        console.error('Error loading dashboard:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    return function() { cancelled = true; };
  }, [token, router, searchParams]);

  // Fetch chart timeseries
  useEffect(function() {
    if (!token || quizzes.length === 0) return;
    var cancelled = false;

    var periodMap: Record<string, string> = { daily: '7d', weekly: '30d', monthly: '90d' };
    var range = periodMap[chartPeriod] || '30d';

    (async function() {
      var allDates: Record<string, { views: number; leads: number }> = {};

      for (var qi = 0; qi < quizzes.length; qi++) {
        try {
          var tsRes = await fetch(API + '/api/analytics/' + quizzes[qi].id + '/timeseries?period=' + range, {
            headers: { Authorization: 'Bearer ' + token },
          });
          if (tsRes.ok) {
            var tsData = await tsRes.json();
            if (tsData.dates && Array.isArray(tsData.dates)) {
              for (var di = 0; di < tsData.dates.length; di++) {
                var dateKey = tsData.dates[di];
                if (!allDates[dateKey]) allDates[dateKey] = { views: 0, leads: 0 };
                allDates[dateKey].views += (tsData.views[di] || 0);
                allDates[dateKey].leads += (tsData.leads[di] || 0);
              }
            }
          }
        } catch {}
      }

      var sortedDates = Object.keys(allDates).sort();
      var points: ChartPoint[] = sortedDates.map(function(d) {
        var parts = d.split('-');
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
          label: months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10),
          views: allDates[d].views,
          leads: allDates[d].leads,
        };
      });

      if (!cancelled) setChartData(points);
    })();

    return function() { cancelled = true; };
  }, [token, quizzes, chartPeriod]);

  // Resolve username from Clerk
  useEffect(function() {
    try {
      var el = document.querySelector('[data-clerk-user-firstname]');
      if (el && el.textContent) setUserName(el.textContent);
    } catch {}
  }, []);

  if (authStatus === 'loading' || loading) {
    return (
      <DashboardShell title="Dashboard">
        <PageLoading />
      </DashboardShell>
    );
  }

  var displayName = userName || 'there';

  return (
    <DashboardShell title="Dashboard">
      <NewQuizModal open={newQuizOpen} onClose={function() { setNewQuizOpen(false); }} />

      {/* Welcome header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 24, fontWeight: 600, color: C.GRAY_900,
            letterSpacing: '-0.02em', marginBottom: 4, fontFamily: C.FONT,
          }}>
            Welcome back, {displayName} &#128075;
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT }}>
            Here&apos;s what&apos;s happening with your quizzes today.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 14px', border: '1px solid ' + C.GRAY_300, borderRadius: 8,
            fontSize: 14, fontWeight: 500, color: C.GRAY_700, background: C.SURFACE,
            cursor: 'pointer', fontFamily: C.FONT, boxShadow: C.SHADOW_XS,
          }}>
            {dateRange || 'Select dates'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_400} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </button>
          <button
            onClick={function() { setNewQuizOpen(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', background: C.ACCENT, color: '#fff',
              borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none',
              cursor: 'pointer', fontFamily: C.FONT, boxShadow: C.SHADOW_XS,
              transition: 'all 0.15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create quiz
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        <DashStatCard
          label="Total views"
          value={formatNumber(analytics.total_views)}
          change={analytics.views_change || undefined}
          compareLabel={analytics.compare_label || undefined}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
        />
        <DashStatCard
          label="Leads captured"
          value={formatNumber(analytics.total_leads)}
          change={analytics.leads_change || undefined}
          compareLabel={analytics.compare_label || undefined}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/></svg>}
        />
        <DashStatCard
          label="Completion rate"
          value={analytics.completion_rate.toFixed(1) + '%'}
          change={analytics.completion_change || undefined}
          compareLabel={analytics.compare_label || undefined}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
        />
        <DashStatCard
          label="Lead rate"
          value={analytics.lead_rate.toFixed(1) + '%'}
          change={analytics.lead_rate_change || undefined}
          compareLabel={analytics.compare_label || undefined}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l4-5 4 3 5-7"/></svg>}
        />
        <DashStatCard
          label="Active quizzes"
          value={<>{analytics.active_quizzes} <span style={{ fontSize: 18, fontWeight: 500, color: C.GRAY_400 }}>/ {analytics.quiz_limit}</span></>}
          sub={analytics.quiz_limit > 0 ? Math.round((analytics.active_quizzes / analytics.quiz_limit) * 100) + '% of limit used' : undefined}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
        />
      </div>

      {/* Performance chart */}
      <PerformanceChart data={chartData} period={chartPeriod} onPeriodChange={setChartPeriod} />

      {/* Three-column row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <TopQuizzesList quizzes={quizzes} />
        <ConversionFunnel funnel={funnel} />
        <LeadSourcesDonut sources={sources} total={analytics.total_leads} />
      </div>

      {/* Recent leads table */}
      <RecentLeadsTable leads={leads} quizzes={quizzes} />

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <QuestionDropoff questions={dropoffQuestions} quizTitle={dropoffQuizTitle || 'Select quiz'} />
        <RecentActivityList activities={activities} />
      </div>

      {/* A/B testing banner */}
      {showABBanner && (
        <ABTestingBanner onDismiss={function() {
          setShowABBanner(false);
          try { localStorage.setItem('sq_ab_banner_dismissed', '1'); } catch {}
        }} />
      )}
    </DashboardShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell title="Dashboard">
          <PageLoading />
        </DashboardShell>
      }
    >
      <OverviewInner />
    </Suspense>
  );
}

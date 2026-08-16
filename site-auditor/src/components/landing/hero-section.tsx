'use client';

/**
 * Homepage hero — presentation-only rebuild of the old `.rd .hero`/
 * `#audit-form` block in Auditor.tsx's idle state. Hand-written CSS on the
 * product's own tokens (.hero, .entry-lede, .field, .spec*, .home-* —
 * globals.css), no framework. Every prop here is state or a handler that
 * already lives in Auditor.tsx (url, the personalization panel fields,
 * `start`, `error`) — this component only renders them, it owns none of
 * it. The mock report card reuses the same bandColour/bandWord logic
 * Report.tsx uses privately (see band.ts) and the report's own
 * .score-value/.band/.chip classes, so it renders identically to a real
 * report.
 */

import type { FormEvent } from 'react';
import type { UserGoal } from '@/lib/audit/types';
import { IconPersonAvatar } from '@/components/Icons';
import { bandColour, bandWord } from './band';

/* Same UserGoal values the backend already accepts (types.ts) and the
   report already renders (GOAL_LABELS, opportunity.ts) — a display label
   set for the dropdown only, not a second source of truth. */
const GOAL_OPTIONS: Array<{ value: UserGoal; label: string }> = [
  { value: 'get_more_customers', label: 'Get more customers' },
  { value: 'get_more_leads', label: 'Get more leads' },
  { value: 'get_more_sales', label: 'Get more sales' },
  { value: 'get_more_bookings', label: 'Get more bookings' },
  { value: 'get_more_traffic', label: 'Get more traffic' },
  { value: 'improve_website', label: 'Improve the website overall' },
  { value: 'look_more_professional', label: 'Look more professional' },
  { value: 'beat_competitors', label: 'Beat competitors' },
  { value: 'improve_ai_visibility', label: 'Improve AI search visibility' },
  { value: 'improve_performance', label: 'Improve performance' },
  { value: 'not_sure', label: 'Not sure yet' },
];

const MOCK_METRICS = [
  { label: 'SEO', score: 65 },
  { label: 'Performance', score: 82 },
  { label: 'Accessibility', score: 91 },
  { label: 'Best Practices', score: 76 },
  { label: 'Content', score: 70 },
];

/** Static specimen: an illustrative example report, not a real audit. */
function ReportSpecimen() {
  const overall = 78;
  return (
    <div className="spec" aria-label="An example of a finished report">
      <div className="spec-head">
        <div>
          <div className="spec-tag">SQUARESPELL — EXAMPLE REPORT</div>
          <div className="spec-host">example-site.squarespace.com</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="score-value" style={{ color: bandColour(overall), fontSize: 'var(--fs-46)' }}>
            {overall}
          </div>
          <div className="score-out">out of 100, {bandWord(overall)}</div>
        </div>
      </div>

      <div className="band">
        <div className="band-track">
          <div className="band-fill" style={{ width: `${overall}%`, background: bandColour(overall) }} />
        </div>
        <div className="band-marks">
          <span>0</span>
          <span>40</span>
          <span>60</span>
          <span>80</span>
          <span>100</span>
        </div>
      </div>

      <div className="home-metric-grid">
        {MOCK_METRICS.map((m) => (
          <div key={m.label}>
            <div className="home-metric-label">{m.label}</div>
            <div className="home-metric-value" style={{ color: bandColour(m.score) }}>
              {m.score}/100
            </div>
          </div>
        ))}
      </div>

      <div className="home-issue-banner">
        <span className="chip chip-critical">2 critical</span>
        <div>
          <strong>2 Critical Issues Found</strong>
          <p>These issues are hurting your rankings, user experience, and conversions.</p>
        </div>
      </div>

      <div className="home-checklist">
        {['Actionable recommendations', 'Prioritized by impact', 'Easy to understand', 'Designed to help you grow'].map(
          (b) => (
            <div key={b}>
              <span>✓</span>
              {b}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function HeroSection({
  url,
  onUrlChange,
  onSubmit,
  error,
  showContext,
  onToggleContext,
  bizDescription,
  onBizDescriptionChange,
  audience,
  onAudienceChange,
  goal,
  onGoalChange,
  competitor1,
  onCompetitor1Change,
  competitor2,
  onCompetitor2Change,
}: {
  url: string;
  onUrlChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  error: { message: string; hint?: string; code?: string } | null;
  showContext: boolean;
  onToggleContext: () => void;
  bizDescription: string;
  onBizDescriptionChange: (v: string) => void;
  audience: string;
  onAudienceChange: (v: string) => void;
  goal: UserGoal | '';
  onGoalChange: (v: UserGoal | '') => void;
  competitor1: string;
  onCompetitor1Change: (v: string) => void;
  competitor2: string;
  onCompetitor2Change: (v: string) => void;
}) {
  return (
    <section id="audit-form" className="frame home-hero">
      <div className="hero">
        <div className="home-hero-copy">
          <div className="home-hero-badge">100% Free Squarespace Website Audit</div>

          <h1>
            Professional Squarespace Audit. <span>100% Free.</span>
          </h1>

          <p className="entry-lede">
            We analyze your Squarespace site across 60+ critical checks — SEO, performance,
            accessibility, content and more — and send you a detailed report with actionable
            insights.
          </p>

          <form onSubmit={onSubmit} className="field" style={{ marginTop: 'var(--s8)', maxWidth: 480 }}>
            <input
              type="text"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="Enter your Squarespace site URL"
              aria-label="Your Squarespace website address"
            />
            <button className="btn" type="submit" style={{ margin: 2 }}>
              Audit My Site — It&rsquo;s Free
            </button>
          </form>

          <button type="button" className="home-context-toggle" onClick={onToggleContext} aria-expanded={showContext}>
            {showContext ? 'Hide personalization' : 'Want a more personalized report? (optional)'}
          </button>

          {showContext && (
            <div className="home-context-panel">
              <p className="home-context-note" style={{ marginTop: 0 }}>
                Tell us a little about the site and the report will focus on what matters most for
                it. Skip anything you would rather not answer, none of this is required to run the
                free audit.
              </p>
              <div className="home-context-field">
                <label htmlFor="ctx-desc">What does your business do?</label>
                <textarea
                  id="ctx-desc"
                  value={bizDescription}
                  onChange={(e) => onBizDescriptionChange(e.target.value.slice(0, 500))}
                  placeholder="e.g. We run a small pottery studio and sell handmade ceramics."
                  maxLength={500}
                />
              </div>
              <div className="home-context-field">
                <label htmlFor="ctx-audience">Who are you trying to reach?</label>
                <input
                  id="ctx-audience"
                  type="text"
                  value={audience}
                  onChange={(e) => onAudienceChange(e.target.value.slice(0, 300))}
                  placeholder="e.g. Local customers looking for gifts"
                  maxLength={300}
                />
              </div>
              <div className="home-context-field">
                <label htmlFor="ctx-goal">What is your main website goal?</label>
                <select id="ctx-goal" value={goal} onChange={(e) => onGoalChange(e.target.value as UserGoal | '')}>
                  <option value="">Select a goal (optional)</option>
                  {GOAL_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="home-context-field">
                <label>Competitor websites (optional)</label>
                <div className="home-context-row">
                  <input
                    type="text"
                    value={competitor1}
                    onChange={(e) => onCompetitor1Change(e.target.value)}
                    placeholder="competitor.com"
                    aria-label="Competitor website 1"
                  />
                  <input
                    type="text"
                    value={competitor2}
                    onChange={(e) => onCompetitor2Change(e.target.value)}
                    placeholder="another-competitor.com"
                    aria-label="Competitor website 2"
                  />
                </div>
              </div>
              <p className="home-context-note">
                We never fetch these competitor sites at this stage. This only shapes how your own
                report is written.
              </p>
            </div>
          )}

          {error && (
            <div className="home-issue-banner" style={{ marginTop: 'var(--s5)', maxWidth: 480 }} role="alert">
              <strong style={{ display: 'block', fontSize: 'var(--fs-13)', color: 'var(--crit-900)' }}>
                {error.message}
              </strong>
              <p style={{ marginTop: 2, fontSize: 'var(--fs-12)', color: 'var(--ink-3)' }}>
                {error.hint ? error.hint : ''}
                {error.code === 'NOT_SQUARESPACE' &&
                  'If you believe this is a Squarespace site, it may sit behind a proxy such as Cloudflare that hides the platform.'}
              </p>
            </div>
          )}

          <div className="home-perks">
            {['No Sign Up', 'No Credit Card', 'Instant Results'].map((p) => (
              <span key={p}>
                <span>✓</span>
                {p}
              </span>
            ))}
          </div>

          <div className="home-rating">
            <div className="home-faces">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="home-face">
                  <IconPersonAvatar />
                </div>
              ))}
            </div>
            <div>
              <div className="home-rating-stars">★★★★★ <span style={{ color: 'var(--ink-0)' }}>4.9/5</span></div>
              <div className="home-rating-text">
                Trusted by 4,000+ Squarespace owners, designers &amp; marketing teams worldwide.
              </div>
            </div>
          </div>
        </div>

        <ReportSpecimen />
      </div>
    </section>
  );
}

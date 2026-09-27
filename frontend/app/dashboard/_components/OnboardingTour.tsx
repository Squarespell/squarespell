'use client';

/**
 * OnboardingTour — guided walkthrough for first-time users (2026 redesign).
 *
 * Highlights items in the horizontal navigation one at a time with a light scrim, a white spotlight and an anchored
 * popover (caret, "1 of 8", progress dots, Skip tour / Next). Triggers on first login (checks localStorage); existing
 * users with data are marked complete silently. `?tour=1` in the URL replays it.
 */

import { useState, useEffect, useCallback } from 'react';
import { DASHBOARD_COLORS as C } from './dashboardColors';

var STORAGE_KEY = 'squarespell_onboarding_completed';

interface TourStep {
  /** CSS selector to highlight */
  target: string;
  title: string;
  description: string;
}

var TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="dashboard"]',
    title: 'Welcome to Squarespell Quiz',
    description: 'Track performance, manage leads, and build your next quiz from here.',
  },
  {
    target: '[data-tour="quizzes"]',
    title: 'Your quizzes',
    description: 'Edit, preview, share, duplicate or pause every quiz you own. Each card shows its status, views and leads.',
  },
  {
    target: '[data-tour="templates"]',
    title: 'Start from a template',
    description: 'Pick a ready-made quiz, then make it yours in the editor with your questions, outcomes and brand.',
  },
  {
    target: '[data-tour="leads"]',
    title: 'Captured leads',
    description: 'Every quiz submission lands in Audience. Filter by quiz or score, tag leads and export to CSV.',
  },
  {
    target: '[data-tour="analytics"]',
    title: 'Insights',
    description: 'Track views, completions and drop-off, and follow each quiz from first view to customer.',
  },
  {
    target: '[data-tour="emails"]',
    title: 'Engage',
    description: 'Send follow-up emails when someone completes a quiz, and personalise them by outcome.',
  },
  {
    target: '[data-tour="integrations"]',
    title: 'Integrations',
    description: 'Send leads to Mailchimp, Klaviyo, ConvertKit, Google Sheets or any webhook. Zapier is planned.',
  },
  {
    target: '[data-tour="billing"]',
    title: 'Settings & billing',
    description: 'Manage your workspace, brand kit, team and subscription, and see your plan usage.',
  },
];

var POPOVER_W = 356;
var SCRIM = 'rgba(22, 23, 25, 0.38)';

function isVisible(el: Element | null): el is HTMLElement {
  if (!el) return false;
  var r = (el as HTMLElement).getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

export function OnboardingTour() {
  var [active, setActive] = useState(false);
  var [steps, setSteps] = useState<TourStep[]>(TOUR_STEPS);
  var [step, setStep] = useState(0);
  var [layout, setLayout] = useState<{ top: number; left: number; caretLeft: number; rect: DOMRect } | null>(null);

  // Show only for genuinely new users (or when replayed with ?tour=1).
  useEffect(function() {
    try {
      var forced = /[?&]tour=1\b/.test(window.location.search);
      if (!forced) {
        if (localStorage.getItem(STORAGE_KEY)) return;
        var statCards = document.querySelectorAll('[class*="stat"], [class*="Stat"], .sq-kpi');
        for (var i = 0; i < statCards.length; i++) {
          if (/[1-9]/.test(statCards[i].textContent || '')) {
            localStorage.setItem(STORAGE_KEY, 'true'); // existing user: silently mark the tour done
            return;
          }
        }
      }
      var timer = setTimeout(function() {
        // Count only the steps whose target is on screen, so "1 of N" is always accurate.
        var available = TOUR_STEPS.filter(function(s) { return isVisible(document.querySelector(s.target)); });
        if (available.length === 0) return;
        setSteps(available);
        setStep(0);
        setActive(true);
      }, 800);
      return function() { clearTimeout(timer); };
    } catch (e) {
      // localStorage not available
    }
  }, []);

  var completeTour = useCallback(function() {
    setActive(false);
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch (e) {}
  }, []);

  // Position the popover below the highlighted nav item.
  useEffect(function() {
    if (!active) return;
    var current = steps[step];
    if (!current) return;
    function place() {
      var el = document.querySelector(current.target);
      if (!isVisible(el)) return;
      var rect = el.getBoundingClientRect();
      var left = rect.left + rect.width / 2 - 48;
      left = Math.max(16, Math.min(left, window.innerWidth - POPOVER_W - 16));
      var caretLeft = Math.max(20, Math.min(rect.left + rect.width / 2 - left - 9, POPOVER_W - 38));
      setLayout({ top: rect.bottom + 18, left: left, caretLeft: caretLeft, rect: rect });
    }
    place();
    window.addEventListener('resize', place);
    return function() { window.removeEventListener('resize', place); };
  }, [active, step, steps]);

  useEffect(function() {
    if (!active) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') completeTour(); }
    document.addEventListener('keydown', onKey);
    return function() { document.removeEventListener('keydown', onKey); };
  }, [active, completeTour]);

  var handleNext = useCallback(function() {
    if (step < steps.length - 1) setStep(step + 1);
    else completeTour();
  }, [step, steps.length, completeTour]);

  var handlePrev = useCallback(function() {
    if (step > 0) setStep(step - 1);
  }, [step]);

  if (!active || !layout) return null;

  var current = steps[step];
  var isLast = step === steps.length - 1;
  var r = layout.rect;

  return (
    <>
      {/* Spotlight: a white rounded frame around the target, with the scrim drawn by its outer shadow */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: r.top - 8,
          left: r.left - 14,
          width: r.width + 28,
          height: r.height + 16,
          borderRadius: 8,
          boxShadow: '0 0 0 4px rgba(255,255,255,0.9), 0 0 0 9999px ' + SCRIM,
          zIndex: 9998,
          pointerEvents: 'none',
          transition: 'all 0.25s ease',
        }}
      />
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 9997 }} onClick={function() { /* block clicks behind the tour */ }} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sq-tour-title"
        style={{
          position: 'fixed',
          top: layout.top,
          left: layout.left,
          width: POPOVER_W,
          maxWidth: 'calc(100vw - 32px)',
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 20px 48px -12px rgba(22,23,25,0.35)',
          zIndex: 10000,
          padding: '22px 22px 18px',
          fontFamily: C.FONT,
          transition: 'top 0.25s ease, left 0.25s ease',
        }}
      >
        <span aria-hidden="true" style={{ position: 'absolute', top: -9, left: layout.caretLeft, width: 18, height: 18, background: '#fff', transform: 'rotate(45deg)', borderRadius: 2 }} />
        <div style={{ fontSize: 14, color: C.GRAY_600, marginBottom: 10 }}>{(step + 1) + ' of ' + steps.length}</div>
        <div id="sq-tour-title" style={{ fontSize: 19, fontWeight: 700, color: C.INK, marginBottom: 8, letterSpacing: '-0.015em' }}>{current.title}</div>
        <div style={{ fontSize: 15, color: C.GRAY_600, lineHeight: 1.55, marginBottom: 20 }}>{current.description}</div>

        <div aria-hidden="true" style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {steps.map(function(_, i) {
            return <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === step ? C.ACCENT : C.GRAY_200 }} />;
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={completeTour} style={{ background: 'none', border: 'none', fontSize: 15, color: C.INK, cursor: 'pointer', padding: '6px 2px', fontFamily: 'inherit' }}>
            Skip tour
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button type="button" onClick={handlePrev} style={{ height: 40, padding: '0 16px', borderRadius: 6, background: '#fff', border: '1px solid ' + C.BORDER, fontSize: 15, fontWeight: 500, color: C.INK, cursor: 'pointer', fontFamily: 'inherit' }}>
                Back
              </button>
            )}
            <button type="button" onClick={handleNext} autoFocus style={{ height: 40, padding: '0 26px', borderRadius: 6, background: C.ACCENT, border: 'none', fontSize: 15, fontWeight: 500, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              {isLast ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

/**
 * OnboardingTour — full-app guided walkthrough for first-time users.
 *
 * Shows a step-by-step tooltip overlay that introduces each major section
 * of the dashboard. Triggers on first login (checks localStorage). Each
 * step highlights a sidebar nav item or page section with a spotlight
 * effect and a positioned tooltip with title, description, step counter,
 * and Next/Skip controls.
 *
 * Industry-standard product tour pattern (like Intercom, Appcues, Pendo).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DASHBOARD_COLORS as C } from './dashboardColors';

var STORAGE_KEY = 'squarespell_onboarding_completed';

interface TourStep {
  /** CSS selector to highlight */
  target: string;
  title: string;
  description: string;
  /** Tooltip position relative to target */
  position: 'right' | 'bottom' | 'left' | 'top';
}

var TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="dashboard"]',
    title: 'Welcome to Squarespell Quiz!',
    description: 'This is your dashboard — a quick snapshot of quiz performance, recent leads, and recommendations to grow faster.',
    position: 'right',
  },
  {
    target: '[data-tour="quizzes"]',
    title: 'Your quizzes',
    description: 'View, duplicate, or delete all your quizzes here. Each card shows status, lead count, and completion rate.',
    position: 'right',
  },
  {
    target: '[data-tour="editor"]',
    title: 'Quiz editor',
    description: 'Build and customize your quiz with the drag-and-drop block editor. Add questions, outcomes, lead gates, and more.',
    position: 'right',
  },
  {
    target: '[data-tour="leads"]',
    title: 'Captured leads',
    description: 'Every quiz submission lands here. Filter by quiz, date, or score. Export to CSV or push to your email tool.',
    position: 'right',
  },
  {
    target: '[data-tour="analytics"]',
    title: 'Analytics',
    description: 'Track completions, drop-off rates, and conversion trends. Use date filters to spot what is working and what needs tuning.',
    position: 'right',
  },
  {
    target: '[data-tour="emails"]',
    title: 'Email sequences',
    description: 'Set up automated follow-up emails triggered by quiz completions. Send personalized content based on outcomes to nurture your leads.',
    position: 'right',
  },
  {
    target: '[data-tour="integrations"]',
    title: 'Integrations',
    description: 'Send leads to Mailchimp, Klaviyo, Google Sheets, Zapier, and 100+ other tools your team already uses.',
    position: 'right',
  },
  {
    target: '[data-tour="billing"]',
    title: 'Billing & plan',
    description: 'Manage your subscription, view usage, and upgrade to unlock features like branding removal, skip logic, and custom CSS.',
    position: 'right',
  },
];

export function OnboardingTour() {
  var [active, setActive] = useState(false);
  var [step, setStep] = useState(0);
  var [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  var [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  var tooltipRef = useRef<HTMLDivElement>(null);

  // Check if tour should show — only for genuinely new users.
  // If the user already has quiz data on the page (sidebar shows questions),
  // they're an existing user and we mark the tour as completed silently.
  useEffect(function() {
    try {
      var completed = localStorage.getItem(STORAGE_KEY);
      if (completed) return;

      // Existing users: if the page already has quiz content, skip tour
      var hasQuizContent = document.querySelector('[data-tour="editor"]') &&
        (document.querySelectorAll('[class*="question"]').length > 0 ||
         document.querySelectorAll('[class*="block"]').length > 0);

      // Also check if user signed up more than 5 minutes ago by looking
      // for any meaningful dashboard data (stat cards with non-zero values)
      var statCards = document.querySelectorAll('[class*="stat"], [class*="Stat"]');
      var hasExistingData = false;
      for (var i = 0; i < statCards.length; i++) {
        var txt = statCards[i].textContent || '';
        if (/[1-9]/.test(txt)) { hasExistingData = true; break; }
      }

      if (hasQuizContent || hasExistingData) {
        // Existing user — silently mark tour done
        localStorage.setItem(STORAGE_KEY, 'true');
        return;
      }

      // New user — show tour after a short delay
      var timer = setTimeout(function() { setActive(true); }, 800);
      return function() { clearTimeout(timer); };
    } catch(e) {
      // localStorage not available
    }
  }, []);

  // Position tooltip when step changes
  useEffect(function() {
    if (!active) return;

    var currentStep = TOUR_STEPS[step];
    if (!currentStep) return;

    var el = document.querySelector(currentStep.target) as HTMLElement | null;
    if (!el) {
      // Skip to next step if target not found
      if (step < TOUR_STEPS.length - 1) {
        setStep(step + 1);
      } else {
        completeTour();
      }
      return;
    }

    // Scroll target into view
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Wait for scroll then position
    var timer = setTimeout(function() {
      var rect = el.getBoundingClientRect();
      setTargetRect(rect);

      var pos = currentStep.position;
      var top = 0;
      var left = 0;
      var tooltipWidth = 320;
      var gap = 16;

      if (pos === 'right') {
        top = rect.top + rect.height / 2 - 60;
        left = rect.right + gap;
      } else if (pos === 'bottom') {
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
      } else if (pos === 'left') {
        top = rect.top + rect.height / 2 - 60;
        left = rect.left - tooltipWidth - gap;
      } else {
        top = rect.top - gap - 140;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
      }

      // Clamp to viewport
      top = Math.max(16, Math.min(top, window.innerHeight - 200));
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

      setTooltipPos({ top: top, left: left });
    }, 300);

    return function() { clearTimeout(timer); };
  }, [active, step]);

  var completeTour = useCallback(function() {
    setActive(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch(e) {}
  }, []);

  var handleNext = useCallback(function() {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      completeTour();
    }
  }, [step, completeTour]);

  var handlePrev = useCallback(function() {
    if (step > 0) {
      setStep(step - 1);
    }
  }, [step]);

  if (!active || !tooltipPos) return null;

  var currentStep = TOUR_STEPS[step];
  var isLast = step === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Backdrop overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.45)',
        transition: 'opacity 0.2s ease',
      }} />

      {/* Spotlight cutout on target element */}
      {targetRect && (
        <div style={{
          position: 'fixed',
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          borderRadius: 10,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
          zIndex: 9999,
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
        }} />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: 320,
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 12px 40px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 10000,
          padding: '24px 22px 20px',
          fontFamily: "'Inter', system-ui, sans-serif",
          transition: 'top 0.3s ease, left 0.3s ease',
        }}
      >
        {/* Step counter */}
        <div style={{
          fontSize: 12, fontWeight: 600, color: C.ACCENT,
          marginBottom: 8, letterSpacing: '0.01em',
        }}>
          {(step + 1) + ' of ' + TOUR_STEPS.length}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 16, fontWeight: 700, color: C.TEXT,
          marginBottom: 6, lineHeight: 1.3, letterSpacing: '-0.01em',
        }}>
          {currentStep.title}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 13.5, color: C.TEXT_MUTED, lineHeight: 1.55,
          marginBottom: 20,
        }}>
          {currentStep.description}
        </div>

        {/* Progress dots */}
        <div style={{
          display: 'flex', gap: 5, marginBottom: 16,
        }}>
          {TOUR_STEPS.map(function(_, i) {
            return (
              <div
                key={i}
                style={{
                  width: i === step ? 20 : 6, height: 6, borderRadius: 3,
                  background: i === step ? C.ACCENT : (i < step ? C.ACCENT : '#E5E7EB'),
                  opacity: i < step ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                }}
              />
            );
          })}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={completeTour}
            style={{
              background: 'none', border: 'none', fontSize: 13,
              color: C.TEXT_MUTED, cursor: 'pointer', padding: '6px 0',
              fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            Skip tour
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button
                onClick={handlePrev}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  background: '#F3F4F6', border: 'none',
                  fontSize: 13, fontWeight: 600, color: C.TEXT,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                padding: '8px 20px', borderRadius: 8,
                background: C.ACCENT, border: 'none',
                fontSize: 13, fontWeight: 600, color: '#fff',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {isLast ? 'Get started!' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

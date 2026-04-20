/**
 * Shared plan definitions used across the dashboard.
 * Single source of truth for tier names, limits, and feature flags.
 */

export type PlanId = 'free' | 'trial' | 'starter' | 'growth' | 'pro' | 'agency';

export interface PlanFeatures {
  removeBranding: boolean;
  abTesting: boolean;
  zapier: boolean;
  analytics: 'basic' | 'standard' | 'advanced';
}

export interface PlanDef {
  id: PlanId;
  name: string;
  quizzes: number;
  leads: number;
  emails: number;
  monthlyPrice: number;
  features: PlanFeatures;
}

export var PLANS: Record<string, PlanDef> = {
  free: {
    id: 'free',
    name: 'Free',
    quizzes: 1,
    leads: 100,
    emails: 50,
    monthlyPrice: 0,
    features: { removeBranding: false, abTesting: false, zapier: false, analytics: 'basic' },
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    quizzes: 10,
    leads: 2500,
    emails: 2500,
    monthlyPrice: 29,
    features: { removeBranding: true, abTesting: false, zapier: true, analytics: 'standard' },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    quizzes: 50,
    leads: 10000,
    emails: 10000,
    monthlyPrice: 79,
    features: { removeBranding: true, abTesting: true, zapier: true, analytics: 'advanced' },
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    quizzes: Infinity,
    leads: Infinity,
    emails: 25000,
    monthlyPrice: 199,
    features: { removeBranding: true, abTesting: true, zapier: true, analytics: 'advanced' },
  },
};

/**
 * Returns the minimum paid plan that unlocks a specific feature.
 * Useful for upgrade prompts: "Upgrade to Growth to remove branding"
 */
export function minimumPlanFor(feature: keyof PlanFeatures): PlanDef {
  var tiers: PlanId[] = ['growth', 'pro', 'agency'];
  for (var i = 0; i < tiers.length; i++) {
    var p = PLANS[tiers[i]];
    if (p.features[feature]) return p;
  }
  return PLANS.agency;
}

/**
 * Check if a plan has access to a specific feature.
 */
export function planHasFeature(planId: string, feature: keyof PlanFeatures): boolean {
  var p = PLANS[planId];
  if (!p) return false;
  return !!p.features[feature];
}

/**
 * Returns true if the user is on a free/trial tier.
 */
export function isFreeTier(planId: string): boolean {
  return planId === 'free' || planId === 'trial' || planId === 'starter';
}

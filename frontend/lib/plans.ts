/**
 * Shared plan definitions used across the dashboard.
 * Single source of truth for tier names, limits, and feature flags.
 *
 * New pricing (annual default):
 *   Free    — $0     — 1 quiz, 50 responses/mo, 50 emails/mo
 *   Starter — $9/mo  — 3 quizzes, 500 responses/mo, 500 emails/mo
 *   Pro     — $19/mo — Unlimited quizzes, 2,000 responses/mo, 2,000 emails/mo
 *   Business— $39/mo — Unlimited everything
 *
 * Email add-on packs available on any paid plan:
 *   +1,000 emails/mo  — $5/mo
 *   +5,000 emails/mo  — $15/mo
 *   +10,000 emails/mo — $29/mo
 */

export type PlanId = 'free' | 'trial' | 'starter' | 'pro' | 'business';

export interface PlanFeatures {
  removeBranding: boolean;
  abTesting: boolean;
  zapier: boolean;
  analytics: 'basic' | 'standard' | 'advanced';
  branchingLogic: boolean;
  customCSS: boolean;
  customDomain: boolean;
  whiteLabel: boolean;
  teamSeats: boolean;
  emailSequences: boolean;
  integrations: boolean;
  scheduling: boolean;
  aiGeneration: boolean;
}

export interface PlanDef {
  id: PlanId;
  name: string;
  quizzes: number;
  leads: number;
  emails: number;
  monthlyPrice: number;
  annualPrice: number;
  features: PlanFeatures;
}

var FREE_FEATURES: PlanFeatures = {
  removeBranding: false,
  abTesting: false,
  zapier: false,
  analytics: 'basic',
  branchingLogic: false,
  customCSS: false,
  customDomain: false,
  whiteLabel: false,
  teamSeats: false,
  emailSequences: false,
  integrations: false,
  scheduling: false,
  aiGeneration: false,
};

var STARTER_FEATURES: PlanFeatures = {
  removeBranding: true,
  abTesting: false,
  zapier: false,
  analytics: 'standard',
  branchingLogic: false,
  customCSS: false,
  customDomain: false,
  whiteLabel: false,
  teamSeats: false,
  emailSequences: false,
  integrations: false,
  scheduling: false,
  aiGeneration: true,
};

var PRO_FEATURES: PlanFeatures = {
  removeBranding: true,
  abTesting: true,
  zapier: true,
  analytics: 'advanced',
  branchingLogic: true,
  customCSS: true,
  customDomain: false,
  whiteLabel: false,
  teamSeats: false,
  emailSequences: true,
  integrations: true,
  scheduling: true,
  aiGeneration: true,
};

var BUSINESS_FEATURES: PlanFeatures = {
  removeBranding: true,
  abTesting: true,
  zapier: true,
  analytics: 'advanced',
  branchingLogic: true,
  customCSS: true,
  customDomain: true,
  whiteLabel: true,
  teamSeats: true,
  emailSequences: true,
  integrations: true,
  scheduling: true,
  aiGeneration: true,
};

export var PLANS: Record<string, PlanDef> = {
  free: {
    id: 'free',
    name: 'Free',
    quizzes: 1,
    leads: 50,
    emails: 50,
    monthlyPrice: 0,
    annualPrice: 0,
    features: FREE_FEATURES,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    quizzes: 3,
    leads: 500,
    emails: 500,
    monthlyPrice: 12,
    annualPrice: 9,
    features: STARTER_FEATURES,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    quizzes: Infinity,
    leads: 2000,
    emails: 2000,
    monthlyPrice: 25,
    annualPrice: 19,
    features: PRO_FEATURES,
  },
  business: {
    id: 'business',
    name: 'Business',
    quizzes: Infinity,
    leads: Infinity,
    emails: Infinity,
    monthlyPrice: 49,
    annualPrice: 39,
    features: BUSINESS_FEATURES,
  },
};

/** Email add-on packs — available on any paid plan */
export var EMAIL_ADDONS = [
  { emails: 1000, price: 5, label: '+1,000 emails/mo' },
  { emails: 5000, price: 15, label: '+5,000 emails/mo' },
  { emails: 10000, price: 29, label: '+10,000 emails/mo' },
];

/**
 * Returns the minimum paid plan that unlocks a specific feature.
 * Useful for upgrade prompts: "Upgrade to Starter to remove branding"
 */
export function minimumPlanFor(feature: keyof PlanFeatures): PlanDef {
  var tiers: PlanId[] = ['starter', 'pro', 'business'];
  for (var i = 0; i < tiers.length; i++) {
    var p = PLANS[tiers[i]];
    if (p.features[feature]) return p;
  }
  return PLANS.business;
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
  return planId === 'free' || planId === 'trial';
}

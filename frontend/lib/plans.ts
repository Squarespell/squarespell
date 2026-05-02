/**
 * Shared plan definitions used across the dashboard.
 * Single source of truth for tier names, limits, and feature flags.
 *
 * Model: 14-day Pro trial → pick a paid plan
 *   Trial    — 14 days — Pro-level features (unlimited quizzes, 3K leads, 3K emails)
 *   Core     — $9/mo   — 5 quizzes, 1,000 leads/mo, 1,000 emails/mo
 *   Pro      — $16/mo  — Unlimited quizzes, 3,000 leads/mo, 3,000 emails/mo
 *   Business — $29/mo  — Unlimited everything
 *
 * Lead add-on packs available on any paid plan:
 *   +500 leads/mo    — $3/mo
 *   +1,500 leads/mo  — $7/mo
 *   +3,000 leads/mo  — $12/mo
 *
 * Email add-on packs available on any paid plan:
 *   +1,000 emails/mo  — $3/mo
 *   +5,000 emails/mo  — $7/mo
 *   +10,000 emails/mo — $12/mo
 */

export type PlanId = 'trial' | 'core' | 'pro' | 'business';

/**
 * Legacy plan IDs that map to current plans.
 * 'starter' and 'growth' → core
 * 'agency' → business
 * 'free' → treated as trial (expired)
 */
export type LegacyPlanId = 'starter' | 'growth' | 'agency' | 'free';

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

/* ------------------------------------------------------------------ */
/*  Feature sets                                                       */
/* ------------------------------------------------------------------ */

var CORE_FEATURES: PlanFeatures = {
  removeBranding: true,
  abTesting: false,
  zapier: false,
  analytics: 'standard',
  branchingLogic: true,       // moved from Pro → Core
  customCSS: false,
  customDomain: false,
  whiteLabel: false,
  teamSeats: false,
  emailSequences: false,
  integrations: false,
  scheduling: true,           // moved from Pro → Core
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

/* ------------------------------------------------------------------ */
/*  Plan definitions                                                   */
/* ------------------------------------------------------------------ */

export var PLANS: Record<string, PlanDef> = {
  trial: {
    id: 'trial',
    name: 'Trial',
    quizzes: Infinity,
    leads: 3000,
    emails: 3000,
    monthlyPrice: 0,
    annualPrice: 0,
    features: PRO_FEATURES,
  },
  core: {
    id: 'core',
    name: 'Core',
    quizzes: 5,
    leads: 1000,
    emails: 1000,
    monthlyPrice: 12,
    annualPrice: 9,
    features: CORE_FEATURES,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    quizzes: Infinity,
    leads: 3000,
    emails: 3000,
    monthlyPrice: 19,
    annualPrice: 16,
    features: PRO_FEATURES,
  },
  business: {
    id: 'business',
    name: 'Business',
    quizzes: Infinity,
    leads: Infinity,
    emails: Infinity,
    monthlyPrice: 35,
    annualPrice: 29,
    features: BUSINESS_FEATURES,
  },

  /* Legacy aliases — kept for backward compatibility with old Stripe
     subscriptions and database records. Each maps to the equivalent
     current plan so that planHasFeature / minimumPlanFor work. */
  starter: {
    id: 'core',
    name: 'Core',
    quizzes: 5,
    leads: 1000,
    emails: 1000,
    monthlyPrice: 12,
    annualPrice: 9,
    features: CORE_FEATURES,
  },
  growth: {
    id: 'core',
    name: 'Core',
    quizzes: 5,
    leads: 1000,
    emails: 1000,
    monthlyPrice: 12,
    annualPrice: 9,
    features: CORE_FEATURES,
  },
  agency: {
    id: 'business',
    name: 'Business',
    quizzes: Infinity,
    leads: Infinity,
    emails: Infinity,
    monthlyPrice: 35,
    annualPrice: 29,
    features: BUSINESS_FEATURES,
  },
};

/** Lead add-on packs — available on any paid plan */
export var LEAD_ADDONS = [
  { leads: 500, price: 3, label: '+500 leads/mo' },
  { leads: 1500, price: 7, label: '+1,500 leads/mo' },
  { leads: 3000, price: 12, label: '+3,000 leads/mo' },
];

/** Email add-on packs — available on any paid plan */
export var EMAIL_ADDONS = [
  { emails: 1000, price: 3, label: '+1,000 emails/mo' },
  { emails: 5000, price: 7, label: '+5,000 emails/mo' },
  { emails: 10000, price: 12, label: '+10,000 emails/mo' },
];

/** Trial duration in days */
export var TRIAL_DAYS = 14;

/**
 * Resolve a plan ID that may be legacy to the canonical current plan.
 * e.g. 'starter' → PLANS.core, 'agency' → PLANS.business
 */
export function resolvePlan(planId: string): PlanDef {
  return PLANS[planId] || PLANS.core;
}

/**
 * Returns the canonical PlanId for any plan string (including legacy).
 */
export function canonicalPlanId(planId: string): PlanId {
  var p = PLANS[planId];
  if (!p) return 'core';
  return p.id;
}

/**
 * Returns the minimum paid plan that unlocks a specific feature.
 * Useful for upgrade prompts: "Upgrade to Pro to unlock A/B testing"
 */
export function minimumPlanFor(feature: keyof PlanFeatures): PlanDef {
  var tiers: PlanId[] = ['core', 'pro', 'business'];
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
 * Returns true if the user is on a trial (not yet subscribed).
 */
export function isTrialTier(planId: string): boolean {
  return planId === 'trial' || planId === 'free';
}

/**
 * @deprecated Use isTrialTier instead. Kept for backward compatibility.
 */
export function isFreeTier(planId: string): boolean {
  return isTrialTier(planId);
}

/**
 * Ordered list of paid plan IDs for upgrade path logic.
 */
export var PAID_PLAN_ORDER: PlanId[] = ['core', 'pro', 'business'];

/**
 * Returns the next tier up from the given plan, or null if already top.
 */
export function nextPlanUp(planId: string): PlanDef | null {
  var canonical = canonicalPlanId(planId);
  var idx = PAID_PLAN_ORDER.indexOf(canonical);
  if (idx === -1 || idx >= PAID_PLAN_ORDER.length - 1) return null;
  return PLANS[PAID_PLAN_ORDER[idx + 1]];
}

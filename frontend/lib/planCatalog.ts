/**
 * Single source of truth for Squarespell Quiz plan data.
 * Imported by: pricing/page.tsx, pricing-embed/page.tsx, billing/page.tsx
 *
 * Business plan explicitly lists every item that is crossed-out (excluded)
 * in Core and Pro — so visitors can see those items are fully included.
 */

export type PlanKey = 'core' | 'pro' | 'business';

export interface Plan {
  key: PlanKey;
  name: string;
  desc: string;
  /** Monthly price when billed monthly */
  monthly: number;
  /** Monthly price when billed yearly (discounted) */
  yearly: number;
  /** Annual total billed upfront */
  yearlyTotal: number;
  /** Annual saving vs monthly billing */
  yearlySave: number;
  featured: boolean;
  limits: { quizzes: string; leads: string; emails: string };
  /** Features shown with a ✓ tick */
  included: string[];
  /** Features shown with a ✗ cross (not available on this plan) */
  excluded: string[];
  /** Optional upgrade nudge shown at bottom of card */
  upgrade?: string;
}

export const PLANS: Plan[] = [
  {
    key: 'core',
    name: 'Core',
    desc: 'Build real quiz funnels with branching logic, scoring, and scheduling.',
    monthly: 12,
    yearly: 9,
    yearlyTotal: 108,
    yearlySave: 36,
    featured: false,
    limits: { quizzes: '5', leads: '1,000', emails: '1,000' },
    included: [
      'AI quiz generation from your URL',
      'Squarespace one-click connect',
      'Remove Squarespell Quiz branding',
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
    upgrade: 'Need A/B testing or integrations?',
  },
  {
    key: 'pro',
    name: 'Pro',
    desc: 'Full power for serious lead generation — unlimited quizzes, integrations, and A/B testing.',
    monthly: 19,
    yearly: 16,
    yearlyTotal: 192,
    yearlySave: 36,
    featured: true,
    limits: { quizzes: 'Unlimited', leads: '3,000', emails: '3,000' },
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
    upgrade: 'Need white-label or unlimited leads?',
  },
  {
    key: 'business',
    name: 'Business',
    desc: 'Unlimited everything with white-label, custom domains, team seats, and API access.',
    monthly: 35,
    yearly: 29,
    yearlyTotal: 348,
    yearlySave: 72,
    featured: false,
    limits: { quizzes: 'Unlimited', leads: 'Unlimited', emails: 'Unlimited' },
    included: [
      // Core essentials
      'AI quiz generation from your URL',
      'Squarespace one-click connect',
      'Remove Squarespell Quiz branding',
      'Branching logic & weighted scoring',
      'Quiz scheduling',
      'Standard analytics',
      'Lead dashboard + CSV export',
      // Core excluded → now included ✓
      'A/B testing',
      'Email sequences',
      'All integrations (Zapier, Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets)',
      'Advanced analytics & per-question drop-off',
      'Custom CSS',
      // Pro excluded → now included ✓
      'White-label (your brand on everything)',
      'Custom domain for quizzes',
      'Team seats (3 included, $5/seat extra)',
      'API access',
      'Priority support (email + chat)',
      'Dedicated onboarding call',
    ],
    excluded: [],
  },
];

/** For billing/page.tsx — same shape it already uses */
export const PLAN_CATALOG = PLANS.map(function (p) {
  return {
    id: p.key,
    name: p.name,
    monthlyPrice: p.monthly,
    yearlyPrice: p.yearlyTotal,
    yearlySave: p.yearlySave,
    tagline: p.desc,
    featured: p.featured,
    limits: p.limits,
    included: p.included,
    excluded: p.excluded,
  };
});

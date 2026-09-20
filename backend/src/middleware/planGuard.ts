import { log } from '../lib/logger';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TRIAL_DAYS = 14;

export const PLAN_LIMITS: Record<string, { quizzes: number; leads: number; emails: number; removeBranding: boolean; abTesting: boolean; zapier: boolean; analytics: string; branchingLogic: boolean; integrations: boolean; emailSequences: boolean; whiteLabel: boolean; customDomain: boolean; teamSeats: boolean; scheduling: boolean }> = {
  free:     { quizzes: 0,        leads: 0,        emails: 0,        removeBranding: false, abTesting: false, zapier: false, analytics: 'basic',    branchingLogic: false, integrations: false, emailSequences: false, whiteLabel: false, customDomain: false, teamSeats: false, scheduling: false },
  trial:    { quizzes: Infinity, leads: 3000,     emails: 3000,     removeBranding: true,  abTesting: true,  zapier: true,  analytics: 'advanced', branchingLogic: true,  integrations: true,  emailSequences: true,  whiteLabel: false, customDomain: false, teamSeats: false, scheduling: true },
  core:     { quizzes: 5,        leads: 1000,     emails: 1000,     removeBranding: true,  abTesting: false, zapier: false, analytics: 'standard', branchingLogic: true,  integrations: false, emailSequences: false, whiteLabel: false, customDomain: false, teamSeats: false, scheduling: true },
  pro:      { quizzes: Infinity, leads: 3000,     emails: 3000,     removeBranding: true,  abTesting: true,  zapier: true,  analytics: 'advanced', branchingLogic: true,  integrations: true,  emailSequences: true,  whiteLabel: false, customDomain: false, teamSeats: false, scheduling: true },
  business: { quizzes: Infinity, leads: Infinity, emails: Infinity, removeBranding: true,  abTesting: true,  zapier: true,  analytics: 'advanced', branchingLogic: true,  integrations: true,  emailSequences: true,  whiteLabel: true,  customDomain: true,  teamSeats: true,  scheduling: true },
  // Legacy aliases — map old plan names to current plans
  starter:  { quizzes: 5,        leads: 1000,     emails: 1000,     removeBranding: true,  abTesting: false, zapier: false, analytics: 'standard', branchingLogic: true,  integrations: false, emailSequences: false, whiteLabel: false, customDomain: false, teamSeats: false, scheduling: true },
  growth:   { quizzes: 5,        leads: 1000,     emails: 1000,     removeBranding: true,  abTesting: false, zapier: false, analytics: 'standard', branchingLogic: true,  integrations: false, emailSequences: false, whiteLabel: false, customDomain: false, teamSeats: false, scheduling: true },
  agency:   { quizzes: Infinity, leads: Infinity, emails: Infinity, removeBranding: true,  abTesting: true,  zapier: true,  analytics: 'advanced', branchingLogic: true,  integrations: true,  emailSequences: true,  whiteLabel: true,  customDomain: true,  teamSeats: true,  scheduling: true },
};

/**
 * Resolve a plan string (which may be a legacy alias) to a canonical name.
 */
export function canonicalPlanName(plan: string): string {
  if (plan === 'starter' || plan === 'growth') return 'core';
  if (plan === 'agency') return 'business';
  if (plan === 'free') return 'free';
  return plan;
}

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS['free'];
}

/**
 * Legacy entitlements (migration 032): a user with an ACTIVE legacy entitlement whose stored plan reads free/trial is entitled to
 * Business. A lookup failure falls back to the stored plan, so an error can neither grant nor remove access on its own.
 */
export async function entitledPlan(userId: string | null | undefined, plan: string | null | undefined): Promise<string> {
  const stored = plan ?? 'free';
  if (!userId || (stored !== 'free' && stored !== 'trial')) return stored;
  try {
    const { data, error } = await supabase.from('legacy_entitlements').select('effective_plan').eq('user_id', userId).eq('active', true).maybeSingle();
    if (!error && data?.effective_plan) return data.effective_plan;
  } catch (err: any) {
    log.error('entitledPlan lookup failed', { err: err?.message });
  }
  return stored;
}

export function isTrialActive(createdAt: string): boolean {
  const created = new Date(createdAt);
  const trialEnd = new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return new Date() < trialEnd;
}

export function trialDaysRemaining(createdAt: string): number {
  const created = new Date(createdAt);
  const trialEnd = new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const ms = trialEnd.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export async function guardQuizCreation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, plan, quiz_count, created_at')
      .eq('id', req.dbUserId)
      .single();

    if (error || !user) {
      log.error('guardQuizCreation: user not found for dbUserId:', { err: req.dbUserId });
      return res.status(404).json({ error: 'User not found' });
    }

    const plan = await entitledPlan(user.id, user.plan ?? 'free');
    const onTrial = plan === 'free' || plan === 'trial';

    if (onTrial) {
      if (!isTrialActive(user.created_at)) {
        return res.status(403).json({
          error: 'trial_expired',
          message: 'Your 14-day trial has ended. Pick a plan to keep capturing leads — plans start at $9/mo.',
          upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
        });
      }
      (req as any).userPlan = 'trial';
      (req as any).quizCount = user.quiz_count ?? 0;
      return next();
    }

    const limits = getPlanLimits(plan);
    const limit = limits.quizzes;
    const quizCount = user.quiz_count ?? 0;
    const displayName = canonicalPlanName(plan);

    // For unlimited plans, skip the atomic check — increment happens in the route
    if (limit === Infinity) {
      (req as any).userPlan = plan;
      (req as any).quizCount = quizCount;
      return next();
    }

    // Atomic check-and-increment to prevent race condition
    var { data: allowed, error: rpcErr } = await supabase.rpc('try_increment_quiz_count', { uid: req.dbUserId, max_allowed: limit });
    if (rpcErr || !allowed) {
      return res.status(403).json({
        error: 'quiz_limit_reached',
        message: `You've reached your ${displayName} plan limit of ${limit} quizzes. Upgrade to get unlimited quizzes.`,
        current: quizCount,
        limit,
        upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
      });
    }

    (req as any).userPlan = plan;
    (req as any).quizCount = quizCount + 1;
    (req as any).quizCountIncrementedAtomically = true;
    next();
  } catch (err: any) {
    log.error('guardQuizCreation error:', { err: err.message });
    res.status(500).json({ error: err.message ?? 'Plan check failed' });
  }
}

// ── Phase 1 additions ────────────────────────────────────────────────────────

type FeatureKey = 'abTesting' | 'integrations' | 'emailSequences' | 'teamSeats' | 'whiteLabel' | 'customDomain' | 'zapier';

const FEATURE_LABEL: Record<FeatureKey, string> = {
  abTesting: 'A/B testing',
  integrations: 'Integrations',
  emailSequences: 'Follow-up email sequences',
  teamSeats: 'Team seats',
  whiteLabel: 'White-label branding',
  customDomain: 'Custom domains',
  zapier: 'Zapier',
};

/** free / trial accounts inside the 14-day trial get trial limits; after it they fall back to the (empty) free limits. */
export function effectivePlan(plan: string | null | undefined, createdAt?: string | null): { plan: string; trialExpired: boolean } {
  const p = plan ?? 'free';
  if (p === 'free' || p === 'trial') {
    if (createdAt && isTrialActive(createdAt)) return { plan: 'trial', trialExpired: false };
    return { plan: 'free', trialExpired: true };
  }
  return { plan: p, trialExpired: false };
}

/**
 * Server-side feature gate. Hiding a button in the UI is not an entitlement control: a direct API call must be refused too.
 * Only creation endpoints are gated so a downgraded customer can still view and clean up existing objects.
 */
export function requireFeature(feature: FeatureKey) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { data: user, error } = await supabase.from('users').select('plan, created_at').eq('id', req.dbUserId).single();
      if (error || !user) return res.status(error && error.code !== 'PGRST116' ? 503 : 404).json({ error: error && error.code !== 'PGRST116' ? 'Service temporarily unavailable' : 'User not found', code: error && error.code !== 'PGRST116' ? 'db_unavailable' : 'user_not_found' });
      const { plan } = effectivePlan(await entitledPlan(req.dbUserId, user.plan), user.created_at);
      const limits = getPlanLimits(plan) as any;
      if (!limits[feature]) {
        return res.status(403).json({
          error: 'plan_required',
          feature,
          message: `${FEATURE_LABEL[feature]} is not included in your current plan. Upgrade to use it.`,
          upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
        });
      }
      next();
    } catch (err: any) {
      log.error('requireFeature error', { err: err?.message, feature });
      res.status(500).json({ error: 'Plan check failed', code: 'plan_check_failed' });
    }
  };
}

/**
 * Non-incrementing quiz-creation gate for endpoints that only *might* store a quiz (or store it after a slow AI call):
 * same trial/limit rules as guardQuizCreation, but it does not consume quota. The route increments after a successful insert.
 */
export async function checkQuizAllowance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { data: user, error } = await supabase.from('users').select('id, plan, quiz_count, created_at').eq('id', req.dbUserId).single();
    if (error || !user) {
      const outage = !!error && error.code !== 'PGRST116';
      return res.status(outage ? 503 : 404).json({ error: outage ? 'Service temporarily unavailable' : 'User not found', code: outage ? 'db_unavailable' : 'user_not_found' });
    }
    const plan = await entitledPlan(user.id, user.plan ?? 'free');
    if (plan === 'free' || plan === 'trial') {
      if (!isTrialActive(user.created_at)) {
        return res.status(403).json({
          error: 'trial_expired',
          message: 'Your 14-day trial has ended. Pick a plan to keep capturing leads — plans start at $9/mo.',
          upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
        });
      }
      return next();
    }
    const limit = getPlanLimits(plan).quizzes;
    const count = user.quiz_count ?? 0;
    if (limit !== Infinity && count >= limit) {
      return res.status(403).json({
        error: 'quiz_limit_reached',
        message: `You've reached your ${canonicalPlanName(plan)} plan limit of ${limit} quizzes. Upgrade to get unlimited quizzes.`,
        current: count,
        limit,
        upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
      });
    }
    next();
  } catch (err: any) {
    log.error('checkQuizAllowance error', { err: err?.message });
    res.status(500).json({ error: 'Plan check failed', code: 'plan_check_failed' });
  }
}
import { log } from '../lib/logger';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TRIAL_DAYS = 14;

export const PLAN_LIMITS: Record<string, { quizzes: number; leads: number; emails: number; removeBranding: boolean; abTesting: boolean; zapier: boolean; analytics: string; branchingLogic: boolean; integrations: boolean; emailSequences: boolean; whiteLabel: boolean; customDomain: boolean; teamSeats: boolean; scheduling: boolean }> = {
  free:     { quizzes: 0,        leads: 0,        emails: 0,        removeBranding: false, abTesting: false, zapier: false, analytics: 'basic',    branchingLogic: false, integrations: false, emailSequences: false, whiteLabel: false, customDomain: false, teamSeats: false, scheduling: false },
  trial:    { quizzes: Infinity, leads: 3000,     emails: 3000,     removeBranding: true,  abTesting: true,  zapier: true,  analytics: 'advanced', branchingLogic: true,  integrations: true,  emailSequences: true,  whiteLabel: false, customDomain: false, teamSeats: false, scheduling: true },
  core:     { quizzes: 5,        leads: 1000,     emails: 1000,     removeBranding: true,  abTesting: false, zapier: false, analytics: 'standard', branchingLogic: true,  integrations: false, emailSequences: false, whiteLabel: false, customDomain: false, teamSeats: false, scheduling: true },
  pro:      { quizzes: Infinity, leads: 3000,     emails: 3000,     removeBranding: true,  abTesting: true,  zapier: true,  analytics: 'advanced', branchingLogic: true,  integrations: true,  emailSequences: true,  whiteLabel: false, customDomain: false, teamSeats: false, scheduling: true },
  business: { quizzes: Infinity, leads: Infinity, emails: Infinity, removeBranding: true,  abTesting: true,  zapier: true,  analytics: 'advanced', branchingLogic: true,  integrations: true,  emailSequences: true,  whiteLabel: true,  customDomain: true,  teamSeats: true,  scheduling: true },
  // Legacy aliases — map old plan names to current plans
  starter:  { quizzes: 5,        leads: 1000,     emails: 1000,     removeBranding: true,  abTesting: false, zapier: false, analytics: 'standard', branchingLogic: true,  integrations: false, emailSequences: false, whiteLabel: false, customDomain: false, teamSeats: false, scheduling: true },
  growth:   { quizzes: 5,        leads: 1000,     emails: 1000,     removeBranding: true,  abTesting: false, zapier: false, analytics: 'standard', branchingLogic: true,  integrations: false, emailSequences: false, whiteLabel: false, customDomain: false, teamSeats: false, scheduling: true },
  agency:   { quizzes: Infinity, leads: Infinity, emails: Infinity, removeBranding: true,  abTesting: true,  zapier: true,  analytics: 'advanced', branchingLogic: true,  integrations: true,  emailSequences: true,  whiteLabel: true,  customDomain: true,  teamSeats: true,  scheduling: true },
};

/**
 * Resolve a plan string (which may be a legacy alias) to a canonical name.
 */
export function canonicalPlanName(plan: string): string {
  if (plan === 'starter' || plan === 'growth') return 'core';
  if (plan === 'agency') return 'business';
  if (plan === 'free') return 'free';
  return plan;
}

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS['free'];
}

export function isTrialActive(createdAt: string): boolean {
  const created = new Date(createdAt);
  const trialEnd = new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return new Date() < trialEnd;
}

export function trialDaysRemaining(createdAt: string): number {
  const created = new Date(createdAt);
  const trialEnd = new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const ms = trialEnd.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export async function guardQuizCreation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, plan, quiz_count, created_at')
      .eq('id', req.dbUserId)
      .single();

    if (error || !user) {
      log.error('guardQuizCreation: user not found for dbUserId:', { err: req.dbUserId });
      return res.status(404).json({ error: 'User not found' });
    }

    const plan = user.plan ?? 'free';
    const onTrial = plan === 'free' || plan === 'trial';

    if (onTrial) {
      if (!isTrialActive(user.created_at)) {
        return res.status(403).json({
          error: 'trial_expired',
          message: 'Your 14-day trial has ended. Pick a plan to keep capturing leads — plans start at $9/mo.',
          upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
        });
      }
      (req as any).userPlan = 'trial';
      (req as any).quizCount = user.quiz_count ?? 0;
      return next();
    }

    const limits = getPlanLimits(plan);
    const limit = limits.quizzes;
    const quizCount = user.quiz_count ?? 0;
    const displayName = canonicalPlanName(plan);

    // For unlimited plans, skip the atomic check — increment happens in the route
    if (limit === Infinity) {
      (req as any).userPlan = plan;
      (req as any).quizCount = quizCount;
      return next();
    }

    // Atomic check-and-increment to prevent race condition
    var { data: allowed, error: rpcErr } = await supabase.rpc('try_increment_quiz_count', { uid: req.dbUserId, max_allowed: limit });
    if (rpcErr || !allowed) {
      return res.status(403).json({
        error: 'quiz_limit_reached',
        message: `You've reached your ${displayName} plan limit of ${limit} quizzes. Upgrade to get unlimited quizzes.`,
        current: quizCount,
        limit,
        upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
      });
    }

    (req as any).userPlan = plan;
    (req as any).quizCount = quizCount + 1;
    (req as any).quizCountIncrementedAtomically = true;
    next();
  } catch (err: any) {
    log.error('guardQuizCreation error:', { err: err.message });
    res.status(500).json({ error: err.message ?? 'Plan check failed' });
  }
}

// ── Phase 1 additions ────────────────────────────────────────────────────────

type FeatureKey = 'abTesting' | 'integrations' | 'emailSequences' | 'teamSeats' | 'whiteLabel' | 'customDomain' | 'zapier';

const FEATURE_LABEL: Record<FeatureKey, string> = {
  abTesting: 'A/B testing',
  integrations: 'Integrations',
  emailSequences: 'Follow-up email sequences',
  teamSeats: 'Team seats',
  whiteLabel: 'White-label branding',
  customDomain: 'Custom domains',
  zapier: 'Zapier',
};

/** free / trial accounts inside the 14-day trial get trial limits; after it they fall back to the (empty) free limits. */
export function effectivePlan(plan: string | null | undefined, createdAt?: string | null): { plan: string; trialExpired: boolean } {
  const p = plan ?? 'free';
  if (p === 'free' || p === 'trial') {
    if (createdAt && isTrialActive(createdAt)) return { plan: 'trial', trialExpired: false };
    return { plan: 'free', trialExpired: true };
  }
  return { plan: p, trialExpired: false };
}

/**
 * Server-side feature gate. Hiding a button in the UI is not an entitlement control: a direct API call must be refused too.
 * Only creation endpoints are gated so a downgraded customer can still view and clean up existing objects.
 */
export function requireFeature(feature: FeatureKey) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { data: user, error } = await supabase.from('users').select('plan, created_at').eq('id', req.dbUserId).single();
      if (error || !user) return res.status(error && error.code !== 'PGRST116' ? 503 : 404).json({ error: error && error.code !== 'PGRST116' ? 'Service temporarily unavailable' : 'User not found', code: error && error.code !== 'PGRST116' ? 'db_unavailable' : 'user_not_found' });
      const { plan } = effectivePlan(user.plan, user.created_at);
      const limits = getPlanLimits(plan) as any;
      if (!limits[feature]) {
        return res.status(403).json({
          error: 'plan_required',
          feature,
          message: `${FEATURE_LABEL[feature]} is not included in your current plan. Upgrade to use it.`,
          upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
        });
      }
      next();
    } catch (err: any) {
      log.error('requireFeature error', { err: err?.message, feature });
      res.status(500).json({ error: 'Plan check failed', code: 'plan_check_failed' });
    }
  };
}

/**
 * Non-incrementing quiz-creation gate for endpoints that only *might* store a quiz (or store it after a slow AI call):
 * same trial/limit rules as guardQuizCreation, but it does not consume quota. The route increments after a successful insert.
 */
export async function checkQuizAllowance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { data: user, error } = await supabase.from('users').select('id, plan, quiz_count, created_at').eq('id', req.dbUserId).single();
    if (error || !user) {
      const outage = !!error && error.code !== 'PGRST116';
      return res.status(outage ? 503 : 404).json({ error: outage ? 'Service temporarily unavailable' : 'User not found', code: outage ? 'db_unavailable' : 'user_not_found' });
    }
    const plan = user.plan ?? 'free';
    if (plan === 'free' || plan === 'trial') {
      if (!isTrialActive(user.created_at)) {
        return res.status(403).json({
          error: 'trial_expired',
          message: 'Your 14-day trial has ended. Pick a plan to keep capturing leads — plans start at $9/mo.',
          upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
        });
      }
      return next();
    }
    const limit = getPlanLimits(plan).quizzes;
    const count = user.quiz_count ?? 0;
    if (limit !== Infinity && count >= limit) {
      return res.status(403).json({
        error: 'quiz_limit_reached',
        message: `You've reached your ${canonicalPlanName(plan)} plan limit of ${limit} quizzes. Upgrade to get unlimited quizzes.`,
        current: count,
        limit,
        upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
      });
    }
    next();
  } catch (err: any) {
    log.error('checkQuizAllowance error', { err: err?.message });
    res.status(500).json({ error: 'Plan check failed', code: 'plan_check_failed' });
  }
}

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

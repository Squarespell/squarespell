import { log } from '../lib/logger';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TRIAL_DAYS = 14;

export const PLAN_LIMITS: Record<string, { quizzes: number; leads: number; emails: number; removeBranding: boolean; abTesting: boolean; zapier: boolean; analytics: string; branchingLogic: boolean; integrations: boolean; emailSequences: boolean; whiteLabel: boolean; customDomain: boolean; teamSeats: boolean }> = {
  free:     { quizzes: 0,        leads: 0,        emails: 0,        removeBranding: false, abTesting: false, zapier: false, analytics: 'basic',    branchingLogic: false, integrations: false, emailSequences: false, whiteLabel: false, customDomain: false, teamSeats: false },
  trial:    { quizzes: Infinity, leads: 2000,     emails: 2000,     removeBranding: true,  abTesting: true,  zapier: true,  analytics: 'advanced', branchingLogic: true,  integrations: true,  emailSequences: true,  whiteLabel: false, customDomain: false, teamSeats: false },
  starter:  { quizzes: 3,        leads: 500,      emails: 500,      removeBranding: true,  abTesting: false, zapier: false, analytics: 'standard', branchingLogic: false, integrations: false, emailSequences: false, whiteLabel: false, customDomain: false, teamSeats: false },
  pro:      { quizzes: Infinity, leads: 2000,     emails: 2000,     removeBranding: true,  abTesting: true,  zapier: true,  analytics: 'advanced', branchingLogic: true,  integrations: true,  emailSequences: true,  whiteLabel: false, customDomain: false, teamSeats: false },
  business: { quizzes: Infinity, leads: Infinity, emails: Infinity, removeBranding: true,  abTesting: true,  zapier: true,  analytics: 'advanced', branchingLogic: true,  integrations: true,  emailSequences: true,  whiteLabel: true,  customDomain: true,  teamSeats: true },
  // Legacy aliases — map old plan names to new ones
  growth:   { quizzes: 3,        leads: 500,      emails: 500,      removeBranding: true,  abTesting: false, zapier: false, analytics: 'standard', branchingLogic: false, integrations: false, emailSequences: false, whiteLabel: false, customDomain: false, teamSeats: false },
  agency:   { quizzes: Infinity, leads: Infinity, emails: Infinity, removeBranding: true,  abTesting: true,  zapier: true,  analytics: 'advanced', branchingLogic: true,  integrations: true,  emailSequences: true,  whiteLabel: true,  customDomain: true,  teamSeats: true },
};

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS['free'];
}

function isTrialActive(createdAt: string): boolean {
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
          message: 'Your 14-day trial has ended. Choose a plan to keep your quizzes running.',
          upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
        });
      }
      (req as any).userPlan = 'trial';
      (req as any).quizCount = user.quiz_count ?? 0;
      return next();
    }

    const limit = PLAN_LIMITS[plan]?.quizzes ?? 5;
    const quizCount = user.quiz_count ?? 0;

    if (quizCount >= limit) {
      return res.status(403).json({
        error: 'quiz_limit_reached',
        message: `You have reached your ${plan} plan limit of ${limit} quizzes.`,
        current: quizCount,
        limit,
        upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
      });
    }

    (req as any).userPlan = plan;
    (req as any).quizCount = quizCount;
    next();
  } catch (err: any) {
    log.error('guardQuizCreation error:', { err: err.message });
    res.status(500).json({ error: err.message ?? 'Plan check failed' });
  }
}

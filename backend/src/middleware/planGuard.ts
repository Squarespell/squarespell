import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TRIAL_DAYS = 7;

export const PLAN_LIMITS: Record<string, { quizzes: number; leads: number }> = {
  free:    { quizzes: 999,      leads: 999999 },
  trial:   { quizzes: 999,      leads: 999999 },
  starter: { quizzes: 5,        leads: 500 },
  pro:     { quizzes: 20,       leads: 5000 },
  agency:  { quizzes: Infinity, leads: Infinity },
};

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS['starter'];
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
      console.error('guardQuizCreation: user not found for dbUserId:', req.dbUserId);
      return res.status(404).json({ error: 'User not found' });
    }

    const plan = user.plan ?? 'free';
    const onTrial = plan === 'free' || plan === 'trial';

    if (onTrial) {
      if (!isTrialActive(user.created_at)) {
        return res.status(403).json({
          error: 'trial_expired',
          message: 'Your 7-day free trial has ended. Please choose a plan to continue.',
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
    console.error('guardQuizCreation error:', err.message);
    res.status(500).json({ error: err.message ?? 'Plan check failed' });
  }
}

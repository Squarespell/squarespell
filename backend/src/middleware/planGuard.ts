import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

const PLAN_LIMITS: Record<string, { quizzes: number; leads: number }> = {
  free:    { quizzes: 1,        leads: 50 },
  starter: { quizzes: 5,        leads: 500 },
  pro:     { quizzes: 20,       leads: 5000 },
  agency:  { quizzes: Infinity, leads: Infinity }
};

export function guardQuizCreation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const plan: string = (req as any).userPlan ?? 'free';
  const quizCount: number = (req as any).quizCount ?? 0;
  const limit = PLAN_LIMITS[plan]?.quizzes ?? 1;
  if (quizCount >= limit) {
    return res.status(403).json({ error: 'Quiz limit reached', current: quizCount, limit, upgrade_url: `${process.env.FRONTEND_URL}/pricing` });
  }
  next();
}

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

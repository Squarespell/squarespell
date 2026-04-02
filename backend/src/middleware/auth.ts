import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { supabase } from '../db/supabaseClient';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  dbUserId?: string;
}

export const requireAuth = ClerkExpressRequireAuth();

export async function attachUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const clerkUserId = (req as any).auth?.userId;
  if (!clerkUserId) return res.status(401).json({ error: 'Unauthorized' });
  const { data: user, error } = await supabase
    .from('users').select('id,plan,quiz_count').eq('clerk_user_id', clerkUserId).single();
  if (error || !user) return res.status(401).json({ error: 'User not found' });
  req.userId = clerkUserId;
  req.dbUserId = user.id;
  (req as any).userPlan = user.plan;
  (req as any).quizCount = user.quiz_count;
  next();
}

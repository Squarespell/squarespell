import { clerkClient } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabaseClient';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  dbUserId?: string;
  user?: any;
  body: any;
  params: any;
}

function getClerkUserIdFromToken(token: string): string | null {
  try {
    const base64Payload = token.split('.')[1];
    if (!base64Payload) return null;
    const padded = base64Payload + '=='.slice((base64Payload.length + 3) % 4 || 0);
    const json = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(json);
    if (!payload.sub) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const userId = getClerkUserIdFromToken(header.slice(7));
  if (!userId) return res.status(401).json({ error: 'Invalid token' });
  (req as any).auth = { userId };
  next();
}

export async function attachUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const clerkUserId = (req as any).auth?.userId;
    if (!clerkUserId) return res.status(401).json({ error: 'Unauthenticated' });
    let { data: user } = await supabase.from('users').select('*').eq('clerk_user_id', clerkUserId).single();
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      const email = clerkUser.emailAddresses[0]?.emailAddress || '';
      const { data: newUser, error } = await supabase
        .from('users').insert({ clerk_user_id: clerkUserId, email, plan: 'free', quiz_count: 0 }).select().single();
      if (error) return res.status(500).json({ error: 'Failed to create user' });
      user = newUser;
    }
    req.user = user;
    req.userId = clerkUserId;
    req.dbUserId = user.id;
    (req as any).userPlan = user.plan;
    (req as any).quizCount = user.quiz_count;
    next();
  } catch (err: any) {
    console.error('attachUser:', err?.message);
    res.status(500).json({ error: 'Server error' });
  }
}

export const authenticate = [requireAuth, attachUser];

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

// Verify Bearer token — no Clerk middleware, works on all SDK versions
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.slice(7);
    const payload = await clerkClient.verifyToken(token);
    (req as any).auth = { userId: payload.sub };
    next();
  } catch (err: any) {
    console.error('requireAuth error:', err?.message);
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Find or auto-create user in Supabase
export async function attachUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const clerkUserId = (req as any).auth?.userId;
    if (!clerkUserId) return res.status(401).json({ error: 'Unauthenticated' });

    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      const email = clerkUser.emailAddresses[0]?.emailAddress || '';
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ clerk_user_id: clerkUserId, email, plan: 'free', quiz_count: 0 })
        .select()
        .single();
      if (createError) {
        console.error('Create user error:', createError.message);
        return res.status(500).json({ error: 'Failed to create user' });
      }
      user = newUser;
    }

    req.user = user;
    req.userId = clerkUserId;
    req.dbUserId = user.id;
    (req as any).userPlan = user.plan;
    (req as any).quizCount = user.quiz_count;
    next();
  } catch (err: any) {
    console.error('attachUser error:', err?.message);
    res.status(401).json({ error: 'Auth failed' });
  }
}

// Combined — for any route using array pattern
export const authenticate = [requireAuth, attachUser];

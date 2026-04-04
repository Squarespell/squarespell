import { ClerkExpressRequireAuth, clerkClient } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabaseClient';

export interface AuthenticatedRequest extends Request {
  auth?: { userId: string };
  user?: any;
  body: any;
  params: any;
}

export const authenticate = [
  ClerkExpressRequireAuth(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const clerkUserId = (req as any).auth?.userId;
      if (!clerkUserId) return res.status(401).json({ error: 'Unauthenticated' });

      // Try to find existing user
      let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single();

      // Auto-create user if not found (no webhook needed)
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
      next();
    } catch (err: any) {
      console.error('Auth error:', err?.message || err);
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
];

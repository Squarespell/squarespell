import { clerkClient } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabaseClient';

export interface AuthenticatedRequest extends Request {
  user?: any;
  body: any;
  params: any;
}

// Manually verify Bearer token — no Clerk middleware needed
async function getClerkUserId(req: Request): Promise<string | null> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return null;
    const token = header.slice(7);
    const payload = await clerkClient.verifyToken(token);
    return payload.sub || null;
  } catch {
    return null;
  }
}

export const authenticate = [
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const clerkUserId = await getClerkUserId(req);
      if (!clerkUserId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      // Find user in Supabase
      let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single();

      // Auto-create user if first login (no webhook needed)
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
      console.error('Auth error:', err?.message);
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
];

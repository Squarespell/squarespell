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

// Decode JWT payload to extract session ID and user ID
function decodeJWT(token: string): { sid?: string; sub?: string; exp?: number } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = Buffer.from(part, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    try {
      // Fallback: standard base64
      const part = token.split('.')[1];
      const json = Buffer.from(part, 'base64').toString('utf8');
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}

async function getClerkUserId(token: string): Promise<string | null> {
  try {
    const decoded = decodeJWT(token);
    if (!decoded) return null;

    // Check token hasn't expired
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      console.log('Token expired');
      return null;
    }

    const sessionId = decoded.sid;
    const userId = decoded.sub;

    if (!sessionId || !userId) {
      console.log('No sid or sub in token');
      return null;
    }

    // Verify session is active via Clerk API
    const session = await clerkClient.sessions.getSession(sessionId);
    if (session && session.status === 'active' && session.userId === userId) {
      return userId;
    }

    console.log('Session not active or userId mismatch', session?.status);
    return null;
  } catch (err: any) {
    console.error('getClerkUserId error:', err?.message);
    return null;
  }
}

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
    const clerkUserId = await getClerkUserId(token);

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    (req as any).auth = { userId: clerkUserId };
    next();
  } catch (err: any) {
    console.error('requireAuth error:', err?.message);
    res.status(401).json({ error: 'Auth error' });
  }
}

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

export const authenticate = [requireAuth, attachUser];

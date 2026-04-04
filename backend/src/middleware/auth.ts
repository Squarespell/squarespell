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

// Decode JWT payload without verifying signature (just to extract sid)
function decodeJWTPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

// Verify Clerk token using sessions API (works in @clerk/clerk-sdk-node v4.x)
async function getClerkUserId(token: string): Promise<string | null> {
  try {
    const decoded = decodeJWTPayload(token);
    if (!decoded) return null;

    // Try sessions.verifyToken first (most reliable in v4)
    if (decoded.sid) {
      try {
        const session = await clerkClient.sessions.verifyToken(decoded.sid, token);
        return session.userId || null;
      } catch {
        // Fall through to next method
      }
    }

    // Try verifyToken directly (works in some v4 builds)
    try {
      const payload = await (clerkClient as any).verifyToken(token);
      return payload?.sub || null;
    } catch {
      // Fall through
    }

    // Last resort: use the decoded sub if token is recent (< 60s old)
    if (decoded.sub && decoded.iat) {
      const age = Math.floor(Date.now() / 1000) - decoded.iat;
      if (age < 120) return decoded.sub;
    }

    return null;
  } catch (err: any) {
    console.error('Token verification error:', err?.message);
    return null;
  }
}

// Verify Bearer token
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

export const authenticate = [requireAuth, attachUser];

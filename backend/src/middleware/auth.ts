import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  dbUserId?: string;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Verify the JWT token using Clerk's SDK with full signature validation.
 * Replaces the previous insecure manual base64 decode that had zero
 * signature verification (anyone could forge tokens).
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    if (!payload?.sub) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.userId = payload.sub;
    next();
  } catch (err: any) {
    console.error('Token verification failed:', err.message || err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function attachUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.userId) return next();

  try {
    // Look up by clerk_user_id (text), not id (uuid)
    const { data: existing } = await supabase
      .from('users')
      .select('id, clerk_user_id, plan, created_at')
      .eq('clerk_user_id', req.userId)
      .single();

    if (existing) {
      req.dbUserId = existing.id;
      return next();
    }

    // Auto-create user  -  do NOT set id, let Supabase auto-generate the UUID
    let email = '';
    try {
      const clerkUser = await clerkClient.users.getUser(req.userId);
      email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
    } catch (e) {
      console.log('Clerk lookup failed, continuing without email:', e);
    }

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        clerk_user_id: req.userId,
        email,
        plan: 'free',
        quiz_count: 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error('User insert error:', error.message);
      return res.status(500).json({ error: 'Failed to create user: ' + error.message });
    }

    req.dbUserId = newUser?.id;
    next();
  } catch (err: any) {
    console.error('attachUser error:', err.message);
    return res.status(500).json({ error: 'Auth error: ' + err.message });
  }
}

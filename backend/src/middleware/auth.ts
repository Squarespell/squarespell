import { Request, Response, NextFunction } from 'express';
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

function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

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
  const payload = decodeJwt(token);
  if (!payload?.sub) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.userId = payload.sub;
  next();
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

    // Auto-create user — do NOT set id, let Supabase auto-generate the UUID
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

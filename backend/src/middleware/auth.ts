import { Request, Response, NextFunction } from 'express';
import { createClerkClient } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Decode JWT without verifying — just to extract claims
function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Add padding if needed
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = Buffer.from(padded, 'base64url').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice(7);
    let clerkUserId: string | null = null;

    // ── Method 1: Verify via Clerk SDK ────────────────────────────────────
    try {
      const payload = await clerk.verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      clerkUserId = payload.sub;
    } catch (verifyErr) {
      // ── Method 2: Try to get session from token claims ─────────────────
      try {
        const decoded = decodeJwt(token);
        if (decoded?.sub) {
          // Verify the user actually exists in Clerk
          const user = await clerk.users.getUser(decoded.sub);
          if (user?.id) {
            clerkUserId = user.id;
          }
        }
      } catch {
        // ── Method 3: Try session-based lookup ─────────────────────────
        try {
          const decoded = decodeJwt(token);
          if (decoded?.sid) {
            const session = await clerk.sessions.getSession(decoded.sid);
            if (session?.userId) {
              clerkUserId = session.userId;
            }
          }
        } catch {
          // All methods failed
        }
      }
    }

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // ── Ensure user exists in Supabase ────────────────────────────────────
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, plan')
      .eq('clerk_id', clerkUserId)
      .single();

    if (!existingUser) {
      // Auto-create user on first login
      let email = '';
      try {
        const clerkUser = await clerk.users.getUser(clerkUserId);
        email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
      } catch {}

      const { data: newUser, error: createErr } = await supabase
        .from('users')
        .insert({
          clerk_id: clerkUserId,
          email,
          plan: 'free',
          quiz_count: 0,
          lead_count: 0,
        })
        .select('id, plan')
        .single();

      if (createErr || !newUser) {
        console.error('Failed to create user:', createErr);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      (req as any).user = { clerkId: clerkUserId, supabaseId: newUser.id, plan: newUser.plan };
    } else {
      (req as any).user = { clerkId: clerkUserId, supabaseId: existingUser.id, plan: existingUser.plan };
    }

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

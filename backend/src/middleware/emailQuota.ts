import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabaseClient';
import { limitFor } from '../services/email/limits';
export async function emailQuota(req: Request, res: Response, next: NextFunction) {
  // Use req.dbUserId (set by attachUser middleware) — this is the Supabase user UUID
  // Fallback to req.auth?.userId for backward compat, but dbUserId is canonical
  const tenantId = (req as any).dbUserId || (req as any).auth?.userId;
  if (!tenantId) return res.status(401).json({ error: 'unauthorized' });

  // Get plan from user record (already fetched by attachUser)
  const plan = (req as any).userPlan || 'starter';
  const periodStart = new Date(); periodStart.setDate(1);
  const ps = periodStart.toISOString().slice(0,10);
  const { data } = await supabase.from('email_quota_usage')
    .select('sends').eq('tenant_id', tenantId).eq('period_start', ps).maybeSingle();
  const used = data?.sends ?? 0;
  const cap = limitFor(plan);
  if (used >= cap) return res.status(402).json({ error: 'email_quota_exceeded', used, cap, plan });
  (req as any).emailQuota = { used, cap, periodStart: ps };
  next();
}

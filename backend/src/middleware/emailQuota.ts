import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabaseClient';
import { limitFor } from '../services/email/limits';
export async function emailQuota(req: Request, res: Response, next: NextFunction) {
  const tenantId = (req as any).auth?.userId;
  const plan = (req as any).auth?.plan || 'starter';
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

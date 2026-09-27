import { supabase } from '../../db/supabaseClient';
import { log } from '../../lib/logger';

export type AuthAuditEntry = {
  emailNormalized?: string | null;
  action: string;
  outcome: string;
  ip?: string | null;
  userAgent?: string | null;
  detail?: string | null;
};

/**
 * Best-effort audit write. Never throws -- a logging failure must not break
 * the auth flow it is observing. Never stores a plaintext code or session
 * token; callers only ever pass emails, action/outcome labels and IPs/UAs.
 */
export async function recordAuthAudit(entry: AuthAuditEntry): Promise<void> {
  try {
    const { error } = await supabase.from('auth_audit_log').insert({
      email_normalized: entry.emailNormalized || null,
      action: entry.action,
      outcome: entry.outcome,
      ip: entry.ip || null,
      user_agent: entry.userAgent || null,
      detail: entry.detail || null,
    });
    if (error) log.error('recordAuthAudit: insert failed', { err: error.message });
  } catch (err: any) {
    log.error('recordAuthAudit threw', { err: err?.message });
  }
}


import { supabase } from '../db/supabaseClient';
import { log } from '../lib/logger';

/**
 * Log an integration error to the database for visibility in the dashboard.
 * Non-blocking — callers should .catch() to prevent unhandled rejections.
 */
export async function logIntegrationError(
  integrationId: string,
  integrationType: string,
  userId: string,
  quizId: string,
  errorMessage: string
): Promise<void> {
  try {
    await supabase.from('integration_errors').insert({
      integration_id: integrationId,
      integration_type: integrationType,
      user_id: userId,
      quiz_id: quizId,
      error_message: errorMessage.slice(0, 1000), // Cap at 1000 chars
      created_at: new Date().toISOString(),
    });
  } catch (e: any) {
    log.error('[IntegrationErrorLog] Failed to log error:', { detail: e?.message });
  }
}

/**
 * Get recent integration errors for a user (for dashboard display).
 */
export async function getIntegrationErrors(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  var { data, error } = await supabase
    .from('integration_errors')
    .select('id, integration_id, integration_type, quiz_id, error_message, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    log.error('[IntegrationErrorLog] Failed to fetch errors:', { detail: error.message });
    return [];
  }
  return data || [];
}

/**
 * Clear integration errors (e.g., after user acknowledges them).
 */
export async function clearIntegrationErrors(
  userId: string,
  integrationId?: string
): Promise<void> {
  var query = supabase.from('integration_errors').delete().eq('user_id', userId);
  if (integrationId) {
    query = query.eq('integration_id', integrationId);
  }
  await query;
}

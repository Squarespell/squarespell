import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';

export interface CleanupSummary {
  analyticsDeleted: number;
  archivedLeadsDeleted: number;
  webhookDeliveriesDeleted: number;
  emailQueueDeleted: number;
  cleanupTimestamp: string;
  success: boolean;
  error?: string;
}

/**
 * Runs database cleanup operations:
 * - Deletes analytics_events older than 90 days
 * - Hard deletes archived leads older than 30 days
 * - Deletes webhook_deliveries older than 30 days
 * - Deletes processed email_sequence_queue entries older than 7 days
 *
 * @returns CleanupSummary with counts of deleted rows
 */
export async function runCleanup(): Promise<CleanupSummary> {
  try {
    // Call the cleanup_old_data() stored procedure
    const { data, error } = await supabase
      .rpc('cleanup_old_data', {});

    if (error) {
      log.error('Database cleanup error:', { err: error });
      return {
        analyticsDeleted: 0,
        archivedLeadsDeleted: 0,
        webhookDeliveriesDeleted: 0,
        emailQueueDeleted: 0,
        cleanupTimestamp: new Date().toISOString(),
        success: false,
        error: error.message,
      };
    }

    // The RPC returns an array with one row containing the summary
    if (!data || data.length === 0) {
      return {
        analyticsDeleted: 0,
        archivedLeadsDeleted: 0,
        webhookDeliveriesDeleted: 0,
        emailQueueDeleted: 0,
        cleanupTimestamp: new Date().toISOString(),
        success: true,
      };
    }

    const result = data[0];
    const summary: CleanupSummary = {
      analyticsDeleted: result.analytics_deleted || 0,
      archivedLeadsDeleted: result.archived_leads_deleted || 0,
      webhookDeliveriesDeleted: result.webhook_deliveries_deleted || 0,
      emailQueueDeleted: result.email_queue_deleted || 0,
      cleanupTimestamp: result.cleanup_timestamp || new Date().toISOString(),
      success: true,
    };

    // Log summary
    log.info('Database cleanup completed:', { detail: summary });

    return summary;
  } catch (err: any) {
    log.error('Unexpected error during database cleanup:', { err: err });
    return {
      analyticsDeleted: 0,
      archivedLeadsDeleted: 0,
      webhookDeliveriesDeleted: 0,
      emailQueueDeleted: 0,
      cleanupTimestamp: new Date().toISOString(),
      success: false,
      error: err.message || 'Unknown error',
    };
  }
}

/**
 * Soft-deletes a lead by setting archived_at timestamp
 * @param leadId UUID of the lead to archive
 * @returns true if successful, false otherwise
 */
export async function archiveLead(leadId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('leads')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', leadId);

    if (error) {
      log.error('Error archiving lead:', { err: error });
      return false;
    }

    return true;
  } catch (err) {
    log.error('Unexpected error archiving lead:', { err: err });
    return false;
  }
}

/**
 * Soft-deletes a quiz by setting archived_at timestamp
 * @param quizId UUID of the quiz to archive
 * @returns true if successful, false otherwise
 */
export async function archiveQuiz(quizId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('quizzes')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', quizId);

    if (error) {
      log.error('Error archiving quiz:', { err: error });
      return false;
    }

    return true;
  } catch (err) {
    log.error('Unexpected error archiving quiz:', { err: err });
    return false;
  }
}

/**
 * Sets data retention policy for a quiz
 * @param quizId UUID of the quiz
 * @param retentionDays Number of days to retain data (null = unlimited)
 * @returns true if successful, false otherwise
 */
export async function setQuizRetention(
  quizId: string,
  retentionDays: number | null
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('quizzes')
      .update({ data_retention_days: retentionDays })
      .eq('id', quizId);

    if (error) {
      log.error('Error setting quiz retention:', { err: error });
      return false;
    }

    return true;
  } catch (err) {
    log.error('Unexpected error setting quiz retention:', { err: err });
    return false;
  }
}

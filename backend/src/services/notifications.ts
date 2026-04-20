/**
 * Notification service - creates and manages in-app notifications.
 *
 * Notification types:
 *   new_lead        - A new lead submitted a quiz
 *   lead_milestone  - Hit a lead count milestone (10, 50, 100, 500, 1000)
 *   quiz_published  - Quiz was published live
 *   quiz_milestone  - Quiz hit a view milestone
 *   campaign_sent   - Email campaign finished sending
 *   sequence_active - Drip sequence activated
 *   weekly_digest   - Weekly performance summary
 *   system          - System announcements
 */

import { supabase } from '../db/supabaseClient';
import { log } from '../lib/logger';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}): Promise<Notification | null> {
  try {
    var { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        body: params.body || null,
        action_url: params.actionUrl || null,
        metadata: params.metadata || {},
      })
      .select()
      .single();

    if (error) {
      log.error('Failed to create notification', { error: error.message, type: params.type });
      return null;
    }
    return data as Notification;
  } catch (err: any) {
    log.error('Notification creation error', { err: err.message });
    return null;
  }
}

export async function getNotifications(userId: string, options?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<Notification[]> {
  var limit = options?.limit || 30;
  var q = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options?.unreadOnly) {
    q = q.eq('read', false);
  }

  var { data, error } = await q;
  if (error) {
    log.error('Failed to fetch notifications', { error: error.message });
    return [];
  }
  return (data || []) as Notification[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  var { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) return 0;
  return count || 0;
}

export async function markAsRead(userId: string, notificationId: string): Promise<boolean> {
  var { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  return !error;
}

export async function markAllAsRead(userId: string): Promise<boolean> {
  var { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  return !error;
}

// ── Event-driven notification creators ───────────────────────────────

var LEAD_MILESTONES = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export async function notifyNewLead(userId: string, leadEmail: string, quizTitle: string, quizId: string): Promise<void> {
  await createNotification({
    userId: userId,
    type: 'new_lead',
    title: 'New lead captured',
    body: leadEmail + ' completed "' + quizTitle + '"',
    actionUrl: '/dashboard/leads',
    metadata: { quiz_id: quizId, lead_email: leadEmail },
  });

  // Check for milestone
  var { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  var total = count || 0;
  if (LEAD_MILESTONES.indexOf(total) >= 0) {
    await createNotification({
      userId: userId,
      type: 'lead_milestone',
      title: total + ' leads captured!',
      body: 'You have reached ' + total + ' total leads. Keep it up!',
      actionUrl: '/dashboard/leads',
      metadata: { milestone: total },
    });
  }
}

export async function notifyQuizPublished(userId: string, quizTitle: string, quizId: string): Promise<void> {
  await createNotification({
    userId: userId,
    type: 'quiz_published',
    title: 'Quiz published',
    body: '"' + quizTitle + '" is now live. Share it with your audience!',
    actionUrl: '/dashboard/' + quizId,
    metadata: { quiz_id: quizId },
  });
}

export async function notifyCampaignSent(userId: string, campaignName: string, recipientCount: number, campaignId: string): Promise<void> {
  await createNotification({
    userId: userId,
    type: 'campaign_sent',
    title: 'Campaign sent',
    body: '"' + campaignName + '" was sent to ' + recipientCount + ' recipients.',
    actionUrl: '/dashboard/emails/' + campaignId,
    metadata: { campaign_id: campaignId, recipients: recipientCount },
  });
}

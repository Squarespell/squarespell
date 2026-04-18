// Cron dispatcher: finds campaigns with status='scheduled' and
// scheduled_at <= now(), then sends each one using the same pipeline as
// the manual /campaigns/:id/send route.

import { supabase } from '../db/supabaseClient';
import { resendProvider } from './email/resendProvider';
import { limitFor } from './email/limits';
import { buildUnsubscribeHeaders, canSpamFooterHtml } from './unsubscribe';
import { applyMergeTags, buildMergeContextFromData } from './mergeTags';

// ---------------------------------------------------------------------------
// Resolve recipients (same logic as emails.ts resolveRecipients)
// ---------------------------------------------------------------------------

async function resolveRecipients(
  tenantId: string,
  sourceQuizId: string,
  filters: any = {},
): Promise<string[]> {
  let q = supabase.from('leads').select('email')
    .eq('user_id', tenantId).eq('quiz_id', sourceQuizId)
    .is('archived_at', null).not('email', 'is', null);
  if (filters?.outcome_id) q = q.eq('outcome_id', filters.outcome_id);
  if (typeof filters?.min_score === 'number') q = q.gte('score', filters.min_score);
  if (typeof filters?.max_score === 'number') q = q.lte('score', filters.max_score);
  if (filters?.since) q = q.gte('created_at', filters.since);
  if (filters?.until) q = q.lte('created_at', filters.until);
  const { data, error } = await q;
  if (error) throw error;
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const row of data || []) {
    const e = (row.email || '').trim().toLowerCase();
    if (e && !seen.has(e)) { seen.add(e); candidates.push(e); }
  }
  if (candidates.length === 0) return candidates;
  const { data: unsubs } = await supabase
    .from('email_unsubscribes')
    .select('email')
    .in('email', candidates);
  const unsubSet = new Set((unsubs || []).map((u: any) => u.email));
  return candidates.filter(e => !unsubSet.has(e));
}

// ---------------------------------------------------------------------------
// Send a single campaign (extracted from emails.ts POST /campaigns/:id/send)
// ---------------------------------------------------------------------------

async function sendCampaign(campaign: any): Promise<{
  campaignId: string;
  sent: number;
  skipped: number;
  resolved: number;
  errors: string[];
}> {
  const tenantId = campaign.tenant_id;
  const errors: string[] = [];

  // Resolve recipients
  let recipients: string[] = [];
  if (campaign.source_quiz_id) {
    recipients = await resolveRecipients(tenantId, campaign.source_quiz_id, campaign.source_filters || {});
  }

  // For live mode, dedupe against already-sent
  if (recipients.length && campaign.mode === 'live') {
    const { data: prior } = await supabase.from('email_sends')
      .select('to_email').eq('campaign_id', campaign.id);
    const already = new Set((prior || []).map((r: any) => r.to_email));
    recipients = recipients.filter((e) => !already.has(e));
  }

  // Check quota
  const { data: userRow } = await supabase.from('users')
    .select('plan').eq('id', tenantId).single();
  const plan = userRow?.plan || 'starter';
  const periodStart = new Date();
  periodStart.setDate(1);
  const ps = periodStart.toISOString().slice(0, 10);
  const { data: quotaRow } = await supabase.from('email_quota_usage')
    .select('sends').eq('tenant_id', tenantId).eq('period_start', ps).maybeSingle();
  const used = quotaRow?.sends ?? 0;
  const cap = limitFor(plan);
  const allowed = recipients.slice(0, Math.max(0, cap - used));

  // Pre-fetch quiz data for merge tags
  let quizData: any = null;
  if (campaign.source_quiz_id) {
    const { data: qd } = await supabase.from('quizzes')
      .select('title, slug, questions, outcomes, branding')
      .eq('id', campaign.source_quiz_id).single();
    quizData = qd;
  }

  // Batch-fetch leads
  const leadsByEmail: Record<string, any> = {};
  if (allowed.length > 0 && campaign.source_quiz_id) {
    const { data: leadRows } = await supabase.from('leads')
      .select('email, name, answers, outcome_id, score')
      .eq('quiz_id', campaign.source_quiz_id)
      .in('email', allowed);
    for (const row of leadRows || []) {
      const e = (row.email || '').trim().toLowerCase();
      if (e) leadsByEmail[e] = row;
    }
  }

  // Send each email
  let sentCount = 0;
  for (const to of allowed) {
    const { data: send, error: sendErr } = await supabase.from('email_sends').insert({
      campaign_id: campaign.id, tenant_id: tenantId, to_email: to, status: 'queued',
    }).select().single();
    if (sendErr) { errors.push(`${to}: insert failed - ${sendErr.message}`); continue; }
    try {
      const leadRow = leadsByEmail[to] || { email: to };
      const mergeCtx = buildMergeContextFromData(leadRow, quizData || {});
      const resolvedSubject = applyMergeTags(campaign.subject || '', mergeCtx);
      let resolvedHtml = applyMergeTags(campaign.html || '', mergeCtx);

      // CAN-SPAM footer
      const footer = canSpamFooterHtml(to, { siteName: campaign.from_name });
      if (resolvedHtml.includes('</body>')) {
        resolvedHtml = resolvedHtml.replace('</body>', footer + '</body>');
      } else {
        resolvedHtml += footer;
      }

      const { messageId } = await resendProvider.send({
        to, from: campaign.from_email, fromName: campaign.from_name,
        subject: resolvedSubject, html: resolvedHtml,
        headers: { 'X-Send-Id': send!.id, ...buildUnsubscribeHeaders(to) },
        tags: [{ name: 'campaign', value: campaign.id }],
      });
      await supabase.from('email_sends').update({
        provider_message_id: messageId, status: 'sent', sent_at: new Date().toISOString(),
      }).eq('id', send!.id);
      sentCount++;
    } catch (e: any) {
      await supabase.from('email_sends').update({ status: 'failed' }).eq('id', send!.id);
      errors.push(`${to}: ${e.message}`);
    }
  }

  // Update quota
  await supabase.from('email_quota_usage').upsert({
    tenant_id: tenantId, period_start: ps, sends: used + sentCount,
  }, { onConflict: 'tenant_id,period_start' });

  // Update campaign
  await supabase.from('email_campaigns').update({
    status: 'sent',
    last_run_at: new Date().toISOString(),
    sent_count: (campaign.sent_count || 0) + sentCount,
  }).eq('id', campaign.id);

  return {
    campaignId: campaign.id,
    sent: sentCount,
    skipped: recipients.length - allowed.length,
    resolved: recipients.length,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Dispatcher: find all due scheduled campaigns and send them
// ---------------------------------------------------------------------------

export async function processScheduledCampaigns(): Promise<{
  processed: number;
  results: Array<{ campaignId: string; sent: number; error?: string }>;
}> {
  const now = new Date().toISOString();

  // Find campaigns that are scheduled and due
  const { data: dueCampaigns, error } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('[ScheduledSend] Query error:', error.message);
    throw error;
  }

  const campaigns = dueCampaigns || [];
  if (campaigns.length === 0) {
    return { processed: 0, results: [] };
  }

  console.log(`[ScheduledSend] Found ${campaigns.length} due campaign(s)`);

  const results: Array<{ campaignId: string; sent: number; error?: string }> = [];

  for (const campaign of campaigns) {
    // Mark as sending to prevent double-processing
    await supabase.from('email_campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign.id)
      .eq('status', 'scheduled'); // Optimistic lock

    try {
      const result = await sendCampaign(campaign);
      results.push({ campaignId: campaign.id, sent: result.sent });
      console.log(`[ScheduledSend] Campaign ${campaign.id}: sent ${result.sent}, skipped ${result.skipped}`);
    } catch (e: any) {
      // Mark as failed so it doesn't retry forever
      await supabase.from('email_campaigns')
        .update({ status: 'failed' })
        .eq('id', campaign.id);
      results.push({ campaignId: campaign.id, sent: 0, error: e.message });
      console.error(`[ScheduledSend] Campaign ${campaign.id} failed:`, e.message);
    }
  }

  return { processed: campaigns.length, results };
}

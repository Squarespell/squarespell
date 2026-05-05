import { log } from '../lib/logger';
import { Router } from 'express';
import { isUnsubscribed, buildUnsubscribeHeaders, canSpamFooterHtml } from '../services/unsubscribe';
import { applyMergeTags, buildMergeContextFromData, MergeContext } from '../services/mergeTags';
import { requireAuth, attachUser } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';
import { resendProvider } from '../services/email/resendProvider';
import { emailQuota } from '../middleware/emailQuota';
import { limitFor } from '../services/email/limits';

const r = Router();r.use(requireAuth, attachUser);

// Shared: resolve lead emails for a tenant from a quiz source + filters
async function resolveRecipients(
  tenantId: string,
  sourceQuizId: string,
  filters: any = {},
): Promise<string[]> {
  // Check if quiz has GDPR consent enabled - if so, only include consented leads
  const { data: quizRow } = await supabase.from('quizzes')
    .select('settings').eq('id', sourceQuizId).single();
  const gdprEnabled = (quizRow?.settings as any)?.gdpr_consent_enabled === true;

  let q = supabase.from('leads').select('email')
    .eq('user_id', tenantId).eq('quiz_id', sourceQuizId)
    .is('archived_at', null).not('email', 'is', null);
  if (gdprEnabled) q = q.eq('consent', true);
  if (filters?.outcome_id) q = q.eq('outcome_id', filters.outcome_id);
  if (typeof filters?.min_score === 'number') q = q.gte('score', filters.min_score);
  if (typeof filters?.max_score === 'number') q = q.lte('score', filters.max_score);
  if (filters?.since) q = q.gte('created_at', filters.since);
  if (filters?.until) q = q.lte('created_at', filters.until);
  // Answer-based segment filters: each rule matches a specific question -> value
  if (Array.isArray(filters?.answer_filters) && filters.answer_filters.length > 0) {
    for (const af of filters.answer_filters) {
      if (af.question_id && af.value) {
        // JSONB containment: answers @> {"questionId": "value"}
        q = q.contains('answers', { [af.question_id]: af.value });
      }
    }
  }
  const { data, error } = await q;
  if (error) throw error;
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const row of data || []) {
    const e = (row.email || '').trim().toLowerCase();
    if (e && !seen.has(e)) { seen.add(e); candidates.push(e); }
  }
  // Filter out unsubscribed emails
  if (candidates.length === 0) return candidates;
  const { data: unsubs } = await supabase
    .from('email_unsubscribes')
    .select('email')
    .in('email', candidates);
  const unsubSet = new Set((unsubs || []).map((u: any) => u.email));
  return candidates.filter(e => !unsubSet.has(e));
}

r.get('/quota', async (req, res) => {
  const tenantId = req.dbUserId;
  const plan = (req as any).userPlan || 'starter';
  const ps = new Date(); ps.setDate(1);
  const { data } = await supabase.from('email_quota_usage')
    .select('sends').eq('tenant_id', tenantId).eq('period_start', ps.toISOString().slice(0,10)).maybeSingle();
  res.json({ used: data?.sends ?? 0, cap: limitFor(plan), plan });
});

// Live recipient count preview for the compose UI
r.get('/recipients/preview', async (req, res) => {
  try {
    const tenantId = req.dbUserId;
    const { quiz_id } = req.query as { quiz_id?: string };
    if (!quiz_id) return res.json({ count: 0, emails: [] });
    const filters = req.query.filters ? JSON.parse(String(req.query.filters)) : {};
    const emails = await resolveRecipients(tenantId!, quiz_id, filters);
    res.json({ count: emails.length, emails: emails.slice(0, 5) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Quizzes dropdown for the source picker - only live quizzes with lead counts
r.get('/source-quizzes', async (req, res) => {
  const tenantId = req.dbUserId;
  const { data, error } = await supabase.from('quizzes')
    .select('id, title, slug')
    .eq('user_id', tenantId)
    .eq('status', 'live')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  // Attach lead counts
  const quizIds = (data || []).map((q: any) => q.id);
  let countMap: Record<string, number> = {};
  if (quizIds.length > 0) {
    const { data: counts } = await supabase.from('leads')
      .select('quiz_id')
      .eq('user_id', tenantId)
      .in('quiz_id', quizIds);
    (counts || []).forEach((r: any) => {
      countMap[r.quiz_id] = (countMap[r.quiz_id] || 0) + 1;
    });
  }
  const enriched = (data || []).map((q: any) => ({
    ...q,
    lead_count: countMap[q.id] || 0,
  }));
  res.json(enriched);
});

// Outcomes for filter dropdown - returns { id, name } objects
r.get('/source-quizzes/:id/outcomes', async (req, res) => {
  const tenantId = req.dbUserId;
  // Fetch outcome IDs from leads AND outcome definitions from quiz
  const [leadsResult, quizResult] = await Promise.all([
    supabase.from('leads')
      .select('outcome_id')
      .eq('user_id', tenantId).eq('quiz_id', req.params.id)
      .not('outcome_id', 'is', null),
    supabase.from('quizzes')
      .select('outcomes')
      .eq('id', req.params.id).eq('user_id', tenantId).single(),
  ]);
  if (leadsResult.error) return res.status(500).json({ error: leadsResult.error.message });
  const usedIds = new Set<string>();
  (leadsResult.data || []).forEach((r: any) => r.outcome_id && usedIds.add(r.outcome_id));
  // Build an id-to-name map from quiz outcomes
  const outcomeDefs = (quizResult.data?.outcomes || []) as any[];
  const nameMap: Record<string, string> = {};
  outcomeDefs.forEach((o: any) => { if (o.id && o.title) nameMap[o.id] = o.title; });
  // Return outcome objects with id and human-readable name
  const results = Array.from(usedIds).map(id => ({
    id,
    name: nameMap[id] || id,
  }));
  res.json(results);
});

// Questions for answer-based segment filters
r.get('/source-quizzes/:id/questions', async (req, res) => {
  const tenantId = req.dbUserId;
  const { data, error } = await supabase.from('quizzes')
    .select('questions')
    .eq('id', req.params.id).eq('user_id', tenantId).single();
  if (error) return res.status(500).json({ error: error.message });
  const questions = (data?.questions || []) as any[];
  // Return simplified question objects with id, text, and options
  const simplified = questions.map((q: any) => ({
    id: q.id,
    text: q.text || q.label || 'Untitled question',
    type: q.type || 'single_select',
    options: (q.options || []).map((o: any) => ({ id: o.id, text: o.text || o.label || '' })),
  }));
  res.json(simplified);
});

r.get('/campaigns', async (req, res) => {
  const tenantId = req.dbUserId;
  const { data, error } = await supabase.from('email_campaigns')
    .select('*').eq('tenant_id', tenantId).neq('status', 'archived').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

r.get('/campaigns/archived', async (req, res) => {
  const tenantId = req.dbUserId;
  const { data, error } = await supabase.from('email_campaigns')
    .select('*').eq('tenant_id', tenantId).eq('status', 'archived').order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

r.get('/campaigns/:id', async (req, res) => {
  const tenantId = req.dbUserId;
  const { data, error } = await supabase.from('email_campaigns')
    .select('*').eq('id', req.params.id).eq('tenant_id', tenantId).single();
  if (error || !data) return res.status(404).json({ error: 'Campaign not found' });
  res.json(data);
});

// Delivery stats for a campaign (sent, delivered, opened, clicked, bounced, complained)
r.get('/campaigns/:id/stats', async (req, res) => {
  const tenantId = req.dbUserId;
  // Verify ownership
  const { data: c } = await supabase.from('email_campaigns')
    .select('id').eq('id', req.params.id).eq('tenant_id', tenantId).single();
  if (!c) return res.status(404).json({ error: 'Campaign not found' });

  const { data: sends } = await supabase.from('email_sends')
    .select('status, opened_at, clicked_at, metadata')
    .eq('campaign_id', req.params.id);

  const rows = sends || [];
  const bouncedRows = rows.filter((s: any) => s.status === 'bounced');
  const stats = {
    total: rows.length,
    sent: rows.filter((s: any) => s.status === 'sent' || s.status === 'delivered').length,
    delivered: rows.filter((s: any) => s.status === 'delivered').length,
    opened: rows.filter((s: any) => s.opened_at).length,
    clicked: rows.filter((s: any) => s.clicked_at).length,
    bounced: bouncedRows.length,
    hard_bounced: bouncedRows.filter((s: any) => s.metadata?.bounce_type === 'hard_bounce').length,
    soft_bounced: bouncedRows.filter((s: any) => s.metadata?.bounce_type === 'soft_bounce').length,
    complained: rows.filter((s: any) => s.status === 'complained').length,
    failed: rows.filter((s: any) => s.status === 'failed').length,
  };

  res.json(stats);
});

// Per-recipient engagement data for a campaign
r.get('/campaigns/:id/recipients', async (req, res) => {
  var tenantId = req.dbUserId;
  var { data: c } = await supabase.from('email_campaigns')
    .select('id').eq('id', req.params.id).eq('tenant_id', tenantId).single();
  if (!c) return res.status(404).json({ error: 'Campaign not found' });

  var { data: sends } = await supabase.from('email_sends')
    .select('id, to_email, status, sent_at, opened_at, clicked_at, metadata')
    .eq('campaign_id', req.params.id)
    .order('sent_at', { ascending: false });

  var recipients = (sends || []).map(function(s: any) {
    return {
      email: s.to_email,
      status: s.status,
      sent_at: s.sent_at,
      opened_at: s.opened_at,
      clicked_at: s.clicked_at,
      engaged: !!(s.opened_at || s.clicked_at),
      bounce_type: s.metadata?.bounce_type || null,
    };
  });

  res.json({
    total: recipients.length,
    opened: recipients.filter(function(r: any) { return r.opened_at; }).length,
    clicked: recipients.filter(function(r: any) { return r.clicked_at; }).length,
    not_engaged: recipients.filter(function(r: any) { return !r.engaged && r.status !== 'bounced' && r.status !== 'failed'; }).length,
    recipients: recipients,
  });
});

// Engagement timeline: opens and clicks over time (hourly buckets)
r.get('/campaigns/:id/timeline', async (req, res) => {
  var tenantId = req.dbUserId;
  var { data: c } = await supabase.from('email_campaigns')
    .select('id').eq('id', req.params.id).eq('tenant_id', tenantId).single();
  if (!c) return res.status(404).json({ error: 'Campaign not found' });

  // Note: email_events.send_id references individual send IDs, not campaign IDs.
  // We use email_sends data directly for timeline (already fetched below).

  // Also fetch from email_sends for campaigns with many recipients
  var { data: sends } = await supabase.from('email_sends')
    .select('sent_at, opened_at, clicked_at')
    .eq('campaign_id', req.params.id)
    .not('sent_at', 'is', null);

  // Build hourly timeline from send data
  var buckets: Record<string, { hour: string; opens: number; clicks: number; sends: number }> = {};

  (sends || []).forEach(function(s: any) {
    if (s.sent_at) {
      var h = s.sent_at.slice(0, 13); // YYYY-MM-DDTHH
      if (!buckets[h]) buckets[h] = { hour: h, opens: 0, clicks: 0, sends: 0 };
      buckets[h].sends++;
    }
    if (s.opened_at) {
      var oh = s.opened_at.slice(0, 13);
      if (!buckets[oh]) buckets[oh] = { hour: oh, opens: 0, clicks: 0, sends: 0 };
      buckets[oh].opens++;
    }
    if (s.clicked_at) {
      var ch = s.clicked_at.slice(0, 13);
      if (!buckets[ch]) buckets[ch] = { hour: ch, opens: 0, clicks: 0, sends: 0 };
      buckets[ch].clicks++;
    }
  });

  var timeline = Object.values(buckets).sort(function(a, b) {
    return a.hour < b.hour ? -1 : a.hour > b.hour ? 1 : 0;
  });

  // Cumulative totals
  var cumOpens = 0;
  var cumClicks = 0;
  var cumulativeTimeline = timeline.map(function(t) {
    cumOpens += t.opens;
    cumClicks += t.clicks;
    return {
      hour: t.hour,
      opens: t.opens,
      clicks: t.clicks,
      sends: t.sends,
      cumulative_opens: cumOpens,
      cumulative_clicks: cumClicks,
    };
  });

  res.json({ timeline: cumulativeTimeline });
});

// Link click breakdown: which links were clicked most
r.get('/campaigns/:id/link-clicks', async (req, res) => {
  var tenantId = req.dbUserId;
  var { data: c } = await supabase.from('email_campaigns')
    .select('id').eq('id', req.params.id).eq('tenant_id', tenantId).single();
  if (!c) return res.status(404).json({ error: 'Campaign not found' });

  // First get send IDs for this campaign, then query only relevant click events
  var { data: sendIds } = await supabase.from('email_sends')
    .select('id')
    .eq('campaign_id', req.params.id);

  var sendIdList = (sendIds || []).map(function(s: any) { return s.id; });
  if (sendIdList.length === 0) return res.json({ links: [] });

  // Query click events only for this campaign's sends (filtered at DB level)
  var { data: events } = await supabase.from('email_events')
    .select('meta')
    .eq('type', 'clicked')
    .in('send_id', sendIdList);

  var linkCounts: Record<string, number> = {};
  (events || []).forEach(function(ev: any) {
    var url = ev.meta?.data?.click?.link || ev.meta?.data?.url || 'unknown';
    linkCounts[url] = (linkCounts[url] || 0) + 1;
  });

  var links = Object.entries(linkCounts).map(function(entry) {
    return { url: entry[0], clicks: entry[1] };
  }).sort(function(a, b) { return b.clicks - a.clicks; });

  res.json({ links: links });
});

r.post('/campaigns', async (req, res) => {
  const tenantId = req.dbUserId;
  const {
    name, subject, from_name, from_email, html,
    mode, source_quiz_id, source_filters,
    trigger_type, trigger_delay_minutes,
  } = req.body;
  const { data, error } = await supabase.from('email_campaigns').insert({
    tenant_id: tenantId, name, subject, from_name, from_email, html,
    mode: mode || 'blast',
    source_quiz_id: source_quiz_id || null,
    source_filters: source_filters || {},
    trigger_type: trigger_type || null,
    trigger_delay_minutes: trigger_delay_minutes || 0,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

r.patch('/campaigns/:id', async (req, res) => {
  const tenantId = req.dbUserId;
  const { data: existing } = await supabase.from('email_campaigns')
    .select('status').eq('id', req.params.id).eq('tenant_id', tenantId).single();
  if (!existing) return res.status(404).json({ error: 'Campaign not found' });
  if (existing.status === 'sent' || existing.status === 'sending') {
    return res.status(400).json({ error: 'Cannot edit a sent campaign' });
  }
  const allowed = ['name', 'subject', 'from_name', 'from_email', 'html',
    'mode', 'source_quiz_id', 'source_filters', 'trigger_type', 'trigger_delay_minutes',
    'scheduled_at', 'status'];
  const updates: Record<string, any> = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });
  const { data, error } = await supabase.from('email_campaigns')
    .update(updates).eq('id', req.params.id).eq('tenant_id', tenantId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

r.delete('/campaigns/:id', async (req, res) => {
  const tenantId = req.dbUserId;
  const { data: existing } = await supabase.from('email_campaigns')
    .select('status').eq('id', req.params.id).eq('tenant_id', tenantId).single();
  if (!existing) return res.status(404).json({ error: 'Campaign not found' });
  if (existing.status === 'sending') {
    return res.status(400).json({ error: 'Cannot delete while sending' });
  }
  const { error } = await supabase.from('email_campaigns')
    .update({ status: 'archived' }).eq('id', req.params.id).eq('tenant_id', tenantId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ deleted: true });
});

r.post('/campaigns/:id/restore', async (req, res) => {
  const tenantId = req.dbUserId;
  const { data: existing } = await supabase.from('email_campaigns')
    .select('status').eq('id', req.params.id).eq('tenant_id', tenantId).single();
  if (!existing) return res.status(404).json({ error: 'Campaign not found' });
  if (existing.status !== 'archived') {
    return res.status(400).json({ error: 'Campaign is not archived' });
  }
  const { data, error } = await supabase.from('email_campaigns')
    .update({ status: 'draft' }).eq('id', req.params.id).eq('tenant_id', tenantId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

r.post('/campaigns/:id/send', emailQuota, async (req, res) => {
  const tenantId = req.dbUserId;
  const body = req.body || {};
  const { data: c } = await supabase.from('email_campaigns').select('*')
    .eq('id', req.params.id).eq('tenant_id', tenantId).single();
  if (!c) return res.status(404).json({ error: 'not_found' });

  // Concurrency guard: prevent double-sends
  if (c.status === 'sending') {
    return res.status(409).json({ error: 'Campaign is already being sent' });
  }
  if (c.status === 'sent' && c.mode !== 'live') {
    return res.status(400).json({ error: 'Campaign has already been sent. Use "live" mode for re-sends.' });
  }

  // Atomically set status to 'sending' to block concurrent requests.
  // Use .select() to check if the row was actually updated (0 rows = lock failed).
  const { data: lockRows, error: lockErr } = await supabase.from('email_campaigns')
    .update({ status: 'sending' })
    .eq('id', c.id)
    .eq('tenant_id', tenantId)
    .neq('status', 'sending')
    .select('id');
  if (lockErr || !lockRows || lockRows.length === 0) {
    return res.status(409).json({ error: 'Campaign send already in progress' });
  }

  // Resolve recipients: explicit list OR from source_quiz_id + filters
  let recipients: string[] = Array.isArray(body.recipients) ? body.recipients : [];
  if (recipients.length === 0 && c.source_quiz_id) {
    try {
      recipients = await resolveRecipients(tenantId!, c.source_quiz_id, c.source_filters || {});
    } catch (e: any) {
      // Reset status so campaign isn't stuck in 'sending'
      await supabase.from('email_campaigns').update({ status: 'draft' }).eq('id', c.id);
      return res.status(500).json({ error: 'resolve_failed: ' + e.message });
    }
  }

  // Dedupe vs already-sent rows for this campaign (supports live re-runs)
  if (recipients.length && c.mode === 'live') {
    const { data: prior } = await supabase.from('email_sends')
      .select('to_email').eq('campaign_id', c.id);
    const already = new Set((prior || []).map((r: any) => r.to_email));
    recipients = recipients.filter((e) => !already.has(e));
  }

  const { used, cap, periodStart } = (req as any).emailQuota;
  const allowed = recipients.slice(0, Math.max(0, cap - used));

  // Pre-fetch quiz data + lead rows so we can resolve merge tags per recipient
  let quizData: any = null;
  if (c.source_quiz_id) {
    const { data: qd } = await supabase.from('quizzes')
      .select('title, slug, questions, outcomes, branding')
      .eq('id', c.source_quiz_id).single();
    quizData = qd;
  }
  // Batch-fetch leads for all allowed recipients in one query
  const leadsByEmail: Record<string, any> = {};
  if (allowed.length > 0 && c.source_quiz_id) {
    const { data: leadRows } = await supabase.from('leads')
      .select('email, name, answers, outcome_id, score')
      .eq('quiz_id', c.source_quiz_id)
      .in('email', allowed);
    for (const row of leadRows || []) {
      const e = (row.email || '').trim().toLowerCase();
      if (e) leadsByEmail[e] = row;
    }
  }

  // ── Prepare all emails, then send in batches of 100 via Resend batch API ──
  const BATCH_SIZE = 100;
  const results: any[] = [];
  let totalSent = 0;

  // 1. Insert all email_sends rows and build payloads
  type Prepared = { to: string; sendId: string; payload: Parameters<typeof resendProvider.send>[0] };
  const prepared: Prepared[] = [];
  for (const to of allowed) {
    const { data: send, error: sendErr } = await supabase.from('email_sends').insert({
      campaign_id: c.id, tenant_id: tenantId, to_email: to, status: 'queued',
    }).select().single();
    if (sendErr) { results.push({ to, ok: false, error: sendErr.message }); continue; }

    const leadRow = leadsByEmail[to] || { email: to };
    const mergeCtx = buildMergeContextFromData(leadRow, quizData || {});
    const resolvedSubject = applyMergeTags(c.subject || '', mergeCtx);
    let resolvedHtml = applyMergeTags(c.html || '', mergeCtx);

    const footer = canSpamFooterHtml(to, { siteName: c.from_name });
    if (resolvedHtml.includes('</body>')) {
      resolvedHtml = resolvedHtml.replace('</body>', footer + '</body>');
    } else {
      resolvedHtml += footer;
    }
    prepared.push({
      to,
      sendId: send!.id,
      payload: {
        to, from: c.from_email, fromName: c.from_name,
        subject: resolvedSubject, html: resolvedHtml,
        headers: { 'X-Send-Id': send!.id, ...buildUnsubscribeHeaders(to) },
        tags: [{ name: 'campaign', value: c.id }],
      },
    });
  }

  // 2. Send in chunks of BATCH_SIZE via batch API with retry logic
  var MAX_RETRIES = 2;
  for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
    const chunk = prepared.slice(i, i + BATCH_SIZE);
    var batchSuccess = false;

    for (var attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { messageIds } = await resendProvider.sendBatch(chunk.map(p => p.payload));
        const now = new Date().toISOString();
        for (let j = 0; j < chunk.length; j++) {
          const mid = messageIds[j] || '';
          await supabase.from('email_sends').update({
            provider_message_id: mid, status: 'sent', sent_at: now,
          }).eq('id', chunk[j].sendId);
          results.push({ to: chunk[j].to, ok: true });
          totalSent++;
        }
        batchSuccess = true;
        break; // Success — exit retry loop
      } catch (e: any) {
        var isRetryable = e.message && (
          e.message.includes('rate limit') ||
          e.message.includes('timeout') ||
          e.message.includes('503') ||
          e.message.includes('429') ||
          e.message.includes('ECONNRESET')
        );
        if (attempt < MAX_RETRIES && isRetryable) {
          var delay = Math.pow(2, attempt) * 1000; // 1s, 2s exponential backoff
          log.info('[Email] Batch retry ' + (attempt + 1) + '/' + MAX_RETRIES + ' after ' + delay + 'ms', {
            campaign_id: c.id, batch_start: i, error: e.message,
          });
          await new Promise(function(resolve) { setTimeout(resolve, delay); });
          continue;
        }
        // Final failure — mark all sends in this chunk as failed
        for (const item of chunk) {
          await supabase.from('email_sends').update({
            status: 'failed',
            metadata: { error: e.message, retries: attempt },
          }).eq('id', item.sendId);
          results.push({ to: item.to, ok: false, error: e.message });
        }
        log.error('[Email] Batch failed after ' + (attempt + 1) + ' attempts', {
          campaign_id: c.id, batch_start: i, error: e.message,
        });
      }
    }

    // Small delay between batches to respect rate limits
    if (batchSuccess && i + BATCH_SIZE < prepared.length) {
      await new Promise(function(resolve) { setTimeout(resolve, 200); });
    }
  }

  await supabase.from('email_quota_usage').upsert({
    tenant_id: tenantId, period_start: periodStart, sends: used + totalSent,
  }, { onConflict: 'tenant_id,period_start' });

  // Update campaign status: 'sent' for blast mode, back to 'draft' for live mode (re-runnable)
  const finalStatus = c.mode === 'live' ? 'draft' : 'sent';
  await supabase.from('email_campaigns').update({
    status: totalSent > 0 ? finalStatus : (c.mode === 'live' ? 'draft' : 'failed'),
    last_run_at: new Date().toISOString(),
    sent_count: (c.sent_count || 0) + totalSent,
  }).eq('id', c.id);

  res.json({
    sent: totalSent,
    skipped: recipients.length - allowed.length,
    resolved: recipients.length,
    results,
  });
});


r.post('/campaigns/:id/test-send', async (req, res) => {
  const tenantId = req.dbUserId;
  const to = (req.body?.to || '').trim();
  if (!to) return res.status(400).json({ error: 'missing_to' });
  const { data: c } = await supabase.from('email_campaigns').select('*')
    .eq('id', req.params.id).eq('tenant_id', tenantId).single();
  if (!c) return res.status(404).json({ error: 'not_found' });

  // Use the production merge tag system with sample data for accurate test preview
  const sampleCtx: MergeContext = {
    first_name: 'Alex',
    last_name: 'Sample',
    email: to,
    quiz_name: 'Your Quiz',
    quiz_url: 'https://example.com/quiz',
    outcome_name: 'Your Result',
    outcome_description: 'This is a sample outcome description.',
    outcome_score: '85',
    brand_name: c.from_name || 'Your Brand',
    cta_url: 'https://example.com',
    answers: {},
  };
  const resolvedSubject = applyMergeTags(c.subject || '', sampleCtx);
  let resolvedHtml = applyMergeTags(c.html || '', sampleCtx);

  const footer = canSpamFooterHtml(to, { siteName: c.from_name });
  if (resolvedHtml.includes('</body>')) {
    resolvedHtml = resolvedHtml.replace('</body>', footer + '</body>');
  } else {
    resolvedHtml += footer;
  }

  try {
    const { messageId } = await resendProvider.send({
      to, from: c.from_email, fromName: c.from_name,
      subject: '[TEST] ' + resolvedSubject, html: resolvedHtml,
      headers: { ...buildUnsubscribeHeaders(to) },
      tags: [{ name: 'campaign', value: c.id }, { name: 'test', value: '1' }],
    });
    res.json({ ok: true, messageId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Deliverability Dashboard ─────────────────────────────────────────────
// GET /api/emails/deliverability - aggregate email health metrics
r.get('/deliverability', async (req, res) => {
  const tenantId = req.dbUserId;
  try {
    // Get all campaigns for this tenant
    const { data: campaigns } = await supabase.from('email_campaigns')
      .select('id, name, status, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    const campaignIds = (campaigns || []).map((c: any) => c.id);
    if (campaignIds.length === 0) {
      return res.json({
        totals: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, failed: 0 },
        rates: { delivery_rate: 0, open_rate: 0, click_rate: 0, bounce_rate: 0, complaint_rate: 0 },
        campaigns: [],
      });
    }

    // Get all sends for these campaigns
    const { data: sends } = await supabase.from('email_sends')
      .select('campaign_id, status, opened_at, clicked_at, metadata')
      .in('campaign_id', campaignIds);

    const rows = sends || [];
    const bouncedRows = rows.filter((s: any) => s.status === 'bounced');
    const totals = {
      sent: rows.length,
      delivered: rows.filter((s: any) => s.status === 'delivered').length,
      opened: rows.filter((s: any) => s.opened_at).length,
      clicked: rows.filter((s: any) => s.clicked_at).length,
      bounced: bouncedRows.length,
      hard_bounced: bouncedRows.filter((s: any) => s.metadata?.bounce_type === 'hard_bounce').length,
      soft_bounced: bouncedRows.filter((s: any) => s.metadata?.bounce_type === 'soft_bounce').length,
      complained: rows.filter((s: any) => s.status === 'complained').length,
      failed: rows.filter((s: any) => s.status === 'failed').length,
    };

    const safe = (n: number, d: number) => d > 0 ? Math.round((n / d) * 10000) / 100 : 0;
    const rates = {
      delivery_rate: safe(totals.delivered, totals.sent),
      open_rate: safe(totals.opened, totals.delivered || totals.sent),
      click_rate: safe(totals.clicked, totals.delivered || totals.sent),
      bounce_rate: safe(totals.bounced, totals.sent),
      hard_bounce_rate: safe(totals.hard_bounced, totals.sent),
      soft_bounce_rate: safe(totals.soft_bounced, totals.sent),
      complaint_rate: safe(totals.complained, totals.sent),
    };

    // Per-campaign breakdown (last 10)
    const campaignBreakdown = (campaigns || []).slice(0, 10).map((c: any) => {
      const cRows = rows.filter((s: any) => s.campaign_id === c.id);
      const cSent = cRows.length;
      const cDelivered = cRows.filter((s: any) => s.status === 'delivered').length;
      const cBounced = cRows.filter((s: any) => s.status === 'bounced').length;
      const cComplained = cRows.filter((s: any) => s.status === 'complained').length;
      const cOpened = cRows.filter((s: any) => s.opened_at).length;
      return {
        id: c.id, name: c.name, status: c.status, created_at: c.created_at,
        sent: cSent, delivered: cDelivered, bounced: cBounced, complained: cComplained, opened: cOpened,
        bounce_rate: safe(cBounced, cSent),
        complaint_rate: safe(cComplained, cSent),
        open_rate: safe(cOpened, cDelivered || cSent),
      };
    });

    res.json({ totals, rates, campaigns: campaignBreakdown });
  } catch (err: any) {
    log.error('Deliverability fetch error:', { err: err });
    res.status(500).json({ error: err.message ?? 'Failed to fetch deliverability data' });
  }
});

// ── Suppression List ─────────────────────────────────────────────────────
// GET /api/emails/suppressions - list suppressed emails relevant to this tenant
r.get('/suppressions', async (req, res) => {
  try {
    const tenantId = req.dbUserId;

    // Only show suppressions for emails this tenant has actually sent to
    // This prevents cross-tenant data leakage
    const { data: sentEmails } = await supabase
      .from('email_sends')
      .select('to_email')
      .eq('tenant_id', tenantId);

    const tenantEmails = [...new Set((sentEmails || []).map((s: any) => s.to_email).filter(Boolean))];
    if (tenantEmails.length === 0) return res.json([]);

    const { data, error } = await supabase
      .from('email_unsubscribes')
      .select('id, email, source, created_at')
      .in('email', tenantEmails)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Failed to fetch suppressions' });
  }
});

// POST /api/emails/suppressions - manually add an email to suppression list
r.post('/suppressions', async (req, res) => {
  try {
    const { email, reason } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from('email_unsubscribes')
      .upsert(
        { email: normalized, source: reason || 'manual' },
        { onConflict: 'email' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Failed to add suppression' });
  }
});

// DELETE /api/emails/suppressions/:id - remove an entry from suppression list
r.delete('/suppressions/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('email_unsubscribes')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Failed to remove suppression' });
  }
});

// ── Free images proxy (Pexels / Unsplash / picsum fallback) ──────────────────
r.get('/unsplash/search', async (req, res) => {
  try {
    const query = (req.query.q as string || '').trim();
    const page = parseInt(req.query.page as string) || 1;
    if (!query) return res.json({ results: [] });

    // Try Pexels first
    const pexelsKey = process.env.PEXELS_ACCESS_KEY;
    if (pexelsKey) {
      const url = 'https://api.pexels.com/v1/search?query=' + encodeURIComponent(query) + '&per_page=12&page=' + page;
      const resp = await fetch(url, {
        headers: { Authorization: pexelsKey },
      });
      if (resp.ok) {
        const data: any = await resp.json();
        const results = (data.photos || []).map((p: any) => ({
          id: String(p.id),
          thumb: p.src?.medium || p.src?.small,
          regular: p.src?.large || p.src?.original,
          alt: p.alt || query,
          credit: p.photographer || 'Pexels',
          creditUrl: p.photographer_url || 'https://pexels.com',
        }));
        return res.json({ results });
      }
      log.error('Pexels API error', { status: resp.status });
    }

    // Try Unsplash as second option
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashKey) {
      const url = 'https://api.unsplash.com/search/photos?query=' + encodeURIComponent(query) + '&per_page=12&page=' + page;
      const resp = await fetch(url, {
        headers: { Authorization: 'Client-ID ' + unsplashKey },
      });
      if (resp.ok) {
        const data: any = await resp.json();
        const results = (data.results || []).map((p: any) => ({
          id: p.id,
          thumb: p.urls?.small || p.urls?.thumb,
          regular: p.urls?.regular,
          alt: p.alt_description || query,
          credit: p.user?.name || 'Unsplash',
          creditUrl: p.user?.links?.html || 'https://unsplash.com',
        }));
        return res.json({ results });
      }
      log.error('Unsplash API error', { status: resp.status });
    }

    // Fallback to picsum
    const results: any[] = [];
    for (let i = 0; i < 12; i++) {
      const seed = query.replace(/\s/g, '') + i + page;
      results.push({
        id: seed,
        thumb: 'https://picsum.photos/seed/' + seed + '/200/140',
        regular: 'https://picsum.photos/seed/' + seed + '/600/400',
        alt: query,
        credit: 'Lorem Picsum',
        creditUrl: 'https://picsum.photos',
      });
    }
    res.json({ results });
  } catch (err: any) {
    log.error('Image search proxy error', { err });
    res.status(500).json({ error: err.message ?? 'Failed to search images' });
  }
});

// ---------------------------------------------------------------------------
// AI-powered email design: picks template + generates content via LLM
// ---------------------------------------------------------------------------

import { generateAiEmailDesign } from '../services/claudeService';
import type { AiDesignInput, TemplateOption } from '../services/claudeService';

r.post('/ai-design', async (req, res) => {
  try {
    const { userPrompt, quizId, templates } = req.body;
    const tenantId = req.dbUserId;

    // Fetch quiz data if quizId provided
    let quizTitle = '';
    let quizCategory = '';
    let outcomes: Array<{ name: string; description?: string }> = [];
    let questions: Array<{ text: string }> = [];

    if (quizId) {
      const { data: quiz } = await supabase.from('quizzes')
        .select('title, category, questions, outcomes')
        .eq('id', quizId).eq('user_id', tenantId).single();
      if (quiz) {
        quizTitle = quiz.title || '';
        quizCategory = quiz.category || '';
        outcomes = (quiz.outcomes || []).map((o: any) => ({
          name: o.title || o.name || '',
          description: o.description || '',
        }));
        questions = (quiz.questions || []).map((q: any) => ({
          text: q.question || q.text || '',
        }));
      }
    }

    // Fetch brand kit
    const { data: user } = await supabase.from('users')
      .select('brand_kit').eq('id', tenantId).single();
    const brandKit = user?.brand_kit || {};

    const input: AiDesignInput = {
      userPrompt: userPrompt || undefined,
      quizTitle,
      quizCategory,
      outcomes,
      questions,
      brandName: brandKit.site_name || '',
      brandColors: brandKit.colors || undefined,
      templates: (templates || []) as TemplateOption[],
    };

    const result = await generateAiEmailDesign(input);
    res.json(result);
  } catch (err: any) {
    log.error('[ai-design] Failed:', { err: err.message });
    res.status(500).json({ error: err.message || 'AI design generation failed' });
  }
});

// ── Saved templates CRUD ──────────────────────────────────────────

// List saved templates
r.get('/templates/saved', async function(req: any, res) {
  try {
    var userId = req.dbUserId;
    var category = req.query.category as string | undefined;
    var q = supabase
      .from('saved_templates')
      .select('id, name, description, category, is_v2, subject, preheader, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (category && category !== 'all') {
      q = q.eq('category', category);
    }

    var { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    log.error('[saved-templates] list failed', { err: err.message });
    res.status(500).json({ error: 'Failed to list saved templates' });
  }
});

// Get single saved template (full data with blocks)
r.get('/templates/saved/:id', async function(req: any, res) {
  try {
    var userId = req.dbUserId;
    var { data, error } = await supabase
      .from('saved_templates')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json(data);
  } catch (err: any) {
    log.error('[saved-templates] get failed', { err: err.message });
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Save new template
r.post('/templates/saved', async function(req: any, res) {
  try {
    var userId = req.dbUserId;
    var { name, description, category, blocks, v2_sections, subject, preheader, is_v2, thumbnail_html } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Template name is required' });
      return;
    }

    var { data, error } = await supabase
      .from('saved_templates')
      .insert({
        user_id: userId,
        name: name,
        description: description || null,
        category: category || 'custom',
        blocks: blocks || null,
        v2_sections: v2_sections || null,
        subject: subject || null,
        preheader: preheader || null,
        is_v2: is_v2 || false,
        thumbnail_html: thumbnail_html || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    log.error('[saved-templates] create failed', { err: err.message });
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// Update saved template
r.patch('/templates/saved/:id', async function(req: any, res) {
  try {
    var userId = req.dbUserId;
    var updates: Record<string, any> = {};
    var allowedFields = ['name', 'description', 'category', 'blocks', 'v2_sections', 'subject', 'preheader', 'is_v2', 'thumbnail_html'];

    for (var i = 0; i < allowedFields.length; i++) {
      var field = allowedFields[i];
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    updates.updated_at = new Date().toISOString();

    var { data, error } = await supabase
      .from('saved_templates')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json(data);
  } catch (err: any) {
    log.error('[saved-templates] update failed', { err: err.message });
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete saved template
r.delete('/templates/saved/:id', async function(req: any, res) {
  try {
    var userId = req.dbUserId;
    var { error } = await supabase
      .from('saved_templates')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (err: any) {
    log.error('[saved-templates] delete failed', { err: err.message });
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default r;

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
  const plan = (req as any).auth?.plan || 'starter';
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

  // Resolve recipients: explicit list OR from source_quiz_id + filters
  let recipients: string[] = Array.isArray(body.recipients) ? body.recipients : [];
  if (recipients.length === 0 && c.source_quiz_id) {
    try {
      recipients = await resolveRecipients(tenantId!, c.source_quiz_id, c.source_filters || {});
    } catch (e: any) {
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

  // 2. Send in chunks of BATCH_SIZE via batch API
  for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
    const chunk = prepared.slice(i, i + BATCH_SIZE);
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
    } catch (e: any) {
      // Entire batch failed - mark all sends in this chunk as failed
      for (const item of chunk) {
        await supabase.from('email_sends').update({ status: 'failed' }).eq('id', item.sendId);
        results.push({ to: item.to, ok: false, error: e.message });
      }
    }
  }

  await supabase.from('email_quota_usage').upsert({
    tenant_id: tenantId, period_start: periodStart, sends: used + totalSent,
  }, { onConflict: 'tenant_id,period_start' });
  await supabase.from('email_campaigns').update({
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
  // Replace merge tags with sample values for test send
  const sampleTags: Record<string, string> = {
    '{{firstName}}': 'Alex',
    '{{outcomeTitle}}': 'Your Result',
    '{{quizTitle}}': 'Your Quiz',
    '{{ctaUrl}}': 'https://example.com',
    '{{brand}}': c.from_name || 'Your Brand',
    '{{unsubscribeUrl}}': 'https://example.com/unsubscribe',
  };
  let html = c.html;
  let subject = c.subject;
  for (const [tag, val] of Object.entries(sampleTags)) {
    html = html.split(tag).join(val);
    subject = subject.split(tag).join(val);
  }
  try {
    const { messageId } = await resendProvider.send({
      to, from: c.from_email, fromName: c.from_name,
      subject: '[TEST] ' + subject, html,
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
// GET /api/emails/suppressions - list all suppressed emails for this tenant
r.get('/suppressions', async (req, res) => {
  try {
    // email_unsubscribes is global (not per-tenant) since emails are unique
    // Show all suppressions - the table is small enough for full fetch
    const { data, error } = await supabase
      .from('email_unsubscribes')
      .select('id, email, source, created_at')
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

// ── Unsplash proxy (free images for email editor) ────────────────────────────
r.get('/unsplash/search', async (req, res) => {
  try {
    const query = (req.query.q as string || '').trim();
    const page = parseInt(req.query.page as string) || 1;
    if (!query) return res.json({ results: [] });

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      // Fallback to picsum if no Unsplash key configured
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
      return res.json({ results });
    }

    const url = 'https://api.unsplash.com/search/photos?query=' + encodeURIComponent(query) + '&per_page=12&page=' + page;
    const resp = await fetch(url, {
      headers: { Authorization: 'Client-ID ' + accessKey },
    });
    if (!resp.ok) {
      log.error('Unsplash API error', { status: resp.status });
      return res.status(502).json({ error: 'Unsplash API error' });
    }
    const data: any = await resp.json();
    const results = (data.results || []).map((p: any) => ({
      id: p.id,
      thumb: p.urls?.small || p.urls?.thumb,
      regular: p.urls?.regular,
      alt: p.alt_description || query,
      credit: p.user?.name || 'Unsplash',
      creditUrl: p.user?.links?.html || 'https://unsplash.com',
    }));
    res.json({ results });
  } catch (err: any) {
    log.error('Unsplash proxy error', { err });
    res.status(500).json({ error: err.message ?? 'Failed to search images' });
  }
});

export default r;

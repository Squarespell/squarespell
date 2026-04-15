import { Router } from 'express';
import { supabase } from '../db/supabaseClient';
import { resendProvider } from '../services/email/resendProvider';
import { emailQuota } from '../middleware/emailQuota';
const r = Router();

r.post('/campaigns', async (req, res) => {
  const tenantId = (req as any).auth?.userId;
  const { name, subject, fromName, fromEmail, html } = req.body;
  const { data, error } = await supabase.from('email_campaigns').insert({
    tenant_id: tenantId, name, subject, from_name: fromName, from_email: fromEmail, html,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

r.post('/campaigns/:id/send', emailQuota, async (req, res) => {
  const tenantId = (req as any).auth?.userId;
  const { recipients } = req.body as { recipients: string[] };
  const { data: c } = await supabase.from('email_campaigns').select('*')
    .eq('id', req.params.id).eq('tenant_id', tenantId).single();
  if (!c) return res.status(404).json({ error: 'not_found' });
  const { used, cap, periodStart } = (req as any).emailQuota;
  const allowed = recipients.slice(0, Math.max(0, cap - used));
  const results = [];
  for (const to of allowed) {
    const { data: send } = await supabase.from('email_sends').insert({
      campaign_id: c.id, tenant_id: tenantId, to_email: to, status: 'queued',
    }).select().single();
    try {
      const { messageId } = await resendProvider.send({
        to, from: c.from_email, fromName: c.from_name,
        subject: c.subject, html: c.html,
        headers: { 'X-Send-Id': send!.id },
        tags: [{ name: 'campaign', value: c.id }],
      });
      await supabase.from('email_sends').update({
        provider_message_id: messageId, status: 'sent', sent_at: new Date().toISOString(),
      }).eq('id', send!.id);
      results.push({ to, ok: true });
    } catch (e: any) {
      await supabase.from('email_sends').update({ status: 'failed' }).eq('id', send!.id);
      results.push({ to, ok: false, error: e.message });
    }
  }
  await supabase.from('email_quota_usage').upsert({
    tenant_id: tenantId, period_start: periodStart, sends: used + allowed.length,
  }, { onConflict: 'tenant_id,period_start' });
  res.json({ sent: allowed.length, skipped: recipients.length - allowed.length, results });
});

r.post('/webhooks/resend', async (req, res) => {
  const e = req.body;
  const sendId = e?.data?.headers?.['X-Send-Id'] || e?.data?.tags?.send_id;
  const type = (e?.type || '').replace('email.', '');
  if (sendId && type) {
    await supabase.from('email_events').insert({ send_id: sendId, type, meta: e });
  }
  res.json({ ok: true });
});

export default r;

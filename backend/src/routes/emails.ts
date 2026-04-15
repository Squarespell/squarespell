
r.get('/quota', async (req, res) => {
  const tenantId = (req as any).auth?.userId;
  const plan = (req as any).auth?.plan || 'starter';
  const ps = new Date(); ps.setDate(1);
  const { data } = await supabase.from('email_quota_usage')
    .select('sends').eq('tenant_id', tenantId).eq('period_start', ps.toISOString().slice(0,10)).maybeSingle();
  const { limitFor } = await import('../services/email/limits');
  res.json({ used: data?.sends ?? 0, cap: limitFor(plan), plan });
});

r.get('/campaigns', async (req, res) => {
  const tenantId = (req as any).auth?.userId;
  const { data, error } = await supabase.from('email_campaigns')
    .select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

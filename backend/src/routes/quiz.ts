import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { guardQuizCreation } from '../middleware/planGuard';
import { supabase } from '../db/supabaseClient';

function makeSlug() { return Math.random().toString(36).slice(2, 10); }
const router = Router();
router.use(requireAuth, attachUser);

router.get('/', async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabase.from('quizzes').select('id,title,status,slug,lead_count,view_count,created_at,updated_at').eq('user_id', req.dbUserId).neq('status', 'archived').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', guardQuizCreation, async (req: AuthenticatedRequest, res) => {
  const { title, questions, outcomes, branding, settings } = req.body;
  const { data, error } = await supabase.from('quizzes').insert({ user_id: req.dbUserId, title: title ?? 'Untitled Quiz', slug: makeSlug(), questions: questions ?? [], outcomes: outcomes ?? [], branding: branding ?? {}, settings: settings ?? {}, status: 'draft' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await supabase.rpc('increment_quiz_count', { uid: req.dbUserId });
  res.status(201).json(data);
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabase.from('quizzes').select('*').eq('id', req.params.id).eq('user_id', req.dbUserId).single();
  if (error || !data) return res.status(404).json({ error: 'Quiz not found' });
  res.json(data);
});

router.patch('/:id', async (req: AuthenticatedRequest, res) => {
  const allowed = ['title','questions','outcomes','branding','settings'];
  const updates: Record<string,any> = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const { data, error } = await supabase.from('quizzes').update(updates).eq('id', req.params.id).eq('user_id', req.dbUserId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:id/publish', async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabase.from('quizzes').update({ status: 'live' }).eq('id', req.params.id).eq('user_id', req.dbUserId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const { error } = await supabase.from('quizzes').update({ status: 'archived' }).eq('id', req.params.id).eq('user_id', req.dbUserId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

router.get('/:id/leads', async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabase.from('leads').select('id,name,email,outcome_id,created_at').eq('quiz_id', req.params.id).eq('user_id', req.dbUserId).order('created_at', { ascending: false }).limit(500);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

router.get('/:id/leads/export', async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabase.from('leads').select('name,email,outcome_id,created_at,answers').eq('quiz_id', req.params.id).eq('user_id', req.dbUserId).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const rows = data ?? [];
  const csv = ['Name,Email,Outcome,Date,Answers', ...rows.map(r => [`"${(r.name??'').replace(/"/g,'""')}"`,`"${r.email}"`,`"${(r.outcome_id??'')}"`,`"${new Date(r.created_at).toISOString()}"`,`"${JSON.stringify(r.answers??{}).replace(/"/g,'""')}"`].join(','))].join('\n');
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename="leads.csv"');
  res.send(csv);
});

export default router;

import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { guardQuizCreation, getPlanLimits } from '../middleware/planGuard';
import { generateQuiz, processOtherAnswer } from '../services/claudeService';
import { scrapeBrand } from '../services/brandScraper';
import { supabase } from '../db/supabaseClient';
import Stripe from 'stripe';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function normalizeUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  new URL(url);
  return url;
}

// ── Generate ──────────────────────────────────────────────────────────────────
export const generateRouter = Router();
generateRouter.post('/generate', requireAuth, attachUser, guardQuizCreation, async (req: AuthenticatedRequest, res) => {
  const { url, business_type, goal } = req.body;
  if (!url || !business_type || !goal) return res.status(400).json({ error: 'url, business_type, and goal required' });
  try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }
  try { res.json(await generateQuiz(url, business_type, goal)); }
  catch (err: any) { res.status(500).json({ error: err.message ?? 'Generation failed' }); }
});

// ── Public Quiz ───────────────────────────────────────────────────────────────
export const publicQuizRouter = Router();
publicQuizRouter.get('/:slug', async (req, res) => {
  const { data, error } = await supabase.from('quizzes').select('id,title,questions,outcomes,branding,settings').eq('slug', req.params.slug).eq('status', 'live').single();
  if (error || !data) return res.status(404).json({ error: 'Quiz not found' });
  res.json(data);
});
publicQuizRouter.post('/:slug/event', async (req, res) => {
  const { event_type, session_id, metadata } = req.body;
  const { data: quiz } = await supabase.from('quizzes').select('id').eq('slug', req.params.slug).single();
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  await supabase.from('analytics_events').insert({ quiz_id: quiz.id, event_type, session_id, metadata: metadata ?? {} });
  if (event_type === 'view') await supabase.rpc('increment_view_count', { qid: quiz.id });
  res.json({ tracked: true });
});
publicQuizRouter.post('/:slug/process-other', async (req, res) => {
  const { free_text, available_outcomes } = req.body;
  if (!free_text || !available_outcomes) return res.status(400).json({ error: 'free_text and available_outcomes required' });
  try { res.json(await processOtherAnswer(free_text, available_outcomes)); }
  catch { res.json({ matched_outcome_id: available_outcomes[0]?.id ?? '', personalised_insight: '' }); }
});

// ── Leads ─────────────────────────────────────────────────────────────────────
export const leadsRouter = Router();
leadsRouter.post('/quiz/:slug/lead', async (req, res) => {
  const { name, email, answers, outcome_id } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const { data: quiz } = await supabase.from('quizzes').select('id,user_id').eq('slug', req.params.slug).eq('status', 'live').single();
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  const { data: owner } = await supabase.from('users').select('plan').eq('id', quiz.user_id).single();
  const { leads: leadLimit } = getPlanLimits(owner?.plan ?? 'free');
  const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('quiz_id', quiz.id);
  if ((count ?? 0) >= leadLimit) return res.status(403).json({ error: 'Lead limit reached' });
  const { error } = await supabase.from('leads').insert({ quiz_id: quiz.id, user_id: quiz.user_id, name: name ?? null, email, answers: answers ?? {}, outcome_id: outcome_id ?? null });
  if (error) return res.status(500).json({ error: error.message });
  await supabase.rpc('increment_lead_count', { qid: quiz.id });

  // Send email notification to quiz owner
  if (resend) {
    try {
      const { data: ownerUser } = await supabase.from('users').select('email').eq('id', quiz.user_id).single();
      if (ownerUser?.email) {
        const { data: quizInfo } = await supabase.from('quizzes').select('title').eq('id', quiz.id).single();
        await resend.emails.send({
          from: 'Squarespell <notifications@squarespell.com>',
          to: ownerUser.email,
          subject: `New lead captured: ${name || email}`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#07090c;color:#f0f2f5;border-radius:12px"><h2 style="color:#D2FF1D;font-size:20px;margin:0 0 16px">New lead captured!</h2><table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px 0;color:#888;font-size:14px">Name</td><td style="padding:8px 0;color:#f0f2f5;font-size:14px">${name || '—'}</td></tr><tr><td style="padding:8px 0;color:#888;font-size:14px">Email</td><td style="padding:8px 0;color:#f0f2f5;font-size:14px">${email}</td></tr><tr><td style="padding:8px 0;color:#888;font-size:14px">Quiz</td><td style="padding:8px 0;color:#f0f2f5;font-size:14px">${quizInfo?.title || 'Your quiz'}</td></tr><tr><td style="padding:8px 0;color:#888;font-size:14px">Date</td><td style="padding:8px 0;color:#f0f2f5;font-size:14px">${new Date().toLocaleDateString()}</td></tr></table><a href="https://squarespell.com/dashboard" style="display:inline-block;margin-top:20px;background:#D2FF1D;color:#07090c;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">View in dashboard →</a></div>`,
        });
      }
    } catch (e) { console.log('Email notification failed:', e); }
  }

  res.status(201).json({ success: true });
});

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsRouter = Router();
analyticsRouter.use(requireAuth, attachUser);
analyticsRouter.get('/:quizId', async (req: AuthenticatedRequest, res) => {
  const { data: quiz } = await supabase.from('quizzes').select('id,view_count,lead_count').eq('id', req.params.quizId).eq('user_id', req.dbUserId).single();
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  const { count: completions } = await supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('quiz_id', req.params.quizId).eq('event_type', 'complete');
  const views = quiz.view_count ?? 0; const leads = quiz.lead_count ?? 0; const comp = completions ?? 0;
  res.json({ views, completions: comp, leads, completion_rate: views > 0 ? Math.round((comp/views)*100) : 0, lead_rate: comp > 0 ? Math.round((leads/comp)*100) : 0 });
});

// ── Scrape Brand ──────────────────────────────────────────────────────────────
export const scrapeBrandRouter = Router();
scrapeBrandRouter.post('/scrape-brand', requireAuth, attachUser, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try { new URL(url); } catch { return res.status(400).json({ error: 'invalid url' }); }
  res.json(await scrapeBrand(url));
});

// ── User ──────────────────────────────────────────────────────────────────────
export const userRouter = Router();
userRouter.use(requireAuth, attachUser);
userRouter.get('/plan', async (req: AuthenticatedRequest, res) => {
  const { data: user } = await supabase.from('users').select('plan,quiz_count,created_at,email').eq('id', req.dbUserId).single();
  if (!user) return res.status(404).json({ error: 'Not found' });
  const plan = user.plan || 'trial';
  const trialEndsAt = (plan === 'free' || plan === 'trial') && user.created_at
    ? new Date(new Date(user.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;
  res.json({ plan, quiz_count: user.quiz_count, limits: getPlanLimits(plan), trial_ends_at: trialEndsAt, email: user.email || '' });
});
userRouter.post('/notifications', async (req: AuthenticatedRequest, res) => {
  const { enabled } = req.body;
  await supabase.from('users').update({ email_notifications: !!enabled }).eq('id', req.dbUserId);
  res.json({ ok: true, enabled: !!enabled });
});

// ── Stripe ────────────────────────────────────────────────────────────────────
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const PRICE_IDS: Record<string,Record<string,string>> = { starter: { monthly: process.env.STRIPE_STARTER_PRICE_ID!, yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID! }, pro: { monthly: process.env.STRIPE_PRO_PRICE_ID!, yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID! }, agency: { monthly: process.env.STRIPE_AGENCY_PRICE_ID!, yearly: process.env.STRIPE_AGENCY_YEARLY_PRICE_ID! } };

export const stripeRouter = Router();
stripeRouter.post('/create-checkout', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  const billing = req.body.billing === 'yearly' ? 'yearly' : 'monthly';
  const priceId = (PRICE_IDS[req.body.plan] as any)?.[billing];
  if (!priceId) return res.status(400).json({ error: 'Invalid plan' });
  const { data: user } = await supabase.from('users').select('email,stripe_customer_id').eq('id', req.dbUserId).single();
  const session = await stripe.checkout.sessions.create({ mode: 'subscription', payment_method_types: ['card'], customer_email: user?.stripe_customer_id ? undefined : user?.email, customer: user?.stripe_customer_id ?? undefined, line_items: [{ price: priceId, quantity: 1 }], success_url: `${process.env.FRONTEND_URL}/dashboard?upgraded=true`, cancel_url: `${process.env.FRONTEND_URL}/pricing`, metadata: { db_user_id: req.dbUserId!, plan: req.body.plan } });
  res.json({ url: session.url });
});
stripeRouter.post('/webhook', async (req, res) => {
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'] as string, process.env.STRIPE_WEBHOOK_SECRET!); }
  catch { return res.status(400).json({ error: 'Invalid signature' }); }
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.metadata?.db_user_id && s.metadata?.plan) await supabase.from('users').update({ plan: s.metadata.plan, stripe_customer_id: s.customer as string, stripe_subscription_id: s.subscription as string }).eq('id', s.metadata.db_user_id);
  }
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    await supabase.from('users').update({ plan: 'free', stripe_subscription_id: null }).eq('stripe_subscription_id', sub.id);
  }
  res.json({ received: true });
});
stripeRouter.get('/portal', requireAuth, attachUser, async (req: AuthenticatedRequest, res) => {
  const { data: user } = await supabase.from('users').select('stripe_customer_id').eq('id', req.dbUserId).single();
  if (!user?.stripe_customer_id) return res.redirect(`${process.env.FRONTEND_URL}/pricing`);
  const portal = await stripe.billingPortal.sessions.create({ customer: user.stripe_customer_id, return_url: `${process.env.FRONTEND_URL}/dashboard` });
  res.redirect(portal.url);
});
